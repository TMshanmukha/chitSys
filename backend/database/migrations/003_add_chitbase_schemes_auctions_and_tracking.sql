-- Migration: 003_add_chitbase_schemes_auctions_and_tracking.sql
-- Description: ChitBase workflows - Daily & Monthly Routes, Auction & Double Chit schemes, Auctions ledger, and 2D Route Tracking

-- 1. Upgrade chit_groups table with ChitBase route classifications and scheme modes
ALTER TABLE chit_groups
  ADD COLUMN chit_type ENUM('DAILY_CHIT', 'AUCTION_CHIT', 'DOUBLE_CHIT') NOT NULL DEFAULT 'DAILY_CHIT',
  ADD COLUMN route_category ENUM('DAILY_ROUTE', 'MONTHLY_ROUTE') NOT NULL DEFAULT 'DAILY_ROUTE',
  ADD COLUMN foreman_commission_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  ADD COLUMN max_bid_percent DECIMAL(5, 2) NOT NULL DEFAULT 35.00,
  ADD COLUMN route_waypoints_json TEXT NULL;

ALTER TABLE chit_groups
  ADD INDEX idx_groups_chit_type (chit_type),
  ADD INDEX idx_groups_route_cat (route_category);

-- 2. Auctions & Dividends Ledger (ChitBase core mechanism)
CREATE TABLE IF NOT EXISTS auctions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  period_number INT NOT NULL,
  draw_number INT NOT NULL DEFAULT 1,
  auction_type ENUM('AUCTION', 'DOUBLE_CHIT_DRAW', 'LOTTERY_DRAW') NOT NULL DEFAULT 'AUCTION',
  winning_member_id INT NOT NULL,
  winning_ticket_number INT NOT NULL,
  bid_discount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  foreman_commission DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_dividend DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  dividend_per_member DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  net_payable_amount DECIMAL(14, 2) NOT NULL,
  next_installment_payable DECIMAL(12, 2) NOT NULL,
  auction_date DATE NOT NULL,
  payout_status ENUM('PENDING', 'APPROVED', 'DISBURSED') NOT NULL DEFAULT 'PENDING',
  payout_reference VARCHAR(100) NULL,
  conducted_by INT NOT NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_auctions_group FOREIGN KEY (group_id) REFERENCES chit_groups(id) ON DELETE RESTRICT,
  CONSTRAINT fk_auctions_member FOREIGN KEY (winning_member_id) REFERENCES members(id) ON DELETE RESTRICT,
  CONSTRAINT fk_auctions_conducted_by FOREIGN KEY (conducted_by) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_group_period_draw (group_id, period_number, draw_number),
  INDEX idx_auctions_date (auction_date),
  INDEX idx_auctions_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Route Waypoints / Stops for 2D Interactive Route Representation
CREATE TABLE IF NOT EXISTS route_stops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  member_id INT NULL,
  stop_order INT NOT NULL,
  stop_name VARCHAR(150) NOT NULL,
  landmark VARCHAR(150) NULL,
  expected_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  coord_x INT NOT NULL DEFAULT 100,
  coord_y INT NOT NULL DEFAULT 100,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_route_stops_group FOREIGN KEY (group_id) REFERENCES chit_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_route_stops_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
  UNIQUE KEY uq_group_stop_order (group_id, stop_order),
  INDEX idx_stops_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Agent Live Route Progress & Tracking Activity
CREATE TABLE IF NOT EXISTS agent_tracking_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  group_id INT NOT NULL,
  stop_id INT NULL,
  tracking_date DATE NOT NULL,
  status ENUM('IN_TRANSIT', 'VISITED_COLLECTED', 'VISITED_CLOSED', 'CALLBACK_REQUESTED', 'PENDING') NOT NULL DEFAULT 'PENDING',
  current_progress_percent INT NOT NULL DEFAULT 0,
  last_ping_time TIME NOT NULL,
  notes VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_atl_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_atl_group FOREIGN KEY (group_id) REFERENCES chit_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_atl_stop FOREIGN KEY (stop_id) REFERENCES route_stops(id) ON DELETE SET NULL,
  INDEX idx_atl_agent_date (agent_id, tracking_date),
  INDEX idx_atl_group_date (group_id, tracking_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
