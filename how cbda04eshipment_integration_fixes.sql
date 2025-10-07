-- Additional fixes to integrate shipment_products with existing system
-- This script ensures proper cost calculation and inventory management

-- 1. Create missing triggers for inventory management
CREATE OR REPLACE FUNCTION update_product_inventory_on_shipment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update main product quantity
    UPDATE products 
    SET quantity = quantity + NEW.quantity_received,
        updated_at = NOW()
    WHERE id = NEW.product_id;
    
    -- Update product variant quantity if variant exists
    IF NEW.product_variant_id IS NOT NULL THEN
        UPDATE product_variants 
        SET quantity = quantity + NEW.quantity_received,
            cost = NEW.cost_per_item,  -- Update cost to latest shipment cost
            updated_at = NOW()
        WHERE id = NEW.product_variant_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update inventory
DROP TRIGGER IF EXISTS trigger_update_inventory_on_shipment ON shipment_products;
CREATE TRIGGER trigger_update_inventory_on_shipment
    AFTER INSERT ON shipment_products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_inventory_on_shipment();

-- 2. Create function to handle inventory reduction when shipment products are removed
CREATE OR REPLACE FUNCTION reduce_product_inventory_on_shipment_removal()
RETURNS TRIGGER AS $$
BEGIN
    -- Reduce main product quantity
    UPDATE products 
    SET quantity = quantity - OLD.quantity_received,
        updated_at = NOW()
    WHERE id = OLD.product_id;
    
    -- Reduce product variant quantity if variant exists
    IF OLD.product_variant_id IS NOT NULL THEN
        UPDATE product_variants 
        SET quantity = quantity - OLD.quantity_received,
            updated_at = NOW()
        WHERE id = OLD.product_variant_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle inventory reduction on deletion
DROP TRIGGER IF EXISTS trigger_reduce_inventory_on_shipment_removal ON shipment_products;
CREATE TRIGGER trigger_reduce_inventory_on_shipment_removal
    AFTER DELETE ON shipment_products
    FOR EACH ROW
    EXECUTE FUNCTION reduce_product_inventory_on_shipment_removal();

