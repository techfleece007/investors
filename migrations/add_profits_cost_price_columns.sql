-- Migration: Add cost_per_piece and price_per_piece columns to profits table
-- This ensures accurate profit tracking with historical cost and price data

-- Add cost_per_piece column to profits table
ALTER TABLE profits 
ADD COLUMN IF NOT EXISTS cost_per_piece DECIMAL(10,2);

-- Add price_per_piece column to profits table
ALTER TABLE profits 
ADD COLUMN IF NOT EXISTS price_per_piece DECIMAL(10,2);

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN profits.cost_per_piece IS 'Cost per piece at the time of order creation. Used for accurate profit calculations.';
COMMENT ON COLUMN profits.price_per_piece IS 'Price per piece at the time of order creation. Used for accurate profit calculations.';







