import mysql from 'mysql2/promise';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
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
