import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';

export async function getAuditLogs(req, res, next) {
  try {
    const { category, userId } = req.query;
    let query = `
      SELECT 
        a.id, a.user_id, u.full_name, u.username, u.role, u.phone, 
        a.action, a.resource, a.details, a.ip_address, a.user_agent, a.status, a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (category === 'LOGINS') {
      conditions.push("a.action IN ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'ROLE_MISMATCH_LOGIN_BLOCKED', 'INVALID_CREDENTIALS', 'INACTIVE_ACCOUNT_LOGIN_REJECTED', 'LOGOUT')");
    } else if (category === 'OPERATIONS') {
      conditions.push("a.action NOT IN ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'ROLE_MISMATCH_LOGIN_BLOCKED', 'INVALID_CREDENTIALS', 'INACTIVE_ACCOUNT_LOGIN_REJECTED', 'LOGOUT')");
    }

    if (userId) {
      conditions.push('a.user_id = ?');
      params.push(userId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.created_at DESC LIMIT 150';

    const [rows] = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardOverview(req, res, next) {
  try {
    // 1. Group Breakdown (Daily Chit vs Monthly Auction vs Monthly Double Chit)
    const [[groupCounts]] = await pool.execute(`
      SELECT 
        COUNT(*) as totalGroups,
        COALESCE(SUM(CASE WHEN chit_type = 'DAILY_CHIT' THEN 1 ELSE 0 END), 0) as dailyChitGroups,
        COALESCE(SUM(CASE WHEN chit_type = 'AUCTION_CHIT' THEN 1 ELSE 0 END), 0) as auctionChitGroups,
        COALESCE(SUM(CASE WHEN chit_type = 'DOUBLE_CHIT' THEN 1 ELSE 0 END), 0) as doubleChitGroups,
        COALESCE(SUM(CASE WHEN route_category = 'DAILY_ROUTE' THEN 1 ELSE 0 END), 0) as dailyRoutes,
        COALESCE(SUM(CASE WHEN route_category = 'MONTHLY_ROUTE' THEN 1 ELSE 0 END), 0) as monthlyRoutes
      FROM chit_groups
      WHERE status = 'ACTIVE'
    `);

    // 2. Members Count
    const [[{ totalMembers }]] = await pool.execute(
      'SELECT COUNT(*) as totalMembers FROM members WHERE is_active = 1'
    );

    // 3. Agents Count
    const [[{ totalAgents }]] = await pool.execute(
      'SELECT COUNT(*) as totalAgents FROM users WHERE role = "COLLECTION_AGENT" AND is_active = 1'
    );

    // 4. Collections Totals: Split into Day-by-Day (Today) and Month-by-Month (Current Month)
    const [[collectionRow]] = await pool.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount ELSE 0 END), 0) as todayCash,
        COALESCE(SUM(CASE WHEN payment_method != 'CASH' THEN amount ELSE 0 END), 0) as todayOnline,
        COALESCE(SUM(amount), 0) as todayTotal,
        COUNT(id) as todayCount
      FROM collections
      WHERE collection_date = CURDATE() AND verification_status != 'CANCELLED'
    `);

    // 4a. Daily Chit Collections (Day-by-Day, Today)
    const [[dailyCollectionRow]] = await pool.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN c.payment_method = 'CASH' THEN c.amount ELSE 0 END), 0) as dailyCash,
        COALESCE(SUM(CASE WHEN c.payment_method != 'CASH' THEN c.amount ELSE 0 END), 0) as dailyOnline,
        COALESCE(SUM(c.amount), 0) as dailyTotal,
        COUNT(c.id) as dailyCount
      FROM collections c
      JOIN chit_groups g ON c.group_id = g.id
      WHERE g.frequency = 'DAILY' AND c.collection_date = CURDATE() AND c.verification_status != 'CANCELLED'
    `);

    // 4b. Monthly Chit Collections (Month-by-Month, Current Month)
    const [[monthlyCollectionRow]] = await pool.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN c.payment_method = 'CASH' THEN c.amount ELSE 0 END), 0) as monthlyCash,
        COALESCE(SUM(CASE WHEN c.payment_method != 'CASH' THEN c.amount ELSE 0 END), 0) as monthlyOnline,
        COALESCE(SUM(c.amount), 0) as monthlyTotal,
        COUNT(c.id) as monthlyCount
      FROM collections c
      JOIN chit_groups g ON c.group_id = g.id
      WHERE g.frequency = 'MONTHLY' 
        AND YEAR(c.collection_date) = YEAR(CURDATE()) 
        AND MONTH(c.collection_date) = MONTH(CURDATE())
        AND c.verification_status != 'CANCELLED'
    `);

    // 5a. Expected Daily Target (Day-by-Day Installments Target for Today)
    const [[dailyTargetRow]] = await pool.execute(`
      SELECT COALESCE(SUM(g.installment_amount * (
        SELECT COUNT(gm.id) FROM group_memberships gm WHERE gm.group_id = g.id AND gm.status = 'ACTIVE'
      )), 0) as expectedDailyTarget
      FROM chit_groups g
      WHERE g.frequency = 'DAILY' AND g.status = 'ACTIVE'
    `);

    // 5b. Expected Monthly Target (Month-by-Month Installments Target for Current Month)
    const [[monthlyTargetRow]] = await pool.execute(`
      SELECT COALESCE(SUM(g.installment_amount * (
        SELECT COUNT(gm.id) FROM group_memberships gm WHERE gm.group_id = g.id AND gm.status = 'ACTIVE'
      )), 0) as expectedMonthlyTarget
      FROM chit_groups g
      WHERE g.frequency = 'MONTHLY' AND g.status = 'ACTIVE'
    `);

    // 6. Auctions & Dividends stats
    const [[auctionStats]] = await pool.execute(`
      SELECT 
        COUNT(id) as totalAuctionsCount,
        COALESCE(SUM(total_dividend), 0) as totalDividendsGenerated,
        COALESCE(SUM(net_payable_amount), 0) as totalPrizeMoneyDisbursed
      FROM auctions
    `);

    // 7. Recent Collections (Last 6 transactions)
    const [recentCollections] = await pool.execute(`
      SELECT 
        c.id, c.receipt_number, c.amount, c.payment_method, c.collection_time, c.created_at,
        g.group_name, g.group_code, g.chit_type, g.frequency, g.route_category,
        m.full_name as member_name,
        u.full_name as agent_name
      FROM collections c
      JOIN chit_groups g ON c.group_id = g.id
      JOIN members m ON c.member_id = m.id
      JOIN users u ON c.agent_id = u.id
      ORDER BY c.created_at DESC
      LIMIT 6
    `);

    // 8. Active Groups Overview
    const [groupsList] = await pool.execute(`
      SELECT 
        g.id, g.group_code, g.group_name, g.chit_type, g.frequency, g.route_category,
        g.location_name, g.installment_amount, g.total_pool_amount, g.status,
        COUNT(DISTINCT gm.id) as enrolled_members,
        CAST(GROUP_CONCAT(DISTINCT u.full_name SEPARATOR ', ') AS CHAR) as assigned_agents
      FROM chit_groups g
      LEFT JOIN group_memberships gm ON g.id = gm.group_id
      LEFT JOIN agent_group_assignments aga ON g.id = aga.group_id AND aga.is_active = 1
      LEFT JOIN users u ON aga.agent_id = u.id
      WHERE g.status = 'ACTIVE'
      GROUP BY g.id
      ORDER BY g.created_at DESC
      LIMIT 8
    `);

    // 9. Agent Today's Collection Status
    const [agentsSummary] = await pool.execute(`
      SELECT 
        u.id, u.full_name, u.username, u.phone,
        COALESCE(SUM(CASE WHEN c.payment_method = 'CASH' THEN c.amount ELSE 0 END), 0) as cashCollected,
        COALESCE(SUM(CASE WHEN c.payment_method != 'CASH' THEN c.amount ELSE 0 END), 0) as onlineCollected,
        COALESCE(SUM(c.amount), 0) as totalCollected,
        COUNT(c.id) as collectionsCount
      FROM users u
      LEFT JOIN collections c ON u.id = c.agent_id AND c.collection_date = CURDATE() AND c.verification_status != 'CANCELLED'
      WHERE u.role = 'COLLECTION_AGENT' AND u.is_active = 1
      GROUP BY u.id
      ORDER BY totalCollected DESC
    `);

    // 10. Recent Auctions
    const [recentAuctions] = await pool.execute(`
      SELECT 
        a.id, a.period_number, a.draw_number, a.auction_type, a.bid_discount,
        a.total_dividend, a.dividend_per_member, a.net_payable_amount, a.auction_date, a.payout_status,
        g.group_name, g.group_code, g.chit_type,
        m.full_name as winner_name
      FROM auctions a
      JOIN chit_groups g ON a.group_id = g.id
      JOIN members m ON a.winning_member_id = m.id
      ORDER BY a.auction_date DESC, a.period_number DESC LIMIT 4
    `);

    res.status(200).json({
      success: true,
      data: {
        totalGroups: groupCounts.totalGroups,
        dailyChitGroups: groupCounts.dailyChitGroups,
        auctionChitGroups: groupCounts.auctionChitGroups,
        doubleChitGroups: groupCounts.doubleChitGroups,
        dailyRoutes: groupCounts.dailyRoutes,
        monthlyRoutes: groupCounts.monthlyRoutes,
        totalMembers,
        totalAgents,
        // Overall Today's figures
        todayCash: collectionRow.todayCash,
        todayOnline: collectionRow.todayOnline,
        todayTotal: collectionRow.todayTotal,
        todayCount: collectionRow.todayCount,
        expectedDailyTarget: dailyTargetRow.expectedDailyTarget || 0,
        expectedMonthlyTarget: monthlyTargetRow.expectedMonthlyTarget || 0,
        // Explicit Day-by-Day (Daily Chits) Overview
        dailyOverview: {
          target: parseFloat(dailyTargetRow.expectedDailyTarget || 0),
          cash: parseFloat(dailyCollectionRow.dailyCash || 0),
          online: parseFloat(dailyCollectionRow.dailyOnline || 0),
          total: parseFloat(dailyCollectionRow.dailyTotal || 0),
          count: parseInt(dailyCollectionRow.dailyCount || 0),
          progressPercent: dailyTargetRow.expectedDailyTarget > 0 
            ? Math.round((parseFloat(dailyCollectionRow.dailyTotal || 0) / parseFloat(dailyTargetRow.expectedDailyTarget)) * 100) 
            : 0,
        },
        // Explicit Month-by-Month (Monthly Chits) Overview
        monthlyOverview: {
          target: parseFloat(monthlyTargetRow.expectedMonthlyTarget || 0),
          cash: parseFloat(monthlyCollectionRow.monthlyCash || 0),
          online: parseFloat(monthlyCollectionRow.monthlyOnline || 0),
          total: parseFloat(monthlyCollectionRow.monthlyTotal || 0),
          count: parseInt(monthlyCollectionRow.monthlyCount || 0),
          progressPercent: monthlyTargetRow.expectedMonthlyTarget > 0 
            ? Math.round((parseFloat(monthlyCollectionRow.monthlyTotal || 0) / parseFloat(monthlyTargetRow.expectedMonthlyTarget)) * 100) 
            : 0,
        },
        totalAuctionsCount: auctionStats.totalAuctionsCount,
        totalDividendsGenerated: auctionStats.totalDividendsGenerated,
        totalPrizeMoneyDisbursed: auctionStats.totalPrizeMoneyDisbursed,
        recentCollections,
        groupsList,
        agentsSummary,
        recentAuctions,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * ChitBase Full Reports Suite Analytics API
 * Returns collections ledger, defaulters/arrears, lift history, and member statements
 */
export async function getReportsAnalytics(req, res, next) {
  try {
    const { groupId, period } = req.query; // period: 'TODAY' | 'MONTH' | 'ALL'

    // 1. Collections Query
    let colWhere = "c.verification_status != 'CANCELLED'";
    const colParams = [];
    if (groupId && groupId !== 'ALL') {
      colWhere += " AND c.group_id = ?";
      colParams.push(groupId);
    }
    if (period === 'TODAY') {
      colWhere += " AND c.collection_date = CURDATE()";
    } else if (period === 'MONTH') {
      colWhere += " AND MONTH(c.collection_date) = MONTH(CURDATE()) AND YEAR(c.collection_date) = YEAR(CURDATE())";
    }

    const [collections] = await pool.query(`
      SELECT 
        c.id, c.receipt_number, c.group_id, c.member_id, c.agent_id, c.amount,
        c.payment_method, c.payment_reference, c.collection_date, c.collection_time, c.notes,
        g.group_name, g.group_code, g.chit_type, g.route_category, g.installment_amount,
        m.full_name as member_name, m.phone as member_phone, m.member_code,
        u.full_name as agent_name,
        gm.ticket_number
      FROM collections c
      JOIN chit_groups g ON c.group_id = g.id
      JOIN members m ON c.member_id = m.id
      LEFT JOIN users u ON c.agent_id = u.id
      LEFT JOIN group_memberships gm ON gm.group_id = g.id AND gm.member_id = m.id
      WHERE ${colWhere}
      ORDER BY c.collection_date DESC, c.collection_time DESC, c.id DESC
    `, colParams);

    const totalCollected = collections.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
    const cashCollected = collections.filter((c) => c.payment_method === 'CASH').reduce((s, c) => s + parseFloat(c.amount || 0), 0);
    const digitalCollected = collections.filter((c) => c.payment_method !== 'CASH' && c.payment_method !== 'CHEQUE').reduce((s, c) => s + parseFloat(c.amount || 0), 0);
    const chequeCollected = collections.filter((c) => c.payment_method === 'CHEQUE').reduce((s, c) => s + parseFloat(c.amount || 0), 0);

    // 2. Defaulters / Pending Dues Query
    let defWhere = "g.status = 'ACTIVE' AND gm.status = 'ACTIVE'";
    const defParams = [];
    if (groupId && groupId !== 'ALL') {
      defWhere += " AND g.id = ?";
      defParams.push(groupId);
    }

    const [enrolledMembers] = await pool.query(`
      SELECT 
        gm.id as membership_id, gm.group_id, gm.member_id, gm.ticket_number, gm.joined_date,
        g.group_name, g.group_code, g.chit_type, g.frequency, g.route_category, g.installment_amount, g.total_pool_amount,
        m.full_name, m.phone, m.alternate_phone, m.address, m.member_code,
        (
          SELECT COALESCE(SUM(c2.amount), 0)
          FROM collections c2
          WHERE c2.group_id = gm.group_id AND c2.member_id = gm.member_id 
          AND c2.verification_status != 'CANCELLED'
          AND (
            (g.frequency = 'DAILY' AND c2.collection_date = CURDATE())
            OR
            (g.frequency = 'MONTHLY' AND YEAR(c2.collection_date) = YEAR(CURDATE()) AND MONTH(c2.collection_date) = MONTH(CURDATE()))
          )
        ) as cycle_paid,
        (
          SELECT c3.receipt_number
          FROM collections c3
          WHERE c3.group_id = gm.group_id AND c3.member_id = gm.member_id 
          AND c3.verification_status != 'CANCELLED'
          AND (
            (g.frequency = 'DAILY' AND c3.collection_date = CURDATE())
            OR
            (g.frequency = 'MONTHLY' AND YEAR(c3.collection_date) = YEAR(CURDATE()) AND MONTH(c3.collection_date) = MONTH(CURDATE()))
          )
          ORDER BY c3.id DESC
          LIMIT 1
        ) as cycle_receipt,
        (
          SELECT atl.notes
          FROM agent_tracking_logs atl
          WHERE atl.group_id = gm.group_id AND atl.member_id = gm.member_id 
          AND (
            (g.frequency = 'DAILY' AND atl.tracking_date = CURDATE())
            OR
            (g.frequency = 'MONTHLY' AND YEAR(atl.tracking_date) = YEAR(CURDATE()) AND MONTH(atl.tracking_date) = MONTH(CURDATE()))
          )
          ORDER BY atl.id DESC LIMIT 1
        ) as agent_notes
      FROM group_memberships gm
      JOIN chit_groups g ON gm.group_id = g.id
      JOIN members m ON gm.member_id = m.id
      WHERE ${defWhere}
      ORDER BY g.group_code ASC, gm.ticket_number ASC
    `, defParams);

    const defaulters = enrolledMembers
      .filter((m) => parseFloat(m.cycle_paid || 0) < parseFloat(m.installment_amount || 0))
      .map((m) => {
        const isDaily = m.frequency === 'DAILY';
        const expected = parseFloat(m.installment_amount);
        const paid = parseFloat(m.cycle_paid || 0);
        const due = Math.max(0, expected - paid);

        return {
          membershipId: m.membership_id,
          groupId: m.group_id,
          groupName: m.group_name,
          groupCode: m.group_code,
          chitType: m.chit_type,
          frequency: m.frequency,
          cycleType: m.frequency,
          cycleMode: isDaily ? 'DAY_BY_DAY' : 'MONTH_BY_MONTH',
          cyclePeriod: isDaily ? 'Today (Day-by-Day)' : 'Current Month (Month-by-Month)',
          cycleLabel: isDaily ? 'Daily Installment' : 'Monthly Installment',
          routeCategory: m.route_category,
          memberId: m.member_id,
          memberName: m.full_name,
          memberPhone: m.phone,
          alternatePhone: m.alternate_phone,
          memberAddress: m.address,
          memberCode: m.member_code,
          ticketNumber: m.ticket_number,
          expectedAmount: expected,
          paidAmount: paid,
          dueAmount: due,
          agentNotes: m.agent_notes || (isDaily ? 'Awaiting today installment' : 'Awaiting monthly installment'),
          status: 'NOT_PAID',
        };
      });

    const dailyDefaulters = defaulters.filter((d) => d.frequency === 'DAILY');
    const monthlyDefaulters = defaulters.filter((d) => d.frequency === 'MONTHLY');
    const dailyDefaulterAmount = dailyDefaulters.reduce((s, d) => s + d.dueAmount, 0);
    const monthlyDefaulterAmount = monthlyDefaulters.reduce((s, d) => s + d.dueAmount, 0);
    const totalDefaulterAmount = defaulters.reduce((s, d) => s + d.dueAmount, 0);

    // 3. Auctions & Lift History Query
    let aucWhere = "1=1";
    const aucParams = [];
    if (groupId && groupId !== 'ALL') {
      aucWhere += " AND a.group_id = ?";
      aucParams.push(groupId);
    }
    const [auctions] = await pool.query(`
      SELECT 
        a.id, a.group_id, a.period_number, a.draw_number, a.auction_type,
        a.winning_member_id, a.winning_ticket_number, a.bid_discount,
        a.foreman_commission, a.total_dividend, a.dividend_per_member,
        a.net_payable_amount, a.next_installment_payable, a.auction_date,
        a.payout_status, a.payout_reference,
        g.group_name, g.group_code, g.chit_type, g.total_pool_amount,
        m.full_name as winner_name, m.phone as winner_phone, m.member_code as winner_code
      FROM auctions a
      JOIN chit_groups g ON a.group_id = g.id
      JOIN members m ON a.winning_member_id = m.id
      WHERE ${aucWhere}
      ORDER BY a.auction_date DESC, a.period_number DESC
    `, aucParams);

    const totalForemanCommission = auctions.reduce((s, a) => s + parseFloat(a.foreman_commission || 0), 0);
    const totalDividendsDistributed = auctions.reduce((s, a) => s + parseFloat(a.total_dividend || 0), 0);
    const totalPrizeDisbursed = auctions.reduce((s, a) => s + parseFloat(a.net_payable_amount || 0), 0);

    // 4. Member-Wise Passbooks Summary
    const [memberSummaries] = await pool.query(`
      SELECT 
        m.id, m.member_code, m.full_name, m.phone, m.address,
        COUNT(DISTINCT gm.group_id) as enrolled_groups_count,
        COALESCE((
          SELECT SUM(c.amount) FROM collections c 
          WHERE c.member_id = m.id AND c.verification_status != 'CANCELLED'
        ), 0) as total_contributed,
        COALESCE((
          SELECT SUM(a.net_payable_amount) FROM auctions a 
          WHERE a.winning_member_id = m.id
        ), 0) as total_prize_won,
        COALESCE((
          SELECT SUM(a2.dividend_per_member) FROM auctions a2
          JOIN group_memberships gm2 ON a2.group_id = gm2.group_id
          WHERE gm2.member_id = m.id AND gm2.status = 'ACTIVE'
        ), 0) as total_dividends_earned
      FROM members m
      LEFT JOIN group_memberships gm ON m.id = gm.member_id AND gm.status = 'ACTIVE'
      WHERE m.is_active = 1
      GROUP BY m.id
      ORDER BY m.full_name ASC
    `);

    // 5. Active Groups List for Filter Dropdown
    const [groupsList] = await pool.query(`
      SELECT id, group_code, group_name, chit_type, frequency, route_category, installment_amount, total_pool_amount
      FROM chit_groups
      WHERE status = 'ACTIVE'
      ORDER BY group_name ASC
    `);

    const totalExpected = totalCollected + totalDefaulterAmount;
    const collectionEfficiency = totalExpected > 0 ? Math.min(100, Math.round((totalCollected / totalExpected) * 100)) : 100;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCollected,
          cashCollected,
          digitalCollected,
          chequeCollected,
          totalDefaulterAmount,
          defaultersCount: defaulters.length,
          dailyDefaultersCount: dailyDefaulters.length,
          monthlyDefaultersCount: monthlyDefaulters.length,
          dailyDefaulterAmount,
          monthlyDefaulterAmount,
          totalForemanCommission,
          totalDividendsDistributed,
          totalPrizeDisbursed,
          collectionEfficiency,
          totalReceiptsCount: collections.length,
        },
        collections,
        defaulters,
        auctions,
        memberSummaries,
        groups: groupsList,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Get comprehensive Admin Statutory Commissions, Inflows / Payments Got,
 * and Admin Personal / Firm Profiles.
 */
export async function getAdminCommissionsAndProfile(req, res, next) {
  try {
    const userId = req.user?.id || req.user?.userId;

    // 1. Ensure personal profile exists for this admin
    const [userRows] = await pool.query(
      'SELECT id, full_name, username, role, phone, created_at, last_login_at FROM users WHERE id = ?',
      [userId]
    );
    const user = userRows[0] || {};

    const [profileRows] = await pool.query(
      'SELECT * FROM admin_personal_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    let profile = profileRows[0];
    if (!profile) {
      await pool.query(
        `INSERT INTO admin_personal_profiles 
          (user_id, firm_name, official_phone, account_holder_name) 
         VALUES (?, 'ChitFund Pro Enterprise Services', ?, ?)`,
        [userId, user.phone || '', user.full_name || 'Administrator']
      );
      const [newProfile] = await pool.query(
        'SELECT * FROM admin_personal_profiles WHERE user_id = ? LIMIT 1',
        [userId]
      );
      profile = newProfile[0];
    }

    // 2. Aggregate Foreman Commissions from Auctions
    const [commRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(foreman_commission), 0) AS total_commission_earned,
        COUNT(*) AS total_auctions_conducted
      FROM auctions
    `);
    const totalForemanCommission = parseFloat(commRows[0].total_commission_earned || 0);
    const totalAuctionsConducted = parseInt(commRows[0].total_auctions_conducted || 0, 10);

    // 3. Aggregate Collections & Payments Got
    const [collAggRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) AS total_payments_received,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount ELSE 0 END), 0) AS cash_payments,
        COALESCE(SUM(CASE WHEN payment_method IN ('UPI', 'BANK_TRANSFER') THEN amount ELSE 0 END), 0) AS digital_payments,
        COALESCE(SUM(CASE WHEN payment_method = 'CHEQUE' THEN amount ELSE 0 END), 0) AS cheque_payments,
        COUNT(*) AS total_transactions_count
      FROM collections
    `);
    const totalPaymentsReceived = parseFloat(collAggRows[0].total_payments_received || 0);
    const cashPayments = parseFloat(collAggRows[0].cash_payments || 0);
    const digitalPayments = parseFloat(collAggRows[0].digital_payments || 0);
    const chequePayments = parseFloat(collAggRows[0].cheque_payments || 0);
    const totalTransactionsCount = parseInt(collAggRows[0].total_transactions_count || 0, 10);

    // 4. Aggregate Commission Withdrawals
    const [wdrAggRows] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_commission_withdrawn, COUNT(*) AS total_withdrawals_count
      FROM admin_commission_withdrawals
    `);
    const totalCommissionWithdrawn = parseFloat(wdrAggRows[0].total_commission_withdrawn || 0);
    const totalWithdrawalsCount = parseInt(wdrAggRows[0].total_withdrawals_count || 0, 10);
    const availableCommissionBalance = Math.max(0, totalForemanCommission - totalCommissionWithdrawn);

    // 5. Total Groups, Members, Agents, and Payouts Managed by Admin
    const [groupsCountRow] = await pool.query('SELECT COUNT(*) AS total FROM chit_groups');
    const [membersCountRow] = await pool.query('SELECT COUNT(*) AS total FROM members');
    const [agentsCountRow] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'COLLECTION_AGENT'");
    const [payoutsRow] = await pool.query("SELECT COALESCE(SUM(net_payable_amount), 0) AS total_payouts FROM payouts WHERE status = 'DISBURSED'");

    const totalGroupsCount = parseInt(groupsCountRow[0]?.total || 0, 10);
    const totalMembersCount = parseInt(membersCountRow[0]?.total || 0, 10);
    const totalAgentsCount = parseInt(agentsCountRow[0]?.total || 0, 10);
    const totalPayoutsDisbursed = parseFloat(payoutsRow[0]?.total_payouts || 0);

    // 6. Detailed Auctions Commission Ledger
    const [auctionLedger] = await pool.query(`
      SELECT 
        a.id, a.auction_date, a.period_number, a.draw_number, a.auction_type,
        g.group_name, g.group_code, g.chit_type, g.total_pool_amount,
        a.bid_discount, a.foreman_commission, a.net_payable_amount,
        m.full_name AS winner_name, m.phone AS winner_phone, a.winning_ticket_number,
        a.payout_status, a.created_at
      FROM auctions a
      JOIN chit_groups g ON a.group_id = g.id
      JOIN members m ON a.winning_member_id = m.id
      ORDER BY a.auction_date DESC, a.id DESC
      LIMIT 100
    `);

    // 7. Detailed Payments Got (Collections Ledger)
    const [paymentsLedger] = await pool.query(`
      SELECT 
        c.id, c.receipt_number, c.collection_date, c.collection_time, c.amount,
        c.payment_method, c.payment_reference, c.notes,
        g.group_name, g.group_code,
        m.full_name AS member_name, m.phone AS member_phone,
        u.full_name AS collected_by
      FROM collections c
      JOIN chit_groups g ON c.group_id = g.id
      JOIN members m ON c.member_id = m.id
      LEFT JOIN users u ON c.agent_id = u.id
      ORDER BY c.collection_date DESC, c.id DESC
      LIMIT 100
    `);

    // 8. Withdrawals History
    const [withdrawalsHistory] = await pool.query(`
      SELECT 
        id, withdrawal_number, amount, withdrawal_date, payment_method,
        reference_number, destination_account, remarks, created_at
      FROM admin_commission_withdrawals
      ORDER BY withdrawal_date DESC, id DESC
      LIMIT 50
    `);

    res.status(200).json({
      success: true,
      data: {
        adminUser: user,
        adminProfile: profile,
        financialOverview: {
          totalForemanCommission,
          totalAuctionsConducted,
          totalPaymentsReceived,
          cashPayments,
          digitalPayments,
          chequePayments,
          totalTransactionsCount,
          totalCommissionWithdrawn,
          totalWithdrawalsCount,
          availableCommissionBalance,
          totalGroupsCount,
          totalMembersCount,
          totalAgentsCount,
          totalPayoutsDisbursed,
        },
        auctionLedger,
        paymentsLedger,
        withdrawalsHistory,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Record a Foreman Commission Withdrawal to Admin Account
 */
export async function recordCommissionWithdrawal(req, res, next) {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { amount, payment_method, reference_number, destination_account, remarks } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid withdrawal amount greater than zero.',
      });
    }

    // Verify available commission balance
    const [commRows] = await pool.query(`
      SELECT COALESCE(SUM(foreman_commission), 0) AS total_commission FROM auctions
    `);
    const [wdrRows] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_withdrawn FROM admin_commission_withdrawals
    `);
    const totalCommission = parseFloat(commRows[0].total_commission || 0);
    const totalWithdrawn = parseFloat(wdrRows[0].total_withdrawn || 0);
    const available = Math.max(0, totalCommission - totalWithdrawn);

    if (parsedAmount > available) {
      return res.status(400).json({
        success: false,
        message: `Requested amount (₹${parsedAmount.toLocaleString('en-IN')}) exceeds available commission balance (₹${available.toLocaleString('en-IN')}).`,
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const withdrawalNumber = `WDR-${todayStr.replace(/-/g, '')}-${randomSuffix}`;

    await pool.query(
      `INSERT INTO admin_commission_withdrawals 
        (withdrawal_number, user_id, amount, withdrawal_date, payment_method, reference_number, destination_account, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        withdrawalNumber,
        userId,
        parsedAmount,
        todayStr,
        payment_method || 'BANK_TRANSFER',
        reference_number || null,
        destination_account || null,
        remarks || null,
      ]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, details) VALUES (?, ?, ?, ?)`,
      [
        userId,
        'COMMISSION_WITHDRAWAL',
        withdrawalNumber,
        `Withdrew ₹${parsedAmount} via ${payment_method || 'BANK_TRANSFER'} to ${destination_account || 'Admin Account'}`,
      ]
    );

    res.status(201).json({
      success: true,
      message: `Commission withdrawal of ₹${parsedAmount.toLocaleString('en-IN')} recorded successfully.`,
      withdrawalNumber,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Update Admin Personal Profile & Firm Information
 */
export async function updateAdminProfile(req, res, next) {
  try {
    const userId = req.user?.id || req.user?.userId;
    const {
      full_name,
      phone,
      firm_name,
      registration_number,
      act_compliance,
      registrar_office,
      office_address,
      official_email,
      official_phone,
      bank_name,
      account_holder_name,
      account_number,
      ifsc_code,
      upi_id,
      notes,
    } = req.body;

    // Update users table
    if (full_name || phone) {
      await pool.query(
        'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone) WHERE id = ?',
        [full_name || null, phone || null, userId]
      );
    }

    // Upsert into admin_personal_profiles
    await pool.query(
      `INSERT INTO admin_personal_profiles 
        (user_id, firm_name, registration_number, act_compliance, registrar_office, office_address, official_email, official_phone, bank_name, account_holder_name, account_number, ifsc_code, upi_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        firm_name = VALUES(firm_name),
        registration_number = VALUES(registration_number),
        act_compliance = VALUES(act_compliance),
        registrar_office = VALUES(registrar_office),
        office_address = VALUES(office_address),
        official_email = VALUES(official_email),
        official_phone = VALUES(official_phone),
        bank_name = VALUES(bank_name),
        account_holder_name = VALUES(account_holder_name),
        account_number = VALUES(account_number),
        ifsc_code = VALUES(ifsc_code),
        upi_id = VALUES(upi_id),
        notes = VALUES(notes)`,
      [
        userId,
        firm_name || 'ChitFund Pro Enterprise Services',
        registration_number || 'CF/TS/2026/8849',
        act_compliance || 'Chit Funds Act, 1982 (Act No. 40 of 1982)',
        registrar_office || 'Office of the Registrar of Chits, Telangana',
        office_address || null,
        official_email || null,
        official_phone || null,
        bank_name || null,
        account_holder_name || null,
        account_number || null,
        ifsc_code || null,
        upi_id || null,
        notes || null,
      ]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, details) VALUES (?, ?, ?, ?)`,
      [userId, 'ADMIN_PROFILE_UPDATED', `User #${userId}`, 'Admin personal profile and firm details updated']
    );

    res.status(200).json({
      success: true,
      message: 'Admin personal and firm profile updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Update Admin Personal Password
 */
export async function updateAdminPassword(req, res, next) {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your current password and a new password.',
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 4 characters long.',
      });
    }

    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin user not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'The current password you entered is incorrect.',
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, details) VALUES (?, ?, ?, ?)`,
      [userId, 'ADMIN_PASSWORD_CHANGED', `User #${userId}`, 'Admin personal account password changed']
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Your account is secured with the new credentials.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Daily Agent Work, Collections & Performance Ledger for Admin:
 * - Breakdown per agent separately:
 *   - Assigned routes
 *   - Target expected for date
 *   - Cash collected, Online collected, Total collected
 *   - Pending amount remaining
 *   - Receipts count & detailed receipt list
 *   - Work notes / visit remarks
 * - Everyday live reset (CURDATE) while saving all historical data (custom date & all-time mode)
 */
export async function getAgentsDailyPerformance(req, res, next) {
  try {
    const { date, mode, agentId } = req.query;
    const isAllTime = mode === 'ALL_TIME';
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const dateObj = new Date(targetDate);
    const isFirstDayOfSelectedDate = dateObj.getDate() === 1;

    // 1. Fetch collection agents
    let agentQuery = `
      SELECT id, full_name, username, phone, role, is_active, last_login_at, created_at
      FROM users
      WHERE role = 'COLLECTION_AGENT'
    `;
    const agentParams = [];
    if (agentId && agentId !== 'ALL') {
      agentQuery += ' AND id = ?';
      agentParams.push(agentId);
    }
    agentQuery += ' ORDER BY full_name ASC';
    const [agents] = await pool.query(agentQuery, agentParams);

    // 2. Fetch assigned groups and subscribers for each agent
    const [assignments] = await pool.query(`
      SELECT 
        aga.agent_id,
        g.id as group_id, g.group_code, g.group_name, g.frequency, g.chit_type, g.location_name,
        g.installment_amount, g.total_pool_amount,
        COUNT(DISTINCT gm.id) as subscriber_count,
        COALESCE(SUM(g.installment_amount), 0) as group_target_amount
      FROM agent_group_assignments aga
      JOIN chit_groups g ON aga.group_id = g.id
      LEFT JOIN group_memberships gm ON g.id = gm.group_id AND gm.status = 'ACTIVE'
      WHERE aga.is_active = 1 AND g.status = 'ACTIVE'
      GROUP BY aga.agent_id, g.id
      ORDER BY g.group_name ASC
    `);

    // 3. Fetch collections by agent for the target date (or all-time)
    let collQuery = `
      SELECT 
        c.agent_id,
        c.id as collection_id, c.receipt_number, c.group_id, c.member_id, c.amount,
        c.payment_method, c.payment_reference, c.collection_date, c.collection_time,
        c.verification_status, c.notes,
        m.full_name as member_name, m.phone as member_phone, m.member_code,
        g.group_name, g.group_code, g.frequency
      FROM collections c
      JOIN members m ON c.member_id = m.id
      JOIN chit_groups g ON c.group_id = g.id
      WHERE c.verification_status != 'CANCELLED'
    `;
    const collParams = [];

    if (!isAllTime) {
      collQuery += ' AND c.collection_date = ?';
      collParams.push(targetDate);
    }

    if (agentId && agentId !== 'ALL') {
      collQuery += ' AND c.agent_id = ?';
      collParams.push(agentId);
    }

    collQuery += ' ORDER BY c.collection_date DESC, c.collection_time DESC';
    const [collections] = await pool.query(collQuery, collParams);

    // 4. Fetch agent tracking logs (stop remarks & visit status)
    let logsQuery = `
      SELECT 
        atl.id, atl.agent_id, atl.group_id, atl.member_id, atl.stop_id,
        atl.tracking_date, atl.status, atl.last_ping_time, atl.notes,
        m.full_name as member_name, m.phone as member_phone,
        g.group_name, g.group_code
      FROM agent_tracking_logs atl
      LEFT JOIN members m ON (atl.member_id = m.id OR atl.stop_id = m.id)
      LEFT JOIN chit_groups g ON atl.group_id = g.id
    `;
    const logsParams = [];
    if (!isAllTime) {
      logsQuery += ' WHERE atl.tracking_date = ?';
      logsParams.push(targetDate);
    }
    if (agentId && agentId !== 'ALL') {
      logsQuery += isAllTime ? ' WHERE atl.agent_id = ?' : ' AND atl.agent_id = ?';
      logsParams.push(agentId);
    }
    logsQuery += ' ORDER BY atl.last_ping_time DESC';
    const [trackingLogs] = await pool.query(logsQuery, logsParams);

    // 5. Build agent ledger
    const agentReports = agents.map((agent) => {
      const agentRoutes = assignments.filter((a) => a.agent_id === agent.id);
      const agentCollections = collections.filter((c) => c.agent_id === agent.id);
      const agentLogs = trackingLogs.filter((l) => l.agent_id === agent.id);

      // Financial calculations
      const cashCollected = agentCollections
        .filter((c) => c.payment_method === 'CASH')
        .reduce((sum, c) => sum + Number(c.amount || 0), 0);

      const onlineCollected = agentCollections
        .filter((c) => c.payment_method !== 'CASH')
        .reduce((sum, c) => sum + Number(c.amount || 0), 0);

      const totalCollected = cashCollected + onlineCollected;

      // Calculate Target expected for date:
      // Daily routes have installments due every day.
      // Monthly routes have installments due strictly on 1st of month.
      let targetExpected = 0;
      agentRoutes.forEach((r) => {
        const isDaily = r.frequency === 'DAILY';
        const isMonthlyDue = r.frequency === 'MONTHLY' && isFirstDayOfSelectedDate;

        if (isAllTime) {
          targetExpected += Number(r.group_target_amount || 0);
        } else if (isDaily || isMonthlyDue) {
          targetExpected += Number(r.group_target_amount || 0);
        }
      });

      const pendingAmount = Math.max(0, targetExpected - totalCollected);
      const completionPercent = targetExpected > 0
        ? Math.round((totalCollected / targetExpected) * 100)
        : (totalCollected > 0 ? 100 : 0);

      // Unique visited members today
      const visitedMemberIds = new Set([
        ...agentCollections.map((c) => c.member_id),
        ...agentLogs.filter((l) => l.status === 'PAID' || l.notes).map((l) => l.member_id),
      ]);

      const totalAssignedSubscribers = agentRoutes.reduce((sum, r) => sum + Number(r.subscriber_count || 0), 0);

      return {
        agentId: agent.id,
        fullName: agent.full_name,
        username: agent.username,
        phone: agent.phone,
        isActive: Boolean(agent.is_active),
        lastLoginAt: agent.last_login_at,
        assignedRoutesCount: agentRoutes.length,
        assignedRoutes: agentRoutes.map((r) => ({
          groupId: r.group_id,
          groupCode: r.group_code,
          groupName: r.group_name,
          frequency: r.frequency,
          chitType: r.chit_type,
          locationName: r.location_name,
          installmentAmount: Number(r.installment_amount),
          totalPoolAmount: Number(r.total_pool_amount),
          subscribersCount: Number(r.subscriber_count),
          expectedTarget: Number(r.group_target_amount),
        })),
        totalSubscribersCount: totalAssignedSubscribers,
        visitedSubscribersCount: visitedMemberIds.size,
        targetExpected,
        cashCollected,
        onlineCollected,
        totalCollected,
        pendingAmount,
        completionPercent,
        receiptsCount: agentCollections.length,
        receipts: agentCollections.map((c) => ({
          id: c.collection_id,
          receiptNumber: c.receipt_number,
          memberName: c.member_name,
          memberPhone: c.member_phone,
          groupName: c.group_name,
          groupCode: c.group_code,
          amount: Number(c.amount),
          paymentMethod: c.payment_method,
          paymentReference: c.payment_reference,
          collectionDate: c.collection_date,
          collectionTime: c.collection_time,
          notes: c.notes,
        })),
        workLogs: agentLogs.map((l) => ({
          id: l.id,
          groupId: l.group_id,
          groupName: l.group_name,
          groupCode: l.group_code,
          memberName: l.member_name,
          status: l.status,
          time: l.last_ping_time,
          notes: l.notes,
        })),
      };
    });

    // Grand totals
    const grandCash = agentReports.reduce((sum, a) => sum + a.cashCollected, 0);
    const grandOnline = agentReports.reduce((sum, a) => sum + a.onlineCollected, 0);
    const grandTotal = grandCash + grandOnline;
    const grandTarget = agentReports.reduce((sum, a) => sum + a.targetExpected, 0);
    const grandPending = Math.max(0, grandTarget - grandTotal);
    const grandReceipts = agentReports.reduce((sum, a) => sum + a.receiptsCount, 0);

    res.status(200).json({
      success: true,
      data: {
        filter: {
          date: targetDate,
          mode: isAllTime ? 'ALL_TIME' : 'DAILY',
          isToday: targetDate === new Date().toISOString().slice(0, 10),
          isFirstDayOfMonth: isFirstDayOfSelectedDate,
        },
        summary: {
          totalAgentsCount: agents.length,
          activeFieldAgentsCount: agentReports.filter((a) => a.totalCollected > 0 || a.workLogs.length > 0).length,
          grandTarget,
          grandCash,
          grandOnline,
          grandTotal,
          grandPending,
          grandReceipts,
          averageCompletionPercent: grandTarget > 0 ? Math.round((grandTotal / grandTarget) * 100) : 0,
        },
        agents: agentReports,
      },
    });
  } catch (error) {
    next(error);
  }
}



