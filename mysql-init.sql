-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS khiladi247_v3 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a user with no password for local development
CREATE USER IF NOT EXISTS 'khiladi_user'@'localhost' IDENTIFIED BY '';

-- Grant all privileges to the user on the khiladi247_v3 database
GRANT ALL PRIVILEGES ON khiladi247_v3.* TO 'khiladi_user'@'localhost';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;
