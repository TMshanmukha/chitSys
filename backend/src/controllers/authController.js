import { z } from 'zod';
import { authenticateUser, revokeSession } from '../services/authService.js';
import { getCookieOptions } from '../utils/jwt.js';

const loginSchema = z.object({
  role: z.enum(['ADMIN', 'COLLECTION_AGENT'], {
    errorMap: () => ({ message: 'Please select a valid role (Admin or Collection Agent).' }),
  }),
  username: z.string().optional(),
  password: z.string().min(1, 'Password or PIN is required.'),
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

    const { role, username, password } = validation.data;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const { user, token } = await authenticateUser({
      selectedRole: role,
      username,
      password,
      ipAddress,
      userAgent,
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
  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      full_name: req.user.full_name,
      username: req.user.username,
      role: req.user.role,
      phone: req.user.phone,
      last_login_at: req.user.last_login_at,
    },
  });
}

export async function logout(req, res, next) {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    if (req.user && req.tokenId) {
      await revokeSession({
        userId: req.user.id,
        tokenId: req.tokenId,
        ipAddress,
        userAgent,
      });
    }

    res.clearCookie('chit_session', { path: '/' });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
}
