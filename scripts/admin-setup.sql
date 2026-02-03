-- Khiladi247 Management Panel - Admin User Setup
-- Run this SQL in your Railway MySQL database

-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(320),
  full_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastLoginAt TIMESTAMP NULL
);

-- Delete existing admin user (if you want to reset)
-- DELETE FROM admin_users WHERE username = 'admin';

-- Insert admin user
-- Password: UXgCTqyrrEQbYDvQ
-- IMPORTANT: Change this password after first login!
INSERT INTO admin_users (username, password_hash, email, full_name, is_active, createdAt, updatedAt) 
VALUES (
  'admin',
  '$2b$10$81UvlbyWhaYOfidglhC.B.KZPt3f0lNfcjF0g529uNMh8Tt9iIhW.',
  'admin@khiladi247.com',
  'System Administrator',
  TRUE,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE 
  password_hash = VALUES(password_hash),
  updatedAt = NOW();

-- Verify admin user was created
SELECT id, username, email, full_name, is_active, createdAt FROM admin_users WHERE username = 'admin';
