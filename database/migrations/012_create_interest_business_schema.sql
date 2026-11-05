-- Migration 012: Complete Configurable Interest Business Management Platform Schema
-- Strictly isolated from Chit Fund tables (Zero data mixing guarantee)

-- 1. Businesses Table (FinLend Pro Business Entity)
CREATE TABLE IF NOT EXISTS `interest_businesses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `business_name` VARCHAR(150) NOT NULL,
  `business_code` VARCHAR(50) NOT NULL UNIQUE,
  `tagline` VARCHAR(255) DEFAULT 'Smart Interest & Micro-Finance Lending',
  `logo_url` TEXT,
  `phone` VARCHAR(30),
  `email` VARCHAR(100),
  `address` TEXT,
  `city` VARCHAR(100),
  `state` VARCHAR(100),
  `pincode` VARCHAR(20),
  `currency_symbol` VARCHAR(10) DEFAULT '₹',
  `document_footer_text` TEXT,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Interest Customers Table (Separate KYC & Profiles)
CREATE TABLE IF NOT EXISTS `interest_customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_code` VARCHAR(50) NOT NULL UNIQUE,
  `full_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(25) NOT NULL,
  `alternate_phone` VARCHAR(25),
  `email` VARCHAR(100),
  `address` TEXT,
  `city` VARCHAR(100),
  `pincode` VARCHAR(20),
  `aadhaar_number` VARCHAR(30),
  `pan_number` VARCHAR(30),
  `photo_url` TEXT,
  `kyc_status` ENUM('VERIFIED', 'PENDING', 'REJECTED') DEFAULT 'VERIFIED',
  `nominee_name` VARCHAR(120),
  `nominee_phone` VARCHAR(25),
  `nominee_relation` VARCHAR(50),
  `guarantor_name` VARCHAR(120),
  `guarantor_phone` VARCHAR(25),
  `guarantor_address` TEXT,
  `status` ENUM('ACTIVE', 'BLOCKED', 'INACTIVE') DEFAULT 'ACTIVE',
  `notes` TEXT,
  `created_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_int_cust_phone` (`phone`),
  INDEX `idx_int_cust_code` (`customer_code`),
  INDEX `idx_int_cust_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Configurable Schemes Table (Dynamic Financial Product Builder)
CREATE TABLE IF NOT EXISTS `interest_schemes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `scheme_name` VARCHAR(150) NOT NULL,
  `scheme_code` VARCHAR(50) NOT NULL UNIQUE,
  `description` TEXT,
  `calculation_method` ENUM('FLAT', 'REDUCING_BALANCE', 'INTEREST_ONLY', 'DAILY_BALANCE') NOT NULL DEFAULT 'FLAT',
  `interest_rate` DECIMAL(8,4) NOT NULL,
  `rate_period` ENUM('ANNUAL', 'MONTHLY', 'WEEKLY', 'DAILY') NOT NULL DEFAULT 'MONTHLY',
  `repayment_frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'BULLET') NOT NULL DEFAULT 'MONTHLY',
  `min_principal` DECIMAL(14,2) DEFAULT 1000.00,
  `max_principal` DECIMAL(14,2) DEFAULT 1000000.00,
  `default_principal` DECIMAL(14,2) DEFAULT 50000.00,
  `min_tenure_periods` INT DEFAULT 1,
  `max_tenure_periods` INT DEFAULT 36,
  `default_tenure_periods` INT DEFAULT 12,
  `grace_period_days` INT DEFAULT 0,
  `late_penalty_percent` DECIMAL(6,2) DEFAULT 0.00,
  `late_penalty_flat` DECIMAL(10,2) DEFAULT 0.00,
  `allow_part_payment` BOOLEAN DEFAULT TRUE,
  `allow_advance_payment` BOOLEAN DEFAULT TRUE,
  `allow_preclosure` BOOLEAN DEFAULT TRUE,
  `preclosure_discount_percent` DECIMAL(6,2) DEFAULT 0.00,
  `allocation_priority` ENUM('STANDARD', 'PRINCIPAL_FIRST') DEFAULT 'STANDARD',
  `status` ENUM('ACTIVE', 'DRAFT', 'ARCHIVED') DEFAULT 'ACTIVE',
  `config_json` JSON,
  `created_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_int_scheme_code` (`scheme_code`),
  INDEX `idx_int_scheme_status` (`status`),
  INDEX `idx_int_scheme_method` (`calculation_method`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Interest Loans Table (Accounts & Active Portfolios)
CREATE TABLE IF NOT EXISTS `interest_loans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `loan_account_number` VARCHAR(50) NOT NULL UNIQUE,
  `customer_id` INT NOT NULL,
  `scheme_id` INT NOT NULL,
  `principal_amount` DECIMAL(14,2) NOT NULL,
  `calculation_method` ENUM('FLAT', 'REDUCING_BALANCE', 'INTEREST_ONLY', 'DAILY_BALANCE') NOT NULL,
  `interest_rate` DECIMAL(8,4) NOT NULL,
  `rate_period` ENUM('ANNUAL', 'MONTHLY', 'WEEKLY', 'DAILY') NOT NULL,
  `repayment_frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'BULLET') NOT NULL,
  `tenure_periods` INT NOT NULL,
  `installment_amount` DECIMAL(14,2) NOT NULL,
  `total_interest_expected` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_payable` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `disbursement_date` DATE NOT NULL,
  `first_due_date` DATE NOT NULL,
  `maturity_date` DATE NOT NULL,
  `total_principal_paid` DECIMAL(14,2) DEFAULT 0.00,
  `total_interest_paid` DECIMAL(14,2) DEFAULT 0.00,
  `total_penalties_paid` DECIMAL(14,2) DEFAULT 0.00,
  `principal_outstanding` DECIMAL(14,2) NOT NULL,
  `interest_outstanding` DECIMAL(14,2) DEFAULT 0.00,
  `penalties_outstanding` DECIMAL(14,2) DEFAULT 0.00,
  `assigned_agent_id` INT,
  `loan_status` ENUM('ACTIVE', 'CLOSED', 'OVERDUE', 'RESTRUCTURED', 'WRITTEN_OFF') DEFAULT 'ACTIVE',
  `purpose` VARCHAR(255),
  `notes` TEXT,
  `approved_by` INT,
  `created_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `interest_customers`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`scheme_id`) REFERENCES `interest_schemes`(`id`) ON DELETE RESTRICT,
  INDEX `idx_int_loan_cust` (`customer_id`),
  INDEX `idx_int_loan_status` (`loan_status`),
  INDEX `idx_int_loan_agent` (`assigned_agent_id`),
  INDEX `idx_int_loan_disb_date` (`disbursement_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Repayment Schedules Table (Installment Ledger)
