# Production Deployment Checklist

## ✅ Completed Tasks

### 1. Database Triggers
- ✅ Created `auto_update_product_quantity_trigger.sql` - Automatically updates product total quantity when variant quantities change
- ✅ Profit calculation trigger already exists and works correctly (80/20 split)

### 2. Order Operations
- ✅ New orders: Correctly deducts variant quantities (product quantity auto-updated by trigger)
- ✅ Order cancellation: Correctly restores variant quantities (product quantity auto-updated by trigger)
- ✅ Order exchange: Correctly handles variant quantity changes (product quantity auto-updated by trigger)
- ✅ Order editing: Correctly handles quantity changes (product quantity auto-updated by trigger)

### 3. Email Notifications
- ✅ New orders: Email sent ✅
- ✅ Canceled orders: Email sent ✅
- ✅ Exchanged orders: Email sent ✅
- ✅ Order edits: Email NOT sent (removed) ✅
- ✅ Status changes: Email NOT sent (removed) ✅

### 4. Code Cleanup
- ✅ Removed all manual product quantity updates (trigger handles it automatically)
- ✅ Removed email sending from order edits and status changes
- ✅ Removed one-time migration scripts (restore_order_3499.sql, update_inventory_for_order_3499.sql)

## 📋 Pre-Deployment Steps

1. **Run Required Migrations** (in order):
   ```sql
   -- 1. Add cost/price columns
   migrations/add_orders_cost_price_columns.sql
   migrations/add_profits_cost_price_columns.sql
   
   -- 2. Create triggers
   migrations/create_profit_trigger.sql
   migrations/auto_update_product_quantity_trigger.sql
   ```

2. **Environment Variables** (check `.env.local` or Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EMAIL_PASSWORD` (for email notifications)
   - `NEXT_PUBLIC_APP_URL` (for email links)

3. **Verify Database Constraints**:
   - Check constraint `profits_exclude_investor_10fd29e7` exists on profits table
   - Unique constraint `profits_order_id_investor_id_key` exists

4. **Test Critical Flows**:
   - Create new order → Check variant and product quantities update
   - Cancel order → Check quantities restore correctly
   - Exchange order → Check quantities update correctly
   - Edit order → Check quantities update correctly
   - Update variant quantity manually → Check product quantity auto-updates

## 🚀 Deployment

1. Push to GitHub
2. Deploy to Vercel
3. Run migrations in Supabase SQL Editor
4. Test all critical flows in production

## 📝 Notes

- Product total quantity is now automatically calculated from variant quantities via trigger
- No manual product quantity updates needed in code
- Emails only sent for: new orders, canceled orders, exchanged orders
- All order operations (new, cancel, exchange, edit) work correctly with automatic inventory management

