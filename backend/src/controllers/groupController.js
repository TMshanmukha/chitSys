import { pool } from '../config/db.js';
import { z } from 'zod';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';
import { getTodayIST } from '../utils/dateUtils.js';
import { broadcastSync } from '../services/realtimeService.js';

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
    const todayIST = getTodayIST();
    const { frequency, routeCategory, chitType, status } = req.query;
    let query = `
      SELECT 
        g.id, g.group_code, g.group_name, g.chit_type, g.frequency, g.route_category,
        g.location_name, g.installment_amount, g.total_pool_amount, g.duration_periods,
        g.total_members_limit, g.foreman_commission_percent, g.max_bid_percent,
        g.start_date, g.end_date, g.status, g.created_at,
        COUNT(DISTINCT gm.id) as enrolled_members,
        COUNT(DISTINCT rs.id) as route_stops_count,
        CAST(GROUP_CONCAT(DISTINCT u.full_name SEPARATOR ', ') AS CHAR) as assigned_agents,
        CAST(GROUP_CONCAT(DISTINCT u.id SEPARATOR ', ') AS CHAR) as assigned_agent_ids,
        COALESCE((SELECT SUM(GREATEST(COALESCE(a.double_chit_reserve, 0), COALESCE(a.bid_discount, 0))) FROM auctions a WHERE a.group_id = g.id), 0) AS reserved_amount,
        COALESCE((SELECT SUM(a.bid_discount) FROM auctions a WHERE a.group_id = g.id), 0) AS total_bid_discount,
        COALESCE((SELECT SUM(ama.advance_amount - ama.recovered_amount) FROM admin_member_advances ama WHERE ama.group_id = g.id AND ama.status = 'PENDING_RECOVERY'), 0) AS total_pending_amount
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

    // Calculate exact pending dues on a per-member basis so that advance payments
    // made by one member never offset or hide the unpaid pending dues of another member
    if (rows.length > 0) {
      const groupIds = rows.map((r) => r.id);
      const [memberColls] = await pool.query(
        `SELECT 
           gm.group_id, 
           gm.member_id, 
           COALESCE(SUM(c.amount), 0) as paid_today
         FROM group_memberships gm
         JOIN chit_groups g ON g.id = gm.group_id
         LEFT JOIN collections c ON c.group_id = gm.group_id 
           AND c.member_id = gm.member_id 
           AND c.verification_status != 'CANCELLED'
           AND (
             (g.frequency = 'DAILY' AND c.collection_date = ?)
             OR (g.frequency = 'MONTHLY' AND c.collection_date >= DATE_SUB(?, INTERVAL 30 DAY))
           )
         WHERE gm.group_id IN (?) AND gm.status = 'ACTIVE'
         GROUP BY gm.group_id, gm.member_id`,
        [todayIST, todayIST, groupIds]
      );

      const groupMap = new Map(rows.map((r) => [r.id, r]));
      const groupPendingMap = new Map();

      for (const m of memberColls) {
        const g = groupMap.get(m.group_id);
        if (!g) continue;
        const inst = parseFloat(g.installment_amount || 0);
        const paid = parseFloat(m.paid_today || 0);
        // Advance payments belong strictly to future installments; cap today's credit at installment amount
        const memberPending = Math.max(0, inst - paid);
        groupPendingMap.set(m.group_id, (groupPendingMap.get(m.group_id) || 0) + memberPending);
      }

      for (const row of rows) {
        const memberPending = groupPendingMap.get(row.id) || 0;
        const currentPendingAdminAdvance = parseFloat(row.total_pending_amount || 0);
        row.total_pending_amount = memberPending + currentPendingAdminAdvance;
      }
    }

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
    // Validate required agent assignment
    if (!req.body.assigned_agent_id) {
      return res.status(400).json({
        success: false,
        message: '⚠️ Collection Agent Required: Please assign this chit scheme to an agent before creating.',
      });
    }

    let derivedFrequency = req.body.frequency;
    let derivedRouteCategory = req.body.route_category;

    if (!derivedFrequency) {
      if (derivedRouteCategory === 'MONTHLY_ROUTE') {
        derivedFrequency = 'MONTHLY';
      } else {
        derivedFrequency = 'DAILY';
      }
    }

    if (!derivedRouteCategory) {
      derivedRouteCategory = derivedFrequency === 'MONTHLY' ? 'MONTHLY_ROUTE' : 'DAILY_ROUTE';
    }

    // Monthly schemes run strictly as AUCTION_CHIT (Double Chit is exclusive to Daily schemes)
    const normalizedChitType = derivedFrequency === 'MONTHLY'
      ? 'AUCTION_CHIT'
      : (req.body.chit_type === 'DOUBLE_CHIT' ? 'DOUBLE_CHIT' : 'AUCTION_CHIT');

    const validated = groupSchema.parse({
      ...req.body,
      chit_type: normalizedChitType,
      route_category: derivedRouteCategory,
      frequency: derivedFrequency,
      installment_amount: parseFloat(req.body.installment_amount),
      total_pool_amount: parseFloat(req.body.total_pool_amount),
      duration_periods: parseInt(req.body.duration_periods, 10),
      total_members_limit: parseInt(req.body.total_members_limit || 20, 10),
      foreman_commission_percent: req.body.foreman_commission_percent ? parseFloat(req.body.foreman_commission_percent) : 5.0,
      max_bid_percent: req.body.max_bid_percent ? parseFloat(req.body.max_bid_percent) : 35.0,
      assigned_agent_id: parseInt(req.body.assigned_agent_id, 10),
    });

    const isDaily = validated.frequency === 'DAILY' || validated.route_category === 'DAILY_ROUTE';
    const typeCode = validated.chit_type === 'DOUBLE_CHIT' ? 'DBL' : 'AUC';
    const prefix = isDaily ? `DLY-${typeCode}` : `MTH-${typeCode}`;

    let finalGroupCode = (validated.group_code || '').trim().toUpperCase();

    // Check collision or generate next free code
    if (!finalGroupCode) {
      const [existingRows] = await pool.execute(
        `SELECT group_code FROM chit_groups WHERE group_code LIKE ?`,
        [`${prefix}-%`]
      );
      const usedCodes = new Set(existingRows.map((r) => (r.group_code || '').toUpperCase()));
      let num = 101;
      while (usedCodes.has(`${prefix}-${num}`)) {
        num++;
      }
      finalGroupCode = `${prefix}-${num}`;
    } else {
      const [existing] = await pool.execute(
        'SELECT id FROM chit_groups WHERE group_code = ? LIMIT 1',
        [finalGroupCode]
      );
      if (existing.length > 0) {
        // If code already exists in DB, auto-generate next collision-free code
        const [existingRows] = await pool.execute(
          `SELECT group_code FROM chit_groups WHERE group_code LIKE ?`,
          [`${prefix}-%`]
        );
        const usedCodes = new Set(existingRows.map((r) => (r.group_code || '').toUpperCase()));
        let num = 101;
        while (usedCodes.has(`${prefix}-${num}`)) {
          num++;
        }
        finalGroupCode = `${prefix}-${num}`;
      }
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

    // If an agent is assigned directly upon group creation (ensure strictly 1 active agent per group)
    if (validated.assigned_agent_id) {
      await pool.execute('UPDATE agent_group_assignments SET is_active = 0 WHERE group_id = ?', [newGroupId]);
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

    broadcastSync({
      business: 'chitfund',
      entity: 'groups',
      action: 'CREATE',
      data: {
        groupId: newGroupId,
        groupCode: finalGroupCode,
        groupName: validated.group_name,
        assignedAgentId: validated.assigned_agent_id,
      },
    });

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

export async function updateGroup(req, res, next) {
  try {
    const { id } = req.params;
    const [existingRows] = await pool.execute(
      'SELECT * FROM chit_groups WHERE id = ? LIMIT 1',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chit Scheme not found.' });
    }

    const group = existingRows[0];

    // Validate required agent assignment
    if (!req.body.assigned_agent_id) {
      return res.status(400).json({
        success: false,
        message: '⚠️ Collection Agent Required: Please assign this chit scheme to an agent.',
      });
    }

    let derivedFrequency = req.body.frequency || group.frequency;
    let derivedRouteCategory = req.body.route_category || group.route_category;

    if (!derivedFrequency) {
      derivedFrequency = derivedRouteCategory === 'MONTHLY_ROUTE' ? 'MONTHLY' : 'DAILY';
    }
    if (!derivedRouteCategory) {
      derivedRouteCategory = derivedFrequency === 'MONTHLY' ? 'MONTHLY_ROUTE' : 'DAILY_ROUTE';
    }

    const normalizedChitType = derivedFrequency === 'MONTHLY'
      ? 'AUCTION_CHIT'
      : (req.body.chit_type === 'DOUBLE_CHIT' ? 'DOUBLE_CHIT' : 'AUCTION_CHIT');

    const validated = groupSchema.parse({
      ...req.body,
      group_code: req.body.group_code || group.group_code,
      chit_type: normalizedChitType,
      route_category: derivedRouteCategory,
      frequency: derivedFrequency,
      installment_amount: parseFloat(req.body.installment_amount),
      total_pool_amount: parseFloat(req.body.total_pool_amount),
      duration_periods: parseInt(req.body.duration_periods, 10),
      total_members_limit: parseInt(req.body.total_members_limit || 20, 10),
      foreman_commission_percent: req.body.foreman_commission_percent ? parseFloat(req.body.foreman_commission_percent) : 5.0,
      max_bid_percent: req.body.max_bid_percent ? parseFloat(req.body.max_bid_percent) : 35.0,
      assigned_agent_id: parseInt(req.body.assigned_agent_id, 10),
    });

    const finalGroupCode = (validated.group_code || group.group_code).trim().toUpperCase();

    // Check collision if group_code changed
    if (finalGroupCode !== group.group_code) {
      const [colliding] = await pool.execute(
        'SELECT id FROM chit_groups WHERE group_code = ? AND id != ? LIMIT 1',
        [finalGroupCode, id]
      );
      if (colliding.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Chit Scheme code '${finalGroupCode}' is already used by another scheme.`,
        });
      }
    }

    // Update chit_groups table
    await pool.execute(
      `UPDATE chit_groups SET
        group_code = ?,
        group_name = ?,
        chit_type = ?,
        frequency = ?,
        route_category = ?,
        location_name = ?,
        installment_amount = ?,
        total_pool_amount = ?,
        duration_periods = ?,
        total_members_limit = ?,
        foreman_commission_percent = ?,
        max_bid_percent = ?,
        start_date = ?,
        end_date = ?
       WHERE id = ?`,
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
        id,
      ]
    );

    // Update agent assignment
    if (validated.assigned_agent_id) {
      await pool.execute('UPDATE agent_group_assignments SET is_active = 0 WHERE group_id = ?', [id]);
      await pool.execute(
        `INSERT INTO agent_group_assignments (agent_id, group_id, assigned_date, is_active, assigned_by)
         VALUES (?, ?, CURDATE(), 1, ?)
         ON DUPLICATE KEY UPDATE is_active = 1, agent_id = VALUES(agent_id), assigned_by = VALUES(assigned_by)`,
        [validated.assigned_agent_id, id, req.user.id]
      );
    }

    // Update enrolled members if member_ids provided
    const memberIds = Array.isArray(req.body.member_ids) ? req.body.member_ids : [];
    if (memberIds.length > 0) {
      // Check if any removed members have active collections
      const [membersWithColls] = await pool.execute(
        'SELECT DISTINCT member_id FROM collections WHERE group_id = ? AND verification_status != "CANCELLED"',
        [id]
      );
      const collMemberIds = new Set(membersWithColls.map((c) => c.member_id));

      const [currentMemberships] = await pool.execute(
        'SELECT member_id FROM group_memberships WHERE group_id = ?',
        [id]
      );

      for (const cm of currentMemberships) {
        if (!memberIds.includes(cm.member_id)) {
          if (collMemberIds.has(cm.member_id)) {
            return res.status(400).json({
              success: false,
              message: `Cannot remove member #${cm.member_id} from scheme because payment collections have already been recorded for them.`,
            });
          }
          await pool.execute('DELETE FROM group_memberships WHERE group_id = ? AND member_id = ?', [id, cm.member_id]);
          await pool.execute('DELETE FROM route_stops WHERE group_id = ? AND member_id = ?', [id, cm.member_id]);
        }
      }

      // Upsert selected members with updated sequential ticket numbers
      for (let i = 0; i < memberIds.length; i++) {
        const memberId = memberIds[i];
        const ticketNumber = i + 1;
        await pool.execute(
          `INSERT INTO group_memberships (group_id, member_id, ticket_number, joined_date, status)
           VALUES (?, ?, ?, ?, 'ACTIVE')
           ON DUPLICATE KEY UPDATE ticket_number = VALUES(ticket_number), status = 'ACTIVE'`,
          [id, memberId, ticketNumber, validated.start_date]
        );
      }

      // Refresh route stops
      await pool.execute('UPDATE agent_tracking_logs SET stop_id = NULL WHERE group_id = ?', [id]);
      await pool.execute('DELETE FROM route_stops WHERE group_id = ?', [id]);

      const [enrolledMembers] = await pool.query(
        `SELECT m.id, m.full_name, m.address, m.phone 
         FROM members m 
         WHERE m.id IN (?) 
         ORDER BY FIELD(m.id, ?)`,
        [memberIds, memberIds]
      );

      for (let i = 0; i < enrolledMembers.length; i++) {
        const m = enrolledMembers[i];
        const progress = enrolledMembers.length === 1 ? 0.5 : i / (enrolledMembers.length - 1);
        const coordX = Math.round(80 + progress * 640);
        const coordY = Math.round(180 + Math.sin(progress * Math.PI * 2) * 90);

        await pool.execute(
          `INSERT INTO route_stops (group_id, member_id, stop_order, stop_name, landmark, expected_amount, coord_x, coord_y)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            m.id,
            i + 1,
            `${m.full_name} (Ticket #${i + 1})`,
            m.address || `${finalGroupCode} Route Stop #${i + 1}`,
            validated.installment_amount,
            coordX,
            coordY,
          ]
        );
      }
    }

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_CHIT_GROUP',
      resource: 'CHIT_GROUPS',
      details: {
        groupId: id,
        code: finalGroupCode,
        name: validated.group_name,
        type: validated.chit_type,
        enrolledCount: memberIds.length,
      },
    });

    createNotification({
      targetRole: 'ALL',
      title: `✏️ Chit Scheme Updated: ${validated.group_name}`,
      message: `${validated.group_name} (${finalGroupCode}) details have been updated by Admin.`,
      type: 'SYSTEM',
      link: '/admin/chit-groups',
    }).catch(() => {});

    broadcastSync({
      business: 'chitfund',
      entity: 'groups',
      action: 'UPDATE',
      data: {
        groupId: Number(id),
        groupCode: finalGroupCode,
        groupName: validated.group_name,
        assignedAgentId: validated.assigned_agent_id,
      },
    });

    res.status(200).json({
      success: true,
      message: `Chit Scheme '${validated.group_name}' (${finalGroupCode}) updated successfully.`,
      data: {
        id: Number(id),
        group_code: finalGroupCode,
        group_name: validated.group_name,
      },
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

    // Enrolled members with cumulative collections, prize lifts, and dividends strictly in this chit group
    const [membersRows] = await pool.execute(
      `SELECT gm.id as membership_id, gm.ticket_number, gm.joined_date, gm.status,
              gm.is_prized, gm.prized_period,
              m.id as member_id, m.member_code, m.full_name, m.phone, m.kyc_type, m.kyc_number,
              COALESCE((
                SELECT SUM(c.amount) FROM collections c 
                WHERE c.group_id = gm.group_id AND c.member_id = gm.member_id AND c.verification_status != 'CANCELLED'
              ), 0) as total_paid_in_group,
              COALESCE((
                SELECT COUNT(c.id) FROM collections c 
                WHERE c.group_id = gm.group_id AND c.member_id = gm.member_id AND c.verification_status != 'CANCELLED'
              ), 0) as receipts_count,
              COALESCE((
                SELECT a.net_payable_amount FROM auctions a 
                WHERE a.group_id = gm.group_id AND a.winning_member_id = gm.member_id 
                LIMIT 1
              ), 0) as prize_won_in_group,
              COALESCE((
                SELECT SUM(md.dividend_amount) FROM member_dividends md 
                WHERE md.group_id = gm.group_id AND md.member_id = gm.member_id
              ), 0) as dividends_credited_in_group,
              (
                SELECT MAX(c.collection_date) FROM collections c 
                WHERE c.group_id = gm.group_id AND c.member_id = gm.member_id AND c.verification_status != 'CANCELLED'
              ) as last_payment_date
       FROM group_memberships gm
       JOIN members m ON gm.member_id = m.id
       WHERE gm.group_id = ?
       ORDER BY gm.ticket_number ASC`,
      [id]
    );

    const members = membersRows.map((m) => {
      const paid = parseFloat(m.total_paid_in_group || 0);
      const prize = parseFloat(m.prize_won_in_group || 0);
      const dividends = parseFloat(m.dividends_credited_in_group || 0);
      const totalReceived = prize + dividends;
      return {
        ...m,
        total_paid_in_group: paid,
        prize_won_in_group: prize,
        dividends_credited_in_group: dividends,
        total_received_in_group: totalReceived,
        net_balance_in_group: totalReceived - paid,
      };
    });

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
    let totalDoubleChitReserve = 0;

    for (const a of auctions) {
      const divPerMember = parseFloat(a.dividend_per_member) || 0;
      const memCount = group.total_members_limit || 20;
      totalDividendsDistributed += divPerMember * memCount;
      totalDoubleChitReserve += parseFloat(a.double_chit_reserve) || 0;
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
          totalDoubleChitReserve,
          totalPrizeDisbursed,
          receiptsCount: collections.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function completeGroup(req, res, next) {
  try {
    const { id } = req.params;

    const [groupRows] = await pool.execute('SELECT * FROM chit_groups WHERE id = ?', [id]);
    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chit group not found.' });
    }
    const group = groupRows[0];

    if (group.status === 'COMPLETED' || group.status === 'INACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'This chit group is already marked as completed/inactive.',
      });
    }

    const isDaily = group.frequency === 'DAILY' || group.route_category === 'DAILY_ROUTE';
    const totalPeriods = parseInt(group.duration_periods, 10) || (isDaily ? 100 : 20);
    const installmentAmt = parseFloat(group.installment_amount) || 0;

    // Check elapsed duration
    let elapsedPeriods = 0;
    if (group.start_date) {
      const start = new Date(group.start_date);
      const now = new Date();
      if (isDaily) {
        const diffMs = now.getTime() - start.getTime();
        elapsedPeriods = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        elapsedPeriods = Math.max(0, diffMonths);
      }
    }
    const periodsRemaining = Math.max(0, totalPeriods - elapsedPeriods);
    if (periodsRemaining > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete chit scheme: ${periodsRemaining} ${isDaily ? 'day(s)' : 'month(s)'} are still remaining until maturity. Total duration of ${totalPeriods} ${isDaily ? 'days' : 'months'} must be completed.`,
        periodsRemaining,
      });
    }

    // Check member dues
    const [members] = await pool.execute(
      `SELECT gm.member_id, gm.ticket_number, m.full_name, m.phone,
              COALESCE((
                SELECT SUM(c.amount) FROM collections c 
                WHERE c.group_id = gm.group_id AND c.member_id = gm.member_id AND c.verification_status != 'CANCELLED'
              ), 0) as total_paid
       FROM group_memberships gm
       JOIN members m ON gm.member_id = m.id
       WHERE gm.group_id = ?`,
      [id]
    );

    const totalRequiredPerMember = totalPeriods * installmentAmt;
    const membersWithDue = [];
    let totalPendingAmount = 0;

    for (const m of members) {
      const paid = parseFloat(m.total_paid || 0);
      const due = Math.max(0, totalRequiredPerMember - paid);
      if (due > 0) {
        membersWithDue.push({
          member_id: m.member_id,
          ticket_number: m.ticket_number,
          full_name: m.full_name,
          phone: m.phone,
          total_paid: paid,
          pending_due: due,
        });
        totalPendingAmount += due;
      }
    }

    if (membersWithDue.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete chit scheme: ${membersWithDue.length} subscriber(s) have unpaid dues totaling ₹${totalPendingAmount.toLocaleString('en-IN')}. Every subscriber must have ₹0 due.`,
        membersWithDue,
        totalPendingAmount,
      });
    }

    // Mark chit as COMPLETED
    await pool.execute(
      `UPDATE chit_groups SET status = 'COMPLETED', end_date = COALESCE(end_date, CURDATE()) WHERE id = ?`,
      [id]
    );
    await pool.execute(
      `UPDATE group_memberships SET status = 'COMPLETED' WHERE group_id = ?`,
      [id]
    );
    await pool.execute(
      `UPDATE agent_group_assignments SET is_active = 0 WHERE group_id = ?`,
      [id]
    );

    await recordAuditLog({
      user_id: req.user?.id || 1,
      action: 'COMPLETE_CHIT_GROUP',
      entity: 'chit_groups',
      entity_id: id,
      details: `Chit Group ${group.group_code} marked as COMPLETED.`,
    });

    broadcastSync({
      business: 'chitfund',
      entity: 'groups',
      action: 'COMPLETE',
      data: { groupId: id, groupCode: group.group_code },
    });

    res.status(200).json({
      success: true,
      message: `Chit Scheme '${group.group_name}' (${group.group_code}) successfully completed and moved to inactive schemes.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleGroupStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const [groupRows] = await pool.execute('SELECT * FROM chit_groups WHERE id = ? LIMIT 1', [id]);
    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chit scheme not found.' });
    }
    const group = groupRows[0];

    if (group.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'This chit scheme has been completed and its status cannot be modified.',
      });
    }

    const newStatus = status ? status.toUpperCase() : (group.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');

    if (!['ACTIVE', 'INACTIVE'].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'ACTIVE' or 'INACTIVE'.",
      });
    }

    await pool.execute(
      'UPDATE chit_groups SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, id]
    );

    await recordAuditLog({
      userId: req.user?.id || 1,
      action: 'TOGGLE_CHIT_GROUP_STATUS',
      resource: 'CHIT_GROUPS',
      details: {
        groupId: id,
        groupCode: group.group_code,
        groupName: group.group_name,
        previousStatus: group.status,
        newStatus,
      },
    });

    broadcastSync({
      business: 'chitfund',
      entity: 'groups',
      action: 'STATUS_CHANGE',
      data: {
        groupId: id,
        groupCode: group.group_code,
        status: newStatus,
      },
    });

    res.status(200).json({
      success: true,
      message: `Chit Scheme '${group.group_name}' (${group.group_code}) marked as ${newStatus === 'INACTIVE' ? 'Inactive' : 'Active'} successfully.`,
      data: {
        id: Number(id),
        status: newStatus,
      },
    });
  } catch (error) {
    next(error);
  }
}
