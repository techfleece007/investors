-- Fix Row Level Security Policies for Authenticated Users
-- This script adds policies for authenticated users to access all tables

-- Step 1: Check current policies
SELECT '=== CURRENT POLICIES ===' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Step 2: Add policies for authenticated users
-- These policies allow authenticated users to access all data

-- Investors table policies
CREATE POLICY "Allow authenticated read access to investors" ON investors 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert to investors" ON investors 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update to investors" ON investors 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete from investors" ON investors 
FOR DELETE TO authenticated USING (true);

-- Products table policies
CREATE POLICY "Allow authenticated read access to products" ON products 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert to products" ON products 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update to products" ON products 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete from products" ON products 
FOR DELETE TO authenticated USING (true);

-- Product variants table policies
CREATE POLICY "Allow authenticated read access to product_variants" ON product_variants 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert to product_variants" ON product_variants 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update to product_variants" ON product_variants 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete from product_variants" ON product_variants 
FOR DELETE TO authenticated USING (true);

-- Orders table policies
CREATE POLICY "Allow authenticated read access to orders" ON orders 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert to orders" ON orders 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update to orders" ON orders 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete from orders" ON orders 
FOR DELETE TO authenticated USING (true);

-- Shipments table policies
CREATE POLICY "Allow authenticated read access to shipments" ON shipments 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert to shipments" ON shipments 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update to shipments" ON shipments 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete from shipments" ON shipments 
FOR DELETE TO authenticated USING (true);

-- Expenses table policies
CREATE POLICY "Allow authenticated read access to expenses" ON expenses 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert to expenses" ON expenses 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update to expenses" ON expenses 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete from expenses" ON expenses 
FOR DELETE TO authenticated USING (true);

-- Profits table policies
CREATE POLICY "Allow authenticated read access to profits" ON profits 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert to profits" ON profits 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update to profits" ON profits 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete from profits" ON profits 
FOR DELETE TO authenticated USING (true);

-- Step 3: Verify all policies are created
SELECT '=== FINAL POLICIES ===' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Step 4: Test access (this should work after running the script)
SELECT '=== TEST QUERIES ===' as info;
SELECT 'Testing products access...' as info;
SELECT COUNT(*) as product_count FROM products;

SELECT 'Testing investors access...' as info;
SELECT COUNT(*) as investor_count FROM investors;

SELECT 'Testing shipments access...' as info;
SELECT COUNT(*) as shipment_count FROM shipments;
