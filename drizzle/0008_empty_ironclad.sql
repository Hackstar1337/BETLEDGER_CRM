CREATE TABLE `panelDailyBalances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`panelId` int NOT NULL,
	`date` date NOT NULL,
	`openingBalance` decimal(15,2) NOT NULL DEFAULT '0.00',
	`closingBalance` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalDeposits` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalWithdrawals` decimal(15,2) NOT NULL DEFAULT '0.00',
	`bonusPoints` decimal(15,2) NOT NULL DEFAULT '0.00',
	`settling` decimal(15,2) NOT NULL DEFAULT '0.00',
	`extraDeposit` decimal(15,2) NOT NULL DEFAULT '0.00',
	`profitLoss` decimal(15,2) NOT NULL DEFAULT '0.00',
	`timezone` varchar(20) NOT NULL DEFAULT 'GMT+5:30',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `panelDailyBalances_id` PRIMARY KEY(`id`)
);
