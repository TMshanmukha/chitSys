-- Migration: 001_create_auth_tables.sql
-- Description: Create core authentication, authorization, token revocation, and audit log tables for Milestone 1

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('SUPER_ADMIN', 'ADMIN', 'COLLECTION_AGENT') NOT NULL DEFAULT 'COLLECTION_AGENT',
  phone VARCHAR(20) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_users_username (username),
  INDEX idx_users_role (role),
  INDEX idx_users_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Role Permissions Table (Architected for future granular sub-admin privileges)
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('SUPER_ADMIN', 'ADMIN', 'COLLECTION_AGENT') NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_role_permission (role, permission_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Token Revocation / Active Session Tracking
CREATE TABLE IF NOT EXISTS token_revocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_id VARCHAR(100) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(100) DEFAULT 'LOGOUT',
  CONSTRAINT fk_revocations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_revocations_token (token_id),
  INDEX idx_revocations_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Audit Logs Table (Captures security and administrative events without logging credentials)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  details TEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  status ENUM('SUCCESS', 'FAILURE', 'WARNING') NOT NULL DEFAULT 'SUCCESS',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
