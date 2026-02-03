-- Daily Ledger System Schema
-- Created: 2026-02-03
-- Purpose: Immutable daily ledger records for panels and bank accounts

-- Panel Daily Ledger Table
CREATE TABLE IF NOT EXISTS `panel_daily_ledger` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `panel_id` INT NOT NULL,
    `ledger_date` DATE NOT NULL,
    `opening_balance` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `closing_balance` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `points_balance` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_deposits` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_withdrawals` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `bonus_points` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `top_up` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `profit_loss` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `roi` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `utilization` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_panel_date` (`panel_id`, `ledger_date`),
    INDEX `idx_ledger_date` (`ledger_date`),
    INDEX `idx_panel_date` (`panel_id`, `ledger_date`),
    INDEX `idx_status` (`status`),
    FOREIGN KEY (`panel_id`) REFERENCES `panels`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bank Daily Ledger Table
CREATE TABLE IF NOT EXISTS `bank_daily_ledger` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `bank_account_id` INT NOT NULL,
    `ledger_date` DATE NOT NULL,
    `opening_balance` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `closing_balance` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_deposits` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_withdrawals` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_charges` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `profit_loss` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `roi` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_bank_date` (`bank_account_id`, `ledger_date`),
    INDEX `idx_ledger_date` (`ledger_date`),
    INDEX `idx_bank_date` (`bank_account_id`, `ledger_date`),
    INDEX `idx_status` (`status`),
    FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transaction Log Table - Records every financial event
CREATE TABLE IF NOT EXISTS `transaction_log` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `transaction_date` DATETIME NOT NULL,
    `ledger_date` DATE NOT NULL,
    `entity_type` ENUM('panel', 'bank') NOT NULL,
    `entity_id` INT NOT NULL,
    `transaction_type` ENUM('credit', 'debit') NOT NULL,
    `amount` DECIMAL(15,2) NOT NULL,
    `reference_type` ENUM('deposit', 'withdrawal', 'bonus', 'topup', 'charge', 'transfer') NOT NULL,
    `reference_id` INT NULL,
    `related_entity_type` ENUM('panel', 'bank') NULL,
    `related_entity_id` INT NULL,
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_entity_date` (`entity_type`, `entity_id`, `ledger_date`),
    INDEX `idx_transaction_date` (`transaction_date`),
    INDEX `idx_reference` (`reference_type`, `reference_id`),
    INDEX `idx_ledger_date` (`ledger_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Log Table - Track all critical operations
CREATE TABLE IF NOT EXISTS `audit_log` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `operation` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` INT,
    `data` JSON,
    `result` JSON,
    `user_id` VARCHAR(100),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_operation` (`operation`),
    INDEX `idx_entity` (`entity_type`, `entity_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial ledger records for all existing panels and bank accounts
-- This will be run by the migration script
