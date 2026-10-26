import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

async function seedDatabase() {
  logger.info('🌱 Starting Production Database Seeding Process...');

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  try {
    // 1. Seed Core Permissions
    logger.info('Verifying role permissions...');
    const permissions = [
      { role: 'SUPER_ADMIN', key: 'ALL_PRIVILEGES', desc: 'Full administrative authority and business ownership' },
      { role: 'ADMIN', key: 'MANAGE_GROUPS', desc: 'Create and update chit groups and schedules' },
      { role: 'ADMIN', key: 'MANAGE_MEMBERS', desc: 'Register members and manage participant records' },
      { role: 'ADMIN', key: 'MANAGE_AGENTS', desc: 'Create and assign field collection agents' },
      { role: 'ADMIN', key: 'RECORD_COLLECTION', desc: 'Record collections directly from office' },
      { role: 'ADMIN', key: 'RECONCILE_HANDOVERS', desc: 'Verify and settle daily agent cash handovers' },
      { role: 'ADMIN', key: 'VIEW_REPORTS', desc: 'Generate financial reports and collection logs' },
      { role: 'COLLECTION_AGENT', key: 'RECORD_COLLECTION', desc: 'Record daily/monthly payments on assigned routes' },
      { role: 'COLLECTION_AGENT', key: 'VIEW_ASSIGNED_GROUPS', desc: 'View assigned members and collection dues' },
      { role: 'COLLECTION_AGENT', key: 'SUBMIT_HANDOVER', desc: 'Submit daily cash handover reconciliation slips' },
    ];

    for (const p of permissions) {
      await connection.query(
        `INSERT INTO role_permissions (role, permission_key, description)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [p.role, p.key, p.desc]
      );
    }

    // 2. Clean up any operational test data and extra accounts to ensure pure production state
    logger.info('Purging demo and test transactional data...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE collections');
    await connection.query('TRUNCATE TABLE group_memberships');
    await connection.query('TRUNCATE TABLE agent_group_assignments');
    await connection.query('TRUNCATE TABLE cash_handovers');
    await connection.query('TRUNCATE TABLE payouts');
    await connection.query('TRUNCATE TABLE members');
    await connection.query('TRUNCATE TABLE chit_groups');
    await connection.query("DELETE FROM users WHERE username != 'admin'");
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // 3. Ensure Single Primary Admin Account (Username: admin, Password: admin)
    const adminUsername = 'admin';
    const adminPassword = 'admin';
    const adminHash = await bcrypt.hash(adminPassword, 12);

    const [adminRows] = await connection.query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [adminUsername]
    );

    let superAdminId;
    if (adminRows.length === 0) {
      const [insertRes] = await connection.query(
        `INSERT INTO users (full_name, username, password_hash, role, phone, is_active)
         VALUES (?, ?, ?, 'SUPER_ADMIN', ?, 1)`,
        ['Business Administrator', adminUsername, adminHash, '9876543210']
      );
      superAdminId = insertRes.insertId;
      logger.info(`✅ Created Primary Administrator: '${adminUsername}'`);
    } else {
      superAdminId = adminRows[0].id;
      // Update password hash to 'admin'
      await connection.query(
        'UPDATE users SET password_hash = ?, is_active = 1 WHERE id = ?',
        [adminHash, superAdminId]
      );
      logger.info(`✅ Updated Primary Administrator password for '${adminUsername}'`);
    }

    // 4. Audit Log entry
    await connection.query(
      `INSERT INTO audit_logs (user_id, action, resource, details, status)
       VALUES (?, 'SYSTEM_INIT', 'DATABASE', JSON_OBJECT('event', 'Production schema & single admin setup completed'), 'SUCCESS')`,
      [superAdminId]
    );

    logger.info('🎉 Database initialization complete!');
    logger.info('==================================================');
    logger.info('Single System Administrator Account:');
    logger.info(`Username: ${adminUsername}`);
    logger.info(`Password: ${adminPassword}`);
    logger.info('No demo agents exist. You can create real collection agents from the Agent Management module.');
    logger.info('==================================================');
  } catch (error) {
    logger.error('❌ Seeding failed:', { message: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedDatabase();
