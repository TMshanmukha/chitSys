import crypto from 'crypto';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';
import { getMonthlyCycleInfo } from '../utils/cycleHelper.js';
import { getTodayIST, getCurrentTimeIST } from '../utils/dateUtils.js';

const collectionSchema = z.object({
  group_id: z.number().int().positive('Chit Group selection is required'),
  member_id: z.number().int().positive('Member selection is required'),
  amount: z.number().positive('Collection amount must be greater than zero'),
  payment_method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE']).default('CASH'),
  payment_reference: z.string().optional().nullable(),
  collection_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  agent_id: z.number().int().optional(),
  allow_advance: z.boolean().optional(),
  allow_off_cycle: z.boolean().optional(),
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

    if (req.user.role === 'COLLECTION_AGENT') {
      const finalDate = (req.body.collection_date && /^\d{4}-\d{2}-\d{2}$/.test(req.body.collection_date)) ? req.body.collection_date : getTodayIST();

      // Check if day submission has already been filed or approved for this date - lock collections!
      const [lockedDay] = await pool.execute(
        `SELECT id, status FROM agent_day_submissions WHERE agent_id = ? AND work_date = ? AND status IN ('PENDING_APPROVAL', 'APPROVED') LIMIT 1`,
        [req.user.id, finalDate]
      );
      if (lockedDay.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Collections for ${finalDate} have been submitted to Admin for shift closing and are locked. If you need to record additional payments, please request Admin to unlock your shift.`
        });
      }

      const [access] = await pool.execute(
        `SELECT 1 FROM agent_group_assignments WHERE agent_id=? AND group_id=? AND is_active=1
         UNION SELECT 1 FROM agent_leave_coverages c JOIN agent_leaves l ON l.id=c.leave_id
         WHERE c.covering_agent_id=? AND c.group_id=? AND l.leave_date=? AND l.status='APPROVED' LIMIT 1`,
        [req.user.id, validated.group_id, req.user.id, validated.group_id, finalDate]);
      if (!access.length) return res.status(403).json({success:false,message:'This route is not assigned to you for the selected date.'});
    }

    // 2. Real-Life Flexibility: Handle standard, partial, advance, and off-cycle payments seamlessly without blocking!
    let isAdvance = false;
    let isOffCycle = false;
    let autoNotePrefix = '';

    const finalCollectionDate = (req.body.collection_date && /^\d{4}-\d{2}-\d{2}$/.test(req.body.collection_date))
      ? req.body.collection_date
      : getTodayIST();

    let cycleInfo = null;
    if (chitGroup.frequency === 'MONTHLY') {
      cycleInfo = getMonthlyCycleInfo(chitGroup.start_date || chitGroup.created_at, finalCollectionDate);
      const [existingInCycle] = await pool.execute(
        `SELECT COALESCE(SUM(amount), 0) as total_paid_in_cycle, COUNT(id) as collections_count
         FROM collections 
         WHERE group_id = ? AND member_id = ? AND verification_status != 'CANCELLED'
           AND collection_date >= ? AND collection_date <= ?`,
        [validated.group_id, validated.member_id, cycleInfo.cycleStart, cycleInfo.cycleDue]
      );

      const currentPaid = parseFloat(existingInCycle[0]?.total_paid_in_cycle || 0);
      const installmentAmt = parseFloat(chitGroup.installment_amount || 0);

      // If current cycle installment is already satisfied, treat as Advance collection for subscriber!
      if (currentPaid >= installmentAmt) {
        isAdvance = true;
        autoNotePrefix += '[Advance Collection] ';
      }
    }

    const finalNotes = (autoNotePrefix + (validated.notes || '')).trim() || null;

    // Generate unique receipt number: REC-YYYYMMDD-XXXX
    const dateStr = finalCollectionDate.replace(/-/g, '');
    const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const receiptNumber = `REC-${dateStr}-${randSuffix}`;
    const currentTimeIST = getCurrentTimeIST();

    const [insertResult] = await pool.execute(
      `INSERT INTO collections 
        (receipt_number, group_id, member_id, agent_id, amount, payment_method, payment_reference, collection_date, collection_time, verification_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_RECONCILIATION', ?)`,
      [
        receiptNumber,
        validated.group_id,
        validated.member_id,
        recordingAgentId,
        validated.amount,
        validated.payment_method,
        validated.payment_reference || null,
        finalCollectionDate,
        currentTimeIST,
        finalNotes,
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
         VALUES (?, ?, ?, ?, ?, 'PAID', CURTIME(), ?)`,
        [recordingAgentId, validated.group_id, validated.member_id, validStopId, finalCollectionDate, validated.notes || 'Paid in field']
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

    const installmentAmt = parseFloat(chitGroup.installment_amount || 0);
    const remainingBalance = Math.max(0, installmentAmt - validated.amount);

    res.status(201).json({
      success: true,
      message: isAdvance
        ? `Advance collection of ₹${validated.amount.toLocaleString('en-IN')} recorded successfully!`
        : (remainingBalance > 0
            ? `Partial collection of ₹${validated.amount.toLocaleString('en-IN')} recorded successfully. Remaining balance: ₹${remainingBalance.toLocaleString('en-IN')}.`
            : `Full collection of ₹${validated.amount.toLocaleString('en-IN')} recorded successfully.`),
      receipt: {
        id: insertResult.insertId,
        receiptNumber,
        amount: validated.amount,
        remainingBalance,
        installmentAmount: installmentAmt,
        paymentMethod: validated.payment_method,
        date: finalCollectionDate,
        isAdvance,
        isOffCycle,
        cycleInfo,
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
    const todayIST = getTodayIST();
    const [[todayRow]] = await pool.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN UPPER(TRIM(payment_method)) = 'CASH' THEN amount ELSE 0 END), 0) as todayCash,
        COALESCE(SUM(CASE WHEN UPPER(TRIM(payment_method)) = 'UPI' THEN amount ELSE 0 END), 0) as todayUpi,
        COALESCE(SUM(CASE WHEN UPPER(TRIM(payment_method)) != 'CASH' THEN amount ELSE 0 END), 0) as todayOnline,
        COALESCE(SUM(amount), 0) as todayTotal,
        COUNT(id) as todayCount
      FROM collections
      WHERE collection_date = ? AND verification_status != 'CANCELLED'
    `, [todayIST]);

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

export async function getAdminCollectionTasks(req, res, next) {
  try {
    const todayStr = getTodayIST();
    const queryDate = (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) ? req.query.date : todayStr;
    const filterAssignedToMe = req.query.only_me === 'true';

    // 1. Fetch active groups with assignments and active leave coverages
    const [groups] = await pool.query(
      `SELECT g.id, g.group_code, g.group_name, g.chit_type, g.frequency, g.route_category,
              g.location_name, g.installment_amount, g.total_pool_amount, g.status, g.start_date, g.created_at,
              aga.agent_id as assigned_agent_id, u.full_name as assigned_agent_name,
              alc.covering_agent_id, coverer.full_name as covering_agent_name,
              al.id as active_leave_id
       FROM chit_groups g
       LEFT JOIN agent_group_assignments aga ON aga.group_id = g.id AND aga.is_active = 1
       LEFT JOIN users u ON u.id = aga.agent_id
       LEFT JOIN agent_leaves al ON al.agent_id = aga.agent_id AND al.leave_date = ? AND al.status = 'APPROVED'
       LEFT JOIN agent_leave_coverages alc ON alc.leave_id = al.id AND alc.group_id = g.id
       LEFT JOIN users coverer ON coverer.id = alc.covering_agent_id
       WHERE g.status = 'ACTIVE'
       ORDER BY g.route_category ASC, g.id ASC`,
      [queryDate]
    );

    if (groups.length === 0) {
      return res.json({ success: true, tasks: [], summary: { totalTarget: 0, totalCollected: 0, pendingCount: 0, completedCount: 0, progressPct: 0 } });
    }

    let relevantGroups = groups;
    if (filterAssignedToMe) {
      relevantGroups = groups.filter((g) => {
        if (g.covering_agent_id && Number(g.covering_agent_id) === Number(req.user.id)) return true;
        if (!g.covering_agent_id && Number(g.assigned_agent_id) === Number(req.user.id)) return true;
        return false;
      });
    }

    const groupIds = relevantGroups.map((g) => g.id);
    if (groupIds.length === 0) {
      return res.json({ success: true, tasks: [], summary: { totalTarget: 0, totalCollected: 0, pendingCount: 0, completedCount: 0, progressPct: 0 } });
    }

    // 2. Fetch active enrolled members
    const [members] = await pool.query(
      `SELECT gm.group_id, gm.ticket_number, m.id as member_id, m.member_code, m.full_name, m.phone, m.address
       FROM group_memberships gm
       JOIN members m ON gm.member_id = m.id
       WHERE gm.group_id IN (?) AND gm.status = 'ACTIVE'
       ORDER BY gm.group_id ASC, gm.ticket_number ASC`,
      [groupIds]
    );

    // 3. Fetch collections recorded for this date
    const [collections] = await pool.query(
      `SELECT c.group_id, c.member_id, c.amount, c.collection_date, c.payment_method, u.full_name as collected_by_name
       FROM collections c
       JOIN users u ON u.id = c.agent_id
       WHERE c.group_id IN (?) AND c.collection_date = ? AND c.verification_status != 'CANCELLED'`,
      [groupIds, queryDate]
    );

    const colMap = new Map();
    for (const c of collections) {
      const key = `${c.group_id}:${c.member_id}`;
      colMap.set(key, (colMap.get(key) || 0) + Number(c.amount));
    }

    const groupMap = new Map(relevantGroups.map((g) => [g.id, g]));
    let totalTarget = 0;
    let totalCollected = 0;
    let pendingCount = 0;
    let completedCount = 0;

    const tasks = members.map((m) => {
      const g = groupMap.get(m.group_id);
      const isDaily = g.frequency === 'DAILY';
      const cycleInfo = isDaily ? null : getMonthlyCycleInfo(g.start_date || g.created_at, queryDate);
      const isDueToday = isDaily || (cycleInfo ? cycleInfo.isDeadlineToday : false);
      const paidAmount = colMap.get(`${m.group_id}:${m.member_id}`) || 0;
      const installment = Number(g.installment_amount);
      const isPaid = paidAmount >= installment;
      const isPartial = paidAmount > 0 && paidAmount < installment;

      totalTarget += installment;
      totalCollected += paidAmount;
      if (isPaid) completedCount++;
      else pendingCount++;

      const isCovered = Boolean(g.covering_agent_id);
      const currentHandlerName = isCovered ? g.covering_agent_name : (g.assigned_agent_name || 'Admin / Office');
      const isHandledByMe = isCovered
        ? Number(g.covering_agent_id) === Number(req.user.id)
        : Number(g.assigned_agent_id) === Number(req.user.id);

      return {
        group_id: g.id,
        group_name: g.group_name,
        group_code: g.group_code,
        frequency: g.frequency,
        installment_amount: installment,
        cycle_label: isDaily ? 'Daily Installment' : `Monthly (Due: ${cycleInfo?.cycleDue || 'Anchor Date'})`,
        is_due_today: isDueToday,
        member_id: m.member_id,
        member_name: m.full_name,
        member_phone: m.phone,
        ticket_number: m.ticket_number,
        address: m.address,
        paid_amount: paidAmount,
        remaining_due: Math.max(0, installment - paidAmount),
        is_paid: isPaid,
        is_partial: isPartial,
        is_covered_today: isCovered,
        covering_agent_name: g.covering_agent_name,
        absent_agent_name: isCovered ? g.assigned_agent_name : null,
        current_handler_name: currentHandlerName,
        is_handled_by_me: isHandledByMe,
      };
    });

    res.json({
      success: true,
      tasks,
      summary: {
        totalTarget,
        totalCollected,
        pendingCount,
        completedCount,
        progressPct: totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
}
