import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import { getRouteTrackingOverview } from '../src/controllers/trackingController.js';
import { getMyAssignedRoutes } from '../src/controllers/agentController.js';
import { getReportsAnalytics, getDashboardOverview } from '../src/controllers/adminController.js';

test('Day-by-Day vs Month-by-Month Cycle Separation Test Suite', async (t) => {
  let dailyGroupId;
  let monthlyGroupId;
  let testMemberId;
  let testAgentId;

  // 1. Ensure a daily chit group exists
  const [dailyGroups] = await pool.query(
    "SELECT id, group_code, installment_amount FROM chit_groups WHERE frequency = 'DAILY' AND status = 'ACTIVE' LIMIT 1"
  );
  if (dailyGroups.length > 0) {
    dailyGroupId = dailyGroups[0].id;
  } else {
    const [res] = await pool.query(
      `INSERT INTO chit_groups (group_code, group_name, frequency, chit_type, route_category, location_name, installment_amount, total_pool_amount, duration_periods, start_date, created_by)
       VALUES ('TEST-DAY-1', 'Daily Test Route Scheme', 'DAILY', 'DAILY_CHIT', 'DAILY_ROUTE', 'Market Road', 500.00, 50000.00, 100, CURDATE(), 1)`
    );
    dailyGroupId = res.insertId;
  }

  // 2. Ensure a monthly chit group exists
  const [monthlyGroups] = await pool.query(
    "SELECT id, group_code, installment_amount FROM chit_groups WHERE frequency = 'MONTHLY' AND status = 'ACTIVE' LIMIT 1"
  );
  if (monthlyGroups.length > 0) {
    monthlyGroupId = monthlyGroups[0].id;
  } else {
    const [res] = await pool.query(
      `INSERT INTO chit_groups (group_code, group_name, frequency, chit_type, route_category, location_name, installment_amount, total_pool_amount, duration_periods, start_date, created_by)
       VALUES ('TEST-MON-1', 'Monthly Test Auction Scheme', 'MONTHLY', 'AUCTION_CHIT', 'MONTHLY_ROUTE', 'Commercial St', 5000.00, 100000.00, 20, CURDATE(), 1)`
    );
    monthlyGroupId = res.insertId;
  }

  // 3. Find or create member and agent
  const [members] = await pool.query('SELECT id FROM members LIMIT 1');
  testMemberId = members[0].id;

  const [agents] = await pool.query("SELECT id FROM users WHERE role = 'COLLECTION_AGENT' LIMIT 1");
  testAgentId = agents[0].id;

  // Enroll member in both groups
  await pool.query(
    `INSERT INTO group_memberships (group_id, member_id, ticket_number, status, joined_date)
     VALUES (?, ?, 1, 'ACTIVE', CURDATE())
     ON DUPLICATE KEY UPDATE status = 'ACTIVE'`,
    [dailyGroupId, testMemberId]
  );
  await pool.query(
    `INSERT INTO group_memberships (group_id, member_id, ticket_number, status, joined_date)
     VALUES (?, ?, 1, 'ACTIVE', CURDATE())
     ON DUPLICATE KEY UPDATE status = 'ACTIVE'`,
    [monthlyGroupId, testMemberId]
  );

  // Assign agent to both groups
  await pool.query(
    `INSERT INTO agent_group_assignments (agent_id, group_id, assigned_date, is_active, assigned_by)
     VALUES (?, ?, CURDATE(), 1, 1)
     ON DUPLICATE KEY UPDATE is_active = 1`,
    [testAgentId, dailyGroupId]
  );
  await pool.query(
    `INSERT INTO agent_group_assignments (agent_id, group_id, assigned_date, is_active, assigned_by)
     VALUES (?, ?, CURDATE(), 1, 1)
     ON DUPLICATE KEY UPDATE is_active = 1`,
    [testAgentId, monthlyGroupId]
  );

  // Clean slate for testing
  await pool.query('DELETE FROM collections WHERE member_id = ? AND group_id IN (?, ?)', [testMemberId, dailyGroupId, monthlyGroupId]);
  await pool.query('DELETE FROM agent_tracking_logs WHERE member_id = ? AND group_id IN (?, ?)', [testMemberId, dailyGroupId, monthlyGroupId]);

  await t.test('1. Tracking overview contains explicit daily vs monthly metadata and summaries', async () => {
    let captured = null;
    const req = { query: {} };
    const res = { status: () => ({ json: (data) => { captured = data; return data; } }) };

    await getRouteTrackingOverview(req, res, (err) => { if (err) throw err; });

    assert.ok(captured.success);
    assert.ok(captured.data.summary.daily, 'Summary has daily breakdown');
    assert.ok(captured.data.summary.monthly, 'Summary has monthly breakdown');

    const dailyRoute = captured.data.routes.find((r) => r.id === dailyGroupId);
    assert.ok(dailyRoute, 'Daily route exists in tracking overview');
    assert.equal(dailyRoute.cycleType, 'DAILY');
    assert.equal(dailyRoute.cycleMode, 'DAY_BY_DAY');

    const monthlyRoute = captured.data.routes.find((r) => r.id === monthlyGroupId);
    assert.ok(monthlyRoute, 'Monthly route exists in tracking overview');
    assert.equal(monthlyRoute.cycleType, 'MONTHLY');
    assert.equal(monthlyRoute.cycleMode, 'MONTH_BY_MONTH');
  });

  await t.test('2. Agent assigned routes return enriched cycle labels and proper cycle segregation', async () => {
    let captured = null;
    const req = { user: { id: testAgentId } };
    const res = { status: () => ({ json: (data) => { captured = data; return data; } }) };

    await getMyAssignedRoutes(req, res, (err) => { if (err) throw err; });

    assert.ok(captured.success);
    const dailyGroup = captured.data.groups.find((g) => g.id === dailyGroupId);
    assert.equal(dailyGroup.cycle_mode, 'DAY_BY_DAY');
    assert.equal(dailyGroup.cycle_label, 'Day-by-Day (Today)');

    const monthlyGroup = captured.data.groups.find((g) => g.id === monthlyGroupId);
    assert.equal(monthlyGroup.cycle_mode, 'MONTH_BY_MONTH');
    assert.equal(monthlyGroup.cycle_label, 'Month-by-Month (Current Month)');
  });

  await t.test('3. Executive dashboard provides distinct dailyOverview and monthlyOverview targets', async () => {
    let captured = null;
    const req = {};
    const res = { status: () => ({ json: (data) => { captured = data; return data; } }) };

    await getDashboardOverview(req, res, (err) => { if (err) throw err; });

    assert.ok(captured.success);
    assert.ok(captured.data.dailyOverview, 'dailyOverview exists');
    assert.ok('target' in captured.data.dailyOverview, 'dailyOverview has target');
    assert.ok('progressPercent' in captured.data.dailyOverview, 'dailyOverview has progressPercent');

    assert.ok(captured.data.monthlyOverview, 'monthlyOverview exists');
    assert.ok('target' in captured.data.monthlyOverview, 'monthlyOverview has target');
    assert.ok('progressPercent' in captured.data.monthlyOverview, 'monthlyOverview has progressPercent');
  });

  await t.test('4. Reports analytics distinguishes daily defaulters from monthly defaulters', async () => {
    let captured = null;
    const req = { query: { groupId: 'ALL', period: 'ALL' } };
    const res = { status: () => ({ json: (data) => { captured = data; return data; } }) };

    await getReportsAnalytics(req, res, (err) => { if (err) throw err; });

    assert.ok(captured.success);
    assert.ok('dailyDefaultersCount' in captured.data.summary, 'dailyDefaultersCount present in summary');
    assert.ok('monthlyDefaultersCount' in captured.data.summary, 'monthlyDefaultersCount present in summary');

    const sampleDefaulter = captured.data.defaulters[0];
    if (sampleDefaulter) {
      assert.ok('cycleType' in sampleDefaulter, 'defaulter has cycleType');
      assert.ok('cycleMode' in sampleDefaulter, 'defaulter has cycleMode');
      assert.ok('cyclePeriod' in sampleDefaulter, 'defaulter has cyclePeriod');
    }
  });

  await pool.end();
});