-- 3. Create function to get the actual cost per item for a product (FIFO method)
CREATE OR REPLACE FUNCTION get_actual_product_cost(p_product_id BIGINT, p_quantity INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    actual_cost DECIMAL(10,2) := 0;
    remaining_quantity INTEGER := p_quantity;
    shipment_record RECORD;
    total_cost DECIMAL(10,2) := 0;
BEGIN
    -- Get shipments ordered by date (oldest first) - FIFO method
    FOR shipment_record IN 
        SELECT cost_per_item, quantity_received
        FROM shipment_products 
        WHERE product_id = p_product_id 
        ORDER BY created_at ASC
    LOOP
        IF remaining_quantity <= 0 THEN
            EXIT;
        END IF;
        
        IF remaining_quantity >= shipment_record.quantity_received THEN
            -- Use entire shipment
            total_cost := total_cost + (shipment_record.quantity_received * shipment_record.cost_per_item);
            remaining_quantity := remaining_quantity - shipment_record.quantity_received;
        ELSE
            -- Use partial shipment
            total_cost := total_cost + (remaining_quantity * shipment_record.cost_per_item);
            remaining_quantity := 0;
        END IF;
    END LOOP;
    
    -- Return average cost per item
    IF p_quantity > 0 THEN
        actual_cost := total_cost / p_quantity;
    END IF;
    
    RETURN actual_cost;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to get weighted average cost for products
CREATE OR REPLACE FUNCTION get_product_weighted_average_cost(p_product_id BIGINT)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    weighted_avg_cost DECIMAL(10,2);
BEGIN
    SELECT COALESCE(
        SUM(total_cost) / NULLIF(SUM(quantity_received), 0),
        0
    ) INTO weighted_avg_cost
    FROM shipment_products 
    WHERE product_id = p_product_id;
    
    RETURN weighted_avg_cost;
END;
$$ LANGUAGE plpgsql;

-- 5. Update the products table to use shipment-based costs
CREATE OR REPLACE FUNCTION update_product_cost_from_shipments()
RETURNS TRIGGER AS $$
DECLARE
    new_cost DECIMAL(10,2);
BEGIN
    -- Get weighted average cost from shipments
    SELECT get_product_weighted_average_cost(NEW.product_id) INTO new_cost;
    
    -- Update the product's cost_per_piece with the weighted average
    IF new_cost > 0 THEN
        UPDATE products 
        SET cost_per_piece = new_cost,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update product cost when shipment products are added
DROP TRIGGER IF EXISTS trigger_update_product_cost ON shipment_products;
CREATE TRIGGER trigger_update_product_cost
    AFTER INSERT OR UPDATE ON shipment_products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_cost_from_shipments();

-- 6. Create view for accurate profit calculations using shipment costs
CREATE OR REPLACE VIEW order_profits_with_shipment_costs AS
SELECT 
    o.id as order_id,
    o.product_id,
    o.quantity,
    o.total_price,
    o.payment_fees,
    o.delivery_fees,
    o.status,
    o.created_at,
    p.name as product_name,
    p.price_per_piece,
    -- Use shipment-based cost calculation
    COALESCE(
        get_actual_product_cost(o.product_id, o.quantity),
        p.cost_per_piece
    ) as actual_cost_per_piece,
    -- Calculate profit using actual costs
    (o.total_price - (o.quantity * COALESCE(
        get_actual_product_cost(o.product_id, o.quantity),
        p.cost_per_piece
    )) - o.payment_fees - o.delivery_fees) as net_profit
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE o.status IN ('completed', 'canceled');

-- 7. Create function to get shipment cost breakdown for a product
CREATE OR REPLACE FUNCTION get_product_shipment_costs(p_product_id BIGINT)
RETURNS TABLE (
    shipment_name TEXT,
    shipment_date DATE,
    quantity_received INTEGER,
    cost_per_item DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.name as shipment_name,
        s.date as shipment_date,
        sp.quantity_received,
        sp.cost_per_item,
        sp.total_cost,
        sp.created_at
    FROM shipment_products sp
    JOIN shipments s ON sp.shipment_id = s.id
    WHERE sp.product_id = p_product_id
    ORDER BY sp.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to get current inventory with cost breakdown
CREATE OR REPLACE FUNCTION get_product_inventory_with_costs(p_product_id BIGINT)
RETURNS TABLE (
    product_name TEXT,
    current_quantity INTEGER,
    average_cost DECIMAL(10,2),
    total_investment DECIMAL(10,2),
    shipment_count BIGINT,
    last_shipment_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name as product_name,
        p.quantity as current_quantity,
        COALESCE(get_product_weighted_average_cost(p_product_id), p.cost_per_piece) as average_cost,
        COALESCE(SUM(sp.total_cost), 0) as total_investment,
        COUNT(sp.id) as shipment_count,
        MAX(sp.created_at) as last_shipment_date
    FROM products p
    LEFT JOIN shipment_products sp ON p.id = sp.product_id
    WHERE p.id = p_product_id
    GROUP BY p.id, p.name, p.quantity, p.cost_per_piece;
END;
$$ LANGUAGE plpgsql;

-- 9. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON shipment_products TO authenticated;
GRANT SELECT ON order_profits_with_shipment_costs TO authenticated;
GRANT EXECUTE ON FUNCTION get_actual_product_cost TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_weighted_average_cost TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_shipment_costs TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_inventory_with_costs TO authenticated;

-- 10. Add comments for documentation
COMMENT ON TABLE shipment_products IS 'Junction table linking shipments to products with shipment-specific costs and quantities';
COMMENT ON COLUMN shipment_products.cost_per_item IS 'Cost per item for this spe