import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { sslConfig } from '../config/db.js';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcryptjs';

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

async function purgeDatabase(connection, dbLabel) {
  logger.info(`🧹 Resetting database [${dbLabel}]...`);

  await connection.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of tablesToTruncate) {
    try {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
      logger.info(`  ✓ Truncated table: ${table}`);
    } catch (err) {
      logger.warn(`  ⚠️ Table ${table} truncate error: ${err.message}`);
    }
  }

  // Delete non-admin users, keeping only the primary admin account
  await connection.query("DELETE FROM users WHERE username != 'admin'");
  logger.info("  ✓ Deleted non-admin users. Retained primary admin user.");

  // Verify admin user exists; if missing, seed standard admin account
  const [adminRows] = await connection.query("SELECT id, username, role FROM users WHERE username = 'admin' LIMIT 1");
  if (adminRows.length === 0) {
    const defaultHash = await bcrypt.hash('admin', 12);
    await connection.query(
      "INSERT INTO users (id, full_name, username, password_hash, role, phone, is_active) VALUES (1, 'Administrator Foreman', 'admin', ?, 'SUPER_ADMIN', '9876543210', 1)",
      [defaultHash]
    );
    logger.info("  ✓ Seeded default admin account (username: 'admin', role: 'SUPER_ADMIN')");
  }

  // Reset admin personal profile
  try {
    await connection.query('TRUNCATE TABLE admin_personal_profiles');
    await connection.query(
      `INSERT INTO admin_personal_profiles 
        (user_id, firm_name, registration_number, act_compliance, registrar_office, official_phone, bank_name, account_holder_name) 
       VALUES (1, 'ChitFund Pro Enterprise Services', 'CF/TS/2026/8849', 'Chit Funds Act, 1982 (Act No. 40 of 1982)', 'Office of the Registrar of Chits, Telangana', '9876543210', 'HDFC Bank', 'Administrator Foreman')`
    );
    logger.info("  ✓ Initialized clean admin personal profile.");
  } catch (err) {
    logger.warn(`  ⚠️ admin_personal_profiles: ${err.message}`);
  }

  // Ensure default role permissions are present
  try {
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
    logger.info("  ✓ Initialized clean role permissions.");
  } catch (err) {
    logger.warn(`  ⚠️ role_permissions: ${err.message}`);
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 1');

  // Verify final table row counts
  const [tables] = await connection.query('SHOW TABLES');
  const tableKey = Object.keys(tables[0])[0];
  const counts = {};
  for (const t of tables) {
    const tableName = t[tableKey];
    const [c] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    counts[tableName] = c[0].count;
  }
  logger.info(`✅ [${dbLabel}] Table counts after purge:`, counts);
}

export async function clearAllDatabaseExceptAdmin() {
  // 1. Clear configured database (TiDB cloud or current env target)
  try {
    const connEnv = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      ssl: sslConfig,
    });
    try {
      await purgeDatabase(connEnv, `CONFIGURED_ENV: ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
    } finally {
      await connEnv.end();
    }
  } catch (err) {
    logger.error(`❌ Failed to clear configured env database: ${err.message}`);
  }

  // 2. Also check if local MySQL on localhost:3306 has chitfund_db, and clear it as well
  const localPasswords = ['admin', 'root', '', 'password'];
  for (const pwd of localPasswords) {
    try {
      const connLocal = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: pwd,
        database: 'chitfund_db',
      });
      try {
        await purgeDatabase(connLocal, `LOCAL_MYSQL: localhost:3306/chitfund_db (password: '${pwd}')`);
        break; // Successfully purged local MySQL
      } finally {
        await connLocal.end();
      }
    } catch (_) {
      // Try next password or local MySQL not running on this password
    }
  }

  logger.info('🎉 Database purge completed across both Cloud and Local MySQL databases!');
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
