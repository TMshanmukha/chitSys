import { pool } from '../config/db.js';

async function run() {
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM notifications LIKE 'business'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE notifications ADD COLUMN business ENUM('chitfund', 'interest', 'all') NOT NULL DEFAULT 'chitfund' AFTER link");
      console.log('Successfully added business column to notifications');
    } else {
      console.log('Column business already exists in notifications');
    }

    // Tag interest notifications if link starts with /interest
    await pool.query("UPDATE notifications SET business = 'interest' WHERE link LIKE '/interest%' OR title LIKE '%loan%' OR title LIKE '%finlend%' OR title LIKE '%customer%'");
    console.log('Tagged existing interest notifications');

    const [allRows] = await pool.query('SELECT COUNT(*) as cnt, business FROM notifications GROUP BY business');
    console.log('Current notifications breakdown:', allRows);

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();

