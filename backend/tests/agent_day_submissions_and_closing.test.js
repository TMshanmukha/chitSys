import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import {
  submitAgentDayWork,
  getMyDaySubmissions,
  listDaySubmissionsForAdmin,
  approveAndCloseDaySubmission,
} from '../src/controllers/daySubmissionController.js';

test('Agent Day Submission & Admin Day Closing Test Suite', async (t) => {
  let agentId;
  let adminId = 1;
  let groupId;
  let memberId;
  let submissionId;
  const testWorkDate = '2026-10-31';

  // 1. Setup Agent
  const [agents] = await pool.query("SELECT id, full_name FROM users WHERE role = 'COLLECTION_AGENT' AND is_active = 1 LIMIT 1");
  if (agents.length > 0) {
    agentId = agents[0].id;
  } else {
    const [agentRes] = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, phone, role, is_active)
       VALUES ('daysub_agent_${Date.now()}', '$2b$12$DUMMY', 'Day Submit Agent', '9877001122', 'COLLECTION_AGENT', 1)`
    );
    agentId = agentRes.insertId;
  }

  // 2. Setup Chit Group
  let [groups] = await pool.query("SELECT id, installment_amount FROM chit_groups WHERE status = 'ACTIVE' LIMIT 1");
  if (groups.length === 0) {
    const [grpRes] = await pool.query(
      `INSERT INTO chit_groups (group_code, group_name, frequency, chit_type, route_category, location_name, installment_amount, total_pool_amount, duration_periods, start_date, created_by)
       VALUES ('DAYSUB-GRP', 'Day Submit Chit Scheme', 'DAILY', 'DAILY_CHIT', 'DAILY_ROUTE', 'Central Market', 400.00, 40000.00, 100, CURDATE(), 1)`
    );
    groupId = grpRes.insertId;
  } else {
    groupId = groups[0].id;
  }

  // 3. Setup Member
  let [members] = await pool.query('SELECT id FROM members LIMIT 1');
  if (members.length === 0) {
    const [memRes] = await pool.query(
      `INSERT INTO members (full_name, phone, member_code, created_by)
       VALUES ('Day Sub Member', '9988112233', 'MEM-DAYSUB-01', 1)`
    );
    memberId = memRes.insertId;
  } else {
    memberId = members[0].id;
  }

  // 4. Enroll & Assign
  await pool.query(
    `INSERT INTO group_memberships (group_id, member_id, ticket_number, status, joined_date)
     VALUES (?, ?, 1, 'ACTIVE', CURDATE())
     ON DUPLICATE KEY UPDATE status = 'ACTIVE'`,
    [groupId, memberId]
  );

  await pool.query(
    `INSERT INTO agent_group_assignments (agent_id, group_id, assigned_date, is_active, assigned_by)
     VALUES (?, ?, CURDATE(), 1, 1)
     ON DUPLICATE KEY UPDATE is_active = 1`,
    [agentId, groupId]
  );

  // Clean up any prior test submission for this agent and date
  await pool.query('DELETE FROM agent_day_submissions WHERE agent_id = ? AND work_date = ?', [agentId, testWorkDate]);

  // 5. Insert test collections on testWorkDate: 1 CASH and 1 UPI
  const rcpCash = `RCP-CASH-${Date.now()}`;
  const rcpUpi = `RCP-UPI-${Date.now()}`;

  await pool.query(
    `INSERT INTO collections (receipt_number, group_id, member_id, agent_id, amount, payment_method, collection_date, collection_time, verification_status, notes)
     VALUES (?, ?, ?, ?, 400.00, 'CASH', ?, '14:30:00', 'PENDING_RECONCILIATION', 'Collected cash at counter')`,
    [rcpCash, groupId, memberId, agentId, testWorkDate]
  );

  await pool.query(
    `INSERT INTO collections (receipt_number, group_id, member_id, agent_id, amount, payment_method, payment_reference, collection_date, collection_time, verification_status, notes)
     VALUES (?, ?, ?, ?, 600.00, 'UPI', 'UPI-REF-112233', ?, '15:15:00', 'PENDING_RECONCILIATION', 'Collected via GPay')`,
    [rcpUpi, groupId, memberId, agentId, testWorkDate]
  );

  await t.test('1. submitAgentDayWork compiles cash, upi, chit-by-chit breakdown and graphs', async () => {
    let capturedJson = null;
    let capturedStatus = 200;

    const mockReq = {
      user: { id: agentId, full_name: 'Day Submit Agent', role: 'COLLECTION_AGENT' },
      body: {
        work_date: testWorkDate,
        agent_notes: 'Cash pouch containing 4 x ₹100 notes. UPI reference verified.',
      },
    };
    const mockRes = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(data) {
        capturedJson = data;
        return this;
      },
    };

    await submitAgentDayWork(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 200);
    assert.ok(capturedJson?.success);
    assert.ok(capturedJson?.data?.id);
    submissionId = capturedJson.data.id;

    assert.equal(capturedJson.data.workDate, testWorkDate);
    assert.ok(parseFloat(capturedJson.data.cashCollected) >= 400.0);
    assert.ok(parseFloat(capturedJson.data.upiCollected) >= 600.0);
    assert.ok(parseFloat(capturedJson.data.totalCollected) >= 1000.0);
    assert.ok(capturedJson.data.chitBreakdown.length > 0);
    assert.ok(capturedJson.data.graphsAnalyses?.paymentSplit);
    assert.ok(capturedJson.data.graphsAnalyses.paymentSplit.cashAmount >= 400.0);
    assert.ok(capturedJson.data.graphsAnalyses.paymentSplit.upiAmount >= 600.0);
  });

  await t.test('2. getMyDaySubmissions returns submission history for agent', async () => {
    let capturedJson = null;
    let capturedStatus = 200;

    const mockReq = {
      user: { id: agentId, role: 'COLLECTION_AGENT' },
      query: { date: testWorkDate },
    };
    const mockRes = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(data) {
        capturedJson = data;
        return this;
      },
    };

    await getMyDaySubmissions(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 200);
    assert.ok(capturedJson?.success);
    assert.ok(Array.isArray(capturedJson.data));
    assert.equal(capturedJson.data[0].id, submissionId);
    assert.equal(capturedJson.data[0].status, 'PENDING_APPROVAL');
  });

  await t.test('3. listDaySubmissionsForAdmin lists pending submissions with summary KPIs', async () => {
    let capturedJson = null;
    let capturedStatus = 200;

    const mockReq = {
      user: { id: adminId, role: 'ADMIN' },
      query: { status: 'PENDING_APPROVAL' },
    };
    const mockRes = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(data) {
        capturedJson = data;
        return this;
      },
    };

    await listDaySubmissionsForAdmin(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 200);
    assert.ok(capturedJson?.success);
    assert.ok(capturedJson.data.summary.pendingCount >= 1);
    const found = capturedJson.data.submissions.find((s) => s.id === submissionId);
    assert.ok(found, 'Submission should be in admin list');
    assert.equal(found.work_date.slice(0, 10), testWorkDate);
  });

  await t.test('4. approveAndCloseDaySubmission: Admin counts cash, approves and verifies collections', async () => {
    let capturedJson = null;
    let capturedStatus = 200;

    const mockReq = {
      user: { id: adminId, full_name: 'Super Admin', role: 'ADMIN' },
      params: { id: String(submissionId) },
      body: {
        status: 'APPROVED',
        verified_cash_amount: 400.0,
        verified_upi_amount: 600.0,
        admin_notes: 'Cash verified in cash counter drawer. All receipts officially closed.',
      },
    };
    const mockRes = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(data) {
        capturedJson = data;
        return this;
      },
    };

    await approveAndCloseDaySubmission(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 200);
    assert.ok(capturedJson?.success);
    assert.equal(capturedJson.data.status, 'APPROVED');
    assert.equal(capturedJson.data.verifiedCashAmount, 400.0);
    assert.equal(capturedJson.data.verifiedUpiAmount, 600.0);
    assert.ok(capturedJson.data.approvalDate);

    // Verify DB update
    const [subRows] = await pool.query('SELECT status, approved_by, approval_date FROM agent_day_submissions WHERE id = ?', [submissionId]);
    assert.equal(subRows[0].status, 'APPROVED');
    assert.equal(subRows[0].approved_by, adminId);
    assert.ok(subRows[0].approval_date);

    // Verify collections updated to RECONCILED
    const [collRows] = await pool.query(
      'SELECT verification_status FROM collections WHERE agent_id = ? AND collection_date = ?',
      [agentId, testWorkDate]
    );
    assert.ok(collRows.length >= 2);
    assert.ok(collRows.every((c) => c.verification_status === 'RECONCILED'), 'All collections should be updated to RECONCILED');
  });
});
