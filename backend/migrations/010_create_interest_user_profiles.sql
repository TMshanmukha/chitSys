-- Migration 010: FinLend Pro Dedicated User Profiles & Granular Permission Management
-- Strict Rule: Additive only. Do NOT touch or alter existing columns in the shared 'users' table.

CREATE TABLE IF NOT EXISTS interest_user_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role ENUM('OWNER', 'MANAGER', 'AGENT', 'VIEWER') NOT NULL DEFAULT 'AGENT',
  permissions JSON NULL,
  phone VARCHAR(20) NULL,
  assigned_area VARCHAR(100) NULL,
  daily_target DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,
  CONSTRAINT fk_interest_user_profile_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE KEY uq_interest_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
