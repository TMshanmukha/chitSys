import { Server } from 'socket.io';
import { verifyUserToken } from '../utils/jwt.js';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

let io = null;

/**
 * Parse cookies from cookie header string
 */
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    const value = decodeURIComponent(parts.join('='));
    list[name] = value;
  });
  return list;
}

/**
 * Initialize Socket.IO with HTTP server
 */
export function initRealtimeService(httpServer, corsOptions) {
  io = new Server(httpServer, {
    cors: corsOptions,
    pingTimeout: 30000,
    pingInterval: 15000,
    transports: ['websocket', 'polling'],
  });

  // Authentication Middleware for incoming socket connections
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      // Check Authorization header
      if (!token && socket.handshake.headers?.authorization?.startsWith('Bearer ')) {
        token = socket.handshake.headers.authorization.split(' ')[1];
      }

      // Check cookie
      if (!token && socket.handshake.headers?.cookie) {
        const cookies = parseCookies(socket.handshake.headers.cookie);
        token = cookies.chit_session;
      }

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyUserToken(token);
      if (!decoded || !decoded.userId) {
        return next(new Error('Invalid or expired authentication session'));
      }

      // Check token revocation
      const [revokedRows] = await pool.execute(
        'SELECT id FROM token_revocations WHERE token_id = ? LIMIT 1',
        [decoded.jti]
      );
      if (revokedRows.length > 0) {
        return next(new Error('Session has been revoked'));
      }

      // Verify user from database
      const [userRows] = await pool.execute(
        'SELECT id, username, full_name, role, assigned_business, is_active FROM users WHERE id = ? LIMIT 1',
        [decoded.userId]
      );

      if (userRows.length === 0) {
        return next(new Error('User account does not exist'));
      }

      const user = userRows[0];
      if (!user.is_active) {
        return next(new Error('Account is deactivated'));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.error('Socket authentication error:', { message: err.message });
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`🔌 Realtime client connected: ${user.username} (${user.role}) [socketId: ${socket.id}]`);

    // 1. Join user-specific room
    socket.join(`user:${user.id}`);

    // 2. Join role-specific room
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      socket.join('role:ADMIN');
      socket.join('role:SUPER_ADMIN');
    } else if (user.role === 'COLLECTION_AGENT') {
      socket.join('role:AGENT');
      socket.join('role:COLLECTION_AGENT');
    }

    // 3. Join business-specific rooms with strict isolation
    const assignedBusiness = (user.assigned_business || '').toLowerCase();
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';

    if (isAdmin || assignedBusiness === 'all' || assignedBusiness === 'chitfund') {
      socket.join('business:chitfund');
    }

    if (isAdmin || assignedBusiness === 'all' || assignedBusiness === 'interest') {
      socket.join('business:interest');
    }

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Realtime client disconnected: ${user.username} (${reason})`);
    });
  });

  return io;
}

/**
 * Returns the active Socket.IO server instance
 */
export function getIO() {
  return io;
}

/**
 * Broadcast a real-time data synchronization event
 * DATABASE-FIRST: Call this ONLY after the database transaction has committed.
 */
export function broadcastSync({
  business = 'chitfund', // 'chitfund' | 'interest'
  entity,                // 'collections', 'members', 'groups', 'agents', 'auctions', 'day_closing', 'leaves', etc.
  action = 'UPDATE',     // 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', etc.
  data = {},
  targetUserIds = null,
  targetRoles = null,
  excludeSocketId = null,
}) {
  if (!io) return;

  const eventPayload = {
    business,
    entity,
    action,
    data,
    timestamp: new Date().toISOString(),
  };

  const businessRoom = `business:${business.toLowerCase()}`;

  // If targeted to specific users
  if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
    targetUserIds.forEach((uid) => {
      io.to(`user:${uid}`).emit('sync:event', eventPayload);
      io.to(`user:${uid}`).emit(`sync:${entity}`, eventPayload);
    });
    return;
  }

  // If targeted to specific roles within the business
  if (Array.isArray(targetRoles) && targetRoles.length > 0) {
    targetRoles.forEach((role) => {
      const roleRoom = role.startsWith('role:') ? role : `role:${role.toUpperCase()}`;
      io.to(businessRoom).to(roleRoom).emit('sync:event', eventPayload);
      io.to(businessRoom).to(roleRoom).emit(`sync:${entity}`, eventPayload);
    });
    return;
  }

  // General business room broadcast (strictly isolated)
  if (excludeSocketId) {
    socket.to(businessRoom).emit('sync:event', eventPayload);
    socket.to(businessRoom).emit(`sync:${entity}`, eventPayload);
  } else {
    io.to(businessRoom).emit('sync:event', eventPayload);
    io.to(businessRoom).emit(`sync:${entity}`, eventPayload);
  }
}

/**
 * Send real-time notification to relevant clients
 */
export function broadcastNotification({
  notification,
  business = 'chitfund',
}) {
  if (!io || !notification) return;

  const businessRoom = `business:${business.toLowerCase()}`;

  if (notification.user_id) {
    // Direct notification to specific user
    io.to(`user:${notification.user_id}`).emit('notification:new', notification);
  } else if (notification.target_role && notification.target_role !== 'ALL') {
    // Role-targeted notification within business
    const roleRoom = `role:${notification.target_role.toUpperCase()}`;
    io.to(businessRoom).to(roleRoom).emit('notification:new', notification);
  } else {
    // Business-wide notification
    io.to(businessRoom).emit('notification:new', notification);
  }
}

