-- ============================================================================
-- COMPLETE DATABASE SCHEMA FOR CHITFUND PRO & FINLEND PRO (TiDB Server)
-- Generated: 2026-11-09T06:22:20.462Z
-- Safe to run: Uses IF NOT EXISTS, disables FK checks during creation
-- Note: Does NOT insert or modify Admin accounts for either business
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- Table: admin_commission_withdrawals
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_commission_withdrawals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `withdrawal_number` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `withdrawal_date` date NOT NULL,
  `payment_method` enum('BANK_TRANSFER','UPI','CASH','CHEQUE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BANK_TRANSFER',
  `reference_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destination_account` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_acw_date` (`withdrawal_date`),
  KEY `idx_acw_user` (`user_id`),
  UNIQUE KEY `withdrawal_number` (`withdrawal_number`),
  CONSTRAINT `fk_acw_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: admin_member_advances
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_member_advances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `member_id` int NOT NULL,
  `collection_id` int DEFAULT NULL,
  `advance_amount` decimal(12,2) NOT NULL,
  `advance_date` date NOT NULL,
  `cycle_period` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING_RECOVERY','RECOVERED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING_RECOVERY',
  `recovered_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `recovered_date` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_ama_group` (`group_id`),
  KEY `idx_ama_member` (`member_id`),
  KEY `idx_ama_status` (`status`),
  KEY `fk_ama_user` (`created_by`),
  CONSTRAINT `fk_ama_group` FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ama_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ama_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: admin_personal_profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_personal_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `firm_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ChitFund Pro Enterprise Services',
  `registration_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CF/TS/2026/8849',
  `act_compliance` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Chit Funds Act, 1982 (Act No. 40 of 1982)',
  `registrar_office` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Office of the Registrar of Chits, Telangana',
  `office_address` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `official_email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `official_phone` varchar(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'State Bank of India',
  `account_holder_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ifsc_code` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `upi_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_app_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- ----------------------------------------------------------------------------
-- Table: agent_day_submissions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `agent_day_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `work_date` date NOT NULL,
  `cash_collected` decimal(12,2) NOT NULL DEFAULT '0.00',
  `upi_collected` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cheque_collected` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_collected` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_receipts` int NOT NULL DEFAULT '0',
  `total_stops_visited` int NOT NULL DEFAULT '0',
  `total_stops_pending` int NOT NULL DEFAULT '0',
  `chit_breakdown_json` longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agent_notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING_APPROVAL','APPROVED','REJECTED_DISCREPANCY') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING_APPROVAL',
  `submitted_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `approved_by` int DEFAULT NULL,
  `approval_date` date DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `admin_notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verified_cash_amount` decimal(12,2) DEFAULT NULL,
  `verified_upi_amount` decimal(12,2) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_ads_agent_date` (`agent_id`,`work_date`),
  KEY `idx_ads_status` (`status`),
  KEY `idx_ads_work_date` (`work_date`),
  KEY `fk_2` (`approved_by`),
  CONSTRAINT `fk_1` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- ----------------------------------------------------------------------------
-- Table: agent_group_assignments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `agent_group_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `group_id` int NOT NULL,
  `assigned_date` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `assigned_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_agent_group` (`agent_id`,`group_id`),
  KEY `idx_aga_agent` (`agent_id`),
  KEY `idx_aga_group` (`group_id`),
  KEY `fk_aga_assigned_by` (`assigned_by`),
  CONSTRAINT `fk_aga_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_aga_group` FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_aga_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;

-- ----------------------------------------------------------------------------
-- Table: agent_leave_coverages
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `agent_leave_coverages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `leave_id` int NOT NULL,
  `group_id` int NOT NULL,
  `covering_agent_id` int NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_leave_group` (`leave_id`,`group_id`),
  KEY `fk_coverage_group` (`group_id`),
  KEY `fk_coverage_agent` (`covering_agent_id`),
  KEY `fk_coverage_admin` (`created_by`),
  CONSTRAINT `fk_coverage_leave` FOREIGN KEY (`leave_id`) REFERENCES `agent_leaves` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_coverage_group` FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_coverage_agent` FOREIGN KEY (`covering_agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_coverage_admin` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: agent_leaves
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `agent_leaves` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `leave_date` date NOT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_agent_leave_date` (`agent_id`,`leave_date`),
  KEY `idx_leave_date_status` (`leave_date`,`status`),
  KEY `fk_leave_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_leave_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_leave_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: agent_tracking_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `agent_tracking_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `group_id` int NOT NULL,
  `stop_id` int DEFAULT NULL,
  `tracking_date` date NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NOT_PAID',
  `current_progress_percent` int NOT NULL DEFAULT '0',
  `last_ping_time` time NOT NULL,
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `member_id` int DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_atl_agent_date` (`agent_id`,`tracking_date`),
  KEY `idx_atl_group_date` (`group_id`,`tracking_date`),
  KEY `fk_atl_stop` (`stop_id`),
  KEY `idx_atl_member` (`member_id`),
  CONSTRAINT `fk_atl_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_atl_group` FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_atl_stop` FOREIGN KEY (`stop_id`) REFERENCES `route_stops` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=180001;

-- ----------------------------------------------------------------------------
-- Table: auctions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `auctions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `period_number` int NOT NULL,
  `draw_number` int NOT NULL DEFAULT '1',
  `auction_type` enum('AUCTION','DOUBLE_CHIT_DRAW','LOTTERY_DRAW') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AUCTION',
  `winning_member_id` int NOT NULL,
  `winning_ticket_number` int NOT NULL,
  `bid_discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `foreman_commission` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_dividend` decimal(12,2) NOT NULL DEFAULT '0.00',
  `dividend_per_member` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_payable_amount` decimal(14,2) NOT NULL,
  `next_installment_payable` decimal(12,2) NOT NULL,
  `auction_date` date NOT NULL,
  `payout_status` enum('PENDING','APPROVED','DISBURSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `payout_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conducted_by` int NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `double_chit_reserve` decimal(14,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_group_period_draw` (`group_id`,`period_number`,`draw_number`),
  KEY `idx_auctions_date` (`auction_date`),
  KEY `idx_auctions_group` (`group_id`),
  KEY `fk_auctions_member` (`winning_member_id`),
  KEY `fk_auctions_conducted_by` (`conducted_by`),
  CONSTRAINT `fk_auctions_group` FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_auctions_member` FOREIGN KEY (`winning_member_id`) REFERENCES `members` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_auctions_conducted_by` FOREIGN KEY (`conducted_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- ----------------------------------------------------------------------------
-- Table: audit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('SUCCESS','FAILURE','WARNING') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUCCESS',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_created_at` (`created_at`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=450001;

-- ----------------------------------------------------------------------------
-- Table: cash_handovers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cash_handovers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `handover_number` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agent_id` int NOT NULL,
  `handover_date` date NOT NULL,
  `expected_cash_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `received_cash_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `variance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `received_by` int NOT NULL,
  `status` enum('SUBMITTED','VERIFIED','DISCREPANCY') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUBMITTED',
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_handover_agent` (`agent_id`),
  KEY `idx_handover_date` (`handover_date`),
  UNIQUE KEY `handover_number` (`handover_number`),
  KEY `fk_handover_received_by` (`received_by`),
  CONSTRAINT `fk_handover_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_handover_received_by` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: chit_groups
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chit_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `frequency` enum('DAILY','MONTHLY') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DAILY',
  `location_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `installment_amount` decimal(12,2) NOT NULL,
  `total_pool_amount` decimal(14,2) NOT NULL,
  `duration_periods` int NOT NULL,
  `total_members_limit` int NOT NULL DEFAULT '20',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('PLANNING','ACTIVE','INACTIVE','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `chit_type` enum('DAILY_CHIT','AUCTION_CHIT','DOUBLE_CHIT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DAILY_CHIT',
  `route_category` enum('DAILY_ROUTE','MONTHLY_ROUTE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DAILY_ROUTE',
  `foreman_commission_percent` decimal(5,2) NOT NULL DEFAULT '5.00',
  `max_bid_percent` decimal(5,2) NOT NULL DEFAULT '35.00',
  `route_waypoints_json` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_groups_code` (`group_code`),
  KEY `idx_groups_status` (`status`),
  KEY `idx_groups_frequency` (`frequency`),
  UNIQUE KEY `group_code` (`group_code`),
  KEY `fk_groups_created_by` (`created_by`),
  KEY `idx_groups_chit_type` (`chit_type`),
  KEY `idx_groups_route_cat` (`route_category`),
  CONSTRAINT `fk_groups_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

-- ----------------------------------------------------------------------------
-- Table: collection_edit_requests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `collection_edit_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `collection_id` int DEFAULT NULL,
  `agent_id` int NOT NULL,
  `group_id` int NOT NULL,
  `member_id` int NOT NULL,
  `current_amount` decimal(12,2) NOT NULL,
  `current_payment_method` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH',
  `requested_amount` decimal(12,2) NOT NULL,
  `normal_amount` decimal(12,2) DEFAULT '0.00',
  `advance_amount` decimal(12,2) DEFAULT '0.00',
  `requested_payment_method` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH',
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','APPLIED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `request_type` enum('AMOUNT_CORRECTION','ADVANCE_COLLECTION') COLLATE utf8mb4_unicode_ci DEFAULT 'AMOUNT_CORRECTION',
  `admin_notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `applied_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_cer_agent` (`agent_id`),
  KEY `idx_cer_collection` (`collection_id`),
  KEY `idx_cer_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- ----------------------------------------------------------------------------
-- Table: collections
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `collections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_id` int NOT NULL,
  `member_id` int NOT NULL,
  `agent_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `normal_amount` decimal(12,2) DEFAULT NULL,
  `advance_amount` decimal(12,2) DEFAULT '0.00',
  `advance_adjusted_amount` decimal(12,2) DEFAULT '0.00',
  `payment_method` enum('CASH','UPI','BANK_TRANSFER','CHEQUE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH',
  `payment_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collection_date` date NOT NULL,
  `collection_time` time NOT NULL,
  `verification_status` enum('PENDING_RECONCILIATION','RECONCILED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING_RECONCILIATION',
  `reconciled_by` int DEFAULT NULL,
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_coll_date` (`collection_date`),
  KEY `idx_coll_agent` (`agent_id`),
  KEY `idx_coll_group` (`group_id`),
  KEY `idx_coll_member` (`member_id`),
  KEY `idx_coll_receipt` (`receipt_number`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  KEY `fk_coll_reconciled_by` (`reconciled_by`),
  CONSTRAINT `fk_coll_group` FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_coll_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_coll_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_coll_reconciled_by` FOREIGN KEY (`reconciled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=180001;

-- ----------------------------------------------------------------------------
-- Table: group_memberships
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `group_memberships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `member_id` int NOT NULL,
  `ticket_number` int NOT NULL,
  `joined_date` date NOT NULL,
  `status` enum('ACTIVE','DEFAULTED','COMPLETED','TRANSFERRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_prized` tinyint(1) NOT NULL DEFAULT '0',
  `prized_period` int DEFAULT NULL,
  `prized_auction_id` int DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_group_ticket` (`group_id`,`ticket_number`),
  KEY `idx_gm_group` (`group_id`),
  KEY `idx_gm_member` (`member_id`),
  KEY `idx_gm_prized` (`group_id`,`is_prized`),
  CONSTRAINT `fk_gm_group` FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gm_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;

-- ----------------------------------------------------------------------------
-- Table: interest_agent_assignments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interest_agent_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `loan_id` int DEFAULT NULL,
  `assigned_by` int NOT NULL,
  `assignment_date` date NOT NULL,
  `route_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stop_order` int DEFAULT '1',
  `status` enum('ACTIVE','INACTIVE') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_int_assign_agent` (`agent_id`,`status`),
  KEY `fk_1` (`customer_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`customer_id`) REFERENCES `interest_customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- ----------------------------------------------------------------------------
-- Table: interest_audit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interest_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_int_audit_entity` (`entity_type`,`entity_id`),
  KEY `idx_int_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

-- ----------------------------------------------------------------------------
-- Table: interest_businesses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interest_businesses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tagline` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Smart Interest & Micro-Finance Lending',
  `logo_url` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pincode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency_symbol` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '₹',
  `document_footer_text` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `business_code` (`business_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30002;

-- ----------------------------------------------------------------------------
-- Table: interest_cash_submissions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interest_cash_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `submission_date` date NOT NULL,
  `total_collected` decimal(14,2) NOT NULL DEFAULT '0.00',
  `cash_collected` decimal(14,2) NOT NULL DEFAULT '0.00',
  `upi_collected` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_receipts` int NOT NULL DEFAULT '0',
  `verified_cash` decimal(14,2) DEFAULT NULL,
  `verified_upi` decimal(14,2) DEFAULT NULL,
  `status` enum('PENDING_APPROVAL','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING_APPROVAL',
  `agent_notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admin_notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `total_borrowers_visited` int NOT NULL DEFAULT '0',
  `total_borrowers_pending` int NOT NULL DEFAULT '0',
  `collections_breakdown_json` longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_int_cash_sub_agent_date` (`agent_id`,`submission_date`),
  KEY `idx_int_cash_sub_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: interest_collections
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interest_collections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `schedule_id` int DEFAULT NULL,
  `collected_by_user_id` int NOT NULL,
  `amount_collected` decimal(14,2) NOT NULL,
  `payment_method` enum('CASH','UPI','BANK_TRANSFER','CHEQUE') COLLATE utf8mb4_unicode_ci DEFAULT 'CASH',
  `transaction_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collection_date` date NOT NULL,
  `collected_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `principal_component` decimal(14,2) NOT NULL DEFAULT '0.00',
  `interest_component` decimal(14,2) NOT NULL DEFAULT '0.00',
  `penalty_component` decimal(14,2) NOT NULL DEFAULT '0.00',
  `excess_component` decimal(14,2) NOT NULL DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gps_coordinates` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('CONFIRMED','REVERSED') COLLATE utf8mb4_unicode_ci DEFAULT 'CONFIRMED',
  `is_verified_by_admin` tinyint(1) DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_int_col_loan` (`loan_id`),
  KEY `idx_int_col_cust` (`customer_id`),
  KEY `idx_int_col_user` (`collected_by_user_id`),
  KEY `idx_int_col_date` (`collection_date`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  CONSTRAINT `fk_1` FOREIGN KEY (`loan_id`) REFERENCES `interest_loans` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_2` FOREIGN KEY (`customer_id`) REFERENCES `interest_customers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- ----------------------------------------------------------------------------
-- Table: interest_customer_ledgers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interest_customer_ledgers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `loan_id` int NOT NULL,
  `collection_id` int DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `entry_type` enum('DISBURSEMENT','COLLECTION','INTEREST_ACCRUAL','PENALTY_APPLIED','WAIVER','REVERSAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `debit_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `credit_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `principal_balance` decimal(14,2) NOT NULL,
  `interest_balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `net_balance` decimal(14,2) NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_int_ledg_cust_date` (`customer_id`,`transaction_date`),
  KEY `idx_int_ledg_loan` (`loan_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`customer_id`) REFERENCES `interest_customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_2` FOREIGN KEY (`loan_id`) REFERENCES `interest_loans` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

-- ----------------------------------------------------------------------------
-- Table: interest_customers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interest_customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alternate_phone` varchar(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pincode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aadhaar_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pan_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo_url` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kyc_status` enum('VERIFIED','PENDING','REJECTED') COLLATE utf8mb4_unicode_ci DEFAULT 'VERIFIED',
  `nominee_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nominee_phone` varchar(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nominee_relation` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guarantor_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guarantor_phone` varchar(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guarantor_address` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('ACTIVE','BLOCKED','INACTIVE') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_int_cust_phone` (`phone`),
  KEY `idx_int_cust_code` (`customer_code`),
  KEY `idx_int_cust_status` (`status`),
  UNIQUE KEY `customer_code` (`customer_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

-- ----------------------------------------------------------------------------
-- Table: interest_loan_schedules
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interest_loan_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `loan_id` int NOT NULL,
  `installment_number` int NOT NULL,
  `due_date` date NOT NULL,
  `principal_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `interest_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `penalty_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `principal_paid` decimal(14,2) NOT NULL DEFAULT '0.00',
  `interest_paid` decimal(14,2) NOT NULL DEFAULT '0.00',
  `penalty_paid` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_paid` decimal(14,2) NOT NULL DEFAULT '0.00',
  `status` enum('PENDING','PARTIAL','PAID','OVERDUE','WAIVED') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `paid_date` date DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_int_sched_loan_inst` (`loan_id`,`installment_number`),
  KEY `idx_int_sched_due_date` (`due_date`),
  KEY `idx_int_sched_status` (`status`),
  CONSTRAINT `fk_1` FOREIGN KEY (`loan_id`) REFERENCES `interest_loans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- ----------------------------------------------------------------------------
-- Table: interest_loans
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interest_loans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `loan_account_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` int NOT NULL,
  `scheme_id` int NOT NULL,
  `principal_amount` decimal(14,2) NOT NULL,
  `calculation_method` enum('FLAT','REDUCING_BALANCE','INTEREST_ONLY','DAILY_BALANCE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `interest_rate` decimal(8,4) NOT NULL,
  `rate_period` enum('ANNUAL','MONTHLY','WEEKLY','DAILY') COLLATE utf8mb4_unicode_ci NOT NULL,
  `repayment_frequency` enum('DAILY','WEEKLY','MONTHLY','BULLET') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenure_periods` int NOT NULL,
  `installment_amount` decimal(14,2) NOT NULL,
  `total_interest_expected` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_payable` decimal(14,2) NOT NULL DEFAULT '0.00',
  `disbursement_date` date NOT NULL,
  `first_due_date` date NOT NULL,
  `maturity_date` date NOT NULL,
  `total_principal_paid` decimal(14,2) DEFAULT '0.00',
  `total_interest_paid` decimal(14,2) DEFAULT '0.00',
  `total_penalties_paid` decimal(14,2) DEFAULT '0.00',
  `principal_outstanding` decimal(14,2) NOT NULL,
  `interest_outstanding` decimal(14,2) DEFAULT '0.00',
  `penalties_outstanding` decimal(14,2) DEFAULT '0.00',
  `assigned_agent_id` int DEFAULT NULL,
  `loan_status` enum('ACTIVE','CLOSED','OVERDUE','RESTRUCTURED','WRITTEN_OFF') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `purpose` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_int_loan_cust` (`customer_id`),
  KEY `idx_int_loan_status` (`loan_status`),
  KEY `idx_int_loan_agent` (`assigned_agent_id`),
  KEY `idx_int_loan_disb_date` (`disbursement_date`),
  UNIQUE KEY `loan_account_number` (`loan_account_number`),
  KEY `fk_2` (`scheme_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`customer_id`) REFERENCES `interest_customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_2` FOREIGN KEY (`scheme_id`) REFERENCES `interest_schemes` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- ----------------------------------------------------------------------------
-- Table: interest_schemes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interest_schemes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `scheme_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scheme_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `calculation_method` enum('FLAT','REDUCING_BALANCE','INTEREST_ONLY','DAILY_BALANCE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'FLAT',
  `interest_rate` decimal(8,4) NOT NULL,
  `rate_period` enum('ANNUAL','MONTHLY','WEEKLY','DAILY') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MONTHLY',
  `repayment_frequency` enum('DAILY','WEEKLY','MONTHLY','BULLET') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MONTHLY',
  `min_principal` decimal(14,2) DEFAULT '1000.00',
  `max_principal` decimal(14,2) DEFAULT '1000000.00',
  `default_principal` decimal(14,2) DEFAULT '50000.00',
  `min_tenure_periods` int DEFAULT '1',
  `max_tenure_periods` int DEFAULT '36',
  `default_tenure_periods` int DEFAULT '12',
  `grace_period_days` int DEFAULT '0',
  `late_penalty_percent` decimal(6,2) DEFAULT '0.00',
  `late_penalty_flat` decimal(10,2) DEFAULT '0.00',
  `allow_part_payment` tinyint(1) DEFAULT '1',
  `allow_advance_payment` tinyint(1) DEFAULT '1',
  `allow_preclosure` tinyint(1) DEFAULT '1',
  `preclosure_discount_percent` decimal(6,2) DEFAULT '0.00',
  `allocation_priority` enum('STANDARD','PRINCIPAL_FIRST') COLLATE utf8mb4_unicode_ci DEFAULT 'STANDARD',
  `status` enum('ACTIVE','DRAFT','ARCHIVED') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `config_json` json DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_int_scheme_code` (`scheme_code`),
  KEY `idx_int_scheme_status` (`status`),
  KEY `idx_int_scheme_method` (`calculation_method`),
  UNIQUE KEY `scheme_code` (`scheme_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30002;

-- ----------------------------------------------------------------------------
-- Table: interest_user_profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interest_user_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `role` enum('OWNER','MANAGER','AGENT','VIEWER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AGENT',
  `permissions` json DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_area` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `daily_target` decimal(12,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_interest_user_id` (`user_id`),
  CONSTRAINT `fk_interest_user_profile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;

-- ----------------------------------------------------------------------------
-- Table: member_advance_adjustments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `member_advance_adjustments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `credit_id` int NOT NULL,
  `group_id` int NOT NULL,
  `member_id` int NOT NULL,
  `adjustment_date` date NOT NULL,
  `amount_adjusted` decimal(12,2) NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_member_date` (`member_id`,`group_id`,`adjustment_date`),
  KEY `idx_credit` (`credit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ----------------------------------------------------------------------------
-- Table: member_advance_credits
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `member_advance_credits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `member_id` int NOT NULL,
  `collection_id` int DEFAULT NULL,
  `advance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `adjusted_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_remaining` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_date` date NOT NULL,
  `status` enum('AVAILABLE','PARTIALLY_ADJUSTED','EXHAUSTED','CANCELLED') DEFAULT 'AVAILABLE',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_member_group` (`member_id`,`group_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=60001;

-- ----------------------------------------------------------------------------
-- Table: member_dividends
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `member_dividends` (
  `id` int NOT NULL AUTO_INCREMENT,
  `auction_id` int NOT NULL,
  `group_id` int NOT NULL,
  `member_id` int NOT NULL,
  `ticket_number` int NOT NULL,
  `period_number` int NOT NULL,
  `draw_number` int NOT NULL DEFAULT '1',
  `dividend_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_installment_due` decimal(12,2) NOT NULL,
  `credited_date` date NOT NULL,
  `is_prized` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('CREDITED','ADJUSTED','REVERTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CREDITED',
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_auction_member` (`auction_id`,`member_id`),
  KEY `idx_md_group` (`group_id`),
  KEY `idx_md_member` (`member_id`),
  KEY `idx_md_date` (`credited_date`),
  CONSTRAINT `fk_md_auction` FOREIGN KEY (`auction_id`) REFERENCES `auctions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_md_group` FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_md_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: members
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `member_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alternate_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kyc_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kyc_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_members_phone` (`phone`),
  KEY `idx_members_code` (`member_code`),
  KEY `idx_members_active` (`is_active`),
  UNIQUE KEY `member_code` (`member_code`),
  UNIQUE KEY `phone` (`phone`),
  KEY `fk_members_created_by` (`created_by`),
  CONSTRAINT `fk_members_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- ----------------------------------------------------------------------------
-- Table: notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `target_role` enum('ALL','ADMIN','COLLECTION_AGENT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ALL',
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('AUCTION','COLLECTION','DEFAULT','PAYOUT','SYSTEM','GENERAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SYSTEM',
  `link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business` enum('chitfund','interest','all') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'chitfund',
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_target_read` (`target_role`,`is_read`),
  KEY `idx_user_read` (`user_id`,`is_read`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=210001;

-- ----------------------------------------------------------------------------
-- Table: payouts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payout_number` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_id` int NOT NULL,
  `member_id` int NOT NULL,
  `period_number` int NOT NULL,
  `gross_chit_amount` decimal(14,2) NOT NULL,
  `bid_discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_payable_amount` decimal(14,2) NOT NULL,
  `payout_date` date NOT NULL,
  `payment_method` enum('CHEQUE','NEFT_RTGS','CASH') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NEFT_RTGS',
  `payment_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by` int NOT NULL,
  `status` enum('PENDING_APPROVAL','APPROVED','DISBURSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING_APPROVAL',
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_payout_group` (`group_id`),
  KEY `idx_payout_member` (`member_id`),
  UNIQUE KEY `payout_number` (`payout_number`),
  KEY `fk_payout_approved_by` (`approved_by`),
  CONSTRAINT `fk_payout_group` FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_payout_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_payout_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: role_permissions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role` enum('SUPER_ADMIN','ADMIN','COLLECTION_AGENT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_role_permission` (`role`,`permission_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- ----------------------------------------------------------------------------
-- Table: route_stops
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `route_stops` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `member_id` int DEFAULT NULL,
  `stop_order` int NOT NULL,
  `stop_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `landmark` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expected_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `coord_x` int NOT NULL DEFAULT '100',
  `coord_y` int NOT NULL DEFAULT '100',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_group_stop_order` (`group_id`,`stop_order`),
  KEY `idx_stops_group` (`group_id`),
  KEY `fk_route_stops_member` (`member_id`),
  CONSTRAINT `fk_route_stops_group` FOREIGN KEY (`group_id`) REFERENCES `chit_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_route_stops_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;

-- ----------------------------------------------------------------------------
-- Table: schema_migrations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `version` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `version` (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=150001;

-- ----------------------------------------------------------------------------
-- Table: token_revocations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `token_revocations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `reason` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'LOGOUT',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_revocations_token` (`token_id`),
  KEY `idx_revocations_expires` (`expires_at`),
  UNIQUE KEY `token_id` (`token_id`),
  KEY `fk_revocations_user` (`user_id`),
  CONSTRAINT `fk_revocations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=390001;

-- ----------------------------------------------------------------------------
-- Table: users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('SUPER_ADMIN','ADMIN','COLLECTION_AGENT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'COLLECTION_AGENT',
  `assigned_business` enum('CHITFUND','INTEREST','ALL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CHITFUND',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_users_username` (`username`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_is_active` (`is_active`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_users_created_by` (`created_by`),
  CONSTRAINT `fk_users_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=570001;

SET FOREIGN_KEY_CHECKS = 1;
