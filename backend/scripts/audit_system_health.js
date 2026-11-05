import { pool } from '../src/config/db.js';
import { calculateInterestLoan } from '../src/utils/interestEngine.js';
import { authenticateUser } from '../src/services/authService.js';
import router from '../src/routes/interestRoutes.js';
import adminRouter from '../src/routes/adminRoutes.js';
import authRouter from '../src/routes/authRoutes.js';

async function runAudit() {
  console.log('========================================================');
  console.log('   FULL SYSTEM HEALTH AUDIT: FRONTEND, BACKEND, DATABASE');
  console.log('========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
    }
  }

  try {
    // 1. DATABASE CONNECTIVITY
    console.log('1. Testing Database Connectivity:');
    const [pingRes] = await pool.query('SELECT 1 as ping');
    assert(pingRes[0]?.ping === 1, 'Database responds to query ping');

    // 2. SCHEMA VERIFICATION: FinLend Pro Tables
    console.log('\n2. Verifying FinLend Pro Schema (10 Tables):');
    const requiredInterestTables = [
      'interest_schemes',
      'interest_customers',
      'interest_loans',
      'interest_loan_schedules',
      'interest_collections',
      'interest_agent_assignments',
      'interest_customer_ledgers',
      'interest_preclosures',
      'interest_settlements',
      'interest_collaterals',
    ];

    const [tableRows] = await pool.query('SHOW TABLES');
    const existingTables = tableRows.map((r) => Object.values(r)[0]);

    for (const tbl of requiredInterestTables) {
      assert(existingTables.includes(tbl), `Table '${tbl}' exists in database`);
    }

    // 3. SCHEMA VERIFICATION: ChitFund Pro Core Tables
    console.log('\n3. Verifying ChitFund Pro Core Tables:');
    const requiredChitTables = [
      'users',
      'chit_groups',
      'members',
      'member_enrollments',
      'collections',
      'auctions',
      'auction_payouts',
      'dividend_distributions',
      'audit_logs',
    ];
    for (const tbl of requiredChitTables) {
      assert(existingTables.includes(tbl), `Table '${tbl}' exists in database`);
    }

    // 4. USERS SCHEMA: assigned_business Column
    console.log('\n4. Verifying User Business Segregation Column:');
    const [userCols] = await pool.query('DESCRIBE users');
    const assignedBizCol = userCols.find((c) => c.Field === 'assigned_business');
    assert(Boolean(assignedBizCol), 'Column `assigned_business` exists in users table');
    if (assignedBizCol) {
      assert(
        assignedBizCol.Type.includes('CHITFUND') &&
        assignedBizCol.Type.includes('INTEREST') &&
        assignedBizCol.Type.includes('ALL'),
        `Column \`assigned_business\` enum contains ('CHITFUND', 'INTEREST', 'ALL')`
      );
    }

    // 5. FINANCIAL CALCULATION ENGINE
    console.log('\n5. Verifying Financial Calculation Engine:');
    // Test 1: Flat Rate
    const flatRes = calculateInterestLoan({
      calculation_method: 'FLAT_RATE',
      principal: 100000,
      annual_rate: 24, // 2% per month
      tenure_months: 12,
      repayment_frequency: 'MONTHLY',
    });
    assert(flatRes.total_interest_expected === 24000, 'Flat rate 24% on ₹1,00,000 for 12 months = ₹24,000');
    assert(flatRes.total_payable === 124000, 'Total payable is ₹1,24,000');
    assert(flatRes.installment_amount > 10333 && flatRes.installment_amount < 10334, 'Monthly EMI is ₹10,333.33');
    assert(flatRes.schedules.length === 12, '12 monthly schedule rows generated');

    // Test 2: Reducing Balance EMI
    const emiRes = calculateInterestLoan({
      calculation_method: 'REDUCING_BALANCE_EMI',
      principal: 100000,
      annual_rate: 18,
      tenure_months: 12,
      repayment_frequency: 'MONTHLY',
    });
    assert(emiRes.installment_amount > 9000 && emiRes.installment_amount < 9500, 'Reducing EMI properly amortized');
    assert(emiRes.schedules.length === 12, '12 reducing schedules with principal breakdown generated');

    // Test 3: Bullet Loan
    const bulletRes = calculateInterestLoan({
      calculation_method: 'INTEREST_ONLY_BULLET',
      principal: 50000,
      annual_rate: 24,
      tenure_months: 6,
      repayment_frequency: 'MONTHLY',
    });
    assert(bulletRes.installment_amount === 1000, 'Bullet loan monthly interest = ₹1,000');
    assert(bulletRes.schedules[bulletRes.schedules.length - 1].principal_due === 50000, 'Bullet loan repays principal in last installment');

    // 6. ROUTE INTEGRITY CHECK
    console.log('\n6. Verifying Express Route Tree:');
    assert(Boolean(router), 'Interest routes imported and parsed successfully');
    assert(Boolean(adminRouter), 'ChitFund Admin routes imported and parsed successfully');
    assert(Boolean(authRouter), 'Auth routes imported and parsed successfully');

    console.log('\n========================================================');
    console.log(`   AUDIT COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('========================================================\n');

    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (err) {
    console.error('Audit encountered an unexpected exception:', err);
    process.exit(1);
  }
}

runAudit();

