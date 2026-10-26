import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/server.js';
import { pool } from '../src/config/db.js';

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

// Helper for making HTTP requests and tracking cookies
async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  // Extract set-cookie if present
  const setCookie = res.headers.get('set-cookie');
  let cookieHeader = null;
  if (setCookie) {
    const match = setCookie.match(/chit_session=([^;]+)/);
    if (match) {
      cookieHeader = `chit_session=${match[1]}`;
    }
  }

  return { status: res.status, data, cookie: cookieHeader };
}

test('1. Valid Administrator Login', async () => {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: {
      role: 'ADMIN',
      username: 'admin',
      password: 'AdminChitFund2026!',
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.user.role, 'SUPER_ADMIN');
  assert.ok(res.cookie, 'Expected chit_session cookie to be set');
});

test('2. Valid Administrator Login with Default Username (PIN/Password Only)', async () => {
  // As required: No administrator name field required for default admin
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: {
      role: 'ADMIN',
      password: 'AdminChitFund2026!',
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.user.role, 'SUPER_ADMIN');
  assert.ok(res.cookie, 'Expected chit_session cookie');
});

test('3. Invalid Administrator Credentials', async () => {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: {
      role: 'ADMIN',
      username: 'admin',
      password: 'WrongPassword999!',
    },
  });

  assert.equal(res.status, 401);
  assert.equal(res.data.success, false);
});

test('4. Valid Collection Agent Login', async () => {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: {
      role: 'COLLECTION_AGENT',
      username: 'agent01',
      password: 'Agent1234!',
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.user.role, 'COLLECTION_AGENT');
  assert.ok(res.cookie);
});

test('5. Invalid Collection Agent Credentials', async () => {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: {
      role: 'COLLECTION_AGENT',
      username: 'agent01',
      password: 'IncorrectPassword',
    },
  });

  assert.equal(res.status, 401);
  assert.equal(res.data.success, false);
});

test('6. Role Mismatch: Agent Attempting to Log in via Admin Portal', async () => {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: {
      role: 'ADMIN',
      username: 'agent01',
      password: 'Agent1234!',
    },
  });

  assert.equal(res.status, 401);
  assert.equal(res.data.success, false);
});

test('7. Role Mismatch: Admin Attempting to Log in via Agent Portal', async () => {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: {
      role: 'COLLECTION_AGENT',
      username: 'admin',
      password: 'AdminChitFund2026!',
    },
  });

  assert.equal(res.status, 401);
  assert.equal(res.data.success, false);
});

test('8. Inactive Account Login Rejected', async () => {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: {
      role: 'COLLECTION_AGENT',
      username: 'inactive_agent',
      password: 'Agent1234!',
    },
  });

  assert.equal(res.status, 401);
  assert.equal(res.data.success, false);
  assert.match(res.data.message, /deactivated/i);
});

test('9. Unauthenticated Access to Protected API (/api/auth/me)', async () => {
  const res = await request('/api/auth/me');
  assert.equal(res.status, 401);
  assert.equal(res.data.success, false);
});

test('10. Authenticated Access to Session Check (/api/auth/me)', async () => {
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      role: 'ADMIN',
      password: 'AdminChitFund2026!',
    },
  });

  const meRes = await request('/api/auth/me', {
    headers: { Cookie: loginRes.cookie },
  });

  assert.equal(meRes.status, 200);
  assert.equal(meRes.data.success, true);
  assert.equal(meRes.data.user.role, 'SUPER_ADMIN');
});

test('11. Collection Agent Attempting to Access Admin Route (/api/admin/audit-logs) Blocked', async () => {
  const agentLogin = await request('/api/auth/login', {
    method: 'POST',
    body: {
      role: 'COLLECTION_AGENT',
      username: 'agent01',
      password: 'Agent1234!',
    },
  });

  const adminRes = await request('/api/admin/audit-logs', {
    headers: { Cookie: agentLogin.cookie },
  });

  assert.equal(adminRes.status, 403);
  assert.equal(adminRes.data.success, false);
});

test('12. Administrator Permitted to Access Admin Route (/api/admin/audit-logs)', async () => {
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: {
      role: 'ADMIN',
      password: 'AdminChitFund2026!',
    },
  });

  const adminRes = await request('/api/admin/audit-logs', {
    headers: { Cookie: adminLogin.cookie },
  });

  assert.equal(adminRes.status, 200);
  assert.equal(adminRes.data.success, true);
  assert.ok(Array.isArray(adminRes.data.data));
});

test('13. Logout Revokes Session', async () => {
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: {
      role: 'ADMIN',
      password: 'AdminChitFund2026!',
    },
  });

  // Call logout with cookie
  const logoutRes = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: adminLogin.cookie },
  });

  assert.equal(logoutRes.status, 200);

  // Subsequent call to /api/auth/me with the revoked token must fail with 401
  const afterLogoutRes = await request('/api/auth/me', {
    headers: { Cookie: adminLogin.cookie },
  });

  assert.equal(afterLogoutRes.status, 401);
  assert.equal(afterLogoutRes.data.success, false);
});
