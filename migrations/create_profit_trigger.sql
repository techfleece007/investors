-- Create trigger function to automatically calculate and store profits when orders are created/updated
-- This ensures profits are always up-to-date with accurate cost and price data

-- Function to calculate and insert/update profit record
CREATE OR REPLACE FUNCTION calculate_and_store_profit()
RETURNS TRIGGER AS $$
DECLARE
  v_cost_per_piece DECIMAL(10,2);
  v_price_per_piece DECIMAL(10,2);
  v_gross_profit DECIMAL(10,2);
  v_net_profit DECIMAL(10,2);
  v_product_cost DECIMAL(10,2);
  v_product_price DECIMAL(10,2);
BEGIN
  -- Only process completed or canceled orders
  IF NEW.status NOT IN ('completed', 'canceled') THEN
    RETURN NEW;
  END IF;

  -- Get cost and price from order (stored at order time)
  -- IMPORTANT: Use ONLY the values stored in the order when it was created
  -- Do NOT fall back to product prices as they may have changed
  v_cost_per_piece := COALESCE(NEW.cost_per_piece, 0);
  v_price_per_piece := COALESCE(NEW.price_per_piece, 0);
  
  -- If order doesn't have cost/price stored, skip profit calculation
  -- This ensures we only calculate profits for orders with historical data
  IF v_cost_per_piece = 0 OR v_price_per_piece = 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate total profits for the order
  v_gross_profit := NEW.total_price - (v_cost_per_piece * NEW.quantity);
  v_net_profit := NEW.total_price - (v_cost_per_piece * NEW.quantity) - NEW.payment_fees - NEW.delivery_fees;

  -- Insert or update profit record for Shady (80% share)
  INSERT INTO profits (
    order_id,
    investor_id,
    gross_profit,
    net_profit,
    cost_per_piece,
    price_per_piece,
    created_at
  )
  VALUES (
    NEW.id,
    '60c7d737-092a-46cb-a716-fd8f3a40dc1d', -- Shady's ID (80% share)
    v_gross_profit * 0.8,  -- 80% of gross profit
    v_net_profit * 0.8,    -- 80% of net profit
    v_cost_per_piece,
    v_price_per_piece,
    NEW.created_at
  )
  ON CONFLICT (order_id, investor_id) 
  DO UPDATE SET
    gross_profit = EXCLUDED.gross_profit,
    net_profit = EXCLUDED.net_profit,
    cost_per_piece = EXCLUDED.cost_per_piece,
    price_per_piece = EXCLUDED.price_per_piece;

  -- Insert or update profit record for Tamer (20% share)
  INSERT INTO profits (
    order_id,
    investor_id,
    gross_profit,
    net_profit,
    cost_per_piece,
    price_per_piece,
    created_at
  )
  VALUES (
    NEW.id,
    'ec524300-de3e-44a7-895e-3f5b5718cccf', -- Tamer's ID (20% share)
    v_gross_profit * 0.2,  -- 20% of gross profit
    v_net_profit * 0.2,    -- 20% of net profit
    v_cost_per_piece,
    v_price_per_piece,
    NEW.created_at
  )
  ON CONFLICT (order_id, investor_id) 
  DO UPDATE SET
    gross_profit = EXCLUDED.gross_profit,
    net_profit = EXCLUDED.net_profit,
    cost_per_piece = EXCLUDED.cost_per_piece,
    price_per_piece = EXCLUDED.price_per_piece;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_calculate_profit ON orders;

-- Create trigger to automatically calculate profit when order status changes to completed/canceled
CREATE TRIGGER trigger_calculate_profit
  AFTER INSERT OR UPDATE OF status, total_price, quantity, payment_fees, delivery_fees, cost_per_piece, price_per_piece
  ON orders
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'canceled'))
  EXECUTE FUNCTION calculate_and_store_profit();

-- Add unique constraint on (order_id, investor_id) if it doesn't exist (to support ON CONFLICT)
-- This allows multiple investors to have profits for the same order
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profits_order_id_investor_id_key'
  ) THEN
    ALTER TABLE profits ADD CONSTRAINT profits_order_id_investor_id_key UNIQUE (order_id, investor_id);
  END IF;
END $$;

