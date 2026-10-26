import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { signUserToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

export async function recordAuditLog({
  userId = null,
  action,
  resource,
  details = null,
  ipAddress = null,
  userAgent = null,
  status = 'SUCCESS',
}) {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        resource,
        details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent ? userAgent.substring(0, 250) : null,
        status,
      ]
    );
  } catch (error) {
    logger.error('Failed to write audit log entry', { error: error.message, action });
  }
}

export async function authenticateUser({
  selectedRole,
  username,
  password,
  ipAddress,
  userAgent,
}) {
  const normalizedRole = selectedRole?.toUpperCase()?.trim();

  // For Admin login, if username is omitted, use the primary Super Admin account
  let targetUsername = username?.trim();

  if (normalizedRole === 'ADMIN' && (!targetUsername || targetUsername === '')) {
    // Look up the default super administrator
    const [adminRows] = await pool.execute(
      'SELECT username FROM users WHERE role = "SUPER_ADMIN" AND is_active = 1 ORDER BY id ASC LIMIT 1'
    );
    if (adminRows.length > 0) {
      targetUsername = adminRows[0].username;
    }
  }

  if (!targetUsername) {
    await recordAuditLog({
      action: 'LOGIN_FAILURE',
      resource: 'AUTH',
      details: { reason: 'Missing username identifier', selectedRole },
      ipAddress,
      userAgent,
      status: 'FAILURE',
    });
    throw new Error('Invalid credentials. Please verify your login details.');
  }

  // Retrieve user record by username
  const [rows] = await pool.execute(
    'SELECT id, full_name, username, password_hash, role, is_active FROM users WHERE username = ? LIMIT 1',
    [targetUsername]
  );

  if (rows.length === 0) {
    await recordAuditLog({
      action: 'LOGIN_FAILURE',
      resource: 'AUTH',
      details: { reason: 'User not found', selectedRole },
      ipAddress,
      userAgent,
      status: 'FAILURE',
    });
    // Generic failure message to prevent user enumeration
    throw new Error('Invalid credentials or unauthorized role for this portal.');
  }

  const user = rows[0];

  // Verify role matching
  // Admin portal accepts SUPER_ADMIN and ADMIN
  // Agent portal accepts ONLY COLLECTION_AGENT
  const isRolePermitted =
    (normalizedRole === 'ADMIN' && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) ||
    (normalizedRole === 'COLLECTION_AGENT' && user.role === 'COLLECTION_AGENT');

  if (!isRolePermitted) {
    await recordAuditLog({
      userId: user.id,
      action: 'ROLE_MISMATCH_LOGIN_BLOCKED',
      resource: 'AUTH',
      details: { attemptedRole: normalizedRole, actualRole: user.role },
      ipAddress,
      userAgent,
      status: 'WARNING',
    });
    throw new Error('Invalid credentials or unauthorized role for this portal.');
  }

  // Check account active status
  if (!user.is_active) {
    await recordAuditLog({
      userId: user.id,
      action: 'INACTIVE_ACCOUNT_LOGIN_REJECTED',
      resource: 'AUTH',
      details: { role: user.role },
      ipAddress,
      userAgent,
      status: 'WARNING',
    });
    throw new Error('This account has been deactivated. Please contact an administrator.');
  }

  // Verify password or PIN hash
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    await recordAuditLog({
      userId: user.id,
      action: 'INVALID_CREDENTIALS',
      resource: 'AUTH',
      details: { username: user.username, role: user.role },
      ipAddress,
      userAgent,
      status: 'FAILURE',
    });
    throw new Error('Invalid credentials or unauthorized role for this portal.');
  }

  // Update last login timestamp
  await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  // Generate short-lived JWT session
  const { token, tokenId } = signUserToken(user);

  await recordAuditLog({
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    resource: 'AUTH',
    details: { role: user.role, tokenId },
    ipAddress,
    userAgent,
    status: 'SUCCESS',
  });

  return {
    user: {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
    },
    token,
    tokenId,
  };
}

export async function revokeSession({ userId, tokenId, ipAddress, userAgent }) {
  if (tokenId) {
    // Add token to revocation table (expires in 2 hours)
    await pool.execute(
      `INSERT INTO token_revocations (user_id, token_id, expires_at, reason)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 2 HOUR), 'USER_LOGOUT')`,
      [userId, tokenId]
    );
  }

  await recordAuditLog({
    userId,
    action: 'LOGOUT_SUCCESS',
    resource: 'AUTH',
    details: { tokenId },
    ipAddress,
    userAgent,
    status: 'SUCCESS',
  });
}
