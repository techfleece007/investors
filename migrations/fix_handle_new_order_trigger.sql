-- Fix handle_new_order trigger function to use proper schema prefix
-- This fixes the "relation products does not exist" error
-- Also ensures it excludes investor 10fd29e7-ad45-4784-a57a-8022fa5c5b41

-- Drop and recreate the function with explicit schema references
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profit records for all investors based on their profit_percentage
  -- This function is called AFTER an order is inserted
  -- It creates profit records for all investors in the investors table
  
  -- Only process completed or canceled orders
  IF NEW.status NOT IN ('completed', 'canceled') THEN
    RETURN NEW;
  END IF;

  -- Skip if cost_per_piece or price_per_piece are missing or zero
  IF NEW.cost_per_piece IS NULL OR NEW.cost_per_piece <= 0 OR 
     NEW.price_per_piece IS NULL OR NEW.price_per_piece <= 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate profits for each investor
  -- Use explicit schema prefix: public.investors, public.profits
  -- Exclude investor 10fd29e7-ad45-4784-a57a-8022fa5c5b41 (handled by check constraint, but we'll filter here too)
  INSERT INTO public.profits (
    order_id, 
    investor_id, 
    gross_profit, 
    net_profit,
    cost_per_piece,
    price_per_piece,
    created_at
  )
  SELECT 
    NEW.id,
    i.id,
    -- Calculate gross profit: total_price - (cost_per_piece * quantity)
    (NEW.total_price - (NEW.cost_per_piece * NEW.quantity)) * (i.profit_percentage / 100.0) as gross,
    -- Calculate net profit: total_price - (cost_per_piece * quantity) - payment_fees - delivery_fees
    (NEW.total_price - (NEW.cost_per_piece * NEW.quantity) - COALESCE(NEW.payment_fees, 0) - COALESCE(NEW.delivery_fees, 0)) * (i.profit_percentage / 100.0) as net,
    NEW.cost_per_piece,
    NEW.price_per_piece,
    NEW.created_at
  FROM public.investors i
  WHERE i.id != '10fd29e7-ad45-4784-a57a-8022fa5c5b41'::uuid  -- Exclude problematic investor
  ON CONFLICT (order_id, investor_id) 
  DO UPDATE SET
    gross_profit = EXCLUDED.gross_profit,
    net_profit = EXCLUDED.net_profit,
    cost_per_piece = EXCLUDED.cost_per_piece,
    price_per_piece = EXCLUDED.price_per_piece;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS trg_new_order ON public.orders;

CREATE TRIGGER trg_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_order();

-- Verify the function was created correctly
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'handle_new_order';

