CREATE TABLE IF NOT EXISTS agent_leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  leave_date DATE NOT NULL,
  reason VARCHAR(500) NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_agent_leave_date (agent_id, leave_date),
  INDEX idx_leave_date_status (leave_date, status),
  CONSTRAINT fk_leave_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agent_leave_coverages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leave_id INT NOT NULL,
  group_id INT NOT NULL,
  covering_agent_id INT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_leave_group (leave_id, group_id),
  CONSTRAINT fk_coverage_leave FOREIGN KEY (leave_id) REFERENCES agent_leaves(id) ON DELETE CASCADE,
  CONSTRAINT fk_coverage_group FOREIGN KEY (group_id) REFERENCES chit_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_coverage_agent FOREIGN KEY (covering_agent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_coverage_admin FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
