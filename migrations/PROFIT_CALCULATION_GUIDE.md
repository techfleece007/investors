# Profit Calculation Verification Guide

## How to Verify Profit Calculations Are Correct

### Step 1: Update the Trigger Function
Run `migrations/update_profit_trigger_for_two_investors.sql` to update the trigger to create profit records for BOTH investors with 80/20 split.

### Step 2: Recalculate All Existing Profits
Run `migrations/recalculate_all_profits_correctly.sql` to recalculate all profits with the correct 80/20 split.

### Step 3: Verify Calculations
Run `migrations/verify_profit_data_correctness.sql` to check if all calculations are correct.

## Expected Calculation Formulas

For each order:
1. **Total Gross Profit** = `total_price - (cost_per_piece × quantity)`
2. **Total Net Profit** = `total_price - (cost_per_piece × quantity) - payment_fees - delivery_fees`

For each investor:
1. **Shady's Gross Profit** = `Total Gross Profit × 0.8` (80%)
2. **Shady's Net Profit** = `Total Net Profit × 0.8` (80%)
3. **Tamer's Gross Profit** = `Total Gross Profit × 0.2` (20%)
4. **Tamer's Net Profit** = `Total Net Profit × 0.2` (20%)

## Verification Checklist

✅ **Check 1: Each order should have exactly 2 profit records**
- One for Shady (investor_id: `60c7d737-092a-46cb-a716-fd8f3a40dc1d`)
- One for Tamer (investor_id: `ec524300-de3e-44a7-895e-3f5b5718cccf`)

✅ **Check 2: Gross profit split should be 80/20**
- Shady's gross_profit + Tamer's gross_profit = Total Gross Profit
- Shady's percentage should be ~80%
- Tamer's percentage should be ~20%

✅ **Check 3: Net profit split should be 80/20**
- Shady's net_profit + Tamer's net_profit = Total Net Profit
- Shady's percentage should be ~80%
- Tamer's percentage should be ~20%

✅ **Check 4: cost_per_piece and price_per_piece should match**
- Both profit records for the same order should have the same `cost_per_piece` and `price_per_piece`
- These values should match the order's `cost_per_piece` and `price_per_piece`

## Sample Verification (Order 194)

Based on your data:
- Order 194: total_price = 220, cost_per_piece = 106.49, quantity = 1, payment_fees = 0, delivery_fees = 20

**Expected Calculations:**
- Total Gross Profit = 220 - (106.49 × 1) = **113.51**
- Total Net Profit = 220 - (106.49 × 1) - 0 - 20 = **93.51**

**Expected Split:**
- Shady's Gross Profit = 113.51 × 0.8 = **90.808**
- Shady's Net Profit = 93.51 × 0.8 = **74.808**
- Tamer's Gross Profit = 113.51 × 0.2 = **22.702**
- Tamer's Net Profit = 93.51 × 0.2 = **18.702**

**Your Current Data Shows:**
- Shady: gross_profit = 113.51, net_profit = 93.51 ❌ (Should be 80%: 90.808 and 74.808)
- Tamer: gross_profit = 59.528, net_profit = 11.905 ❌ (Should be 20%: 22.702 and 18.702)

**Conclusion:** The current data is NOT split correctly. You need to run the recalculation script.

## Running the Fix

1. **Update the trigger** (for future orders):
   ```sql
   -- Run: migrations/update_profit_trigger_for_two_investors.sql
   ```

2. **Recalculate existing profits**:
   ```sql
   -- Run: migrations/recalculate_all_profits_correctly.sql
   ```

3. **Verify the results**:
   ```sql
   -- Run: migrations/verify_profit_data_correctness.sql
   ```

## Important Notes

- The constraint you added (`profits_exclude_investor_10fd29e7`) will prevent the third investor from being added, which is correct.
- After running the recalculation, all profits should be split 80/20 correctly.
- The trigger will automatically create both profit records for all new/updated orders.




