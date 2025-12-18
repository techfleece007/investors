-- Update profit trigger to create profit records for BOTH investors (80/20 split)
-- This ensures profits are correctly split between Shady (80%) and Tamer (20%)

CREATE OR REPLACE FUNCTION calculate_and_store_profit()
RETURNS TRIGGER AS $$
DECLARE
  v_cost_per_piece DECIMAL(10,2);
  v_price_per_piece DECIMAL(10,2);
  v_gross_profit DECIMAL(10,2);
  v_net_profit DECIMAL(10,2);
  v_shady_gross_profit DECIMAL(10,2);
  v_shady_net_profit DECIMAL(10,2);
  v_tamer_gross_profit DECIMAL(10,2);
  v_tamer_net_profit DECIMAL(10,2);
BEGIN
  -- Only process completed or canceled orders
  IF NEW.status NOT IN ('completed', 'canceled') THEN
    RETURN NEW;
  END IF;

  -- Get cost and price from order (stored at order time)
  -- IMPORTANT: Use ONLY the values stored in the order when it was created
  v_cost_per_piece := COALESCE(NEW.cost_per_piece, 0);
  v_price_per_piece := COALESCE(NEW.price_per_piece, 0);
  
  -- If order doesn't have cost/price stored, skip profit calculation
  IF v_cost_per_piece = 0 OR v_price_per_piece = 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate total profits for the order
  v_gross_profit := NEW.total_price - (v_cost_per_piece * NEW.quantity);
  v_net_profit := NEW.total_price - (v_cost_per_piece * NEW.quantity) - NEW.payment_fees - NEW.delivery_fees;

  -- Split profits: 80% Shady, 20% Tamer
  v_shady_gross_profit := v_gross_profit * 0.8;
  v_shady_net_profit := v_net_profit * 0.8;
  v_tamer_gross_profit := v_gross_profit * 0.2;
  v_tamer_net_profit := v_net_profit * 0.2;

  -- Insert or update profit record for Shady (80%)
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
    v_shady_gross_profit,
    v_shady_net_profit,
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

  -- Insert or update profit record for Tamer (20%)
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
    v_tamer_gross_profit,
    v_tamer_net_profit,
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

-- The trigger is already created, it will use the updated function automatically






