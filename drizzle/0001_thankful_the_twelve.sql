CREATE TABLE `bankAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountHolderName` varchar(200) NOT NULL,
	`accountNumber` varchar(50) NOT NULL,
	`bankName` varchar(200) NOT NULL,
	`openingBalance` int NOT NULL DEFAULT 0,
	`closingBalance` int NOT NULL DEFAULT 0,
	`totalCharges` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bankAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dailyReports` (
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
--> statement-breakpoint
CREATE TABLE `deposits` (
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
--> statement-breakpoint
CREATE TABLE `panels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`openingBalance` int NOT NULL DEFAULT 0,
	`closingBalance` int NOT NULL DEFAULT 0,
	`settling` int NOT NULL DEFAULT 0,
	`extraDeposit` int NOT NULL DEFAULT 0,
	`bonusPoints` int NOT NULL DEFAULT 0,
	`profitLoss` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `panels_id` PRIMARY KEY(`id`),
	CONSTRAINT `panels_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(100) NOT NULL,
	`name` varchar(200),
	`panelName` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `players_id` PRIMARY KEY(`id`),
	CONSTRAINT `players_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
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
--> statement-breakpoint
CREATE TABLE `withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(100) NOT NULL,
	`amount` int NOT NULL,
	`utr` varchar(100),
	`bankName` varchar(200),
	`panelName` varchar(100) NOT NULL,
	`isExtraWithdrawal` int NOT NULL DEFAULT 0,
	`isWrongWithdrawal` int NOT NULL DEFAULT 0,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`withdrawalDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `withdrawals_id` PRIMARY KEY(`id`)
);
