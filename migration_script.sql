-- Migration Script to Update Existing Database
-- Run this AFTER running the main supabase_fixed.sql file
-- This script helps migrate existing data to the new structure

-- ==========================
-- 1. Update Products Table
-- ==========================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add price_per_piece column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'price_per_piece') THEN
        ALTER TABLE products ADD COLUMN price_per_piece numeric DEFAULT 250;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'created_at') THEN
        ALTER TABLE products ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'updated_at') THEN
        ALTER TABLE products ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Update existing products with default values
UPDATE products SET 
    price_per_piece = COALESCE(price_per_piece, 250),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE price_per_piece IS NULL OR created_at IS NULL OR updated_at IS NULL;

-- ==========================
-- 2. Update Product Variants Table
-- ==========================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add price column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'price') THEN
        ALTER TABLE product_variants ADD COLUMN price numeric DEFAULT 250;
    END IF;
    
    -- Add cost column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'cost') THEN
        ALTER TABLE product_variants ADD COLUMN cost numeric DEFAULT 107;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'created_at') THEN
        ALTER TABLE product_variants ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'updated_at') THEN
        ALTER TABLE product_variants ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Update existing variants with default values
UPDATE product_variants SET 
    price = COALESCE(price, 250),
    cost = COALESCE(cost, 107),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE price IS NULL OR cost IS NULL OR created_at IS NULL OR updated_at IS NULL;

-- ==========================
-- 3. Update Orders Table
-- ==========================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add product_variant_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'product_variant_id') THEN
        ALTER TABLE orders ADD COLUMN product_variant_id bigint;
    END IF;
    
    -- Add total_price column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total_price') THEN
        ALTER TABLE orders ADD COLUMN total_price numeric;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'created_at') THEN
        ALTER TABLE orders ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'updated_at') THEN
        ALTER TABLE orders ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
    
    -- Rename size column to sizes if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'size') THEN
        ALTER TABLE orders RENAME COLUMN size TO sizes;
    END IF;
    
    -- Add sizes column if it doesn't exist (after potential rename)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'sizes') THEN
        ALTER TABLE orders ADD COLUMN sizes text DEFAULT 'Unknown';
    END IF;
END $$;

-- Update existing orders with default values
UPDATE orders SET 
    total_price = COALESCE(total_price, paid_amount),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now()),
    sizes = COALESCE(sizes, 'Unknown')
WHERE total_price IS NULL OR created_at IS NULL OR updated_at IS NULL OR sizes IS NULL;

-- Fix existing sample data to use proper structure
-- Update order 3296 to split L,XL into separate rows
UPDATE orders SET sizes = 'L', quantity = 1, total_price = 220, paid_amount = 220, delivery_fees = 10
WHERE order_number = 3296 AND sizes = 'L,XL';

-- Insert the XL size as a separate row for order 3296
INSERT INTO orders (product_id, product_variant_id, order_number, shipping_number, paid_amount, total_price, quantity, sizes, payment_method, payment_fees, delivery_fees, status)
SELECT product_id, 7, order_number, shipping_number, 220, 220, 1, 'XL', payment_method, payment_fees, 10, status
FROM orders 
WHERE order_number = 3296 AND sizes = 'L'
LIMIT 1;

-- Add additional sample orders for better profit calculation
INSERT INTO orders (product_id, product_variant_id, order_number, shipping_number, paid_amount, total_price, quantity, sizes, payment_method, payment_fees, delivery_fees, status)
VALUES 
(1, 1, 3298, 233296, 250, 250, 1, 'S', 'cash', 0, 15, 'completed'),
(7, 25, 3299, 233295, 350, 350, 1, 'L', 'card', 10, 20, 'completed'),
(8, 29, 3300, 233294, 350, 350, 1, 'M', 'tabby', 27, 20, 'completed');


-- ==========================
-- 4. Update Shipments Table
-- ==========================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add tracking_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipments' AND column_name = 'tracking_number') THEN
        ALTER TABLE shipments ADD COLUMN tracking_number text;
    END IF;
    
    -- Add destination column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipments' AND column_name = 'destination') THEN
        ALTER TABLE shipments ADD COLUMN destination text;
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipments' AND column_name = 'status') THEN
        ALTER TABLE shipments ADD COLUMN status text DEFAULT 'pending';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipments' AND column_name = 'created_at') THEN
        ALTER TABLE shipments ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipments' AND column_name = 'updated_at') THEN
        ALTER TABLE shipments ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Update existing shipments with default values
UPDATE shipments SET 
    tracking_number = COALESCE(tracking_number, 'TRK' || id),
    destination = COALESCE(destination, 'Unknown'),
    status = COALESCE(status, 'pending'),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE tracking_number IS NULL OR destination IS NULL OR status IS NULL OR created_at IS NULL OR updated_at IS NULL;

