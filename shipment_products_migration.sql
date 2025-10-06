-- Migration script to add shipment_products table and update inventory logic
-- This script connects shipments to products and handles different cost per item

-- 1. Create shipment_products junction table
CREATE TABLE IF NOT EXISTS shipment_products (
    id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity_received INTEGER NOT NULL DEFAULT 0,
    cost_per_item DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity_received * cost_per_item) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no duplicate entries for same shipment, product, and variant
    UNIQUE(shipment_id, product_id, product_variant_id)
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shipment_products_shipment_id ON shipment_products(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_products_product_id ON shipment_products(product_id);
CREATE INDEX IF NOT EXISTS idx_shipment_products_variant_id ON shipment_products(product_variant_id);

-- 3. Create updated_at trigger for shipment_products
CREATE OR REPLACE FUNCTION update_shipment_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shipment_products_updated_at
    BEFORE UPDATE ON shipment_products
    FOR EACH ROW
    EXECUTE FUNCTION update_shipment_products_updated_at();

-- 4. Create function to update product inventory when shipment products are added
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

-- 5. Create trigger to automatically update inventory
CREATE TRIGGER trigger_update_inventory_on_shipment
    AFTER INSERT ON shipment_products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_inventory_on_shipment();

-- 6. Create function to handle inventory reduction when shipment products are removed
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

-- 7. Create trigger to handle inventory reduction on deletion
CREATE TRIGGER trigger_reduce_inventory_on_shipment_removal
    AFTER DELETE ON shipment_products
    FOR EACH ROW
    EXECUTE FUNCTION reduce_product_inventory_on_shipment_removal();

-- 8. Create function to get weighted average cost for products
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

-- 9. Create function to get FIFO cost for products (oldest shipment first)
CREATE OR REPLACE FUNCTION get_product_fifo_cost(p_product_id BIGINT, p_quantity INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    fifo_cost DECIMAL(10,2) := 0;
    remaining_quantity INTEGER := p_quantity;
    shipment_record RECORD;
BEGIN
    -- Get shipments ordered by date (oldest first)
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
            fifo_cost := fifo_cost + (shipment_record.quantity_received * shipment_record.cost_per_item);
            remaining_quantity := remaining_quantity - shipment_record.quantity_received;
        ELSE
            -- Use partial shipment
            fifo_cost := fifo_cost + (remaining_quantity * shipment_record.cost_per_item);
            remaining_quantity := 0;
        END IF;
    END LOOP;
    
    RETURN fifo_cost;
END;
$$ LANGUAGE plpgsql;

-- 10. Add RLS (Row Level Security) policies if needed
ALTER TABLE shipment_products ENABLE ROW LEVEL SECURITY;

-- 11. Create view for shipment details with product information
CREATE OR REPLACE VIEW shipment_details_with_products AS
SELECT 
    s.id as shipment_id,
    s.name as shipment_name,
    s.cost as total_shipment_cost,
    s.details as shipment_details,
    s.paid_by,
    s.date as shipment_date,
    s.tracking_number,
    s.destination,
    s.status,
    s.created_at as shipment_created_at,
    sp.id as shipment_product_id,
    sp.product_id,
    p.name as product_name,
    sp.product_variant_id,
    pv.size as variant_size,
    sp.quantity_received,
    sp.cost_per_item,
    sp.total_cost as product_total_cost,
    sp.created_at as product_added_at
FROM shipments s
LEFT JOIN shipment_products sp ON s.id = sp.shipment_id
LEFT JOIN products p ON sp.product_id = p.id
LEFT JOIN product_variants pv ON sp.product_variant_id = pv.id
ORDER BY s.created_at DESC, sp.created_at ASC;

-- 12. Create view for product inventory with shipment history
CREATE OR REPLACE VIEW product_inventory_with_shipments AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.cost_per_piece as current_cost_per_piece,
    p.price_per_piece,
    p.quantity as current_quantity,
    p.image_url,
    COALESCE(SUM(sp.quantity_received), 0) as total_received,
    COALESCE(SUM(sp.total_cost), 0) as total_investment,
    COALESCE(AVG(sp.cost_per_item), p.cost_per_piece) as average_cost_per_item,
    COUNT(sp.id) as shipment_count,
    MAX(sp.created_at) as last_shipment_date
FROM products p
LEFT JOIN shipment_products sp ON p.id = sp.product_id
GROUP BY p.id, p.name, p.cost_per_piece, p.price_per_piece, p.quantity, p.image_url
ORDER BY p.name;

-- 13. Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON shipment_products TO authenticated;
-- GRANT SELECT ON shipment_details_with_products TO authenticated;
-- GRANT SELECT ON product_inventory_with_shipments TO authenticated;

COMMENT ON TABLE shipment_products IS 'Junction table linking shipments to products with shipment-specific costs and quantities';
COMMENT ON COLUMN shipment_products.cost_per_item IS 'Cost per item for this specific shipment (can differ from product.cost_per_piece)';
COMMENT ON COLUMN shipment_products.quantity_received IS 'Quantity of this product received in this shipment';
COMMENT ON COLUMN shipment_products.total_cost IS 'Automatically calculated as quantity_received * cost_per_item';
