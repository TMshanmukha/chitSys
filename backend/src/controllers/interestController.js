import pool from '../config/db.js';
import { logger } from '../utils/logger.js';
import { calculateLoanSchedule, allocatePayment, roundMoney } from '../services/interestCalculationEngine.js';
import { getTodayIST } from '../utils/dateUtils.js';

/**
 * ============================================================================
 * 1. DASHBOARD & BUSINESS OVERVIEW METRICS
 * ============================================================================
 */
export async function getDashboardMetrics(req, res) {
  try {
    const [[loanStats]] = await pool.query(`
      SELECT 
        COUNT(*) as total_loans,
        SUM(CASE WHEN loan_status = 'ACTIVE' THEN 1 ELSE 0 END) as active_loans,
        SUM(CASE WHEN loan_status = 'OVERDUE' THEN 1 ELSE 0 END) as overdue_loans,
        SUM(CASE WHEN loan_status = 'CLOSED' THEN 1 ELSE 0 END) as closed_loans,
        COALESCE(SUM(principal_amount), 0) as total_principal_disbursed,
        COALESCE(SUM(principal_outstanding), 0) as total_principal_outstanding,
        COALESCE(SUM(total_interest_paid), 0) as total_interest_collected,
        COALESCE(SUM(total_principal_paid), 0) as total_principal_collected
      FROM interest_loans
    `);

    const [[customerStats]] = await pool.query(`
      SELECT COUNT(*) as total_customers,
             SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_customers
      FROM interest_customers
    `);

    const todayStr = getTodayIST();
    const [[todayColStats]] = await pool.query(`
      SELECT 
        COALESCE(SUM(amount_collected), 0) as today_collected,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount_collected ELSE 0 END), 0) as today_cash,
        COALESCE(SUM(CASE WHEN payment_method != 'CASH' THEN amount_collected ELSE 0 END), 0) as today_digital,
        COUNT(*) as today_receipts_count
      FROM interest_collections
      WHERE collection_date = ? AND status = 'CONFIRMED'
    `, [todayStr]);

    const [[overdueStats]] = await pool.query(`
      SELECT 
        COALESCE(SUM(total_due - total_paid), 0) as total_overdue_amount,
        COUNT(DISTINCT loan_id) as overdue_accounts_count
      FROM interest_loan_schedules
      WHERE due_date < ? AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
    `, [todayStr]);

    const [recentCollections] = await pool.query(`
      SELECT c.*, cust.full_name as customer_name, cust.phone as customer_phone,
             l.loan_account_number, u.full_name as agent_name
      FROM interest_collections c
      JOIN interest_customers cust ON c.customer_id = cust.id
      JOIN interest_loans l ON c.loan_id = l.id
      LEFT JOIN users u ON c.collected_by_user_id = u.id
      ORDER BY c.id DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        loanStats,
        customerStats,
        todayColStats,
        overdueStats,
        recentCollections,
      },
    });
  } catch (error) {
    logger.error('Failed to get interest dashboard metrics', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard metrics' });
  }
}

/**
 * ============================================================================
 * 2. SCHEMES MANAGEMENT (Configurable Financial Scheme Builder)
 * ============================================================================
 */
export async function getSchemes(req, res) {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM interest_schemes';
    const params = [];
    if (status && status !== 'ALL') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY id DESC';

    const [schemes] = await pool.query(query, params);
    res.json({ success: true, data: schemes });
  } catch (error) {
    logger.error('Failed to get interest schemes', error);
    res.status(500).json({ success: false, message: 'Failed to load schemes' });
  }
}

export async function createScheme(req, res) {
  try {
    const {
      scheme_name,
      scheme_code,
      description,
      calculation_method = 'FLAT',
      interest_rate,
      rate_period = 'MONTHLY',
      repayment_frequency = 'MONTHLY',
      min_principal = 1000,
      max_principal = 1000000,
      default_principal = 50000,
      min_tenure_periods = 1,
      max_tenure_periods = 36,
      default_tenure_periods = 12,
      grace_period_days = 0,
      late_penalty_percent = 0,
      late_penalty_flat = 0,
      allow_part_payment = true,
      allow_advance_payment = true,
      allow_preclosure = true,
      preclosure_discount_percent = 0,
      allocation_priority = 'STANDARD',
      status = 'ACTIVE',
    } = req.body;

    if (!scheme_name || !scheme_code || interest_rate === undefined) {
      return res.status(400).json({ success: false, message: 'Scheme name, code, and interest rate are required' });
    }

    const [existing] = await pool.query('SELECT id FROM interest_schemes WHERE scheme_code = ?', [scheme_code]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: `Scheme code '${scheme_code}' is already in use` });
    }

    const [result] = await pool.query(`
      INSERT INTO interest_schemes (
        scheme_name, scheme_code, description, calculation_method, interest_rate, rate_period,
        repayment_frequency, min_principal, max_principal, default_principal, min_tenure_periods,
        max_tenure_periods, default_tenure_periods, grace_period_days, late_penalty_percent,
        late_penalty_flat, allow_part_payment, allow_advance_payment, allow_preclosure,
        preclosure_discount_percent, allocation_priority, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      scheme_name, scheme_code, description || null, calculation_method, interest_rate, rate_period,
      repayment_frequency, min_principal, max_principal, default_principal, min_tenure_periods,
      max_tenure_periods, default_tenure_periods, grace_period_days, late_penalty_percent,
      late_penalty_flat, allow_part_payment, allow_advance_payment, allow_preclosure,
      preclosure_discount_percent, allocation_priority, status, req.user?.id || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Interest scheme created successfully',
      data: { id: result.insertId, scheme_code, scheme_name },
    });
  } catch (error) {
    logger.error('Failed to create interest scheme', error);
    res.status(500).json({ success: false, message: 'Failed to create scheme' });
  }
}

