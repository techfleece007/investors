-- Complete User ID Fix Script
-- This script safely updates the database to match the actual Supabase Auth user IDs
-- Handles all constraints: unique email, foreign keys, etc.

-- Step 1: Show current state
SELECT '=== CURRENT STATE ===' as info;
SELECT 'Current Investors:' as info;
SELECT * FROM investors;

SELECT 'Current Shipments:' as info;
SELECT id, name, paid_by, details FROM shipments;

SELECT 'Current Expenses:' as info;
SELECT id, details, paid_by, amount FROM expenses;

SELECT 'Current Profits:' as info;
SELECT id, order_id, investor_id, gross_profit FROM profits;

-- Step 2: Update existing investor records to use the correct Supabase Auth IDs
-- This approach updates the existing records instead of creating new ones

-- Update Shady's record
UPDATE investors 
SET id = '99961004-f545-45cb-ad3e-3b67d25b6a5a',  -- Shady's Supabase Auth ID
    updated_at = now()
WHERE email = 'prvyit@gmail.com';

-- Update Tamer's record  
UPDATE investors 
SET id = 'f76e8781-785b-43af-893d-7a8e69c2f5a0',  -- Tamer's Supabase Auth ID
    updated_at = now()
WHERE email = 'qudaih.tamer@gmail.com';

-- Step 3: Update all foreign key references to point to the new IDs
-- Update shipments table
UPDATE shipments 
SET paid_by = 'f76e8781-785b-43af-893d-7a8e69c2f5a0'  -- Tamer's new ID
WHERE paid_by = 'c6455e11-e4ba-4240-9b6c-45b7352988ae';  -- Tamer's old ID

UPDATE shipments 
SET paid_by = 'f76e8781-785b-43af-893d-7a8e69c2f5a0'  -- Tamer's new ID
WHERE paid_by = 'ec91efc1-3d73-4395-8290-f1700e55dad1';  -- Any other old Tamer ID

-- Update expenses table
UPDATE expenses 
SET paid_by = 'f76e8781-785b-43af-893d-7a8e69c2f5a0'  -- Tamer's new ID
WHERE paid_by = 'c6455e11-e4ba-4240-9b6c-45b7352988ae';  -- Tamer's old ID

UPDATE expenses 
SET paid_by = 'f76e8781-785b-43af-893d-7a8e69c2f5a0'  -- Tamer's new ID
WHERE paid_by = 'ec91efc1-3d73-4395-8290-f1700e55dad1';  -- Any other old Tamer ID

-- Update profits table
UPDATE profits 
SET investor_id = '99961004-f545-45cb-ad3e-3b67d25b6a5a'  -- Shady's new ID
WHERE investor_id = 'fdd6c5c2-a39b-476d-a59b-396732f126e9';  -- Shady's old ID

UPDATE profits 
SET investor_id = 'f76e8781-785b-43af-893d-7a8e69c2f5a0'  -- Tamer's new ID
WHERE investor_id = 'c6455e11-e4ba-4240-9b6c-45b7352988ae';  -- Tamer's old ID

UPDATE profits 
SET investor_id = 'f76e8781-785b-43af-893d-7a8e69c2f5a0'  -- Tamer's new ID
WHERE investor_id = 'ec91efc1-3d73-4395-8290-f1700e55dad1';  -- Any other old Tamer ID

-- Step 4: Clean up any orphaned investor records (if they exist)
-- Only delete records that are not referenced by any foreign keys
DELETE FROM investors 
WHERE id IN ('fdd6c5c2-a39b-476d-a59b-396732f126e9', 'c6455e11-e4ba-4240-9b6c-45b7352988ae', 'ec91efc1-3d73-4395-8290-f1700e55dad1')
AND id NOT IN (
    SELECT DISTINCT paid_by FROM shipments WHERE paid_by IS NOT NULL
    UNION
    SELECT DISTINCT paid_by FROM expenses WHERE paid_by IS NOT NULL  
    UNION
    SELECT DISTINCT investor_id FROM profits WHERE investor_id IS NOT NULL
);

-- Step 5: Verify final state
SELECT '=== FINAL STATE ===' as info;
SELECT 'Final Investors:' as info;
SELECT * FROM investors;

SELECT 'Final Shipments:' as info;
SELECT id, name, paid_by, details FROM shipments;

SELECT 'Final Expenses:' as info;
SELECT id, details, paid_by, amount FROM expenses;

SELECT 'Final Profits:' as info;
SELECT id, order_id, investor_id, gross_profit FROM profits;

-- Step 6: Verify foreign key integrity
SELECT '=== FOREIGN KEY VERIFICATION ===' as info;
SELECT 'Shipments with invalid investor references:' as info;
SELECT s.id, s.name, s.paid_by 
FROM shipments s 
LEFT JOIN investors i ON s.paid_by = i.id 
WHERE s.paid_by IS NOT NULL AND i.id IS NULL;

SELECT 'Expenses with invalid investor references:' as info;
SELECT e.id, e.details, e.paid_by 
FROM expenses e 
LEFT JOIN investors i ON e.paid_by = i.id 
WHERE e.paid_by IS NOT NULL AND i.id IS NULL;

SELECT 'Profits with invalid investor references:' as info;
SELECT p.id, p.order_id, p.investor_id 
FROM profits p 
LEFT JOIN investors i ON p.investor_id = i.id 
WHERE p.investor_id IS NOT NULL AND i.id IS NULL;
