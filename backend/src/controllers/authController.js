import { z } from 'zod';
import pool from '../config/db.js';
import { authenticateUser, revokeSession } from '../services/authService.js';
import { getCookieOptions } from '../utils/jwt.js';

const loginSchema = z.object({
  role: z.enum(['ADMIN', 'COLLECTION_AGENT'], {
    errorMap: () => ({ message: 'Please select a valid role (Admin or Collection Agent).' }),
  }),
  username: z.string().optional(),
  password: z.string().min(1, 'Password or PIN is required.'),
  business: z.enum(['chitfund', 'interest']).optional(),
});

export async function login(req, res, next) {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.errors[0]?.message || 'Invalid input data.',
      });
    }

    const { role, username, password, business } = validation.data;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const { user, token } = await authenticateUser({
      selectedRole: role,
      username,
      password,
      ipAddress,
      userAgent,
      business,
    });

    // Set secure HttpOnly cookie
    res.cookie('chit_session', token, getCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      user,
      token,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed.',
    });
  }
}

export async function me(req, res) {
  // `req.user` is set by requireAuth middleware
  let interestProfile = null;
  try {
    const [[p]] = await pool.query(
      'SELECT role, permissions, is_active, must_change_password FROM interest_user_profiles WHERE user_id = ?',
      [req.user.id]
    );
    if (p) interestProfile = p;
  } catch (_) {}

  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      full_name: req.user.full_name,
      username: req.user.username,
      role: req.user.role,
      assigned_business: req.user.assigned_business || 'ALL',
      phone: req.user.phone,
      last_login_at: req.user.last_login_at,
      created_at: req.user.created_at,
      interest_profile: interestProfile,
    },
  });
}

export async function logout(req, res) {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    let token = req.cookies?.chit_session;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const { verifyUserToken } = await import('../utils/jwt.js');
        const decoded = verifyUserToken(token);
        if (decoded && decoded.userId && decoded.jti) {
          await revokeSession({
            userId: decoded.userId,
            tokenId: decoded.jti,
            ipAddress,
            userAgent,
          });
        }
      } catch (_) {
        // Ignore token verification errors during logout
      }
    }

    res.clearCookie('chit_session', { path: '/' });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    res.clearCookie('chit_session', { path: '/' });
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }
}
