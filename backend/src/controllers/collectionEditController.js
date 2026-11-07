import { pool } from '../config/db.js';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';
import { getTodayIST } from '../utils/dateUtils.js';

let tableEnsured = false;
export async function ensureCollectionEditTable() {
  if (tableEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collection_edit_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        collection_id INT NOT NULL,
        agent_id INT NOT NULL,
        group_id INT NOT NULL,
        member_id INT NOT NULL,
        current_amount DECIMAL(12, 2) NOT NULL,
        current_payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
        requested_amount DECIMAL(12, 2) NOT NULL,
        requested_payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
        reason TEXT NOT NULL,
        status ENUM('PENDING', 'APPROVED', 'REJECTED', 'APPLIED') NOT NULL DEFAULT 'PENDING',
        admin_notes TEXT NULL,
        reviewed_by INT NULL,
        reviewed_at DATETIME NULL,
        applied_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cer_agent (agent_id),
        INDEX idx_cer_collection (collection_id),
        INDEX idx_cer_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    tableEnsured = true;
  } catch (err) {
    // Non-blocking in case table already exists or permissions differ
  }
}

/**
 * AGENT: Submit request to Admin to edit a previously entered wrong collection amount.
 */
export async function requestCollectionEdit(req, res, next) {
  try {
    await ensureCollectionEditTable();
    const agentId = req.user.id;
    const collectionId = parseInt(req.params.id || req.body.collection_id, 10);
    const requestedAmount = parseFloat(req.body.requested_amount);
    const requestedPaymentMethod = (req.body.requested_payment_method || 'CASH').toUpperCase();
    const reason = (req.body.reason || '').trim();

    if (isNaN(collectionId) || collectionId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid collection receipt ID is required.' });
    }
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Requested amount must be a positive number.' });
    }
    if (!reason || reason.length < 3) {
      return res.status(400).json({ success: false, message: 'Please provide a clear reason for the edit request (e.g. wrong amount entered by mistake).' });
    }

    // 1. Fetch collection and verify ownership
    const [colls] = await pool.query(
      `SELECT c.id, c.receipt_number, c.group_id, c.member_id, c.agent_id, c.amount, c.payment_method, c.collection_date,
              m.full_name as member_name, gm.ticket_number, g.group_name, g.group_code
       FROM collections c
       JOIN members m ON c.member_id = m.id
       LEFT JOIN group_memberships gm ON c.group_id = gm.group_id AND c.member_id = gm.member_id
       LEFT JOIN chit_groups g ON c.group_id = g.id
       WHERE c.id = ? LIMIT 1`,
      [collectionId]
    );

    if (colls.length === 0) {
      return res.status(404).json({ success: false, message: 'Collection receipt not found.' });
    }

    const coll = colls[0];

    // Only the agent who collected this receipt (or admin) can request edit
    if (req.user.role === 'COLLECTION_AGENT' && Number(coll.agent_id) !== Number(agentId)) {
      return res.status(403).json({ success: false, message: 'You can only request edits for collections recorded by you.' });
    }

    // 2. Check if a request is already pending or approved for this collection
    const [existing] = await pool.query(
      `SELECT id, status, requested_amount FROM collection_edit_requests
       WHERE collection_id = ? AND status IN ('PENDING', 'APPROVED') LIMIT 1`,
      [collectionId]
    );

    if (existing.length > 0) {
      const activeStatus = existing[0].status;
      if (activeStatus === 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Admin has already approved an edit for this payment. You can now update the collection directly.',
          isApproved: true,
          requestId: existing[0].id,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'An edit request for this receipt is already pending Admin approval.',
        isPending: true,
        requestId: existing[0].id,
      });
    }

    // 3. Create the edit request
    const [insertResult] = await pool.query(
      `INSERT INTO collection_edit_requests (
        collection_id, agent_id, group_id, member_id, current_amount, current_payment_method,
        requested_amount, requested_payment_method, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        collectionId,
        coll.agent_id,
        coll.group_id,
        coll.member_id,
        coll.amount,
        coll.payment_method,
        requestedAmount,
        requestedPaymentMethod,
        reason,
      ]
    );

    const requestId = insertResult.insertId;

    // 4. Audit Log
    await recordAuditLog({
      userId: agentId,
      action: 'REQUEST_COLLECTION_EDIT',
      resource: 'COLLECTION_EDIT_REQUESTS',
      details: {
        requestId,
        collectionId,
        receiptNumber: coll.receipt_number,
        currentAmount: coll.amount,
        requestedAmount,
        reason,
      },
    });

    // 5. Notify All Admins Immediately
    createNotification({
      targetRole: 'ADMIN',
      title: '✏️ Collection Edit Request Submitted',
      message: `${req.user.full_name || 'Agent'} requested to correct payment for ${coll.member_name} (#${coll.ticket_number || 'N/A'}) in ${coll.group_name}: ₹${Number(coll.amount).toLocaleString('en-IN')} ➔ ₹${Number(requestedAmount).toLocaleString('en-IN')}. Reason: "${reason}".`,
      type: 'COLLECTION',
      link: '/admin/collection-edits',
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Edit request submitted to Admin successfully. Once approved, you will be able to edit this payment.',
      data: {
        requestId,
        collectionId,
        currentAmount: coll.amount,
        requestedAmount,
        requestedPaymentMethod,
        reason,
        status: 'PENDING',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * ADMIN: List all collection edit requests with agent, member, and chit scheme details.
 */
export async function listCollectionEditRequestsForAdmin(req, res, next) {
  try {
    await ensureCollectionEditTable();
    const { status } = req.query;

    let query = `
      SELECT cer.*,
             c.receipt_number, c.collection_date, c.collection_time, c.notes as collection_notes,
             u.full_name as agent_name, u.username as agent_username, u.phone as agent_phone,
             m.full_name as member_name, m.phone as member_phone, gm.ticket_number,
             g.group_name, g.group_code, g.frequency as group_frequency, g.installment_amount,
             approver.full_name as reviewed_by_name
      FROM collection_edit_requests cer
      JOIN collections c ON cer.collection_id = c.id
      JOIN users u ON cer.agent_id = u.id
      JOIN members m ON cer.member_id = m.id
      LEFT JOIN group_memberships gm ON cer.group_id = gm.group_id AND cer.member_id = gm.member_id
      LEFT JOIN chit_groups g ON cer.group_id = g.id
      LEFT JOIN users approver ON cer.reviewed_by = approver.id
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ` WHERE cer.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY FIELD(cer.status, 'PENDING', 'APPROVED', 'REJECTED', 'APPLIED'), cer.id DESC`;

    const [rows] = await pool.query(query, params);

    // Compute summary KPI counts
    const [counts] = await pool.query(
      `SELECT 
         COUNT(*) as totalCount,
         SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pendingCount,
         SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approvedCount,
         SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejectedCount,
         SUM(CASE WHEN status = 'APPLIED' THEN 1 ELSE 0 END) as appliedCount
       FROM collection_edit_requests`
    );

    res.status(200).json({
      success: true,
      data: rows,
      summary: counts[0] || {
        totalCount: rows.length,
        pendingCount: rows.filter((r) => r.status === 'PENDING').length,
        approvedCount: rows.filter((r) => r.status === 'APPROVED').length,
        rejectedCount: rows.filter((r) => r.status === 'REJECTED').length,
        appliedCount: rows.filter((r) => r.status === 'APPLIED').length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * ADMIN: Approve collection edit request.
 * Unlocks the edit action ONLY for the specific agent, member, and payment.
 */
export async function approveCollectionEditRequest(req, res, next) {
  try {
    await ensureCollectionEditTable();
    const requestId = parseInt(req.params.id, 10);
    const adminNotes = (req.body.admin_notes || '').trim();

    const [rows] = await pool.query(
      `SELECT cer.*, c.receipt_number, m.full_name as member_name, g.group_name
       FROM collection_edit_requests cer
       JOIN collections c ON cer.collection_id = c.id
       JOIN members m ON cer.member_id = m.id
       JOIN chit_groups g ON cer.group_id = g.id
       WHERE cer.id = ? LIMIT 1`,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Edit request not found.' });
    }

    const request = rows[0];

    if (request.status === 'APPLIED') {
      return res.status(400).json({ success: false, message: 'This collection edit has already been applied.' });
    }

    await pool.query(
      `UPDATE collection_edit_requests
       SET status = 'APPROVED',
           admin_notes = ?,
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [adminNotes || null, req.user.id, requestId]
    );

    // Audit Log
    await recordAuditLog({
      userId: req.user.id,
      action: 'APPROVE_COLLECTION_EDIT',
      resource: 'COLLECTION_EDIT_REQUESTS',
      details: { requestId, collectionId: request.collection_id, agentId: request.agent_id, adminNotes },
    });

    // Notify Agent
    createNotification({
      targetUserId: request.agent_id,
      title: '✅ Collection Edit Request Approved',
      message: `Admin approved your correction request for ${request.member_name} (Receipt #${request.receipt_number}). You can now edit this payment in Today's Tasks.`,
      type: 'COLLECTION',
      link: '/agent/tasks',
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Edit request approved successfully. Agent can now edit this specific collection.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * ADMIN: Reject collection edit request.
 */
export async function rejectCollectionEditRequest(req, res, next) {
  try {
    await ensureCollectionEditTable();
    const requestId = parseInt(req.params.id, 10);
    const adminNotes = (req.body.admin_notes || 'Rejected by Administrator. Please check physical cash receipts.').trim();

    const [rows] = await pool.query(
      `SELECT cer.*, c.receipt_number, m.full_name as member_name
       FROM collection_edit_requests cer
       JOIN collections c ON cer.collection_id = c.id
       JOIN members m ON cer.member_id = m.id
       WHERE cer.id = ? LIMIT 1`,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Edit request not found.' });
    }

    const request = rows[0];

    await pool.query(
      `UPDATE collection_edit_requests
       SET status = 'REJECTED',
           admin_notes = ?,
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [adminNotes, req.user.id, requestId]
    );

    // Audit Log
    await recordAuditLog({
      userId: req.user.id,
      action: 'REJECT_COLLECTION_EDIT',
      resource: 'COLLECTION_EDIT_REQUESTS',
      details: { requestId, collectionId: request.collection_id, agentId: request.agent_id, adminNotes },
    });

    // Notify Agent
    createNotification({
      targetUserId: request.agent_id,
      title: '❌ Collection Edit Request Rejected',
      message: `Admin declined your edit request for ${request.member_name} (Receipt #${request.receipt_number}). Note: "${adminNotes}".`,
      type: 'COLLECTION',
      link: '/agent/tasks',
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Edit request rejected.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * AGENT: Apply the approved edit to the collection.
 * Strictly verifies that this specific collection has an APPROVED edit request.
 * Agent cannot change any other member or payment.
 */
export async function applyCollectionEdit(req, res, next) {
  try {
    await ensureCollectionEditTable();
    const agentId = req.user.id;
    const collectionId = parseInt(req.params.id, 10);
    const newAmount = parseFloat(req.body.amount);
    const newPaymentMethod = (req.body.payment_method || 'CASH').toUpperCase();
    const editNotes = (req.body.notes || '').trim();

    if (isNaN(collectionId) || collectionId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid collection receipt ID is required.' });
    }
    if (isNaN(newAmount) || newAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    // 1. Verify that this collection has an APPROVED edit request
    const [requests] = await pool.query(
      `SELECT cer.*, c.receipt_number, c.collection_date, m.full_name as member_name, g.group_name
       FROM collection_edit_requests cer
       JOIN collections c ON cer.collection_id = c.id
       JOIN members m ON cer.member_id = m.id
       JOIN chit_groups g ON cer.group_id = g.id
       WHERE cer.collection_id = ? AND cer.agent_id = ? AND cer.status = 'APPROVED'
       ORDER BY cer.id DESC LIMIT 1`,
      [collectionId, agentId]
    );

    if (requests.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'No approved edit request found for this payment. You can only edit a payment if Admin has approved an edit request for it.',
      });
    }

    const request = requests[0];
    const oldAmount = parseFloat(request.current_amount);

    // 2. Update the collection record
    const updatedNotes = editNotes
      ? `${editNotes} (Corrected from ₹${oldAmount})`
      : `Corrected from ₹${oldAmount} with Admin Approval`;

    await pool.query(
      `UPDATE collections
       SET amount = ?,
           payment_method = ?,
           notes = ?
       WHERE id = ? AND agent_id = ?`,
      [newAmount, newPaymentMethod, updatedNotes, collectionId, agentId]
    );

    // 3. Mark the edit request as APPLIED (Locks the edit permission)
    await pool.query(
      `UPDATE collection_edit_requests
       SET status = 'APPLIED',
           applied_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [request.id]
    );

    // 4. Update tracking log amount if exists
    try {
      await pool.query(
        `UPDATE agent_tracking_logs
         SET notes = CONCAT('Payment updated to ₹', ?)
         WHERE group_id = ? AND member_id = ? AND tracking_date = ?`,
        [newAmount, request.group_id, request.member_id, request.collection_date]
      );
    } catch (_) {}

    // 5. Audit Log
    await recordAuditLog({
      userId: agentId,
      action: 'APPLY_COLLECTION_EDIT',
      resource: 'COLLECTIONS',
      details: {
        collectionId,
        requestId: request.id,
        oldAmount,
        newAmount,
        oldPaymentMethod: request.current_payment_method,
        newPaymentMethod,
      },
    });

    // 6. Notify Admin that agent completed the correction
    createNotification({
      targetRole: 'ADMIN',
      title: '✏️ Collection Edit Applied by Agent',
      message: `${req.user.full_name} updated payment for ${request.member_name} (${request.group_name}): from ₹${oldAmount} to ₹${newAmount} (${newPaymentMethod}). Receipt #${request.receipt_number}.`,
      type: 'COLLECTION',
      link: '/admin/collection-edits',
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Collection successfully updated to ₹${newAmount.toLocaleString('en-IN')}. Receipt updated and edit access is now locked.`,
      data: {
        collectionId,
        amount: newAmount,
        paymentMethod: newPaymentMethod,
        receiptNumber: request.receipt_number,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * AGENT: Get all edit requests initiated by the calling agent.
 */
export async function getMyCollectionEditRequests(req, res, next) {
  try {
    await ensureCollectionEditTable();
    const agentId = req.user.id;

    const [rows] = await pool.query(
      `SELECT cer.*,
              c.receipt_number, c.collection_date, c.collection_time,
              m.full_name as member_name, gm.ticket_number,
              g.group_name, g.group_code, g.installment_amount,
              approver.full_name as reviewed_by_name
       FROM collection_edit_requests cer
       JOIN collections c ON cer.collection_id = c.id
       JOIN members m ON cer.member_id = m.id
       LEFT JOIN group_memberships gm ON cer.group_id = gm.group_id AND cer.member_id = gm.member_id
       LEFT JOIN chit_groups g ON cer.group_id = g.id
       LEFT JOIN users approver ON cer.reviewed_by = approver.id
       WHERE cer.agent_id = ?
       ORDER BY cer.id DESC`,
      [agentId]
    );

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

