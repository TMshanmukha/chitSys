import { logger } from '../utils/logger.js';

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before role verification.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not possess the required permissions to access this resource.',
      });
    }

    next();
  };
}
