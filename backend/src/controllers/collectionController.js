import crypto from 'crypto';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';

const collectionSchema = z.object({
  group_id: z.number().int().positive('Chit Group selection is required'),
  member_id: z.number().int().positive('Member selection is required'),
  amount: z.number().positive('Collection amount must be greater than zero'),
  payment_method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE']).default('CASH'),
  payment_reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  agent_id: z.number().int().optional(),
});

export async function listCollections(req, res, next) {
  try {
    const { date, groupId, agentId, paymentMethod } = req.query;
    let query = `
      SELECT 
        c.id, c.receipt_number, c.amount, c.payment_method, c.payment_reference,
        c.collection_date, c.collection_time, c.verification_status, c.notes, c.created_at,
        g.group_name, g.group_code, g.frequency,
        m.full_name as member_name, m.phone as member_phone, m.member_code,
        u.full_name as agent_name, u.username as agent_username
      FROM collections c
      JOIN chit_groups g ON c.group_id = g.id
      JOIN members m ON c.member_id = m.id
      JOIN users u ON c.agent_id = u.id
    `;
    const params = [];
    const conditions = [];

    // If logged in as agent, restrict to agent's own collections
    if (req.user.role === 'COLLECTION_AGENT') {
      conditions.push('c.agent_id = ?');
      params.push(req.user.id);
    } else if (agentId) {
      conditions.push('c.agent_id = ?');
      params.push(agentId);
    }

    if (date) {
      conditions.push('c.collection_date = ?');
      params.push(date);
    }
    if (groupId) {
      conditions.push('c.group_id = ?');
      params.push(groupId);
    }
    if (paymentMethod) {
      conditions.push('c.payment_method = ?');
      params.push(paymentMethod.toUpperCase());
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY c.collection_date DESC, c.collection_time DESC LIMIT 150';

    const [rows] = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function recordCollection(req, res, next) {
  try {
    const validated = collectionSchema.parse({
      ...req.body,
      group_id: parseInt(req.body.group_id, 10),
      member_id: parseInt(req.body.member_id, 10),
      amount: parseFloat(req.body.amount),
      agent_id: req.body.agent_id ? parseInt(req.body.agent_id, 10) : undefined,
    });

    // Determine agent ID: if agent is logged in, use their ID; if admin, allow specifying or default to admin
    const recordingAgentId =
      req.user.role === 'COLLECTION_AGENT' ? req.user.id : (validated.agent_id || req.user.id);

    // 1. Fetch Chit Group details to verify frequency rules
    const [groupRows] = await pool.execute(
      'SELECT id, group_name, frequency, installment_amount FROM chit_groups WHERE id = ?',
      [validated.group_id]
    );
    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chit group not found.' });
    }
    const chitGroup = groupRows[0];

    // 2. Validate Monthly Chit Collection Rules:
    // "monthly chits is only collected only one time in a month on 1st of every month"
    if (chitGroup.frequency === 'MONTHLY') {
      // Check A: Member can only pay ONCE per month
      const [existingThisMonth] = await pool.execute(
        `SELECT id, receipt_number, amount, collection_date 
         FROM collections 
         WHERE group_id = ? AND member_id = ? AND verification_status != 'CANCELLED'
           AND YEAR(collection_date) = YEAR(CURDATE()) AND MONTH(collection_date) = MONTH(CURDATE())
         LIMIT 1`,
        [validated.group_id, validated.member_id]
      );

      if (existingThisMonth.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Monthly installment has already been collected for this subscriber for the current month (Receipt #${existingThisMonth[0].receipt_number}). Monthly chits are collected only one time in a month.`,
        });
      }

      // Check B: Collection must be on 1st of month (allow admin override or test bypass)
      const isFirstDay = new Date().getDate() === 1;
      const allowOffCycle = req.body.allow_off_cycle || req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN';
      if (!isFirstDay && !allowOffCycle && req.user.role === 'COLLECTION_AGENT') {
        return res.status(400).json({
          success: false,
          message: 'Monthly chits are scheduled to be collected strictly on the 1st of every month. Next collection will open on the 1st.',
        });
      }
    }

    // Generate unique receipt number: REC-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const receiptNumber = `REC-${dateStr}-${randSuffix}`;

    const [insertResult] = await pool.execute(
      `INSERT INTO collections 
        (receipt_number, group_id, member_id, agent_id, amount, payment_method, payment_reference, collection_date, collection_time, verification_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), CURTIME(), 'PENDING_RECONCILIATION', ?)`,
      [
        receiptNumber,
        validated.group_id,
        validated.member_id,
        recordingAgentId,
        validated.amount,
        validated.payment_method,
        validated.payment_reference || null,
        validated.notes || null,
      ]
    );

    // Also synchronize agent tracking log: set this member node to PAID immediately
    try {
      let validStopId = null;
      const [stopRows] = await pool.query(
        'SELECT id FROM route_stops WHERE group_id = ? AND member_id = ? LIMIT 1',
        [validated.group_id, validated.member_id]
      );
      if (stopRows.length > 0) {
        validStopId = stopRows[0].id;
      }

      await pool.execute(
        `INSERT INTO agent_tracking_logs (agent_id, group_id, member_id, stop_id, tracking_date, status, last_ping_time, notes)
         VALUES (?, ?, ?, ?, CURDATE(), 'PAID', CURTIME(), ?)`,
        [recordingAgentId, validated.group_id, validated.member_id, validStopId, validated.notes || 'Paid in field']
      );
    } catch (e) {
      console.error('Tracking log sync warning:', e.message);
    }

    await recordAuditLog({
      userId: req.user.id,
      action: 'RECORD_COLLECTION',
      resource: 'COLLECTIONS',
      details: {
        receiptNumber,
        amount: validated.amount,
        groupId: validated.group_id,
        memberId: validated.member_id,
        paymentMethod: validated.payment_method,
      },
    });

    createNotification({
      targetRole: 'ADMIN',
      title: `💰 Payment Received: ₹${Number(validated.amount).toLocaleString('en-IN')}`,
      message: `Receipt #${receiptNumber} collected via ${validated.payment_method} for Group #${validated.group_id}.`,
      type: 'COLLECTION',
      link: '/admin/collections',
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Collection recorded successfully.',
      receipt: {
        id: insertResult.insertId,
        receiptNumber,
        amount: validated.amount,
        paymentMethod: validated.payment_method,
        date: new Date().toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Invalid collection data',
      });
    }
    next(error);
  }
}

export async function getCollectionSummary(req, res, next) {
  try {
    const [[todayRow]] = await pool.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount ELSE 0 END), 0) as todayCash,
        COALESCE(SUM(CASE WHEN payment_method != 'CASH' THEN amount ELSE 0 END), 0) as todayOnline,
        COALESCE(SUM(amount), 0) as todayTotal,
        COUNT(id) as todayCount
      FROM collections
      WHERE collection_date = CURDATE() AND verification_status != 'CANCELLED'
    `);

    const [[totalExpectedRow]] = await pool.execute(`
      SELECT COALESCE(SUM(g.installment_amount * (
        SELECT COUNT(gm.id) FROM group_memberships gm WHERE gm.group_id = g.id AND gm.status = 'ACTIVE'
      )), 0) as expectedDailyTarget
      FROM chit_groups g
      WHERE g.frequency = 'DAILY' AND g.status = 'ACTIVE'
    `);

    res.status(200).json({
      success: true,
      data: {
        ...todayRow,
        expectedDailyTarget: totalExpectedRow.expectedDailyTarget,
      },
    });
  } catch (error) {
    next(error);
  }
}
