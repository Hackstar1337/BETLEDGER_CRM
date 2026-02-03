-- Migrate user_roles to support both OAuth users (users.openId) and standalone admins (admin_users.username)

-- 1) Rename userId -> oauthOpenId (and make nullable)
ALTER TABLE user_roles
  CHANGE COLUMN userId oauthOpenId VARCHAR(64) NULL;

-- 2) Add adminUsername (nullable)
ALTER TABLE user_roles
  ADD COLUMN adminUsername VARCHAR(50) NULL AFTER oauthOpenId;

-- 3) Indexes for lookups
ALTER TABLE user_roles
  ADD INDEX idx_user_roles_oauthOpenId (oauthOpenId),
  ADD INDEX idx_user_roles_adminUsername (adminUsername);

-- 4) Foreign keys
-- Note: This assumes MySQL/InnoDB and that referenced columns are indexed/unique (they are).
ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_oauthOpenId
    FOREIGN KEY (oauthOpenId) REFERENCES users(openId)
    ON DELETE CASCADE,
  ADD CONSTRAINT fk_user_roles_adminUsername
    FOREIGN KEY (adminUsername) REFERENCES admin_users(username)
    ON DELETE CASCADE;

-- 5) Uniqueness (prevent same role being assigned twice)
ALTER TABLE user_roles
  ADD UNIQUE KEY unique_role_oauth (oauthOpenId, roleId),
  ADD UNIQUE KEY unique_role_admin (adminUsername, roleId);

-- Optional safety rule (MySQL 8.0+ enforces CHECK; older versions may ignore it)
ALTER TABLE user_roles
  ADD CONSTRAINT chk_user_roles_identity
  CHECK (
    (oauthOpenId IS NOT NULL AND adminUsername IS NULL)
    OR
    (oauthOpenId IS NULL AND adminUsername IS NOT NULL)
  );
