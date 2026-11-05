import pool from '../src/config/db.js';

async function run() {
  try {
    console.log('Running Migration 010: interest_user_profiles...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS interest_user_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role ENUM('OWNER', 'MANAGER', 'AGENT', 'VIEWER') NOT NULL DEFAULT 'AGENT',
        permissions JSON NULL,
        phone VARCHAR(20) NULL,
        assigned_area VARCHAR(100) NULL,
        daily_target DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login_at DATETIME NULL,
        CONSTRAINT fk_interest_user_profile_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE KEY uq_interest_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Table interest_user_profiles verified or created.');

    // Seed Owner profile for all SUPER_ADMIN and ADMIN users
    const [admins] = await pool.query(`
      SELECT id, full_name, username, phone FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN')
    `);

    const ownerPermissions = JSON.stringify({
      can_disburse_loans: true,
      can_collect: true,
      can_edit_customers: true,
      can_view_reports: true,
      can_export: true,
      can_approve_cash: true,
      can_delete_records: true,
    });

    for (const admin of admins) {
      await pool.query(`
        INSERT INTO interest_user_profiles (user_id, role, permissions, phone, is_active, must_change_password)
        VALUES (?, 'OWNER', ?, ?, TRUE, FALSE)
        ON DUPLICATE KEY UPDATE role = 'OWNER', is_active = TRUE;
      `, [admin.id, ownerPermissions, admin.phone || null]);
      console.log(`Seeded OWNER profile for admin: ${admin.username} (ID: ${admin.id})`);
    }

    // Seed AGENT profile for any existing agents assigned to INTEREST or ALL
    const [agents] = await pool.query(`
      SELECT id, full_name, username, phone FROM users 
      WHERE role = 'COLLECTION_AGENT' AND assigned_business IN ('INTEREST', 'ALL')
    `);

    const agentPermissions = JSON.stringify({
      can_disburse_loans: false,
      can_collect: true,
      can_edit_customers: false,
      can_view_reports: false,
      can_export: false,
      can_approve_cash: false,
      can_delete_records: false,
    });

    for (const agent of agents) {
      await pool.query(`
        INSERT INTO interest_user_profiles (user_id, role, permissions, phone, is_active, must_change_password)
        VALUES (?, 'AGENT', ?, ?, TRUE, FALSE)
        ON DUPLICATE KEY UPDATE is_active = TRUE;
      `, [agent.id, agentPermissions, agent.phone || null]);
      console.log(`Seeded AGENT profile for agent: ${agent.username} (ID: ${agent.id})`);
    }

    const [profiles] = await pool.query(`
      SELECT p.id, u.username, u.full_name, p.role, p.is_active, p.permissions
      FROM interest_user_profiles p
      JOIN users u ON p.user_id = u.id
    `);

    console.log('Current FinLend Pro User Profiles:');
    console.table(profiles);
    console.log('Migration 010 Completed Successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();

