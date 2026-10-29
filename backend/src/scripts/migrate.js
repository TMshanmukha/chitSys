import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { sslConfig } from '../config/db.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  logger.info('📦 Initializing Database Migration Process...');

  // Step 1: Connect to MySQL server
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME || undefined,
    ssl: sslConfig,
    multipleStatements: true,
  });

  try {
    // Step 2: Ensure database exists
    logger.info(`Ensuring database '${env.DB_NAME}' exists...`);
    try {
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
      );
    } catch (dbErr) {
      // In cloud databases (e.g. TiDB Serverless, Aiven), database is pre-created and CREATE DATABASE may be restricted
      logger.info(`Database note: ${dbErr.message}`);
    }
    await connection.query(`USE \`${env.DB_NAME}\`;`);

    // Step 3: Create schema_migrations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(100) NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Step 4: Read migration files from candidate directories
    const candidatePaths = [
      path.resolve(__dirname, '../../../database/migrations'),
      path.resolve(__dirname, '../../database/migrations'),
      path.resolve(__dirname, '../database/migrations'),
      path.resolve(__dirname, '../../migrations'),
      path.resolve(__dirname, '../migrations'),
    ];
    const migrationsDir = candidatePaths.find((p) => fs.existsSync(p));
    if (!migrationsDir) {
      logger.error('Migrations directory not found in any standard path');
      return;
    }

    const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
    logger.info(`Found ${files.length} migration file(s) in ${migrationsDir}`);

    for (const file of files) {
      // Check if migration has already been applied
      const [rows] = await connection.query(
        'SELECT id FROM schema_migrations WHERE version = ? LIMIT 1',
        [file]
      );

      if (rows.length > 0) {
        logger.info(`⏩ Skipping migration ${file} (already applied)`);
        continue;
      }

      logger.info(`▶️ Running migration ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      // Execute migration script
      await connection.query(sqlContent);

      // Record migration with INSERT IGNORE to prevent race collisions
      await connection.query('INSERT IGNORE INTO schema_migrations (version) VALUES (?)', [file]);
      logger.info(`✅ Successfully applied migration: ${file}`);
    }

    // Step 5: Ensure default primary admin user exists (username: admin, password: admin)
    const adminHash = '$2a$10$6zzE21xVg1NcBDd93JIFg.CE2kgm4xiCRAvXCVQuX45X0GZW4Kb1C';
    await connection.query(
      `INSERT IGNORE INTO users (full_name, username, password_hash, role, phone, is_active)
       VALUES (?, ?, ?, 'SUPER_ADMIN', ?, 1)`,
      ['Main Administrator', 'admin', adminHash, '9876543210']
    );

    logger.info('🎉 All database migrations executed successfully!');
  } catch (error) {
    logger.error('❌ Migration error:', { message: error.message, stack: error.stack });
    throw error;
  } finally {
    await connection.end();
  }
}

// Only invoke directly if executed from CLI
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  runMigrations().catch((err) => {
    logger.error('Fatal CLI migration error:', { message: err.message });
    process.exit(1);
  });
}
