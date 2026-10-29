-- Migration: 006_auction_dividend_distributions.sql
-- Description: Individual Member Dividend Ledgers, Strict Prized Subscriber Tracking, and Double Chit Pool Reserves

-- 1. Create member_dividends ledger table (stores each subscriber's credited dividend per auction round)
CREATE TABLE IF NOT EXISTS member_dividends (
  id INT AUTO_INCREMENT PRIMARY KEY,
  auction_id INT NOT NULL,
  group_id INT NOT NULL,
  member_id INT NOT NULL,
  ticket_number INT NOT NULL,
  period_number INT NOT NULL,
  draw_number INT NOT NULL DEFAULT 1,
  dividend_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  net_installment_due DECIMAL(12, 2) NOT NULL,
  credited_date DATE NOT NULL,
  is_prized TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('CREDITED', 'ADJUSTED', 'REVERTED') NOT NULL DEFAULT 'CREDITED',
  notes VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_md_auction FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
  CONSTRAINT fk_md_group FOREIGN KEY (group_id) REFERENCES chit_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_md_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_auction_member (auction_id, member_id),
  INDEX idx_md_group (group_id),
  INDEX idx_md_member (member_id),
  INDEX idx_md_date (credited_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add is_prized, prized_period, prized_auction_id to group_memberships
SET @col_prized_exists := (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'group_memberships' 
    AND COLUMN_NAME = 'is_prized'
);

SET @sql_prized := IF(@col_prized_exists = 0, 
  'ALTER TABLE group_memberships 
     ADD COLUMN is_prized TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
     ADD COLUMN prized_period INT NULL AFTER is_prized,
     ADD COLUMN prized_auction_id INT NULL AFTER prized_period,
     ADD INDEX idx_gm_prized (group_id, is_prized)', 
  'SELECT 1'
);

PREPARE stmt_prized FROM @sql_prized;
EXECUTE stmt_prized;
DEALLOCATE PREPARE stmt_prized;

-- 3. Add double_chit_reserve to auctions table
SET @col_dcr_exists := (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'auctions' 
    AND COLUMN_NAME = 'double_chit_reserve'
);

SET @sql_dcr := IF(@col_dcr_exists = 0, 
  'ALTER TABLE auctions 
     ADD COLUMN double_chit_reserve DECIMAL(14, 2) NOT NULL DEFAULT 0.00 AFTER total_dividend', 
  'SELECT 1'
);

PREPARE stmt_dcr FROM @sql_dcr;
EXECUTE stmt_dcr;
DEALLOCATE PREPARE stmt_dcr;

-- 4. Retroactively sync is_prized for existing winning members in group_memberships
UPDATE group_memberships gm
JOIN auctions a ON gm.group_id = a.group_id AND gm.member_id = a.winning_member_id
SET gm.is_prized = 1,
    gm.prized_period = a.period_number,
    gm.prized_auction_id = a.id;

-- 5. Retroactively populate member_dividends for any pre-existing auction cycles
INSERT IGNORE INTO member_dividends (auction_id, group_id, member_id, ticket_number, period_number, draw_number, dividend_amount, net_installment_due, credited_date, is_prized, status)
SELECT 
  a.id, a.group_id, gm.member_id, gm.ticket_number, a.period_number, a.draw_number,
  a.dividend_per_member, a.next_installment_payable, a.auction_date,
  CASE WHEN gm.member_id = a.winning_member_id THEN 1 ELSE 0 END,
  'CREDITED'
FROM auctions a
JOIN group_memberships gm ON a.group_id = gm.group_id;
