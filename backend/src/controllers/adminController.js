import crypto from 'crypto';
import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';
import { getMonthlyCycleInfo } from '../utils/cycleHelper.js';
import { getTodayIST, getCurrentTimeIST } from '../utils/dateUtils.js';

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
    const { groupId, startDate, endDate, frequency, agentId } = req.query || {};

    // 1. Group Breakdown (Daily Chit vs Monthly Auction vs Monthly Double Chit) - Respects Filters
    const groupCountConds = ["status = 'ACTIVE'"];
    const groupCountParams = [];
    if (groupId) { groupCountConds.push('id = ?'); groupCountParams.push(groupId); }
    if (frequency) { groupCountConds.push('frequency = ?'); groupCountParams.push(frequency); }
    if (agentId) {
      groupCountConds.push('id IN (SELECT group_id FROM agent_group_assignments WHERE agent_id = ? AND is_active = 1)');
      groupCountParams.push(agentId);
    }
    const [groupCountRows] = await pool.query(`
      SELECT 
        COUNT(*) as totalGroups,
        COALESCE(SUM(CASE WHEN chit_type = 'DAILY_CHIT' THEN 1 ELSE 0 END), 0) as dailyChitGroups,
        COALESCE(SUM(CASE WHEN chit_type = 'AUCTION_CHIT' THEN 1 ELSE 0 END), 0) as auctionChitGroups,
        COALESCE(SUM(CASE WHEN chit_type = 'DOUBLE_CHIT' THEN 1 ELSE 0 END), 0) as doubleChitGroups,
        COALESCE(SUM(CASE WHEN route_category = 'DAILY_ROUTE' THEN 1 ELSE 0 END), 0) as dailyRoutes,
        COALESCE(SUM(CASE WHEN route_category = 'MONTHLY_ROUTE' THEN 1 ELSE 0 END), 0) as monthlyRoutes
      FROM chit_groups
      WHERE ${groupCountConds.join(' AND ')}
    `, groupCountParams);
    const groupCounts = groupCountRows[0] || { totalGroups: 0, dailyChitGroups: 0, auctionChitGroups: 0, doubleChitGroups: 0, dailyRoutes: 0, monthlyRoutes: 0 };

    // 2. Members Count - Respects Scheme / Agent / Frequency Filters
    let totalMembers = 0;
    if (groupId || frequency || agentId) {
      const memberConds = ["m.is_active = 1", "gm.status = 'ACTIVE'"];
      const memberParams = [];
      if (groupId) { memberConds.push('g.id = ?'); memberParams.push(groupId); }
      if (frequency) { memberConds.push('g.frequency = ?'); memberParams.push(frequency); }
      if (agentId) {
        memberConds.push('g.id IN (SELECT group_id FROM agent_group_assignments WHERE agent_id = ? AND is_active = 1)');
        memberParams.push(agentId);
      }
      const [memberRows] = await pool.query(`
        SELECT COUNT(DISTINCT m.id) as totalMembers
        FROM members m
        JOIN group_memberships gm ON m.id = gm.member_id
        JOIN chit_groups g ON gm.group_id = g.id
        WHERE ${memberConds.join(' AND ')}
      `, memberParams);
      totalMembers = memberRows[0]?.totalMembers || 0;
    } else {
      const [[{ totalMembers: allMembers }]] = await pool.execute(
        'SELECT COUNT(*) as totalMembers FROM members WHERE is_active = 1'
      );
      totalMembers = allMembers || 0;
    }

    // 3. Agents Count - Respects Scheme & Agent Filters (Strict ChitFund Isolation)
    let totalAgents = 0;
    if (agentId) {
      const [[agentRow]] = await pool.query(
        `SELECT COUNT(*) as totalAgents FROM users 
         WHERE id = ? AND role = "COLLECTION_AGENT" AND is_active = 1
           AND (assigned_business = 'CHITFUND' OR (assigned_business = 'ALL' AND role IN ('SUPER_ADMIN', 'ADMIN')) OR (assigned_business IS NULL AND id NOT IN (SELECT user_id FROM interest_user_profiles)))
           AND (assigned_business != 'INTEREST')
           AND id NOT IN (SELECT user_id FROM interest_user_profiles)`,
        [agentId]
      );
      totalAgents = agentRow?.totalAgents || 0;
    } else if (groupId || frequency) {
      const agentConds = [
        "aga.is_active = 1",
        "u.is_active = 1",
        "u.role = 'COLLECTION_AGENT'",
        "(u.assigned_business = 'CHITFUND' OR (u.assigned_business = 'ALL' AND u.role IN ('SUPER_ADMIN', 'ADMIN')) OR (u.assigned_business IS NULL AND u.id NOT IN (SELECT user_id FROM interest_user_profiles)))",
        "(u.assigned_business != 'INTEREST')",
        "u.id NOT IN (SELECT user_id FROM interest_user_profiles)"
      ];
      const agentParams = [];
      if (groupId) { agentConds.push('g.id = ?'); agentParams.push(groupId); }
      if (frequency) { agentConds.push('g.frequency = ?'); agentParams.push(frequency); }
      const [agentRows] = await pool.query(`
        SELECT COUNT(DISTINCT aga.agent_id) as totalAgents
        FROM agent_group_assignments aga
        JOIN chit_groups g ON aga.group_id = g.id
        JOIN users u ON aga.agent_id = u.id
        WHERE ${agentConds.join(' AND ')}
      `, agentParams);
      totalAgents = agentRows[0]?.totalAgents || 0;
    } else {
      const [[{ totalAgents: allAgents }]] = await pool.execute(
        `SELECT COUNT(*) as totalAgents FROM users 
         WHERE role = "COLLECTION_AGENT" AND is_active = 1
           AND (assigned_business = 'CHITFUND' OR (assigned_business = 'ALL' AND role IN ('SUPER_ADMIN', 'ADMIN')) OR (assigned_business IS NULL AND id NOT IN (SELECT user_id FROM interest_user_profiles)))
           AND (assigned_business != 'INTEREST')
           AND id NOT IN (SELECT user_id FROM interest_user_profiles)`
      );
      totalAgents = allAgents || 0;
    }

    // 4. Collections Totals: Split into Day-by-Day (Today) and Month-by-Month (Current Month)
    const todayIST = getTodayIST();
    const [currentYearIST, currentMonthIST] = todayIST.split('-');
    const collConds = ["c.verification_status != 'CANCELLED'"];
    const collParams = [];
    if (groupId) { collConds.push('c.group_id = ?'); collParams.push(groupId); }
    if (agentId) { collConds.push('c.agent_id = ?'); collParams.push(agentId); }
    if (startDate) { collConds.push('c.collection_date >= ?'); collParams.push(startDate); }
    if (endDate) { collConds.push('c.collection_date <= ?'); collParams.push(endDate); }
    if (!startDate && !endDate) { collConds.push('c.collection_date = ?'); collParams.push(todayIST); }
    if (frequency) { collConds.push('g.frequency = ?'); collParams.push(frequency); }

    const [collectionRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN c.payment_method = 'CASH' THEN c.amount ELSE 0 END), 0) as todayCash,
        COALESCE(SUM(CASE WHEN c.payment_method != 'CASH' THEN c.amount ELSE 0 END), 0) as todayOnline,
        COALESCE(SUM(c.amount), 0) as todayTotal,
        COUNT(c.id) as todayCount
      FROM collections c
      JOIN chit_groups g ON c.group_id = g.id
      WHERE ${collConds.join(' AND ')}
    `, collParams);
    const collectionRow = collectionRows[0] || { todayCash: 0, todayOnline: 0, todayTotal: 0, todayCount: 0 };

    // 4a. Daily Chit Collections
    const dailyConds = ["c.verification_status != 'CANCELLED'", "g.frequency = 'DAILY'"];
    const dailyParams = [];
    if (groupId) { dailyConds.push('c.group_id = ?'); dailyParams.push(groupId); }
    if (agentId) { dailyConds.push('c.agent_id = ?'); dailyParams.push(agentId); }
    if (startDate) { dailyConds.push('c.collection_date >= ?'); dailyParams.push(startDate); }
    if (endDate) { dailyConds.push('c.collection_date <= ?'); dailyParams.push(endDate); }
    if (!startDate && !endDate) { dailyConds.push('c.collection_date = ?'); dailyParams.push(todayIST); }

    const [dailyCollectionRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN c.payment_method = 'CASH' THEN c.amount ELSE 0 END), 0) as dailyCash,
        COALESCE(SUM(CASE WHEN c.payment_method != 'CASH' THEN c.amount ELSE 0 END), 0) as dailyOnline,
        COALESCE(SUM(c.amount), 0) as dailyTotal,
        COUNT(c.id) as dailyCount
      FROM collections c
      JOIN chit_groups g ON c.group_id = g.id
      WHERE ${dailyConds.join(' AND ')}
    `, dailyParams);
    const dailyCollectionRow = dailyCollectionRows[0] || { dailyCash: 0, dailyOnline: 0, dailyTotal: 0, dailyCount: 0 };

    // 4b. Monthly Chit Collections
    const monthlyConds = ["c.verification_status != 'CANCELLED'", "g.frequency = 'MONTHLY'"];
    const monthlyParams = [];
    if (groupId) { monthlyConds.push('c.group_id = ?'); monthlyParams.push(groupId); }
    if (agentId) { monthlyConds.push('c.agent_id = ?'); monthlyParams.push(agentId); }
    if (startDate) { monthlyConds.push('c.collection_date >= ?'); monthlyParams.push(startDate); }
    if (endDate) { monthlyConds.push('c.collection_date <= ?'); monthlyParams.push(endDate); }
    if (!startDate && !endDate) {
      monthlyConds.push('YEAR(c.collection_date) = ? AND MONTH(c.collection_date) = ?');
      monthlyParams.push(currentYearIST, currentMonthIST);
    }

    const [monthlyCollectionRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN c.payment_method = 'CASH' THEN c.amount ELSE 0 END), 0) as monthlyCash,
        COALESCE(SUM(CASE WHEN c.payment_method != 'CASH' THEN c.amount ELSE 0 END), 0) as monthlyOnline,
        COALESCE(SUM(c.amount), 0) as monthlyTotal,
        COUNT(c.id) as monthlyCount
      FROM collections c
      JOIN chit_groups g ON c.group_id = g.id
      WHERE ${monthlyConds.join(' AND ')}
    `, monthlyParams);
    const monthlyCollectionRow = monthlyCollectionRows[0] || { monthlyCash: 0, monthlyOnline: 0, monthlyTotal: 0, monthlyCount: 0 };

    // 5a. Expected Daily Target (Day-by-Day Installments Target)
    let dailyTargetRow = { expectedDailyTarget: 0 };
    if (!frequency || frequency === 'DAILY') {
      const dailyTargetConds = ["g.frequency = 'DAILY'", "g.status = 'ACTIVE'"];
      const dailyTargetParams = [];
      if (groupId) { dailyTargetConds.push('g.id = ?'); dailyTargetParams.push(groupId); }
      if (agentId) {
        dailyTargetConds.push('g.id IN (SELECT group_id FROM agent_group_assignments WHERE agent_id = ? AND is_active = 1)');
        dailyTargetParams.push(agentId);
      }
      const [dailyTargetRows] = await pool.query(`
        SELECT COALESCE(SUM(g.installment_amount * (
          SELECT COUNT(gm.id) FROM group_memberships gm WHERE gm.group_id = g.id AND gm.status = 'ACTIVE'
        )), 0) as expectedDailyTarget
        FROM chit_groups g
        WHERE ${dailyTargetConds.join(' AND ')}
      `, dailyTargetParams);
      dailyTargetRow = dailyTargetRows[0] || dailyTargetRow;
    }

    // 5b. Expected Monthly Target (Month-by-Month Installments Target)
    let monthlyTargetRow = { expectedMonthlyTarget: 0 };
    if (!frequency || frequency === 'MONTHLY') {
      const monthlyTargetConds = ["g.frequency = 'MONTHLY'", "g.status = 'ACTIVE'"];
      const monthlyTargetParams = [];
      if (groupId) { monthlyTargetConds.push('g.id = ?'); monthlyTargetParams.push(groupId); }
      if (agentId) {
        monthlyTargetConds.push('g.id IN (SELECT group_id FROM agent_group_assignments WHERE agent_id = ? AND is_active = 1)');
        monthlyTargetParams.push(agentId);
      }
      const [monthlyTargetRows] = await pool.query(`
        SELECT COALESCE(SUM(g.installment_amount * (
          SELECT COUNT(gm.id) FROM group_memberships gm WHERE gm.group_id = g.id AND gm.status = 'ACTIVE'
        )), 0) as expectedMonthlyTarget
        FROM chit_groups g
        WHERE ${monthlyTargetConds.join(' AND ')}
      `, monthlyTargetParams);
      monthlyTargetRow = monthlyTargetRows[0] || monthlyTargetRow;
    }

    // 6. Auctions & Dividends stats
    let auctionStats = {
      totalAuctionsCount: 0,
      todayAuctionsCount: 0,
      dailyAuctionsCount: 0,
      monthlyAuctionsCount: 0,
      totalDividendsGenerated: 0,
      totalPrizeMoneyDisbursed: 0
    };
    const [aucStatsRows] = await pool.query(`
      SELECT 
        COUNT(a.id) as totalAuctionsCount,
        COUNT(CASE WHEN DATE(a.auction_date) = ? THEN a.id END) as todayAuctionsCount,
        COUNT(CASE WHEN g.frequency = 'DAILY' THEN a.id END) as dailyAuctionsCount,
        COUNT(CASE WHEN g.frequency = 'MONTHLY' THEN a.id END) as monthlyAuctionsCount,
        COALESCE(SUM(a.total_dividend), 0) as totalDividendsGenerated,
        COALESCE(SUM(a.net_payable_amount), 0) as totalPrizeMoneyDisbursed
      FROM auctions a
      LEFT JOIN chit_groups g ON a.group_id = g.id
    `, [todayIST]);
    if (aucStatsRows.length > 0) {
      auctionStats = { ...auctionStats, ...aucStatsRows[0] };
    }

    // Pending member dues across active chits + active advances
    const [[pendingDuesRow]] = await pool.query(`
      SELECT COALESCE(SUM(advance_amount), 0) as totalPendingAdvances
      FROM admin_member_advances
      WHERE status = 'PENDING_RECOVERY'
    `);
    const [unpaidCycleDuesRows] = await pool.query(`
      SELECT 
        gm.group_id, gm.member_id, g.installment_amount,
        COALESCE(SUM(c.amount), 0) as cycle_paid
      FROM group_memberships gm
      JOIN chit_groups g ON gm.group_id = g.id
      LEFT JOIN collections c ON c.group_id = gm.group_id AND c.member_id = gm.member_id AND c.verification_status != 'CANCELLED'
        AND (
          (g.frequency = 'DAILY' AND c.collection_date = '${todayIST}')
          OR
          (g.frequency = 'MONTHLY' AND c.collection_date >= DATE_SUB('${todayIST}', INTERVAL 30 DAY))
        )
      WHERE g.status = 'ACTIVE' AND gm.status = 'ACTIVE'
        AND gm.id NOT IN (
          SELECT ama.id FROM admin_member_advances ama 
          WHERE ama.group_id = gm.group_id AND ama.member_id = gm.member_id AND ama.status = 'PENDING_RECOVERY'
        )
      GROUP BY gm.group_id, gm.member_id, g.installment_amount
    `);
    let totalPendingAdvances = parseFloat(pendingDuesRow?.totalPendingAdvances || 0);
    for (const row of unpaidCycleDuesRows) {
      const exp = parseFloat(row.installment_amount || 0);
      const paid = parseFloat(row.cycle_paid || 0);
      if (paid < exp) {
        totalPendingAdvances += (exp - paid);
      }
    }

    // 7. Recent Collections - Dynamically respects filters
    const [recentCollections] = await pool.query(`
      SELECT 
        c.id, c.receipt_number, c.amount, c.payment_method, c.collection_date, c.collection_time, c.created_at,
        g.group_name, g.group_code, g.chit_type, g.frequency, g.route_category,
        m.full_name as member_name,
        u.full_name as agent_name
      FROM collections c
      JOIN chit_groups g ON c.group_id = g.id
      JOIN members m ON c.member_id = m.id
      JOIN users u ON c.agent_id = u.id
      WHERE ${collConds.join(' AND ')}
      ORDER BY c.created_at DESC
      LIMIT 50
    `, collParams);

    // 8. Active Groups Overview - Dynamically respects filters
    const groupListConds = ["g.status = 'ACTIVE'"];
    const groupListParams = [];
    if (groupId) { groupListConds.push('g.id = ?'); groupListParams.push(groupId); }
    if (frequency) { groupListConds.push('g.frequency = ?'); groupListParams.push(frequency); }
    if (agentId) {
      groupListConds.push('g.id IN (SELECT group_id FROM agent_group_assignments WHERE agent_id = ? AND is_active = 1)');
      groupListParams.push(agentId);
    }
    const [groupsList] = await pool.query(`
      SELECT 
        g.id, g.group_code, g.group_name, g.chit_type, g.frequency, g.route_category,
        g.location_name, g.installment_amount, g.total_pool_amount, g.status,
        COUNT(DISTINCT gm.id) as enrolled_members,
        CAST(GROUP_CONCAT(DISTINCT u.full_name SEPARATOR ', ') AS CHAR) as assigned_agents
      FROM chit_groups g
      LEFT JOIN group_memberships gm ON g.id = gm.group_id
      LEFT JOIN agent_group_assignments aga ON g.id = aga.group_id AND aga.is_active = 1
      LEFT JOIN users u ON aga.agent_id = u.id
      WHERE ${groupListConds.join(' AND ')}
      GROUP BY g.id
      ORDER BY g.created_at DESC
      LIMIT 50
    `, groupListParams);

    // 9. Agent Collection Status - Dynamically respects filters & date range (Strict ChitFund Isolation)
    const agentSummaryConds = [
      "u.role = 'COLLECTION_AGENT'",
      "u.is_active = 1",
      "(u.assigned_business = 'CHITFUND' OR (u.assigned_business = 'ALL' AND u.role IN ('SUPER_ADMIN', 'ADMIN')) OR (u.assigned_business IS NULL AND u.id NOT IN (SELECT user_id FROM interest_user_profiles)))",
      "(u.assigned_business != 'INTEREST')",
      "u.id NOT IN (SELECT user_id FROM interest_user_profiles)"
    ];
    const agentSummaryParams = [];
    if (agentId) { agentSummaryConds.push('u.id = ?'); agentSummaryParams.push(agentId); }
    if (groupId) {
      agentSummaryConds.push('u.id IN (SELECT agent_id FROM agent_group_assignments WHERE group_id = ? AND is_active = 1)');
      agentSummaryParams.push(groupId);
    }
    const agentCollDateCond = (startDate || endDate)
      ? `${startDate ? 'c.collection_date >= ?' : '1=1'} AND ${endDate ? 'c.collection_date <= ?' : '1=1'}`
      : 'c.collection_date = ?';
    const agentDateParams = [];
    if (startDate) agentDateParams.push(startDate);
    if (endDate) agentDateParams.push(endDate);
    if (!startDate && !endDate) agentDateParams.push(todayIST);

    const [agentsSummary] = await pool.query(`
      SELECT 
        u.id, u.full_name, u.username, u.phone,
        COALESCE(SUM(CASE WHEN c.payment_method = 'CASH' THEN c.amount ELSE 0 END), 0) as cashCollected,
        COALESCE(SUM(CASE WHEN c.payment_method != 'CASH' THEN c.amount ELSE 0 END), 0) as onlineCollected,
        COALESCE(SUM(c.amount), 0) as totalCollected,
        COUNT(c.id) as collectionsCount
      FROM users u
      LEFT JOIN collections c ON u.id = c.agent_id AND ${agentCollDateCond} AND c.verification_status != 'CANCELLED'
      WHERE ${agentSummaryConds.join(' AND ')}
      GROUP BY u.id
      ORDER BY totalCollected DESC
    `, [...agentDateParams, ...agentSummaryParams]);

    // 10. Recent Auctions - Dynamically respects filters
    const aucListConds = [];
    const aucListParams = [];
    if (groupId) { aucListConds.push('a.group_id = ?'); aucListParams.push(groupId); }
    if (agentId) {
      aucListConds.push('a.group_id IN (SELECT group_id FROM agent_group_assignments WHERE agent_id = ? AND is_active = 1)');
      aucListParams.push(agentId);
    }
    if (startDate) { aucListConds.push('a.auction_date >= ?'); aucListParams.push(startDate); }
    if (endDate) { aucListConds.push('a.auction_date <= ?'); aucListParams.push(endDate); }
    const aucListWhere = aucListConds.length ? `WHERE ${aucListConds.join(' AND ')}` : '';
    const [recentAuctions] = await pool.query(`
      SELECT 
        a.id, a.period_number, a.draw_number, a.auction_type, a.bid_discount,
        a.total_dividend, a.dividend_per_member, a.net_payable_amount, a.auction_date, a.payout_status,
        g.group_name, g.group_code, g.chit_type,
        m.full_name as winner_name
      FROM auctions a
      JOIN chit_groups g ON a.group_id = g.id
      JOIN members m ON a.winning_member_id = m.id
      ${aucListWhere}
      ORDER BY a.auction_date DESC, a.period_number DESC LIMIT 20
    `, aucListParams);

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
        totalAuctionsCount: Number(auctionStats.totalAuctionsCount) || 0,
        todayAuctionsCount: Number(auctionStats.todayAuctionsCount) || 0,
        dailyAuctionsCount: Number(auctionStats.dailyAuctionsCount) || 0,
        monthlyAuctionsCount: Number(auctionStats.monthlyAuctionsCount) || 0,
        totalPendingAdvances: totalPendingAdvances || 0,
        totalDividendsGenerated: auctionStats.totalDividendsGenerated,
        totalPrizeMoneyDisbursed: auctionStats.totalPrizeMoneyDisbursed,
        recentCollections,
        groupsList,
        agentsSummary,
        recentAuctions,
        availableFilters: {
          groups: (await pool.query('SELECT id, group_name, group_code, frequency, chit_type FROM chit_groups ORDER BY group_name ASC'))[0] || [],
          agents: (await pool.query("SELECT id, full_name, username FROM users WHERE role = 'COLLECTION_AGENT' AND is_active = 1 AND (assigned_business = 'CHITFUND' OR (assigned_business = 'ALL' AND role IN ('SUPER_ADMIN', 'ADMIN')) OR (assigned_business IS NULL AND id NOT IN (SELECT user_id FROM interest_user_profiles))) AND (assigned_business != 'INTEREST') AND id NOT IN (SELECT user_id FROM interest_user_profiles) ORDER BY full_name ASC"))[0] || [],
        },
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
    const reportTodayIST = getTodayIST();
    const [reportYearIST, reportMonthIST] = reportTodayIST.split('-');
    if (period === 'TODAY') {
      colWhere += " AND c.collection_date = ?";
      colParams.push(reportTodayIST);
    } else if (period === 'MONTH') {
      colWhere += " AND MONTH(c.collection_date) = ? AND YEAR(c.collection_date) = ?";
      colParams.push(reportMonthIST, reportYearIST);
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
            (g.frequency = 'DAILY' AND c2.collection_date = '${reportTodayIST}')
            OR
            (g.frequency = 'MONTHLY' AND c2.collection_date >= DATE_SUB('${reportTodayIST}', INTERVAL 30 DAY))
          )
        ) as cycle_paid,
        (
          SELECT ama.id
          FROM admin_member_advances ama
          WHERE ama.group_id = gm.group_id AND ama.member_id = gm.member_id
            AND ama.status = 'PENDING_RECOVERY'
          ORDER BY ama.id DESC LIMIT 1
        ) as active_advance_id,
        (
          SELECT COALESCE(SUM(ama.advance_amount), 0)
          FROM admin_member_advances ama
          WHERE ama.group_id = gm.group_id AND ama.member_id = gm.member_id
            AND ama.status = 'PENDING_RECOVERY'
        ) as active_advance_amount,
        (
          SELECT ama.advance_date
          FROM admin_member_advances ama
          WHERE ama.group_id = gm.group_id AND ama.member_id = gm.member_id
            AND ama.status = 'PENDING_RECOVERY'
          ORDER BY ama.id DESC LIMIT 1
        ) as active_advance_date,
        (
          SELECT ama.notes
          FROM admin_member_advances ama
          WHERE ama.group_id = gm.group_id AND ama.member_id = gm.member_id
            AND ama.status = 'PENDING_RECOVERY'
          ORDER BY ama.id DESC LIMIT 1
        ) as active_advance_notes,
        (
          SELECT c3.receipt_number
          FROM collections c3
          WHERE c3.group_id = gm.group_id AND c3.member_id = gm.member_id 
          AND c3.verification_status != 'CANCELLED'
          AND (
            (g.frequency = 'DAILY' AND c3.collection_date = '${reportTodayIST}')
            OR
            (g.frequency = 'MONTHLY' AND c3.collection_date >= DATE_SUB('${reportTodayIST}', INTERVAL 30 DAY))
          )
          ORDER BY c3.id DESC
          LIMIT 1
        ) as cycle_receipt,
        (
          SELECT atl.notes
          FROM agent_tracking_logs atl
          WHERE atl.group_id = gm.group_id AND atl.member_id = gm.member_id 
          AND (
            (g.frequency = 'DAILY' AND atl.tracking_date = '${reportTodayIST}')
            OR
            (g.frequency = 'MONTHLY' AND atl.tracking_date >= DATE_SUB('${reportTodayIST}', INTERVAL 30 DAY))
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
      .filter((m) => Boolean(m.active_advance_id) || parseFloat(m.cycle_paid || 0) < parseFloat(m.installment_amount || 0))
      .map((m) => {
        const isDaily = m.frequency === 'DAILY';
        const expected = parseFloat(m.installment_amount);
        const paid = parseFloat(m.cycle_paid || 0);
        const hasAdvance = Boolean(m.active_advance_id);
        const advanceAmount = hasAdvance ? parseFloat(m.active_advance_amount || 0) : 0;
        const due = hasAdvance ? advanceAmount : Math.max(0, expected - paid);
        const status = hasAdvance ? 'ADMIN_COVERED' : (paid > 0 ? 'PARTIAL' : 'NOT_PAID');

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
          isAdminCovered: hasAdvance,
          advanceId: m.active_advance_id || null,
          advanceAmount,
          advanceDate: m.active_advance_date || null,
          advanceNotes: m.active_advance_notes || null,
          agentNotes: m.agent_notes || (hasAdvance ? `Covered by Admin on ${m.active_advance_date} (Awaiting Recovery)` : (isDaily ? 'Awaiting today installment' : 'Awaiting monthly installment')),
          status,
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

    // 4. Per-Chit Member Accounts & Financial Standing Ledger
    // Strictly isolates payments, prize lifts, and dividends to the respective chit scheme.
    let memWhere = "gm.status = 'ACTIVE' AND g.status = 'ACTIVE' AND m.is_active = 1";
    const memParams = [];
    if (groupId && groupId !== 'ALL') {
      memWhere += " AND gm.group_id = ?";
      memParams.push(groupId);
    }

    const [memberSummariesRaw] = await pool.query(`
      SELECT 
        gm.id as membership_id,
        gm.group_id,
        gm.member_id as id,
        gm.member_id,
        gm.ticket_number,
        gm.joined_date,
        gm.status as membership_status,
        gm.is_prized,
        gm.prized_period,
        g.group_name,
        g.group_code,
        g.chit_type,
        g.frequency,
        g.route_category,
        g.installment_amount,
        g.total_pool_amount,
        g.duration_periods,
        m.full_name,
        m.full_name as member_name,
        m.phone,
        m.phone as member_phone,
        m.member_code,
        m.address,
        -- Total amount paid strictly in this respective chit
        COALESCE((
          SELECT SUM(c.amount) FROM collections c 
          WHERE c.group_id = gm.group_id AND c.member_id = gm.member_id AND c.verification_status != 'CANCELLED'
        ), 0) as total_contributed,
        COALESCE((
          SELECT SUM(c.amount) FROM collections c 
          WHERE c.group_id = gm.group_id AND c.member_id = gm.member_id AND c.verification_status != 'CANCELLED'
        ), 0) as total_paid_in_chit,
        -- Receipts count strictly in this respective chit
        COALESCE((
          SELECT COUNT(c.id) FROM collections c 
          WHERE c.group_id = gm.group_id AND c.member_id = gm.member_id AND c.verification_status != 'CANCELLED'
        ), 0) as receipts_count,
        -- Prize money won strictly in this respective chit
        COALESCE((
          SELECT a.net_payable_amount FROM auctions a 
          WHERE a.group_id = gm.group_id AND a.winning_member_id = gm.member_id 
          LIMIT 1
        ), 0) as total_prize_won,
        COALESCE((
          SELECT a.net_payable_amount FROM auctions a 
          WHERE a.group_id = gm.group_id AND a.winning_member_id = gm.member_id 
          LIMIT 1
        ), 0) as prize_won_in_chit,
        -- Dividends credited strictly in this respective chit
        COALESCE((
          SELECT SUM(md.dividend_amount) FROM member_dividends md 
          WHERE md.group_id = gm.group_id AND md.member_id = gm.member_id
        ), 0) as total_dividends_earned,
        COALESCE((
          SELECT SUM(md.dividend_amount) FROM member_dividends md 
          WHERE md.group_id = gm.group_id AND md.member_id = gm.member_id
        ), 0) as dividends_credited_in_chit,
        -- Last payment date in this respective chit
        (
          SELECT MAX(c.collection_date) FROM collections c 
          WHERE c.group_id = gm.group_id AND c.member_id = gm.member_id AND c.verification_status != 'CANCELLED'
        ) as last_payment_date
      FROM group_memberships gm
      JOIN chit_groups g ON gm.group_id = g.id
      JOIN members m ON gm.member_id = m.id
      WHERE ${memWhere}
      ORDER BY g.group_name ASC, gm.ticket_number ASC
    `, memParams);

    const memberSummaries = memberSummariesRaw.map((row) => {
      const paid = parseFloat(row.total_paid_in_chit || 0);
      const prize = parseFloat(row.prize_won_in_chit || 0);
      const dividends = parseFloat(row.dividends_credited_in_chit || 0);
      const totalReceived = prize + dividends;
      const netPosition = totalReceived - paid;

      return {
        ...row,
        total_paid_in_chit: paid,
        total_contributed: paid,
        prize_won_in_chit: prize,
        total_prize_won: prize,
        dividends_credited_in_chit: dividends,
        total_dividends_earned: dividends,
        total_received_in_chit: totalReceived,
        total_received: totalReceived,
        net_position_in_chit: netPosition,
        netPosition: netPosition,
      };
    });

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
          adminCoveredCount: defaulters.filter((d) => d.isAdminCovered).length,
          adminCoveredAmount: defaulters.filter((d) => d.isAdminCovered).reduce((s, d) => s + d.dueAmount, 0),
          unpaidDefaulterAmount: defaulters.filter((d) => !d.isAdminCovered).reduce((s, d) => s + d.dueAmount, 0),
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
    const { startDate, endDate, agentId, groupId, frequency, paymentMethod } = req.query;

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

    // 2. Aggregate Foreman Commissions from Auctions (with filtering by groupId and date range)
    const auctionConditions = [];
    const auctionParams = [];
    if (groupId) { auctionConditions.push('a.group_id = ?'); auctionParams.push(groupId); }
    if (startDate) { auctionConditions.push('a.auction_date >= ?'); auctionParams.push(startDate); }
    if (endDate) { auctionConditions.push('a.auction_date <= ?'); auctionParams.push(endDate); }
    const auctionWhereClause = auctionConditions.length ? `WHERE ${auctionConditions.join(' AND ')}` : '';

    const [commRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(foreman_commission), 0) AS total_commission_earned,
        COALESCE(SUM(bid_discount), 0) AS total_bid_discount,
        COALESCE(SUM(GREATEST(COALESCE(double_chit_reserve, 0), COALESCE(bid_discount, 0))), 0) AS total_double_chit_reserve,
        COUNT(*) AS total_auctions_conducted
      FROM auctions a
      ${auctionWhereClause}
    `, auctionParams);
    const totalForemanCommission = parseFloat(commRows[0].total_commission_earned || 0);
    const totalDoubleChitReserve = parseFloat(commRows[0].total_double_chit_reserve || commRows[0].total_bid_discount || 0);
    const totalBidDiscount = parseFloat(commRows[0].total_bid_discount || 0);
    const totalAuctionsConducted = parseInt(commRows[0].total_auctions_conducted || 0, 10);

    // 3. Aggregate Collections & Payments Got
    const collectionConditions = ["c.verification_status != 'CANCELLED'"];
    const collectionParams = [];
    if (startDate) { collectionConditions.push('c.collection_date >= ?'); collectionParams.push(startDate); }
    if (endDate) { collectionConditions.push('c.collection_date <= ?'); collectionParams.push(endDate); }
    if (agentId) { collectionConditions.push('c.agent_id = ?'); collectionParams.push(agentId); }
    if (groupId) { collectionConditions.push('c.group_id = ?'); collectionParams.push(groupId); }
    if (frequency) { collectionConditions.push('g.frequency = ?'); collectionParams.push(frequency); }
    if (paymentMethod) { collectionConditions.push('c.payment_method = ?'); collectionParams.push(paymentMethod); }
    const filteredCollectionWhere = collectionConditions.join(' AND ');
    const [collAggRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) AS total_payments_received,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount ELSE 0 END), 0) AS cash_payments,
        COALESCE(SUM(CASE WHEN payment_method IN ('UPI', 'BANK_TRANSFER') THEN amount ELSE 0 END), 0) AS digital_payments,
        COALESCE(SUM(CASE WHEN payment_method = 'CHEQUE' THEN amount ELSE 0 END), 0) AS cheque_payments,
        COUNT(*) AS total_transactions_count
      FROM collections c JOIN chit_groups g ON g.id=c.group_id
      WHERE ${filteredCollectionWhere}
    `, collectionParams);
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
    const [agentsCountRow] = await pool.query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'COLLECTION_AGENT' AND (assigned_business = 'CHITFUND' OR (assigned_business = 'ALL' AND role IN ('SUPER_ADMIN', 'ADMIN')) OR (assigned_business IS NULL AND id NOT IN (SELECT user_id FROM interest_user_profiles))) AND (assigned_business != 'INTEREST') AND id NOT IN (SELECT user_id FROM interest_user_profiles)"
    );
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
      ${auctionWhereClause}
      ORDER BY a.auction_date DESC, a.id DESC
      LIMIT 100
    `, auctionParams);

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
      WHERE ${filteredCollectionWhere}
      ORDER BY c.collection_date DESC, c.id DESC
      LIMIT 500
    `, collectionParams);

    const [filterAgents] = await pool.query(
      "SELECT id,full_name FROM users WHERE role='COLLECTION_AGENT' AND is_active=1 AND (assigned_business = 'CHITFUND' OR (assigned_business = 'ALL' AND role IN ('SUPER_ADMIN', 'ADMIN')) OR (assigned_business IS NULL AND id NOT IN (SELECT user_id FROM interest_user_profiles))) AND (assigned_business != 'INTEREST') AND id NOT IN (SELECT user_id FROM interest_user_profiles) ORDER BY full_name"
    );
    const [filterGroups] = await pool.query("SELECT id,group_name,group_code,frequency FROM chit_groups ORDER BY group_name");

    // 8. Withdrawals History
    const [withdrawalsHistory] = await pool.query(`
      SELECT 
        id, withdrawal_number, amount, withdrawal_date, payment_method,
        reference_number, destination_account, remarks, created_at
      FROM admin_commission_withdrawals
      ORDER BY withdrawal_date DESC, id DESC
      LIMIT 50
    `);

    // 9. Comprehensive Member Dues & Receivables across all active chit schemes + Admin Advances
    const duesTodayIST = getTodayIST();
    let membershipWhere = "g.status = 'ACTIVE' AND gm.status = 'ACTIVE'";
    const membershipParams = [];
    if (groupId) {
      membershipWhere += " AND g.id = ?";
      membershipParams.push(groupId);
    }

    const [membershipRows] = await pool.query(`
      SELECT 
        gm.id as membership_id, gm.group_id, gm.member_id, gm.ticket_number,
        g.group_name, g.group_code, g.chit_type, g.frequency, g.installment_amount,
        m.full_name AS member_name, m.phone AS member_phone, m.member_code,
        COALESCE(col.cycle_paid, 0) as cycle_paid,
        ama.id as advance_id,
        ama.advance_amount,
        ama.status as advance_status,
        ama.recovered_amount,
        ama.advance_date,
        ama.notes as advance_notes,
        u.full_name as added_by_name
      FROM group_memberships gm
      JOIN chit_groups g ON gm.group_id = g.id
      JOIN members m ON gm.member_id = m.id
      LEFT JOIN (
        SELECT c.member_id, c.group_id, SUM(c.amount) as cycle_paid
        FROM collections c
        JOIN chit_groups g2 ON c.group_id = g2.id
        WHERE c.verification_status != 'CANCELLED'
          AND (
            (g2.frequency = 'DAILY' AND c.collection_date = '${duesTodayIST}')
            OR
            (g2.frequency = 'MONTHLY' AND c.collection_date >= DATE_SUB('${duesTodayIST}', INTERVAL 30 DAY))
          )
        GROUP BY c.member_id, c.group_id
      ) col ON col.member_id = gm.member_id AND col.group_id = gm.group_id
      LEFT JOIN admin_member_advances ama ON ama.member_id = gm.member_id AND ama.group_id = gm.group_id AND ama.status = 'PENDING_RECOVERY'
      LEFT JOIN users u ON ama.created_by = u.id
      WHERE ${membershipWhere}
      ORDER BY g.group_name ASC, gm.ticket_number ASC
    `, membershipParams);

    // Also fetch any recovered advances
    let recWhere = "ama.status = 'RECOVERED'";
    const recParams = [];
    if (groupId) {
      recWhere += " AND ama.group_id = ?";
      recParams.push(groupId);
    }
    const [recoveredRows] = await pool.query(`
      SELECT 
        ama.id, ama.group_id, ama.member_id, ama.collection_id, ama.advance_amount,
        ama.advance_date, ama.cycle_period, ama.status, ama.recovered_amount,
        ama.recovered_date, ama.notes, ama.created_at,
        g.group_name, g.group_code, g.chit_type, g.frequency, g.installment_amount,
        m.full_name AS member_name, m.phone AS member_phone, m.member_code,
        gm.ticket_number,
        u.full_name AS added_by_name
      FROM admin_member_advances ama
      JOIN chit_groups g ON ama.group_id = g.id
      JOIN members m ON ama.member_id = m.id
      LEFT JOIN group_memberships gm ON gm.group_id = ama.group_id AND gm.member_id = ama.member_id
      LEFT JOIN users u ON ama.created_by = u.id
      WHERE ${recWhere}
      ORDER BY ama.recovered_date DESC
    `, recParams);

    const combinedDues = [];

    for (const m of membershipRows) {
      const baseInstallment = parseFloat(m.installment_amount || 0);
      const cyclePaid = parseFloat(m.cycle_paid || 0);
      const hasAdvance = Boolean(m.advance_id);
      const advAmount = hasAdvance ? parseFloat(m.advance_amount || 0) : 0;

      let pendingAmount = 0;
      let status = 'PAID';

      if (hasAdvance) {
        status = 'PENDING_RECOVERY';
        pendingAmount = advAmount;
      } else if (cyclePaid < baseInstallment) {
        status = 'PENDING_RECOVERY';
        pendingAmount = Math.max(0, baseInstallment - cyclePaid);
      }

      if (status === 'PENDING_RECOVERY') {
        combinedDues.push({
          id: m.advance_id || `due-${m.membership_id}`,
          advance_id: m.advance_id || null,
          membership_id: m.membership_id,
          group_id: m.group_id,
          member_id: m.member_id,
          advance_amount: pendingAmount,
          advance_date: m.advance_date || duesTodayIST,
          cycle_period: m.frequency === 'DAILY' ? 'Today Round' : 'Current Cycle',
          status: 'PENDING_RECOVERY',
          recovered_amount: 0,
          notes: m.advance_notes || (cyclePaid > 0 ? `Partial payment received (₹${cyclePaid.toLocaleString('en-IN')})` : 'Unpaid scheme installment due'),
          group_name: m.group_name,
          group_code: m.group_code,
          chit_type: m.chit_type,
          frequency: m.frequency,
          installment_amount: m.installment_amount,
          member_name: m.member_name,
          member_phone: m.member_phone,
          member_code: m.member_code,
          ticket_number: m.ticket_number,
          added_by_name: m.added_by_name || 'Scheme Due',
        });
      }
    }

    for (const r of recoveredRows) {
      combinedDues.push({
        id: r.id,
        advance_id: r.id,
        group_id: r.group_id,
        member_id: r.member_id,
        advance_amount: parseFloat(r.advance_amount || 0),
        advance_date: r.advance_date,
        cycle_period: r.cycle_period,
        status: 'RECOVERED',
        recovered_amount: parseFloat(r.recovered_amount || r.advance_amount || 0),
        notes: r.notes,
        group_name: r.group_name,
        group_code: r.group_code,
        chit_type: r.chit_type,
        frequency: r.frequency,
        installment_amount: r.installment_amount,
        member_name: r.member_name,
        member_phone: r.member_phone,
        member_code: r.member_code,
        ticket_number: r.ticket_number,
        added_by_name: r.added_by_name || 'Admin',
      });
    }

    const pendingAdvancesAmount = combinedDues
      .filter((a) => a.status === 'PENDING_RECOVERY')
      .reduce((s, a) => s + parseFloat(a.advance_amount || 0), 0);
    const recoveredAdvancesAmount = combinedDues
      .filter((a) => a.status === 'RECOVERED')
      .reduce((s, a) => s + parseFloat(a.recovered_amount || a.advance_amount || 0), 0);
    const totalAdvancesAdded = pendingAdvancesAmount + recoveredAdvancesAmount;
    const pendingMembersCount = combinedDues.filter((a) => a.status === 'PENDING_RECOVERY').length;

    res.status(200).json({
      success: true,
      data: {
        adminUser: user,
        adminProfile: profile,
        financialOverview: {
          totalForemanCommission,
          totalAuctionsConducted,
          totalPaymentsReceived,
          totalDoubleChitReserve,
          totalBidDiscount,
          totalCombinedInflows: totalPaymentsReceived + totalDoubleChitReserve,
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
          totalAdvancesAdded,
          pendingAdvancesAmount,
          recoveredAdvancesAmount,
          pendingMembersCount,
        },
        auctionLedger,
        paymentsLedger,
        collectionFilters: { agents: filterAgents, groups: filterGroups, active: { startDate: startDate || '', endDate: endDate || '', agentId: agentId || '', groupId: groupId || '', frequency: frequency || '', paymentMethod: paymentMethod || '' } },
        withdrawalsHistory,
        adminAdvances: combinedDues,
        advancesSummary: {
          totalAdvancesAdded,
          pendingAdvancesAmount,
          recoveredAdvancesAmount,
          pendingMembersCount,
        },
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

    const todayStr = getTodayIST();
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
    const targetDate = date || getTodayIST();
    const dateObj = new Date(targetDate);
    const isFirstDayOfSelectedDate = dateObj.getDate() === 1;

    // 1. Fetch collection agents (Strict ChitFund Isolation - exclude FinLend/Interest agents)
    let agentQuery = `
      SELECT id, full_name, username, phone, role, is_active, last_login_at, created_at
      FROM users
      WHERE role = 'COLLECTION_AGENT'
        AND (assigned_business = 'CHITFUND' OR (assigned_business = 'ALL' AND role IN ('SUPER_ADMIN', 'ADMIN')) OR (assigned_business IS NULL AND id NOT IN (SELECT user_id FROM interest_user_profiles)))
        AND (assigned_business != 'INTEREST')
        AND id NOT IN (SELECT user_id FROM interest_user_profiles)
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
        g.installment_amount, g.total_pool_amount, g.start_date, g.created_at,
        COUNT(DISTINCT gm.id) as subscriber_count,
        COALESCE(SUM(g.installment_amount), 0) as group_target_amount
      FROM agent_group_assignments aga
      JOIN chit_groups g ON aga.group_id = g.id
      LEFT JOIN group_memberships gm ON g.id = gm.group_id AND gm.status = 'ACTIVE'
      WHERE aga.is_active = 1 AND g.status = 'ACTIVE'
      GROUP BY aga.agent_id, g.id
      ORDER BY g.group_name ASC
    `);

    // 2b. Fetch approved leaves and temporary coverages for the target date
    const [approvedLeaves] = isAllTime ? [[]] : await pool.query(`
      SELECT al.id as leave_id, al.agent_id, al.leave_date, al.reason,
             u.full_name as agent_name
      FROM agent_leaves al
      JOIN users u ON al.agent_id = u.id
      WHERE al.leave_date = ? AND al.status = 'APPROVED'
    `, [targetDate]);

    const [coverages] = isAllTime ? [[]] : await pool.query(`
      SELECT 
        alc.leave_id, alc.group_id, alc.covering_agent_id,
        l.agent_id as absent_agent_id,
        absent.full_name as absent_agent_name,
        g.group_code, g.group_name, g.frequency, g.chit_type, g.location_name,
        g.installment_amount, g.total_pool_amount, g.start_date, g.created_at,
        COUNT(DISTINCT gm.id) as subscriber_count,
        COALESCE(SUM(g.installment_amount), 0) as group_target_amount
      FROM agent_leave_coverages alc
      JOIN agent_leaves l ON alc.leave_id = l.id
      JOIN users absent ON l.agent_id = absent.id
      JOIN chit_groups g ON alc.group_id = g.id
      LEFT JOIN group_memberships gm ON g.id = gm.group_id AND gm.status = 'ACTIVE'
      WHERE l.leave_date = ? AND l.status = 'APPROVED' AND g.status = 'ACTIVE'
      GROUP BY alc.id, alc.leave_id, alc.group_id, alc.covering_agent_id, l.agent_id, absent.full_name, g.id
    `, [targetDate]);

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
      const agentLeave = approvedLeaves.find((l) => l.agent_id === agent.id);
      const isOnLeave = Boolean(agentLeave);

      // Determine absent agent's coverer, or covering agent's temporary routes
      let coveredBy = null;
      let agentRoutes = [];

      if (isOnLeave) {
        // Agent is absent on this date: their routes do not show as their active workload today
        const covRows = coverages.filter((c) => c.absent_agent_id === agent.id);
        if (covRows.length > 0) {
          const coveringAgent = agents.find((a) => a.id === covRows[0].covering_agent_id);
          coveredBy = coveringAgent ? coveringAgent.full_name : 'Assigned Cover Agent';
        }
        agentRoutes = [];
      } else {
        // Active agent: primary assigned routes
        const primaryRoutes = assignments
          .filter((a) => a.agent_id === agent.id)
          .map((r) => ({ ...r, isTemporaryCoverage: false }));

        // Plus any temporary coverage routes assigned to this agent on targetDate
        const coveredForOthers = coverages
          .filter((c) => c.covering_agent_id === agent.id)
          .map((c) => ({
            agent_id: agent.id,
            group_id: c.group_id,
            group_code: c.group_code,
            group_name: c.group_name,
            frequency: c.frequency,
            chit_type: c.chit_type,
            location_name: c.location_name,
            installment_amount: c.installment_amount,
            total_pool_amount: c.total_pool_amount,
            start_date: c.start_date,
            created_at: c.created_at,
            subscriber_count: c.subscriber_count,
            group_target_amount: c.group_target_amount,
            isTemporaryCoverage: true,
            absentAgentId: c.absent_agent_id,
            absentAgentName: c.absent_agent_name,
          }));

        // Avoid duplicate inclusion if any
        const combined = [...primaryRoutes];
        for (const cr of coveredForOthers) {
          if (!combined.some((r) => r.group_id === cr.group_id)) {
            combined.push(cr);
          }
        }
        agentRoutes = combined;
      }

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
      // Monthly routes have cycle deadline on anchor day (start_date day).
      let targetExpected = 0;
      agentRoutes.forEach((r) => {
        const isDaily = r.frequency === 'DAILY';
        const cycleInfo = isDaily ? null : getMonthlyCycleInfo(r.start_date || r.created_at, targetDate);
        const isMonthlyDue = r.frequency === 'MONTHLY' && cycleInfo?.isDeadlineToday;

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
        isOnLeave,
        leaveReason: agentLeave?.reason || null,
        coveredBy,
        temporaryCoverageRoutesCount: agentRoutes.filter((r) => r.isTemporaryCoverage).length,
        lastLoginAt: agent.last_login_at,
        assignedRoutesCount: agentRoutes.length,
        assignedRoutes: agentRoutes.map((r) => {
          const rCollections = agentCollections.filter((c) => c.group_id === r.group_id);
          const rCollected = rCollections.reduce((sum, c) => sum + Number(c.amount || 0), 0);
          const rTarget = Number(r.group_target_amount || 0);
          const rPending = Math.max(0, rTarget - rCollected);
          const isCompleted = (rTarget > 0 && rCollected >= rTarget) || (Number(r.subscriber_count || 0) > 0 && rCollected > 0 && rPending === 0);
          return {
            groupId: r.group_id,
            groupCode: r.group_code,
            groupName: r.group_name,
            frequency: r.frequency,
            chitType: r.chit_type,
            locationName: r.location_name,
            installmentAmount: Number(r.installment_amount),
            totalPoolAmount: Number(r.total_pool_amount),
            subscribersCount: Number(r.subscriber_count),
            expectedTarget: rTarget,
            collectedAmount: rCollected,
            pendingAmount: rPending,
            isCompleted,
            isTemporaryCoverage: Boolean(r.isTemporaryCoverage),
            absentAgentName: r.absentAgentName || null,
            absentAgentId: r.absentAgentId || null,
          };
        }),
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
          isToday: targetDate === getTodayIST(),
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

/**
 * Get Comprehensive Pending Member Dues and Admin-Funded Advances Ledger
 * Explicitly breaks down: which chit, which member, installment due, amount paid, and pending amount.
 */
export async function getPendingDuesAndAdvances(req, res, next) {
  try {
    const duesTodayIST = getTodayIST();
    const { groupId, status } = req.query; // status: 'ALL' | 'UNPAID' | 'ADMIN_COVERED' | 'RECOVERED'
    let whereClause = "g.status = 'ACTIVE' AND gm.status = 'ACTIVE'";
    const params = [];

    if (groupId && groupId !== 'ALL') {
      whereClause += " AND g.id = ?";
      params.push(groupId);
    }

    const [rows] = await pool.query(`
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
            (g.frequency = 'DAILY' AND c2.collection_date = '${duesTodayIST}')
            OR
            (g.frequency = 'MONTHLY' AND c2.collection_date >= DATE_SUB('${duesTodayIST}', INTERVAL 30 DAY))
          )
        ) as cycle_paid,
        (
          SELECT ama.id
          FROM admin_member_advances ama
          WHERE ama.group_id = gm.group_id AND ama.member_id = gm.member_id
            AND ama.status = 'PENDING_RECOVERY'
          ORDER BY ama.id DESC LIMIT 1
        ) as active_advance_id,
        (
          SELECT ama.advance_amount
          FROM admin_member_advances ama
          WHERE ama.group_id = gm.group_id AND ama.member_id = gm.member_id
            AND ama.status = 'PENDING_RECOVERY'
          ORDER BY ama.id DESC LIMIT 1
        ) as active_advance_amount,
        (
          SELECT ama.advance_date
          FROM admin_member_advances ama
          WHERE ama.group_id = gm.group_id AND ama.member_id = gm.member_id
            AND ama.status = 'PENDING_RECOVERY'
          ORDER BY ama.id DESC LIMIT 1
        ) as active_advance_date,
        (
          SELECT ama.notes
          FROM admin_member_advances ama
          WHERE ama.group_id = gm.group_id AND ama.member_id = gm.member_id
            AND ama.status = 'PENDING_RECOVERY'
          ORDER BY ama.id DESC LIMIT 1
        ) as active_advance_notes
      FROM group_memberships gm
      JOIN chit_groups g ON gm.group_id = g.id
      JOIN members m ON gm.member_id = m.id
      WHERE ${whereClause}
      ORDER BY g.group_code ASC, gm.ticket_number ASC
    `, params);

    const items = rows.map((m) => {
      const isDaily = m.frequency === 'DAILY';
      const expected = parseFloat(m.installment_amount);
      const paid = parseFloat(m.cycle_paid || 0);
      const hasActiveAdvance = Boolean(m.active_advance_id);
      const advanceAmount = hasActiveAdvance ? parseFloat(m.active_advance_amount || 0) : 0;

      let pendingAmount = 0;
      let recordStatus = 'PAID';

      if (hasActiveAdvance) {
        recordStatus = 'ADMIN_COVERED';
        pendingAmount = advanceAmount;
      } else if (paid < expected) {
        recordStatus = paid > 0 ? 'PARTIAL' : 'NOT_PAID';
        pendingAmount = Math.max(0, expected - paid);
      }

      return {
        membershipId: m.membership_id,
        groupId: m.group_id,
        groupName: m.group_name,
        groupCode: m.group_code,
        chitType: m.chit_type,
        frequency: m.frequency,
        cycleType: isDaily ? 'Daily Cycle' : 'Monthly Cycle',
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
        pendingAmount,
        isAdminCovered: hasActiveAdvance,
        advanceId: m.active_advance_id || null,
        advanceAmount,
        advanceDate: m.active_advance_date || null,
        advanceNotes: m.active_advance_notes || null,
        status: recordStatus,
      };
    });

    let filtered = items;
    if (status === 'UNPAID') {
      filtered = items.filter((i) => i.status === 'NOT_PAID' || i.status === 'PARTIAL');
    } else if (status === 'ADMIN_COVERED') {
      filtered = items.filter((i) => i.status === 'ADMIN_COVERED');
    } else if (!status || status === 'PENDING_ALL') {
      filtered = items.filter((i) => i.status === 'NOT_PAID' || i.status === 'PARTIAL' || i.status === 'ADMIN_COVERED');
    }

    const totalUnpaidAmount = items
      .filter((i) => i.status === 'NOT_PAID' || i.status === 'PARTIAL')
      .reduce((s, i) => s + i.pendingAmount, 0);

    const totalAdminCoveredAmount = items
      .filter((i) => i.status === 'ADMIN_COVERED')
      .reduce((s, i) => s + i.pendingAmount, 0);

    const totalPendingOverall = totalUnpaidAmount + totalAdminCoveredAmount;

    res.status(200).json({
      success: true,
      data: {
        items: filtered,
        summary: {
          totalPendingOverall,
          totalUnpaidAmount,
          totalAdminCoveredAmount,
          unpaidCount: items.filter((i) => i.status === 'NOT_PAID' || i.status === 'PARTIAL').length,
          adminCoveredCount: items.filter((i) => i.status === 'ADMIN_COVERED').length,
          totalPendingSubscribersCount: items.filter((i) => i.status !== 'PAID').length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin Adds / Covers Member Installment in a Chit Scheme
 * Creates a collection entry (so chit ledger has funds) and records an admin advance pending member recovery.
 */
export async function recordAdminAdvance(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const { group_id, member_id, amount, payment_method, notes, cycle_period } = req.body;
    const parsedGroupId = parseInt(group_id, 10);
    const parsedMemberId = parseInt(member_id, 10);
    const parsedAmount = parseFloat(amount);

    if (!parsedGroupId || !parsedMemberId || !parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid group, member, and positive amount are required.' });
    }

    // 1. Verify group and member membership
    const [groupRows] = await connection.execute(
      'SELECT id, group_name, group_code, installment_amount, frequency FROM chit_groups WHERE id = ?',
      [parsedGroupId]
    );
    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chit Group not found.' });
    }
    const group = groupRows[0];

    const [memberRows] = await connection.execute(
      `SELECT m.id, m.full_name, m.phone, gm.ticket_number
       FROM group_memberships gm
       JOIN members m ON gm.member_id = m.id
       WHERE gm.group_id = ? AND gm.member_id = ? LIMIT 1`,
      [parsedGroupId, parsedMemberId]
    );
    if (memberRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Member is not enrolled in this chit group.' });
    }
    const member = memberRows[0];

    await connection.beginTransaction();

    // 2. Generate receipt number and insert collection
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const receiptNumber = `ADM-${dateStr}-${randSuffix}`;
    const paymentMethod = payment_method && ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'].includes(payment_method)
      ? payment_method
      : 'CASH';

    const advanceNotes = notes || `[ADMIN_FUNDED] Covered by Admin for ${member.full_name} (Ticket #${member.ticket_number}) - Pending Member Recovery`;
    const todayIST = getTodayIST();
    const currentTimeIST = getCurrentTimeIST();

    const [collResult] = await connection.execute(
      `INSERT INTO collections 
        (receipt_number, group_id, member_id, agent_id, amount, payment_method, payment_reference, collection_date, collection_time, verification_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECONCILED', ?)`,
      [
        receiptNumber,
        parsedGroupId,
        parsedMemberId,
        req.user.id,
        parsedAmount,
        paymentMethod,
        `ADMIN_ADV_${Date.now()}`,
        todayIST,
        currentTimeIST,
        advanceNotes,
      ]
    );

    // 3. Insert record into admin_member_advances
    const [advResult] = await connection.execute(
      `INSERT INTO admin_member_advances
        (group_id, member_id, collection_id, advance_amount, advance_date, cycle_period, status, recovered_amount, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING_RECOVERY', 0.00, ?, ?)`,
      [
        parsedGroupId,
        parsedMemberId,
        collResult.insertId,
        parsedAmount,
        todayIST,
        cycle_period || (group.frequency === 'DAILY' ? 'DAILY_ROUND' : 'MONTHLY_ROUND'),
        advanceNotes,
        req.user.id,
      ]
    );

    await connection.commit();

    await recordAuditLog({
      userId: req.user.id,
      action: 'RECORD_ADMIN_ADVANCE',
      resource: 'ADMIN_MEMBER_ADVANCES',
      details: {
        advanceId: advResult.insertId,
        groupId: parsedGroupId,
        groupName: group.group_name,
        memberId: parsedMemberId,
        memberName: member.full_name,
        ticketNumber: member.ticket_number,
        amount: parsedAmount,
        receiptNumber,
      },
    });

    createNotification({
      targetRole: 'ADMIN',
      title: `💼 Admin Added Amount: ₹${parsedAmount.toLocaleString('en-IN')}`,
      message: `Admin covered unpaid installment of ₹${parsedAmount.toLocaleString('en-IN')} for ${member.full_name} in ${group.group_name} (Ticket #${member.ticket_number}). Marked as Pending Recovery.`,
      type: 'COLLECTION',
      link: '/admin/reports',
    }).catch(() => { });

    res.status(201).json({
      success: true,
      message: `Successfully added ₹${parsedAmount.toLocaleString('en-IN')} on behalf of ${member.full_name}. Recorded as Pending Recovery.`,
      data: {
        advanceId: advResult.insertId,
        collectionId: collResult.insertId,
        receiptNumber,
        groupId: parsedGroupId,
        groupName: group.group_name,
        memberId: parsedMemberId,
        memberName: member.full_name,
        ticketNumber: member.ticket_number,
        amount: parsedAmount,
        status: 'PENDING_RECOVERY',
      },
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

/**
 * Mark Admin Advance as Recovered when Subscriber Repays the Admin
 */
export async function settleAdminAdvance(req, res, next) {
  try {
    const { advance_id, group_id, member_id, recovered_amount, notes } = req.body;
    const advanceId = parseInt(advance_id, 10);
    const todayIST = getTodayIST();

    let adv = null;
    if (advanceId && !isNaN(advanceId)) {
      const [rows] = await pool.execute(
        `SELECT ama.*, g.group_name, g.group_code, m.full_name as member_name, m.phone, gm.ticket_number
         FROM admin_member_advances ama
         JOIN chit_groups g ON ama.group_id = g.id
         JOIN members m ON ama.member_id = m.id
         LEFT JOIN group_memberships gm ON gm.group_id = ama.group_id AND gm.member_id = ama.member_id
         WHERE ama.id = ? LIMIT 1`,
        [advanceId]
      );
      if (rows.length > 0) {
        adv = rows[0];
      }
    }

    if (adv) {
      const recAmount = recovered_amount !== undefined && recovered_amount !== null && recovered_amount !== ''
        ? parseFloat(recovered_amount)
        : parseFloat(adv.advance_amount);

      await pool.execute(
        `UPDATE admin_member_advances
         SET status = 'RECOVERED', recovered_amount = ?, recovered_date = ?, notes = CONCAT(COALESCE(notes, ''), ' | Recovered: ', ?)
         WHERE id = ?`,
        [recAmount, todayIST, notes || 'Fully repaid by subscriber', adv.id]
      );

      await recordAuditLog({
        userId: req.user.id,
        action: 'SETTLE_ADMIN_ADVANCE',
        resource: 'ADMIN_MEMBER_ADVANCES',
        details: {
          advanceId: adv.id,
          groupId: adv.group_id,
          groupName: adv.group_name,
          memberId: adv.member_id,
          memberName: adv.member_name,
          recoveredAmount: recAmount,
        },
      });

      createNotification({
        targetRole: 'ADMIN',
        title: `✅ Recovered: ₹${recAmount.toLocaleString('en-IN')}`,
        message: `Subscriber ${adv.member_name} (Ticket #${adv.ticket_number || ''}) has repaid ₹${recAmount.toLocaleString('en-IN')} for scheme ${adv.group_name}. Dues settled.`,
        type: 'COLLECTION',
        link: '/admin/reports',
      }).catch(() => { });

      return res.status(200).json({
        success: true,
        message: `Amount of ₹${recAmount.toLocaleString('en-IN')} marked as recovered from ${adv.member_name}.`,
      });
    }

    // Direct recovery for unpaid member due by group_id and member_id
    const parsedGroupId = parseInt(group_id, 10);
    const parsedMemberId = parseInt(member_id, 10);
    if (!parsedGroupId || !parsedMemberId) {
      return res.status(400).json({ success: false, message: 'Valid scheme and member ID are required to settle dues.' });
    }

    const [memRows] = await pool.execute(
      `SELECT m.full_name as member_name, g.group_name, g.group_code, gm.ticket_number
       FROM group_memberships gm
       JOIN members m ON gm.member_id = m.id
       JOIN chit_groups g ON gm.group_id = g.id
       WHERE gm.group_id = ? AND gm.member_id = ? LIMIT 1`,
      [parsedGroupId, parsedMemberId]
    );

    if (memRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member enrollment in chit scheme not found.' });
    }

    const memberInfo = memRows[0];
    const recAmount = parseFloat(recovered_amount || 0);
    const receiptNum = `REC-ADMIN-${Date.now().toString().slice(-6)}`;

    // 1. Record verified collection entry
    await pool.execute(
      `INSERT INTO collections 
        (receipt_number, group_id, member_id, agent_id, amount, payment_method, collection_date, collection_time, verification_status, notes)
       VALUES (?, ?, ?, ?, ?, 'CASH', ?, CURTIME(), 'VERIFIED', ?)`,
      [receiptNum, parsedGroupId, parsedMemberId, req.user.id, recAmount, todayIST, notes || 'Settled and paid on Admin Profile']
    );

    // 2. Also record in admin_member_advances as RECOVERED
    await pool.execute(
      `INSERT INTO admin_member_advances
        (group_id, member_id, advance_amount, advance_date, cycle_period, status, recovered_amount, recovered_date, notes, created_by)
       VALUES (?, ?, ?, ?, 'Current Cycle', 'RECOVERED', ?, ?, ?, ?)`,
      [parsedGroupId, parsedMemberId, recAmount, todayIST, recAmount, todayIST, notes || 'Settled and paid on Admin Profile', req.user.id]
    );

    await recordAuditLog({
      userId: req.user.id,
      action: 'SETTLE_MEMBER_DUE',
      resource: 'COLLECTIONS',
      details: {
        receiptNumber: receiptNum,
        groupId: parsedGroupId,
        groupName: memberInfo.group_name,
        memberId: parsedMemberId,
        memberName: memberInfo.member_name,
        recoveredAmount: recAmount,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Amount of ₹${recAmount.toLocaleString('en-IN')} successfully recorded and settled for ${memberInfo.member_name}.`,
    });
  } catch (error) {
    next(error);
  }
}