export async function previewSchemeCalculation(req, res) {
  try {
    const {
      principal = 50000,
      interest_rate = 18,
      rate_period = 'MONTHLY',
      calculation_method = 'FLAT',
      repayment_frequency = 'MONTHLY',
      tenure_periods = 12,
      start_date,
      first_due_date,
    } = req.body;

    const preview = calculateLoanSchedule({
      principal: parseFloat(principal),
      interest_rate: parseFloat(interest_rate),
      rate_period,
      calculation_method,
      repayment_frequency,
      tenure_periods: parseInt(tenure_periods, 10),
      start_date,
      first_due_date,
    });

    res.json({ success: true, data: preview });
  } catch (error) {
    logger.error('Failed to preview calculation', error);
    res.status(500).json({ success: false, message: 'Calculation preview failed' });
  }
}

/**
 * ============================================================================
 * 3. CUSTOMER MANAGEMENT (Borrower Profiles & KYC)
 * ============================================================================
 */
export async function getCustomers(req, res) {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT c.*, 
        COUNT(l.id) as total_loans_count,
        SUM(CASE WHEN l.loan_status = 'ACTIVE' THEN 1 ELSE 0 END) as active_loans_count,
        COALESCE(SUM(l.principal_outstanding), 0) as total_principal_outstanding,
        COALESCE(SUM(l.principal_outstanding + l.interest_outstanding), 0) as total_balance_to_close,
        COALESCE(SUM(l.total_principal_paid + l.total_interest_paid), 0) as total_amount_paid
      FROM interest_customers c
      LEFT JOIN interest_loans l ON c.id = l.customer_id
    `;
    const whereConditions = [];
    const params = [];

    if (search && search.trim()) {
      whereConditions.push('(c.full_name LIKE ? OR c.phone LIKE ? OR c.customer_code LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (status && status !== 'ALL') {
      whereConditions.push('c.status = ?');
      params.push(status);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' GROUP BY c.id ORDER BY c.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const [customers] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM interest_customers c';
    const countParams = [];
    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
      countParams.push(...params.slice(0, -2));
    }
    const [[countResult]] = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: customers,
      pagination: {
        totalItems: countResult.total,
        currentPage: parseInt(page, 10),
        pageSize: parseInt(limit, 10),
      },
    });
  } catch (error) {
    logger.error('Failed to get customers', error);
    res.status(500).json({ success: false, message: 'Failed to load customers' });
  }
}

export async function getCustomerById(req, res) {
  try {
    const { id } = req.params;
    const todayStr = getTodayIST();
    const [[customer]] = await pool.query('SELECT * FROM interest_customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const [loans] = await pool.query(`
      SELECT l.*, s.scheme_name, s.scheme_code,
             (SELECT COUNT(*) FROM interest_loan_schedules WHERE loan_id = l.id AND status = 'PAID') as completed_installments,
             (SELECT COUNT(*) FROM interest_loan_schedules WHERE loan_id = l.id) as total_installments,
             (SELECT MAX(due_date) FROM interest_loan_schedules WHERE loan_id = l.id AND status = 'PAID') as paid_until_date,
             (SELECT MIN(due_date) FROM interest_loan_schedules WHERE loan_id = l.id AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')) as next_due_date,
             (SELECT COALESCE(SUM(total_due - total_paid), 0) FROM interest_loan_schedules WHERE loan_id = l.id AND due_date <= ? AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')) as current_due_amount,
             (SELECT COALESCE(SUM(total_due - total_paid), 0) FROM interest_loan_schedules WHERE loan_id = l.id AND due_date < ? AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')) as overdue_amount
      FROM interest_loans l
      JOIN interest_schemes s ON l.scheme_id = s.id
      WHERE l.customer_id = ?
      ORDER BY l.id DESC
    `, [todayStr, todayStr, id]);

    const [ledger] = await pool.query(`
      SELECT * FROM interest_customer_ledgers
      WHERE customer_id = ?
      ORDER BY transaction_date DESC, id DESC
      LIMIT 100
    `, [id]);

    // Total collected directly from confirmed receipts
    const [[totColRow]] = await pool.query(`
      SELECT COALESCE(SUM(amount_collected), 0) as total_collected
      FROM interest_collections
      WHERE customer_id = ? AND status = 'CONFIRMED'
    `, [id]);

    // Total pending overdue across all active loans for this customer
    const [[totOverdueRow]] = await pool.query(`
      SELECT COALESCE(SUM(s.total_due - s.total_paid), 0) as total_pending_overdue
      FROM interest_loan_schedules s
      JOIN interest_loans l ON s.loan_id = l.id
      WHERE l.customer_id = ? AND l.loan_status = 'ACTIVE' AND s.due_date <= ? AND s.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
    `, [id, todayStr]);

    const [collections] = await pool.query(`
      SELECT c.*, l.loan_account_number, u.full_name as collected_by_name
      FROM interest_collections c
      JOIN interest_loans l ON c.loan_id = l.id
      LEFT JOIN users u ON c.collected_by_user_id = u.id
      WHERE c.customer_id = ? AND c.status = 'CONFIRMED'
      ORDER BY c.collection_date DESC, c.id DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        customer: {
          ...customer,
          total_collected: Number(totColRow.total_collected || 0),
          total_pending_overdue: Number(totOverdueRow.total_pending_overdue || 0),
        },
        loans,
        ledger,
        collections,
      },
    });
  } catch (error) {
    logger.error('Failed to get customer details', error);
    res.status(500).json({ success: false, message: 'Failed to load customer profile' });
  }
}

