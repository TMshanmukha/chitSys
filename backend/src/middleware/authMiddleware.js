import { verifyUserToken } from '../utils/jwt.js';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

export async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.chit_session;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication session required. Please sign in.',
      });
    }

    const decoded = verifyUserToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please sign in again.',
      });
    }

    // Check token revocation table
    const [revokedRows] = await pool.execute(
      'SELECT id FROM token_revocations WHERE token_id = ? LIMIT 1',
      [decoded.jti]
    );

    if (revokedRows.length > 0) {
      return res.status(401).json({
        success: false,
        message: 'Session has been revoked. Please sign in again.',
      });
    }

    // Check user in database and verify active status
    const [userRows] = await pool.execute(
      'SELECT id, full_name, username, role, phone, is_active, last_login_at FROM users WHERE id = ? LIMIT 1',
      [decoded.userId]
    );

    if (userRows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.',
      });
    }

    const user = userRows[0];

    if (!user.is_active) {
      logger.warn('Inactive account attempted access', { userId: user.id, username: user.username });
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact an administrator.',
      });
    }

    req.user = {
      ...user,
      userId: user.id,
    };
    req.tokenId = decoded.jti;
    next();
  } catch (error) {
    logger.error('Authentication middleware error', { message: error.message });
    return res.status(500).json({
      success: false,
      message: 'Internal authentication validation error.',
    });
  }
}
