import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { recordAuditLog } from '../services/authService.js';
import { getMonthlyCycleInfo, formatYMD } from '../utils/cycleHelper.js';
import { getTodayIST } from '../utils/dateUtils.js';

const agentSchema = z.object({
  full_name: z.string().min(2, 'Agent full name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(4, 'Password/PIN must be at least 4 characters'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
});

export async function listAgents(req, res, next) {
  try {
    const { role } = req.query;
    const todayIST = getTodayIST();
    let query = `
      SELECT 
        u.id, u.full_name, u.username, u.role, u.assigned_business, u.phone, u.is_active, u.last_login_at, u.created_at,
        COUNT(DISTINCT aga.id) as assigned_groups_count,
        CAST(GROUP_CONCAT(DISTINCT g.group_name SEPARATOR ', ') AS CHAR) as assigned_group_names,
        COALESCE(MAX(colls.today_cash), 0) as today_cash,
        COALESCE(MAX(colls.today_upi), 0) as today_upi,
        COALESCE(MAX(colls.today_online), 0) as today_online,
        COALESCE(MAX(colls.today_total), 0) as today_total
      FROM users u
      LEFT JOIN agent_group_assignments aga ON u.id = aga.agent_id AND aga.is_active = 1
      LEFT JOIN chit_groups g ON aga.group_id = g.id
      LEFT JOIN (
        SELECT agent_id,
               SUM(CASE WHEN UPPER(TRIM(payment_method)) = 'CASH' THEN amount ELSE 0 END) as today_cash,
               SUM(CASE WHEN UPPER(TRIM(payment_method)) = 'UPI' THEN amount ELSE 0 END) as today_upi,
               SUM(CASE WHEN UPPER(TRIM(payment_method)) != 'CASH' THEN amount ELSE 0 END) as today_online,
               SUM(amount) as today_total
        FROM collections
        WHERE collection_date = ? AND verification_status != 'CANCELLED'
        GROUP BY agent_id
      ) colls ON u.id = colls.agent_id
    `;
    const conditions = [];
    const params = [todayIST];

    // STRICT BUSINESS ISOLATION:
    // Only return ChitFund Pro agents or Super Admins. Strictly exclude FinLend Pro ('INTEREST') users/collectors.
    conditions.push("(u.assigned_business = 'CHITFUND' OR (u.assigned_business = 'ALL' AND u.role IN ('SUPER_ADMIN', 'ADMIN')) OR (u.assigned_business IS NULL AND u.id NOT IN (SELECT user_id FROM interest_user_profiles)))");
    conditions.push("(u.assigned_business != 'INTEREST')");

    if (role && role !== 'ALL') {
      conditions.push('u.role = ?');
      params.push(role);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
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

    const targetBusiness = targetRole === 'ADMIN' ? 'ALL' : 'CHITFUND';

    const [insertResult] = await pool.execute(
      `INSERT INTO users (full_name, username, password_hash, role, assigned_business, phone, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        validated.full_name.trim(),
        validated.username.toLowerCase().trim(),
        passwordHash,
        targetRole,
        targetBusiness,
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
    if (req.body.assigned_business) {
      updates.push('assigned_business = ?');
      params.push(req.body.assigned_business);
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

    const todayIST = getTodayIST();

    // Enforce business invariant: Exactly ONE agent can be assigned to a chit group
    await pool.execute('UPDATE agent_group_assignments SET is_active = 0 WHERE group_id = ?', [groupId]);

    await pool.execute(
      `INSERT INTO agent_group_assignments (agent_id, group_id, assigned_date, is_active, assigned_by)
       VALUES (?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE is_active = 1, assigned_by = VALUES(assigned_by)`,
      [agentId, groupId, todayIST, req.user.id]
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
    const todayStr = getTodayIST();

    const [groups] = await pool.execute(
      `SELECT g.id, g.group_code, g.group_name, g.chit_type, g.frequency, g.route_category,
              g.location_name, g.installment_amount, g.total_pool_amount, g.status,
              g.start_date, g.created_at
       FROM agent_group_assignments aga
       JOIN chit_groups g ON aga.group_id = g.id
       WHERE aga.agent_id = ? AND aga.is_active = 1 AND g.status = 'ACTIVE'
         AND NOT EXISTS (SELECT 1 FROM agent_leaves al WHERE al.agent_id=aga.agent_id AND al.leave_date=? AND al.status='APPROVED')
       ORDER BY g.route_category ASC, g.id ASC`,
      [agentId, todayStr]
    );

    // Approved leave coverage adds the absent agent's routes only for the covered day.
    const [coveredGroups] = await pool.execute(
      `SELECT g.id,g.group_code,g.group_name,g.chit_type,g.frequency,g.route_category,
              g.location_name,g.installment_amount,g.total_pool_amount,g.status,g.start_date,g.created_at,
              l.agent_id AS absent_agent_id, absent.full_name AS absent_agent_name
       FROM agent_leave_coverages c JOIN agent_leaves l ON l.id=c.leave_id
       JOIN chit_groups g ON g.id=c.group_id JOIN users absent ON absent.id=l.agent_id
       WHERE c.covering_agent_id=? AND l.leave_date=? AND l.status='APPROVED' AND g.status='ACTIVE'`, [agentId, todayStr]);
    for (const g of coveredGroups) if (!groups.some((mine) => mine.id === g.id)) groups.push({ ...g, temporary_coverage: true });

    const enrichedGroups = groups.map((g) => {
      const isDaily = g.frequency === 'DAILY';
      const cycleInfo = isDaily ? null : getMonthlyCycleInfo(g.start_date || g.created_at, todayStr);
      const isDueToday = isDaily || (cycleInfo ? cycleInfo.isDeadlineToday : false);
      return {
        ...g,
        cycle_type: g.frequency,
        cycle_mode: isDaily ? 'DAY_BY_DAY' : 'MONTH_BY_MONTH',
        cycle_label: isDaily ? 'Day-by-Day (Today)' : `Month-by-Month (Due: ${cycleInfo?.cycleDue})`,
        cycle_period_label: isDaily ? 'Daily Installment' : 'Monthly Installment',
        is_due_today: isDueToday,
        cycle_start: cycleInfo ? cycleInfo.cycleStart : null,
        cycle_due: cycleInfo ? cycleInfo.cycleDue : null,
        cycle_anchor_day: cycleInfo ? cycleInfo.anchorDay : null,
        cycle_days_remaining: cycleInfo ? cycleInfo.daysRemaining : 0,
        is_deadline_today: cycleInfo ? cycleInfo.isDeadlineToday : false,
        has_time_remaining: cycleInfo ? cycleInfo.hasTimeRemaining : false,
        is_overdue: cycleInfo ? cycleInfo.isOverdue : false,
        collection_schedule_note: isDaily
          ? 'Collected daily (Every day task)'
          : (cycleInfo ? cycleInfo.statusNotice : 'Monthly chit collected anytime during monthly cycle'),
      };
    });

    const groupMap = new Map(enrichedGroups.map((g) => [g.id, g]));
    const groupIds = groups.map((g) => g.id);
    let members = [];

    if (groupIds.length > 0) {
      // 1. Fetch active enrolled members
      const [memberRows] = await pool.query(
        `SELECT gm.group_id, gm.ticket_number, gm.joined_date, m.id as member_id, m.member_code, m.full_name, m.phone,
                m.alternate_phone, m.address, m.kyc_type, m.kyc_number,
                g.frequency as group_frequency, g.chit_type as group_chit_type, g.installment_amount as group_installment_amount
         FROM group_memberships gm
         JOIN chit_groups g ON gm.group_id = g.id
         JOIN members m ON gm.member_id = m.id
         WHERE gm.group_id IN (?) AND gm.status = 'ACTIVE'
         ORDER BY gm.group_id ASC, gm.ticket_number ASC`,
        [groupIds]
      );

      // 2. Fetch collections for assigned groups within the last 60 days
      const [colls] = await pool.query(
        `SELECT c.id, c.group_id, c.member_id, c.amount, c.payment_method, c.receipt_number,
                c.collection_date, c.collection_time, c.notes, c.agent_id, collector.full_name AS collector_name, collector.role AS collector_role
         FROM collections c
         LEFT JOIN users collector ON collector.id=c.agent_id
         WHERE c.group_id IN (?) AND c.verification_status != 'CANCELLED'
           AND c.collection_date >= DATE_SUB(?, INTERVAL 60 DAY)
         ORDER BY c.collection_date DESC, c.collection_time DESC, c.id DESC`,
        [groupIds, todayStr]
      );

      // 3. Fetch tracking logs within the last 60 days
      const [trackingLogs] = await pool.query(
        `SELECT atl.id, atl.group_id, atl.member_id, atl.stop_id, atl.tracking_date, atl.status, atl.notes, atl.last_ping_time
         FROM agent_tracking_logs atl
         WHERE atl.group_id IN (?) AND atl.tracking_date >= DATE_SUB(?, INTERVAL 60 DAY)
         ORDER BY atl.tracking_date DESC, atl.last_ping_time DESC, atl.id DESC`,
        [groupIds, todayStr]
      );

      // 4. Fetch active collection edit requests for this agent
      let editRequests = [];
      try {
        const [cerRows] = await pool.query(
          `SELECT cer.id, cer.collection_id, cer.status, cer.requested_amount, cer.requested_payment_method, cer.reason, cer.admin_notes
           FROM collection_edit_requests cer
           WHERE cer.agent_id = ? AND cer.status IN ('PENDING', 'APPROVED')`,
          [agentId]
        );
        editRequests = cerRows;
      } catch (_) {}

      members = memberRows.map((m) => {
        const g = groupMap.get(m.group_id);
        const isDaily = g ? g.frequency === 'DAILY' : m.group_frequency === 'DAILY';
        const installmentAmt = Number(m.group_installment_amount || g?.installment_amount || 0);

        // Filter collections that belong to the member's current active cycle
        const inCycleColls = colls.filter((c) => {
          if (c.group_id !== m.group_id || c.member_id !== m.member_id) return false;
          if (isDaily) {
            const collDateStr = typeof c.collection_date === 'string' 
              ? c.collection_date.slice(0, 10) 
              : new Date(c.collection_date).toISOString().slice(0, 10);
            return collDateStr === todayStr;
          }
          if (g && g.cycle_start && g.cycle_due) {
            const collDateStr = typeof c.collection_date === 'string'
              ? c.collection_date.slice(0, 10)
              : new Date(c.collection_date).toISOString().slice(0, 10);
            return collDateStr >= g.cycle_start && collDateStr <= g.cycle_due;
          }
          return true;
        });

        const collectedAmt = inCycleColls.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const remainingBalance = installmentAmt > 0 ? Math.max(0, installmentAmt - collectedAmt) : 0;
        // STRICT PAID CHECK: must have actual collections AND meet installment amount
        // Guard: installmentAmt must be > 0, and collectedAmt must be > 0
        const isFullyPaid = collectedAmt > 0 && installmentAmt > 0 && collectedAmt >= installmentAmt;
        const isPartiallyPaid = collectedAmt > 0 && collectedAmt < installmentAmt;

        // Match latest tracking log for this cycle
        const atl = trackingLogs.find((l) => {
          if (l.group_id !== m.group_id) return false;
          const matchesMember = l.member_id === m.member_id || l.stop_id === m.ticket_number;
          if (!matchesMember) return false;
          const logDateStr = typeof l.tracking_date === 'string'
            ? l.tracking_date.slice(0, 10)
            : new Date(l.tracking_date).toISOString().slice(0, 10);
          if (isDaily) return logDateStr === todayStr;
          if (g && g.cycle_start && g.cycle_due) {
            return logDateStr >= g.cycle_start && logDateStr <= g.cycle_due;
          }
          return true;
        });

        // isPaid is STRICTLY based on actual collections, NOT tracking log status alone
        const isPaid = isFullyPaid;
        const status = isFullyPaid ? 'PAID' : (isPartiallyPaid ? 'PARTIAL' : (atl?.status === 'PAID' ? 'NOT_PAID' : (atl?.status || 'NOT_PAID')));
        const nodeColor = isFullyPaid ? 'GREEN' : (isPartiallyPaid ? 'YELLOW' : 'RED');
        const latestColl = inCycleColls[0] || null;
        const myCollection = inCycleColls.find((c) => Number(c.agent_id) === Number(agentId));
        const matchedEditReq = myCollection ? editRequests.find((er) => er.collection_id === myCollection.id) : null;

        // Check if member paid directly to admin/office or another collector
        const hasAdminColl = inCycleColls.some((c) => {
          const role = (c.collector_role || '').toUpperCase();
          const collAgentId = c.agent_id != null ? Number(c.agent_id) : null;
          return role === 'ADMIN' || role === 'SUPER_ADMIN' || (collAgentId !== null && collAgentId !== Number(agentId));
        });
        const isPaidToAdmin = Boolean(isFullyPaid && hasAdminColl);
        const adminCollectedAmt = inCycleColls
          .filter((c) => {
            const role = (c.collector_role || '').toUpperCase();
            const collAgentId = c.agent_id != null ? Number(c.agent_id) : null;
            return role === 'ADMIN' || role === 'SUPER_ADMIN' || (collAgentId !== null && collAgentId !== Number(agentId));
          })
          .reduce((sum, c) => sum + Number(c.amount || 0), 0);

        let defaultNote = '';
        if (isPaidToAdmin) {
          defaultNote = `Paid directly to Office / Admin (${latestColl?.collector_name || 'Admin'}) · Task Deducted`;
        } else if (isFullyPaid) {
          defaultNote = isDaily ? 'Paid for today' : `Paid for monthly cycle (Due: ${g?.cycle_due})`;
        } else if (isPartiallyPaid) {
          defaultNote = `Partial collection (Paid: ₹${collectedAmt.toLocaleString('en-IN')}, Remaining: ₹${remainingBalance.toLocaleString('en-IN')})`;
        } else if (isDaily) {
          defaultNote = 'Awaiting today installment';
        } else {
          // Monthly unpaid
          if (g?.has_time_remaining) {
            defaultNote = `This month there is time to collect (Due: ${g.cycle_due} · ${g.cycle_days_remaining} days left) · No worry`;
          } else if (g?.is_deadline_today) {
            defaultNote = `Cycle Deadline Today (${g.cycle_due}) · Last day to complete collection!`;
          } else {
            defaultNote = `Cycle Overdue (Deadline was ${g?.cycle_due}) · Not completed`;
          }
        }

        const notes = latestColl?.notes || atl?.notes || defaultNote;
        const statusLabel = isPaidToAdmin
          ? 'Paid to Admin'
          : isFullyPaid 
            ? (isDaily ? 'Paid for Today' : 'Paid for Month')
            : (isPartiallyPaid 
                ? `Partial (Due: ₹${remainingBalance.toLocaleString('en-IN')})` 
                : (isDaily 
                    ? 'Not Paid Today' 
                    : (g?.has_time_remaining 
                        ? `In Progress (${g.cycle_days_remaining}d left)` 
                        : (g?.is_deadline_today ? 'Due Today!' : 'Overdue'))));

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
          is_paid_to_admin: isPaidToAdmin,
          collected_by_admin: hasAdminColl,
          admin_collected_amount: adminCollectedAmt,
          task_deducted: isPaidToAdmin,
          task_deducted_reason: isPaidToAdmin ? 'Paid directly to Office / Admin' : null,
          is_partial: isPartiallyPaid,
          pending_amount: remainingBalance,
          remaining_balance: remainingBalance,
          installment_amount: installmentAmt,
          collected_amount: collectedAmt,
          total_cycle_collected: collectedAmt,
          receipt_count: inCycleColls.length,
          today_status: status,
          cycle_status: status,
          status_label: statusLabel,
          cycle_type: m.group_frequency,
          cycle_mode: isDaily ? 'DAY_BY_DAY' : 'MONTH_BY_MONTH',
          cycle_period_label: isDaily ? 'Daily Installment' : `Monthly Installment (Due: ${g?.cycle_due})`,
          node_color: isPaidToAdmin ? 'GREEN' : nodeColor,
          today_notes: notes,
          cycle_notes: notes,
          collection_id: myCollection?.id || latestColl?.id || null,
          my_collection_id: myCollection?.id || null,
          edit_request: matchedEditReq ? {
            id: matchedEditReq.id,
            status: matchedEditReq.status,
            requested_amount: matchedEditReq.requested_amount,
            requested_payment_method: matchedEditReq.requested_payment_method,
            reason: matchedEditReq.reason,
            admin_notes: matchedEditReq.admin_notes,
          } : null,
          receipt_number: latestColl?.receipt_number || null,
          payment_method: latestColl?.payment_method || null,
          collection_date: latestColl?.collection_date || null,
          collection_time: latestColl?.collection_time || null,
          completed_by_name: latestColl?.collector_name || null,
          completed_by_role: latestColl?.collector_role || null,
          absent_agent_name: g?.absent_agent_name || null,
          is_temporary_coverage: Boolean(g?.temporary_coverage),
          cycle_start: g?.cycle_start || null,
          cycle_due: g?.cycle_due || null,
          cycle_anchor_day: g?.cycle_anchor_day || null,
          cycle_days_remaining: g?.cycle_days_remaining ?? 0,
          is_deadline_today: g?.is_deadline_today ?? false,
          has_time_remaining: g?.has_time_remaining ?? false,
          is_overdue: g?.is_overdue ?? false,
          cycle_status_notice: g?.collection_schedule_note || '',
        };
      });
    }

    // Attach task deduction counts per group
    const finalGroups = enrichedGroups.map((g) => {
      const gMembers = members.filter((m) => m.group_id === g.id);
      const totalEnrolled = gMembers.length;
      const adminPaid = gMembers.filter((m) => m.is_paid_to_admin).length;
      const effectiveTasks = Math.max(0, totalEnrolled - adminPaid);
      const agentCompleted = gMembers.filter((m) => !m.is_paid_to_admin && m.is_paid).length;
      const agentPending = gMembers.filter((m) => !m.is_paid_to_admin && !m.is_paid).length;
      return {
        ...g,
        total_subscribers: totalEnrolled,
        admin_paid_count: adminPaid,
        effective_tasks_count: effectiveTasks,
        agent_completed_count: agentCompleted,
        agent_pending_count: agentPending,
      };
    });

    // Today's collections by this agent
    const [todayCollections] = await pool.execute(
      `SELECT COALESCE(SUM(CASE WHEN UPPER(TRIM(payment_method)) = 'CASH' THEN amount ELSE 0 END), 0) as todayCash,
              COALESCE(SUM(CASE WHEN UPPER(TRIM(payment_method)) = 'UPI' THEN amount ELSE 0 END), 0) as todayUpi,
              COALESCE(SUM(CASE WHEN UPPER(TRIM(payment_method)) != 'CASH' THEN amount ELSE 0 END), 0) as todayOnline,
              COALESCE(SUM(CASE WHEN UPPER(TRIM(payment_method)) = 'BANK_TRANSFER' THEN amount ELSE 0 END), 0) as todayBank,
              COALESCE(SUM(CASE WHEN UPPER(TRIM(payment_method)) = 'CHEQUE' THEN amount ELSE 0 END), 0) as todayCheque,
              COALESCE(SUM(amount), 0) as todayTotal,
              COUNT(id) as totalCollectionsCount
       FROM collections
       WHERE agent_id = ? 
         AND collection_date = ?
         AND verification_status != 'CANCELLED'`,
      [agentId, todayStr]
    );

    const dailyGroups = finalGroups.filter((g) => g.frequency === 'DAILY');
    const monthlyGroups = finalGroups.filter((g) => g.frequency === 'MONTHLY');
    const dailyMembers = members.filter((m) => m.cycle_type === 'DAILY');
    const monthlyMembers = members.filter((m) => m.cycle_type === 'MONTHLY');
    const activeDailyMembers = dailyMembers.filter((m) => !m.is_paid_to_admin);
    const activeMonthlyMembers = monthlyMembers.filter((m) => !m.is_paid_to_admin);

    res.status(200).json({
      success: true,
      data: {
        groups: finalGroups,
        members,
        summary: {
          ...todayCollections[0],
          dailyGroupsCount: dailyGroups.length,
          monthlyGroupsCount: monthlyGroups.length,
          dailyMembersCount: dailyMembers.length,
          monthlyMembersCount: monthlyMembers.length,
          totalAssignedSubscribers: members.length,
          adminPaidMembersCount: members.filter((m) => m.is_paid_to_admin).length,
          dailyPaidMembersCount: dailyMembers.filter((m) => m.is_paid).length,
          monthlyPaidMembersCount: monthlyMembers.filter((m) => m.is_paid).length,
          dailyPendingMembersCount: dailyMembers.filter((m) => !m.is_paid).length,
          monthlyPendingMembersCount: monthlyMembers.filter((m) => !m.is_paid).length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMemberPendingBreakdown(req, res, next) {
  try {
    const memberId = parseInt(req.params.id, 10);
    const groupId = parseInt(req.query.group_id, 10);

    if (!memberId || !groupId) {
      return res.status(400).json({ success: false, message: 'Member ID and Group ID are required.' });
    }

    // 1. Fetch Member
    const [memberRows] = await pool.execute(
      'SELECT id, member_code, full_name, phone, alternate_phone, address FROM members WHERE id = ?',
      [memberId]
    );
    if (memberRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }
    const member = memberRows[0];

    // 2. Fetch Group & Membership
    const [groupRows] = await pool.execute(
      `SELECT g.id, g.group_code, g.group_name, g.chit_type, g.frequency, g.installment_amount,
              g.start_date, g.created_at, gm.ticket_number, gm.joined_date
       FROM chit_groups g
       JOIN group_memberships gm ON gm.group_id = g.id AND gm.member_id = ?
       WHERE g.id = ? AND gm.status = 'ACTIVE'`,
      [memberId, groupId]
    );
    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chit scheme enrollment not found.' });
    }
    const group = groupRows[0];
    const installmentAmt = parseFloat(group.installment_amount || 0);
    const isDaily = group.frequency === 'DAILY';

    // 3. Fetch all collections for this member in this group
    const [colls] = await pool.execute(
      `SELECT id, amount, payment_method, collection_date, notes
       FROM collections
       WHERE member_id = ? AND group_id = ? AND verification_status != 'CANCELLED'
       ORDER BY collection_date ASC`,
      [memberId, groupId]
    );

    const collByDate = {};
    for (const c of colls) {
      const dStr = typeof c.collection_date === 'string'
        ? c.collection_date.slice(0, 10)
        : new Date(c.collection_date).toISOString().slice(0, 10);
      collByDate[dStr] = (collByDate[dStr] || 0) + parseFloat(c.amount || 0);
    }

    const todayStr = getTodayIST();
    const pendingDates = [];

    if (isDaily) {
      const startDateStr = group.joined_date || group.start_date || group.created_at;
      const start = new Date(startDateStr);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const effectiveStart = start < sixtyDaysAgo ? sixtyDaysAgo : start;

      const cur = new Date(effectiveStart.toISOString().slice(0, 10) + 'T00:00:00Z');
      const end = new Date(todayStr + 'T00:00:00Z');

      while (cur <= end) {
        const dStr = cur.toISOString().slice(0, 10);
        const paidOnDate = collByDate[dStr] || 0;
        if (paidOnDate < installmentAmt) {
          const shortfall = installmentAmt - paidOnDate;
          pendingDates.push({
            date: dStr,
            due_amount: installmentAmt,
            paid_amount: paidOnDate,
            pending_amount: shortfall,
            status: paidOnDate > 0 ? 'PARTIAL' : 'NOT_PAID',
            label: dStr === todayStr ? "Today's Due" : 'Past Daily Due',
          });
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    } else {
      const cycleInfo = getMonthlyCycleInfo(group.start_date || group.created_at, todayStr);
      let cyclePaid = 0;
      for (const [dStr, amt] of Object.entries(collByDate)) {
        if (cycleInfo && dStr >= cycleInfo.cycleStart && dStr <= cycleInfo.cycleDue) {
          cyclePaid += amt;
        }
      }
      if (cyclePaid < installmentAmt) {
        pendingDates.push({
          date: cycleInfo ? cycleInfo.cycleDue : todayStr,
          due_amount: installmentAmt,
          paid_amount: cyclePaid,
          pending_amount: installmentAmt - cyclePaid,
          status: cyclePaid > 0 ? 'PARTIAL' : 'NOT_PAID',
          label: `Monthly Cycle (${cycleInfo?.cycleStart || ''} to ${cycleInfo?.cycleDue || ''})`,
        });
      }
    }

    pendingDates.reverse();

    const totalPending = pendingDates.reduce((sum, item) => sum + item.pending_amount, 0);

    return res.status(200).json({
      success: true,
      data: {
        member,
        group,
        pending_dates: pendingDates,
        total_pending: totalPending,
        installment_amount: installmentAmt,
      },
    });
  } catch (error) {
    next(error);
  }
}
