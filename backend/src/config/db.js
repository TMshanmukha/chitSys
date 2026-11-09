import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Determine if this is a cloud DB (TiDB) – TLS required when connecting remotely
const isCloudDb =
  env.DB_SSL === 'true' ||
  env.DB_PORT === 4000 ||
  (env.DB_HOST && !['localhost', '127.0.0.1'].includes(env.DB_HOST));

let resolvedCaPath = undefined;
if (env.DB_SSL_CA_PATH) {
  const directPath = path.resolve(process.cwd(), env.DB_SSL_CA_PATH);
  const backendSubPath = path.resolve(process.cwd(), 'backend', env.DB_SSL_CA_PATH);
  if (fs.existsSync(directPath)) {
    resolvedCaPath = directPath;
  } else if (fs.existsSync(backendSubPath)) {
    resolvedCaPath = backendSubPath;
  }
}

export const sslConfig = isCloudDb && resolvedCaPath ? { ca: fs.readFileSync(resolvedCaPath), rejectUnauthorized: false, minVersion: 'TLSv1.2' } : undefined;

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
  timezone: '+05:30',
});

// Enforce Indian Standard Time (IST UTC+5:30) across all pooled database connections
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+05:30';", (err) => {
    if (err) {
      logger.warn('Could not set session time_zone to +05:30:', { message: err.message });
    }
  });
});

export async function ensureDefaultSchemes() {
  try {
    const [tables] = await pool.query("SHOW TABLES LIKE 'interest_schemes'");
    if (!tables || tables.length === 0) return;

    const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM interest_schemes');
    if (rows[0]?.cnt === 0) {
      await pool.query(`
        INSERT IGNORE INTO interest_businesses (id, business_name, business_code, tagline, phone, email, address, currency_symbol)
        VALUES (1, 'FinLend Pro', 'FLPRO-01', 'Smart Interest & Micro-Finance Lending', '+91 98765 43210', 'support@finlendpro.local', 'Main Financial District, Hyderabad, India', '₹')
      `);
      await pool.query(`
        INSERT INTO interest_schemes 
        (id, scheme_name, scheme_code, description, calculation_method, interest_rate, rate_period, repayment_frequency, min_principal, max_principal, default_principal, min_tenure_periods, max_tenure_periods, default_tenure_periods, status)
        VALUES 
        (1, 'Daily Micro-Finance (100 Days)', 'DMF-100D', 'Daily principal and interest recovery for small merchants & shops over 100 days.', 'FLAT', 10.0000, 'MONTHLY', 'DAILY', 1000.00, 1000000.00, 50000.00, 1, 365, 100, 'ACTIVE'),
        (2, 'Standard Monthly EMI (Reducing Balance)', 'EMI-REDUCE-12M', 'Standard reducing balance amortization where interest is charged strictly on remaining unpaid balance.', 'REDUCING_BALANCE', 18.0000, 'ANNUAL', 'MONTHLY', 1000.00, 10000000.00, 50000.00, 1, 360, 12, 'ACTIVE'),
        (3, 'Periodic Interest-Only (Bullet Repayment)', 'VADDI-BULLET-MO', 'Monthly interest payment only (Vaddi Vyaparam), with full principal repaid at maturity.', 'INTEREST_ONLY', 2.0000, 'MONTHLY', 'MONTHLY', 1000.00, 5000000.00, 100000.00, 1, 120, 6, 'ACTIVE'),
        (4, 'Daily Outstanding Balance Interest', 'DOB-FLEX-DAILY', 'Daily interest computed on the actual end-of-day outstanding principal with flexible repayments.', 'DAILY_BALANCE', 0.1000, 'DAILY', 'DAILY', 1000.00, 1000000.00, 25000.00, 1, 365, 60, 'ACTIVE')
      `);
      logger.info('✅ Auto-seeded default FinLend schemes and business');
    }
  } catch (err) {
    logger.warn('Non-fatal: ensureDefaultSchemes check skipped', { message: err.message });
  }
}

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('✅ MySQL connection established successfully', {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
    });
    connection.release();

    // Auto-seed required default entities if database was wiped
    await ensureDefaultSchemes();

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
