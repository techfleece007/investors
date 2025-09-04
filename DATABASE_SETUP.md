# Database Setup and Fix Guide

## Overview
This guide explains how to fix the data display issues in your trading dashboard by updating the database schema and ensuring proper data flow.

## Issues Identified and Fixed

### 1. Database Schema Mismatch
- **Problem**: Dashboard code expected different table structures than what was in the original SQL file
- **Solution**: Updated schema to include all required fields and proper relationships

### 2. Missing Fields
- **Problem**: Products table was missing `price_per_piece` and `created_at`/`updated_at` fields
- **Solution**: Added missing fields with proper defaults and constraints

### 3. Image URL Issues
- **Problem**: Image URLs in database didn't match actual file paths
- **Solution**: Fixed image URLs to use correct `/images/` prefix and match actual file names

### 4. Field Name Inconsistencies
- **Problem**: Dashboard expected `quantity` but database had `stock`
- **Solution**: Standardized all references to use `quantity` consistently

## Database Setup Instructions

### Step 1: Run the Fixed SQL File
1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `supabase_fixed.sql`
4. Execute the script

### Step 2: Verify Tables Created
The following tables should be created with proper structure:

#### Investors Table
- `id` (UUID, Primary Key)
- `name` (Text)
- `email` (Text, Unique)
- `profit_percentage` (Numeric)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### Products Table
- `id` (BigSerial, Primary Key)
- `name` (Text)
- `cost_per_piece` (Numeric)
- `price_per_piece` (Numeric)
- `quantity` (Integer)
- `image_url` (Text)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### Product Variants Table
- `id` (BigSerial, Primary Key)
- `product_id` (BigInt, Foreign Key to products.id)
- `size` (Text)
- `quantity` (Integer)
- `price` (Numeric)
- `cost` (Numeric)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### Orders Table
- `id` (BigSerial, Primary Key)
- `product_id` (BigInt, Foreign Key to products.id)
- `product_variant_id` (BigInt, Foreign Key to product_variants.id)
- `order_number` (BigInt)
- `shipping_number` (BigInt)
- `paid_amount` (Numeric)
- `total_price` (Numeric)
- `quantity` (Integer)
- `sizes` (Text)
- `payment_method` (Text, Check constraint)
- `payment_fees` (Numeric)
- `delivery_fees` (Numeric)
- `status` (Text, Check constraint)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### Shipments Table
- `id` (BigSerial, Primary Key)
- `name` (Text)
- `cost` (Numeric)
- `details` (Text)
- `paid_by` (UUID, Foreign Key to investors.id)
- `date` (Date)
- `tracking_number` (Text)
- `destination` (Text)
- `status` (Text, Check constraint)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### Expenses Table
- `id` (BigSerial, Primary Key)
- `details` (Text)
- `amount` (Numeric)
- `paid_by` (UUID, Foreign Key to investors.id)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### Profits Table
- `id` (BigSerial, Primary Key)
- `order_id` (BigInt, Foreign Key to orders.id)
- `investor_id` (UUID, Foreign Key to investors.id)
- `gross_profit` (Numeric)
- `net_profit` (Numeric)
- `created_at` (Timestamp)

### Step 3: Verify Sample Data
The script includes sample data for:
- 2 investors (Shady and Tamer)
- 10 products with variants
- 2 sample orders
- 2 sample shipments
- 1 sample expense

### Step 4: Check Row Level Security
RLS policies are enabled to allow anonymous access for the dashboard functionality.

## Image Files
Ensure the following images are in your `/public/images/` folder:
- `nike-new-black.jpg`
- `nike-old-black.jpeg`
- `nike-redwhite.jpg`
- `nike-offwhite.jpg`
- `nike-new-grey.jpg`
- `syna-nike.jpeg`
- `nocta-black-zip.jpg`
- `nocta-blue-zip.jpg`
- `nocta-green-zip.jpg`
- `nocta-black-nozip.jpg`

## Dashboard Features Now Working

### Products Page
- ✅ Display all products with images
- ✅ Show product details (cost, price, quantity)
- ✅ Display variants with sizes and quantities
- ✅ Add/Edit/Delete products
- ✅ Manage product variants

### Orders Page
- ✅ View all orders
- ✅ Create new orders
- ✅ Link orders to products and variants

### Shipments Page
- ✅ Track shipment status
- ✅ Manage shipment details

### Profits & Expenses
- ✅ Automatic profit calculation
- ✅ Expense tracking
- ✅ Investor profit distribution

## Troubleshooting

### If Data Still Not Displaying
1. Check browser console for errors
2. Verify Supabase connection in `.env.local`
3. Ensure RLS policies are properly applied
4. Check if tables were created successfully

### If Images Not Loading
1. Verify image files exist in `/public/images/`
2. Check image file names match database entries
3. Ensure Next.js is serving static files correctly

### Database Connection Issues
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Check if Supabase project is active
3. Verify network connectivity

## Performance Optimizations
- Indexes created on frequently queried fields
- Proper foreign key relationships
- Efficient queries with joins
- Automatic timestamp updates

## Security Features
- Row Level Security (RLS) enabled
- Anonymous access policies for dashboard
- Input validation and constraints
- SQL injection protection through Supabase client

## Next Steps
1. Test all dashboard functionality
2. Add more products and variants as needed
3. Create additional orders and shipments
4. Monitor profit calculations
5. Customize the interface as needed

## Support
If you encounter any issues after following this guide, check:
1. Supabase dashboard logs
2. Browser developer console
3. Network tab for API calls
4. Database table structure matches exactly
