import crypto from 'crypto';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';
import { getMonthlyCycleInfo } from '../utils/cycleHelper.js';
import { getTodayIST, getCurrentTimeIST } from '../utils/dateUtils.js';
import { broadcastSync } from '../services/realtimeService.js';
import { ensureAdvanceTables, createAdvanceCredit } from '../services/advanceEngine.js';

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
        c.id, c.receipt_number, c.amount, c.normal_amount, c.advance_amount, c.payment_method, c.payment_reference,
        c.collection_date, c.collection_time, c.verification_status, c.notes, c.created_at,
        g.group_name, g.group_code, g.frequency,
        m.full_name as member_name, m.phone as member_phone, m.member_code,
        u.full_name as agent_name, u.username as agent_username
      FROM collections c
      LEFT JOIN chit_groups g ON c.group_id = g.id
      LEFT JOIN members m ON c.member_id = m.id
      LEFT JOIN users u ON c.agent_id = u.id
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
    const rawAgentId = req.body.agent_id ? parseInt(req.body.agent_id, 10) : undefined;
    const validated = collectionSchema.parse({
      ...req.body,
      group_id: parseInt(req.body.group_id, 10),
      member_id: parseInt(req.body.member_id, 10),
      amount: parseFloat(req.body.amount),
      agent_id: (!isNaN(rawAgentId) && rawAgentId > 0) ? rawAgentId : undefined,
    });

    // Determine agent ID: if agent is logged in, use their ID; if admin, allow specifying or default to admin
    const recordingAgentId =
      req.user.role === 'COLLECTION_AGENT' ? req.user.id : (validated.agent_id || req.user.id);

    // 1. Fetch Chit Group details to verify frequency rules
    const [groupRows] = await pool.execute(
      'SELECT id, group_name, frequency, installment_amount, start_date, created_at FROM chit_groups WHERE id = ?',
      [validated.group_id]
    );
    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chit group not found.' });
    }
    const chitGroup = groupRows[0];

    const finalCollectionDate = (req.body.collection_date && /^\d{4}-\d{2}-\d{2}$/.test(req.body.collection_date))
      ? req.body.collection_date
      : getTodayIST();

    if (req.user.role === 'COLLECTION_AGENT') {
      const [access] = await pool.execute(
        `SELECT 1 FROM agent_group_assignments WHERE agent_id=? AND group_id=? AND is_active=1
         UNION SELECT 1 FROM agent_leave_coverages c JOIN agent_leaves l ON l.id=c.leave_id
         WHERE c.covering_agent_id=? AND c.group_id=? AND l.leave_date=? AND l.status='APPROVED' LIMIT 1`,
        [req.user.id, validated.group_id, req.user.id, validated.group_id, finalCollectionDate]);
      if (!access.length) return res.status(403).json({success:false,message:'This route is not assigned to you for the selected date.'});
    }

    await ensureAdvanceTables();

    // 2. Prevent Duplicate Payment & Check Advance Permissions
    let autoNotePrefix = '';
    const installmentAmt = parseFloat(chitGroup.installment_amount || 0);

    // Check if there is an approved Advance Collection or Edit Request for this agent & member
    let approvedEditRequest = null;
    if (req.user.role === 'COLLECTION_AGENT') {
      const [approvedRows] = await pool.query(
        `SELECT id, requested_amount, normal_amount, advance_amount, request_type
         FROM collection_edit_requests
         WHERE agent_id = ? AND group_id = ? AND member_id = ? AND status = 'APPROVED'
         ORDER BY id DESC LIMIT 1`,
        [req.user.id, validated.group_id, validated.member_id]
      );
      if (approvedRows.length > 0 && parseFloat(approvedRows[0].requested_amount) >= validated.amount - 0.01) {
        approvedEditRequest = approvedRows[0];
      }
    }

    // Note: Entering an amount that exceeds regular installment does not require Admin permission;
    // excess amount is automatically treated as advance for future days.
    // Admin request is only needed to change or correct an already confirmed payment.

    if (chitGroup.frequency === 'DAILY') {
      const [existingDaily] = await pool.execute(
        `SELECT COALESCE(SUM(amount), 0) as total_paid_today
         FROM collections
         WHERE group_id = ? AND member_id = ? AND collection_date = ? AND verification_status != 'CANCELLED'`,
        [validated.group_id, validated.member_id, finalCollectionDate]
      );
      const paidToday = parseFloat(existingDaily[0]?.total_paid_today || 0);
      if (installmentAmt > 0 && paidToday >= installmentAmt && !approvedEditRequest) {
        if (req.user.role === 'COLLECTION_AGENT') {
          return res.status(400).json({
            success: false,
            message: `Subscriber has already paid their full installment (₹${paidToday.toLocaleString('en-IN')}) for today (${finalCollectionDate}). To collect extra or advance, please request Admin approval.`,
          });
        }
      }
    } else if (chitGroup.frequency === 'MONTHLY') {
      const cycleInfo = getMonthlyCycleInfo(chitGroup.start_date || chitGroup.created_at, finalCollectionDate);
      const [existingInCycle] = await pool.execute(
        `SELECT COALESCE(SUM(amount), 0) as total_paid_in_cycle
         FROM collections 
         WHERE group_id = ? AND member_id = ? AND verification_status != 'CANCELLED'
           AND collection_date >= ? AND collection_date <= ?`,
        [validated.group_id, validated.member_id, cycleInfo.cycleStart, cycleInfo.cycleDue]
      );

      const currentPaid = parseFloat(existingInCycle[0]?.total_paid_in_cycle || 0);
      if (installmentAmt > 0 && currentPaid >= installmentAmt && !approvedEditRequest) {
        if (req.user.role === 'COLLECTION_AGENT') {
          return res.status(400).json({
            success: false,
            message: `Subscriber has already cleared their full installment (₹${currentPaid.toLocaleString('en-IN')}) for this monthly cycle (${cycleInfo.cycleDue}). To collect extra or advance, please request Admin approval.`,
          });
        }
      }
    }

    // Calculate normal vs advance portions
    const normalPortion = installmentAmt > 0 ? Math.min(validated.amount, installmentAmt) : validated.amount;
    const advancePortion = Math.max(0, validated.amount - normalPortion);

    const finalNotes = ((autoNotePrefix + (validated.notes || (advancePortion > 0 ? `Advance collected: ₹${advancePortion}` : ''))).trim() || null)?.slice(0, 255) || null;

    // Generate unique receipt number: REC-YYYYMMDD-XXXX
    const dateStr = finalCollectionDate.replace(/-/g, '');
    const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const receiptNumber = `REC-${dateStr}-${randSuffix}`;
    const currentTimeIST = getCurrentTimeIST();
    const isReconciled = req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN';
    const verificationStatus = isReconciled ? 'RECONCILED' : 'PENDING_RECONCILIATION';
    const reconciledBy = isReconciled ? req.user.id : null;

    const [insertResult] = await pool.execute(
      `INSERT INTO collections 
        (receipt_number, group_id, member_id, agent_id, amount, normal_amount, advance_amount, payment_method, payment_reference, collection_date, collection_time, verification_status, reconciled_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receiptNumber,
        validated.group_id,
        validated.member_id,
        recordingAgentId,
        validated.amount,
        normalPortion,
        advancePortion,
        validated.payment_method,
        validated.payment_reference || null,
        finalCollectionDate,
        currentTimeIST,
        verificationStatus,
        reconciledBy,
        finalNotes,
      ]
    );

    // If advance collected, record advance credit
    if (advancePortion > 0) {
      await createAdvanceCredit(pool, {
        groupId: validated.group_id,
        memberId: validated.member_id,
        collectionId: insertResult.insertId,
        advanceAmount: advancePortion,
        createdDate: finalCollectionDate,
      });
    }

    // If applied under an approved request, mark request APPLIED
    if (approvedEditRequest) {
      await pool.query(
        'UPDATE collection_edit_requests SET status = "APPLIED", collection_id = ?, applied_at = CURRENT_TIMESTAMP WHERE id = ?',
        [insertResult.insertId, approvedEditRequest.id]
      );
    }

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

      // If Admin collected, also update tracking node for the assigned field agent so they see customer has paid!
      let targetAgentId = recordingAgentId;
      if (req.user.role !== 'COLLECTION_AGENT') {
        const [assignedAgentRows] = await pool.execute(
          'SELECT agent_id FROM agent_group_assignments WHERE group_id = ? AND is_active = 1 LIMIT 1',
          [validated.group_id]
        );
        if (assignedAgentRows.length > 0) {
          targetAgentId = assignedAgentRows[0].agent_id;
        }
      }

      await pool.execute(
        `INSERT INTO agent_tracking_logs (agent_id, group_id, member_id, stop_id, tracking_date, status, last_ping_time, notes)
         VALUES (?, ?, ?, ?, ?, 'PAID', ?, ?)`,
        [targetAgentId, validated.group_id, validated.member_id, validStopId, finalCollectionDate, currentTimeIST, (validated.notes || 'Paid in field').slice(0, 255)]
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

    // Broadcast Real-time Data Synchronization after successful DB commit
    broadcastSync({
      business: 'chitfund',
      entity: 'collections',
      action: 'RECORD',
      data: {
        id: insertResult.insertId,
        groupId: validated.group_id,
        memberId: validated.member_id,
        amount: validated.amount,
        agentId: req.user.id,
        paymentMethod: validated.payment_method,
      },
    });

    const remainingBalance = Math.max(0, installmentAmt - normalPortion);
    const isAdvance = advancePortion > 0;

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
        memberId: validated.member_id,
        groupId: validated.group_id,
        amount: validated.amount,
        normalAmount: normalPortion,
        advanceAmount: advancePortion,
        remainingBalance,
        installmentAmount: installmentAmt,
        paymentMethod: validated.payment_method,
        date: finalCollectionDate,
        isAdvance,
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
        todayCash: Number(todayRow?.todayCash || 0),
        todayUpi: Number(todayRow?.todayUpi || 0),
        todayOnline: Number(todayRow?.todayOnline || 0),
        todayTotal: Number(todayRow?.todayTotal || 0),
        todayCount: Number(todayRow?.todayCount || 0),
        expectedDailyTarget: Number(totalExpectedRow?.expectedDailyTarget || 0),
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
       LEFT JOIN users u ON u.id = c.agent_id
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
    let totalTargetCollected = 0;
    let totalAdvanceCollected = 0;
    let pendingCount = 0;
    let completedCount = 0;

    const tasks = members
      .map((m) => {
        const g = groupMap.get(m.group_id);
        if (!g) return null;
        const isDaily = g.frequency === 'DAILY';
        const cycleInfo = isDaily ? null : getMonthlyCycleInfo(g.start_date || g.created_at, queryDate);
        const isDueToday = isDaily || (cycleInfo ? cycleInfo.isDeadlineToday : false);
        const paidAmount = colMap.get(`${m.group_id}:${m.member_id}`) || 0;
        const installment = Number(g.installment_amount || 0);
        const normalPaid = Math.min(paidAmount, installment);
        const advancePaid = Math.max(0, paidAmount - installment);
        const isPaid = paidAmount >= installment;
        const isPartial = paidAmount > 0 && paidAmount < installment;

        totalTarget += installment;
        totalTargetCollected += normalPaid;
        totalAdvanceCollected += advancePaid;
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
          normal_paid_amount: normalPaid,
          advance_paid_amount: advancePaid,
          remaining_due: Math.max(0, installment - normalPaid),
          is_paid: isPaid,
          is_partial: isPartial,
          is_covered_today: isCovered,
          covering_agent_name: g.covering_agent_name,
          absent_agent_name: isCovered ? g.assigned_agent_name : null,
          current_handler_name: currentHandlerName,
          is_handled_by_me: isHandledByMe,
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      tasks,
      summary: {
        totalTarget,
        totalCollected: totalTargetCollected,
        totalAdvanceCollected,
        totalGrossCollected: totalTargetCollected + totalAdvanceCollected,
        pendingCount,
        completedCount,
        progressPct: totalTarget > 0 ? Math.round((totalTargetCollected / totalTarget) * 100) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
}
