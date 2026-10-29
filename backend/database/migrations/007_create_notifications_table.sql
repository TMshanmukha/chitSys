-- Migration 007: Create Notifications Table for Real-Time Admin & Agent Alerts
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  target_role ENUM('ALL', 'ADMIN', 'COLLECTION_AGENT') NOT NULL DEFAULT 'ALL',
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('AUCTION', 'COLLECTION', 'DEFAULT', 'PAYOUT', 'SYSTEM', 'GENERAL') NOT NULL DEFAULT 'SYSTEM',
  link VARCHAR(255) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_target_read (target_role, is_read),
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed initial operational notifications
INSERT INTO notifications (user_id, target_role, title, message, type, link, is_read, created_at)
VALUES 
  (NULL, 'ADMIN', '🏆 Monthly Auction Completed', 'Auction for Scheme Royal Wealth 25L completed. Foreman commission of ₹12,500 credited to ledger.', 'AUCTION', '/admin/auctions', 0, NOW()),
  (NULL, 'ADMIN', '💰 Route Collections Updated', 'Agent Srinivas logged 14 daily collections for Morning Daily Route. ₹35,000 cash collected.', 'COLLECTION', '/admin/tracking', 0, NOW()),
  (NULL, 'ALL', '⚖️ Regulatory Audit Logged', 'Chit Funds Act, 1982 automated dividend distribution audit completed successfully.', 'SYSTEM', '/admin/reports', 1, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
  (NULL, 'COLLECTION_AGENT', '🚚 Assigned Route Updated', 'Morning Daily Route has 18 stops scheduled for collection today.', 'COLLECTION', '/agent/dashboard', 0, NOW());
