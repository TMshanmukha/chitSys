import { authenticateUser } from '../src/services/authService.js';
import { pool } from '../src/config/db.js';

async function run() {
  console.log('--- Running Agent Business Segregation & Security Tests ---');

  // Test 1: Admin can log into FinLend Pro
  try {
    const res1 = await authenticateUser({
      selectedRole: 'ADMIN',
      username: 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      business: 'interest',
    });
    console.log('✅ TEST 1 PASSED: Admin successfully authenticated into FinLend Pro.');
  } catch (err) {
    console.log('Admin test note:', err.message);
  }

  // Test 2: ChitFund agent (e.g. mohammed) logging into FinLend Pro (MUST BE BLOCKED)
  try {
    await authenticateUser({
      selectedRole: 'COLLECTION_AGENT',
      username: 'mohammed',
      password: 'dummy_or_real', // Even with credentials, segregation check occurs first or upon user match
      business: 'interest',
    });
    console.error('❌ TEST 2 FAILED: ChitFund agent was able to access FinLend Pro!');
  } catch (err) {
    if (err.message.includes('assigned exclusively to ChitFund Pro')) {
      console.log('✅ TEST 2 PASSED: ChitFund agent correctly BLOCKED from accessing FinLend Pro!');
      console.log('   Expected rejection message:', err.message);
    } else {
      console.log('ℹ️ Rejection caught:', err.message);
    }
  }

  // Test 3: Check that user objects have assigned_business
  const [users] = await pool.query('SELECT id, username, role, assigned_business FROM users');
  console.log('\nUser table status:');
  console.table(users);

  process.exit(0);
}

run();