CREATE TABLE IF NOT EXISTS `interest_loan_schedules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `loan_id` INT NOT NULL,
  `installment_number` INT NOT NULL,
  `due_date` DATE NOT NULL,
  `principal_due` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `interest_due` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `penalty_due` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_due` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `principal_paid` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `interest_paid` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `penalty_paid` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_paid` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED') DEFAULT 'PENDING',
  `paid_date` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`loan_id`) REFERENCES `interest_loans`(`id`) ON DELETE CASCADE,
  INDEX `idx_int_sched_loan_inst` (`loan_id`, `installment_number`),
  INDEX `idx_int_sched_due_date` (`due_date`),
  INDEX `idx_int_sched_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Collections & Receipts Table
CREATE TABLE IF NOT EXISTS `interest_collections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `receipt_number` VARCHAR(50) NOT NULL UNIQUE,
  `loan_id` INT NOT NULL,
  `customer_id` INT NOT NULL,
  `schedule_id` INT,
  `collected_by_user_id` INT NOT NULL,
  `amount_collected` DECIMAL(14,2) NOT NULL,
  `payment_method` ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE') DEFAULT 'CASH',
  `transaction_reference` VARCHAR(100),
  `collection_date` DATE NOT NULL,
  `collected_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `principal_component` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `interest_component` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `penalty_component` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `excess_component` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT,
  `gps_coordinates` VARCHAR(100),
  `status` ENUM('CONFIRMED', 'REVERSED') DEFAULT 'CONFIRMED',
  `is_verified_by_admin` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`loan_id`) REFERENCES `interest_loans`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`customer_id`) REFERENCES `interest_customers`(`id`) ON DELETE RESTRICT,
  INDEX `idx_int_col_loan` (`loan_id`),
  INDEX `idx_int_col_cust` (`customer_id`),
  INDEX `idx_int_col_user` (`collected_by_user_id`),
  INDEX `idx_int_col_date` (`collection_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Universal Customer & Loan Ledgers (Double-Entry Audit)
CREATE TABLE IF NOT EXISTS `interest_customer_ledgers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `loan_id` INT NOT NULL,
  `collection_id` INT,
  `transaction_date` DATE NOT NULL,
  `entry_type` ENUM('DISBURSEMENT', 'COLLECTION', 'INTEREST_ACCRUAL', 'PENALTY_APPLIED', 'WAIVER', 'REVERSAL') NOT NULL,
  `debit_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `credit_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `principal_balance` DECIMAL(14,2) NOT NULL,
  `interest_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `net_balance` DECIMAL(14,2) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `reference_no` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `interest_customers`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`loan_id`) REFERENCES `interest_loans`(`id`) ON DELETE RESTRICT,
  INDEX `idx_int_ledg_cust_date` (`customer_id`, `transaction_date`),
  INDEX `idx_int_ledg_loan` (`loan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Field Agent Customer Route Assignments
CREATE TABLE IF NOT EXISTS `interest_agent_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` INT NOT NULL,
  `customer_id` INT NOT NULL,
  `loan_id` INT,
  `assigned_by` INT NOT NULL,
  `assignment_date` DATE NOT NULL,
  `route_name` VARCHAR(100),
  `stop_order` INT DEFAULT 1,
  `status` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `interest_customers`(`id`) ON DELETE CASCADE,
  INDEX `idx_int_assign_agent` (`agent_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Daily Cash Handover Submissions for Agents
CREATE TABLE IF NOT EXISTS `interest_cash_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` INT NOT NULL,
  `submission_date` DATE NOT NULL,
  `total_collected` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `cash_collected` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `upi_collected` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_receipts` INT NOT NULL DEFAULT 0,
  `verified_cash` DECIMAL(14,2),
  `verified_upi` DECIMAL(14,2),
  `status` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED') DEFAULT 'PENDING_APPROVAL',
  `agent_notes` TEXT,
  `admin_notes` TEXT,
  `approved_by` INT,
  `approved_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_int_cash_sub_agent_date` (`agent_id`, `submission_date`),
  INDEX `idx_int_cash_sub_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Audit Trail for Financial Actions
CREATE TABLE IF NOT EXISTS `interest_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT,
  `old_values` JSON,
  `new_values` JSON,
  `ip_address` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_int_audit_entity` (`entity_type`, `entity_id`),
  INDEX `idx_int_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data: Default Business Entity & Standard Configurable Schemes
INSERT IGNORE INTO `interest_businesses` (`id`, `business_name`, `business_code`, `tagline`, `phone`, `email`, `address`, `currency_symbol`)
VALUES (1, 'FinLend Pro', 'FLPRO-01', 'Smart Interest & Micro-Finance Lending', '+91 98765 43210', 'support@finlendpro.local', 'Main Financial District, Hyderabad, India', '₹');

INSERT IGNORE INTO `interest_schemes` 
(`id`, `scheme_name`, `scheme_code`, `description`, `calculation_method`, `interest_rate`, `rate_period`, `repayment_frequency`, `min_principal`, `max_principal`, `default_principal`, `min_tenure_periods`, `max_tenure_periods`, `default_tenure_periods`, `status`)
VALUES 
(1, 'Daily Micro-Finance (100 Days)', 'DMF-100D', 'Daily principal and interest recovery for small merchants & shops over 100 days.', 'FLAT', 10.0000, 'MONTHLY', 'DAILY', 5000.00, 100000.00, 20000.00, 30, 150, 100, 'ACTIVE'),
(2, 'Standard Monthly EMI (Reducing Balance)', 'EMI-REDUCE-12M', 'Standard reducing balance amortization where interest is charged strictly on remaining unpaid balance.', 'REDUCING_BALANCE', 18.0000, 'ANNUAL', 'MONTHLY', 10000.00, 1000000.00, 50000.00, 3, 36, 12, 'ACTIVE'),
(3, 'Periodic Interest-Only (Bullet Repayment)', 'VADDI-BULLET-MO', 'Monthly interest payment only (Vaddi Vyaparam), with full principal repaid at maturity.', 'INTEREST_ONLY', 2.0000, 'MONTHLY', 'MONTHLY', 10000.00, 500000.00, 100000.00, 1, 24, 6, 'ACTIVE'),
(4, 'Daily Outstanding Balance Interest', 'DOB-FLEX-DAILY', 'Daily interest computed on the actual end-of-day outstanding principal with flexible repayments.', 'DAILY_BALANCE', 0.1000, 'DAILY', 'DAILY', 1000.00, 200000.00, 25000.00, 7, 180, 60, 'ACTIVE');

