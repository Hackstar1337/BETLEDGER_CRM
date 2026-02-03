ALTER TABLE `bankAccounts` ADD `feeIMPS` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankAccounts` ADD `feeRTGS` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankAccounts` ADD `feeNEFT` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankAccounts` ADD `feeUPI` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankAccounts` ADD `feePhonePe` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankAccounts` ADD `feeGooglePay` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bankAccounts` ADD `feePaytm` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `withdrawals` ADD `paymentMethod` enum('IMPS','RTGS','NEFT','UPI','PhonePe','GooglePay','Paytm');--> statement-breakpoint
ALTER TABLE `withdrawals` ADD `transactionCharge` int DEFAULT 0 NOT NULL;