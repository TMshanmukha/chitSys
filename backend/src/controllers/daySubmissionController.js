import { pool } from '../config/db.js';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';
import { getMonthlyCycleInfo } from '../utils/cycleHelper.js';

/**
 * Submit agent's day collections & route work for Admin verification and day closing.
 * Aggregates all collections, chit-by-chit breakdowns, and generates analytical graphs.
 */
export async function calculateDayWorkData(agentId, workDate) {

    // 1. Fetch agent's active assigned groups
    const [groups] = await pool.query(
      `SELECT g.id, g.group_code, g.group_name, g.chit_type, g.frequency, g.installment_amount, g.total_pool_amount,
              g.start_date, g.created_at, absent_agent.full_name AS absent_agent_name
       FROM chit_groups g
       LEFT JOIN agent_group_assignments aga ON aga.group_id=g.id AND aga.agent_id=? AND aga.is_active=1
       LEFT JOIN agent_leave_coverages alc ON alc.group_id=g.id AND alc.covering_agent_id=?
       LEFT JOIN agent_leaves al ON al.id=alc.leave_id AND al.leave_date=? AND al.status='APPROVED'
       LEFT JOIN users absent_agent ON absent_agent.id=al.agent_id
       WHERE ((aga.agent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM agent_leaves own_leave WHERE own_leave.agent_id=? AND own_leave.leave_date=? AND own_leave.status='APPROVED')) OR al.id IS NOT NULL) AND g.status = 'ACTIVE'
       GROUP BY g.id,g.group_code,g.group_name,g.chit_type,g.frequency,g.installment_amount,g.total_pool_amount,g.start_date,g.created_at,absent_agent.full_name
       ORDER BY g.id ASC`,
      [agentId, agentId, workDate, agentId, workDate]
    );

    const groupIds = groups.map((g) => g.id);

    // Include every collector in covered routes so admin-recorded work is complete in the roster.
    const [collections] = await pool.query(
      `SELECT c.id, c.receipt_number, c.group_id, c.member_id, c.amount, c.payment_method, c.payment_reference,
              c.collection_date, c.collection_time, c.notes, m.full_name as member_name, gm.ticket_number, m.phone as member_phone,
              g.group_name, g.group_code, handler.full_name AS completed_by_name, handler.role AS collector_role, c.agent_id AS collector_id
       FROM collections c
       JOIN members m ON c.member_id = m.id
       LEFT JOIN group_memberships gm ON c.group_id = gm.group_id AND c.member_id = gm.member_id
       LEFT JOIN chit_groups g ON c.group_id = g.id
       LEFT JOIN users handler ON handler.id=c.agent_id
       WHERE c.group_id IN (?) AND c.collection_date = ? AND c.verification_status != 'CANCELLED'
       ORDER BY c.collection_time ASC, c.id ASC`,
      [groupIds.length ? groupIds : [-1], workDate]
    );
    const agentCollections = collections.filter((c) => Number(c.collector_id) === Number(agentId));

    // 3. Calculate collection totals
    let cashCollected = 0;
    let upiCollected = 0;
    let chequeCollected = 0;
    let totalCollected = 0;

    for (const c of agentCollections) {
      const amt = parseFloat(c.amount || 0);
      totalCollected += amt;
      const method = (c.payment_method || '').toUpperCase().trim();
      if (method === 'CASH') {
        cashCollected += amt;
      } else if (method === 'UPI' || method.includes('UPI')) {
        upiCollected += amt;
      } else {
        chequeCollected += amt;
      }
    }

    const totalReceipts = agentCollections.length;

    // 4. Fetch all active members in assigned groups to compile detailed paid vs unpaid rosters per chit
    let enrolledMembers = [];
    if (groupIds.length > 0) {
      const [members] = await pool.query(
        `SELECT gm.group_id, gm.ticket_number, m.id as member_id, m.full_name, m.phone, m.member_code,
                g.installment_amount, g.frequency,
                ama.id as advance_id, ama.advance_amount, ama.status as advance_status
         FROM group_memberships gm
         JOIN members m ON gm.member_id = m.id
         JOIN chit_groups g ON gm.group_id = g.id
         LEFT JOIN admin_member_advances ama ON gm.group_id = ama.group_id AND gm.member_id = ama.member_id AND ama.status = 'PENDING_RECOVERY'
         WHERE gm.group_id IN (?) AND gm.status = 'ACTIVE'
         ORDER BY gm.group_id ASC, gm.ticket_number ASC`,
        [groupIds]
      );
      enrolledMembers = members;
    }

    // 5. Structure "What Chits It Collected" breakdown & subscriber rosters
    let totalStopsVisited = 0;
    let totalStopsPending = 0;

    const chitBreakdown = groups.map((g) => {
      const isDaily = g.frequency === 'DAILY';
      const cycleInfo = isDaily ? null : getMonthlyCycleInfo(g.start_date || g.created_at, workDate);
      const installmentAmt = parseFloat(g.installment_amount || 0);

      const gMembers = enrolledMembers.filter((m) => m.group_id === g.id);
      const gCollections = collections.filter((c) => c.group_id === g.id);

      const gCash = gCollections
        .filter((c) => (c.payment_method || '').toUpperCase().trim() === 'CASH')
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

      const gUpi = gCollections
        .filter((c) => (c.payment_method || '').toUpperCase().trim() !== 'CASH')
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

      const gTotal = gCash + gUpi;

      // Target expected for today's shift:
      // - Daily chits have installments due every day.
      // - Monthly chits have cycle deadline on anchorDay (start_date day).
      const isDeadlineToday = isDaily || (cycleInfo && cycleInfo.isDeadlineToday);
      const hasTimeRemaining = !isDaily && cycleInfo && cycleInfo.daysRemaining > 0;
      const expectedTarget = isDaily 
        ? gMembers.length * installmentAmt 
        : (cycleInfo?.isDeadlineToday ? gMembers.length * installmentAmt : 0);
      const pendingAmount = isDaily
        ? Math.max(0, expectedTarget - gTotal)
        : (cycleInfo?.isDeadlineToday ? Math.max(0, (gMembers.length * installmentAmt) - gTotal) : 0);

      // Paid vs unpaid members in this group
      const paidMembers = [];
      const unpaidMembers = [];

      for (const m of gMembers) {
        const memberCollections = gCollections.filter((c) => c.member_id === m.member_id);
        const collectedForMember = memberCollections.reduce((sum,c)=>sum+parseFloat(c.amount||0),0);
        const coll = memberCollections[0] || null;
        if (collectedForMember >= installmentAmt && installmentAmt > 0) {
          totalStopsVisited++;
          paidMembers.push({
            memberId: m.member_id,
            memberName: m.full_name,
            ticketNumber: m.ticket_number,
            phone: m.phone,
            amount: collectedForMember,
            paymentMethod: coll.payment_method,
            receiptNumber: coll.receipt_number,
            collectionTime: coll.collection_time,
            completedBy: [...new Set(memberCollections.map((item)=>item.completed_by_name).filter(Boolean))].join(', ') || null,
            completedByAdmin: memberCollections.some((item)=>['ADMIN','SUPER_ADMIN'].includes(item.collector_role)),
            notes: coll.notes || '',
            statusLabel: 'Collected Today',
          });
        } else {
          totalStopsPending++;
          let statusType = 'DAILY_UNPAID';
          let statusNotice = 'Not paid today';

          if (!isDaily) {
            if (hasTimeRemaining) {
              statusType = 'TIME_REMAINING_NO_WORRY';
              statusNotice = `This month there is time to collect (Due: ${cycleInfo.cycleDue} · ${cycleInfo.daysRemaining} days left) · No worry`;
            } else if (cycleInfo?.isDeadlineToday) {
              statusType = 'DEADLINE_TODAY';
              statusNotice = `Cycle Deadline Today (${cycleInfo.cycleDue}) · Last day of monthly cycle!`;
            } else {
              statusType = 'OVERDUE_NOT_COMPLETED';
              statusNotice = `Cycle Overdue (Deadline was ${cycleInfo?.cycleDue}) · Not completed`;
            }
          }

          unpaidMembers.push({
            memberId: m.member_id,
            memberName: m.full_name,
            ticketNumber: m.ticket_number,
            phone: m.phone,
            amountCollected: collectedForMember,
            expectedAmount: installmentAmt,
            pendingDeficit: Math.max(0, installmentAmt-collectedForMember),
            partialCollectors: [...new Set(memberCollections.map((item)=>item.completed_by_name).filter(Boolean))].join(', ') || null,
            isAdminCovered: Boolean(m.advance_id && m.advance_status === 'PENDING_RECOVERY'),
            advanceAmount: m.advance_amount ? parseFloat(m.advance_amount) : 0,
            statusType,
            statusNotice,
            hasTimeRemaining,
            isDeadlineToday,
            cycleDue: cycleInfo?.cycleDue || null,
            daysRemaining: cycleInfo?.daysRemaining ?? null,
          });
        }
      }

      const progressPercent = expectedTarget > 0 ? Math.round((gTotal / expectedTarget) * 100) : (gTotal > 0 ? 100 : 0);

      return {
        groupId: g.id,
        groupCode: g.group_code,
        groupName: g.group_name,
        absentAgentName: g.absent_agent_name || null,
        frequency: g.frequency,
        chitType: g.chit_type,
        installmentAmount: installmentAmt,
        expectedTarget,
        cashCollected: gCash,
        upiCollected: gUpi,
        totalCollected: gTotal,
        pendingAmount,
        progressPercent,
        totalSubscribersCount: gMembers.length,
        paidSubscribersCount: paidMembers.length,
        unpaidSubscribersCount: unpaidMembers.length,
        paidMembers,
        unpaidMembers,
        cycleInfo: cycleInfo ? {
          cycleStart: cycleInfo.cycleStart,
          cycleDue: cycleInfo.cycleDue,
          daysRemaining: cycleInfo.daysRemaining,
          isDeadlineToday: cycleInfo.isDeadlineToday,
          hasTimeRemaining: cycleInfo.hasTimeRemaining,
          isOverdue: cycleInfo.isOverdue,
          statusNotice: cycleInfo.statusNotice,
        } : null,
        isDeadlineToday,
        hasTimeRemaining,
        scheduleAnalysisNotice: isDaily
          ? 'Daily chit collected everyday'
          : cycleInfo?.statusNotice,
      };
    });

    // 6. Graphs & Total Analyses
    const grandExpectedTarget = chitBreakdown.reduce((sum, item) => sum + item.expectedTarget, 0);
    const overallCompletionPercent = grandExpectedTarget > 0
      ? Math.round((totalCollected / grandExpectedTarget) * 100)
      : (totalCollected > 0 ? 100 : 0);

    const cashSharePercent = totalCollected > 0 ? Math.round((cashCollected / totalCollected) * 100) : 0;
    const upiSharePercent = totalCollected > 0 ? Math.round((upiCollected / totalCollected) * 100) : 0;

    const dailyChits = chitBreakdown.filter((c) => c.frequency === 'DAILY');
    const monthlyChits = chitBreakdown.filter((c) => c.frequency === 'MONTHLY');

    const dailyTarget = dailyChits.reduce((sum, item) => sum + item.expectedTarget, 0);
    const dailyCollected = dailyChits.reduce((sum, item) => sum + item.totalCollected, 0);
    const dailyPending = Math.max(0, dailyTarget - dailyCollected);

    const monthlyCollectedToday = monthlyChits.reduce((sum, item) => sum + item.totalCollected, 0);
    const monthlySubscribersCollectedToday = monthlyChits.reduce((sum, item) => sum + item.paidSubscribersCount, 0);
    const monthlySubscribersTimeRemaining = monthlyChits.reduce(
      (sum, item) => sum + (item.hasTimeRemaining ? item.unpaidSubscribersCount : 0),
      0
    );
    const monthlySubscribersDeadlineOrOverdue = monthlyChits.reduce(
      (sum, item) => sum + (!item.hasTimeRemaining ? item.unpaidSubscribersCount : 0),
      0
    );

    const graphsAnalyses = {
      overallCompletionPercent,
      grandExpectedTarget,
      totalCollected,
      grandPendingAmount: Math.max(0, grandExpectedTarget - totalCollected),
      dailyOverview: {
        target: dailyTarget,
        collected: dailyCollected,
        pending: dailyPending,
        completionPercent: dailyTarget > 0 ? Math.round((dailyCollected / dailyTarget) * 100) : (dailyCollected > 0 ? 100 : 0),
      },
      monthlyOverview: {
        collectedToday: monthlyCollectedToday,
        subscribersCollectedToday: monthlySubscribersCollectedToday,
        subscribersWithTimeRemaining: monthlySubscribersTimeRemaining,
        subscribersDeadlineOrOverdue: monthlySubscribersDeadlineOrOverdue,
        statusNotice: monthlySubscribersTimeRemaining > 0
          ? `${monthlySubscribersTimeRemaining} monthly subscribers have time remaining this cycle · No worry`
          : 'All monthly cycles up-to-date',
      },
      paymentSplit: {
        cashAmount: cashCollected,
        cashPercent: cashSharePercent,
        upiAmount: upiCollected,
        upiPercent: upiSharePercent,
        chequeAmount: chequeCollected,
      },
      taskProgress: {
        totalStops: totalStopsVisited + totalStopsPending,
        visitedCount: totalStopsVisited,
        pendingCount: totalStopsPending,
        ratePercent: (totalStopsVisited + totalStopsPending) > 0
          ? Math.round((totalStopsVisited / (totalStopsVisited + totalStopsPending)) * 100)
          : 0,
      },
      schemeDistribution: chitBreakdown.map((item) => ({
        groupCode: item.groupCode,
        groupName: item.groupName,
        frequency: item.frequency,
        target: item.expectedTarget,
        collected: item.totalCollected,
        cash: item.cashCollected,
        upi: item.upiCollected,
        pending: item.pendingAmount,
        percent: item.progressPercent,
        hasTimeRemaining: item.hasTimeRemaining,
        isDeadlineToday: item.isDeadlineToday,
        cycleDue: item.cycleInfo?.cycleDue || null,
        daysRemaining: item.cycleInfo?.daysRemaining ?? null,
        statusNotice: item.scheduleAnalysisNotice,
      })),
    };

    const payloadJson = JSON.stringify({
      workDate,
      summary: {
        cashCollected,
        upiCollected,
        chequeCollected,
        totalCollected,
        totalReceipts,
        totalStopsVisited,
        totalStopsPending,
      },
      graphsAnalyses,
      chitBreakdown,
      submittedAt: new Date().toISOString(),
    });

    return {
      cashCollected,
      upiCollected,
      chequeCollected,
      totalCollected,
      totalReceipts,
      totalStopsVisited,
      totalStopsPending,
      chitBreakdown,
      graphsAnalyses,
      payloadJson,
    };
}

