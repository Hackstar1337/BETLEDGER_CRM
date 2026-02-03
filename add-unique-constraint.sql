-- Simple script to add unique constraint to accountHolderName
-- Run this directly in your MySQL client

-- First, handle any existing duplicates by making them unique
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

-- Add the unique constraint
ALTER TABLE bankaccounts 
ADD UNIQUE KEY uq_account_holder_name (accountHolderName);
