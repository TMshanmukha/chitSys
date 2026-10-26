import { pool } from '../config/db.js';
import { z } from 'zod';
import { recordAuditLog } from '../services/authService.js';

const groupSchema = z.object({
  group_code: z.string().min(2, 'Group code is required'),
  group_name: z.string().min(3, 'Group name is required'),
  frequency: z.enum(['DAILY', 'MONTHLY']).default('DAILY'),
  location_name: z.string().min(2, 'Location name is required'),
  installment_amount: z.number().positive('Installment amount must be positive'),
  total_pool_amount: z.number().positive('Total pool amount must be positive'),
  duration_periods: z.number().int().positive('Duration must be positive'),
  total_members_limit: z.number().int().positive().default(20),
  start_date: z.string().min(8, 'Start date is required'),
  end_date: z.string().optional().nullable(),
});

export async function listGroups(req, res, next) {
  try {
    const { frequency, status } = req.query;
    let query = `
      SELECT 
        g.id, g.group_code, g.group_name, g.frequency, g.location_name,
        g.installment_amount, g.total_pool_amount, g.duration_periods,
        g.total_members_limit, g.start_date, g.end_date, g.status,
        g.created_at,
        COUNT(DISTINCT gm.id) as enrolled_members,
        GROUP_CONCAT(DISTINCT u.full_name SEPARATOR ', ') as assigned_agents
      FROM chit_groups g
      LEFT JOIN group_memberships gm ON g.id = gm.group_id
      LEFT JOIN agent_group_assignments aga ON g.id = aga.group_id AND aga.is_active = 1
      LEFT JOIN users u ON aga.agent_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (frequency) {
      conditions.push('g.frequency = ?');
      params.push(frequency.toUpperCase());
    }
    if (status) {
      conditions.push('g.status = ?');
      params.push(status.toUpperCase());
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY g.id ORDER BY g.created_at DESC';

    const [rows] = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function createGroup(req, res, next) {
  try {
    const validated = groupSchema.parse({
      ...req.body,
      installment_amount: parseFloat(req.body.installment_amount),
      total_pool_amount: parseFloat(req.body.total_pool_amount),
      duration_periods: parseInt(req.body.duration_periods, 10),
      total_members_limit: parseInt(req.body.total_members_limit || 20, 10),
    });

    const [existing] = await pool.execute(
      'SELECT id FROM chit_groups WHERE group_code = ? LIMIT 1',
      [validated.group_code]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Chit Group with code '${validated.group_code}' already exists.`,
      });
    }

    const [insertResult] = await pool.execute(
      `INSERT INTO chit_groups 
        (group_code, group_name, frequency, location_name, installment_amount, total_pool_amount, duration_periods, total_members_limit, start_date, end_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [
        validated.group_code.toUpperCase(),
        validated.group_name,
        validated.frequency,
        validated.location_name,
        validated.installment_amount,
        validated.total_pool_amount,
        validated.duration_periods,
        validated.total_members_limit,
        validated.start_date,
        validated.end_date || null,
        req.user.id,
      ]
    );

    await recordAuditLog({
      userId: req.user.id,
      action: 'CREATE_CHIT_GROUP',
      resource: 'CHIT_GROUPS',
      details: { groupId: insertResult.insertId, code: validated.group_code },
    });

    res.status(201).json({
      success: true,
      message: 'Chit Group created successfully.',
      groupId: insertResult.insertId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Invalid group data',
      });
    }
    next(error);
  }
}

export async function getGroupDetails(req, res, next) {
  try {
    const { id } = req.params;
    const [groupRows] = await pool.execute(
      'SELECT * FROM chit_groups WHERE id = ? LIMIT 1',
      [id]
    );

    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chit Group not found.' });
    }

    const group = groupRows[0];

    // Enrolled members
    const [members] = await pool.execute(
      `SELECT gm.id as membership_id, gm.ticket_number, gm.joined_date, gm.status,
              m.id as member_id, m.member_code, m.full_name, m.phone, m.address
       FROM group_memberships gm
       JOIN members m ON gm.member_id = m.id
       WHERE gm.group_id = ?
       ORDER BY gm.ticket_number ASC`,
      [id]
    );

    // Assigned Agents
    const [agents] = await pool.execute(
      `SELECT aga.id as assignment_id, aga.assigned_date, u.id as agent_id, u.full_name, u.phone
       FROM agent_group_assignments aga
       JOIN users u ON aga.agent_id = u.id
       WHERE aga.group_id = ? AND aga.is_active = 1`,
      [id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...group,
        members,
        agents,
      },
    });
  } catch (error) {
    next(error);
  }
}
