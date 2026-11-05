import { pool } from '../src/config/db.js';

async function run() {
  try {
    console.log('Checking assigned_business column in users table...');
    const [cols] = await pool.query('SHOW COLUMNS FROM users LIKE "assigned_business"');
    if (cols.length === 0) {
      console.log('Adding assigned_business column to users...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN assigned_business ENUM('CHITFUND', 'INTEREST', 'ALL') NOT NULL DEFAULT 'CHITFUND'
        AFTER role
      `);
      console.log('Column added successfully.');
    } else {
      console.log('Column assigned_business already exists.');
    }

    await pool.query("UPDATE users SET assigned_business = 'ALL' WHERE role IN ('SUPER_ADMIN', 'ADMIN')");
    console.log('Admin assigned_business set to ALL.');

    const [users] = await pool.query('SELECT id, username, role, assigned_business FROM users');
    console.log('Current users and their business assignment:');
    console.table(users);
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
