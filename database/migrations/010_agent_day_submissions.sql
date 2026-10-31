-- =========================================================================
-- Migration 010: Agent Day Submissions and Admin Day Closing Approvals
-- Purpose: Track field agent end-of-day handovers, cash counting, UPI
-- verification, chit-by-chit breakdowns, and asynchronous Admin approval.
-- =========================================================================

CREATE TABLE IF NOT EXISTS agent_day_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  work_date DATE NOT NULL,
  cash_collected DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  upi_collected DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  cheque_collected DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_collected DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_receipts INT NOT NULL DEFAULT 0,
  total_stops_visited INT NOT NULL DEFAULT 0,
  total_stops_pending INT NOT NULL DEFAULT 0,
  chit_breakdown_json LONGTEXT NULL,
  agent_notes TEXT NULL,
  status ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED_DISCREPANCY') NOT NULL DEFAULT 'PENDING_APPROVAL',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INT NULL,
  approval_date DATE NULL,
  approved_at TIMESTAMP NULL,
  admin_notes TEXT NULL,
  verified_cash_amount DECIMAL(12,2) NULL,
  verified_upi_amount DECIMAL(12,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_ads_agent_date (agent_id, work_date),
  INDEX idx_ads_status (status),
  INDEX idx_ads_work_date (work_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
