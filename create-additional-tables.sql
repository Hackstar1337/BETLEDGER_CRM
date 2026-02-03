-- Create additional tables for future use

-- Sessions table - tracks user sessions for authentication
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  INDEX idx_sessions_userId (userId),
  INDEX idx_sessions_expiresAt (expiresAt)
);

-- Logs table - application audit logs
CREATE TABLE IF NOT EXISTS logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  level ENUM('debug', 'info', 'warn', 'error') NOT NULL,
  message TEXT NOT NULL,
  userId VARCHAR(100),
  action VARCHAR(100),
  resource VARCHAR(100),
  resourceId INT,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  metadata TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_level (level),
  INDEX idx_logs_userId (userId),
  INDEX idx_logs_createdAt (createdAt),
  INDEX idx_logs_action (action)
);

-- Audit trail table - tracks all CRUD operations
CREATE TABLE IF NOT EXISTS audit_trail (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tableName VARCHAR(100) NOT NULL,
  recordId INT NOT NULL,
  action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  oldValues TEXT,
  newValues TEXT,
  userId VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_table (tableName),
  INDEX idx_audit_record (tableName, recordId),
  INDEX idx_audit_userId (userId),
  INDEX idx_audit_timestamp (timestamp)
);

-- Notifications table - user notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info' NOT NULL,
  isRead BOOLEAN DEFAULT FALSE NOT NULL,
  actionUrl VARCHAR(500),
  metadata TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  readAt TIMESTAMP NULL,
  INDEX idx_notifications_userId (userId),
  INDEX idx_notifications_isRead (isRead),
  INDEX idx_notifications_createdAt (createdAt)
);

-- Settings table - application settings
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' NOT NULL,
  category VARCHAR(50) DEFAULT 'general' NOT NULL,
  isPublic BOOLEAN DEFAULT FALSE NOT NULL,
  updatedBy VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_settings_key (`key`),
  INDEX idx_settings_category (category)
);

-- Roles table - user roles and permissions
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  displayName VARCHAR(100) NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL,
  isActive BOOLEAN DEFAULT TRUE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_roles_name (name),
  INDEX idx_roles_isActive (isActive)
);

-- Insert default settings
INSERT IGNORE INTO settings (`key`, value, description, type, category, isPublic) VALUES
('app_name', 'Khiladi Management Panel', 'Application name', 'string', 'general', true),
('app_version', '3.0.0', 'Current version of the application', 'string', 'general', true),
('maintenance_mode', 'false', 'Whether the application is in maintenance mode', 'boolean', 'general', true),
('max_deposit_per_day', '100000', 'Maximum deposit amount per day per user', 'number', 'limits', false),
('max_withdrawal_per_day', '50000', 'Maximum withdrawal amount per day per user', 'number', 'limits', false),
('bonus_percentage', '10', 'Default bonus percentage for deposits', 'number', 'bonus', false),
('timezone', 'GMT+5:30', 'Default timezone for the application', 'string', 'general', true),
('currency', 'INR', 'Default currency', 'string', 'general', true),
('notification_email', 'admin@example.com', 'Email for notifications', 'string', 'notifications', false);

-- Insert default roles
INSERT IGNORE INTO roles (name, displayName, description, permissions) VALUES
('super_admin', 'Super Administrator', 'Full access to all features', '["*"]'),
('admin', 'Administrator', 'Can manage panels, players, and transactions', '["panels:*", "players:*", "deposits:*", "withdrawals:*", "reports:view"]'),
('operator', 'Operator', 'Can handle deposits and withdrawals', '["deposits:create", "withdrawals:create", "players:view"]'),
('viewer', 'Viewer', 'Read-only access to reports', '["reports:view", "panels:view", "players:view"]');

-- Create user_roles junction table for many-to-many relationship between users and roles
CREATE TABLE IF NOT EXISTS user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  roleId INT NOT NULL,
  assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assignedBy VARCHAR(100),
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_role (userId, roleId),
  INDEX idx_user_roles_userId (userId),
  INDEX idx_user_roles_roleId (roleId)
);
