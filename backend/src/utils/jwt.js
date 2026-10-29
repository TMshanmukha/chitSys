import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export function signUserToken(user) {
  const tokenId = crypto.randomUUID();
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    jti: tokenId,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });

  return { token, tokenId };
}

export function verifyUserToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    return null;
  }
}

export function getCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    path: '/',
  };
}
