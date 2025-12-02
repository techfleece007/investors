-- Migration: Add cost_per_piece and price_per_piece columns to orders table
-- This allows storing the cost and price at the time of order creation
-- so that historical orders are not affected by future price changes

-- Add cost_per_piece column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cost_per_piece DECIMAL(10,2);

-- Add price_per_piece column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS price_per_piece DECIMAL(10,2);

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN orders.cost_per_piece IS 'Cost per piece at the time of order creation. Stored to preserve historical cost data.';
COMMENT ON COLUMN orders.price_per_piece IS 'Price per piece at the time of order creation. Stored to preserve historical price data.';

