import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  logger.info('📦 Initializing Database Migration Process...');

  // Step 1: Connect to MySQL server (without specifying target database yet)
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    // Step 2: Ensure database exists
    logger.info(`Ensuring database '${env.DB_NAME}' exists...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await connection.query(`USE \`${env.DB_NAME}\`;`);

    // Step 3: Create schema_migrations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(100) NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Step 4: Read migration files from database/migrations
    const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.error(`Migrations directory not found at: ${migrationsDir}`);
      process.exit(1);
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

      // Record migration
      await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
      logger.info(`✅ Successfully applied migration: ${file}`);
    }

    logger.info('🎉 All database migrations executed successfully!');
  } catch (error) {
    logger.error('❌ Migration failed:', { message: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
