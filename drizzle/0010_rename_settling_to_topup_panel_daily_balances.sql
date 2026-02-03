-- Rename settling column to topUp in panelDailyBalances table
ALTER TABLE `panelDailyBalances` CHANGE COLUMN `settling` `topUp` decimal(15,2) NOT NULL DEFAULT 0.00;
