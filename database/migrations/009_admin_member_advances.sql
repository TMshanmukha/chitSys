-- Migration 009: Admin Member Advances and Pending Dues Tracking
-- Allows Admin to add/cover unpaid member installments in any chit scheme,
-- and tracks the pending recovery amount owed by each subscriber to the Admin.

CREATE TABLE IF NOT EXISTS admin_member_advances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  member_id INT NOT NULL,
  collection_id INT NULL,
  advance_amount DECIMAL(12, 2) NOT NULL,
  advance_date DATE NOT NULL,
  cycle_period VARCHAR(50) NULL,
  status ENUM('PENDING_RECOVERY', 'RECOVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_RECOVERY',
  recovered_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  recovered_date DATE NULL,
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ama_group FOREIGN KEY (group_id) REFERENCES chit_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_ama_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_ama_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_ama_group (group_id),
  INDEX idx_ama_member (member_id),
  INDEX idx_ama_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
