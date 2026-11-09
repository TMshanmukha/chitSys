import { pool } from '../config/db.js';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';
import { getMonthlyCycleInfo } from '../utils/cycleHelper.js';
import { getTodayIST } from '../utils/dateUtils.js';
import { broadcastSync } from '../services/realtimeService.js';
import { ensureAdvanceTables } from '../services/advanceEngine.js';

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

    await ensureAdvanceTables();

    // Include every collector in covered routes so admin-recorded work is complete in the roster.
    const [collections] = await pool.query(
      `SELECT c.id, c.receipt_number, c.group_id, c.member_id, c.amount, c.normal_amount, c.advance_amount, c.payment_method, c.payment_reference,
              c.collection_date, c.collection_time, c.notes, m.full_name as member_name, gm.ticket_number, m.phone as member_phone,
              g.group_name, g.group_code, handler.full_name AS completed_by_name, handler.role AS collector_role, c.agent_id AS collector_id
       FROM collections c
       JOIN members m ON c.member_id = m.id
       LEFT JOIN group_memberships gm ON c.group_id = gm.group_id AND c.member_id = gm.member_id
       LEFT JOIN chit_groups g ON c.group_id = g.id
       LEFT JOIN users handler ON handler.id=c.agent_id
       WHERE (c.agent_id = ? OR c.group_id IN (?))
         AND (c.collection_date = ? OR DATE(c.created_at) = ?)
         AND c.verification_status != 'CANCELLED'
       ORDER BY c.collection_time ASC, c.id ASC`,
      [agentId, groupIds.length ? groupIds : [-1], workDate, workDate]
    );
    const agentCollections = collections.filter((c) => Number(c.collector_id) === Number(agentId));

    // Ensure any group where this agent recorded collections is represented in groups list
    for (const c of agentCollections) {
      if (c.group_id && !groups.some((g) => g.id === c.group_id)) {
        groups.push({
          id: c.group_id,
          group_code: c.group_code || `GRP-${c.group_id}`,
          group_name: c.group_name || `Chit Scheme #${c.group_id}`,
          chit_type: 'AUCTION_CHIT',
          frequency: 'DAILY',
          installment_amount: c.amount || 0,
          total_pool_amount: 0,
          start_date: null,
          created_at: null,
          absent_agent_name: null,
        });
      }
    }

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

    // 4b. Fetch all advance adjustments recorded for this date
    const [allAdjustments] = groupIds.length > 0 ? await pool.query(
      `SELECT credit_id, group_id, member_id, amount_adjusted
       FROM member_advance_adjustments
       WHERE adjustment_date = ? AND group_id IN (?)`,
      [workDate, groupIds]
    ) : [[]];

    const adjustmentMap = new Map();
    for (const adj of allAdjustments) {
      const key = `${adj.group_id}_${adj.member_id}`;
      adjustmentMap.set(key, (adjustmentMap.get(key) || 0) + parseFloat(adj.amount_adjusted || 0));
    }

    // 5. Structure "What Chits It Collected" breakdown & subscriber rosters
    let totalStopsVisited = 0;
    let totalStopsPending = 0;

    const chitBreakdown = groups.map((g) => {
      const isDaily = g.frequency === 'DAILY';
      const cycleInfo = isDaily ? null : getMonthlyCycleInfo(g.start_date || g.created_at, workDate);
      const installmentAmt = parseFloat(g.installment_amount || 0);
      const isDeadlineToday = isDaily || Boolean(cycleInfo && cycleInfo.isDeadlineToday);
      const hasTimeRemaining = !isDaily && Boolean(cycleInfo && cycleInfo.daysRemaining > 0);

      const gMembers = enrolledMembers.filter((m) => m.group_id === g.id);
      const gCollections = collections.filter((c) => c.group_id === g.id);

      // Separate agent collections from admin collections
      const gAdminColls = gCollections.filter((c) => 
        ['ADMIN','SUPER_ADMIN'].includes((c.collector_role || '').toUpperCase()) || 
        (c.collector_id && Number(c.collector_id) !== Number(agentId))
      );
      const gAgentColls = gCollections.filter((c) => 
        !['ADMIN','SUPER_ADMIN'].includes((c.collector_role || '').toUpperCase()) && 
        (!c.collector_id || Number(c.collector_id) === Number(agentId))
      );

      const gAdminAmount = gAdminColls.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
      const gAgentCash = gAgentColls
        .filter((c) => (c.payment_method || '').toUpperCase().trim() === 'CASH')
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

      const gAgentUpi = gAgentColls
        .filter((c) => (c.payment_method || '').toUpperCase().trim() !== 'CASH')
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

      const gAgentTotal = gAgentCash + gAgentUpi;
      const gAgentAdvance = gAgentColls.reduce((sum, c) => sum + parseFloat(c.advance_amount || 0), 0);
      const gAgentNormal = Math.max(0, gAgentTotal - gAgentAdvance);
      const gTotal = gAgentTotal + gAdminAmount;

      // Paid vs unpaid members in this group
      const paidMembers = [];
      const unpaidMembers = [];
      let adminSolelyMembersCount = 0;
      let gAdvanceAdjustedTotal = 0;

      for (const m of gMembers) {
        const memberCollections = gCollections.filter((c) => c.member_id === m.member_id);
        const collectedForMember = memberCollections.reduce((sum,c)=>sum+parseFloat(c.amount||0),0);
        const advanceAdjustedForMember = adjustmentMap.get(`${g.id}_${m.member_id}`) || 0;
        gAdvanceAdjustedTotal += advanceAdjustedForMember;
        const effectivePaidTotal = collectedForMember + advanceAdjustedForMember;
        const coll = memberCollections[0] || null;

        if (effectivePaidTotal >= installmentAmt && installmentAmt > 0) {
          const adminAmt = memberCollections
            .filter((item) => ['ADMIN','SUPER_ADMIN'].includes((item.collector_role || '').toUpperCase()) || (item.collector_id && Number(item.collector_id) !== Number(agentId)))
            .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
          const agentAmt = memberCollections
            .filter((item) => !['ADMIN','SUPER_ADMIN'].includes((item.collector_role || '').toUpperCase()) && (!item.collector_id || Number(item.collector_id) === Number(agentId)))
            .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
          const isPaidByAdmin = adminAmt > 0;
          const isCoveredByAdvance = Boolean(advanceAdjustedForMember >= installmentAmt && collectedForMember === 0);
          const isSolelyAdmin = isPaidByAdmin && agentAmt === 0;

          if (isSolelyAdmin || isCoveredByAdvance) {
            adminSolelyMembersCount++; // Task deducted from agent's active collection stops
          } else {
            totalStopsVisited++;
          }

          const memberAdvanceAmount = memberCollections.reduce((sum, c) => sum + parseFloat(c.advance_amount || 0), 0);
          const memberNormalAmount = installmentAmt > 0 ? Math.min(collectedForMember, installmentAmt) : collectedForMember;

          paidMembers.push({
            memberId: m.member_id,
            memberName: m.full_name,
            ticketNumber: m.ticket_number,
            phone: m.phone,
            amount: collectedForMember > 0 ? collectedForMember : installmentAmt,
            normalAmount: memberNormalAmount,
            advanceAmount: memberAdvanceAmount,
            hasAdvance: memberAdvanceAmount > 0,
            agentAmount: agentAmt,
            adminAmount: adminAmt,
            isAdvanceCovered: isCoveredByAdvance,
            advanceAdjustedAmount: advanceAdjustedForMember,
            paymentMethod: isCoveredByAdvance ? 'ADVANCE_CREDIT' : (coll ? coll.payment_method : 'CASH'),
            receiptNumber: coll ? coll.receipt_number : 'ADV-AUTO',
            collectionTime: coll ? coll.collection_time : null,
            completedBy: isCoveredByAdvance
              ? 'Auto-Advance Credit'
              : ([...new Set(memberCollections.map((item)=>item.completed_by_name).filter(Boolean))].join(', ') || null),
            completedByAdmin: isPaidByAdmin,
            paidByNotice: isCoveredByAdvance
              ? `Paid in advance from previous excess collection (₹${advanceAdjustedForMember.toLocaleString('en-IN')}) · Task Deducted`
              : (isSolelyAdmin
                  ? 'Paid by Admin, not by Agent'
                  : (isPaidByAdmin ? `₹${adminAmt} paid by Admin, ₹${agentAmt} collected by Agent` : 'Collected by Agent')),
            notes: coll ? (coll.notes || '') : 'Covered via advance credit',
            statusLabel: isCoveredByAdvance
              ? 'Paid via Advance'
              : (isSolelyAdmin ? 'Paid by Admin, not by Agent' : 'Collected Today'),
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
            advanceAdjusted: advanceAdjustedForMember,
            expectedAmount: installmentAmt,
            pendingDeficit: Math.max(0, installmentAmt - effectivePaidTotal),
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

      // Target expected for agent: deduct members collected directly by Admin or covered by Advance
      const agentActiveSubscribersCount = Math.max(0, gMembers.length - adminSolelyMembersCount);
      const expectedTarget = isDaily 
        ? agentActiveSubscribersCount * installmentAmt 
        : (cycleInfo?.isDeadlineToday ? agentActiveSubscribersCount * installmentAmt : 0);

      // Remaining due across active unpaid subscribers in this chit
      const actualPendingDue = unpaidMembers.reduce(
        (sum, m) => sum + (m.pendingDeficit !== undefined ? Number(m.pendingDeficit) : Number(m.expectedAmount || 0)),
        0
      );

      const pendingAmount = isDaily
        ? actualPendingDue
        : (cycleInfo?.isDeadlineToday ? actualPendingDue : (hasTimeRemaining ? actualPendingDue : 0));
      const progressPercent = expectedTarget > 0 ? Math.min(100, Math.round((gAgentTotal / expectedTarget) * 100)) : (gAgentTotal > 0 ? 100 : 0);

      return {
        groupId: g.id,
        groupCode: g.group_code,
        groupName: g.group_name,
        absentAgentName: g.absent_agent_name || null,
        frequency: g.frequency,
        chitType: g.chit_type,
        installmentAmount: installmentAmt,
        expectedTarget,
        cashCollected: gAgentCash,
        upiCollected: gAgentUpi,
        agentCollected: gAgentTotal,
        normalCollection: gAgentNormal,
        advanceCollection: gAgentAdvance,
        advanceAdjusted: gAdvanceAdjustedTotal,
        adminCollected: gAdminAmount,
        totalCollected: gAgentTotal,
        combinedTotalCollected: gTotal,
        pendingAmount,
        progressPercent,
        totalSubscribersCount: gMembers.length,
        adminPaidSubscribersCount: adminSolelyMembersCount,
        agentSubscribersCount: agentActiveSubscribersCount,
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
    const adminTotalCollected = chitBreakdown.reduce((sum, item) => sum + (item.adminCollected || 0), 0);
    const adminPaidMembersCount = chitBreakdown.reduce((sum, item) => sum + (item.adminPaidSubscribersCount || 0), 0);

    const grandExpectedTarget = chitBreakdown.reduce((sum, item) => sum + item.expectedTarget, 0);
    const overallCompletionPercent = grandExpectedTarget > 0
      ? Math.min(100, Math.round((totalCollected / grandExpectedTarget) * 100))
      : (totalCollected > 0 ? 100 : 0);

    const cashSharePercent = totalCollected > 0 ? Math.round((cashCollected / totalCollected) * 100) : 0;
    const upiSharePercent = totalCollected > 0 ? Math.round((upiCollected / totalCollected) * 100) : 0;

    const dailyChits = chitBreakdown.filter((c) => c.frequency === 'DAILY');
    const monthlyChits = chitBreakdown.filter((c) => c.frequency === 'MONTHLY');

    const dailyTarget = dailyChits.reduce((sum, item) => sum + item.expectedTarget, 0);
    const dailyCollected = dailyChits.reduce((sum, item) => sum + item.totalCollected, 0);
    const dailyPending = dailyChits.reduce((sum, item) => sum + Number(item.pendingAmount || 0), 0);

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

    const totalAdvanceCollected = chitBreakdown.reduce((sum, item) => sum + (item.advanceCollection || 0), 0);
    const totalAdvanceAdjusted = chitBreakdown.reduce((sum, item) => sum + (item.advanceAdjusted || 0), 0);
    const totalNormalCollected = Math.max(0, totalCollected - totalAdvanceCollected);

    const graphsAnalyses = {
      overallCompletionPercent,
      grandExpectedTarget,
      totalCollected,
      totalAdvanceCollected,
      totalAdvanceAdjusted,
      totalNormalCollected,
      adminTotalCollected,
      adminPaidMembersCount,
      grandPendingAmount: chitBreakdown.reduce((sum, item) => sum + Number(item.pendingAmount || 0), 0),
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
        normalCollected: item.normalCollection,
        advanceCollected: item.advanceCollection,
        advanceAdjusted: item.advanceAdjusted,
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
        totalAdvanceCollected,
        totalAdvanceAdjusted,
        totalNormalCollected,
        totalReceipts,
        totalStopsVisited,
        totalStopsPending,
        adminTotalCollected,
        adminPaidMembersCount,
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
      totalAdvanceCollected,
      totalAdvanceAdjusted,
      totalNormalCollected,
      totalReceipts,
      totalStopsVisited,
      totalStopsPending,
      adminTotalCollected,
      adminPaidMembersCount,
      chitBreakdown,
      graphsAnalyses,
      payloadJson,
    };
}

/**
 * Live preview calculation of today's route collections, chits and graphs without submitting.
 * Automatically detects whether previous shifts were approved and whether new work/chits are assigned today.
 */
export async function previewAgentDayWork(req, res, next) {
  try {
    const agentId = req.user.id;
    const workDate = req.query.date || getTodayIST();
    const data = await calculateDayWorkData(agentId, workDate);

    // Fetch all submissions for this agent on this date
    const [existing] = await pool.query(
      `SELECT ads.*, u.full_name as approved_by_name
       FROM agent_day_submissions ads
       LEFT JOIN users u ON ads.approved_by = u.id
       WHERE ads.agent_id = ? AND DATE(ads.work_date) = DATE(?)
       ORDER BY ads.id DESC`,
      [agentId, workDate]
    );

    const approvedSubs = existing.filter((s) => s.status === 'APPROVED');
    const pendingSubs = existing.filter((s) => s.status !== 'APPROVED');

    const previouslyApprovedCash = approvedSubs.reduce((sum, s) => sum + parseFloat(s.verified_cash_amount ?? s.cash_collected ?? 0), 0);
    const previouslyApprovedUpi = approvedSubs.reduce((sum, s) => sum + parseFloat(s.verified_upi_amount ?? s.upi_collected ?? 0), 0);
    const previouslyApprovedTotal = approvedSubs.reduce((sum, s) => sum + parseFloat(s.total_collected ?? 0), 0);
    const previouslyApprovedReceipts = approvedSubs.reduce((sum, s) => sum + parseInt(s.total_receipts ?? 0, 10), 0);

    const shiftCash = Math.max(0, data.cashCollected - previouslyApprovedCash);
    const shiftUpi = Math.max(0, data.upiCollected - previouslyApprovedUpi);
    const shiftTotal = Math.max(0, data.totalCollected - previouslyApprovedTotal);
    const shiftReceipts = Math.max(0, data.totalReceipts - previouslyApprovedReceipts);

    let isSubmitted = false;
    let currentSubmission = null;
    let shiftNumber = approvedSubs.length + 1;
    let hasAdditionalWork = false;

    if (pendingSubs.length > 0) {
      // Active pending submission currently awaiting admin review
      const prevChits = (pendingSubs[0]?.details?.chitBreakdown || []);
      const prevGroupIds = new Set(prevChits.map((c) => c.groupId));
      const hasNewAssignedGroups = (data.chitBreakdown || []).some((c) => !prevGroupIds.has(c.groupId));
      const hasNewCollections = data.totalReceipts > (pendingSubs[0]?.total_receipts || 0);

      isSubmitted = false; // Allow re-submitting updated handover
      currentSubmission = pendingSubs[0];
      shiftNumber = approvedSubs.length + pendingSubs.length;
      hasAdditionalWork = hasNewAssignedGroups || hasNewCollections || data.totalStopsPending > 0;
    } else if (approvedSubs.length > 0) {
      // Previous shift was approved & closed. Check if Admin assigned new work or if there are new collections
      const prevChits = (approvedSubs[0]?.details?.chitBreakdown || []);
      const prevGroupIds = new Set(prevChits.map((c) => c.groupId));
      const hasNewAssignedGroups = (data.chitBreakdown || []).some((c) => !prevGroupIds.has(c.groupId));
      const hasPendingStops = data.totalStopsPending > 0;
      const hasNewCollections = shiftTotal > 0 || shiftReceipts > 0;

      if (hasPendingStops || hasNewCollections || hasNewAssignedGroups) {
        // Automatically re-open Day Submit for Shift #2 (Additional Assignment)!
        isSubmitted = false;
        currentSubmission = null;
        hasAdditionalWork = true;
        shiftNumber = approvedSubs.length + 1;
      } else {
        // All stops visited, no new assignments or collections
        isSubmitted = true;
        currentSubmission = approvedSubs[0];
        shiftNumber = approvedSubs.length;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        workDate,
        isSubmitted,
        hasAdditionalWork,
        isAdditionalShift: approvedSubs.length > 0,
        shiftNumber,
        previouslyApprovedCash,
        previouslyApprovedUpi,
        previouslyApprovedTotal,
        previouslyApprovedReceipts,
        shiftCashToHandover: shiftCash,
        shiftUpiCollected: shiftUpi,
        shiftTotalCollected: shiftTotal,
        shiftReceiptsCount: shiftReceipts,
        allPreviousSubmissions: existing,
        submission: currentSubmission ? {
          id: currentSubmission.id,
          status: currentSubmission.status,
          adminNotes: currentSubmission.admin_notes,
          verifiedCashAmount: currentSubmission.verified_cash_amount ? parseFloat(currentSubmission.verified_cash_amount) : null,
          verifiedUpiAmount: currentSubmission.verified_upi_amount ? parseFloat(currentSubmission.verified_upi_amount) : null,
          approvedByName: currentSubmission.approved_by_name,
          approvedAt: currentSubmission.approved_at,
          submittedAt: currentSubmission.submitted_at,
          agentNotes: currentSubmission.agent_notes,
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
 * If previous shift was already approved and cash handed over, creates a distinct Shift #2 submission
 * so Admin receives a second approval form for counting the newly collected cash.
 */
export async function submitAgentDayWork(req, res, next) {
  try {
    const agentId = req.user.id;
    const workDate = req.body.work_date || getTodayIST();
    const agentNotes = req.body.agent_notes || '';
    const normalizedWorkDate = String(workDate).slice(0, 10);

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

    // Check existing submissions today
    const [existing] = await pool.query(
      `SELECT * FROM agent_day_submissions WHERE agent_id = ? AND DATE(work_date) = DATE(?) ORDER BY id DESC`,
      [agentId, normalizedWorkDate]
    );

    const approvedSubs = existing.filter((s) => s.status === 'APPROVED');
    const pendingSubs = existing.filter((s) => s.status !== 'APPROVED');

    let submissionId;
    let shiftNumber = 1;
    let finalCashToSubmit = cashCollected;
    let finalUpiToSubmit = upiCollected;
    let finalTotalToSubmit = totalCollected;
    let finalReceiptsToSubmit = totalReceipts;

    if (approvedSubs.length > 0) {
      // Previous shift was approved and cash was handed over
      shiftNumber = approvedSubs.length + 1;
      const prevApprovedCash = approvedSubs.reduce((sum, s) => sum + parseFloat(s.verified_cash_amount ?? s.cash_collected ?? 0), 0);
      const prevApprovedUpi = approvedSubs.reduce((sum, s) => sum + parseFloat(s.verified_upi_amount ?? s.upi_collected ?? 0), 0);
      const prevApprovedTotal = approvedSubs.reduce((sum, s) => sum + parseFloat(s.total_collected ?? 0), 0);
      const prevApprovedReceipts = approvedSubs.reduce((sum, s) => sum + parseInt(s.total_receipts ?? 0, 10), 0);

      finalCashToSubmit = Math.max(0, cashCollected - prevApprovedCash);
      finalUpiToSubmit = Math.max(0, upiCollected - prevApprovedUpi);
      finalTotalToSubmit = Math.max(0, totalCollected - prevApprovedTotal);
      finalReceiptsToSubmit = Math.max(0, totalReceipts - prevApprovedReceipts);

      const shiftPayloadJson = JSON.stringify({
        workDate: normalizedWorkDate,
        shiftNumber,
        isAdditionalShift: true,
        summary: {
          cashCollected: finalCashToSubmit,
          upiCollected: finalUpiToSubmit,
          chequeCollected: 0,
          totalCollected: finalTotalToSubmit,
          totalReceipts: finalReceiptsToSubmit,
          totalStopsVisited,
          totalStopsPending,
          dayGrandCashCollected: cashCollected,
          dayGrandUpiCollected: upiCollected,
          dayGrandTotalCollected: totalCollected,
          previouslyApprovedCash: prevApprovedCash,
          previouslyApprovedTotal: prevApprovedTotal,
        },
        graphsAnalyses,
        chitBreakdown,
        submittedAt: new Date().toISOString(),
      });

      if (pendingSubs.length > 0) {
        // Re-submission / update on the pending shift
        submissionId = pendingSubs[0].id;
        await pool.query(
          `UPDATE agent_day_submissions
           SET cash_collected = ?,
               upi_collected = ?,
               cheque_collected = 0,
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
            finalCashToSubmit,
            finalUpiToSubmit,
            finalTotalToSubmit,
            finalReceiptsToSubmit,
            totalStopsVisited,
            totalStopsPending,
            shiftPayloadJson,
            agentNotes ? `[Shift #${shiftNumber}] ${agentNotes}` : `Shift #${shiftNumber} (Additional Work)`,
            submissionId,
          ]
        );
      } else {
        // First approved shift is completed -> INSERT Shift #2 as a distinct new submission record!
        const [insertRes] = await pool.query(
          `INSERT INTO agent_day_submissions (
             agent_id, work_date, cash_collected, upi_collected, cheque_collected, total_collected,
             total_receipts, total_stops_visited, total_stops_pending, chit_breakdown_json, agent_notes, status
           ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL')`,
          [
            agentId,
            normalizedWorkDate,
            finalCashToSubmit,
            finalUpiToSubmit,
            finalTotalToSubmit,
            finalReceiptsToSubmit,
            totalStopsVisited,
            totalStopsPending,
            shiftPayloadJson,
            agentNotes ? `[Shift #${shiftNumber}] ${agentNotes}` : `Shift #${shiftNumber} (Additional Work)`,
          ]
        );
        submissionId = insertRes.insertId;
      }
    } else {
      // Shift 1 normal submission
      if (pendingSubs.length > 0) {
        submissionId = pendingSubs[0].id;
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
               submitted_at = CURRENT_TIMESTAMP,
               approved_by = NULL,
               approved_at = NULL,
               approval_date = NULL,
               verified_cash_amount = NULL,
               verified_upi_amount = NULL
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
            normalizedWorkDate,
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

    broadcastSync({
      business: 'chitfund',
      entity: 'day_closing',
      action: 'SUBMIT',
      data: {
        submissionId: result.insertId || existingRows[0]?.id,
        agentId,
        workDate,
        totalCollected,
        cashCollected,
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

    // Query active agents with unsubmitted shift handovers in the last 7 days
    const [unsubmittedAgents] = await pool.query(
      `SELECT c.collection_date as work_date, u.id as agent_id, u.full_name as agent_name, u.username as agent_username, u.phone as agent_phone,
              COALESCE(SUM(CASE WHEN (c.payment_method = 'CASH' OR c.payment_method IS NULL) THEN c.amount ELSE 0 END), 0) as cash_collected,
              COALESCE(SUM(CASE WHEN (c.payment_method != 'CASH' AND c.payment_method IS NOT NULL) THEN c.amount ELSE 0 END), 0) as upi_collected,
              COALESCE(SUM(c.amount), 0) as total_collected,
              COUNT(c.id) as receipts_count
       FROM collections c
       JOIN users u ON c.agent_id = u.id
       WHERE c.collection_date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
         AND c.collection_date <= CURRENT_DATE
         AND c.verification_status != 'CANCELLED'
         AND u.role = 'COLLECTION_AGENT'
         AND (u.assigned_business = 'CHITFUND' OR (u.assigned_business = 'ALL' AND u.role IN ('SUPER_ADMIN', 'ADMIN')) OR (u.assigned_business IS NULL AND u.id NOT IN (SELECT user_id FROM interest_user_profiles)))
         AND (u.assigned_business != 'INTEREST' OR u.assigned_business IS NULL)
         AND NOT EXISTS (
           SELECT 1 FROM agent_day_submissions ads
           WHERE ads.agent_id = c.agent_id
             AND ads.work_date = c.collection_date
             AND ads.status IN ('PENDING_APPROVAL', 'APPROVED')
         )
       GROUP BY c.collection_date, u.id, u.full_name, u.username, u.phone
       ORDER BY c.collection_date DESC, total_collected DESC`
    );

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
      WHERE (u.assigned_business = 'CHITFUND' OR (u.assigned_business = 'ALL' AND u.role IN ('SUPER_ADMIN', 'ADMIN')) OR (u.assigned_business IS NULL AND u.id NOT IN (SELECT user_id FROM interest_user_profiles)))
        AND (u.assigned_business != 'INTEREST' OR u.assigned_business IS NULL)
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

    // Query active agents who collected funds in the last 7 days but have not submitted shifts
    const [unsubmittedAgents] = await pool.query(
      `SELECT c.collection_date as work_date, u.id as agent_id, u.full_name as agent_name, u.username as agent_username, u.phone as agent_phone,
              COALESCE(SUM(CASE WHEN (c.payment_method = 'CASH' OR c.payment_method IS NULL) THEN c.amount ELSE 0 END), 0) as cash_collected,
              COALESCE(SUM(CASE WHEN (c.payment_method != 'CASH' AND c.payment_method IS NOT NULL) THEN c.amount ELSE 0 END), 0) as upi_collected,
              COALESCE(SUM(c.amount), 0) as total_collected,
              COUNT(c.id) as receipts_count
       FROM collections c
       JOIN users u ON c.agent_id = u.id
       WHERE c.collection_date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
         AND c.collection_date <= CURRENT_DATE
         AND c.verification_status != 'CANCELLED'
         AND u.role = 'COLLECTION_AGENT'
         AND (u.assigned_business = 'CHITFUND' OR (u.assigned_business = 'ALL' AND u.role IN ('SUPER_ADMIN', 'ADMIN')) OR (u.assigned_business IS NULL AND u.id NOT IN (SELECT user_id FROM interest_user_profiles)))
         AND (u.assigned_business != 'INTEREST' OR u.assigned_business IS NULL)
         AND NOT EXISTS (
           SELECT 1 FROM agent_day_submissions ads
           WHERE ads.agent_id = c.agent_id
             AND ads.work_date = c.collection_date
             AND ads.status IN ('PENDING_APPROVAL', 'APPROVED')
         )
       GROUP BY c.collection_date, u.id, u.full_name, u.username, u.phone
       ORDER BY c.collection_date DESC, total_collected DESC`
    );

    const summaryData = {
      pendingCount,
      pendingTotalCash,
      pendingTotalUpi,
      pendingTotalAmount,
      approvedCount,
      approvedTotalAmount,
      totalSubmissionsCount: rows.length,
      // Compatibility fields for RouteTrackingPage:
      total_pending: pendingCount,
      pending_cash: pendingTotalCash,
      pending_upi: pendingTotalUpi,
      pending_total: pendingTotalAmount,
      total_approved: approvedCount,
      approved_total: approvedTotalAmount,
      total_cash: pendingTotalCash + approvedTotalAmount,
      total_upi: pendingTotalUpi,
      total_collected: pendingTotalAmount + approvedTotalAmount,
    };

    res.status(200).json({
      success: true,
      data: {
        summary: summaryData,
        submissions: formatted,
        unsubmittedAgents: unsubmittedAgents || [],
      },
      summary: summaryData,
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
    const todayIST = getTodayIST();
    await connection.query(
      `UPDATE agent_day_submissions
       SET status = ?,
           approved_by = ?,
           approval_date = ?,
           approved_at = CURRENT_TIMESTAMP,
           admin_notes = ?,
           verified_cash_amount = ?,
           verified_upi_amount = ?
       WHERE id = ?`,
      [status, adminId, todayIST, admin_notes.trim(), finalCash, finalUpi, id]
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

    broadcastSync({
      business: 'chitfund',
      entity: 'day_closing',
      action: 'APPROVE',
      data: {
        id: parseInt(id, 10),
        agentId: sub.agent_id,
        workDate: sub.work_date,
        status,
      },
    });
    broadcastSync({
      business: 'chitfund',
      entity: 'collections',
      action: 'RECONCILE',
      data: { agentId: sub.agent_id, workDate: sub.work_date },
    });

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


/**
 * Return any unsubmitted days in the past 14 days for the logged-in agent.
 * Enables submitting past forgotten days separately so date amounts never mix!
 */
export async function getMyUnsubmittedDays(req, res, next) {
  try {
    const agentId = req.user.id;
    const [datesWithCollections] = await pool.query(
      `SELECT DISTINCT c.collection_date as work_date
       FROM collections c
       WHERE c.agent_id = ?
         AND c.collection_date >= DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY)
         AND c.collection_date <= CURRENT_DATE
         AND c.verification_status != 'CANCELLED'
         AND NOT EXISTS (
           SELECT 1 FROM agent_day_submissions ads
           WHERE ads.agent_id = c.agent_id
             AND ads.work_date = c.collection_date
             AND ads.status IN ('PENDING_APPROVAL', 'APPROVED')
         )
       ORDER BY c.collection_date ASC`,
      [agentId]
    );

    const unsubmitted = [];
    for (const row of datesWithCollections) {
      const dateStr = typeof row.work_date === 'string'
        ? row.work_date.slice(0, 10)
        : new Date(row.work_date).toISOString().slice(0, 10);
      try {
        const data = await calculateDayWorkData(agentId, dateStr);
        unsubmitted.push({
          work_date: dateStr,
          cash_collected: data.cashCollected,
          upi_collected: data.upiCollected,
          cheque_collected: data.chequeCollected,
          total_collected: data.totalCollected,
          total_receipts: data.totalReceipts,
          total_stops_visited: data.totalStopsVisited,
          total_stops_pending: data.totalStopsPending,
          groups_count: (data.chitBreakdown || []).length,
          chitBreakdown: data.chitBreakdown || [],
        });
      } catch (err) {
        console.error('Error calculating day work for unsubmitted date', dateStr, err);
      }
    }

    res.json({ success: true, unsubmitted });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin action: Unlock a day submission so an agent can collect additional payments and resubmit.
 */
export async function unlockDaySubmissionForAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const [sub] = await pool.query(
      `SELECT ads.*, u.full_name as agent_name FROM agent_day_submissions ads JOIN users u ON ads.agent_id = u.id WHERE ads.id = ?`,
      [id]
    );
    if (!sub.length) return res.status(404).json({ success: false, message: 'Submission record not found.' });

    const submission = sub[0];
    const workDateStr = typeof submission.work_date === 'string'
      ? submission.work_date.slice(0, 10)
      : new Date(submission.work_date).toISOString().slice(0, 10);

    // Reset status to PENDING_APPROVAL and completely clear all approval markers and notes
    await pool.query(
      `UPDATE agent_day_submissions 
       SET status = 'PENDING_APPROVAL', 
           approved_by = NULL,
           approved_at = NULL,
           approval_date = NULL,
           verified_cash_amount = NULL,
           verified_upi_amount = NULL,
           admin_notes = NULL
       WHERE id = ?`,
      [id]
    );

    // Reset collections verification_status back to PENDING_RECONCILIATION
    await pool.query(
      `UPDATE collections
       SET verification_status = 'PENDING_RECONCILIATION'
       WHERE agent_id = ? AND collection_date = ? AND verification_status = 'RECONCILED'`,
      [submission.agent_id, workDateStr]
    );

    await createNotification({
      userId: submission.agent_id,
      title: 'Day Shift Unlocked by Admin',
      message: `Admin has unlocked your day shift for ${workDateStr}. You can now review, update collections, and re-submit your day closing.`,
      type: 'COLLECTION',
      link: '/agent/day-closing'
    });

    broadcastSync({
      business: 'chitfund',
      entity: 'day_closing',
      action: 'UNLOCK',
      data: {
        id: parseInt(id, 10),
        agentId: submission.agent_id,
        workDate: workDateStr,
      },
    });
    broadcastSync({
      business: 'chitfund',
      entity: 'collections',
      action: 'UNLOCK',
      data: { agentId: submission.agent_id, workDate: workDateStr },
    });

    res.json({
      success: true,
      message: `Day shift for ${workDateStr} unlocked successfully. ${submission.agent_name} can now update collections and re-submit.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin action: Send a prompt notification to an agent who hasn't submitted day closing.
 */
export async function remindAgentUnsubmittedShift(req, res, next) {
  try {
    const { agentId, workDate } = req.body;
    const [agent] = await pool.query('SELECT full_name FROM users WHERE id = ?', [agentId]);
    if (!agent.length) return res.status(404).json({ success: false, message: 'Agent not found' });

    await createNotification({
      userId: agentId,
      title: 'Action Required: Submit Day Closing',
      message: `Admin notice: Your collections and cash handover for ${workDate} have not been submitted. Please complete your shift submission.`,
      type: 'COLLECTION',
      link: '/agent/day-closing'
    });

    res.json({ success: true, message: `Reminder sent to ${agent[0].full_name}.` });
  } catch (error) {
    next(error);
  }
}
