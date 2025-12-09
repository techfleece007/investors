-- Script to recalculate and update profits for November 2025 (orders 103-193)
-- This ensures accurate profit calculations using stored cost and price from orders
--
-- IMPORTANT: The cost_per_piece and price_per_piece in the profits table should be
-- the SAME as what was recorded in the orders table when the order was created.
-- This preserves historical accuracy and ensures profit calculations reflect the
-- actual cost and price at the time of sale, not current product prices.

-- First, delete existing profit records for orders 103-193 to recalculate
-- Only for November 2025 (up to November 30, 2025 23:59:59)
DELETE FROM profits 
WHERE order_id IN (
  SELECT id FROM orders 
  WHERE order_number >= 103 AND order_number <= 193
  AND created_at >= '2025-11-01'::date 
  AND created_at <= '2025-11-30 23:59:59'::timestamp
);

-- Recalculate and insert profits for orders 103-193
-- Using stored cost_per_piece and price_per_piece from orders table
-- NOTE: These values are taken directly from the orders table as they were
-- recorded at order creation time, ensuring historical accuracy
INSERT INTO profits (
  order_id,
  investor_id,
  gross_profit,
  net_profit,
  cost_per_piece,
  price_per_piece,
  created_at
)
SELECT 
  o.id as order_id,
  '60c7d737-092a-46cb-a716-fd8f3a40dc1d' as investor_id, -- Shady's ID (80% share)
  -- Gross profit = total_price - (cost_per_piece * quantity)
  -- IMPORTANT: Use ONLY the cost_per_piece from orders table (stored at order creation)
  (o.total_price - COALESCE(o.cost_per_piece, 0) * o.quantity) as gross_profit,
  -- Net profit = total_price - (cost_per_piece * quantity) - payment_fees - delivery_fees
  -- IMPORTANT: Use ONLY the cost_per_piece from orders table (stored at order creation)
  (o.total_price - COALESCE(o.cost_per_piece, 0) * o.quantity - o.payment_fees - o.delivery_fees) as net_profit,
  -- Store cost and price per piece from order (as recorded when order was created)
  -- These values preserve historical data and should match exactly what was in the order
  -- CRITICAL: Use ONLY values from orders table, do NOT fall back to product prices
  COALESCE(o.cost_per_piece, 0) as cost_per_piece,
  COALESCE(o.price_per_piece, 0) as price_per_piece,
  o.created_at
FROM orders o
WHERE o.order_number >= 103 AND o.order_number <= 193
  AND o.created_at >= '2025-11-01'::date 
  AND o.created_at <= '2025-11-30 23:59:59'::timestamp
  AND o.status IN ('completed', 'canceled')
  -- Only process orders that have cost_per_piece and price_per_piece stored
  AND o.cost_per_piece IS NOT NULL
  AND o.price_per_piece IS NOT NULL
ORDER BY o.order_number, o.id;

-- Verify the results
SELECT 
  COUNT(*) as total_profits_calculated,
  SUM(net_profit) as total_net_profit,
  AVG(cost_per_piece) as avg_cost_per_piece,
  AVG(price_per_piece) as avg_price_per_piece
FROM profits
WHERE order_id IN (
  SELECT id FROM orders 
  WHERE order_number >= 103 AND order_number <= 193
  AND created_at >= '2025-11-01'::date 
  AND created_at <= '2025-11-30 23:59:59'::timestamp
);

