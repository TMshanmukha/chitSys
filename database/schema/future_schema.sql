-- Architectural Preview: Future Database Tables for Chit Fund Management System
-- NOTE: These tables are planned for future milestones. Do NOT apply prematurely in Milestone 1.

-- 1. Chit Groups
-- Supports Daily and Monthly collection frequencies, route locations, and contribution schemes
CREATE TABLE IF NOT EXISTS chit_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_code VARCHAR(50) NOT NULL UNIQUE,
  group_name VARCHAR(100) NOT NULL,
  frequency ENUM('DAILY', 'MONTHLY') NOT NULL,
  location_name VARCHAR(150) NOT NULL,
  installment_amount DECIMAL(12, 2) NOT NULL,
  total_pool_amount DECIMAL(14, 2) NOT NULL,
  duration_periods INT NOT NULL, -- e.g., 20 months, 100 days
  start_date DATE NOT NULL,
  end_date DATE NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Chit Members (Business clients / participants; no login credentials required)
CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_code VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  alternate_phone VARCHAR(20) NULL,
  address TEXT NULL,
  kyc_document_type VARCHAR(50) NULL,
  kyc_document_number VARCHAR(100) NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Group Memberships (Maps members to specific chit groups and ticket numbers)
CREATE TABLE IF NOT EXISTS group_memberships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  member_id INT NOT NULL,
  ticket_number INT NOT NULL,
  joined_date DATE NOT NULL,
  status ENUM('ACTIVE', 'DEFAULTED', 'COMPLETED', 'TRANSFERRED') DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES chit_groups(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  UNIQUE KEY uq_group_ticket (group_id, ticket_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Agent Group Assignments (Routes / locations assigned to collection agents)
CREATE TABLE IF NOT EXISTS agent_group_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  group_id INT NOT NULL,
  assigned_date DATE NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  assigned_by INT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES users(id),
  FOREIGN KEY (group_id) REFERENCES chit_groups(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  UNIQUE KEY uq_agent_group (agent_id, group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Collections / Payments
-- Records each cash or digital payment collected by agents, with receipt tracking
CREATE TABLE IF NOT EXISTS collections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_number VARCHAR(60) NOT NULL UNIQUE,
  group_id INT NOT NULL,
  member_id INT NOT NULL,
  agent_id INT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE') NOT NULL,
  payment_reference VARCHAR(100) NULL, -- UPI UTR or Cheque no.
  collection_date DATE NOT NULL,
  collection_time TIME NOT NULL,
  verification_status ENUM('PENDING_RECONCILIATION', 'RECONCILED', 'CANCELLED') DEFAULT 'PENDING_RECONCILIATION',
  reconciled_by INT NULL,
  notes VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES chit_groups(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (agent_id) REFERENCES users(id),
  FOREIGN KEY (reconciled_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Cash Handovers
-- Daily settlement where collection agent hands over cash collected to the admin
CREATE TABLE IF NOT EXISTS cash_handovers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  handover_date DATE NOT NULL,
  expected_cash_amount DECIMAL(12, 2) NOT NULL,
  received_cash_amount DECIMAL(12, 2) NOT NULL,
  variance DECIMAL(12, 2) GENERATED ALWAYS AS (received_cash_amount - expected_cash_amount) STORED,
  received_by INT NOT NULL,
  status ENUM('SUBMITTED', 'VERIFIED', 'DISCREPANCY') DEFAULT 'SUBMITTED',
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES users(id),
  FOREIGN KEY (received_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Payouts (Auction / Dividend / Fixed chit settlement - pending client confirmation)
CREATE TABLE IF NOT EXISTS payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  member_id INT NOT NULL,
  period_number INT NOT NULL,
  gross_chit_amount DECIMAL(14, 2) NOT NULL,
  bid_discount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  net_payable_amount DECIMAL(14, 2) NOT NULL,
  payout_date DATE NOT NULL,
  payment_method ENUM('CHEQUE', 'NEFT_RTGS', 'CASH') NOT NULL,
  payment_reference VARCHAR(100) NULL,
  approved_by INT NOT NULL,
  status ENUM('PENDING_APPROVAL', 'APPROVED', 'DISBURSED') DEFAULT 'PENDING_APPROVAL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES chit_groups(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
