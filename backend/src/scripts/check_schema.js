import { pool } from '../config/db.js';

async function checkSchema() {
  const [foreignKeys] = await pool.query(`
    SELECT 
      TABLE_NAME, 
      COLUMN_NAME, 
      CONSTRAINT_NAME, 
      REFERENCED_TABLE_NAME, 
      REFERENCED_COLUMN_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'chitfund_db' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY TABLE_NAME, CONSTRAINT_NAME
  `);

  console.log('=== FOREIGN KEY RELATIONSHIPS ===');
  foreignKeys.forEach((fk) => {
    console.log(`${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME} (${fk.CONSTRAINT_NAME})`);
  });

  const [tables] = await pool.query('SHOW TABLES');
  console.log('\n=== TABLES ===');
  console.log(tables.map((t) => Object.values(t)[0]));

  await pool.end();
}

checkSchema().catch(console.error);
