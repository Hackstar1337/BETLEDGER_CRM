-- Create topUpHistory table to track all top-up transactions
CREATE TABLE `topUpHistory` (
  `id` int NOT NULL AUTO_INCREMENT,
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
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_panelId` (`panelId`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
