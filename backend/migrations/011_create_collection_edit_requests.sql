-- 011_create_collection_edit_requests.sql
-- Supports the agent wrong amount correction flow:
-- Agent enters wrong amount -> requests edit with reason -> Admin receives notification & separate menu option -> Admin approves -> Agent gets edit access ONLY for that respective member and payment -> Agent submits correction -> Edit access locks.

CREATE TABLE IF NOT EXISTS collection_edit_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  collection_id INT NOT NULL,
  agent_id INT NOT NULL,
  group_id INT NOT NULL,
  member_id INT NOT NULL,
  current_amount DECIMAL(12, 2) NOT NULL,
  current_payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
  requested_amount DECIMAL(12, 2) NOT NULL,
  requested_payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
  reason TEXT NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'APPLIED') NOT NULL DEFAULT 'PENDING',
  admin_notes TEXT NULL,
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  applied_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cer_agent (agent_id),
  INDEX idx_cer_collection (collection_id),
  INDEX idx_cer_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

