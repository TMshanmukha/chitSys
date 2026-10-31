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

  await t.test('1. Conducts Reverse Auction: 5% Commission on Winner Prize Amount, distributes surplus to passbook', async () => {
    // Bid discount = ₹25,000
    // Pool = ₹1,00,000
    // Gross Winner Prize = Pool - Bid Discount = 100,000 - 25,000 = ₹75,000
    // Foreman Commission (5% of Winner Prize 75,000) = ₹3,750.00
    // Winner Net Prize = Gross Winner Prize - Admin Commission = 75,000 - 3,750 = ₹71,250.00
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
    assert.equal(capturedJson.data.netPayableAmount, 71250); // 75,000 - 3,750
    assert.equal(capturedJson.data.foremanCommission, 3750); // 5% of Winner Prize Amount (75,000)
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
        bid_discount: 40000,
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
    // Gross Winner Prize = 200,000 - 40,000 = 160,000
    // Foreman Commission (5% of Winner Prize 160,000) = 8,000
    // Winner Net Prize = 160,000 - 8,000 = 152,000
    assert.equal(capturedJson.data.netPayableAmount, 152000);
    assert.equal(capturedJson.data.foremanCommission, 8000);
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
    assert.equal(typeof capturedJson.data.totals.isPoolFullyCollected, 'boolean');
    assert.equal(typeof capturedJson.data.totals.totalCollected, 'number');

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
    // Gross Winner Prize = 20,000 - 4,000 = 16,000
    // Admin Commission = 5% of Winner Prize 16,000 = 800 (deducted from Winner Prize)
    // Winner Net Prize = 16,000 - 800 = 15,200
    assert.equal(capturedJson.data.netPayableAmount, 15200);
    assert.equal(capturedJson.data.foremanCommission, 800);
    assert.equal(capturedJson.data.doubleChitReserve, 4000);
    assert.equal(capturedJson.data.totalDividend, 0);

    // Clean up
    await pool.execute('DELETE FROM payouts WHERE group_id = ?', [d2GroupId]);
    await pool.execute('DELETE FROM auctions WHERE group_id = ?', [d2GroupId]);
    await pool.execute('DELETE FROM group_memberships WHERE group_id = ?', [d2GroupId]);
    await pool.execute('DELETE FROM chit_groups WHERE id = ?', [d2GroupId]);
  });

  await t.test('6. Admin Custom Overrides: allows modifying commission, net payable, dividends and dues directly', async () => {
    // Test custom financial overrides provided by Admin
    let capturedStatus;
    let capturedJson;

    const mockReq = {
      body: {
        group_id: testGroupId,
        period_number: 2, // Period 2
        draw_number: 1,
        auction_type: 'AUCTION',
        winning_member_id: testMember2Id, // Member 2 is eligible
        winning_ticket_number: 2,
        bid_discount: 20000,
        auction_date: new Date().toISOString().slice(0, 10),
        custom_commission_percent: 4.0, // Admin custom 4% commission rate
        custom_foreman_commission: 3000, // Admin custom flat commission override
        custom_net_payable: 77000, // Admin custom net prize money
        custom_total_dividend: 20000,
        custom_dividend_per_member: 1000,
        custom_next_installment: 5000,
        notes: 'Admin customized commission and net payable override',
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
    assert.equal(capturedJson.data.commissionPercent, 4.0);
    assert.equal(capturedJson.data.foremanCommission, 3000); // Admin custom commission applied
    assert.equal(capturedJson.data.netPayableAmount, 77000); // Admin custom net payable applied
    assert.equal(capturedJson.data.totalDividend, 20000);
    assert.equal(capturedJson.data.dividendPerMember, 1000);
    assert.equal(capturedJson.data.nextInstallmentPayable, 5000);
  });

  await t.test('7. Double Chit Single Form: Conducts Draw #1 and Draw #2 for reversing amount simultaneously in a single session', async () => {
    // Create a Double Chit scheme to test single-form dual auction
    const randDual = Math.floor(1000 + Math.random() * 9000);
    const [grpDual] = await pool.execute(
      `INSERT INTO chit_groups 
        (group_code, group_name, chit_type, frequency, route_category, location_name, installment_amount, total_pool_amount, duration_periods, total_members_limit, foreman_commission_percent, start_date, created_by)
       VALUES (?, 'Test Double Chit Single Form Dual Auction', 'DOUBLE_CHIT', 'MONTHLY', 'MONTHLY_ROUTE', 'Chennai Hub', 5000.00, 100000.00, 20, 20, 5.00, CURDATE(), ?)`,
      [`TEST-DUAL-${randDual}`, adminUserId]
    );
    const dualGroupId = grpDual.insertId;

    // Enroll Member 2 and Member 3
    await pool.execute(
      'INSERT INTO group_memberships (group_id, member_id, ticket_number, joined_date, status) VALUES (?, ?, 1, CURDATE(), "ACTIVE")',
      [dualGroupId, testMember2Id]
    );
    await pool.execute(
      'INSERT INTO group_memberships (group_id, member_id, ticket_number, joined_date, status) VALUES (?, ?, 2, CURDATE(), "ACTIVE")',
      [dualGroupId, testMember3Id]
    );

    let capturedStatus;
    let capturedJson;

    // Single Form Payload: Draw #1 (Member 2) + Draw #2 for Reversing Amount (Member 3)
    const mockReq = {
      body: {
        group_id: dualGroupId,
        period_number: 1,
        draw_number: 1,
        auction_type: 'DOUBLE_CHIT_DRAW',
        winning_member_id: testMember2Id,
        winning_ticket_number: 1,
        bid_discount: 30000, // Reversing amount generated
        auction_date: new Date().toISOString().slice(0, 10),
        conduct_draw2: true, // Enable Draw #2 in the same form!
        draw2: {
          winning_member_id: testMember3Id, // Second winner
          winning_ticket_number: 2,
          pool_amount: 30000, // Reversing pool from Draw #1
          bid_discount: 5000,
          notes: 'Draw 2 for reversing amount conducted in same form',
        },
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

    // Verify Draw #1
    // Pool = 100,000, Bid Discount = 30,000, Winner Prize = 70,000, Commission = 5% of 70,000 = 3,500, Net Prize = 66,500
    assert.equal(capturedJson.data.netPayableAmount, 66500);
    assert.equal(capturedJson.data.foremanCommission, 3500);

    // Verify Draw #2 returned in response
    // Pool = 30,000, Bid Discount = 5,000, Winner Prize = 25,000, Commission = 5% of 25,000 = 1,250, Net Prize = 23,750, Reserve = 5,000
    assert.ok(capturedJson.data.draw2);
    assert.equal(capturedJson.data.draw2.poolAmount, 30000);
    assert.equal(capturedJson.data.draw2.grossWinnerPrize, 25000);
    assert.equal(capturedJson.data.draw2.foremanCommission, 1250);
    assert.equal(capturedJson.data.draw2.netPayableAmount, 23750);
    assert.equal(capturedJson.data.draw2.doubleChitReserve, 5000);
    assert.equal(capturedJson.data.draw2.winningMemberId, testMember3Id);

    // Verify both auctions exist in the database
    const [dualAuctions] = await pool.execute('SELECT draw_number, winning_member_id, net_payable_amount FROM auctions WHERE group_id = ? ORDER BY draw_number ASC', [dualGroupId]);
    assert.equal(dualAuctions.length, 2);
    assert.equal(dualAuctions[0].draw_number, 1);
    assert.equal(dualAuctions[0].winning_member_id, testMember2Id);
    assert.equal(dualAuctions[1].draw_number, 2);
    assert.equal(dualAuctions[1].winning_member_id, testMember3Id);

    // Verify both members are marked PRIZED in group_memberships
    const [dualMemberships] = await pool.execute('SELECT member_id, is_prized FROM group_memberships WHERE group_id = ?', [dualGroupId]);
    assert.equal(dualMemberships.every((m) => m.is_prized === 1), true);

    // Verify 2 payout vouchers exist
    const [dualPayouts] = await pool.execute('SELECT member_id, net_payable_amount FROM payouts WHERE group_id = ?', [dualGroupId]);
    assert.equal(dualPayouts.length, 2);

    // Clean up
    await pool.execute('DELETE FROM payouts WHERE group_id = ?', [dualGroupId]);
    await pool.execute('DELETE FROM auctions WHERE group_id = ?', [dualGroupId]);
    await pool.execute('DELETE FROM group_memberships WHERE group_id = ?', [dualGroupId]);
    await pool.execute('DELETE FROM chit_groups WHERE id = ?', [dualGroupId]);
  });
});
