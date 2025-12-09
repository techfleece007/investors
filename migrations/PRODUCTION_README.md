# Production Migration Guide

## Required Migrations (Run in Order)

1. **add_orders_cost_price_columns.sql** - Adds cost_per_piece and price_per_piece to orders table
2. **add_profits_cost_price_columns.sql** - Adds cost_per_piece and price_per_piece to profits table
3. **create_profit_trigger.sql** - Creates the profit calculation trigger (80/20 split)
4. **auto_update_product_quantity_trigger.sql** - Creates trigger to auto-update product quantity from variants

## Optional/One-Time Migrations

- **update_profit_trigger_for_two_investors.sql** - Updates profit trigger if needed
- **recalculate_all_profits_correctly.sql** - Use only if you need to recalculate all existing profits

## Development/One-Time Scripts (Do NOT run in production)

- **restore_order_3499.sql** - One-time order restoration script
- **update_inventory_for_order_3499.sql** - One-time inventory update
- **recalculate_profits_nov_2025.sql** - One-time recalculation script
- **cleanup_unnecessary_tables.sql** - Review before running

## Documentation Files

- **PROFIT_CALCULATION_GUIDE.md** - Guide for profit calculations
- **SUPABASE_CHANGES_SUMMARY.md** - Summary of database changes

