-- Migration: 005_admin_commissions_and_profile.sql
-- Description: Tables for Admin Commission Withdrawals, Admin Personal Details, Firm Information, and Bank Account

-- 1. Admin Personal and Firm Profile
CREATE TABLE IF NOT EXISTS admin_personal_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  firm_name VARCHAR(150) NOT NULL DEFAULT 'ChitFund Pro Enterprise Services',
  registration_number VARCHAR(100) NOT NULL DEFAULT 'CF/TS/2026/8849',
  act_compliance VARCHAR(100) NOT NULL DEFAULT 'Chit Funds Act, 1982 (Act No. 40 of 1982)',
  registrar_office VARCHAR(150) NOT NULL DEFAULT 'Office of the Registrar of Chits, Telangana',
  office_address TEXT NULL,
  official_email VARCHAR(120) NULL,
  official_phone VARCHAR(25) NULL,
  bank_name VARCHAR(100) NULL DEFAULT 'State Bank of India',
  account_holder_name VARCHAR(150) NULL,
  account_number VARCHAR(50) NULL,
  ifsc_code VARCHAR(30) NULL,
  upi_id VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Admin Commission Withdrawals / Payout Ledger
CREATE TABLE IF NOT EXISTS admin_commission_withdrawals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  withdrawal_number VARCHAR(60) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  withdrawal_date DATE NOT NULL,
  payment_method ENUM('BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE') NOT NULL DEFAULT 'BANK_TRANSFER',
  reference_number VARCHAR(100) NULL,
  destination_account VARCHAR(100) NULL,
  remarks TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_acw_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_acw_date (withdrawal_date),
  INDEX idx_acw_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
