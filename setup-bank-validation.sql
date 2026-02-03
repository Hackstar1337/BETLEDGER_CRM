-- ============================================
-- Database Setup for Bank Account Validation
-- ============================================

-- Step 1: Check current table structure
DESCRIBE bankaccounts;

-- Step 2: Check existing indexes
SHOW INDEX FROM bankaccounts;

-- Step 3: Check unique constraints
SELECT CONSTRAINT_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'bankaccounts' 
AND CONSTRAINT_SCHEMA = DATABASE()
AND CONSTRAINT_NAME != 'PRIMARY';

-- Step 4: Handle existing duplicates (if any)
-- This will make duplicate account holder names unique by adding a suffix
UPDATE bankaccounts 
SET accountHolderName = CONCAT(accountHolderName, '_', id)
WHERE id IN (
    SELECT a.id FROM (
        SELECT id, accountHolderName,
               ROW_NUMBER() OVER (PARTITION BY accountHolderName ORDER BY id) as rn
        FROM bankaccounts
    ) a 
    WHERE a.rn > 1
);

-- Step 5: Add unique constraint on accountHolderName
-- Note: If this fails, it means there are still duplicates or the constraint already exists
ALTER TABLE bankaccounts 
ADD UNIQUE KEY uq_account_holder_name (accountHolderName);

-- Step 6: Verify the constraint was added
SHOW INDEX FROM bankaccounts;

-- Step 7: Test the setup
-- Clean up any existing test data first
DELETE FROM bankaccounts WHERE accountHolderName LIKE 'Test_%';

-- Test 1: Create first account
INSERT INTO bankaccounts (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance)
VALUES ('Test_User_1', 'TEST001', 'Same Bank Name', 'Deposit', 1000, 1000);

-- Test 2: Create second account with same bank but different holder (should work)
INSERT INTO bankaccounts (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance)
VALUES ('Test_User_2', 'TEST002', 'Same Bank Name', 'Deposit', 2000, 2000);

-- Test 3: Try to create duplicate holder (should fail)
INSERT INTO bankaccounts (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance)
VALUES ('Test_User_1', 'TEST003', 'Different Bank', 'Deposit', 3000, 3000);

-- View the results
SELECT * FROM bankaccounts WHERE accountHolderName LIKE 'Test_%';

-- Clean up test data
DELETE FROM bankaccounts WHERE accountHolderName LIKE 'Test_%';

-- ============================================
-- Expected Results:
-- - Test 1 and 2 should succeed
-- - Test 3 should fail with duplicate key error
-- - bankName can be duplicated
-- - accountHolderName must be unique
-- ============================================
