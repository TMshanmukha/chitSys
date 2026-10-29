import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

test('User Management & Audit Logs Suite', async (t) => {
  let createdUserId = null;
  const testUsername = 'test_agent_' + Math.floor(Math.random() * 10000);

  await t.test('1. Create Agent with hashed password', async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('initialpass123', salt);

    const [result] = await pool.execute(
      `INSERT INTO users (username, password_hash, role, full_name, phone, is_active)
       VALUES (?, ?, 'COLLECTION_AGENT', 'Test Agent John', '9876543210', 1)`,
      [testUsername, hash]
    );

    createdUserId = result.insertId;
    assert.ok(createdUserId > 0, 'Agent user created successfully');

    // Also record audit log for creation
    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent, status)
       VALUES (?, 'USER_CREATED', 'users', ?, '127.0.0.1', 'Mozilla/5.0 Test Suite', 'SUCCESS')`,
      [createdUserId, JSON.stringify({ username: testUsername, role: 'COLLECTION_AGENT' })]
    );
  });

  await t.test('2. Edit & Update Agent details and reset password', async () => {
    const newSalt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash('newsecretpass456', newSalt);
    const updatedName = 'Test Agent John Updated';
    const updatedPhone = '9998887776';

    const [updateResult] = await pool.execute(
      `UPDATE users 
       SET full_name = ?, phone = ?, password_hash = ?
       WHERE id = ?`,
      [updatedName, updatedPhone, newHash, createdUserId]
    );

    assert.equal(updateResult.affectedRows, 1, 'Agent updated successfully');

    const [[updatedUser]] = await pool.execute(
      'SELECT id, username, full_name, phone, password_hash FROM users WHERE id = ?',
      [createdUserId]
    );

    assert.equal(updatedUser.full_name, updatedName);
    assert.equal(updatedUser.phone, updatedPhone);
    const isNewPassValid = await bcrypt.compare('newsecretpass456', updatedUser.password_hash);
    assert.ok(isNewPassValid, 'New password matches updated hash');
  });

  await t.test('3. Toggle Agent Status to Inactive and then Active', async () => {
    await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [createdUserId]);
    const [[userInactive]] = await pool.execute('SELECT is_active FROM users WHERE id = ?', [createdUserId]);
    assert.equal(userInactive.is_active, 0, 'Agent deactivated');

    await pool.execute('UPDATE users SET is_active = 1 WHERE id = ?', [createdUserId]);
    const [[userActive]] = await pool.execute('SELECT is_active FROM users WHERE id = ?', [createdUserId]);
    assert.equal(userActive.is_active, 1, 'Agent re-activated');
  });

  await t.test('4. Audit Logs query for Login Times, IP, and User Agents', async () => {
    // Record login success and failure events
    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent, status)
       VALUES (?, 'LOGIN_SUCCESS', 'auth', '{"method":"web"}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0', 'SUCCESS')`,
      [createdUserId]
    );

    const [logs] = await pool.execute(
      `SELECT a.id, a.user_id, a.action, a.ip_address, a.user_agent, a.created_at, u.username, u.full_name
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.action LIKE '%LOGIN%'
       ORDER BY a.created_at DESC
       LIMIT 10`
    );

    assert.ok(logs.length > 0, 'Audit logs retrieved');
    const latestLogin = logs[0];
    assert.ok(latestLogin.created_at, 'created_at timestamp exists');
    assert.ok(latestLogin.ip_address, 'ip_address exists');
    assert.ok(latestLogin.user_agent, 'user_agent exists');
  });

  // Cleanup
  if (createdUserId) {
    await pool.execute('DELETE FROM audit_logs WHERE user_id = ?', [createdUserId]);
    await pool.execute('DELETE FROM users WHERE id = ?', [createdUserId]);
  }

  await pool.end();
});
