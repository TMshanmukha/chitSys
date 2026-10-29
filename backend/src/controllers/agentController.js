import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { recordAuditLog } from '../services/authService.js';

const agentSchema = z.object({
  full_name: z.string().min(2, 'Agent full name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(4, 'Password/PIN must be at least 4 characters'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
});

export async function listAgents(req, res, next) {
  try {
    const { role } = req.query;
    let query = `
      SELECT 
        u.id, u.full_name, u.username, u.role, u.phone, u.is_active, u.last_login_at, u.created_at,
        COUNT(DISTINCT aga.id) as assigned_groups_count,
        GROUP_CONCAT(DISTINCT g.group_name SEPARATOR ', ') as assigned_group_names
      FROM users u
      LEFT JOIN agent_group_assignments aga ON u.id = aga.agent_id AND aga.is_active = 1
      LEFT JOIN chit_groups g ON aga.group_id = g.id
    `;
    const params = [];
    if (role && role !== 'ALL') {
      query += ' WHERE u.role = ?';
      params.push(role);
    }
    query += `
      GROUP BY u.id
      ORDER BY FIELD(u.role, 'SUPER_ADMIN', 'ADMIN', 'COLLECTION_AGENT'), u.created_at DESC
    `;

    const [rows] = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function createAgent(req, res, next) {
  try {
    const validated = agentSchema.parse(req.body);
    const targetRole = req.body.role === 'ADMIN' ? 'ADMIN' : 'COLLECTION_AGENT';

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [validated.username.toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `An account with username '${validated.username}' already exists.`,
      });
    }

    const passwordHash = await bcrypt.hash(validated.password, 12);

    const [insertResult] = await pool.execute(
      `INSERT INTO users (full_name, username, password_hash, role, phone, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [
        validated.full_name.trim(),
        validated.username.toLowerCase().trim(),
        passwordHash,
        targetRole,
        validated.phone.trim(),
        req.user.id,
      ]
    );

    await recordAuditLog({
      userId: req.user.id,
      action: targetRole === 'ADMIN' ? 'CREATE_ADMIN_USER' : 'CREATE_COLLECTION_AGENT',
      resource: 'USERS',
      details: { targetUserId: insertResult.insertId, username: validated.username, role: targetRole },
    });

    res.status(201).json({
      success: true,
      message: `${targetRole === 'ADMIN' ? 'Admin' : 'Collection Agent'} account created successfully.`,
      agentId: insertResult.insertId,
      userId: insertResult.insertId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Invalid user data',
      });
    }
    next(error);
  }
}

export async function updateAgent(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, username, phone, password, is_active } = req.body;

    const [existing] = await pool.execute('SELECT id, username, role FROM users WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Check username uniqueness if changing
    if (username && username.toLowerCase().trim() !== existing[0].username.toLowerCase()) {
      const [duplicate] = await pool.execute(
        'SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1',
        [username.toLowerCase().trim(), id]
      );
      if (duplicate.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Username '${username}' is already in use by another account.`,
        });
      }
    }

    const updates = [];
    const params = [];

    if (full_name && full_name.trim()) {
      updates.push('full_name = ?');
      params.push(full_name.trim());
    }
    if (username && username.trim()) {
      updates.push('username = ?');
      params.push(username.trim().toLowerCase());
    }
    if (phone && phone.trim()) {
      updates.push('phone = ?');
      params.push(phone.trim());
    }
    if (is_active !== undefined) {
      // Don't let admin deactivate their own account
      if (parseInt(id, 10) === req.user.id && !is_active) {
        return res.status(400).json({ success: false, message: 'You cannot deactivate your own active session account.' });
      }
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    if (password && password.trim().length >= 4) {
      const hash = await bcrypt.hash(password.trim(), 12);
      updates.push('password_hash = ?');
      params.push(hash);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_USER_PROFILE',
      resource: 'USERS',
      details: { targetUserId: id, updatedFields: Object.keys(req.body) },
    });

    res.status(200).json({
      success: true,
      message: 'User account updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleAgentStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (parseInt(id, 10) === req.user.id && !is_active) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own active session account.' });
    }

    await pool.execute(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, id]
    );

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_USER_STATUS',
      resource: 'USERS',
      details: { targetUserId: id, status: is_active ? 'ACTIVE' : 'INACTIVE' },
    });

    res.status(200).json({
      success: true,
      message: `Account ${is_active ? 'activated' : 'deactivated'} successfully.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function assignAgentToGroup(req, res, next) {
  try {
    const { agentId, groupId } = req.body;
    if (!agentId || !groupId) {
      return res.status(400).json({ success: false, message: 'Agent ID and Group ID are required.' });
    }

    await pool.execute(
      `INSERT INTO agent_group_assignments (agent_id, group_id, assigned_date, is_active, assigned_by)
       VALUES (?, ?, CURDATE(), 1, ?)
       ON DUPLICATE KEY UPDATE is_active = 1, assigned_by = VALUES(assigned_by)`,
      [agentId, groupId, req.user.id]
    );

    await recordAuditLog({
      userId: req.user.id,
      action: 'ASSIGN_AGENT_TO_GROUP',
      resource: 'AGENT_ASSIGNMENTS',
      details: { agentId, groupId },
    });

    res.status(200).json({
      success: true,
      message: 'Agent assigned to chit group route successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyAssignedRoutes(req, res, next) {
  try {
    // For the logged-in agent, get their active assigned groups and members
    const agentId = req.user.id;

    const [groups] = await pool.execute(
      `SELECT g.id, g.group_code, g.group_name, g.chit_type, g.frequency, g.route_category,
              g.location_name, g.installment_amount, g.total_pool_amount, g.status
       FROM agent_group_assignments aga
       JOIN chit_groups g ON aga.group_id = g.id
       WHERE aga.agent_id = ? AND aga.is_active = 1 AND g.status = 'ACTIVE'
       ORDER BY g.route_category ASC, g.id ASC`,
      [agentId]
    );

    const enrichedGroups = groups.map((g) => {
      const isDaily = g.frequency === 'DAILY';
      return {
        ...g,
        cycle_type: g.frequency,
        cycle_mode: isDaily ? 'DAY_BY_DAY' : 'MONTH_BY_MONTH',
        cycle_label: isDaily ? 'Day-by-Day (Today)' : 'Month-by-Month (Current Month)',
        cycle_period_label: isDaily ? 'Daily Installment' : 'Monthly Installment',
      };
    });

    // Get members in these assigned groups with live payment & tracking note status for their respective cycle:
    // - Daily groups: c.collection_date = CURDATE() (Day-by-Day)
    // - Monthly groups: current month YEAR(collection_date) = YEAR(CURDATE()) AND MONTH(collection_date) = MONTH(CURDATE()) (Month-by-Month)
    const groupIds = groups.map((g) => g.id);
    let members = [];
    if (groupIds.length > 0) {
      const [memberRows] = await pool.query(
        `SELECT gm.group_id, gm.ticket_number, gm.joined_date, m.id as member_id, m.member_code, m.full_name, m.phone,
                m.alternate_phone, m.address, m.kyc_type, m.kyc_number,
                g.frequency as group_frequency, g.chit_type as group_chit_type, g.installment_amount as group_installment_amount,
                c.id as cycle_collection_id, c.amount as cycle_collected_amount, c.payment_method as cycle_payment_method,
                c.receipt_number as cycle_receipt_number, c.collection_date as cycle_collection_date, c.collection_time as cycle_collection_time, c.notes as collection_notes,
                atl.status as cycle_tracking_status, atl.notes as cycle_tracking_notes, atl.last_ping_time as cycle_tracking_time
         FROM group_memberships gm
         JOIN chit_groups g ON gm.group_id = g.id
         JOIN members m ON gm.member_id = m.id
         LEFT JOIN (
           SELECT c1.*
           FROM collections c1
           INNER JOIN (
             SELECT MAX(c_sub.id) as max_id
             FROM collections c_sub
             JOIN chit_groups g_sub ON c_sub.group_id = g_sub.id
             WHERE c_sub.verification_status != 'CANCELLED'
               AND (
                 (g_sub.frequency = 'DAILY' AND c_sub.collection_date = CURDATE())
                 OR
                 (g_sub.frequency = 'MONTHLY' AND YEAR(c_sub.collection_date) = YEAR(CURDATE()) AND MONTH(c_sub.collection_date) = MONTH(CURDATE()))
               )
             GROUP BY c_sub.group_id, c_sub.member_id
           ) c2 ON c1.id = c2.max_id
         ) c ON c.group_id = gm.group_id AND c.member_id = gm.member_id
         LEFT JOIN (
           SELECT atl1.*
           FROM agent_tracking_logs atl1
           INNER JOIN (
             SELECT MAX(atl_sub.id) as max_id
             FROM agent_tracking_logs atl_sub
             JOIN chit_groups g_atl ON atl_sub.group_id = g_atl.id
             WHERE (
               (g_atl.frequency = 'DAILY' AND atl_sub.tracking_date = CURDATE())
               OR
               (g_atl.frequency = 'MONTHLY' AND YEAR(atl_sub.tracking_date) = YEAR(CURDATE()) AND MONTH(atl_sub.tracking_date) = MONTH(CURDATE()))
             )
             GROUP BY atl_sub.group_id, COALESCE(atl_sub.member_id, atl_sub.stop_id)
           ) atl2 ON atl1.id = atl2.max_id
         ) atl ON atl.group_id = gm.group_id AND (atl.member_id = gm.member_id OR atl.stop_id = gm.ticket_number)
         WHERE gm.group_id IN (?) AND gm.status = 'ACTIVE'
         ORDER BY gm.group_id ASC, gm.ticket_number ASC`,
        [groupIds]
      );

      members = memberRows.map((m) => {
        const isDaily = m.group_frequency === 'DAILY';
        const isPaid = Boolean(m.cycle_collection_id) || m.cycle_tracking_status === 'PAID';
        const status = isPaid ? 'PAID' : (m.cycle_tracking_status || 'NOT_PAID');
        const notes = m.collection_notes || m.cycle_tracking_notes || (isPaid ? (isDaily ? 'Paid for today' : 'Paid for current monthly cycle') : (isDaily ? 'Default: Awaiting today installment' : 'Default: Awaiting monthly installment'));
        const statusLabel = isPaid 
          ? (isDaily ? 'Paid for Today' : 'Paid for Month')
          : (isDaily ? 'Not Paid Today' : 'Not Paid This Month');

        return {
          group_id: m.group_id,
          ticket_number: m.ticket_number,
          joined_date: m.joined_date,
          member_id: m.member_id,
          member_code: m.member_code,
          full_name: m.full_name,
          phone: m.phone,
          alternate_phone: m.alternate_phone || '',
          address: m.address || '',
          kyc_type: m.kyc_type || 'Aadhaar Card',
          kyc_number: m.kyc_number || 'Verified',
          is_paid: isPaid,
          today_status: status, // maintain backward compatibility
          cycle_status: status,
          status_label: statusLabel,
          cycle_type: m.group_frequency,
          cycle_mode: isDaily ? 'DAY_BY_DAY' : 'MONTH_BY_MONTH',
          cycle_period_label: isDaily ? 'Day-by-Day (Today)' : 'Month-by-Month (Current Month)',
          node_color: isPaid ? 'GREEN' : 'RED',
          today_notes: notes,
          cycle_notes: notes,
          receipt_number: m.cycle_receipt_number,
          collected_amount: m.cycle_collected_amount,
          payment_method: m.cycle_payment_method,
          collection_date: m.cycle_collection_date,
          collection_time: m.cycle_collection_time,
        };
      });
    }

    // Today's collections by this agent
    const [todayCollections] = await pool.execute(
      `SELECT COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount ELSE 0 END), 0) as todayCash,
              COALESCE(SUM(CASE WHEN payment_method != 'CASH' THEN amount ELSE 0 END), 0) as todayOnline,
              COALESCE(SUM(amount), 0) as todayTotal,
              COUNT(id) as totalCollectionsCount
       FROM collections
       WHERE agent_id = ? AND collection_date = CURDATE() AND verification_status != 'CANCELLED'`,
      [agentId]
    );

    const dailyGroups = enrichedGroups.filter((g) => g.frequency === 'DAILY');
    const monthlyGroups = enrichedGroups.filter((g) => g.frequency === 'MONTHLY');
    const dailyMembers = members.filter((m) => m.cycle_type === 'DAILY');
    const monthlyMembers = members.filter((m) => m.cycle_type === 'MONTHLY');

    res.status(200).json({
      success: true,
      data: {
        groups: enrichedGroups,
        members,
        summary: {
          ...todayCollections[0],
          dailyGroupsCount: dailyGroups.length,
          monthlyGroupsCount: monthlyGroups.length,
          dailyMembersCount: dailyMembers.length,
          monthlyMembersCount: monthlyMembers.length,
          dailyPaidMembersCount: dailyMembers.filter((m) => m.is_paid).length,
          monthlyPaidMembersCount: monthlyMembers.filter((m) => m.is_paid).length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
