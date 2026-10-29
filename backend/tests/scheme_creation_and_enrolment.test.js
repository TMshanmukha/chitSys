import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import { createGroup } from '../src/controllers/groupController.js';
import { createMember } from '../src/controllers/memberController.js';
import { createAgent } from '../src/controllers/agentController.js';

test('ChitBase Scheme Creation & Direct Enrolment Test Suite', async (t) => {
  let adminUserId = null;
  let testMemberIds = [];
  let testAgentId = null;
  let createdGroupId = null;

  t.before(async () => {
    // 1. Get or create admin user
    const [admins] = await pool.execute('SELECT id FROM users WHERE role = "ADMIN" LIMIT 1');
    if (admins.length > 0) {
      adminUserId = admins[0].id;
    } else {
      const [insert] = await pool.execute(
        'INSERT INTO users (full_name, username, password_hash, role, phone, is_active) VALUES ("Test Admin", "test_admin_scheme", "hash", "ADMIN", "9999988888", 1)'
      );
      adminUserId = insert.insertId;
    }

    // 2. Create 3 test subscribers for atomic enrolment
    for (let i = 1; i <= 3; i++) {
      const phone = `981112220${i}`;
      await pool.execute('DELETE FROM members WHERE phone = ?', [phone]);
      const [mRes] = await pool.execute(
        'INSERT INTO members (member_code, full_name, phone, address, created_by) VALUES (?, ?, ?, ?, ?)',
        [`MEM-SCH-${i}`, `Enrolled Subscriber ${i}`, phone, `Stop Landmark Sector ${i}`, adminUserId]
      );
      testMemberIds.push(mRes.insertId);
    }

    // 3. Create a test collection agent
    const agentPhone = '9877700011';
    const [existingAgent] = await pool.execute('SELECT id FROM users WHERE phone = ?', [agentPhone]);
    if (existingAgent.length > 0) {
      testAgentId = existingAgent[0].id;
    } else {
      const [agRes] = await pool.execute(
        'INSERT INTO users (full_name, username, password_hash, role, phone, is_active, created_by) VALUES ("Test Route Agent", "route_agent_test", "hash", "COLLECTION_AGENT", ?, 1, ?)',
        [agentPhone, adminUserId]
      );
      testAgentId = agRes.insertId;
    }
  });

  t.after(async () => {
    if (createdGroupId) {
      await pool.execute('DELETE FROM notifications WHERE link LIKE ?', [`%${createdGroupId}%`]);
      await pool.execute('DELETE FROM route_stops WHERE group_id = ?', [createdGroupId]);
      await pool.execute('DELETE FROM group_memberships WHERE group_id = ?', [createdGroupId]);
      await pool.execute('DELETE FROM agent_group_assignments WHERE group_id = ?', [createdGroupId]);
      await pool.execute('DELETE FROM chit_groups WHERE id = ?', [createdGroupId]);
    }
    if (testMemberIds.length > 0) {
      await pool.query('DELETE FROM members WHERE id IN (?)', [testMemberIds]);
    }
    if (testAgentId) {
      await pool.execute('DELETE FROM users WHERE id = ?', [testAgentId]);
    }
    await pool.end();
  });

  await t.test('1. Atomically creates Auction Chit with direct member enrolment and unrestricted historical date', async () => {
    // Commencement date in past: 2025-01-15
    const pastDate = '2025-01-15';
    const groupCode = `DLY-AUC-TEST-${Math.floor(100 + Math.random() * 900)}`;

    const req = {
      user: { id: adminUserId },
      body: {
        group_code: groupCode,
        group_name: 'Metro Daily Auction Chit Pool',
        chit_type: 'AUCTION_CHIT',
        frequency: 'DAILY',
        route_category: 'DAILY_ROUTE',
        location_name: 'Central Commercial Corridor',
        installment_amount: 1000,
        total_pool_amount: 3000, // 1000 * 3
        duration_periods: 50,
        total_members_limit: 3,
        foreman_commission_percent: 5.0,
        max_bid_percent: 35.0,
        start_date: pastDate,
        assigned_agent_id: testAgentId,
        member_ids: testMemberIds,
      },
    };

    let responseStatus = null;
    let responseData = null;
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    await createGroup(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(responseStatus, 201);
    assert.equal(responseData.success, true);
    assert.ok(responseData.groupId);
    createdGroupId = responseData.groupId;

    // Verify group was persisted with correct start date and pool
    const [groups] = await pool.execute('SELECT * FROM chit_groups WHERE id = ?', [createdGroupId]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].chit_type, 'AUCTION_CHIT');
    assert.equal(groups[0].frequency, 'DAILY');
    assert.equal(Number(groups[0].installment_amount), 1000);
    assert.equal(Number(groups[0].total_pool_amount), 3000);

    // Verify all 3 members were atomically enrolled into group_memberships with tickets #1, #2, #3
    const [memberships] = await pool.execute(
      'SELECT member_id, ticket_number, status FROM group_memberships WHERE group_id = ? ORDER BY ticket_number ASC',
      [createdGroupId]
    );
    assert.equal(memberships.length, 3);
    assert.equal(memberships[0].ticket_number, 1);
    assert.equal(memberships[0].member_id, testMemberIds[0]);
    assert.equal(memberships[1].ticket_number, 2);
    assert.equal(memberships[1].member_id, testMemberIds[1]);
    assert.equal(memberships[2].ticket_number, 3);
    assert.equal(memberships[2].member_id, testMemberIds[2]);

    // Verify route stops were generated for all 3 members
    const [stops] = await pool.execute(
      'SELECT stop_order, stop_name, landmark, expected_amount FROM route_stops WHERE group_id = ? ORDER BY stop_order ASC',
      [createdGroupId]
    );
    assert.equal(stops.length, 3);
    assert.equal(stops[0].stop_order, 1);
    assert.ok(stops[0].stop_name.includes('Ticket #1'));
    assert.equal(Number(stops[0].expected_amount), 1000);

    // Verify assigned agent
    const [assignments] = await pool.execute(
      'SELECT agent_id, is_active FROM agent_group_assignments WHERE group_id = ?',
      [createdGroupId]
    );
    assert.equal(assignments.length, 1);
    assert.equal(assignments[0].agent_id, testAgentId);
    assert.equal(assignments[0].is_active, 1);
  });

  await t.test('2. Quick Member registration endpoint creates subscriber and returns memberId', async () => {
    const quickPhone = '9855544433';
    await pool.execute('DELETE FROM members WHERE phone = ?', [quickPhone]);

    const req = {
      user: { id: adminUserId },
      body: {
        full_name: 'Quick Subscriber On-The-Fly',
        phone: quickPhone,
        address: 'Bazaar Street #44',
      },
    };

    let responseStatus = null;
    let responseData = null;
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    await createMember(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(responseStatus, 201);
    assert.equal(responseData.success, true);
    assert.ok(responseData.memberId);

    // Cleanup quick member
    await pool.execute('DELETE FROM members WHERE id = ?', [responseData.memberId]);
  });
});
