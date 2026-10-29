import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import { getReportsAnalytics } from '../src/controllers/adminController.js';

test('ChitBase Reports & Financial Analytics Test Suite', async (t) => {
  await t.test('1. getReportsAnalytics returns structured ChitBase reports data', async () => {
    let capturedStatus = null;
    let capturedJson = null;

    const mockReq = {
      query: {
        groupId: 'ALL',
        period: 'ALL',
      },
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

    await getReportsAnalytics(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(capturedStatus, 200, 'Reports endpoint returned HTTP 200');
    assert.ok(capturedJson?.success, 'Reports response was successful');
    assert.ok(capturedJson?.data, 'Reports data object exists');

    const data = capturedJson.data;

    // Verify all 4 ChitBase report entities exist
    assert.ok(Array.isArray(data.collections), 'Collections ledger array exists');
    assert.ok(Array.isArray(data.defaulters), 'Defaulters & pending dues array exists');
    assert.ok(Array.isArray(data.auctions), 'Auctions & lift history array exists');
    assert.ok(Array.isArray(data.memberSummaries), 'Member statements array exists');
    assert.ok(Array.isArray(data.groups), 'Chit groups filter list exists');

    // Verify ChitBase Foreman Analytics Summary
    const summary = data.summary;
    assert.ok(summary !== undefined, 'Summary object exists');
    assert.ok('totalCollected' in summary, 'totalCollected metric exists');
    assert.ok('cashCollected' in summary, 'cashCollected metric exists');
    assert.ok('digitalCollected' in summary, 'digitalCollected metric exists');
    assert.ok('totalDefaulterAmount' in summary, 'totalDefaulterAmount metric exists');
    assert.ok('defaultersCount' in summary, 'defaultersCount metric exists');
    assert.ok('collectionEfficiency' in summary, 'collectionEfficiency metric exists');
    assert.ok('totalForemanCommission' in summary, 'totalForemanCommission metric exists');
    assert.ok('totalDividendsDistributed' in summary, 'totalDividendsDistributed metric exists');
  });

  await t.test('2. Defaulters have required fields for WhatsApp reminder notices', async () => {
    let capturedJson = null;
    const mockReq = { query: {} };
    const mockRes = {
      status() { return this; },
      json(data) { capturedJson = data; return this; },
    };

    await getReportsAnalytics(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    const defaulters = capturedJson.data.defaulters;
    if (defaulters.length > 0) {
      const sample = defaulters[0];
      assert.ok('memberName' in sample, 'defaulter has memberName');
      assert.ok('dueAmount' in sample, 'defaulter has dueAmount');
      assert.ok('groupName' in sample, 'defaulter has groupName');
      assert.ok('ticketNumber' in sample, 'defaulter has ticketNumber');
      assert.equal(sample.status, 'NOT_PAID', 'defaulter status is NOT_PAID');
    }
  });

  // Clean close pool connection so test exits promptly
  await pool.end();
});