export async function createCustomer(req, res) {
  try {
    const {
      full_name,
      phone,
      alternate_phone,
      email,
      address,
      city,
      pincode,
      aadhaar_number,
      pan_number,
      nominee_name,
      nominee_phone,
      nominee_relation,
      guarantor_name,
      guarantor_phone,
      guarantor_address,
      notes,
      photo_url,
    } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({ success: false, message: 'Full name and phone number are required' });
    }

    const cleanPhone = String(phone).trim();
    // Restrict duplicate phone numbers
    const [existingPhone] = await pool.query(
      'SELECT id, full_name, customer_code FROM interest_customers WHERE phone = ? LIMIT 1',
      [cleanPhone]
    );
    if (existingPhone && existingPhone.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Customer already exists with phone number ${cleanPhone} (${existingPhone[0].full_name} · ${existingPhone[0].customer_code})`,
      });
    }

    // Auto-generate customer code: CUST-YYYY-XXXX
    const year = new Date().getFullYear();
    const [[countRow]] = await pool.query('SELECT COUNT(*) as cnt FROM interest_customers');
    const customer_code = `CUST-${year}-${String(countRow.cnt + 1).padStart(4, '0')}`;

    const [result] = await pool.query(`
      INSERT INTO interest_customers (
        customer_code, full_name, phone, alternate_phone, email, address, city, pincode,
        aadhaar_number, pan_number, photo_url, nominee_name, nominee_phone, nominee_relation,
        guarantor_name, guarantor_phone, guarantor_address, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customer_code, full_name, phone, alternate_phone || null, email || null, address || null,
      city || null, pincode || null, aadhaar_number || null, pan_number || null, photo_url || null,
      nominee_name || null, nominee_phone || null, nominee_relation || null,
      guarantor_name || null, guarantor_phone || null, guarantor_address || null,
      notes || null, req.user?.id || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: { id: result.insertId, customer_code, full_name },
    });
  } catch (error) {
    logger.error('Failed to create customer', error);
    res.status(500).json({ success: false, message: 'Failed to register customer' });
  }
}

/**
 * ============================================================================
 * 4. LOAN ORIGINATION & ACCOUNTS MANAGEMENT
 * ============================================================================
 */
export async function getLoans(req, res) {
  try {
    const { status, customer_id, agent_id, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT l.*, c.full_name as customer_name, c.phone as customer_phone, c.customer_code,
             s.scheme_name, s.scheme_code, u.full_name as agent_name
      FROM interest_loans l
      JOIN interest_customers c ON l.customer_id = c.id
      JOIN interest_schemes s ON l.scheme_id = s.id
      LEFT JOIN users u ON l.assigned_agent_id = u.id
    `;
    const whereConditions = [];
    const params = [];

    if (status && status !== 'ALL') {
      whereConditions.push('l.loan_status = ?');
      params.push(status);
    }
    if (customer_id) {
      whereConditions.push('l.customer_id = ?');
      params.push(customer_id);
    }
    if (agent_id) {
      whereConditions.push('l.assigned_agent_id = ?');
      params.push(agent_id);
    }
    if (search && search.trim()) {
      whereConditions.push('(l.loan_account_number LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY l.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const [loans] = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM interest_loans l
      JOIN interest_customers c ON l.customer_id = c.id
    `;
    const countParams = [];
    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
      countParams.push(...params.slice(0, -2));
    }
    const [[countResult]] = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: loans,
      pagination: {
        totalItems: countResult.total,
        currentPage: parseInt(page, 10),
        pageSize: parseInt(limit, 10),
      },
    });
  } catch (error) {
    logger.error('Failed to get loans', error);
    res.status(500).json({ success: false, message: 'Failed to load loans' });
  }
}

