-- Khiladi247 Management Panel - Complete Database Setup
-- Run this entire SQL in Railway MySQL Dashboard

-- =====================================================
-- 1. Create admin_users table
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(320),
  full_name VARCHAR(100),
  is_active TINYINT(1) DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastLoginAt TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. Create admin user with password: admin123
-- =====================================================
-- Password hash for "admin123" (bcrypt with 10 rounds)
INSERT INTO admin_users (username, password_hash, email, full_name, is_active, createdAt, updatedAt) 
VALUES (
  'admin',
  '$2b$10$yT08DDnLhuq7hGna06Rht.hwJ01pwZ0e6Y8TMda9UJLnXTVZbgKSu',
  'admin@khiladi247.com',
  'System Administrator',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE 
  password_hash = VALUES(password_hash),
  updatedAt = NOW();

-- =====================================================
-- 3. Verify the admin user exists
-- =====================================================
SELECT 'Admin user created successfully!' as status;
SELECT id, username, email, full_name, is_active, createdAt FROM admin_users WHERE username = 'admin';

-- =====================================================
-- 4. Show all tables in database (for verification)
-- =====================================================
SELECT 'Tables in database:' as info;
SHOW TABLES;
