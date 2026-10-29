-- Migration: 002_create_chit_fund_business_tables.sql
-- Description: Complete Production Schema for Chit Groups, Members, Memberships, Agent Route Assignments, Collections, Handovers, and Payouts

-- 1. Chit Groups Table (Daily and Monthly schemes with route locations)
CREATE TABLE IF NOT EXISTS chit_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_code VARCHAR(50) NOT NULL UNIQUE,
  group_name VARCHAR(120) NOT NULL,
  frequency ENUM('DAILY', 'MONTHLY') NOT NULL DEFAULT 'DAILY',
  location_name VARCHAR(150) NOT NULL,
  installment_amount DECIMAL(12, 2) NOT NULL,
  total_pool_amount DECIMAL(14, 2) NOT NULL,
  duration_periods INT NOT NULL,
  total_members_limit INT NOT NULL DEFAULT 20,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  status ENUM('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_groups_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_groups_code (group_code),
  INDEX idx_groups_status (status),
  INDEX idx_groups_frequency (frequency)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Members Table (Business clients / participants in chit pools)
CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_code VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  alternate_phone VARCHAR(20) NULL,
  address TEXT NULL,
  kyc_type VARCHAR(50) NULL,
  kyc_number VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_members_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_members_phone (phone),
  INDEX idx_members_code (member_code),
  INDEX idx_members_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Group Memberships (Maps members to specific chit groups and ticket numbers)
CREATE TABLE IF NOT EXISTS group_memberships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  member_id INT NOT NULL,
  ticket_number INT NOT NULL,
  joined_date DATE NOT NULL,
  status ENUM('ACTIVE', 'DEFAULTED', 'COMPLETED', 'TRANSFERRED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gm_group FOREIGN KEY (group_id) REFERENCES chit_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_gm_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_group_ticket (group_id, ticket_number),
  INDEX idx_gm_group (group_id),
  INDEX idx_gm_member (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Agent Group Assignments (Maps collection agents to specific chit groups & locations)
CREATE TABLE IF NOT EXISTS agent_group_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  group_id INT NOT NULL,
  assigned_date DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  assigned_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_aga_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_aga_group FOREIGN KEY (group_id) REFERENCES chit_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_aga_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_agent_group (agent_id, group_id),
  INDEX idx_aga_agent (agent_id),
  INDEX idx_aga_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Collections (Daily and monthly installment collections by cash, UPI, or cheque)
CREATE TABLE IF NOT EXISTS collections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_number VARCHAR(60) NOT NULL UNIQUE,
  group_id INT NOT NULL,
  member_id INT NOT NULL,
  agent_id INT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE') NOT NULL DEFAULT 'CASH',
  payment_reference VARCHAR(100) NULL,
  collection_date DATE NOT NULL,
  collection_time TIME NOT NULL,
  verification_status ENUM('PENDING_RECONCILIATION', 'RECONCILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_RECONCILIATION',
  reconciled_by INT NULL,
  notes VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_coll_group FOREIGN KEY (group_id) REFERENCES chit_groups(id) ON DELETE RESTRICT,
  CONSTRAINT fk_coll_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  CONSTRAINT fk_coll_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_coll_reconciled_by FOREIGN KEY (reconciled_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_coll_date (collection_date),
  INDEX idx_coll_agent (agent_id),
  INDEX idx_coll_group (group_id),
  INDEX idx_coll_member (member_id),
  INDEX idx_coll_receipt (receipt_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Cash Handovers (Daily agent collection settlement to business owner/admin)
CREATE TABLE IF NOT EXISTS cash_handovers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  handover_number VARCHAR(60) NOT NULL UNIQUE,
  agent_id INT NOT NULL,
  handover_date DATE NOT NULL,
  expected_cash_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  received_cash_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  variance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  received_by INT NOT NULL,
  status ENUM('SUBMITTED', 'VERIFIED', 'DISCREPANCY') NOT NULL DEFAULT 'SUBMITTED',
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_handover_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_handover_received_by FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_handover_agent (agent_id),
  INDEX idx_handover_date (handover_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Payouts (Chit auction payout records and approvals)
CREATE TABLE IF NOT EXISTS payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payout_number VARCHAR(60) NOT NULL UNIQUE,
  group_id INT NOT NULL,
  member_id INT NOT NULL,
  period_number INT NOT NULL,
  gross_chit_amount DECIMAL(14, 2) NOT NULL,
  bid_discount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  net_payable_amount DECIMAL(14, 2) NOT NULL,
  payout_date DATE NOT NULL,
  payment_method ENUM('CHEQUE', 'NEFT_RTGS', 'CASH') NOT NULL DEFAULT 'NEFT_RTGS',
  payment_reference VARCHAR(100) NULL,
  approved_by INT NOT NULL,
  status ENUM('PENDING_APPROVAL', 'APPROVED', 'DISBURSED') NOT NULL DEFAULT 'PENDING_APPROVAL',
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payout_group FOREIGN KEY (group_id) REFERENCES chit_groups(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payout_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payout_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_payout_group (group_id),
  INDEX idx_payout_member (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
