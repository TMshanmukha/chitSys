import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import { conductAuction, getSchemeAuctionBreakdown } from '../src/controllers/auctionController.js';

test('ChitBase Reverse Auction & Double Chit Core Mechanics Test Suite', async (t) => {
  let testGroupId;
  let testMember1Id;
  let testMember2Id;
  let testMember3Id;
  let adminUserId = 1;

  t.before(async () => {
    // 1. Fetch an admin user id
    const [users] = await pool.execute('SELECT id FROM users WHERE role = "SUPER_ADMIN" OR role = "ADMIN" LIMIT 1');
    if (users.length > 0) adminUserId = users[0].id;

    // 2. Create test members
    const rand = Math.floor(1000 + Math.random() * 9000);
    const [m1] = await pool.execute(
      `INSERT INTO members (member_code, full_name, phone, created_by)
       VALUES (?, 'Test Winner One', ?, ?)`,
      [`MEM-WIN-${rand}`, `910000${rand}`, adminUserId]
    );
    testMember1Id = m1.insertId;

    const [m2] = await pool.execute(
      `INSERT INTO members (member_code, full_name, phone, created_by)
       VALUES (?, 'Test Subscriber Two', ?, ?)`,
      [`MEM-SUB-${rand}-2`, `911000${rand}`, adminUserId]
    );
    testMember2Id = m2.insertId;

    const [m3] = await pool.execute(
      `INSERT INTO members (member_code, full_name, phone, created_by)
       VALUES (?, 'Test Subscriber Three', ?, ?)`,
      [`MEM-SUB-${rand}-3`, `912000${rand}`, adminUserId]
    );
    testMember3Id = m3.insertId;

    // 3. Create test Chit Group: Monthly Reverse Auction Chit (Pool: ₹1,00,000, 20 members, ₹5,000 installment, 5% foreman commission)
    const [grp] = await pool.execute(
      `INSERT INTO chit_groups 
        (group_code, group_name, chit_type, frequency, route_category, location_name, installment_amount, total_pool_amount, duration_periods, total_members_limit, foreman_commission_percent, start_date, created_by)
       VALUES (?, 'Test Monthly Reverse Chit', 'AUCTION_CHIT', 'MONTHLY', 'MONTHLY_ROUTE', 'Head Office Hyderabad', 5000.00, 100000.00, 20, 20, 5.00, CURDATE(), ?)`,
      [`TEST-AUC-${rand}`, adminUserId]
    );
    testGroupId = grp.insertId;

    // 4. Enroll test members with tickets 1, 2, 3
    await pool.execute(
      'INSERT INTO group_memberships (group_id, member_id, ticket_number, joined_date, status) VALUES (?, ?, 1, CURDATE(), "ACTIVE")',
      [testGroupId, testMember1Id]
    );
    await pool.execute(
      'INSERT INTO group_memberships (group_id, member_id, ticket_number, joined_date, status) VALUES (?, ?, 2, CURDATE(), "ACTIVE")',
      [testGroupId, testMember2Id]
    );
    await pool.execute(
      'INSERT INTO group_memberships (group_id, member_id, ticket_number, joined_date, status) VALUES (?, ?, 3, CURDATE(), "ACTIVE")',
      [testGroupId, testMember3Id]
    );
  });

  t.after(async () => {
    // Cleanup
    if (testGroupId) {
      await pool.execute('DELETE FROM notifications WHERE link LIKE ?', [`%${testGroupId}%`]);
      await pool.execute('DELETE FROM member_dividends WHERE group_id = ?', [testGroupId]);
      await pool.execute('DELETE FROM payouts WHERE group_id = ?', [testGroupId]);
      await pool.execute('DELETE FROM auctions WHERE group_id = ?', [testGroupId]);
      await pool.execute('DELETE FROM route_stops WHERE group_id = ?', [testGroupId]);
      await pool.execute('DELETE FROM group_memberships WHERE group_id = ?', [testGroupId]);
      await pool.execute('DELETE FROM chit_groups WHERE id = ?', [testGroupId]);
    }
    if (testMember1Id) {
      await pool.execute('DELETE FROM auctions WHERE winning_member_id IN (?, ?, ?)', [testMember1Id, testMember2Id, testMember3Id]);
      await pool.execute('DELETE FROM members WHERE id IN (?, ?, ?)', [testMember1Id, testMember2Id, testMember3Id]);
    }
    await pool.end();
  });

  await t.test('1. Conducts Reverse Auction: 5% Commission on auction amount, distributes surplus to passbook', async () => {
    // Bid discount = ₹25,000
    // Pool = ₹1,00,000
    // Winner Net Prize = Pool - Bid Discount = ₹75,000
    // Foreman Commission (5% of 25,000) = ₹1,250
    // Total Dividend = Bid Discount - Foreman Commission = 25,000 - 1,250 = ₹23,750
    // Dividend per member (20 members) = 23,750 / 20 = ₹1,187.50
    // Next Installment Due = 5,000 - 1,187.50 = ₹3,812.50

    let capturedStatus;
    let capturedJson;

    const mockReq = {
      body: {
        group_id: testGroupId,
        period_number: 1,
        draw_number: 1,
        auction_type: 'AUCTION',
        winning_member_id: testMember1Id,
        winning_ticket_number: 1,
        bid_discount: 25000,
        auction_date: new Date().toISOString().slice(0, 10),
        notes: 'Round 1 reverse auction',
      },
      user: { id: adminUserId },
    };

    const mockRes = {
      status(s) {
        capturedStatus = s;
        return this;
      },
      json(d) {
        capturedJson = d;
        return this;
      },
    };

    await conductAuction(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 201);
    assert.equal(capturedJson.success, true);
    assert.equal(capturedJson.data.netPayableAmount, 75000);
    assert.equal(capturedJson.data.foremanCommission, 1250);
    assert.equal(capturedJson.data.totalDividend, 23750);
    assert.equal(capturedJson.data.dividendPerMember, 1187.50);
    assert.equal(capturedJson.data.nextInstallmentPayable, 3812.50);

    // Verify member_dividends rows created for all enrolled members in Auction Chit
    const [divRows] = await pool.execute(
      'SELECT * FROM member_dividends WHERE group_id = ? AND period_number = 1',
      [testGroupId]
    );
    assert.equal(divRows.length >= 3, true);

    const m1Div = divRows.find((d) => d.member_id === testMember1Id);
    assert.ok(m1Div);
    assert.equal(parseFloat(m1Div.dividend_amount), 1187.50);
    assert.equal(parseFloat(m1Div.net_installment_due), 3812.50);
    assert.equal(m1Div.is_prized, 1);

    const m2Div = divRows.find((d) => d.member_id === testMember2Id);
    assert.ok(m2Div);
    assert.equal(parseFloat(m2Div.dividend_amount), 1187.50);
    assert.equal(parseFloat(m2Div.net_installment_due), 3812.50);
  });

  await t.test('2. Disqualifies previous winner from bidding again in the same chit scheme', async () => {
    let capturedStatus;
    let capturedJson;

    const mockReq = {
      body: {
        group_id: testGroupId,
        period_number: 2,
        draw_number: 1,
        auction_type: 'AUCTION',
        winning_member_id: testMember1Id, // Member 1 ALREADY WON IN ROUND 1!
        winning_ticket_number: 1,
        bid_discount: 20000,
        auction_date: new Date().toISOString().slice(0, 10),
      },
      user: { id: adminUserId },
    };

    const mockRes = {
      status(s) {
        capturedStatus = s;
        return this;
      },
      json(d) {
        capturedJson = d;
        return this;
      },
    };

    await conductAuction(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 400);
    assert.equal(capturedJson.success, false);
    assert.match(capturedJson.message, /already won a prize in this chit scheme.*disqualified/i);
  });

  await t.test('3. Double Chit Draw #1 retains surplus in chit pool reserve instead of dividend', async () => {
    // Create a Double Chit scheme
    const randDbl = Math.floor(1000 + Math.random() * 9000);
    const [grpDbl] = await pool.execute(
      `INSERT INTO chit_groups 
        (group_code, group_name, chit_type, frequency, route_category, location_name, installment_amount, total_pool_amount, duration_periods, total_members_limit, foreman_commission_percent, start_date, created_by)
       VALUES (?, 'Test Double Chit Scheme', 'DOUBLE_CHIT', 'MONTHLY', 'MONTHLY_ROUTE', 'Branch Office Bangalore', 10000.00, 200000.00, 20, 20, 5.00, CURDATE(), ?)`,
      [`TEST-DBL-${randDbl}`, adminUserId]
    );
    const dblGroupId = grpDbl.insertId;

    await pool.execute(
      'INSERT INTO group_memberships (group_id, member_id, ticket_number, joined_date, status) VALUES (?, ?, 1, CURDATE(), "ACTIVE")',
      [dblGroupId, testMember2Id]
    );

    let capturedStatus;
    let capturedJson;

    const mockReq = {
      body: {
        group_id: dblGroupId,
        period_number: 1,
        draw_number: 1, // Draw #1
        auction_type: 'DOUBLE_CHIT_DRAW',
        winning_member_id: testMember2Id,
        winning_ticket_number: 1,
        bid_discount: 40000, // Surplus: 40,000 - 10,000 (5% of 2L) = 30,000
        auction_date: new Date().toISOString().slice(0, 10),
      },
      user: { id: adminUserId },
    };

    const mockRes = {
      status(s) {
        capturedStatus = s;
        return this;
      },
      json(d) {
        capturedJson = d;
        return this;
      },
    };

    await conductAuction(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 201);
    assert.equal(capturedJson.success, true);
    assert.equal(capturedJson.data.netPayableAmount, 160000); // 200,000 - 40,000
    assert.equal(capturedJson.data.foremanCommission, 2000); // 5% of 40,000
    assert.equal(capturedJson.data.doubleChitReserve, 38000); // RETAINED IN CHIT POOL RESERVE
    assert.equal(capturedJson.data.totalDividend, 0); // NOT DIVIDED AMONG MEMBERS
    assert.equal(capturedJson.data.dividendPerMember, 0);

    // Verify Double Chit does NOT insert passbook dividend rows
    const [dblDivs] = await pool.execute('SELECT * FROM member_dividends WHERE group_id = ?', [dblGroupId]);
    assert.equal(dblDivs.length, 0);

    // Clean up double chit
    await pool.execute('DELETE FROM member_dividends WHERE group_id = ?', [dblGroupId]);
    await pool.execute('DELETE FROM payouts WHERE group_id = ?', [dblGroupId]);
    await pool.execute('DELETE FROM auctions WHERE group_id = ?', [dblGroupId]);
    await pool.execute('DELETE FROM group_memberships WHERE group_id = ?', [dblGroupId]);
    await pool.execute('DELETE FROM chit_groups WHERE id = ?', [dblGroupId]);
  });

  await t.test('4. getSchemeAuctionBreakdown returns complete transparency ledger', async () => {
    let capturedStatus;
    let capturedJson;

    const mockReq = {
      params: { groupId: testGroupId },
    };

    const mockRes = {
      status(s) {
        capturedStatus = s;
        return this;
      },
      json(d) {
        capturedJson = d;
        return this;
      },
    };

    await getSchemeAuctionBreakdown(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 200);
    assert.equal(capturedJson.success, true);
    assert.equal(capturedJson.data.group.id, testGroupId);
    assert.equal(capturedJson.data.auctions.length, 1);
    assert.equal(capturedJson.data.totals.totalPrizedCount, 1);
    assert.equal(capturedJson.data.subscribers.length >= 3, true);

    const winnerSub = capturedJson.data.subscribers.find((s) => s.member_id === testMember1Id);
    assert.equal(winnerSub.is_prized, 1);
    assert.equal(parseFloat(winnerSub.total_dividend_credited), 1187.50);
  });
});
