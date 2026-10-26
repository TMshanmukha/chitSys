import { pool } from '../config/db.js';

export async function getAuditLogs(req, res, next) {
  try {
    const [rows] = await pool.execute(`
      SELECT a.id, a.user_id, u.full_name, u.username, a.action, a.resource, a.details, a.ip_address, a.status, a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 25
    `);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSystemSummary(req, res, next) {
  try {
    const [[{ totalUsers }]] = await pool.execute('SELECT COUNT(*) AS totalUsers FROM users');
    const [[{ totalAgents }]] = await pool.execute('SELECT COUNT(*) AS totalAgents FROM users WHERE role = "COLLECTION_AGENT"');
    const [[{ totalAdmins }]] = await pool.execute('SELECT COUNT(*) AS totalAdmins FROM users WHERE role IN ("SUPER_ADMIN", "ADMIN")');

    res.status(200).json({
      success: true,
      data: {
        activeUsers: totalUsers,
        totalAgents,
        totalAdmins,
        systemStatus: 'OPERATIONAL',
        databaseEngine: 'MySQL 9.3',
        environment: process.env.NODE_ENV || 'development',
      },
    });
  } catch (error) {
    next(error);
  }
}
