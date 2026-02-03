CREATE TABLE `gameplayTransactions` (
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
