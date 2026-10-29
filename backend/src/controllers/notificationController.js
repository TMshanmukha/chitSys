import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

/**
 * Get notifications for the authenticated user and their role
 */
export async function getNotifications(req, res) {
  try {
    const userRole = req.user.role === 'SUPER_ADMIN' ? 'ADMIN' : req.user.role;
    const userId = req.user.id;

    // Fetch notifications targeting ALL, user's role, or specifically this user
    const [rows] = await pool.query(
      `SELECT id, user_id, target_role, title, message, type, link, is_read, created_at
       FROM notifications
       WHERE (target_role = 'ALL' OR target_role = ? OR user_id = ?)
       ORDER BY created_at DESC
       LIMIT 50`,
      [userRole, userId]
    );

    // Calculate unread count
    const unreadCount = rows.filter((n) => !n.is_read).length;

    res.status(200).json({
      success: true,
      unreadCount,
      notifications: rows,
    });
  } catch (error) {
    logger.error('Failed to fetch notifications', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to retrieve notifications' });
  }
}

/**
 * Mark a specific notification as read
 */
export async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Failed to mark notification as read', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
}

/**
 * Mark all notifications for the user's role as read
 */
export async function markAllAsRead(req, res) {
  try {
    const userRole = req.user.role === 'SUPER_ADMIN' ? 'ADMIN' : req.user.role;
    const userId = req.user.id;

    await pool.query(
      `UPDATE notifications 
       SET is_read = 1 
       WHERE (target_role = 'ALL' OR target_role = ? OR user_id = ?) AND is_read = 0`,
      [userRole, userId]
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Failed to mark all notifications as read', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
}

/**
 * Clear all notifications
 */
export async function clearAll(req, res) {
  try {
    const userRole = req.user.role === 'SUPER_ADMIN' ? 'ADMIN' : req.user.role;
    const userId = req.user.id;

    await pool.query(
      `DELETE FROM notifications 
       WHERE (target_role = 'ALL' OR target_role = ? OR user_id = ?)`,
      [userRole, userId]
    );

    res.status(200).json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    logger.error('Failed to clear notifications', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to clear notifications' });
  }
}

/**
 * Send a notification (used internally or by admin)
 */
export async function createNotification({ userId = null, targetRole = 'ALL', title, message, type = 'SYSTEM', link = null }) {
  try {
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, target_role, title, message, type, link, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [userId, targetRole, title, message, type, link]
    );
    return result.insertId;
  } catch (error) {
    logger.error('Failed to insert notification', { error: error.message });
    return null;
  }
}
