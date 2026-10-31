import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import {
  getPendingDuesAndAdvances,
  recordAdminAdvance,
  settleAdminAdvance,
} from '../src/controllers/adminController.js';
import { getSchemeAuctionBreakdown } from '../src/controllers/auctionController.js';

test('Pending Dues & Admin Covered Installment Advances Test Suite', async (t) => {
  let testGroupId = null;
  let testMemberId = null;
  let advanceId = null;

  // Setup: find or create an active group and member
  const [groups] = await pool.query("SELECT id, installment_amount, group_name FROM chit_groups WHERE status = 'ACTIVE' LIMIT 1");
  if (groups.length > 0) {
    testGroupId = groups[0].id;
    const [members] = await pool.query(
      "SELECT member_id FROM group_memberships WHERE group_id = ? AND status = 'ACTIVE' LIMIT 1",
      [testGroupId]
    );
    if (members.length > 0) {
      testMemberId = members[0].member_id;
    }
  }

  await t.test('1. getPendingDuesAndAdvances returns structured chit and member dues breakdown', async () => {
    let capturedStatus = null;
    let capturedJson = null;

    const mockReq = {
      query: {
        groupId: testGroupId ? String(testGroupId) : 'ALL',
        status: 'ALL',
      },
      user: { id: 1, role: 'ADMIN' },
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

    await getPendingDuesAndAdvances(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 200, 'HTTP 200 returned');
    assert.ok(capturedJson?.success, 'Success is true');
    assert.ok(Array.isArray(capturedJson?.data?.items), 'items is an array');
    assert.ok(capturedJson?.data?.summary, 'summary object exists');
    assert.ok('totalPendingOverall' in capturedJson.data.summary, 'totalPendingOverall exists in summary');

    if (capturedJson.data.items.length > 0) {
      const item = capturedJson.data.items[0];
      assert.ok('groupName' in item, 'groupName exists');
      assert.ok('groupCode' in item, 'groupCode exists');
      assert.ok('memberName' in item, 'memberName exists');
      assert.ok('memberPhone' in item, 'memberPhone exists');
      assert.ok('ticketNumber' in item, 'ticketNumber exists');
      assert.ok('expectedAmount' in item, 'expectedAmount exists');
      assert.ok('pendingAmount' in item, 'pendingAmount exists');
      assert.ok('status' in item, 'status exists');
    }
  });

  if (testGroupId && testMemberId) {
    await t.test('2. Admin adds amount for unpaid member: creates collection and records pending recovery', async () => {
      let capturedStatus = null;
      let capturedJson = null;

      const mockReq = {
        body: {
          group_id: testGroupId,
          member_id: testMemberId,
          amount: 500.0,
          payment_method: 'CASH',
          notes: 'Covered by Admin on behalf of member for test',
        },
        user: { id: 1, role: 'ADMIN' },
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

      await recordAdminAdvance(mockReq, mockRes, (err) => {
        if (err) throw err;
      });

      assert.equal(capturedStatus, 201, 'HTTP 201 created');
      assert.ok(capturedJson?.success, 'Success is true');
      assert.ok(capturedJson?.data?.advanceId, 'advanceId returned');
      assert.equal(capturedJson.data.status, 'PENDING_RECOVERY');
      advanceId = capturedJson.data.advanceId;
    });

    await t.test('3. getSchemeAuctionBreakdown reflects ADMIN_COVERED status for that member', async () => {
      let capturedStatus = null;
      let capturedJson = null;

      const mockReq = {
        params: { groupId: String(testGroupId) },
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

      await getSchemeAuctionBreakdown(mockReq, mockRes, (err) => {
        if (err) throw err;
      });

      assert.equal(capturedStatus, 200);
      assert.ok(capturedJson?.success);
      const sub = capturedJson.data.subscribers.find((s) => s.member_id === testMemberId);
      assert.ok(sub, 'Member exists in subscribers');
      assert.equal(sub.payment_status, 'ADMIN_COVERED', 'Status marked as ADMIN_COVERED');
      assert.equal(sub.is_admin_covered, true, 'is_admin_covered is true');
      assert.ok(sub.pending_amount > 0, 'pending_amount reflects the advance amount');
    });

    await t.test('4. settleAdminAdvance marks advance as recovered when subscriber repays', async () => {
      let capturedStatus = null;
      let capturedJson = null;

      const mockReq = {
        body: {
          advance_id: advanceId,
          recovered_amount: 500.0,
          notes: 'Subscriber repaid in full',
        },
        user: { id: 1, role: 'ADMIN' },
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

      await settleAdminAdvance(mockReq, mockRes, (err) => {
        if (err) throw err;
      });

      assert.equal(capturedStatus, 200);
      assert.ok(capturedJson?.success);

      // Verify status in DB
      const [rows] = await pool.query('SELECT status, recovered_amount FROM admin_member_advances WHERE id = ?', [advanceId]);
      assert.equal(rows[0].status, 'RECOVERED');
      assert.equal(parseFloat(rows[0].recovered_amount), 500.0);
    });
  }
});
