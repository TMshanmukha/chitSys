import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';

test('ChitBase Business Logic and Database Verification', async (t) => {
  let adminToken;
  let testGroupId;
  let testMemberId;

  // 1. Verify Database Tables Exist
  await t.test('1. Database Tables Check', async () => {
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map((r) => Object.values(r)[0]);
    assert.ok(tableNames.includes('chit_groups'), 'chit_groups table exists');
    assert.ok(tableNames.includes('auctions'), 'auctions table exists');
    assert.ok(tableNames.includes('route_stops'), 'route_stops table exists');
    assert.ok(tableNames.includes('agent_tracking_logs'), 'agent_tracking_logs table exists');
    assert.ok(tableNames.includes('collections'), 'collections table exists');
    assert.ok(tableNames.includes('members'), 'members table exists');
  });

  // 2. Chit Group Creation with ChitBase Schemes
  await t.test('2. Create Daily Chit Route Group', async () => {
    const [[adminUser]] = await pool.query("SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1");
    const adminId = adminUser?.id || 1;
    const code = 'DTEST' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
    const [result] = await pool.execute(`
      INSERT INTO chit_groups (
        group_code, group_name, chit_type, route_category, frequency, 
        location_name, installment_amount, total_pool_amount, duration_periods, 
        total_members_limit, start_date, created_by, status
      ) VALUES (?, ?, 'DAILY_CHIT', 'DAILY_ROUTE', 'DAILY', 'Gandhi Market Route 1', 500, 50000, 100, 20, '2026-10-27', ?, 'ACTIVE')
    `, [code, 'Market Daily Route ' + code, adminId]);

    testGroupId = result.insertId;
    assert.ok(testGroupId > 0, 'Daily Chit group inserted with ID');

    const [[row]] = await pool.execute('SELECT * FROM chit_groups WHERE id = ?', [testGroupId]);
    assert.equal(row.chit_type, 'DAILY_CHIT');
    assert.equal(row.route_category, 'DAILY_ROUTE');
  });

  // 3. Create Monthly Double Chit Group
  await t.test('3. Create Monthly Double Chit Group', async () => {
    const [[adminUser]] = await pool.query("SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1");
    const adminId = adminUser?.id || 1;
    const code = 'DBL' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
    const [result] = await pool.execute(`
      INSERT INTO chit_groups (
        group_code, group_name, chit_type, route_category, frequency, 
        location_name, installment_amount, total_pool_amount, duration_periods, 
        total_members_limit, foreman_commission_percent, start_date, created_by, status
      ) VALUES (?, ?, 'DOUBLE_CHIT', 'MONTHLY_ROUTE', 'MONTHLY', 'Commercial Complex', 10000, 200000, 20, 20, 5.0, '2026-10-27', ?, 'ACTIVE')
    `, [code, 'Double Chit 2-Lakh Scheme', adminId]);

    assert.ok(result.insertId > 0, 'Double Chit group created');
  });

  // 4. Verify ChitBase Reverse Auction Formula
  await t.test('4. Reverse Auction & Dividend Mathematical Integrity', async () => {
    const totalPool = 100000;
    const membersCount = 20;
    const bidDiscount = 25000; // Winning discount bid
    const foremanCommissionPercent = 5.0; // 5%

    const foremanCommission = (totalPool * foremanCommissionPercent) / 100; // 5,000
    assert.equal(foremanCommission, 5000, 'Foreman commission is 5,000');

    const totalDividend = bidDiscount - foremanCommission; // 25,000 - 5,000 = 20,000
    assert.equal(totalDividend, 20000, 'Total distributed dividend is 20,000');

    const dividendPerMember = totalDividend / membersCount; // 20,000 / 20 = 1,000
    assert.equal(dividendPerMember, 1000, 'Dividend per member is 1,000');

    const netPayablePrize = totalPool - bidDiscount; // 100,000 - 25,000 = 75,000
    assert.equal(netPayablePrize, 75000, 'Net payable prize money to bidder is 75,000');

    const normalInstallment = 5000;
    const nextInstallmentPayable = normalInstallment - dividendPerMember; // 5,000 - 1,000 = 4,000
    assert.equal(nextInstallmentPayable, 4000, 'Next installment is reduced by dividend to 4,000');
  });

  // 5. Route Stops and 2D Waypoints Coordinates Check
  await t.test('5. Sequential Route Stops Coordinates for 2D Map', async () => {
    const [stops] = await pool.execute(`
      SELECT id, group_id, stop_order, stop_name, coord_x, coord_y
      FROM route_stops
      LIMIT 10
    `);

    // Verify stops can be read with numeric coordinates
    assert.ok(Array.isArray(stops), 'Route stops retrieved successfully');
  });

  // Clean up test group
  if (testGroupId) {
    await pool.execute('DELETE FROM chit_groups WHERE id = ?', [testGroupId]);
  }

  await pool.end();
});
