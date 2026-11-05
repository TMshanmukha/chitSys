import pool from '../config/db.js';
import { logger } from '../utils/logger.js';

export const DEFAULT_ROLE_PERMISSIONS = {
  OWNER: {
    can_disburse_loans: true,
    can_collect: true,
    can_edit_customers: true,
    can_view_reports: true,
    can_export: true,
    can_approve_cash: true,
    can_delete_records: true,
  },
  MANAGER: {
    can_disburse_loans: true,
    can_collect: true,
    can_edit_customers: true,
    can_view_reports: true,
    can_export: true,
    can_approve_cash: true,
    can_delete_records: false,
  },
  AGENT: {
    can_disburse_loans: false,
    can_collect: true,
    can_edit_customers: false,
    can_view_reports: false,
    can_export: false,
    can_approve_cash: false,
    can_delete_records: false,
  },
  VIEWER: {
    can_disburse_loans: false,
    can_collect: false,
    can_edit_customers: false,
    can_view_reports: true,
    can_export: false,
    can_approve_cash: false,
    can_delete_records: false,
  },
};

/**
 * Middleware: Loads and verifies user's FinLend profile & granular permissions.
 */
export async function attachInterestProfile(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const [[profile]] = await pool.query(
      `SELECT * FROM interest_user_profiles WHERE user_id = ? LIMIT 1`,
      [req.user.id]
    );

    if (!profile) {
      // Auto-provision OWNER profile for system SUPER_ADMIN / ADMIN
      if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
        const defaultPerms = JSON.stringify(DEFAULT_ROLE_PERMISSIONS.OWNER);
        await pool.query(
          `INSERT INTO interest_user_profiles (user_id, role, permissions, is_active, must_change_password)
           VALUES (?, 'OWNER', ?, TRUE, FALSE)
           ON DUPLICATE KEY UPDATE role = 'OWNER'`,
          [req.user.id, defaultPerms]
        );
        req.interestUser = {
          user_id: req.user.id,
          role: 'OWNER',
          is_active: 1,
          must_change_password: 0,
        };
        req.interestPermissions = DEFAULT_ROLE_PERMISSIONS.OWNER;
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Access Denied: You do not have an active profile for FinLend Pro.',
      });
    }

    // Check if deactivated in FinLend Pro (ChitFund Pro is untouched)
    if (!profile.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your FinLend Pro account has been deactivated. Please contact an Owner.',
      });
    }

    let parsedPermissions = {};
    try {
      parsedPermissions = typeof profile.permissions === 'string'
        ? JSON.parse(profile.permissions)
        : (profile.permissions || {});
    } catch (_) {
      parsedPermissions = {};
    }

    const mergedPermissions = {
      ...(DEFAULT_ROLE_PERMISSIONS[profile.role] || DEFAULT_ROLE_PERMISSIONS.AGENT),
      ...parsedPermissions,
    };

    req.interestUser = {
      ...profile,
      user_id: req.user.id,
    };
    req.interestPermissions = mergedPermissions;

    next();
  } catch (error) {
    logger.error('Error in attachInterestProfile middleware', error);
    res.status(500).json({ success: false, message: 'Internal server error verifying profile permissions' });
  }
}

/**
 * Middleware: Enforces role check (e.g., OWNER, MANAGER, AGENT, VIEWER)
 */
export function requireInterestRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.interestUser) {
      return res.status(403).json({ success: false, message: 'FinLend profile not attached' });
    }

    if (allowedRoles.includes(req.interestUser.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
    });
  };
}

/**
 * Middleware: Enforces granular permission check
 */
export function requireInterestPermission(permissionName) {
  return (req, res, next) => {
    if (!req.interestUser) {
      return res.status(403).json({ success: false, message: 'FinLend profile not attached' });
    }

    // OWNER always has all permissions
    if (req.interestUser.role === 'OWNER') {
      return next();
    }

    // VIEWER can never perform mutating money actions
    if (req.interestUser.role === 'VIEWER') {
      const allowedViewerPerms = ['can_view_reports'];
      if (!allowedViewerPerms.includes(permissionName)) {
        return res.status(403).json({
          success: false,
          message: 'Viewer role has read-only access and cannot perform this action.',
        });
      }
    }

    if (req.interestPermissions && req.interestPermissions[permissionName]) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Permission denied: Missing '${permissionName}' permission.`,
    });
  };
}

