import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { logger } from '../utils/logger.js';
import { DEFAULT_ROLE_PERMISSIONS } from '../middleware/interestAuthMiddleware.js';

/**
 * Record action to FinLend audit log
 */
async function recordInterestAudit({ userId, action, entityType, entityId, oldValues, newValues, req }) {
  try {
    const ip = req?.ip || req?.headers['x-forwarded-for'] || '127.0.0.1';
    await pool.query(
      `INSERT INTO interest_audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        entityType,
        String(entityId || ''),
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ip,
      ]
    );
  } catch (err) {
    logger.error('Failed to write interest audit log', err);
  }
}

/**
 * 1. GET /api/interest/users - List all FinLend users with profiles & stats
 */
export async function listUsers(req, res) {
  try {
    const { role, status, search } = req.query;

    let query = `
      SELECT 
        u.id as user_id,
        u.username,
        u.full_name,
        u.phone as user_phone,
        u.created_at as account_created_at,
        p.id as profile_id,
        p.role,
        p.phone as profile_phone,
        p.assigned_area,
        p.daily_target,
        p.is_active,
        p.must_change_password,
        p.last_login_at,
        p.permissions,
        (
          SELECT COUNT(DISTINCT customer_id)
          FROM interest_agent_assignments
          WHERE agent_id = u.id AND status = 'ACTIVE'
        ) as assigned_customers_count,
        (
          SELECT COALESCE(SUM(amount_collected), 0)
          FROM interest_collections
          WHERE collected_by_user_id = u.id 
            AND collection_date = CURRENT_DATE()
            AND status = 'CONFIRMED'
        ) as today_collected_amount,
        (
          SELECT COALESCE(SUM(amount_collected), 0)
          FROM interest_collections
          WHERE collected_by_user_id = u.id 
            AND collection_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            AND status = 'CONFIRMED'
        ) as month_collected_amount
      FROM users u
      JOIN interest_user_profiles p ON u.id = p.user_id
      WHERE 1=1
    `;

    const params = [];

    if (role && role !== 'ALL') {
      query += ` AND p.role = ?`;
      params.push(role);
    }

    if (status === 'ACTIVE') {
      query += ` AND p.is_active = 1`;
    } else if (status === 'INACTIVE') {
      query += ` AND p.is_active = 0`;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      query += ` AND (u.full_name LIKE ? OR u.username LIKE ? OR u.phone LIKE ? OR p.assigned_area LIKE ?)`;
      params.push(q, q, q, q);
    }

    query += ` ORDER BY p.role = 'OWNER' DESC, p.is_active DESC, u.id DESC`;

    const [rows] = await pool.query(query, params);

    const users = rows.map((r) => {
      let perms = {};
      try {
        perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {});
      } catch (_) {}

      return {
        ...r,
        phone: r.profile_phone || r.user_phone,
        permissions: {
          ...(DEFAULT_ROLE_PERMISSIONS[r.role] || DEFAULT_ROLE_PERMISSIONS.AGENT),
          ...perms,
        },
      };
    });

    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Failed to list FinLend users', error);
    res.status(500).json({ success: false, message: 'Failed to load user management list' });
  }
}

/**
 * 2. POST /api/interest/users - Create new FinLend user with temporary credentials
 */
export async function createUser(req, res) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      full_name,
      phone,
      username,
      role = 'AGENT',
      temp_password,
      assigned_area,
      daily_target = 0,
      permissions = {},
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Username is required.' });
    }
    if (!temp_password || temp_password.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPhone = phone ? phone.trim() : null;

    // Check username collision in users table
    const [[existing]] = await connection.query(
      `SELECT id, username FROM users WHERE username = ? LIMIT 1`,
      [cleanUsername]
    );

    let targetUserId = null;

    if (existing) {
      // Check if user already has an interest profile
      const [[existingProfile]] = await connection.query(
        `SELECT id FROM interest_user_profiles WHERE user_id = ? LIMIT 1`,
        [existing.id]
      );
      if (existingProfile) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Username '${cleanUsername}' already has a FinLend profile.`,
        });
      }
      targetUserId = existing.id;
    } else {
      // Create new user in users table (shared table untouched, assigned_business = INTEREST)
      const passwordHash = await bcrypt.hash(temp_password.trim(), 12);
      const appRole = role === 'OWNER' || role === 'MANAGER' ? 'ADMIN' : 'COLLECTION_AGENT';

      const [userResult] = await connection.query(
        `INSERT INTO users (full_name, username, password_hash, role, assigned_business, phone, is_active)
         VALUES (?, ?, ?, ?, 'INTEREST', ?, 1)`,
        [full_name.trim(), cleanUsername, passwordHash, appRole, cleanPhone]
      );
      targetUserId = userResult.insertId;
    }

    // Merge custom permissions on top of role defaults
    const roleDefault = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.AGENT;
    const finalPermissions = { ...roleDefault, ...permissions };

    // Insert into interest_user_profiles
    const [profileResult] = await connection.query(
      `INSERT INTO interest_user_profiles 
        (user_id, role, permissions, phone, assigned_area, daily_target, is_active, must_change_password, created_by)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, TRUE, ?)`,
      [
        targetUserId,
        role,
        JSON.stringify(finalPermissions),
        cleanPhone,
        assigned_area ? assigned_area.trim() : null,
        Number(daily_target) || 0,
        req.user?.id || null,
      ]
    );

    await connection.commit();

    await recordInterestAudit({
      userId: req.user?.id,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: targetUserId,
      oldValues: null,
      newValues: { username: cleanUsername, role, assigned_area, daily_target },
      req,
    });

    res.status(201).json({
      success: true,
      message: `User '${cleanUsername}' created with temporary password.`,
      data: {
        user_id: targetUserId,
        profile_id: profileResult.insertId,
        username: cleanUsername,
        role,
      },
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Failed to create FinLend user', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create user account' });
  } finally {
    connection.release();
  }
}

