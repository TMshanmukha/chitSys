import pool from '../src/config/db.js';

async function seedData() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if loans exist
    const [[existingLoans]] = await connection.query(`SELECT COUNT(*) as cnt FROM interest_loans`);
    if (existingLoans.cnt > 0) {
      console.log('Loans already exist:', existingLoans.cnt);
      await connection.rollback();
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const agentId = 420001; // shanmukha1

    // 1. Get or create customers
    const [[custCount]] = await connection.query(`SELECT COUNT(*) as cnt FROM interest_customers`);
    let customerIds = [];
    if (custCount.cnt === 0) {
      const customers = [
        { name: 'K. Ramesh', phone: '9876543210', city: 'Vijayawada', address: 'Shop #12, Flower Market', code: 'CUST-2026-0001' },
        { name: 'S. Lakshmi', phone: '9876543211', city: 'Vijayawada', address: 'H.No 4-51, Gandhi Nagar', code: 'CUST-2026-0002' },
        { name: 'V. Suresh', phone: '9876543212', city: 'Guntur', address: 'Stall 8, Vegetable Market Yard', code: 'CUST-2026-0003' },
        { name: 'P. Rajesh', phone: '9876543213', city: 'Vijayawada', address: 'Plot 102, Near Bus Stand', code: 'CUST-2026-0004' },
      ];
      for (const c of customers) {
        const [res] = await connection.query(`
          INSERT INTO interest_customers (customer_code, full_name, phone, city, address, status)
          VALUES (?, ?, ?, ?, ?, 'ACTIVE')
        `, [c.code, c.name, c.phone, c.city, c.address]);
        customerIds.push(res.insertId);
      }
    } else {
      const [rows] = await connection.query(`SELECT id FROM interest_customers LIMIT 4`);
      customerIds = rows.map(r => r.id);
    }

    // 2. Fetch Scheme 1 & Scheme 2
    const [[scheme1]] = await connection.query(`SELECT * FROM interest_schemes WHERE id = 1`);
    const [[scheme2]] = await connection.query(`SELECT * FROM interest_schemes WHERE id = 2`);

    // 3. Create 4 active loans
    const loanConfigs = [
      { custId: customerIds[0], scheme: scheme1, principal: 20000, installment: 250, acc: 'LN-2026-0001', tenure: 100 },
      { custId: customerIds[1], scheme: scheme1, principal: 15000, installment: 200, acc: 'LN-2026-0002', tenure: 100 },
      { custId: customerIds[2], scheme: scheme2 || scheme1, principal: 50000, installment: 4584, acc: 'LN-2026-0003', tenure: 12 },
      { custId: customerIds[3], scheme: scheme1, principal: 30000, installment: 350, acc: 'LN-2026-0004', tenure: 100 },
    ];

    for (const l of loanConfigs) {
      const s = l.scheme;
      const totalPayable = l.installment * l.tenure;
      const totalInterest = totalPayable - l.principal;

      const [res] = await connection.query(`
        INSERT INTO interest_loans (
          loan_account_number, customer_id, scheme_id, principal_amount, calculation_method,
          interest_rate, rate_period, repayment_frequency, tenure_periods, installment_amount,
          total_interest_expected, total_payable, disbursement_date, first_due_date, maturity_date,
          principal_outstanding, interest_outstanding, assigned_agent_id, loan_status
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, '2027-02-15',
          ?, ?, ?, 'ACTIVE'
        )
      `, [
        l.acc, l.custId, s.id, l.principal, s.calculation_method,
        s.interest_rate, s.rate_period, s.repayment_frequency, l.tenure, l.installment,
        totalInterest, totalPayable, todayStr, todayStr,
        l.principal, totalInterest, agentId
      ]);

      const loanId = res.insertId;

      // Create Schedule row for today
      await connection.query(`
        INSERT INTO interest_loan_schedules (
          loan_id, installment_number, due_date, principal_due, interest_due, penalty_due,
          total_due, principal_paid, interest_paid, penalty_paid, total_paid, status
        ) VALUES (?, 1, ?, ?, ?, 0.00, ?, 0.00, 0.00, 0.00, 0.00, 'PENDING')
      `, [loanId, todayStr, l.installment * 0.8, l.installment * 0.2, l.installment]);

      // Create agent assignment
      await connection.query(`
        INSERT INTO interest_agent_assignments (
          agent_id, customer_id, loan_id, assigned_by, assignment_date, route_name, status
        ) VALUES (?, ?, ?, 1, ?, 'Morning Route', 'ACTIVE')
      `, [agentId, l.custId, loanId, todayStr]);
    }

    await connection.commit();
    console.log('SUCCESSFULLY_SEEDED_FINLEND_LOANS');
  } catch (err) {
    await connection.rollback();
    console.error('Failed to seed sample data:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

seedData();
