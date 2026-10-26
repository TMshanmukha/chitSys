import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

async function seedDatabase() {
  logger.info('🌱 Starting Database Seeding Process...');

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  try {
    // 1. Seed Default Permissions
    logger.info('Seeding default role permissions...');
    const permissions = [
      { role: 'SUPER_ADMIN', key: 'ALL_PRIVILEGES', desc: 'Full business ownership & administrative authority' },
      { role: 'ADMIN', key: 'MANAGE_GROUPS', desc: 'Create and update chit groups and schedules' },
      { role: 'ADMIN', key: 'MANAGE_AGENTS', desc: 'Assign and monitor collection agents' },
      { role: 'ADMIN', key: 'VIEW_REPORTS', desc: 'View collection and cash handover reports' },
      { role: 'COLLECTION_AGENT', key: 'RECORD_COLLECTION', desc: 'Record daily and monthly collections on assigned routes' },
      { role: 'COLLECTION_AGENT', key: 'VIEW_ASSIGNED_GROUPS', desc: 'View assigned chit group members and dues' },
    ];

    for (const p of permissions) {
      await connection.query(
        `INSERT INTO role_permissions (role, permission_key, description)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [p.role, p.key, p.desc]
      );
    }

    // 2. Seed Super Admin
    logger.info(`Checking Super Admin account ('${env.BOOTSTRAP_ADMIN_USERNAME}')...`);
    const [adminRows] = await connection.query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [env.BOOTSTRAP_ADMIN_USERNAME]
    );

    let superAdminId;
    if (adminRows.length === 0) {
      const adminHash = await bcrypt.hash(env.BOOTSTRAP_ADMIN_PASSWORD, 12);
      const [insertRes] = await connection.query(
        `INSERT INTO users (full_name, username, password_hash, role, phone, is_active)
         VALUES (?, ?, ?, 'SUPER_ADMIN', ?, 1)`,
        [
          env.BOOTSTRAP_ADMIN_FULLNAME,
          env.BOOTSTRAP_ADMIN_USERNAME,
          adminHash,
          env.BOOTSTRAP_ADMIN_PHONE,
        ]
      );
      superAdminId = insertRes.insertId;
      logger.info(`✅ Created Super Admin account: '${env.BOOTSTRAP_ADMIN_USERNAME}'`);
    } else {
      superAdminId = adminRows[0].id;
      logger.info(`⏩ Super Admin account '${env.BOOTSTRAP_ADMIN_USERNAME}' already exists.`);
    }

    // 3. Seed Demo Collection Agent
    const demoAgentUsername = 'agent01';
    const demoAgentPass = 'Agent1234!';
    const [agentRows] = await connection.query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [demoAgentUsername]
    );

    if (agentRows.length === 0) {
      const agentHash = await bcrypt.hash(demoAgentPass, 12);
      await connection.query(
        `INSERT INTO users (full_name, username, password_hash, role, phone, is_active, created_by)
         VALUES (?, ?, ?, 'COLLECTION_AGENT', ?, 1, ?)`,
        ['Ramesh Kumar (Route Agent)', demoAgentUsername, agentHash, '9845123456', superAdminId]
      );
      logger.info(`✅ Created Demo Collection Agent: '${demoAgentUsername}'`);
    } else {
      logger.info(`⏩ Demo Collection Agent '${demoAgentUsername}' already exists.`);
    }

    // 4. Seed Inactive Agent (for testing account deactivation behavior)
    const inactiveAgentUsername = 'inactive_agent';
    const [inactiveRows] = await connection.query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [inactiveAgentUsername]
    );

    if (inactiveRows.length === 0) {
      const inactiveHash = await bcrypt.hash('Agent1234!', 12);
      await connection.query(
        `INSERT INTO users (full_name, username, password_hash, role, phone, is_active, created_by)
         VALUES (?, ?, ?, 'COLLECTION_AGENT', ?, 0, ?)`,
        ['Suresh Rao (Deactivated)', inactiveAgentUsername, inactiveHash, '9845000000', superAdminId]
      );
      logger.info(`✅ Created Inactive Agent: '${inactiveAgentUsername}' for safety tests`);
    }

    // 5. Audit Log Seed Entry
    await connection.query(
      `INSERT INTO audit_logs (user_id, action, resource, details, status)
       VALUES (?, 'SYSTEM_SEED', 'DATABASE', JSON_OBJECT('event', 'Initial database seeding completed'), 'SUCCESS')`,
      [superAdminId]
    );

    logger.info('🎉 Database seeding completed successfully!');
    logger.info('==========================================');
    logger.info('Admin Credentials:');
    logger.info(`Username: ${env.BOOTSTRAP_ADMIN_USERNAME}`);
    logger.info(`Password: ${env.BOOTSTRAP_ADMIN_PASSWORD}`);
    logger.info('------------------------------------------');
    logger.info('Collection Agent Credentials:');
    logger.info(`Username: ${demoAgentUsername}`);
    logger.info(`Password: ${demoAgentPass}`);
    logger.info('==========================================');
  } catch (error) {
    logger.error('❌ Seeding failed:', { message: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedDatabase();
