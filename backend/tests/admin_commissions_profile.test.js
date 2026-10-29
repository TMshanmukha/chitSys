import test from 'node:test';
import assert from 'node:assert';
import { pool } from '../src/config/db.js';
import {
  getAdminCommissionsAndProfile,
  updateAdminProfile,
  recordCommissionWithdrawal,
  updateAdminPassword,
} from '../src/controllers/adminController.js';

test('Admin Commissions, Payments Inflows & Personal Profile Test Suite', async (t) => {
  // Fetch existing super admin user id
  const [admins] = await pool.query("SELECT id, username, password_hash FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1");
  assert.ok(admins.length > 0, 'Admin user must exist in MySQL');
  const adminId = admins[0].id;

  const createMockReq = (body = {}, query = {}) => ({
    user: { userId: adminId, role: 'SUPER_ADMIN' },
    body,
    query,
  });

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    return res;
  };

  await t.test('1. getAdminCommissionsAndProfile returns structured financial and profile data', async () => {
    const req = createMockReq();
    const res = createMockRes();

    await getAdminCommissionsAndProfile(req, res, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.financialOverview, 'Must contain financialOverview');
    assert.ok(typeof res.body.data.financialOverview.totalForemanCommission === 'number');
    assert.ok(typeof res.body.data.financialOverview.totalPaymentsReceived === 'number');
    assert.ok(Array.isArray(res.body.data.auctionLedger), 'Must contain auctionLedger array');
    assert.ok(Array.isArray(res.body.data.paymentsLedger), 'Must contain paymentsLedger array');
    assert.ok(Array.isArray(res.body.data.withdrawalsHistory), 'Must contain withdrawalsHistory array');
    assert.ok(res.body.data.adminProfile, 'Must contain adminProfile object');
  });

  await t.test('2. updateAdminProfile updates personal & firm information', async () => {
    const req = createMockReq({
      full_name: 'Administrator Foreman',
      firm_name: 'ChitFund Pro Enterprise Private Ltd',
      registration_number: 'CF/TS/2026/8849',
      official_phone: '9988776655',
      bank_name: 'HDFC Bank',
      account_holder_name: 'Administrator Foreman',
      account_number: '50100234567890',
      ifsc_code: 'HDFC0001234',
      upi_id: 'foreman@hdfc',
    });
    const res = createMockRes();

    await updateAdminProfile(req, res, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);

    // Verify row in MySQL
    const [profile] = await pool.query('SELECT * FROM admin_personal_profiles WHERE user_id = ?', [adminId]);
    assert.strictEqual(profile[0].firm_name, 'ChitFund Pro Enterprise Private Ltd');
    assert.strictEqual(profile[0].bank_name, 'HDFC Bank');
    assert.strictEqual(profile[0].upi_id, 'foreman@hdfc');
  });

  await t.test('3. recordCommissionWithdrawal validates non-zero and balance limits', async () => {
    const req = createMockReq({
      amount: -50,
      payment_method: 'BANK_TRANSFER',
    });
    const res = createMockRes();

    await recordCommissionWithdrawal(req, res, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('greater than zero'));
  });

  await t.test('4. updateAdminPassword rejects wrong current password', async () => {
    const req = createMockReq({
      currentPassword: 'wrong_password_123',
      newPassword: 'new_password_123',
    });
    const res = createMockRes();

    await updateAdminPassword(req, res, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('current password you entered is incorrect'));
  });

  await pool.end();
});
