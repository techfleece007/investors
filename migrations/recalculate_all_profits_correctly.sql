-- Script to recalculate ALL profits correctly with 80/20 split
-- This ensures all profit records are accurate and split correctly between investors

-- Step 1: Delete all existing profit records for the two investors
-- This will recalculate profits with correct 80/20 split
-- WARNING: This will delete profit records for Shady and Tamer. Make sure you have a backup!
DELETE FROM profits 
WHERE investor_id IN (
  '60c7d737-092a-46cb-a716-fd8f3a40dc1d',  -- Shady
  'ec524300-de3e-44a7-895e-3f5b5718cccf'   -- Tamer
);

-- Step 2: Recalculate and insert profits for all completed/canceled orders
-- This creates profit records for BOTH investors with 80/20 split
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
  investor_id,
  -- Calculate gross profit split: 80% for Shady, 20% for Tamer
  (o.total_price - COALESCE(o.cost_per_piece, 0) * o.quantity) * 
    CASE 
      WHEN investor_id = '60c7d737-092a-46cb-a716-fd8f3a40dc1d' THEN 0.8
      WHEN investor_id = 'ec524300-de3e-44a7-895e-3f5b5718cccf' THEN 0.2
      ELSE 0
    END as gross_profit,
  -- Calculate net profit split: 80% for Shady, 20% for Tamer
  (o.total_price - COALESCE(o.cost_per_piece, 0) * o.quantity - o.payment_fees - o.delivery_fees) * 
    CASE 
      WHEN investor_id = '60c7d737-092a-46cb-a716-fd8f3a40dc1d' THEN 0.8
      WHEN investor_id = 'ec524300-de3e-44a7-895e-3f5b5718cccf' THEN 0.2
      ELSE 0
    END as net_profit,
  -- Store cost and price per piece from order (as recorded when order was created)
  COALESCE(o.cost_per_piece, 0) as cost_per_piece,
  COALESCE(o.price_per_piece, 0) as price_per_piece,
  o.created_at
FROM orders o
CROSS JOIN (
  SELECT '60c7d737-092a-46cb-a716-fd8f3a40dc1d'::uuid as investor_id
  UNION ALL
  SELECT 'ec524300-de3e-44a7-895e-3f5b5718cccf'::uuid as investor_id
) investors
WHERE o.status IN ('completed', 'canceled')
  -- Only process orders that have cost_per_piece and price_per_piece stored
  AND o.cost_per_piece IS NOT NULL
  AND o.price_per_piece IS NOT NULL
  AND o.cost_per_piece > 0
  AND o.price_per_piece > 0
ORDER BY o.order_number, o.id, investors.investor_id
ON CONFLICT (order_id, investor_id) 
DO UPDATE SET
  gross_profit = EXCLUDED.gross_profit,
  net_profit = EXCLUDED.net_profit,
  cost_per_piece = EXCLUDED.cost_per_piece,
  price_per_piece = EXCLUDED.price_per_piece;

-- Step 3: Verify the results
SELECT 
  COUNT(*) as total_profit_records,
  COUNT(DISTINCT order_id) as total_orders,
  COUNT(DISTINCT CASE WHEN investor_id = '60c7d737-092a-46cb-a716-fd8f3a40dc1d' THEN order_id END) as orders_with_shady_profit,
  COUNT(DISTINCT CASE WHEN investor_id = 'ec524300-de3e-44a7-895e-3f5b5718cccf' THEN order_id END) as orders_with_tamer_profit,
  SUM(gross_profit) as total_gross_profit,
  SUM(net_profit) as total_net_profit,
  SUM(CASE WHEN investor_id = '60c7d737-092a-46cb-a716-fd8f3a40dc1d' THEN gross_profit ELSE 0 END) as shady_total_gross,
  SUM(CASE WHEN investor_id = 'ec524300-de3e-44a7-895e-3f5b5718cccf' THEN gross_profit ELSE 0 END) as tamer_total_gross,
  SUM(CASE WHEN investor_id = '60c7d737-092a-46cb-a716-fd8f3a40dc1d' THEN net_profit ELSE 0 END) as shady_total_net,
  SUM(CASE WHEN investor_id = 'ec524300-de3e-44a7-895e-3f5b5718cccf' THEN net_profit ELSE 0 END) as tamer_total_net
FROM profits;

-- Step 4: Check for any calculation discrepancies
-- This query will show orders where the profit split doesn't add up to 100%
SELECT 
  o.order_number,
  o.id as order_id,
  o.total_price,
  o.cost_per_piece,
  o.quantity,
  o.payment_fees,
  o.delivery_fees,
  (o.total_price - o.cost_per_piece * o.quantity) as expected_total_gross,
  (o.total_price - o.cost_per_piece * o.quantity - o.payment_fees - o.delivery_fees) as expected_total_net,
  SUM(p.gross_profit) as actual_total_gross,
  SUM(p.net_profit) as actual_total_net,
  ABS((o.total_price - o.cost_per_piece * o.quantity) - SUM(p.gross_profit)) as gross_difference,
  ABS((o.total_price - o.cost_per_piece * o.quantity - o.payment_fees - o.delivery_fees) - SUM(p.net_profit)) as net_difference
FROM orders o
JOIN profits p ON o.id = p.order_id
WHERE o.status IN ('completed', 'canceled')
  AND o.cost_per_piece IS NOT NULL
  AND o.price_per_piece IS NOT NULL
GROUP BY o.id, o.order_number, o.total_price, o.cost_per_piece, o.quantity, o.payment_fees, o.delivery_fees
HAVING ABS((o.total_price - o.cost_per_piece * o.quantity) - SUM(p.gross_profit)) > 0.01
   OR ABS((o.total_price - o.cost_per_piece * o.quantity - o.payment_fees - o.delivery_fees) - SUM(p.net_profit)) > 0.01
ORDER BY o.order_number;