export async function getLoanById(req, res) {
  try {
    const { id } = req.params;
    const [[loan]] = await pool.query(`
      SELECT l.*, c.full_name as customer_name, c.phone as customer_phone, c.customer_code,
             c.address as customer_address, s.scheme_name, s.scheme_code, u.full_name as agent_name
      FROM interest_loans l
      JOIN interest_customers c ON l.customer_id = c.id
      JOIN interest_schemes s ON l.scheme_id = s.id
      LEFT JOIN users u ON l.assigned_agent_id = u.id
      WHERE l.id = ?
    `, [id]);

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan account not found' });
    }

    const [schedules] = await pool.query(`
      SELECT * FROM interest_loan_schedules
      WHERE loan_id = ?
      ORDER BY installment_number ASC
    `, [id]);

    const [collections] = await pool.query(`
      SELECT c.*, u.full_name as collected_by_name
      FROM interest_collections c
      LEFT JOIN users u ON c.collected_by_user_id = u.id
      WHERE c.loan_id = ?
      ORDER BY c.id DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        loan,
        schedules,
        collections,
      },
    });
  } catch (error) {
    logger.error('Failed to get loan details', error);
    res.status(500).json({ success: false, message: 'Failed to load loan account details' });
  }
}

export async function createLoan(req, res) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      customer_id,
      scheme_id,
      principal_amount,
      interest_rate,
      rate_period,
      calculation_method,
      repayment_frequency,
      tenure_periods,
      disbursement_date = getTodayIST(),
      first_due_date,
      assigned_agent_id,
      purpose,
      notes,
    } = req.body;

    if (!customer_id || !scheme_id || !principal_amount || !tenure_periods) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Customer, Scheme, Principal, and Tenure are required' });
    }

    // Verify Scheme
    const [[scheme]] = await connection.query('SELECT * FROM interest_schemes WHERE id = ?', [scheme_id]);
    if (!scheme) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Selected scheme does not exist' });
    }

    // Use scheme defaults if overrides not passed
    const effCalcMethod = calculation_method || scheme.calculation_method;
    const effRate = interest_rate !== undefined ? parseFloat(interest_rate) : parseFloat(scheme.interest_rate);
    const effRatePeriod = rate_period || scheme.rate_period;
    const effFrequency = repayment_frequency || scheme.repayment_frequency;
    const effTenure = parseInt(tenure_periods, 10);
    const effPrincipal = roundMoney(principal_amount);

    // Calculate Amortization Schedule
    const calcResult = calculateLoanSchedule({
      principal: effPrincipal,
      interest_rate: effRate,
      rate_period: effRatePeriod,
      calculation_method: effCalcMethod,
      repayment_frequency: effFrequency,
      tenure_periods: effTenure,
      start_date: disbursement_date,
      first_due_date,
    });

    // Auto-generate Loan Account Number: LN-YYYY-XXXX
    const year = new Date().getFullYear();
    const [[loanCount]] = await connection.query('SELECT COUNT(*) as cnt FROM interest_loans');
    const loan_account_number = `LN-${year}-${String(loanCount.cnt + 1).padStart(4, '0')}`;

    // Insert Loan
    const [loanResult] = await connection.query(`
      INSERT INTO interest_loans (
        loan_account_number, customer_id, scheme_id, principal_amount, calculation_method,
        interest_rate, rate_period, repayment_frequency, tenure_periods, installment_amount,
        total_interest_expected, total_payable, disbursement_date, first_due_date, maturity_date,
        principal_outstanding, interest_outstanding, assigned_agent_id, purpose, notes,
        created_by, approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      loan_account_number, customer_id, scheme_id, effPrincipal, effCalcMethod,
      effRate, effRatePeriod, effFrequency, effTenure, calcResult.installment_amount,
      calcResult.total_interest_expected, calcResult.total_payable, disbursement_date,
      calcResult.schedules[0]?.due_date || disbursement_date, calcResult.maturity_date,
      effPrincipal, calcResult.total_interest_expected, assigned_agent_id || null,
      purpose || null, notes || null, req.user?.id || null, req.user?.id || null
    ]);

    const loanId = loanResult.insertId;

    // Batch Insert Repayment Schedules
    if (calcResult.schedules.length > 0) {
      const scheduleValues = calcResult.schedules.map((s) => [
        loanId,
        s.installment_number,
        s.due_date,
        s.principal_due,
        s.interest_due,
        s.penalty_due,
        s.total_due,
        0.00,
        0.00,
        0.00,
        0.00,
        'PENDING',
      ]);

      await connection.query(`
        INSERT INTO interest_loan_schedules (
          loan_id, installment_number, due_date, principal_due, interest_due, penalty_due,
          total_due, principal_paid, interest_paid, penalty_paid, total_paid, status
        ) VALUES ?
      `, [scheduleValues]);
    }

    // Post Opening Debit Entry in Customer Ledger
    await connection.query(`
      INSERT INTO interest_customer_ledgers (
        customer_id, loan_id, transaction_date, entry_type, debit_amount, credit_amount,
        principal_balance, interest_balance, net_balance, description, reference_no
      ) VALUES (?, ?, ?, 'DISBURSEMENT', ?, 0.00, ?, ?, ?, ?, ?)
    `, [
      customer_id, loanId, disbursement_date, effPrincipal, effPrincipal,
      calcResult.total_interest_expected, calcResult.total_payable,
      `Loan Disbursed · ${loan_account_number} (${scheme.scheme_name})`,
      loan_account_number
    ]);

    // If agent assigned, create assignment record
    if (assigned_agent_id) {
      await connection.query(`
        INSERT INTO interest_agent_assignments (
          agent_id, customer_id, loan_id, assigned_by, assignment_date, route_name
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        assigned_agent_id, customer_id, loanId, req.user?.id || 1,
        disbursement_date, 'Default Route'
      ]);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Loan disbursed successfully',
      data: {
        id: loanId,
        loan_account_number,
        principal_amount: effPrincipal,
        installment_amount: calcResult.installment_amount,
        total_payable: calcResult.total_payable,
      },
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Failed to create loan', error);
    res.status(500).json({ success: false, message: 'Failed to disburse loan' });
  } finally {
    connection.release();
  }
}

/**
 * ============================================================================
 * 5. INTELLIGENT COLLECTION MANAGEMENT (Agent & Admin Collection)
 * ============================================================================
 */
export async function getAgentAssignedCustomers(req, res) {
  try {
    const agentId = req.user?.id;
    const todayStr = getTodayIST();

    const [rows] = await pool.query(`
      SELECT l.*, c.full_name as customer_name, c.phone as customer_phone, c.address as customer_address,
             c.customer_code, c.photo_url as customer_photo, s.scheme_name, s.scheme_code,
             (
               SELECT COALESCE(SUM(total_due - total_paid), 0)
               FROM interest_loan_schedules
               WHERE loan_id = l.id AND due_date <= ? AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
             ) as current_due_amount,
             (
               SELECT COALESCE(SUM(total_due - total_paid), 0)
               FROM interest_loan_schedules
               WHERE loan_id = l.id AND due_date < ? AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
             ) as overdue_amount,
             (
               SELECT COALESCE(SUM(total_due - total_paid), 0)
               FROM interest_loan_schedules
               WHERE loan_id = l.id AND due_date = ? AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
             ) as today_due_amount,
             (
               SELECT due_date
               FROM interest_loan_schedules
               WHERE loan_id = l.id AND due_date <= ? AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
               ORDER BY due_date ASC LIMIT 1
             ) as oldest_pending_date,
             (
               SELECT MAX(due_date)
               FROM interest_loan_schedules
               WHERE loan_id = l.id AND status = 'PAID'
             ) as paid_until_date,
             (
               SELECT MIN(due_date)
               FROM interest_loan_schedules
               WHERE loan_id = l.id AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
             ) as next_due_date,
             (
               SELECT COUNT(*)
               FROM interest_loan_schedules
               WHERE loan_id = l.id AND status = 'PAID'
             ) as completed_installments,
             (
               SELECT COUNT(*)
               FROM interest_loan_schedules
               WHERE loan_id = l.id
             ) as total_installments,
             (
               SELECT COALESCE(SUM(total_due - total_paid), 0)
               FROM interest_loan_schedules ils2
               JOIN interest_loans il2 ON ils2.loan_id = il2.id
               WHERE il2.customer_id = l.customer_id AND il2.loan_status = 'ACTIVE'
             ) as customer_total_pending_all_loans,
             (
               SELECT COUNT(*)
               FROM interest_loans il3
               WHERE il3.customer_id = l.customer_id AND il3.loan_status = 'ACTIVE'
             ) as customer_total_loans_count
      FROM interest_loans l
      JOIN interest_customers c ON l.customer_id = c.id
      JOIN interest_schemes s ON l.scheme_id = s.id
      WHERE (l.assigned_agent_id = ? OR l.assigned_agent_id IS NULL OR ? IN (
        SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN') AND id = ?
      )) AND l.loan_status = 'ACTIVE'
      ORDER BY current_due_amount DESC, l.id DESC
    `, [todayStr, todayStr, todayStr, todayStr, agentId, agentId, agentId]);

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Failed to get agent assigned customers', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assigned collection routes' });
  }
}

export async function recordCollection(req, res) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      loan_id,
      amount,
      payment_method = 'CASH',
      transaction_reference,
      collection_date = getTodayIST(),
      notes,
      gps_coordinates,
    } = req.body;

    const paymentAmt = roundMoney(amount);
    if (!loan_id || paymentAmt <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Valid loan ID and positive payment amount required' });
    }

    // Fetch Loan & Scheme
    const [[loan]] = await connection.query(`
      SELECT l.*, s.allocation_priority, c.full_name as customer_name, c.phone as customer_phone,
             c.customer_code, s.scheme_name
      FROM interest_loans l
      JOIN interest_schemes s ON l.scheme_id = s.id
      JOIN interest_customers c ON l.customer_id = c.id
      WHERE l.id = ?
    `, [loan_id]);

    if (!loan) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Loan account not found' });
    }

    // Fetch pending schedules in chronological order
    const [pendingSchedules] = await connection.query(`
      SELECT * FROM interest_loan_schedules
      WHERE loan_id = ? AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
      ORDER BY due_date ASC, installment_number ASC
    `, [loan_id]);

    // Chronological schedule payment allocation
    let remAmt = paymentAmt;
    let allocPrincipal = 0;
    let allocInterest = 0;
    let allocPenalty = 0;
    let allocExcess = 0;

    for (const sched of pendingSchedules) {
      if (remAmt <= 0) break;

      const penNeeded = Math.max(0, roundMoney(Number(sched.penalty_due || 0) - Number(sched.penalty_paid || 0)));
      const iNeeded = Math.max(0, roundMoney(Number(sched.interest_due || 0) - Number(sched.interest_paid || 0)));
      const pNeeded = Math.max(0, roundMoney(Number(sched.principal_due || 0) - Number(sched.principal_paid || 0)));

      // 1. Pay penalty on this schedule
      const penPay = Math.min(remAmt, penNeeded);
      remAmt = roundMoney(remAmt - penPay);
      allocPenalty = roundMoney(allocPenalty + penPay);

      // 2. Pay interest on this schedule
      const iPay = Math.min(remAmt, iNeeded);
      remAmt = roundMoney(remAmt - iPay);
      allocInterest = roundMoney(allocInterest + iPay);

      // 3. Pay principal on this schedule
      const pPay = Math.min(remAmt, pNeeded);
      remAmt = roundMoney(remAmt - pPay);
      allocPrincipal = roundMoney(allocPrincipal + pPay);

      const newPPaid = roundMoney(Number(sched.principal_paid || 0) + pPay);
      const newIPaid = roundMoney(Number(sched.interest_paid || 0) + iPay);
      const newPenPaid = roundMoney(Number(sched.penalty_paid || 0) + penPay);
      const newTotPaid = roundMoney(newPPaid + newIPaid + newPenPaid);

      const isFullyPaid = newTotPaid >= Number(sched.total_due || 0);

      await connection.query(`
        UPDATE interest_loan_schedules
        SET principal_paid = ?, interest_paid = ?, penalty_paid = ?, total_paid = ?,
            status = ?, paid_date = ?
        WHERE id = ?
      `, [
        newPPaid, newIPaid, newPenPaid, newTotPaid,
        isFullyPaid ? 'PAID' : 'PARTIAL',
        collection_date,
        sched.id
      ]);
    }

    // Any remaining amount after covering pending schedules reduces principal directly as excess
    if (remAmt > 0) {
      allocPrincipal = roundMoney(allocPrincipal + remAmt);
      allocExcess = remAmt;
    }

    // Auto-generate unique receipt number: RCP-FL-YYYY-XXXXX
    const year = new Date().getFullYear();
    const [[colCount]] = await connection.query('SELECT COUNT(*) as cnt FROM interest_collections');
    const receipt_number = `RCP-FL-${year}-${String(colCount.cnt + 1).padStart(5, '0')}`;

    // Insert into interest_collections
    const [colResult] = await connection.query(`
      INSERT INTO interest_collections (
        receipt_number, loan_id, customer_id, schedule_id, collected_by_user_id,
        amount_collected, payment_method, transaction_reference, collection_date,
        principal_component, interest_component, penalty_component, excess_component,
        notes, gps_coordinates, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')
    `, [
      receipt_number, loan_id, loan.customer_id, pendingSchedules[0]?.id || null,
      req.user?.id || 1, paymentAmt, payment_method, transaction_reference || null,
      collection_date, allocPrincipal, allocInterest,
      allocPenalty, allocExcess, notes || null,
      gps_coordinates || null
    ]);

    const collectionId = colResult.insertId;

    // Recalculate Loan Balances safely from updated schedules
    const [[schedTotals]] = await connection.query(`
      SELECT 
        COALESCE(SUM(principal_paid), 0) as tot_p_paid,
        COALESCE(SUM(interest_paid), 0) as tot_i_paid,
        COALESCE(SUM(penalty_paid), 0) as tot_pen_paid
      FROM interest_loan_schedules
      WHERE loan_id = ?
    `, [loan_id]);

    const totalPPaid = roundMoney(Number(schedTotals.tot_p_paid || 0) + allocExcess);
    const totalIPaid = roundMoney(Number(schedTotals.tot_i_paid || 0));
    const totalPenPaid = roundMoney(Number(schedTotals.tot_pen_paid || 0));

    const principalOutstanding = Math.max(0, roundMoney(Number(loan.principal_amount || 0) - totalPPaid));
    const interestOutstanding = Math.max(0, roundMoney(Number(loan.total_interest_expected || 0) - totalIPaid));
    const isLoanClosed = principalOutstanding <= 0 && interestOutstanding <= 0;

    await connection.query(`
      UPDATE interest_loans
      SET total_principal_paid = ?, total_interest_paid = ?, total_penalties_paid = ?,
          principal_outstanding = ?, interest_outstanding = ?,
          loan_status = ?
      WHERE id = ?
    `, [
      totalPPaid, totalIPaid, totalPenPaid,
      principalOutstanding, interestOutstanding,
      isLoanClosed ? 'CLOSED' : loan.loan_status,
      loan_id
    ]);

    // Post Credit Entry in Customer Ledger
    const endingNetBalance = roundMoney(principalOutstanding + interestOutstanding);
    await connection.query(`
      INSERT INTO interest_customer_ledgers (
        customer_id, loan_id, collection_id, transaction_date, entry_type, debit_amount,
        credit_amount, principal_balance, interest_balance, net_balance, description, reference_no
      ) VALUES (?, ?, ?, ?, 'COLLECTION', 0.00, ?, ?, ?, ?, ?, ?)
    `, [
      loan.customer_id, loan_id, collectionId, collection_date, paymentAmt,
      principalOutstanding, interestOutstanding,
      endingNetBalance,
      `Payment Received · ${receipt_number} (${payment_method}) [P: ₹${allocPrincipal.toLocaleString('en-IN')}, I: ₹${allocInterest.toLocaleString('en-IN')}]`,
      receipt_number
    ]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Collection recorded successfully',
      receipt: {
        id: collectionId,
        receipt_number,
        loan_id,
        loan_account_number: loan.loan_account_number,
        customer_name: loan.customer_name,
        customer_phone: loan.customer_phone,
        amount_collected: paymentAmt,
        payment_method,
        collection_date,
        allocation,
        remaining_principal: newPrincipalOutstanding,
        is_closed: isLoanClosed,
      },
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Failed to record collection', error);
    res.status(500).json({ success: false, message: 'Failed to record collection' });
  } finally {
    connection.release();
  }
}

/**
 * ============================================================================
 * 6. REPORTS & LEDGERS
 * ============================================================================
 */
export async function getCollectionReport(req, res) {
  try {
    const { from_date, to_date, payment_method, agent_id } = req.query;
    let query = `
      SELECT c.*, cust.full_name as customer_name, cust.phone as customer_phone,
             l.loan_account_number, s.scheme_name, u.full_name as agent_name
      FROM interest_collections c
      JOIN interest_customers cust ON c.customer_id = cust.id
      JOIN interest_loans l ON c.loan_id = l.id
      JOIN interest_schemes s ON l.scheme_id = s.id
      LEFT JOIN users u ON c.collected_by_user_id = u.id
      WHERE c.status = 'CONFIRMED'
    `;
    const params = [];

    if (from_date) {
      query += ' AND c.collection_date >= ?';
      params.push(from_date);
    }
    if (to_date) {
      query += ' AND c.collection_date <= ?';
      params.push(to_date);
    }
    if (payment_method && payment_method !== 'ALL') {
      query += ' AND c.payment_method = ?';
      params.push(payment_method);
    }
    if (agent_id) {
      query += ' AND c.collected_by_user_id = ?';
      params.push(agent_id);
    }

    query += ' ORDER BY c.collection_date DESC, c.id DESC LIMIT 200';

    const [collections] = await pool.query(query, params);

    const totalCollected = collections.reduce((sum, r) => sum + Number(r.amount_collected || 0), 0);
    const totalPrincipal = collections.reduce((sum, r) => sum + Number(r.principal_component || 0), 0);
    const totalInterest = collections.reduce((sum, r) => sum + Number(r.interest_component || 0), 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalCollected,
          totalPrincipal,
          totalInterest,
          count: collections.length,
        },
        collections,
      },
    });
  } catch (error) {
    logger.error('Failed to get collection report', error);
    res.status(500).json({ success: false, message: 'Failed to fetch collection report' });
  }
}

/**
 * ============================================================================
 * 7. AGENT SUMMARY & SHIFT METRICS
 * ============================================================================
 */
export async function getAgentSummary(req, res) {
  try {
    const agentId = req.user?.id;
    const todayStr = getTodayIST();

    // Today's collections for this agent
    const [todayRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(amount_collected), 0) as today_total,
        COALESCE(SUM(CASE WHEN UPPER(TRIM(payment_method)) = 'CASH' THEN amount_collected ELSE 0 END), 0) as today_cash,
        COALESCE(SUM(CASE WHEN UPPER(TRIM(payment_method)) = 'UPI' THEN amount_collected ELSE 0 END), 0) as today_upi,
        COUNT(id) as today_count
      FROM interest_collections
      WHERE collected_by_user_id = ? AND collection_date = ? AND status = 'CONFIRMED'
    `, [agentId, todayStr]);

    // Recent 50 collections by this agent
    const [recentCollections] = await pool.query(`
      SELECT c.*, cust.full_name as customer_name, cust.phone as customer_phone,
             l.loan_account_number, s.scheme_name
      FROM interest_collections c
      JOIN interest_customers cust ON c.customer_id = cust.id
      JOIN interest_loans l ON c.loan_id = l.id
      JOIN interest_schemes s ON l.scheme_id = s.id
      WHERE c.collected_by_user_id = ? AND c.status = 'CONFIRMED'
      ORDER BY c.collection_date DESC, c.id DESC
      LIMIT 50
    `, [agentId]);

    res.json({
      success: true,
      data: {
        summary: todayRows[0] || { today_total: 0, today_cash: 0, today_upi: 0, today_count: 0 },
        recentCollections,
      },
    });
  } catch (error) {
    logger.error('Failed to get agent summary', error);
    res.status(500).json({ success: false, message: 'Failed to load agent summary' });
  }
}

/**
 * ============================================================================
 * 8. AUTO-REPAIR MISSING LOAN SCHEDULES & BALANCES
 * ============================================================================
 */
export async function repairMissingLoanSchedules() {
  try {
    const [loansWithoutSchedules] = await pool.query(`
      SELECT l.*, s.calculation_method as scheme_calc_method, s.interest_rate as scheme_interest_rate,
             s.rate_period as scheme_rate_period, s.repayment_frequency as scheme_frequency
      FROM interest_loans l
      LEFT JOIN interest_schemes s ON l.scheme_id = s.id
      WHERE l.loan_status = 'ACTIVE' 
        AND (SELECT COUNT(*) FROM interest_loan_schedules WHERE loan_id = l.id) = 0
    `);

    if (!loansWithoutSchedules || loansWithoutSchedules.length === 0) {
      return;
    }

    logger.info(`🔧 Found ${loansWithoutSchedules.length} active loan(s) without schedules. Auto-generating schedules...`);

    for (const loan of loansWithoutSchedules) {
      const effTenure = parseInt(loan.tenure_periods, 10) || 100;
      const effPrincipal = roundMoney(loan.principal_amount);
      const effRate = loan.interest_rate !== undefined ? parseFloat(loan.interest_rate) : parseFloat(loan.scheme_interest_rate || 2);
      const effRatePeriod = loan.rate_period || loan.scheme_rate_period || 'MONTHLY';
      const effFrequency = loan.repayment_frequency || loan.scheme_frequency || 'DAILY';
      const effCalcMethod = loan.calculation_method || loan.scheme_calc_method || 'FLAT';
      const disbursementDate = loan.disbursement_date instanceof Date
        ? loan.disbursement_date.toISOString().slice(0, 10)
        : String(loan.disbursement_date).slice(0, 10);

      const calcResult = calculateLoanSchedule({
        principal: effPrincipal,
        interest_rate: effRate,
        rate_period: effRatePeriod,
        calculation_method: effCalcMethod,
        repayment_frequency: effFrequency,
        tenure_periods: effTenure,
        start_date: disbursementDate,
        first_due_date: disbursementDate,
      });

      if (calcResult.schedules.length > 0) {
        const scheduleValues = calcResult.schedules.map((s) => [
          loan.id,
          s.installment_number,
          s.due_date,
          s.principal_due,
          s.interest_due,
          s.penalty_due,
          s.total_due,
          0.00,
          0.00,
          0.00,
          0.00,
          'PENDING',
        ]);

        await pool.query(`
          INSERT INTO interest_loan_schedules (
            loan_id, installment_number, due_date, principal_due, interest_due, penalty_due,
            total_due, principal_paid, interest_paid, penalty_paid, total_paid, status
          ) VALUES ?
        `, [scheduleValues]);

        // If there are existing confirmed collections, allocate them chronologically
        const [collections] = await pool.query(`
          SELECT * FROM interest_collections
          WHERE loan_id = ? AND status = 'CONFIRMED'
          ORDER BY collection_date ASC, id ASC
        `, [loan.id]);

        let totalCollectedAll = 0;
        for (const col of collections) {
          totalCollectedAll += roundMoney(col.amount_collected);
        }

        if (totalCollectedAll > 0) {
          const [schedules] = await pool.query(`
            SELECT * FROM interest_loan_schedules
            WHERE loan_id = ?
            ORDER BY due_date ASC, installment_number ASC
          `, [loan.id]);

          let rem = totalCollectedAll;
          let totPPaid = 0;
          let totIPaid = 0;

          for (const sch of schedules) {
            if (rem <= 0) break;
            const needed = roundMoney(Number(sch.total_due || 0));
            const pay = Math.min(rem, needed);
            rem = roundMoney(rem - pay);

            const pDue = Number(sch.principal_due || 0);
            const iDue = Number(sch.interest_due || 0);
            const pPay = Math.min(pay, pDue);
            const iPay = Math.min(roundMoney(pay - pPay), iDue);

            totPPaid = roundMoney(totPPaid + pPay);
            totIPaid = roundMoney(totIPaid + iPay);

            await pool.query(`
              UPDATE interest_loan_schedules
              SET principal_paid = ?, interest_paid = ?, total_paid = ?,
                  status = ?, paid_date = ?
              WHERE id = ?
            `, [
              pPay, iPay, pay,
              pay >= needed ? 'PAID' : 'PARTIAL',
              collections[collections.length - 1]?.collection_date || getTodayIST(),
              sch.id
            ]);
          }

          if (rem > 0) {
            totPPaid = roundMoney(totPPaid + rem);
          }

          const newPOut = Math.max(0, roundMoney(effPrincipal - totPPaid));
          const newIOut = Math.max(0, roundMoney(Number(calcResult.total_interest_expected || 0) - totIPaid));

          await pool.query(`
            UPDATE interest_loans
            SET total_principal_paid = ?, total_interest_paid = ?,
                principal_outstanding = ?, interest_outstanding = ?,
                installment_amount = ?, total_interest_expected = ?, total_payable = ?
            WHERE id = ?
          `, [
            totPPaid, totIPaid, newPOut, newIOut,
            calcResult.installment_amount, calcResult.total_interest_expected, calcResult.total_payable,
            loan.id
          ]);
        }
      }
    }
    logger.info('✅ Missing loan schedules successfully repaired and reconciled.');
  } catch (err) {
    logger.error('Failed to repair missing loan schedules:', err);
  }
}

