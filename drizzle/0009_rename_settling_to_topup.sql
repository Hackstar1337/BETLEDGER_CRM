-- Rename settling column to topUp in panels table
ALTER TABLE `panels` CHANGE COLUMN `settling` `topUp` int NOT NULL DEFAULT 0;
