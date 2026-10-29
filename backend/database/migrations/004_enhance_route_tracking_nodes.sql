-- Migration: 004_enhance_route_tracking_nodes.sql
-- Description: Allow agent tracking logs to store PAID / NOT_PAID and direct member_id linking

ALTER TABLE agent_tracking_logs
  MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'NOT_PAID';

-- Add member_id if not present
SET @col_exists := (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'agent_tracking_logs' 
    AND COLUMN_NAME = 'member_id'
);

SET @sql := IF(@col_exists = 0, 
  'ALTER TABLE agent_tracking_logs ADD COLUMN member_id INT NULL', 
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'agent_tracking_logs'
    AND INDEX_NAME = 'idx_atl_member'
);

SET @sql_idx := IF(@idx_exists = 0,
  'ALTER TABLE agent_tracking_logs ADD INDEX idx_atl_member (member_id)',
  'SELECT 1'
);

PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;
