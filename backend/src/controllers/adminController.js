import { pool } from '../config/db.js';

export async function getAuditLogs(req, res, next) {
  try {
    const [rows] = await pool.execute(`
      SELECT a.id, a.user_id, u.full_name, u.username, a.action, a.resource, a.details, a.ip_address, a.status, a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 50
    `);

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
    // 1. Group Counts
    const [[{ totalGroups, dailyGroups, monthlyGroups }]] = await pool.execute(`
      SELECT 
        COUNT(*) as totalGroups,
        COALESCE(SUM(CASE WHEN frequency = 'DAILY' THEN 1 ELSE 0 END), 0) as dailyGroups,
        COALESCE(SUM(CASE WHEN frequency = 'MONTHLY' THEN 1 ELSE 0 END), 0) as monthlyGroups
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

    // 4. Today's Collection Totals
    const [[collectionRow]] = await pool.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount ELSE 0 END), 0) as todayCash,
        COALESCE(SUM(CASE WHEN payment_method != 'CASH' THEN amount ELSE 0 END), 0) as todayOnline,
        COALESCE(SUM(amount), 0) as todayTotal,
        COUNT(id) as todayCount
      FROM collections
      WHERE collection_date = CURDATE() AND verification_status != 'CANCELLED'
    `);

    // 5. Today's Expected Daily Target
    const [[targetRow]] = await pool.execute(`
      SELECT COALESCE(SUM(g.installment_amount * (
        SELECT COUNT(gm.id) FROM group_memberships gm WHERE gm.group_id = g.id AND gm.status = 'ACTIVE'
      )), 0) as expectedDailyTarget
      FROM chit_groups g
      WHERE g.frequency = 'DAILY' AND g.status = 'ACTIVE'
    `);

    // 6. Recent Collections (Last 5 transactions)
    const [recentCollections] = await pool.execute(`
      SELECT 
        c.id, c.receipt_number, c.amount, c.payment_method, c.collection_time, c.created_at,
        g.group_name, g.group_code,
        m.full_name as member_name,
        u.full_name as agent_name
      FROM collections c
      JOIN chit_groups g ON c.group_id = g.id
      JOIN members m ON c.member_id = m.id
      JOIN users u ON c.agent_id = u.id
      ORDER BY c.created_at DESC
      LIMIT 6
    `);

    // 7. Active Groups Overview
    const [groupsList] = await pool.execute(`
      SELECT 
        g.id, g.group_code, g.group_name, g.frequency, g.location_name,
        g.installment_amount, g.total_pool_amount, g.status,
        COUNT(DISTINCT gm.id) as enrolled_members,
        GROUP_CONCAT(DISTINCT u.full_name SEPARATOR ', ') as assigned_agents
      FROM chit_groups g
      LEFT JOIN group_memberships gm ON g.id = gm.group_id
      LEFT JOIN agent_group_assignments aga ON g.id = aga.group_id AND aga.is_active = 1
      LEFT JOIN users u ON aga.agent_id = u.id
      WHERE g.status = 'ACTIVE'
      GROUP BY g.id
      ORDER BY g.created_at DESC
      LIMIT 6
    `);

    // 8. Agent Today's Collection Status
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

    res.status(200).json({
      success: true,
      data: {
        totalGroups,
        dailyGroups,
        monthlyGroups,
        totalMembers,
        totalAgents,
        todayCash: collectionRow.todayCash,
        todayOnline: collectionRow.todayOnline,
        todayTotal: collectionRow.todayTotal,
        todayCount: collectionRow.todayCount,
        expectedDailyTarget: targetRow.expectedDailyTarget || 0,
        recentCollections,
        groupsList,
        agentsSummary,
      },
    });
  } catch (error) {
    next(error);
  }
}
