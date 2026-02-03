-- Khiladi247 Database Setup Script
-- This script creates all necessary tables for the Khiladi247 application

USE khiladi247;

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

-- Panels table
CREATE TABLE IF NOT EXISTS `panels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL UNIQUE,
	`pointsBalance` int NOT NULL DEFAULT 0,
	`openingBalance` int NOT NULL DEFAULT 0,
	`closingBalance` int NOT NULL DEFAULT 0,
	`settling` int NOT NULL DEFAULT 0,
	`extraDeposit` int NOT NULL DEFAULT 0,
	`bonusPoints` int NOT NULL DEFAULT 0,
	`profitLoss` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `panels_id` PRIMARY KEY(`id`)
);

-- Bank Accounts table
CREATE TABLE IF NOT EXISTS `bankAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountHolderName` varchar(200) NOT NULL,
	`accountNumber` varchar(50) NOT NULL,
	`bankName` varchar(200) NOT NULL,
	`accountType` enum('Deposit','Withdrawal') NOT NULL DEFAULT 'Deposit',
	`openingBalance` int NOT NULL DEFAULT 0,
	`closingBalance` int NOT NULL DEFAULT 0,
	`totalCharges` int NOT NULL DEFAULT 0,
	`feeIMPS` int NOT NULL DEFAULT 0,
	`feeRTGS` int NOT NULL DEFAULT 0,
	`feeNEFT` int NOT NULL DEFAULT 0,
	`feeUPI` int NOT NULL DEFAULT 0,
	`feePhonePe` int NOT NULL DEFAULT 0,
	`feeGooglePay` int NOT NULL DEFAULT 0,
	`feePaytm` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bankAccounts_id` PRIMARY KEY(`id`)
);

-- Players table
CREATE TABLE IF NOT EXISTS `players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(100) NOT NULL UNIQUE,
	`name` varchar(200),
	`panelName` varchar(100) NOT NULL,
	`balance` decimal(15,2) DEFAULT '0.00' NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `players_id` PRIMARY KEY(`id`)
);

-- Deposits table
CREATE TABLE IF NOT EXISTS `deposits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(100) NOT NULL,
	`amount` int NOT NULL,
	`utr` varchar(100),
	`bankName` varchar(200),
	`panelName` varchar(100) NOT NULL,
	`bonusPoints` int NOT NULL DEFAULT 0,
	`isExtraDeposit` int NOT NULL DEFAULT 0,
	`isWrongDeposit` int NOT NULL DEFAULT 0,
	`depositDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deposits_id` PRIMARY KEY(`id`)
);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS `withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(100) NOT NULL,
	`amount` int NOT NULL,
	`utr` varchar(100),
	`bankName` varchar(200),
	`panelName` varchar(100) NOT NULL,
	`paymentMethod` enum('IMPS','RTGS','NEFT','UPI','PhonePe','GooglePay','Paytm'),
	`transactionCharge` int NOT NULL DEFAULT 0,
	`isExtraWithdrawal` int NOT NULL DEFAULT 0,
	`isWrongWithdrawal` int NOT NULL DEFAULT 0,
	`status` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL,
	`withdrawalDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `withdrawals_id` PRIMARY KEY(`id`)
);

-- Gameplay Transactions table
CREATE TABLE IF NOT EXISTS `gameplayTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(100) NOT NULL,
	`panelName` varchar(100) NOT NULL,
	`transactionType` enum('Win','Loss') NOT NULL,
	`amount` int NOT NULL,
	`notes` text,
	`transactionDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gameplayTransactions_id` PRIMARY KEY(`id`)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('deposit','withdrawal','incoming','outgoing') NOT NULL,
	`amount` int NOT NULL,
	`utr` varchar(100),
	`bankAccountId` int,
	`panelName` varchar(100),
	`userId` varchar(100),
	`description` text,
	`transactionDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);

-- Daily Reports table
CREATE TABLE IF NOT EXISTS `dailyReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportDate` timestamp NOT NULL,
	`totalDeposits` int NOT NULL DEFAULT 0,
	`totalWithdrawals` int NOT NULL DEFAULT 0,
	`totalProfitLoss` int NOT NULL DEFAULT 0,
	`numberOfDeposits` int NOT NULL DEFAULT 0,
	`numberOfWithdrawals` int NOT NULL DEFAULT 0,
	`uniquePlayersDeposited` int NOT NULL DEFAULT 0,
	`uniquePlayersWithdrew` int NOT NULL DEFAULT 0,
	`newIdsCreated` int NOT NULL DEFAULT 0,
	`reportData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyReports_id` PRIMARY KEY(`id`)
);

-- Admin Users table
CREATE TABLE IF NOT EXISTS `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(50) NOT NULL UNIQUE,
	`password_hash` varchar(255) NOT NULL,
	`email` varchar(320),
	`full_name` varchar(100),
	`is_active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastLoginAt` timestamp,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`)
);
