import { pool } from '../config/db.js';
import { z } from 'zod';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';

const groupSchema = z.object({
  group_code: z.string().optional(),
  group_name: z.string().min(3, 'Group name is required'),
  chit_type: z.enum(['DAILY_CHIT', 'AUCTION_CHIT', 'DOUBLE_CHIT']).default('DAILY_CHIT'),
  route_category: z.enum(['DAILY_ROUTE', 'MONTHLY_ROUTE']).default('DAILY_ROUTE'),
  frequency: z.enum(['DAILY', 'MONTHLY']).default('DAILY'),
  location_name: z.string().min(2, 'Location/Route name is required'),
  installment_amount: z.number().positive('Installment amount must be positive'),
  total_pool_amount: z.number().positive('Total pool amount must be positive'),
  duration_periods: z.number().int().positive('Duration must be positive'),
  total_members_limit: z.number().int().positive().default(20),
  foreman_commission_percent: z.number().min(0).max(100).default(5.0),
  max_bid_percent: z.number().min(0).max(100).default(35.0),
  start_date: z.string().min(8, 'Start date is required'),
  end_date: z.string().optional().nullable(),
  assigned_agent_id: z.number().int().optional().nullable(),
  member_ids: z.array(z.number().int()).optional().default([]),
});

export async function listGroups(req, res, next) {
  try {
    const { frequency, routeCategory, chitType, status } = req.query;
    let query = `
      SELECT 
        g.id, g.group_code, g.group_name, g.chit_type, g.frequency, g.route_category,
        g.location_name, g.installment_amount, g.total_pool_amount, g.duration_periods,
        g.total_members_limit, g.foreman_commission_percent, g.max_bid_percent,
        g.start_date, g.end_date, g.status, g.created_at,
        COUNT(DISTINCT gm.id) as enrolled_members,
        COUNT(DISTINCT rs.id) as route_stops_count,
        GROUP_CONCAT(DISTINCT u.full_name SEPARATOR ', ') as assigned_agents,
        GROUP_CONCAT(DISTINCT u.id SEPARATOR ', ') as assigned_agent_ids
      FROM chit_groups g
      LEFT JOIN group_memberships gm ON g.id = gm.group_id
      LEFT JOIN route_stops rs ON g.id = rs.group_id
      LEFT JOIN agent_group_assignments aga ON g.id = aga.group_id AND aga.is_active = 1
      LEFT JOIN users u ON aga.agent_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (frequency) {
      conditions.push('g.frequency = ?');
      params.push(frequency.toUpperCase());
    }
    if (routeCategory) {
      conditions.push('g.route_category = ?');
      params.push(routeCategory.toUpperCase());
    }
    if (chitType) {
      conditions.push('g.chit_type = ?');
      params.push(chitType.toUpperCase());
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
    // Derive frequency & route_category - Supports Daily Auction Chit, Daily Double Chit, Daily Standard Chit, and Monthly counterparts
    let derivedFrequency = req.body.frequency;
    let derivedRouteCategory = req.body.route_category;

    if (!derivedFrequency) {
      if (derivedRouteCategory === 'MONTHLY_ROUTE') {
        derivedFrequency = 'MONTHLY';
      } else if (derivedRouteCategory === 'DAILY_ROUTE') {
        derivedFrequency = 'DAILY';
      } else {
        derivedFrequency = req.body.chit_type === 'DAILY_CHIT' ? 'DAILY' : 'MONTHLY';
      }
    }

    if (!derivedRouteCategory) {
      derivedRouteCategory = derivedFrequency === 'MONTHLY' ? 'MONTHLY_ROUTE' : 'DAILY_ROUTE';
    }

    const validated = groupSchema.parse({
      ...req.body,
      route_category: derivedRouteCategory,
      frequency: derivedFrequency,
      installment_amount: parseFloat(req.body.installment_amount),
      total_pool_amount: parseFloat(req.body.total_pool_amount),
      duration_periods: parseInt(req.body.duration_periods, 10),
      total_members_limit: parseInt(req.body.total_members_limit || 20, 10),
      foreman_commission_percent: req.body.foreman_commission_percent ? parseFloat(req.body.foreman_commission_percent) : 5.0,
      max_bid_percent: req.body.max_bid_percent ? parseFloat(req.body.max_bid_percent) : 35.0,
      assigned_agent_id: req.body.assigned_agent_id ? parseInt(req.body.assigned_agent_id, 10) : null,
    });

    let finalGroupCode = validated.group_code;
    if (!finalGroupCode || finalGroupCode.trim() === '') {
      const isDaily = validated.frequency === 'DAILY' || validated.route_category === 'DAILY_ROUTE';
      const typeCode = validated.chit_type === 'DOUBLE_CHIT' ? 'DBL' : validated.chit_type === 'AUCTION_CHIT' ? 'AUC' : 'STD';
      const prefix = isDaily ? `DLY-${typeCode}` : `MTH-${typeCode}`;
      finalGroupCode = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
    }
    finalGroupCode = finalGroupCode.toUpperCase();

    const [existing] = await pool.execute(
      'SELECT id FROM chit_groups WHERE group_code = ? LIMIT 1',
      [finalGroupCode]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Chit Group with code '${finalGroupCode}' already exists.`,
      });
    }

    const [insertResult] = await pool.execute(
      `INSERT INTO chit_groups 
        (group_code, group_name, chit_type, frequency, route_category, location_name, 
         installment_amount, total_pool_amount, duration_periods, total_members_limit, 
         foreman_commission_percent, max_bid_percent, start_date, end_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [
        finalGroupCode,
        validated.group_name,
        validated.chit_type,
        validated.frequency,
        validated.route_category,
        validated.location_name,
        validated.installment_amount,
        validated.total_pool_amount,
        validated.duration_periods,
        validated.total_members_limit,
        validated.foreman_commission_percent,
        validated.max_bid_percent,
        validated.start_date,
        validated.end_date || null,
        req.user.id,
      ]
    );

    const newGroupId = insertResult.insertId;

    // If an agent is assigned directly upon group creation
    if (validated.assigned_agent_id) {
      await pool.execute(
        `INSERT INTO agent_group_assignments (agent_id, group_id, assigned_date, is_active, assigned_by)
         VALUES (?, ?, CURDATE(), 1, ?)
         ON DUPLICATE KEY UPDATE is_active = 1, assigned_by = VALUES(assigned_by)`,
        [validated.assigned_agent_id, newGroupId, req.user.id]
      );
    }

    // If member_ids are provided, atomically enroll all members into this chit scheme
    const memberIds = Array.isArray(req.body.member_ids) ? req.body.member_ids : [];
    if (memberIds.length > 0) {
      for (let i = 0; i < memberIds.length; i++) {
        const memberId = memberIds[i];
        const ticketNumber = i + 1;
        await pool.execute(
          `INSERT INTO group_memberships (group_id, member_id, ticket_number, joined_date, status)
           VALUES (?, ?, ?, ?, 'ACTIVE')
           ON DUPLICATE KEY UPDATE status = 'ACTIVE'`,
          [newGroupId, memberId, ticketNumber, validated.start_date]
        );
      }

      // Fetch enrolled members to generate accurate route stops along the route
      const [enrolledMembers] = await pool.query(
        `SELECT m.id, m.full_name, m.address, m.phone 
         FROM members m 
         WHERE m.id IN (?) 
         ORDER BY FIELD(m.id, ?)`,
        [memberIds, memberIds]
      );

      // Generate route stops for each enrolled subscriber
      for (let i = 0; i < enrolledMembers.length; i++) {
        const m = enrolledMembers[i];
        const progress = enrolledMembers.length === 1 ? 0.5 : i / (enrolledMembers.length - 1);
        const coordX = Math.round(80 + progress * 640);
        const coordY = Math.round(180 + Math.sin(progress * Math.PI * 2) * 90);

        await pool.execute(
          `INSERT INTO route_stops (group_id, stop_order, stop_name, landmark, expected_amount, coord_x, coord_y)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            newGroupId,
            i + 1,
            `${m.full_name} (Ticket #${i + 1})`,
            m.address || `${finalGroupCode} Route Stop #${i + 1}`,
            validated.installment_amount,
            coordX,
            coordY,
          ]
        );
      }
    } else {
      // Fallback: Generate initial placeholder waypoint stops if members were not selected
      const numStops = Math.min(validated.total_members_limit, 8);
      for (let i = 1; i <= numStops; i++) {
        const progress = (i - 1) / Math.max(1, numStops - 1);
        const coordX = Math.round(80 + progress * 640);
        const coordY = Math.round(180 + Math.sin(progress * Math.PI * 2) * 90);

        await pool.execute(
          `INSERT INTO route_stops (group_id, stop_order, stop_name, landmark, expected_amount, coord_x, coord_y)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            newGroupId,
            i,
            `Ticket #${i}`,
            `${finalGroupCode} Chit Node #${i}`,
            validated.installment_amount,
            coordX,
            coordY,
          ]
        );
      }
    }

    await recordAuditLog({
      userId: req.user.id,
      action: 'CREATE_CHIT_GROUP',
      resource: 'CHIT_GROUPS',
      details: {
        groupId: newGroupId,
        code: validated.group_code,
        type: validated.chit_type,
        routeCategory: validated.route_category,
        enrolledCount: memberIds.length,
      },
    });

    // Dispatch real-time live notification
    createNotification({
      targetRole: 'ALL',
      title: `🚀 Chit Scheme Initialized: ${validated.group_name}`,
      message: `${validated.chit_type.replace('_', ' ')} (${finalGroupCode}) successfully created with ${memberIds.length} enrolled members. Total Pool: ₹${Number(validated.total_pool_amount).toLocaleString('en-IN')}.`,
      type: 'SYSTEM',
      link: '/admin/chit-groups',
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: `${validated.chit_type.replace('_', ' ')} (${finalGroupCode}) created with ${memberIds.length} members enrolled successfully.`,
      groupId: newGroupId,
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

    // Enrolled members with cumulative collections per member in this group
    const [members] = await pool.execute(
      `SELECT gm.id as membership_id, gm.ticket_number, gm.joined_date, gm.status,
              gm.is_prized, gm.prized_period,
              m.id as member_id, m.member_code, m.full_name, m.phone, m.kyc_type, m.kyc_number,
              COALESCE(SUM(c.amount), 0) as total_paid_in_group,
              COUNT(c.id) as receipts_count
       FROM group_memberships gm
       JOIN members m ON gm.member_id = m.id
       LEFT JOIN collections c ON c.group_id = gm.group_id AND c.member_id = gm.member_id AND c.verification_status != 'CANCELLED'
       WHERE gm.group_id = ?
       GROUP BY gm.id, m.id
       ORDER BY gm.ticket_number ASC`,
      [id]
    );

    // Assigned Agents
    const [agents] = await pool.execute(
      `SELECT aga.id as assignment_id, aga.assigned_date, u.id as agent_id, u.full_name, u.phone, u.username
       FROM agent_group_assignments aga
       JOIN users u ON aga.agent_id = u.id
       WHERE aga.group_id = ? AND aga.is_active = 1`,
      [id]
    );

    // Route Stops for 2D diagram (Assigned Chit Nodes)
    const [stops] = await pool.execute(
      `SELECT rs.*, m.full_name as member_name, m.phone as member_phone
       FROM route_stops rs
       LEFT JOIN members m ON rs.member_id = m.id
       WHERE rs.group_id = ?
       ORDER BY rs.stop_order ASC`,
      [id]
    );

    // Full Auctions and Draws History
    const [auctions] = await pool.execute(
      `SELECT a.*, m.full_name as winner_name, m.phone as winner_phone,
              COALESCE(gm.ticket_number, 0) as winning_ticket_number
       FROM auctions a
       LEFT JOIN members m ON a.winning_member_id = m.id
       LEFT JOIN group_memberships gm ON a.group_id = gm.group_id AND a.winning_member_id = gm.member_id
       WHERE a.group_id = ?
       ORDER BY a.period_number DESC, a.draw_number DESC`,
      [id]
    );

    // All Collections & Receipts Ledger for this chit
    const [collections] = await pool.execute(
      `SELECT c.id, c.receipt_number, c.collection_date, c.collection_time, c.amount,
              c.payment_method, c.payment_reference, c.notes,
              m.full_name as member_name, m.phone as member_phone,
              COALESCE(gm.ticket_number, 0) as ticket_number,
              u.full_name as agent_name
       FROM collections c
       JOIN members m ON c.member_id = m.id
       LEFT JOIN group_memberships gm ON c.group_id = gm.group_id AND c.member_id = gm.member_id
       JOIN users u ON c.agent_id = u.id
       WHERE c.group_id = ? AND c.verification_status != 'CANCELLED'
       ORDER BY c.collection_date DESC, c.collection_time DESC, c.id DESC`,
      [id]
    );

    // Financial Metrics Summary
    let totalCollected = 0;
    let totalCash = 0;
    let totalDigital = 0;

    for (const c of collections) {
      const amt = parseFloat(c.amount) || 0;
      totalCollected += amt;
      if (c.payment_method === 'CASH') totalCash += amt;
      else totalDigital += amt;
    }

    let totalDividendsDistributed = 0;
    let totalPrizeDisbursed = 0;

    for (const a of auctions) {
      const divPerMember = parseFloat(a.dividend_per_member) || 0;
      const memCount = group.total_members_limit || 20;
      totalDividendsDistributed += divPerMember * memCount;
      if (a.payout_status === 'DISBURSED') {
        totalPrizeDisbursed += parseFloat(a.net_payable_amount) || 0;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...group,
        members,
        agents,
        stops,
        auctions,
        collections,
        financials: {
          totalCollected,
          totalCash,
          totalDigital,
          totalDividendsDistributed,
          totalPrizeDisbursed,
          receiptsCount: collections.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
