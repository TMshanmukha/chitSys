import test from 'node:test';
import assert from 'node:assert';
import { errorHandler } from '../src/middleware/errorHandler.js';

test('Error Handler Friendly Message Translation Suite', async (t) => {
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

  const dummyReq = { originalUrl: '/api/admin/users', method: 'POST' };

  await t.test('1. Translates MySQL ER_DUP_ENTRY for username into clear message', () => {
    const err = new Error("ER_DUP_ENTRY: Duplicate entry 'agent01' for key 'users.username'");
    err.code = 'ER_DUP_ENTRY';
    const res = createMockRes();

    errorHandler(err, dummyReq, res, () => {});

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'This username is already taken. Please choose a different username.');
  });

  await t.test('2. Translates MySQL ER_DUP_ENTRY for mobile/phone into clear message', () => {
    const err = new Error("ER_DUP_ENTRY: Duplicate entry '9876543210' for key 'users.phone'");
    err.code = 'ER_DUP_ENTRY';
    const res = createMockRes();

    errorHandler(err, dummyReq, res, () => {});

    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'This mobile number is already registered for another account or subscriber.');
  });

  await t.test('3. Translates MySQL ECONNREFUSED database connection down into polite message', () => {
    const err = new Error('connect ECONNREFUSED 127.0.0.1:3306');
    err.code = 'ECONNREFUSED';
    const res = createMockRes();

    errorHandler(err, dummyReq, res, () => {});

    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Database connection is currently unavailable. Please verify your MySQL database is running and try again.');
  });

  await t.test('4. Translates expired JWT into understandable user message', () => {
    const err = new Error('jwt expired');
    err.statusCode = 401;
    const res = createMockRes();

    errorHandler(err, dummyReq, res, () => {});

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Your login session has expired for security. Please sign in again to continue.');
  });

  await t.test('5. Shields non-technical users from Developer TypeError or SQL syntax stacks', () => {
    const err = new TypeError("Cannot read properties of undefined (reading 'ticket_number')");
    const res = createMockRes();

    errorHandler(err, dummyReq, res, () => {});

    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'A technical issue occurred while processing your request. Please refresh the page or contact your system administrator.');
    assert.strictEqual(res.body.stack, undefined); // Stack is shielded from client
  });
});
