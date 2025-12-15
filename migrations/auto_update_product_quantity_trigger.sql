-- Create trigger to automatically update product total quantity when variant quantity changes
-- This ensures product.quantity always equals the sum of all variant quantities for that product

CREATE OR REPLACE FUNCTION update_product_quantity_from_variants()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the product's total quantity to be the sum of all variant quantities
  UPDATE products
  SET quantity = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM product_variants
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_product_quantity_from_variants ON product_variants;

-- Create trigger that fires after INSERT, UPDATE, or DELETE on product_variants
CREATE TRIGGER trigger_update_product_quantity_from_variants
  AFTER INSERT OR UPDATE OF quantity OR DELETE
  ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_quantity_from_variants();

-- Initial sync: Update all product quantities to match their variants
UPDATE products p
SET quantity = (
  SELECT COALESCE(SUM(quantity), 0)
  FROM product_variants pv
  WHERE pv.product_id = p.id
),
updated_at = NOW();


