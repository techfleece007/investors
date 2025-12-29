-- =====================================================
-- Cleanup Unnecessary Tables and Update Current Tables
-- =====================================================
-- This script removes unnecessary tables and ensures
-- current tables have correct data structure
-- =====================================================

-- Step 1: Drop unnecessary views (if they exist and are not being used)
-- Note: These views were created for complex calculations but are now handled in the application
DROP VIEW IF EXISTS public.order_profits_with_shipment_costs CASCADE;
DROP VIEW IF EXISTS public.product_inventory_with_shipments CASCADE;
DROP VIEW IF EXISTS public.shipment_details_with_products CASCADE;

-- Step 2: Drop unnecessary functions (if they exist and are not being used)
-- These functions were for FIFO/WAC calculations but we now use stored costs in orders/profits
DROP FUNCTION IF EXISTS public.get_actual_product_cost(bigint, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_product_fifo_cost(bigint, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_product_inventory_with_costs(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.get_product_shipment_costs(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.get_product_weighted_average_cost(bigint) CASCADE;

-- Step 3: Drop unnecessary triggers (if they exist)
-- These triggers were for automatic cost updates but we now handle costs at order time
DROP TRIGGER IF EXISTS trigger_update_product_cost ON public.shipment_products CASCADE;

-- Step 4: Clean up empty or unnecessary tables
-- Note: Only drop if they are truly empty and not needed
-- Check first before dropping:
-- SELECT COUNT(*) FROM public.shipment_products; -- Should be 0 if empty
-- SELECT COUNT(*) FROM public.variant_shipments; -- Should be 0 if empty

-- Drop shipment_products if empty (junction table that's not being used)
-- Uncomment the following lines ONLY if the table is confirmed empty:
-- DROP TABLE IF EXISTS public.shipment_products CASCADE;

-- Drop variant_shipments if empty (not being used in current implementation)
-- Uncomment the following lines ONLY if the table is confirmed empty:
-- DROP TABLE IF EXISTS public.variant_shipments CASCADE;

-- Step 5: Ensure orders table has correct constraints and indexes
-- Add index on order_number for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_orders_order_number 
ON public.orders (order_number);

-- Add index on created_at for faster date filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_orders_created_at 
ON public.orders (created_at);

-- Step 6: Ensure profits table has correct indexes
-- Add index on created_at for faster date filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_profits_created_at 
ON public.profits (created_at);

-- Step 7: Update any NULL cost_per_piece or price_per_piece in orders table
-- This ensures all orders have cost/price data for accurate profit calculations
-- First, let's see what needs updating (run this separately to check):
-- SELECT id, order_number, cost_per_piece, price_per_piece 
-- FROM public.orders 
-- WHERE cost_per_piece IS NULL OR price_per_piece IS NULL;

-- Update orders with NULL cost_per_piece from product variants or products
UPDATE public.orders o
SET cost_per_piece = COALESCE(
  (SELECT pv.cost FROM public.product_variants pv 
   WHERE pv.product_id = o.product_id 
   AND pv.size = o.sizes 
   LIMIT 1),
  (SELECT p.cost_per_piece FROM public.products p 
   WHERE p.id = o.product_id)
)
WHERE o.cost_per_piece IS NULL;

-- Update orders with NULL price_per_piece from product variants or products
UPDATE public.orders o
SET price_per_piece = COALESCE(
  (SELECT pv.price FROM public.product_variants pv 
   WHERE pv.product_id = o.product_id 
   AND pv.size = o.sizes 
   LIMIT 1),
  (SELECT p.price_per_piece FROM public.products p 
   WHERE p.id = o.product_id)
)
WHERE o.price_per_piece IS NULL;

-- Step 8: Update profits table with cost_per_piece and price_per_piece from orders
-- This ensures profits table has the correct cost/price data
UPDATE public.profits p
SET cost_per_piece = o.cost_per_piece,
    price_per_piece = o.price_per_piece
FROM public.orders o
WHERE p.order_id = o.id
AND (p.cost_per_piece IS NULL OR p.price_per_piece IS NULL)
AND (o.cost_per_piece IS NOT NULL AND o.price_per_piece IS NOT NULL);

-- Step 9: Verify data integrity
-- Check for orders without cost/price data
SELECT 
  COUNT(*) as orders_without_cost,
  COUNT(CASE WHEN price_per_piece IS NULL THEN 1 END) as orders_without_price
FROM public.orders
WHERE cost_per_piece IS NULL OR price_per_piece IS NULL;

-- Check for profits without cost/price data
SELECT 
  COUNT(*) as profits_without_cost,
  COUNT(CASE WHEN price_per_piece IS NULL THEN 1 END) as profits_without_price
FROM public.profits
WHERE cost_per_piece IS NULL OR price_per_piece IS NULL;

-- =====================================================
-- Summary of Changes:
-- =====================================================
-- 1. Dropped unnecessary views (order_profits_with_shipment_costs, etc.)
-- 2. Dropped unnecessary functions (get_actual_product_cost, etc.)
-- 3. Dropped unnecessary triggers (trigger_update_product_cost)
-- 4. Added indexes for better performance
-- 5. Updated NULL cost_per_piece and price_per_piece in orders
-- 6. Updated NULL cost_per_piece and price_per_piece in profits
-- =====================================================
-- IMPORTANT: Review the results of Step 9 before proceeding
-- If there are still NULL values, investigate why and fix manually
-- =====================================================







