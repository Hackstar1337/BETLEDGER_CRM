-- Create panelDailyBalances table for tracking daily balance snapshots
CREATE TABLE IF NOT EXISTS `panelDailyBalances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`panelId` int NOT NULL,
	`date` date NOT NULL,
	`openingBalance` decimal(15,2) NOT NULL DEFAULT 0,
	`closingBalance` decimal(15,2) NOT NULL DEFAULT 0,
	`totalDeposits` decimal(15,2) NOT NULL DEFAULT 0,
	`totalWithdrawals` decimal(15,2) NOT NULL DEFAULT 0,
	`bonusPoints` decimal(15,2) NOT NULL DEFAULT 0,
	`settling` decimal(15,2) NOT NULL DEFAULT 0,
	`extraDeposit` decimal(15,2) NOT NULL DEFAULT 0,
	`bonusPoints` decimal(15,2) NOT NULL DEFAULT 0,
	`profitLoss` decimal(15,2) NOT NULL DEFAULT 0,
	`timezone` varchar(20) NOT NULL DEFAULT 'GMT+5:30',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY(`id`),
	UNIQUE(`panelId`, `date`),
	CONSTRAINT `panelDailyBalances_panelId` FOREIGN KEY(`panelId`) REFERENCES `panels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS `panelDailyBalances_date_idx` ON `panelDailyBalances`(`date`);