/**
 * Live preview calculation of today's route collections, chits and graphs without submitting.
 */
export async function previewAgentDayWork(req, res, next) {
  try {
    const agentId = req.user.id;
    const workDate = req.query.date || new Date().toISOString().slice(0, 10);
    const data = await calculateDayWorkData(agentId, workDate);

    const [existing] = await pool.query(
      `SELECT ads.*, u.full_name as approved_by_name
       FROM agent_day_submissions ads
       LEFT JOIN users u ON ads.approved_by = u.id
       WHERE ads.agent_id = ? AND ads.work_date = ? LIMIT 1`,
      [agentId, workDate]
    );

    res.status(200).json({
      success: true,
      data: {
        workDate,
        isSubmitted: existing.length > 0,
        submission: existing.length > 0 ? {
          id: existing[0].id,
          status: existing[0].status,
          adminNotes: existing[0].admin_notes,
          verifiedCashAmount: existing[0].verified_cash_amount ? parseFloat(existing[0].verified_cash_amount) : null,
          verifiedUpiAmount: existing[0].verified_upi_amount ? parseFloat(existing[0].verified_upi_amount) : null,
          approvedByName: existing[0].approved_by_name,
          approvedAt: existing[0].approved_at,
          submittedAt: existing[0].submitted_at,
          agentNotes: existing[0].agent_notes,
        } : null,
        ...data,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit agent's day collections & route work for Admin verification and day closing.
 * Aggregates all collections, chit-by-chit breakdowns, and generates analytical graphs.
 */
export async function submitAgentDayWork(req, res, next) {
  try {
    const agentId = req.user.id;
    const workDate = req.body.work_date || new Date().toISOString().slice(0, 10);
    const agentNotes = req.body.agent_notes || '';

    const {
      cashCollected,
      upiCollected,
      chequeCollected,
      totalCollected,
      totalReceipts,
      totalStopsVisited,
      totalStopsPending,
      chitBreakdown,
      graphsAnalyses,
      payloadJson,
    } = await calculateDayWorkData(agentId, workDate);

    // 7. Check if an active submission already exists for this agent and date
    const [existing] = await pool.query(
      `SELECT id, status FROM agent_day_submissions WHERE agent_id = ? AND work_date = ? LIMIT 1`,
      [agentId, workDate]
    );

    let submissionId;

    if (existing.length > 0) {
      if (existing[0].status === 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: `Day handover for ${workDate} has already been approved and closed by Admin.`,
        });
      }

      submissionId = existing[0].id;
      await pool.query(
        `UPDATE agent_day_submissions
         SET cash_collected = ?,
             upi_collected = ?,
             cheque_collected = ?,
             total_collected = ?,
             total_receipts = ?,
             total_stops_visited = ?,
             total_stops_pending = ?,
             chit_breakdown_json = ?,
             agent_notes = ?,
             status = 'PENDING_APPROVAL',
             submitted_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          cashCollected,
          upiCollected,
          chequeCollected,
          totalCollected,
          totalReceipts,
          totalStopsVisited,
          totalStopsPending,
          payloadJson,
          agentNotes,
          submissionId,
        ]
      );
    } else {
      const [insertRes] = await pool.query(
        `INSERT INTO agent_day_submissions (
           agent_id, work_date, cash_collected, upi_collected, cheque_collected, total_collected,
           total_receipts, total_stops_visited, total_stops_pending, chit_breakdown_json, agent_notes, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL')`,
        [
          agentId,
          workDate,
          cashCollected,
          upiCollected,
          chequeCollected,
          totalCollected,
          totalReceipts,
          totalStopsVisited,
          totalStopsPending,
          payloadJson,
          agentNotes,
        ]
      );
      submissionId = insertRes.insertId;
    }

    // 8. Audit log & Admin Notification
    await recordAuditLog({
      userId: agentId,
      action: 'SUBMIT_AGENT_DAY_WORK',
      resource: 'AGENT_DAY_SUBMISSIONS',
      details: { submissionId, workDate, cashCollected, upiCollected, totalCollected, totalReceipts },
    });

    createNotification({
      targetRole: 'ADMIN',
      title: '📦 Agent Day Handover Submitted',
      message: `${req.user.full_name || 'Agent'} submitted day work for ${workDate}: Cash ₹${cashCollected.toLocaleString('en-IN')}, UPI ₹${upiCollected.toLocaleString('en-IN')}, Total ₹${totalCollected.toLocaleString('en-IN')}. Awaiting cash count & day closing approval.`,
      type: 'COLLECTION',
      link: '/admin/tracking?tab=DAY_CLOSING_APPROVALS',
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Day work for ${workDate} submitted successfully. Hand over ₹${cashCollected.toLocaleString('en-IN')} physical cash to Admin for counting and day closing approval.`,
      data: {
        id: submissionId,
        agentId,
        workDate,
        cashCollected,
        upiCollected,
        chequeCollected,
        totalCollected,
        totalReceipts,
        totalStopsVisited,
        totalStopsPending,
        graphsAnalyses,
        chitBreakdown,
        status: 'PENDING_APPROVAL',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get agent's day submissions history and status for a specific date or overall.
 */
export async function getMyDaySubmissions(req, res, next) {
  try {
    const agentId = req.user.id;
    const { date } = req.query;

    let query = `
      SELECT ads.*, u.full_name as approved_by_name
      FROM agent_day_submissions ads
      LEFT JOIN users u ON ads.approved_by = u.id
      WHERE ads.agent_id = ?
    `;
    const params = [agentId];

    if (date) {
      query += ` AND ads.work_date = ?`;
      params.push(date);
    }

    query += ` ORDER BY ads.work_date DESC, ads.id DESC`;

    const [rows] = await pool.query(query, params);

    const formatted = rows.map((r) => {
      let parsedBreakdown = null;
      try {
        if (r.chit_breakdown_json) {
          parsedBreakdown = JSON.parse(r.chit_breakdown_json);
        }
      } catch (_) {}

      return {
        ...r,
        cash_collected: parseFloat(r.cash_collected),
        upi_collected: parseFloat(r.upi_collected),
        cheque_collected: parseFloat(r.cheque_collected),
        total_collected: parseFloat(r.total_collected),
        verified_cash_amount: r.verified_cash_amount ? parseFloat(r.verified_cash_amount) : null,
        verified_upi_amount: r.verified_upi_amount ? parseFloat(r.verified_upi_amount) : null,
        details: parsedBreakdown,
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all agent day submissions for Admin verification, cash counting, and day closing.
 * Supports flexible asynchronous approvals (can be approved any day).
 */
export async function listDaySubmissionsForAdmin(req, res, next) {
  try {
    const { status, agentId, date, startDate, endDate, groupId } = req.query;

    let query = `
      SELECT ads.*,
             u.full_name as agent_name, u.username as agent_username, u.phone as agent_phone,
             approver.full_name as approved_by_name, approver.username as approved_by_username
      FROM agent_day_submissions ads
      JOIN users u ON ads.agent_id = u.id
      LEFT JOIN users approver ON ads.approved_by = approver.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND ads.status = ?`;
      params.push(status);
    }
    if (agentId && agentId !== 'ALL') {
      query += ` AND ads.agent_id = ?`;
      params.push(agentId);
    }
    if (date) {
      query += ` AND ads.work_date = ?`;
      params.push(date);
    }
    if (startDate) {
      query += ` AND ads.work_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND ads.work_date <= ?`;
      params.push(endDate);
    }
    if (groupId && groupId !== 'ALL') {
      query += ` AND (ads.chit_breakdown_json LIKE ? OR EXISTS (
        SELECT 1 FROM agent_group_assignments aga WHERE aga.agent_id = ads.agent_id AND aga.group_id = ?
      ))`;
      params.push(`%"groupId":${groupId}%`, groupId);
    }

    query += ` ORDER BY FIELD(ads.status, 'PENDING_APPROVAL', 'REJECTED_DISCREPANCY', 'APPROVED'), ads.work_date DESC, ads.id DESC`;

    const [rows] = await pool.query(query, params);

    // Compute summary KPI cards
    let pendingCount = 0;
    let pendingTotalCash = 0;
    let pendingTotalUpi = 0;
    let pendingTotalAmount = 0;

    let approvedCount = 0;
    let approvedTotalAmount = 0;

    const formatted = rows.map((r) => {
      let parsedBreakdown = null;
      try {
        if (r.chit_breakdown_json) {
          parsedBreakdown = JSON.parse(r.chit_breakdown_json);
        }
      } catch (_) {}

      const cash = parseFloat(r.cash_collected);
      const upi = parseFloat(r.upi_collected);
      const total = parseFloat(r.total_collected);

      if (r.status === 'PENDING_APPROVAL') {
        pendingCount++;
        pendingTotalCash += cash;
        pendingTotalUpi += upi;
        pendingTotalAmount += total;
      } else if (r.status === 'APPROVED') {
        approvedCount++;
        approvedTotalAmount += total;
      }

      return {
        ...r,
        cash_collected: cash,
        upi_collected: upi,
        cheque_collected: parseFloat(r.cheque_collected),
        total_collected: total,
        verified_cash_amount: r.verified_cash_amount ? parseFloat(r.verified_cash_amount) : null,
        verified_upi_amount: r.verified_upi_amount ? parseFloat(r.verified_upi_amount) : null,
        details: parsedBreakdown,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          pendingCount,
          pendingTotalCash,
          pendingTotalUpi,
          pendingTotalAmount,
          approvedCount,
          approvedTotalAmount,
          totalSubmissionsCount: rows.length,
        },
        submissions: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin Action: Count collected cash, verify UPI amounts, approve and close the agent day.
 * Can be performed on the same day or any subsequent day.
 */
export async function approveAndCloseDaySubmission(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const {
      status = 'APPROVED', // 'APPROVED' | 'REJECTED_DISCREPANCY'
      verified_cash_amount,
      verified_upi_amount,
      admin_notes = '',
    } = req.body;

    // Check submission existence
    const [existing] = await connection.query(
      `SELECT ads.*, u.full_name as agent_name
       FROM agent_day_submissions ads
       JOIN users u ON ads.agent_id = u.id
       WHERE ads.id = ? LIMIT 1`,
      [id]
    );

    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Day submission record not found.' });
    }

    const sub = existing[0];
    const finalCash = verified_cash_amount !== undefined ? parseFloat(verified_cash_amount) : parseFloat(sub.cash_collected);
    const finalUpi = verified_upi_amount !== undefined ? parseFloat(verified_upi_amount) : parseFloat(sub.upi_collected);
    const workDateStr = sub.work_date instanceof Date
      ? sub.work_date.toISOString().slice(0, 10)
      : String(sub.work_date).slice(0, 10);

    await connection.beginTransaction();

    // 1. Update submission record with Admin approval stamp
    await connection.query(
      `UPDATE agent_day_submissions
       SET status = ?,
           approved_by = ?,
           approval_date = CURDATE(),
           approved_at = CURRENT_TIMESTAMP,
           admin_notes = ?,
           verified_cash_amount = ?,
           verified_upi_amount = ?
       WHERE id = ?`,
      [status, adminId, admin_notes.trim(), finalCash, finalUpi, id]
    );

    // 2. If approved, reconcile all collections for this agent on that work date
    if (status === 'APPROVED') {
      await connection.query(
        `UPDATE collections
         SET verification_status = 'RECONCILED'
         WHERE agent_id = ? AND collection_date = ? AND verification_status = 'PENDING_RECONCILIATION'`,
        [sub.agent_id, workDateStr]
      );
    }

    await connection.commit();
    connection.release();

    // 3. Record audit log
    await recordAuditLog({
      userId: adminId,
      action: status === 'APPROVED' ? 'APPROVE_AGENT_DAY_CLOSING' : 'FLAG_AGENT_DAY_DISCREPANCY',
      resource: 'AGENT_DAY_SUBMISSIONS',
      details: {
        submissionId: id,
        agentId: sub.agent_id,
        workDate: sub.work_date,
        approvalDate: new Date().toISOString().slice(0, 10),
        status,
        verifiedCash: finalCash,
        verifiedUpi: finalUpi,
        adminNotes: admin_notes,
      },
    });

    // 4. Notify Agent
    createNotification({
      targetUserId: sub.agent_id,
      title: status === 'APPROVED' ? '✅ Day Handover Approved & Closed' : '⚠️ Day Handover Discrepancy Flagged',
      message: status === 'APPROVED'
        ? `Admin has counted your collected cash (₹${finalCash.toLocaleString('en-IN')}) and approved day closing for ${sub.work_date}. Receipts are officially verified.`
        : `Admin flagged a discrepancy in your day handover for ${sub.work_date}: "${admin_notes || 'Please consult the admin desk.'}"`,
      type: 'COLLECTION',
      link: '/agent/dashboard',
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: status === 'APPROVED'
        ? `Day handover for ${sub.work_date} successfully counted, verified and closed.`
        : `Day handover marked with discrepancy notes.`,
      data: {
        id: parseInt(id, 10),
        agentId: sub.agent_id,
        workDate: sub.work_date,
        status,
        approvedBy: adminId,
        approvalDate: new Date().toISOString().slice(0, 10),
        approvedAt: new Date().toISOString(),
        verifiedCashAmount: finalCash,
        verifiedUpiAmount: finalUpi,
        adminNotes: admin_notes,
      },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    next(error);
  }
}
