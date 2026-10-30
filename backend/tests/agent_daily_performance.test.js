import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import { getAgentsDailyPerformance } from '../src/controllers/adminController.js';

test('Admin Agent Daily Performance & Cash Ledger Test Suite', async (t) => {
  let agentId;
  let groupId;
  let memberId;

  // Setup: Ensure an active agent exists
  const [agents] = await pool.query("SELECT id, full_name FROM users WHERE role = 'COLLECTION_AGENT' LIMIT 1");
  if (agents.length > 0) {
    agentId = agents[0].id;
  } else {
    const [agentRes] = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, phone, role, is_active)
       VALUES ('perf_agent_${Date.now()}', '$2b$12$DUMMY', 'Performance Agent', '9988776655', 'COLLECTION_AGENT', 1)`
    );
    agentId = agentRes.insertId;
  }

  // Setup: Ensure an active daily group exists
  let [groups] = await pool.query("SELECT id, installment_amount FROM chit_groups WHERE status = 'ACTIVE' AND frequency = 'DAILY' LIMIT 1");
  if (groups.length === 0) {
    const [grpRes] = await pool.query(
      `INSERT INTO chit_groups (group_code, group_name, frequency, chit_type, route_category, location_name, installment_amount, total_pool_amount, duration_periods, start_date, created_by)
       VALUES ('PERF-DAY', 'Performance Daily Route', 'DAILY', 'DAILY_CHIT', 'DAILY_ROUTE', 'Market East', 300.00, 30000.00, 100, CURDATE(), 1)`
    );
    groupId = grpRes.insertId;
  } else {
    groupId = groups[0].id;
  }

  // Setup: Ensure a member exists
  let [members] = await pool.query('SELECT id FROM members LIMIT 1');
  if (members.length === 0) {
    const [memRes] = await pool.query(
      `INSERT INTO members (full_name, phone, member_code, created_by)
       VALUES ('Performance Test Member', '9876543210', 'MEM-PERF-01', 1)`
    );
    memberId = memRes.insertId;
  } else {
    memberId = members[0].id;
  }

  // Enroll member in group
  await pool.query(
    `INSERT INTO group_memberships (group_id, member_id, ticket_number, status, joined_date)
     VALUES (?, ?, 1, 'ACTIVE', CURDATE())
     ON DUPLICATE KEY UPDATE status = 'ACTIVE'`,
    [groupId, memberId]
  );

  // Assign agent to group
  await pool.query(
    `INSERT INTO agent_group_assignments (agent_id, group_id, assigned_date, is_active, assigned_by)
     VALUES (?, ?, CURDATE(), 1, 1)
     ON DUPLICATE KEY UPDATE is_active = 1`,
    [agentId, groupId]
  );

  // Record a CASH collection today for this agent
  const todayStr = new Date().toISOString().slice(0, 10);
  const receiptNum = `RCP-PERF-${Date.now()}`;
  await pool.query(
    `INSERT INTO collections (receipt_number, group_id, member_id, agent_id, amount, payment_method, collection_date, collection_time, verification_status, notes)
     VALUES (?, ?, ?, ?, 300.00, 'CASH', ?, CURTIME(), 'PENDING_RECONCILIATION', 'Collected in person at counter')`,
    [receiptNum, groupId, memberId, agentId, todayStr]
  );

  // Also log tracking stop activity
  await pool.query(
    `INSERT INTO agent_tracking_logs (agent_id, group_id, member_id, stop_id, tracking_date, status, last_ping_time, notes)
     VALUES (?, ?, ?, NULL, ?, 'PAID', NOW(), 'Door delivered receipt')`,
    [agentId, groupId, memberId, todayStr]
  );

  await t.test('1. getAgentsDailyPerformance returns today live metrics, assigned routes and cash collected', async () => {
    let responseData = null;
    let statusCode = null;

    const req = {
      query: {
        date: todayStr,
        mode: 'DAILY',
      },
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        responseData = payload;
      },
    };

    await getAgentsDailyPerformance(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(statusCode, 200);
    assert.equal(responseData.success, true);
    assert.ok(responseData.data);
    assert.equal(responseData.data.filter.date, todayStr);
    assert.equal(responseData.data.filter.isToday, true);

    // Summary must have numbers
    assert.ok(typeof responseData.data.summary.grandCash === 'number');
    assert.ok(typeof responseData.data.summary.grandTotal === 'number');
    assert.ok(typeof responseData.data.summary.grandPending === 'number');

    // Find our agent
    const targetAgent = responseData.data.agents.find((a) => a.agentId === agentId);
    assert.ok(targetAgent, 'Agent should be present in the report');
    assert.ok(targetAgent.cashCollected >= 300, 'Cash collected must include today cash');
    assert.ok(targetAgent.assignedRoutes.length > 0, 'Agent should have assigned routes');
    assert.ok(targetAgent.receipts.length > 0, 'Agent should have receipts');
    assert.ok(targetAgent.workLogs.length > 0, 'Agent should have work logs');
  });

  await t.test('2. Supports ALL_TIME mode to view complete global history across all days', async () => {
    let responseData = null;
    const req = {
      query: {
        mode: 'ALL_TIME',
      },
    };
    const res = {
      status() { return this; },
      json(payload) { responseData = payload; },
    };

    await getAgentsDailyPerformance(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(responseData.success, true);
    assert.equal(responseData.data.filter.mode, 'ALL_TIME');
    assert.ok(responseData.data.summary.grandTotal >= 300);
  });

  await pool.end();
});
