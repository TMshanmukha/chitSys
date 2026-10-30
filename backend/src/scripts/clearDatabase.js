import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { sslConfig } from '../config/db.js';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcryptjs';

export async function clearAllDatabaseExceptAdmin() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: sslConfig,
  });

  try {
    logger.info('🧹 Starting Database Reset: Purging all data except Admin credentials...');

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const tablesToTruncate = [
      'member_dividends',
      'payouts',
      'auctions',
      'collections',
      'agent_tracking_logs',
      'route_stops',
      'group_memberships',
      'agent_group_assignments',
      'chit_groups',
      'members',
      'cash_handovers',
      'admin_commission_withdrawals',
      'notifications',
      'audit_logs',
      'token_revocations',
    ];

    for (const table of tablesToTruncate) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
      logger.info(`Truncated table: ${table}`);
    }

    // Delete non-admin users, keeping only the primary admin account
    await connection.query("DELETE FROM users WHERE username != 'admin'");
    logger.info("Retained primary Admin account (username: 'admin'). Deleted demo/test agent accounts.");

    // Verify admin user exists; if missing, seed standard admin account
    const [adminRows] = await connection.query("SELECT id, username, role FROM users WHERE username = 'admin' LIMIT 1");
    if (adminRows.length === 0) {
      const defaultHash = await bcrypt.hash('admin', 12);
      await connection.query(
        "INSERT INTO users (id, full_name, username, password_hash, role, phone, is_active) VALUES (1, 'Administrator Foreman', 'admin', ?, 'SUPER_ADMIN', '9876543210', 1)",
        [defaultHash]
      );
      logger.info("Admin account seeded (username: 'admin', role: 'SUPER_ADMIN')");
    }

    // Reset admin personal profile to clean default
    await connection.query('TRUNCATE TABLE admin_personal_profiles');
    await connection.query(
      `INSERT INTO admin_personal_profiles 
        (user_id, firm_name, registration_number, act_compliance, registrar_office, official_phone, bank_name, account_holder_name) 
       VALUES (1, 'ChitFund Pro Enterprise Services', 'CF/TS/2026/8849', 'Chit Funds Act, 1982 (Act No. 40 of 1982)', 'Office of the Registrar of Chits, Telangana', '9876543210', 'HDFC Bank', 'Administrator Foreman')`
    );

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    logger.info('✅ Database reset complete. All information cleared except Admin credentials.');
  } finally {
    await connection.end();
  }
}

if (process.argv[1]?.includes('clearDatabase.js')) {
  clearAllDatabaseExceptAdmin()
    .then(() => {
      console.log('Database successfully cleared.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error clearing database:', err);
      process.exit(1);
    });
}
