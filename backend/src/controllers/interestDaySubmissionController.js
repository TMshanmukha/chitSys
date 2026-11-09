import pool from '../config/db.js';
import { logger } from '../utils/logger.js';
import { broadcastSync } from '../services/realtimeService.js';
import { createNotification } from './notificationController.js';

let tableEnsured = false;
export async function ensureInterestDaySubmissionsTable() {
  if (tableEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interest_cash_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent_id INT NOT NULL,
        submission_date DATE NOT NULL,
        total_collected DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        cash_collected DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        upi_collected DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        total_receipts INT NOT NULL DEFAULT 0,
        total_borrowers_visited INT NOT NULL DEFAULT 0,
        total_borrowers_pending INT NOT NULL DEFAULT 0,
        collections_breakdown_json LONGTEXT NULL,
        verified_cash DECIMAL(14,2) NULL,
        verified_upi DECIMAL(14,2) NULL,
        status ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED') DEFAULT 'PENDING_APPROVAL',
        agent_notes TEXT NULL,
        admin_notes TEXT NULL,
        approved_by INT NULL,
        approved_at TIMESTAMP NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_int_sub_agent_date (agent_id, submission_date),
        INDEX idx_int_sub_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure supplemental columns exist safely
    const columns = [
      { name: 'total_borrowers_visited', type: 'INT NOT NULL DEFAULT 0' },
      { name: 'total_borrowers_pending', type: 'INT NOT NULL DEFAULT 0' },
      { name: 'collections_breakdown_json', type: 'LONGTEXT NULL' },
      { name: 'submitted_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    ];

    for (const col of columns) {
      try {
        await pool.query(`ALTER TABLE interest_cash_submissions ADD COLUMN ${col.name} ${col.type}`);
      } catch (_) {
        // column already exists
      }
    }

    tableEnsured = true;
  } catch (err) {
    logger.error('Failed to ensure interest_cash_submissions table', err);
  }
}

/**
 * Helper: Aggregate day work numbers for an agent
 */
export async function getInterestAgentDayData(agentId, workDate) {
  await ensureInterestDaySubmissionsTable();

  // 1. Fetch collections made by this agent on workDate
  const [collections] = await pool.query(
    `SELECT c.id, c.receipt_number, c.loan_id, c.customer_id, c.amount_collected,
            c.payment_method, c.collection_date, c.created_at, c.notes,
            cust.full_name as customer_name, cust.phone as customer_phone,
            l.loan_account_number, l.principal_amount, l.installment_amount
     FROM interest_collections c
     JOIN interest_customers cust ON c.customer_id = cust.id
     JOIN loans l ON c.loan_id = l.id
     WHERE c.collected_by_user_id = ?
       AND (c.collection_date = ? OR DATE(c.created_at) = ?)
       AND c.status = 'CONFIRMED'
     ORDER BY c.created_at ASC, c.id ASC`,
    [agentId, workDate, workDate]
  );

  let cashCollected = 0;
  let upiCollected = 0;
  let totalCollected = 0;

  for (const c of collections) {
    const amt = parseFloat(c.amount_collected || 0);
    totalCollected += amt;
    const method = (c.payment_method || '').toUpperCase().trim();
    if (method === 'CASH') {
      cashCollected += amt;
    } else {
      upiCollected += amt;
    }
  }

  // 2. Fetch total assigned active loans for this agent
  const [assignedLoans] = await pool.query(
    `SELECT DISTINCT iaa.loan_id, iaa.customer_id
     FROM interest_agent_assignments iaa
     JOIN loans l ON iaa.loan_id = l.id
     WHERE iaa.agent_id = ? AND iaa.status = 'ACTIVE' AND l.status = 'ACTIVE'`,
    [agentId]
  );

  const visitedCustomerIds = new Set(collections.map((c) => c.customer_id));
  const totalVisited = visitedCustomerIds.size;
  const totalAssigned = assignedLoans.length;
  const totalPending = Math.max(0, totalAssigned - totalVisited);

  return {
    cashCollected,
    upiCollected,
    totalCollected,
    totalReceipts: collections.length,
    totalBorrowersVisited: totalVisited,
    totalBorrowersPending: totalPending,
    collections,
  };
}

/**
 * 1. GET /api/interest/day-preview
 * Agent previews their day collections and current submission status
 */
export async function previewInterestDayWork(req, res) {
  try {
    await ensureInterestDaySubmissionsTable();
    const agentId = req.user.id;
    const workDate = (req.query.date || new Date().toISOString().slice(0, 10)).slice(0, 10);

    const dayData = await getInterestAgentDayData(agentId, workDate);

    // Check existing submission
    const [[submission]] = await pool.query(
      `SELECT sub.*, approver.full_name as approved_by_name
       FROM interest_cash_submissions sub
       LEFT JOIN users approver ON sub.approved_by = approver.id
       WHERE sub.agent_id = ? AND DATE(sub.submission_date) = ?
       ORDER BY sub.id DESC LIMIT 1`,
      [agentId, workDate]
    );

    let parsedBreakdown = null;
    if (submission?.collections_breakdown_json) {
      try {
        parsedBreakdown = JSON.parse(submission.collections_breakdown_json);
      } catch (_) {}
    }

    res.json({
      success: true,
      data: {
        workDate,
        isSubmitted: Boolean(submission),
        submission: submission
          ? {
              ...submission,
              total_collected: parseFloat(submission.total_collected || 0),
              cash_collected: parseFloat(submission.cash_collected || 0),
              upi_collected: parseFloat(submission.upi_collected || 0),
              verified_cash: submission.verified_cash ? parseFloat(submission.verified_cash) : null,
              verified_upi: submission.verified_upi ? parseFloat(submission.verified_upi) : null,
              details: parsedBreakdown,
            }
          : null,
        ...dayData,
      },
    });
  } catch (error) {
    logger.error('Failed to preview FinLend day work', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to preview day work' });
  }
}

/**
 * 2. POST /api/interest/day-submit
 * Agent submits their day collections to Admin for physical cash counting & approval
 */
export async function submitInterestDayWork(req, res) {
  try {
    await ensureInterestDaySubmissionsTable();
    const agentId = req.user.id;
    const workDate = (req.body.work_date || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const agentNotes = req.body.agent_notes ? req.body.agent_notes.trim() : '';

    const dayData = await getInterestAgentDayData(agentId, workDate);

    // Check if already submitted today
    const [[existing]] = await pool.query(
      `SELECT id, status FROM interest_cash_submissions WHERE agent_id = ? AND DATE(submission_date) = ? LIMIT 1`,
      [agentId, workDate]
    );

    let submissionId;

    if (existing) {
      if (existing.status === 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Your day work for this date has already been approved and closed by Admin.',
        });
      }

      await pool.query(
        `UPDATE interest_cash_submissions
         SET total_collected = ?,
             cash_collected = ?,
             upi_collected = ?,
             total_receipts = ?,
             total_borrowers_visited = ?,
             total_borrowers_pending = ?,
             collections_breakdown_json = ?,
             agent_notes = ?,
             status = 'PENDING_APPROVAL',
             submitted_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          dayData.totalCollected,
          dayData.cashCollected,
          dayData.upiCollected,
          dayData.totalReceipts,
          dayData.totalBorrowersVisited,
          dayData.totalBorrowersPending,
          JSON.stringify(dayData.collections),
          agentNotes,
          existing.id,
        ]
      );
      submissionId = existing.id;
    } else {
      const [insertResult] = await pool.query(
        `INSERT INTO interest_cash_submissions
           (agent_id, submission_date, total_collected, cash_collected, upi_collected,
            total_receipts, total_borrowers_visited, total_borrowers_pending,
            collections_breakdown_json, agent_notes, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', CURRENT_TIMESTAMP)`,
        [
          agentId,
          workDate,
          dayData.totalCollected,
          dayData.cashCollected,
          dayData.upiCollected,
          dayData.totalReceipts,
          dayData.totalBorrowersVisited,
          dayData.totalBorrowersPending,
          JSON.stringify(dayData.collections),
          agentNotes,
        ]
      );
      submissionId = insertResult.insertId;
    }

    // Broadcast realtime event
    broadcastSync({
      business: 'interest',
      entity: 'day-submissions',
      action: 'SUBMIT',
      data: { id: submissionId, agent_id: agentId, work_date: workDate },
    });

    // Notify all active Owners/Admins
    const [admins] = await pool.query(
      `SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN') AND is_active = 1`
    );
    for (const adm of admins) {
      await createNotification({
        userId: adm.id,
        title: 'FinLend Day Work Submitted',
        message: `${req.user.full_name} submitted day collections for ${workDate}. Cash to handover: ₹${dayData.cashCollected.toLocaleString('en-IN')}.`,
        type: 'DAY_SUBMISSION',
        referenceId: submissionId,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Day work submitted successfully. Please handover cash to Admin for approval.',
      data: { id: submissionId, status: 'PENDING_APPROVAL' },
    });
  } catch (error) {
    logger.error('Failed to submit FinLend day work', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to submit day work' });
  }
}

/**
 * 3. GET /api/interest/day-submissions/my
 * Agent views their history of day submissions
 */
export async function getMyInterestDaySubmissions(req, res) {
  try {
    await ensureInterestDaySubmissionsTable();
    const agentId = req.user.id;
    const { date } = req.query;

    let query = `
      SELECT sub.*, approver.full_name as approved_by_name
      FROM interest_cash_submissions sub
      LEFT JOIN users approver ON sub.approved_by = approver.id
      WHERE sub.agent_id = ?
    `;
    const params = [agentId];

    if (date) {
      query += ` AND sub.submission_date = ?`;
      params.push(date);
    }

    query += ` ORDER BY sub.submission_date DESC, sub.id DESC`;

    const [rows] = await pool.query(query, params);

    const formatted = rows.map((r) => {
      let breakdown = null;
      try {
        if (r.collections_breakdown_json) breakdown = JSON.parse(r.collections_breakdown_json);
      } catch (_) {}

      return {
        ...r,
        total_collected: parseFloat(r.total_collected || 0),
        cash_collected: parseFloat(r.cash_collected || 0),
        upi_collected: parseFloat(r.upi_collected || 0),
        verified_cash: r.verified_cash ? parseFloat(r.verified_cash) : null,
        verified_upi: r.verified_upi ? parseFloat(r.verified_upi) : null,
        details: breakdown,
      };
    });

    res.json({ success: true, data: formatted });
  } catch (error) {
    logger.error('Failed to fetch agent day submissions', error);
    res.status(500).json({ success: false, message: 'Failed to fetch day submissions' });
  }
}

/**
 * 4. GET /api/interest/day-submissions
 * Admin lists all agent day submissions with status filters and summary metrics
 */
export async function listInterestDaySubmissionsForAdmin(req, res) {
  try {
    await ensureInterestDaySubmissionsTable();
    const { status, agentId, date, startDate, endDate } = req.query;

    let query = `
      SELECT sub.*,
             agent.full_name as agent_name, agent.username as agent_username, agent.phone as agent_phone,
             approver.full_name as approved_by_name, approver.username as approved_by_username
      FROM interest_cash_submissions sub
      JOIN users agent ON sub.agent_id = agent.id
      LEFT JOIN users approver ON sub.approved_by = approver.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND sub.status = ?`;
      params.push(status);
    }

    if (agentId && agentId !== 'ALL') {
      query += ` AND sub.agent_id = ?`;
      params.push(agentId);
    }

    if (date) {
      query += ` AND sub.submission_date = ?`;
      params.push(date);
    }

    if (startDate) {
      query += ` AND sub.submission_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND sub.submission_date <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY (sub.status = 'PENDING_APPROVAL') DESC, sub.submission_date DESC, sub.id DESC`;

    const [rows] = await pool.query(query, params);

    // Compute Summary Stats
    const [[stats]] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 END) as pending_count,
        COALESCE(SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN cash_collected ELSE 0 END), 0) as pending_cash,
        COUNT(CASE WHEN status = 'APPROVED' AND submission_date = CURRENT_DATE() THEN 1 END) as approved_today_count,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' AND submission_date = CURRENT_DATE() THEN verified_cash ELSE 0 END), 0) as approved_today_cash
      FROM interest_cash_submissions
    `);

    const formatted = rows.map((r) => {
      let breakdown = null;
      try {
        if (r.collections_breakdown_json) breakdown = JSON.parse(r.collections_breakdown_json);
      } catch (_) {}

      return {
        ...r,
        total_collected: parseFloat(r.total_collected || 0),
        cash_collected: parseFloat(r.cash_collected || 0),
        upi_collected: parseFloat(r.upi_collected || 0),
        verified_cash: r.verified_cash ? parseFloat(r.verified_cash) : null,
        verified_upi: r.verified_upi ? parseFloat(r.verified_upi) : null,
        details: breakdown,
      };
    });

    res.json({
      success: true,
      data: formatted,
      summary: {
        pending_count: parseInt(stats.pending_count || 0, 10),
        pending_cash: parseFloat(stats.pending_cash || 0),
        approved_today_count: parseInt(stats.approved_today_count || 0, 10),
        approved_today_cash: parseFloat(stats.approved_today_cash || 0),
      },
    });
  } catch (error) {
    logger.error('Failed to list FinLend day submissions for admin', error);
    res.status(500).json({ success: false, message: 'Failed to list day submissions' });
  }
}

/**
 * 5. POST /api/interest/day-submissions/:id/approve
 * Admin verifies cash counted and approves & closes the day submission
 */
export async function approveInterestDaySubmission(req, res) {
  try {
    await ensureInterestDaySubmissionsTable();
    const { id } = req.params;
    const { verified_cash, verified_upi, admin_notes } = req.body;

    const [[sub]] = await pool.query(`SELECT * FROM interest_cash_submissions WHERE id = ?`, [id]);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission record not found' });
    }

    const finalCash = verified_cash !== undefined ? parseFloat(verified_cash) : parseFloat(sub.cash_collected);
    const finalUpi = verified_upi !== undefined ? parseFloat(verified_upi) : parseFloat(sub.upi_collected);

    await pool.query(
      `UPDATE interest_cash_submissions
       SET status = 'APPROVED',
           verified_cash = ?,
           verified_upi = ?,
           admin_notes = ?,
           approved_by = ?,
           approved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [finalCash, finalUpi, admin_notes ? admin_notes.trim() : null, req.user.id, id]
    );

    broadcastSync({
      business: 'interest',
      entity: 'day-submissions',
      action: 'APPROVE',
      data: { id, agent_id: sub.agent_id },
    });

    // Notify Agent
    await createNotification({
      userId: sub.agent_id,
      title: 'FinLend Day Submission Approved ✓',
      message: `Your day collection report for ${sub.submission_date.toISOString?.().slice(0, 10) || sub.submission_date} was approved. Verified Cash: ₹${finalCash.toLocaleString('en-IN')}.`,
      type: 'DAY_APPROVAL',
      referenceId: id,
    });

    res.json({
      success: true,
      message: 'Day submission verified and approved successfully.',
    });
  } catch (error) {
    logger.error('Failed to approve FinLend day submission', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to approve day submission' });
  }
}

/**
 * 6. POST /api/interest/day-submissions/:id/reject
 * Admin marks discrepancy or rejects day submission with notes
 */
export async function rejectInterestDaySubmission(req, res) {
  try {
    await ensureInterestDaySubmissionsTable();
    const { id } = req.params;
    const { admin_notes } = req.body;

    const [[sub]] = await pool.query(`SELECT * FROM interest_cash_submissions WHERE id = ?`, [id]);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission record not found' });
    }

    await pool.query(
      `UPDATE interest_cash_submissions
       SET status = 'REJECTED',
           admin_notes = ?,
           approved_by = ?,
           approved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [admin_notes ? admin_notes.trim() : 'Discrepancy noted in cash handover', req.user.id, id]
    );

    broadcastSync({
      business: 'interest',
      entity: 'day-submissions',
      action: 'REJECT',
      data: { id, agent_id: sub.agent_id },
    });

    // Notify Agent
    await createNotification({
      userId: sub.agent_id,
      title: 'Day Submission Needs Review',
      message: `Admin requested correction for your day submission on ${sub.submission_date}: ${admin_notes || 'Cash discrepancy'}.`,
      type: 'DAY_REJECTION',
      referenceId: id,
    });

    res.json({ success: true, message: 'Day submission marked for review/discrepancy.' });
  } catch (error) {
    logger.error('Failed to reject FinLend day submission', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to reject day submission' });
  }
}

/**
 * 7. POST /api/interest/day-submissions/:id/unlock
 * Admin unlocks day submission to allow agent to re-submit
 */
export async function unlockInterestDaySubmission(req, res) {
  try {
    await ensureInterestDaySubmissionsTable();
    const { id } = req.params;

    const [[sub]] = await pool.query(`SELECT * FROM interest_cash_submissions WHERE id = ?`, [id]);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission record not found' });
    }

    await pool.query(
      `UPDATE interest_cash_submissions
       SET status = 'PENDING_APPROVAL',
           approved_by = NULL,
           approved_at = NULL
       WHERE id = ?`,
      [id]
    );

    broadcastSync({
      business: 'interest',
      entity: 'day-submissions',
      action: 'UNLOCK',
      data: { id, agent_id: sub.agent_id },
    });

    res.json({ success: true, message: 'Day submission unlocked for re-verification.' });
  } catch (error) {
    logger.error('Failed to unlock FinLend day submission', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to unlock day submission' });
  }
}

