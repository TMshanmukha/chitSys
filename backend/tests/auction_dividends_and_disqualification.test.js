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
    // Winner Net Prize = Pool - Bid Discount - Admin Commission = 100,000 - 25,000 - 5,000 = ₹70,000
    // Foreman Commission (5% of 100,000) = ₹5,000
    // Total Dividend = ₹25,000 (from full bid discount)
    // Dividend per member (20 members) = 25,000 / 20 = ₹1,250.00
    // Next Installment Due = Full Installment Amount = ₹5,000.00 (Dividend credited to member, NOT subtracted)

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
    assert.equal(capturedJson.data.netPayableAmount, 70000); // 100,000 - 25,000 - 5,000
    assert.equal(capturedJson.data.foremanCommission, 5000); // 5% of Pool Amount (100,000)
    assert.equal(capturedJson.data.totalDividend, 25000); // Comes directly from full bid discount
    assert.equal(capturedJson.data.dividendPerMember, 1250.00); // 25,000 / 20
    assert.equal(capturedJson.data.nextInstallmentPayable, 5000.00); // Always full installment amount, never reduced by dividend

    // Verify member_dividends rows created for all enrolled members in Auction Chit
    const [divRows] = await pool.execute(
      'SELECT * FROM member_dividends WHERE group_id = ? AND period_number = 1',
      [testGroupId]
    );
    assert.equal(divRows.length >= 3, true);

    const m1Div = divRows.find((d) => d.member_id === testMember1Id);
    assert.ok(m1Div);
    assert.equal(parseFloat(m1Div.dividend_amount), 1250.00);
    assert.equal(parseFloat(m1Div.net_installment_due), 5000.00);
    assert.equal(m1Div.is_prized, 1);

    const m2Div = divRows.find((d) => d.member_id === testMember2Id);
    assert.ok(m2Div);
    assert.equal(parseFloat(m2Div.dividend_amount), 1250.00);
    assert.equal(parseFloat(m2Div.net_installment_due), 5000.00);
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
    assert.equal(capturedJson.data.netPayableAmount, 150000); // 200,000 - 40,000 - 10,000 (commission from prize)
    assert.equal(capturedJson.data.foremanCommission, 10000); // 5% of 200,000 pool
    assert.equal(capturedJson.data.doubleChitReserve, 40000); // FULL BID DISCOUNT SAVED IN CHIT POOL RESERVE
    assert.equal(capturedJson.data.totalDividend, 0); // 0 DIVIDEND DISTRIBUTION
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
    assert.equal(parseFloat(winnerSub.total_dividend_credited), 1250.00);
  });

  await t.test('5. Double Chit Draw #2: Option to auction the saved reserve pool', async () => {
    // Create a Double Chit scheme to test Draw #2 reserve auction
    const randD2 = Math.floor(1000 + Math.random() * 9000);
    const [grpD2] = await pool.execute(
      `INSERT INTO chit_groups 
        (group_code, group_name, chit_type, frequency, route_category, location_name, installment_amount, total_pool_amount, duration_periods, total_members_limit, foreman_commission_percent, start_date, created_by)
       VALUES (?, 'Test Double Chit Reserve Auction', 'DOUBLE_CHIT', 'MONTHLY', 'MONTHLY_ROUTE', 'Bangalore Central', 5000.00, 100000.00, 20, 20, 5.00, CURDATE(), ?)`,
      [`TEST-DBL2-${randD2}`, adminUserId]
    );
    const d2GroupId = grpD2.insertId;

    await pool.execute(
      'INSERT INTO group_memberships (group_id, member_id, ticket_number, joined_date, status) VALUES (?, ?, 1, CURDATE(), "ACTIVE")',
      [d2GroupId, testMember3Id]
    );

    let capturedStatus;
    let capturedJson;

    // Draw #2: Auctioning a saved reserve of ₹20,000 at ₹4,000 bid discount
    const mockReq = {
      body: {
        group_id: d2GroupId,
        period_number: 1,
        draw_number: 2,
        auction_type: 'DOUBLE_CHIT_DRAW',
        pool_source: 'SAVED_RESERVE',
        custom_pool_amount: 20000,
        winning_member_id: testMember3Id,
        winning_ticket_number: 1,
        bid_discount: 4000,
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
    // Effective Pool = 20,000
    // Admin Commission = 5% of 20,000 = 1,000 (deducted from Winner Prize)
    // Winner Net Prize = 20,000 - 4,000 - 1,000 = 15,000
    assert.equal(capturedJson.data.netPayableAmount, 15000);
    assert.equal(capturedJson.data.foremanCommission, 1000);
    assert.equal(capturedJson.data.doubleChitReserve, 4000);
    assert.equal(capturedJson.data.totalDividend, 0);

    // Clean up
    await pool.execute('DELETE FROM payouts WHERE group_id = ?', [d2GroupId]);
    await pool.execute('DELETE FROM auctions WHERE group_id = ?', [d2GroupId]);
    await pool.execute('DELETE FROM group_memberships WHERE group_id = ?', [d2GroupId]);
    await pool.execute('DELETE FROM chit_groups WHERE id = ?', [d2GroupId]);
  });
});
