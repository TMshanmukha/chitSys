import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import { getMyAssignedRoutes, listAgents } from '../src/controllers/agentController.js';
import { getCollectionSummary } from '../src/controllers/collectionController.js';
import { getRouteTrackingOverview } from '../src/controllers/trackingController.js';

test('Agent UPI Metrics & Collection Cards Test Suite', async (t) => {
  let agentId;
  let groupId;
  let memberId;

  // 1. Ensure an active agent exists
  const [agents] = await pool.query("SELECT id, full_name, username FROM users WHERE role = 'COLLECTION_AGENT' AND is_active = 1 LIMIT 1");
  if (agents.length > 0) {
    agentId = agents[0].id;
  } else {
    const [agentRes] = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, phone, role, is_active)
       VALUES ('upi_test_agent_${Date.now()}', '$2b$12$DUMMY', 'UPI Test Agent', '9811223344', 'COLLECTION_AGENT', 1)`
    );
    agentId = agentRes.insertId;
  }

  // 2. Ensure an active chit group exists
  let [groups] = await pool.query("SELECT id, installment_amount FROM chit_groups WHERE status = 'ACTIVE' LIMIT 1");
  if (groups.length === 0) {
    const [grpRes] = await pool.query(
      `INSERT INTO chit_groups (group_code, group_name, frequency, chit_type, route_category, location_name, installment_amount, total_pool_amount, duration_periods, start_date, created_by)
       VALUES ('UPI-GRP', 'UPI Test Chit Scheme', 'DAILY', 'DAILY_CHIT', 'DAILY_ROUTE', 'City Center', 500.00, 50000.00, 100, CURDATE(), 1)`
    );
    groupId = grpRes.insertId;
  } else {
    groupId = groups[0].id;
  }

  // 3. Ensure a member exists
  let [members] = await pool.query('SELECT id FROM members LIMIT 1');
  if (members.length === 0) {
    const [memRes] = await pool.query(
      `INSERT INTO members (full_name, phone, member_code, created_by)
       VALUES ('UPI Member Test', '9988001122', 'MEM-UPI-01', 1)`
    );
    memberId = memRes.insertId;
  } else {
    memberId = members[0].id;
  }

  // 4. Enroll member in group
  await pool.query(
    `INSERT INTO group_memberships (group_id, member_id, ticket_number, status, joined_date)
     VALUES (?, ?, 1, 'ACTIVE', CURDATE())
     ON DUPLICATE KEY UPDATE status = 'ACTIVE'`,
    [groupId, memberId]
  );

  // 5. Assign agent to group
  await pool.query(
    `INSERT INTO agent_group_assignments (agent_id, group_id, assigned_date, is_active, assigned_by)
     VALUES (?, ?, CURDATE(), 1, 1)
     ON DUPLICATE KEY UPDATE is_active = 1`,
    [agentId, groupId]
  );

  // 6. Record a UPI collection today
  const todayStr = new Date().toISOString().slice(0, 10);
  const upiReceipt = `RCP-UPI-${Date.now()}`;
  await pool.query(
    `INSERT INTO collections (receipt_number, group_id, member_id, agent_id, amount, payment_method, payment_reference, collection_date, collection_time, verification_status, notes)
     VALUES (?, ?, ?, ?, 750.00, 'UPI', 'UPI-UTR-987654321', ?, CURTIME(), 'PENDING_RECONCILIATION', 'Paid via PhonePe QR')`,
    [upiReceipt, groupId, memberId, agentId, todayStr]
  );

  await t.test('1. getMyAssignedRoutes returns todayUpi in agent summary', async () => {
    let capturedJson = null;
    let capturedStatus = 200;

    const mockReq = {
      user: { id: agentId, role: 'COLLECTION_AGENT' },
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

    await getMyAssignedRoutes(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 200);
    assert.ok(capturedJson?.success);
    assert.ok(capturedJson?.data?.summary);

    const summary = capturedJson.data.summary;
    assert.ok('todayUpi' in summary, 'summary should contain todayUpi field');
    assert.ok('todayCash' in summary, 'summary should contain todayCash field');
    assert.ok('todayOnline' in summary, 'summary should contain todayOnline field');
    assert.ok('todayTotal' in summary, 'summary should contain todayTotal field');

    assert.ok(parseFloat(summary.todayUpi) >= 750.0, 'todayUpi should reflect the 750.00 collection');
    assert.ok(parseFloat(summary.todayOnline) >= 750.0, 'todayOnline should include UPI collection');
  });

  await t.test('2. getCollectionSummary returns todayUpi', async () => {
    let capturedJson = null;
    let capturedStatus = 200;

    const mockReq = { user: { id: 1, role: 'ADMIN' } };
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

    await getCollectionSummary(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 200);
    assert.ok(capturedJson?.success);
    assert.ok('todayUpi' in capturedJson.data, 'getCollectionSummary should include todayUpi');
    assert.ok(parseFloat(capturedJson.data.todayUpi) >= 750.0);
  });

  await t.test('3. listAgents returns today_upi and today_cash for each agent', async () => {
    let capturedJson = null;
    let capturedStatus = 200;

    const mockReq = { query: { role: 'ALL' }, user: { id: 1, role: 'ADMIN' } };
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

    await listAgents(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 200);
    assert.ok(capturedJson?.success);
    assert.ok(Array.isArray(capturedJson.data));

    const targetAgent = capturedJson.data.find((a) => a.id === agentId);
    assert.ok(targetAgent, 'Agent should be in list');
    assert.ok('today_upi' in targetAgent, 'today_upi should be present on agent row');
    assert.ok(parseFloat(targetAgent.today_upi) >= 750.0);
  });

  await t.test('4. getRouteTrackingOverview returns grandUpiCollected in summary', async () => {
    let capturedJson = null;
    let capturedStatus = 200;

    const mockReq = { query: { groupId: String(groupId) }, user: { id: 1, role: 'ADMIN' } };
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

    await getRouteTrackingOverview(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 200);
    assert.ok(capturedJson?.success);
    assert.ok('grandUpiCollected' in capturedJson.data.summary);
    assert.ok(parseFloat(capturedJson.data.summary.grandUpiCollected) >= 750.0);
  });
});
