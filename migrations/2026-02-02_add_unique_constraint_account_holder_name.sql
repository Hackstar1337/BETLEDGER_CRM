-- Add unique constraint on bankAccounts.accountHolderName
-- Migration: 2026-02-02_add_unique_constraint_account_holder_name.sql

-- First, check for and handle any existing duplicates
-- This will prevent the unique constraint from failing if there are already duplicates

-- Create a temporary table to store duplicates
CREATE TEMPORARY TABLE temp_duplicate_holders AS
SELECT accountHolderName, COUNT(*) as count
FROM bankaccounts
GROUP BY accountHolderName
HAVING COUNT(*) > 1;

-- If duplicates exist, we'll need to handle them
-- For this migration, we'll append a suffix to make them unique
SET @row_number = 0;
SET @prev_holder = '';

UPDATE bankaccounts 
SET accountHolderName = CASE 
    WHEN (
        SELECT COUNT(*) 
        FROM bankaccounts b2 
        WHERE b2.accountHolderName = bankaccounts.accountHolderName 
        AND b2.id < bankaccounts.id
    ) > 0 
    THEN CONCAT(accountHolderName, '_', (SELECT COUNT(*) FROM bankaccounts b2 WHERE b2.accountHolderName = bankaccounts.accountHolderName AND b2.id < bankaccounts.id) + 1)
    ELSE accountHolderName
END;

-- Now add the unique constraint
ALTER TABLE bankaccounts 
ADD CONSTRAINT uq_bankaccounts_account_holder_name 
UNIQUE (accountHolderName);

-- Clean up
DROP TEMPORARY TABLE IF EXISTS temp_duplicate_holders;
