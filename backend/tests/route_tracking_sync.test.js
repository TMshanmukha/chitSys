import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import { getRouteTrackingOverview, logAgentStopActivity } from '../src/controllers/trackingController.js';
import { recordCollection } from '../src/controllers/collectionController.js';
import { getMyAssignedRoutes } from '../src/controllers/agentController.js';

test('Synchronous Route Tracking & Agent Node State Transition Suite', async (t) => {
  let testGroupId;
  let testMemberId;
  let testAgentId;

  // Setup: Find or create an active daily group and active member
  let [groups] = await pool.query(
    "SELECT id, group_code, installment_amount, chit_type, route_category FROM chit_groups WHERE status = 'ACTIVE' AND frequency = 'DAILY' LIMIT 1"
  );
  if (groups.length === 0) {
    const [res] = await pool.query(
      `INSERT INTO chit_groups (group_code, group_name, frequency, chit_type, route_category, location_name, installment_amount, total_pool_amount, duration_periods, start_date, created_by)
       VALUES ('SYNC-DAY-1', 'Daily Sync Route Scheme', 'DAILY', 'DAILY_CHIT', 'DAILY_ROUTE', 'Central Market', 500.00, 50000.00, 100, CURDATE(), 1)`
    );
    groups = [{ id: res.insertId }];
  }
  assert.ok(groups.length > 0, 'Must have at least one active daily chit group');
  testGroupId = groups[0].id;

  const [members] = await pool.query('SELECT id, full_name, phone FROM members LIMIT 1');
  assert.ok(members.length > 0, 'Must have at least one member');
  testMemberId = members[0].id;

  // Find an existing COLLECTION_AGENT or create one
  const [agents] = await pool.query("SELECT id FROM users WHERE role = 'COLLECTION_AGENT' LIMIT 1");
  if (agents.length > 0) {
    testAgentId = agents[0].id;
  } else {
    const [agentRes] = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role, is_active)
       VALUES ('syncagent', '$2b$12$DUMMY', 'Sync Test Agent', 'COLLECTION_AGENT', 1)`
    );
    testAgentId = agentRes.insertId;
  }

  // Find an admin user for assigned_by
  const [[adminUser]] = await pool.query("SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN') LIMIT 1");
  const adminId = adminUser?.id || 1;

  // Enroll member in group if not already enrolled
  await pool.query(
    `INSERT INTO group_memberships (group_id, member_id, ticket_number, status, joined_date)
     VALUES (?, ?, 1, 'ACTIVE', CURDATE())
     ON DUPLICATE KEY UPDATE status = 'ACTIVE'`,
    [testGroupId, testMemberId]
  );

  // Assign agent to group
  await pool.query(
    `INSERT INTO agent_group_assignments (agent_id, group_id, assigned_date, is_active, assigned_by)
     VALUES (?, ?, CURDATE(), 1, ?)
     ON DUPLICATE KEY UPDATE is_active = 1`,
    [testAgentId, testGroupId, adminId]
  );

  // Clean any previous test collections or logs for this group & member for a clean slate
  await pool.query(
    'DELETE FROM collections WHERE group_id = ? AND member_id = ?',
    [testGroupId, testMemberId]
  );
  await pool.query(
    'DELETE FROM agent_tracking_logs WHERE group_id = ? AND (member_id = ? OR stop_id = 1)',
    [testGroupId, testMemberId]
  );

  await t.test('1. Member node initially defaults to NOT_PAID (Red)', async () => {
    const req = { query: { groupId: testGroupId } };
    let responseData = null;
    const res = {
      status: (code) => ({
        json: (payload) => {
          responseData = payload;
          return payload;
        },
      }),
    };

    await getRouteTrackingOverview(req, res, (err) => {
      if (err) throw err;
    });

    assert.ok(responseData?.success, 'Tracking overview request should succeed');
    const route = responseData.data.routes.find((r) => r.id === testGroupId);
    assert.ok(route, 'Target chit group route must be returned');

    const node = route.stops.find((s) => s.memberId === testMemberId);
    assert.ok(node, 'Enrolled member must represent an exact route node');
    assert.equal(node.status, 'NOT_PAID', 'Initial status must be NOT_PAID');
    assert.ok(node.notes.includes('Awaiting') || node.notes.length > 0);
  });

  await t.test('2. Agent records unpaid remark -> node reflects remark with NOT_PAID (Red)', async () => {
    const req = {
      user: { id: testAgentId },
      body: {
        groupId: testGroupId,
        memberId: testMemberId,
        stopId: 1,
        status: 'NOT_PAID',
        notes: 'Shop shutter closed, promised payment tomorrow at 4 PM',
      },
    };
    let responseData = null;
    const res = {
      status: (code) => ({
        json: (payload) => {
          responseData = payload;
          return payload;
        },
      }),
    };

    await logAgentStopActivity(req, res, (err) => {
      if (err) throw err;
    });
    assert.ok(responseData?.success, 'Agent log stop activity should succeed');

    // Verify in Admin route tracking overview
    const adminReq = { query: { groupId: testGroupId } };
    let adminData = null;
    const adminRes = {
      status: (code) => ({
        json: (payload) => {
          adminData = payload;
          return payload;
        },
      }),
    };

    await getRouteTrackingOverview(adminReq, adminRes, (err) => {
      if (err) throw err;
    });

    const route = adminData.data.routes.find((r) => r.id === testGroupId);
    const node = route.stops.find((s) => s.memberId === testMemberId);
    assert.equal(node.status, 'NOT_PAID');
    assert.equal(node.nodeColor, 'RED');
    assert.equal(node.notes, 'Shop shutter closed, promised payment tomorrow at 4 PM');
  });

  await t.test('3. Agent records collection -> member node immediately transitions to PAID (Green)', async () => {
    const req = {
      user: { id: testAgentId, role: 'COLLECTION_AGENT' },
      body: {
        group_id: testGroupId,
        member_id: testMemberId,
        amount: 500,
        payment_method: 'CASH',
        notes: 'Collected cash at shop',
      },
    };
    let collResponse = null;
    const res = {
      status: (code) => ({
        json: (payload) => {
          collResponse = payload;
          return payload;
        },
      }),
    };

    await recordCollection(req, res, (err) => {
      if (err) throw err;
    });

    assert.ok(collResponse?.success, 'Collection recording should succeed');
    assert.ok(collResponse.receipt?.receiptNumber, 'Receipt number must be generated');

    // Check in Admin Route Tracking
    const adminReq = { query: { groupId: testGroupId } };
    let adminData = null;
    const adminRes = {
      status: (code) => ({
        json: (payload) => {
          adminData = payload;
          return payload;
        },
      }),
    };

    await getRouteTrackingOverview(adminReq, adminRes, (err) => {
      if (err) throw err;
    });

    const route = adminData.data.routes.find((r) => r.id === testGroupId);
    const node = route.stops.find((s) => s.memberId === testMemberId);
    assert.equal(node.status, 'PAID', 'Node status must now be PAID');
    assert.equal(node.nodeColor, 'GREEN', 'Node color must now be GREEN');
    assert.ok(node.collectionDetails, 'Collection details must be populated');
    assert.equal(node.collectionDetails.receiptNumber, collResponse.receipt.receiptNumber);

    // Check in Agent My Routes
    const agentReq = { user: { id: testAgentId } };
    let agentData = null;
    const agentRes = {
      status: (code) => ({
        json: (payload) => {
          agentData = payload;
          return payload;
        },
      }),
    };

    await getMyAssignedRoutes(agentReq, agentRes, (err) => {
      if (err) throw err;
    });

    assert.ok(agentData?.success);
    const assignedGroup = agentData.data.groups.find((g) => g.id === testGroupId);
    assert.ok(assignedGroup, 'Group must be assigned to agent');
    assert.ok(assignedGroup.chit_type, 'chit_type must be present for Daily vs Monthly categorization');

    const agentMember = agentData.data.members.find((m) => m.member_id === testMemberId && m.group_id === testGroupId);
    assert.ok(agentMember, 'Member must be present in agent route');
    assert.equal(agentMember.is_paid, true, 'Agent terminal must mark member is_paid as true');
    assert.equal(agentMember.node_color, 'GREEN', 'Agent terminal must have GREEN node_color');
    assert.equal(agentMember.today_status, 'PAID');
    assert.equal(agentMember.receipt_number, collResponse.receipt.receiptNumber);
  });

  await pool.end();
});
