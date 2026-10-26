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
    const [rows] = await pool.execute(`
      SELECT 
        u.id, u.full_name, u.username, u.phone, u.is_active, u.last_login_at, u.created_at,
        COUNT(DISTINCT aga.id) as assigned_groups_count,
        GROUP_CONCAT(DISTINCT g.group_name SEPARATOR ', ') as assigned_group_names
      FROM users u
      LEFT JOIN agent_group_assignments aga ON u.id = aga.agent_id AND aga.is_active = 1
      LEFT JOIN chit_groups g ON aga.group_id = g.id
      WHERE u.role = 'COLLECTION_AGENT'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

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
       VALUES (?, ?, ?, 'COLLECTION_AGENT', ?, 1, ?)`,
      [
        validated.full_name,
        validated.username.toLowerCase(),
        passwordHash,
        validated.phone,
        req.user.id,
      ]
    );

    await recordAuditLog({
      userId: req.user.id,
      action: 'CREATE_COLLECTION_AGENT',
      resource: 'USERS',
      details: { agentId: insertResult.insertId, username: validated.username },
    });

    res.status(201).json({
      success: true,
      message: 'Collection Agent account created successfully.',
      agentId: insertResult.insertId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Invalid agent data',
      });
    }
    next(error);
  }
}

export async function toggleAgentStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    await pool.execute(
      'UPDATE users SET is_active = ? WHERE id = ? AND role = "COLLECTION_AGENT"',
      [is_active ? 1 : 0, id]
    );

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_AGENT_STATUS',
      resource: 'USERS',
      details: { agentId: id, status: is_active ? 'ACTIVE' : 'INACTIVE' },
    });

    res.status(200).json({
      success: true,
      message: `Agent account ${is_active ? 'activated' : 'deactivated'} successfully.`,
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
      `SELECT g.id, g.group_code, g.group_name, g.frequency, g.location_name,
              g.installment_amount, g.total_pool_amount, g.status
       FROM agent_group_assignments aga
       JOIN chit_groups g ON aga.group_id = g.id
       WHERE aga.agent_id = ? AND aga.is_active = 1 AND g.status = 'ACTIVE'`,
      [agentId]
    );

    // Get members in these assigned groups
    const groupIds = groups.map((g) => g.id);
    let members = [];
    if (groupIds.length > 0) {
      const [memberRows] = await pool.query(
        `SELECT gm.group_id, gm.ticket_number, m.id as member_id, m.member_code, m.full_name, m.phone, m.address
         FROM group_memberships gm
         JOIN members m ON gm.member_id = m.id
         WHERE gm.group_id IN (?) AND gm.status = 'ACTIVE'
         ORDER BY gm.ticket_number ASC`,
        [groupIds]
      );
      members = memberRows;
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

    res.status(200).json({
      success: true,
      data: {
        groups,
        members,
        summary: todayCollections[0],
      },
    });
  } catch (error) {
    next(error);
  }
}
