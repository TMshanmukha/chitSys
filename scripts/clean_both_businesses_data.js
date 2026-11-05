import { pool } from '../backend/src/config/db.js';

async function clearData() {
  const connection = await pool.getConnection();
  try {
    console.log('🚀 Starting clean wipe of operational test data for BOTH businesses...');

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. FinLend Pro operational tables
    const finlendTables = [
      'interest_collections',
      'interest_loan_schedules',
      'interest_customer_ledgers',
      'interest_cash_submissions',
      'interest_loans',
      'interest_agent_assignments',
      'interest_customers',
      'interest_audit_logs',
    ];

    for (const table of finlendTables) {
      await connection.query(`TRUNCATE TABLE ${table}`);
      console.log(`  ✓ Cleared FinLend table: ${table}`);
    }

    // 2. ChitFund Pro operational tables
    const chitfundTables = [
      'collections',
      'auctions',
      'payouts',
      'member_dividends',
      'admin_member_advances',
      'admin_commission_withdrawals',
      'agent_day_submissions',
      'agent_leave_coverages',
      'agent_leaves',
      'agent_tracking_logs',
      'cash_handovers',
      'route_stops',
      'group_memberships',
      'chit_groups',
      'members',
      'notifications',
    ];

    for (const table of chitfundTables) {
      await connection.query(`TRUNCATE TABLE ${table}`);
      console.log(`  ✓ Cleared ChitFund table: ${table}`);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // Verify preservation of essential platform data
    const [[{ userCount }]] = await connection.query('SELECT COUNT(*) as userCount FROM users');
    const [[{ profileCount }]] = await connection.query('SELECT COUNT(*) as profileCount FROM interest_user_profiles');
    const [[{ schemeCount }]] = await connection.query('SELECT COUNT(*) as schemeCount FROM interest_schemes');

    console.log('\n✅ Data successfully cleaned!');
    console.log(`  - Preserved Users: ${userCount}`);
    console.log(`  - Preserved FinLend Staff Profiles: ${profileCount}`);
    console.log(`  - Preserved FinLend Schemes: ${schemeCount}`);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

clearData();
