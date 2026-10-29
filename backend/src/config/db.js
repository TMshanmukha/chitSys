import mysql from 'mysql2/promise';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const isCloudDb =
  env.DB_SSL === 'true' ||
  env.DB_PORT === 4000 ||
  (env.DB_HOST && !['localhost', '127.0.0.1'].includes(env.DB_HOST));

export const sslConfig = isCloudDb
  ? { minVersion: 'TLSv1.2', rejectUnauthorized: false }
  : undefined;

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: env.DB_CONNECTION_LIMIT,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  dateStrings: true,
});

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('✅ MySQL connection established successfully', {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
    });
    connection.release();
    return true;
  } catch (error) {
    logger.error('❌ Failed to connect to MySQL database:', {
      message: error.message,
      code: error.code,
    });
    return false;
  }
}

export default pool;