-- ==========================
-- 5. Update Other Tables
-- ==========================

-- Add timestamps to investors table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investors' AND column_name = 'created_at') THEN
        ALTER TABLE investors ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investors' AND column_name = 'updated_at') THEN
        ALTER TABLE investors ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Add timestamps to expenses table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'created_at') THEN
        ALTER TABLE expenses ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'updated_at') THEN
        ALTER TABLE expenses ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- ==========================
-- 6. Fix Image URLs
-- ==========================

-- Update image URLs to use correct format
UPDATE products SET image_url = '/images/' || REPLACE(image_url, '/public/images/', '')
WHERE image_url LIKE '/public/images/%';

-- Update image URLs that don't have /images/ prefix
UPDATE products SET image_url = '/images/' || image_url
WHERE image_url NOT LIKE '/images/%' AND image_url != '';

-- ==========================
-- 7. Create Missing Indexes
-- ==========================

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_name') THEN
        CREATE INDEX idx_products_name ON products(name);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_variants_product_id') THEN
        CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_variants_product_size') THEN
        CREATE INDEX idx_product_variants_product_size ON product_variants(product_id, size);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_variants_quantity') THEN
        CREATE INDEX idx_product_variants_quantity ON product_variants(quantity);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_product_id') THEN
        CREATE INDEX idx_orders_product_id ON orders(product_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_status') THEN
        CREATE INDEX idx_orders_status ON orders(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shipments_status') THEN
        CREATE INDEX idx_shipments_status ON shipments(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profits_order_id') THEN
        CREATE INDEX idx_profits_order_id ON profits(order_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profits_investor_id') THEN
        CREATE INDEX idx_profits_investor_id ON profits(investor_id);
    END IF;
END $$;

-- ==========================
-- 7.5. Add Missing RLS Policies
-- ==========================

-- Add missing RLS policies for profits table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profits' AND policyname = 'Allow anonymous insert to profits') THEN
        CREATE POLICY "Allow anonymous insert to profits" ON profits FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profits' AND policyname = 'Allow anonymous update to profits') THEN
        CREATE POLICY "Allow anonymous update to profits" ON profits FOR UPDATE USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profits' AND policyname = 'Allow anonymous delete from profits') THEN
        CREATE POLICY "Allow anonymous delete from profits" ON profits FOR DELETE USING (true);
    END IF;
END $$;

-- ==========================
-- 8. Update Trigger Function
-- ==========================

-- Update the handle_new_order function to work with the new sizes field
CREATE OR REPLACE FUNCTION handle_new_order()
RETURNS trigger AS $$
DECLARE
  product_cost numeric;
  gross numeric;
  shared_expense_per_order numeric;
  variant_size text;
BEGIN
  -- reduce product stock
  UPDATE products
  SET quantity = quantity - new.quantity
  WHERE id = new.product_id;

  -- Update product variant quantity based on the size
  -- Parse the sizes field (it can contain multiple sizes like 'L,XL')
  variant_size := split_part(new.sizes, ',', 1); -- Take first size if multiple
  
  -- Update the specific variant quantity
  UPDATE product_variants
  SET quantity = greatest(0, quantity - new.quantity)
  WHERE product_id = new.product_id AND size = variant_size;

  -- calculate profit
  SELECT cost_per_piece INTO product_cost FROM products WHERE id = new.product_id;

  gross := (new.paid_amount - new.payment_fees - new.delivery_fees - (product_cost * new.quantity));

  -- distribute expenses equally per order
  SELECT COALESCE(sum(amount),0) / NULLIF((SELECT count(*) FROM orders),0)
  INTO shared_expense_per_order
  FROM expenses;

  gross := gross - COALESCE(shared_expense_per_order,0);

  -- insert profits for each investor
  INSERT INTO profits (order_id, investor_id, gross_profit, net_profit)
  SELECT new.id, i.id, gross, (gross * (i.profit_percentage/100.0))
  FROM investors i;

  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- ==========================
-- 9. Verify Migration
-- ==========================

-- Check table structures
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('products', 'product_variants', 'orders', 'shipments', 'investors', 'expenses')
ORDER BY table_name, ordinal_position;

-- Check sample data
SELECT 'Products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'Product Variants' as table_name, COUNT(*) as count FROM product_variants
UNION ALL
SELECT 'Orders' as table_name, COUNT(*) as count FROM orders
UNION ALL
SELECT 'Shipments' as table_name, COUNT(*) as count FROM shipments
UNION ALL
SELECT 'Investors' as table_name, COUNT(*) as count FROM investors
UNION ALL
SELECT 'Expenses' as table_name, COUNT(*) as count FROM expenses;

-- Migration completed successfully!
SELECT 'Migration completed successfully! All tables have been updated with the new schema.' as status;
