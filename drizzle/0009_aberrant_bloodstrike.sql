CREATE TABLE `audit_trail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableName` varchar(100) NOT NULL,
	`recordId` int NOT NULL,
	`action` enum('CREATE','UPDATE','DELETE') NOT NULL,
	`oldValues` text,
	`newValues` text,
	`userId` varchar(100),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_trail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dailyreports` (
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
	CONSTRAINT `dailyreports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`level` enum('debug','info','warn','error') NOT NULL,
	`message` text NOT NULL,
	`userId` varchar(100),
	`action` varchar(100),
	`resource` varchar(100),
	`resourceId` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(100),
	`title` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`type` enum('info','success','warning','error') NOT NULL DEFAULT 'info',
	`isRead` boolean NOT NULL DEFAULT false,
	`actionUrl` varchar(500),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paneldailybalances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`panelId` int NOT NULL,
	`date` date NOT NULL,
	`openingBalance` decimal(15,2) NOT NULL DEFAULT '0.00',
	`closingBalance` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalDeposits` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalWithdrawals` decimal(15,2) NOT NULL DEFAULT '0.00',
	`bonusPoints` decimal(15,2) NOT NULL DEFAULT '0.00',
	`topUp` decimal(15,2) NOT NULL DEFAULT '0.00',
	`extraDeposit` decimal(15,2) NOT NULL DEFAULT '0.00',
	`profitLoss` decimal(15,2) NOT NULL DEFAULT '0.00',
	`timezone` varchar(20) NOT NULL DEFAULT 'GMT+5:30',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paneldailybalances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`description` text,
	`permissions` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(255) NOT NULL,
	`userId` varchar(100) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`userAgent` text,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`type` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
	`category` varchar(50) NOT NULL DEFAULT 'general',
	`isPublic` boolean NOT NULL DEFAULT false,
	`updatedBy` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `topuphistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`panelId` int NOT NULL,
	`panelName` varchar(100) NOT NULL,
	`previousTopUp` int NOT NULL DEFAULT 0,
	`amountAdded` int NOT NULL DEFAULT 0,
	`newTopUp` int NOT NULL DEFAULT 0,
	`previousClosingBalance` int NOT NULL DEFAULT 0,
	`newClosingBalance` int NOT NULL DEFAULT 0,
	`previousPointsBalance` int NOT NULL DEFAULT 0,
	`newPointsBalance` int NOT NULL DEFAULT 0,
	`createdBy` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `topuphistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`oauthOpenId` varchar(64),
	`adminUsername` varchar(50),
	`roleId` int NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`assignedBy` varchar(100),
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `bankAccounts`;--> statement-breakpoint
DROP TABLE `dailyReports`;--> statement-breakpoint
RENAME TABLE `panelDailyBalances` TO `bankaccounts`;--> statement-breakpoint
ALTER TABLE `bankaccounts` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `bankaccounts` MODIFY COLUMN `openingBalance` int NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` MODIFY COLUMN `openingBalance` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bankaccounts` MODIFY COLUMN `closingBalance` int NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` MODIFY COLUMN `closingBalance` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `deposits` ADD `accountNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `accountHolderName` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `accountNumber` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `bankName` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `accountType` enum('Deposit','Withdrawal','Both') DEFAULT 'Both' NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `totalCharges` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `feeIMPS` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `feeRTGS` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `feeNEFT` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `feeUPI` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `feePhonePe` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `feeGooglePay` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `feePaytm` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD `isActive` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `panels` ADD `topUp` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `withdrawals` ADD `accountNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `bankaccounts` ADD CONSTRAINT `bankaccounts_accountNumber_unique` UNIQUE(`accountNumber`);--> statement-breakpoint
ALTER TABLE `bankaccounts` DROP COLUMN `panelId`;--> statement-breakpoint
ALTER TABLE `bankaccounts` DROP COLUMN `date`;--> statement-breakpoint
ALTER TABLE `bankaccounts` DROP COLUMN `totalDeposits`;--> statement-breakpoint
ALTER TABLE `bankaccounts` DROP COLUMN `totalWithdrawals`;--> statement-breakpoint
ALTER TABLE `bankaccounts` DROP COLUMN `bonusPoints`;--> statement-breakpoint
ALTER TABLE `bankaccounts` DROP COLUMN `settling`;--> statement-breakpoint
ALTER TABLE `bankaccounts` DROP COLUMN `extraDeposit`;--> statement-breakpoint
ALTER TABLE `bankaccounts` DROP COLUMN `profitLoss`;--> statement-breakpoint
ALTER TABLE `bankaccounts` DROP COLUMN `timezone`;--> statement-breakpoint
ALTER TABLE `panels` DROP COLUMN `settling`;