/**
 * 3. GET /api/interest/users/:id - User details with assignments & statistics
 */
export async function getUserById(req, res) {
  try {
    const { id } = req.params;

    const [[user]] = await pool.query(
      `SELECT 
        u.id as user_id, u.username, u.full_name, u.phone as user_phone, u.created_at,
        p.id as profile_id, p.role, p.phone as profile_phone, p.assigned_area, p.daily_target,
        p.is_active, p.must_change_password, p.last_login_at, p.permissions
       FROM users u
       JOIN interest_user_profiles p ON u.id = p.user_id
       WHERE u.id = ? LIMIT 1`,
      [id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    let perms = {};
    try {
      perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || {});
    } catch (_) {}

    // Fetch assigned customers / loans
    const [assignedLoans] = await pool.query(
      `SELECT 
        l.id as loan_id, l.loan_account_number, l.principal_amount, l.principal_outstanding,
        l.installment_amount, l.loan_status,
        c.id as customer_id, c.customer_code, c.full_name as customer_name, c.phone as customer_phone, c.city,
        a.assignment_date, a.route_name
       FROM interest_agent_assignments a
       JOIN interest_loans l ON a.loan_id = l.id
       JOIN interest_customers c ON a.customer_id = c.id
       WHERE a.agent_id = ? AND a.status = 'ACTIVE'
       ORDER BY c.full_name ASC`,
      [id]
    );

    // Collection stats
    const [[stats]] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN collection_date = CURRENT_DATE() THEN amount_collected ELSE 0 END), 0) as today_collected,
        COALESCE(SUM(amount_collected), 0) as total_collected,
        COUNT(id) as total_receipts
       FROM interest_collections
       WHERE collected_by_user_id = ? AND status = 'CONFIRMED'`,
      [id]
    );

    // Unsubmitted cash in hand
    const [[cashInHandRow]] = await pool.query(
      `SELECT COALESCE(SUM(amount_collected), 0) as cash_in_hand
       FROM interest_collections
       WHERE collected_by_user_id = ? 
         AND payment_method = 'CASH'
         AND status = 'CONFIRMED'
         AND handover_status = 'PENDING'`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...user,
        phone: user.profile_phone || user.user_phone,
        permissions: {
          ...(DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.AGENT),
          ...perms,
        },
        stats: {
          today_collected: Number(stats?.today_collected || 0),
          total_collected: Number(stats?.total_collected || 0),
          total_receipts: Number(stats?.total_receipts || 0),
          cash_in_hand: Number(cashInHandRow?.cash_in_hand || 0),
        },
        assignedLoans,
      },
    });
  } catch (error) {
    logger.error('Failed to get user profile details', error);
    res.status(500).json({ success: false, message: 'Failed to load user details' });
  }
}

/**
 * 4. PUT /api/interest/users/:id - Update user profile & permissions
 */
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { role, permissions, assigned_area, daily_target, full_name, phone } = req.body;

    const [[existing]] = await pool.query(
      `SELECT u.full_name, p.* FROM users u JOIN interest_user_profiles p ON u.id = p.user_id WHERE u.id = ?`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    // Protection rule: An Owner cannot demote themselves
    if (Number(id) === Number(req.user.id) && existing.role === 'OWNER' && role && role !== 'OWNER') {
      return res.status(400).json({ success: false, message: 'You cannot remove your own Owner role.' });
    }

    // Update full_name and phone in users table if provided
    if (full_name || phone) {
      await pool.query(
        `UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone) WHERE id = ?`,
        [full_name ? full_name.trim() : null, phone ? phone.trim() : null, id]
      );
    }

    const mergedPerms = {
      ...(DEFAULT_ROLE_PERMISSIONS[role || existing.role] || DEFAULT_ROLE_PERMISSIONS.AGENT),
      ...(permissions || {}),
    };

    await pool.query(
      `UPDATE interest_user_profiles 
       SET role = COALESCE(?, role),
           permissions = ?,
           assigned_area = COALESCE(?, assigned_area),
           daily_target = COALESCE(?, daily_target),
           phone = COALESCE(?, phone)
       WHERE user_id = ?`,
      [
        role || null,
        JSON.stringify(mergedPerms),
        assigned_area !== undefined ? assigned_area : null,
        daily_target !== undefined ? Number(daily_target) : null,
        phone ? phone.trim() : null,
        id,
      ]
    );

    await recordInterestAudit({
      userId: req.user?.id,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      oldValues: { role: existing.role, area: existing.assigned_area, daily_target: existing.daily_target },
      newValues: { role: role || existing.role, area: assigned_area, daily_target },
      req,
    });

    res.json({ success: true, message: 'User profile updated successfully.' });
  } catch (error) {
    logger.error('Failed to update FinLend user', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
}

/**
 * 5. PATCH /api/interest/users/:id/active - Toggle activation status
 */
export async function toggleUserActive(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const [[target]] = await pool.query(
      `SELECT p.*, u.username FROM interest_user_profiles p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?`,
      [id]
    );

    if (!target) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    // Protection rule: An Owner cannot deactivate themselves
    if (Number(id) === Number(req.user.id) && !is_active) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    // Protection rule: There must always be at least one active Owner
    if (target.role === 'OWNER' && !is_active) {
      const [[ownerCount]] = await pool.query(
        `SELECT COUNT(*) as cnt FROM interest_user_profiles WHERE role = 'OWNER' AND is_active = 1`
      );
      if (ownerCount.cnt <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate this user: There must always be at least one active Owner.',
        });
      }
    }

    const nextState = is_active ? 1 : 0;
    await pool.query(`UPDATE interest_user_profiles SET is_active = ? WHERE user_id = ?`, [nextState, id]);

    await recordInterestAudit({
      userId: req.user?.id,
      action: nextState ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: id,
      oldValues: { is_active: target.is_active },
      newValues: { is_active: nextState },
      req,
    });

    res.json({
      success: true,
      message: `User '${target.username}' ${nextState ? 'activated' : 'deactivated'} in FinLend Pro.`,
    });
  } catch (error) {
    logger.error('Failed to toggle user status', error);
    res.status(500).json({ success: false, message: 'Failed to toggle user status' });
  }
}

/**
 * 6. POST /api/interest/users/:id/reset-password - Reset password & force change on login
 */
export async function resetPassword(req, res) {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters.' });
    }

    const [[target]] = await pool.query(`SELECT username FROM users WHERE id = ?`, [id]);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const hash = await bcrypt.hash(new_password.trim(), 12);

    await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, id]);
    await pool.query(`UPDATE interest_user_profiles SET must_change_password = 1 WHERE user_id = ?`, [id]);

    await recordInterestAudit({
      userId: req.user?.id,
      action: 'PASSWORD_RESET',
      entityType: 'USER',
      entityId: id,
      oldValues: null,
      newValues: { forced_change: true },
      req,
    });

    res.json({
      success: true,
      message: `Password reset successfully for '${target.username}'. User must change password on next login.`,
    });
  } catch (error) {
    logger.error('Failed to reset password', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
}

/**
 * 7. PUT /api/interest/users/:id/assign-customers - Bulk assign/unassign customer loans
 */
export async function assignCustomers(req, res) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params; // Agent user id
    const { loan_ids = [] } = req.body;

    // Check target agent
    const [[agentProfile]] = await connection.query(
      `SELECT role, is_active FROM interest_user_profiles WHERE user_id = ?`,
      [id]
    );

    if (!agentProfile || !agentProfile.is_active) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Target user is not an active agent.' });
    }

    // Set all existing assignments for this agent to INACTIVE
    await connection.query(
      `UPDATE interest_agent_assignments SET status = 'INACTIVE' WHERE agent_id = ?`,
      [id]
    );

    if (loan_ids.length > 0) {
      // Re-assign selected loans
      for (const loanId of loan_ids) {
        const [[loan]] = await connection.query(
          `SELECT id, customer_id FROM interest_loans WHERE id = ? LIMIT 1`,
          [loanId]
        );
        if (loan) {
          await connection.query(
            `UPDATE interest_loans SET assigned_agent_id = ? WHERE id = ?`,
            [id, loan.id]
          );

          await connection.query(
            `INSERT INTO interest_agent_assignments 
              (agent_id, customer_id, loan_id, assigned_by, assignment_date, route_name, status)
             VALUES (?, ?, ?, ?, CURRENT_DATE(), 'FinLend Route', 'ACTIVE')
             ON DUPLICATE KEY UPDATE status = 'ACTIVE', assignment_date = CURRENT_DATE()`,
            [id, loan.customer_id, loan.id, req.user?.id || 1]
          );
        }
      }
    }

    await connection.commit();

    await recordInterestAudit({
      userId: req.user?.id,
      action: 'CUSTOMERS_ASSIGNED',
      entityType: 'USER',
      entityId: id,
      oldValues: null,
      newValues: { assigned_count: loan_ids.length },
      req,
    });

    res.json({
      success: true,
      message: `Assigned ${loan_ids.length} loan accounts to agent.`,
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Failed to assign customers', error);
    res.status(500).json({ success: false, message: 'Failed to update customer assignments' });
  } finally {
    connection.release();
  }
}

/**
 * 8. GET /api/interest/users/:id/activity - Audit log & collections for this user
 */
export async function getUserActivity(req, res) {
  try {
    const { id } = req.params;

    const [logs] = await pool.query(
      `SELECT * FROM interest_audit_logs 
       WHERE user_id = ? OR entity_id = ?
       ORDER BY id DESC LIMIT 50`,
      [id, String(id)]
    );

    const [recentCollections] = await pool.query(
      `SELECT c.*, cust.full_name as customer_name, l.loan_account_number
       FROM interest_collections c
       JOIN interest_customers cust ON c.customer_id = cust.id
       JOIN interest_loans l ON c.loan_id = l.id
       WHERE c.collected_by_user_id = ?
       ORDER BY c.id DESC LIMIT 20`,
      [id]
    );

    res.json({
      success: true,
      data: {
        logs,
        recentCollections,
      },
    });
  } catch (error) {
    logger.error('Failed to get user activity', error);
    res.status(500).json({ success: false, message: 'Failed to load user activity log' });
  }
}

/**
 * 9. POST /api/interest/users/change-password - User self-service change password
 */
export async function changeOwnPassword(req, res) {
  try {
    const { current_password, new_password } = req.body;

    if (!new_password || new_password.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'New password must be at least 4 characters.' });
    }

    const [[user]] = await pool.query(`SELECT password_hash FROM users WHERE id = ?`, [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // If current password provided, verify it
    if (current_password) {
      const match = await bcrypt.compare(current_password, user.password_hash);
      if (!match) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }
    }

    const newHash = await bcrypt.hash(new_password.trim(), 12);
    await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, req.user.id]);
    await pool.query(`UPDATE interest_user_profiles SET must_change_password = 0 WHERE user_id = ?`, [req.user.id]);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    logger.error('Failed to change password', error);
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
}
