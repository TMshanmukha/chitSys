import { pool } from '../config/db.js';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';
import { getTodayIST } from '../utils/dateUtils.js';
import { broadcastSync } from '../services/realtimeService.js';
import { ensureAdvanceTables, createAdvanceCredit } from '../services/advanceEngine.js';

let tableEnsured = false;
export async function ensureCollectionEditTable() {
  await ensureAdvanceTables();
  if (tableEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collection_edit_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        collection_id INT NULL,
        agent_id INT NOT NULL,
        group_id INT NOT NULL,
        member_id INT NOT NULL,
        current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        current_payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
        requested_amount DECIMAL(12, 2) NOT NULL,
        requested_payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
        normal_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        advance_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        reason TEXT NOT NULL,
        status ENUM('PENDING', 'APPROVED', 'REJECTED', 'APPLIED') NOT NULL DEFAULT 'PENDING',
        request_type ENUM('AMOUNT_CORRECTION', 'ADVANCE_COLLECTION') NOT NULL DEFAULT 'AMOUNT_CORRECTION',
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
 * AGENT: Submit request to Admin to edit/collect advance or correct payment.
 */
export async function requestCollectionEdit(req, res, next) {
  try {
    await ensureCollectionEditTable();
    const agentId = req.user.id;
    const rawCollectionId = req.params.id || req.body.collection_id;
    const collectionId = rawCollectionId ? parseInt(rawCollectionId, 10) : null;
    const rawGroupId = req.body.group_id;
    const rawMemberId = req.body.member_id;
    const requestedAmount = parseFloat(req.body.requested_amount);
    const requestedPaymentMethod = (req.body.requested_payment_method || 'CASH').toUpperCase();
    const reason = (req.body.reason || '').trim();

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Requested amount must be a positive number.' });
    }
    if (!reason || reason.length < 3) {
      return res.status(400).json({ success: false, message: 'Please provide a clear reason for the edit or advance collection request.' });
    }

    let targetCollection = null;
    let groupId = null;
    let memberId = null;
    let memberName = 'Subscriber';
    let ticketNumber = 'N/A';
    let groupName = 'Chit Scheme';
    let groupCode = '';
    let installmentAmount = 0;
    let currentAmount = 0;
    let currentPaymentMethod = 'CASH';

    if (collectionId && !isNaN(collectionId) && collectionId > 0) {
      // 1a. Fetch existing collection and verify ownership
      const [colls] = await pool.query(
        `SELECT c.id, c.receipt_number, c.group_id, c.member_id, c.agent_id, c.amount, c.payment_method, c.collection_date,
                m.full_name as member_name, gm.ticket_number, g.group_name, g.group_code, g.installment_amount
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

      targetCollection = colls[0];
      if (req.user.role === 'COLLECTION_AGENT' && Number(targetCollection.agent_id) !== Number(agentId)) {
        return res.status(403).json({ success: false, message: 'You can only request edits for collections recorded by you.' });
      }

      groupId = targetCollection.group_id;
      memberId = targetCollection.member_id;
      memberName = targetCollection.member_name;
      ticketNumber = targetCollection.ticket_number || 'N/A';
      groupName = targetCollection.group_name;
      groupCode = targetCollection.group_code;
      installmentAmount = parseFloat(targetCollection.installment_amount || 0);
      currentAmount = parseFloat(targetCollection.amount || 0);
      currentPaymentMethod = targetCollection.payment_method || 'CASH';
    } else {
      // 1b. Pre-collection request (member willing to pay excess before collection receipt exists)
      groupId = parseInt(rawGroupId, 10);
      memberId = parseInt(rawMemberId, 10);
      if (isNaN(groupId) || isNaN(memberId)) {
        return res.status(400).json({ success: false, message: 'Chit group and member are required for collection request.' });
      }

      const [gmRows] = await pool.query(
        `SELECT m.full_name as member_name, gm.ticket_number, g.group_name, g.group_code, g.installment_amount
         FROM group_memberships gm
         JOIN members m ON gm.member_id = m.id
         JOIN chit_groups g ON gm.group_id = g.id
         WHERE gm.group_id = ? AND gm.member_id = ? LIMIT 1`,
        [groupId, memberId]
      );
      if (gmRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Chit scheme enrollment not found.' });
      }
      memberName = gmRows[0].member_name;
      ticketNumber = gmRows[0].ticket_number || 'N/A';
      groupName = gmRows[0].group_name;
      groupCode = gmRows[0].group_code;
      installmentAmount = parseFloat(gmRows[0].installment_amount || 0);
      currentAmount = 0;
      currentPaymentMethod = 'CASH';
    }

    // 2. Check existing pending or approved requests
    let checkQuery = 'SELECT id, status, requested_amount FROM collection_edit_requests WHERE agent_id = ? AND group_id = ? AND member_id = ? AND status IN ("PENDING", "APPROVED")';
    const checkParams = [agentId, groupId, memberId];
    if (collectionId) {
      checkQuery += ' AND collection_id = ?';
      checkParams.push(collectionId);
    }
    checkQuery += ' LIMIT 1';

    const [existing] = await pool.query(checkQuery, checkParams);
    if (existing.length > 0) {
      const activeStatus = existing[0].status;
      if (activeStatus === 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Admin has already approved an edit for this subscriber. You can now update the collection directly.',
          isApproved: true,
          requestId: existing[0].id,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'A collection request for this subscriber is already pending Admin approval.',
        isPending: true,
        requestId: existing[0].id,
      });
    }

    // 3. Calculate Normal vs Advance Portions
    const normalDue = installmentAmount > 0 ? installmentAmount : currentAmount;
    let normalAmount = requestedAmount;
    let advanceAmount = 0;
    let requestType = 'AMOUNT_CORRECTION';

    if (installmentAmount > 0 && requestedAmount > normalDue) {
      normalAmount = normalDue;
      advanceAmount = requestedAmount - normalDue;
      requestType = 'ADVANCE_COLLECTION';
    }

    // 4. Create the edit request
    const [insertResult] = await pool.query(
      `INSERT INTO collection_edit_requests (
        collection_id, agent_id, group_id, member_id, current_amount, current_payment_method,
        requested_amount, requested_payment_method, normal_amount, advance_amount, reason, status, request_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      [
        collectionId,
        agentId,
        groupId,
        memberId,
        currentAmount,
        currentPaymentMethod,
        requestedAmount,
        requestedPaymentMethod,
        normalAmount,
        advanceAmount,
        reason,
        requestType,
      ]
    );

    const requestId = insertResult.insertId;

    // 5. Audit Log
    await recordAuditLog({
      userId: agentId,
      action: requestType === 'ADVANCE_COLLECTION' ? 'REQUEST_ADVANCE_COLLECTION' : 'REQUEST_COLLECTION_EDIT',
      resource: 'COLLECTION_EDIT_REQUESTS',
      details: {
        requestId,
        collectionId,
        currentAmount,
        requestedAmount,
        normalAmount,
        advanceAmount,
        requestType,
        reason,
      },
    });

    // 6. Notify All Admins Immediately
    const notifTitle = requestType === 'ADVANCE_COLLECTION'
      ? '⚡ Advance Collection Approval Requested'
      : '✏️ Collection Edit Request Submitted';
    const notifMsg = requestType === 'ADVANCE_COLLECTION'
      ? `${req.user.full_name || 'Agent'} requested Advance/Excess collection approval for ${memberName} (#${ticketNumber}) in ${groupName}: Normal ₹${normalAmount.toLocaleString('en-IN')}, Advance ₹${advanceAmount.toLocaleString('en-IN')} (Total: ₹${requestedAmount.toLocaleString('en-IN')}). Reason: "${reason}".`
      : `${req.user.full_name || 'Agent'} requested to correct payment for ${memberName} (#${ticketNumber}) in ${groupName}: ₹${Number(currentAmount).toLocaleString('en-IN')} ➔ ₹${Number(requestedAmount).toLocaleString('en-IN')}. Reason: "${reason}".`;

    createNotification({
      targetRole: 'ADMIN',
      title: notifTitle,
      message: notifMsg,
      type: 'COLLECTION',
      link: '/admin/collection-edits',
    }).catch(() => {});

    broadcastSync({
      business: 'chitfund',
      entity: 'collection_edits',
      action: 'REQUEST',
      data: { requestId, collectionId, requestedAmount, normalAmount, advanceAmount, requestType },
    });

    res.status(201).json({
      success: true,
      message: requestType === 'ADVANCE_COLLECTION'
        ? `Advance collection request of ₹${requestedAmount.toLocaleString('en-IN')} (₹${advanceAmount.toLocaleString('en-IN')} Advance) submitted to Admin. Once approved, you can enter the collection.`
        : 'Edit request submitted to Admin successfully. Once approved, you will be able to edit this payment.',
      data: {
        requestId,
        collectionId,
        currentAmount,
        requestedAmount,
        normalAmount,
        advanceAmount,
        requestType,
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
      LEFT JOIN collections c ON cer.collection_id = c.id
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
         SUM(CASE WHEN status = 'APPLIED' THEN 1 ELSE 0 END) as appliedCount,
         SUM(CASE WHEN request_type = 'ADVANCE_COLLECTION' THEN 1 ELSE 0 END) as advanceCount
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
 * Automatically applies the requested correction/advance directly to the collection record
 * and member advance credit, eliminating the need for the agent to re-collect manually.
 */
export async function approveCollectionEditRequest(req, res, next) {
  try {
    await ensureCollectionEditTable();
    const requestId = parseInt(req.params.id, 10);
    const adminNotes = (req.body.admin_notes || '').trim();

    const [rows] = await pool.query(
      `SELECT cer.*, c.receipt_number, c.collection_date, m.full_name as member_name, g.group_name, g.installment_amount
       FROM collection_edit_requests cer
       LEFT JOIN collections c ON cer.collection_id = c.id
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

    const installmentAmt = parseFloat(request.installment_amount || 0);
    const newAmount = parseFloat(request.requested_amount);
    const newPaymentMethod = (request.requested_payment_method || 'CASH').toUpperCase();
    const normalPortion = installmentAmt > 0 ? Math.min(newAmount, installmentAmt) : newAmount;
    const advancePortion = Math.max(0, newAmount - normalPortion);

    let targetCollectionId = request.collection_id;
    let receiptNumber = request.receipt_number;

    if (targetCollectionId) {
      // 1a. Update existing collection record directly
      const updatedNotes = `Corrected to ₹${newAmount} with Admin Approval${advancePortion > 0 ? ` (Advance: ₹${advancePortion})` : ''}`;
      await pool.query(
        `UPDATE collections
         SET amount = ?,
             normal_amount = ?,
             advance_amount = ?,
             payment_method = ?,
             notes = ?
         WHERE id = ?`,
        [newAmount, normalPortion, advancePortion, newPaymentMethod, updatedNotes, targetCollectionId]
      );
    } else {
      // 1b. Insert new collection record if request was created prior to initial collection
      const todayIST = getTodayIST();
      const randDigits = Math.floor(1000 + Math.random() * 9000);
      receiptNumber = `REC-${todayIST.replace(/-/g, '')}-${randDigits}`;

      const [newColl] = await pool.query(
        `INSERT INTO collections (
          receipt_number, group_id, member_id, agent_id, amount, normal_amount, advance_amount,
          payment_method, collection_date, collection_time, notes, verification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIME(), ?, 'VERIFIED')`,
        [
          receiptNumber,
          request.group_id,
          request.member_id,
          request.agent_id,
          newAmount,
          normalPortion,
          advancePortion,
          newPaymentMethod,
          todayIST,
          `Collected with Admin Approval (Advance: ₹${advancePortion})`,
        ]
      );
      targetCollectionId = newColl.insertId;
    }

    // 2. If excess amount was approved, create or update Advance Credit
    if (advancePortion > 0) {
      await createAdvanceCredit(pool, {
        groupId: request.group_id,
        memberId: request.member_id,
        collectionId: targetCollectionId,
        advanceAmount: advancePortion,
        createdDate: request.collection_date || getTodayIST(),
      });
    }

    // 3. Mark request as APPLIED with timestamp
    await pool.query(
      `UPDATE collection_edit_requests
       SET status = 'APPLIED',
           admin_notes = ?,
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP,
           applied_at = CURRENT_TIMESTAMP,
           collection_id = COALESCE(collection_id, ?)
       WHERE id = ?`,
      [adminNotes || null, req.user.id, targetCollectionId, requestId]
    );

    // 4. Audit Log
    await recordAuditLog({
      userId: req.user.id,
      action: 'APPROVE_AND_APPLY_COLLECTION_EDIT',
      resource: 'COLLECTION_EDIT_REQUESTS',
      details: {
        requestId,
        collectionId: targetCollectionId,
        agentId: request.agent_id,
        newAmount,
        advancePortion,
        adminNotes,
      },
    });

    // 5. Notify agent that payment was updated automatically
    const notifMsg = `Admin approved your edit request for ${request.member_name}. Payment has been updated to ₹${Number(newAmount).toLocaleString('en-IN')}${advancePortion > 0 ? ` (₹${Number(advancePortion).toLocaleString('en-IN')} Advance for future days)` : ''} automatically.`;

    createNotification({
      targetUserId: request.agent_id,
      title: '✅ Payment Edit Approved & Applied',
      message: notifMsg,
      type: 'COLLECTION',
      link: '/agent/history',
    }).catch(() => {});

    // 6. Broadcast Real-time sync across Admin and Agent dashboards
    broadcastSync({
      business: 'chitfund',
      entity: 'collections',
      action: 'UPDATE',
      data: {
        collectionId: targetCollectionId,
        groupId: request.group_id,
        memberId: request.member_id,
        amount: newAmount,
        advanceAmount: advancePortion,
      },
    });

    broadcastSync({
      business: 'chitfund',
      entity: 'collection_edits',
      action: 'APPLY',
      data: { requestId, collectionId: targetCollectionId, agentId: request.agent_id, status: 'APPLIED' },
    });

    broadcastSync({
      business: 'chitfund',
      entity: 'groups',
      action: 'UPDATE',
      data: { groupId: request.group_id },
    });

    broadcastSync({
      business: 'chitfund',
      entity: 'day_closing',
      action: 'UPDATE',
      data: { date: request.collection_date || getTodayIST() },
    });

    res.status(200).json({
      success: true,
      message: 'Edit request approved and payment updated automatically.',
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
    const adminNotes = (req.body.admin_notes || '').trim();

    const [rows] = await pool.query(
      `SELECT cer.*, c.receipt_number, m.full_name as member_name, g.group_name
       FROM collection_edit_requests cer
       LEFT JOIN collections c ON cer.collection_id = c.id
       JOIN members m ON cer.member_id = m.id
       JOIN chit_groups g ON cer.group_id = g.id
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
      [adminNotes || null, req.user.id, requestId]
    );

    await recordAuditLog({
      userId: req.user.id,
      action: 'REJECT_COLLECTION_EDIT',
      resource: 'COLLECTION_EDIT_REQUESTS',
      details: { requestId, collectionId: request.collection_id, agentId: request.agent_id, adminNotes },
    });

    createNotification({
      targetUserId: request.agent_id,
      title: '❌ Collection Edit Request Rejected',
      message: `Admin declined your request for ${request.member_name}. Note: "${adminNotes || 'Declined by Admin'}".`,
      type: 'COLLECTION',
      link: '/agent/tasks',
    }).catch(() => {});

    broadcastSync({
      business: 'chitfund',
      entity: 'collection_edits',
      action: 'REJECT',
      data: { requestId, collectionId: request.collection_id, agentId: request.agent_id },
    });

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
    const rawCollId = req.params.id;
    const newAmount = parseFloat(req.body.amount);
    const newPaymentMethod = (req.body.payment_method || 'CASH').toUpperCase();
    const editNotes = (req.body.notes || '').trim();

    if (isNaN(newAmount) || newAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    // 1. Find APPROVED edit request
    let query = `
      SELECT cer.*, c.receipt_number, c.collection_date, m.full_name as member_name, g.group_name, g.installment_amount
      FROM collection_edit_requests cer
      LEFT JOIN collections c ON cer.collection_id = c.id
      JOIN members m ON cer.member_id = m.id
      JOIN chit_groups g ON cer.group_id = g.id
      WHERE cer.agent_id = ? AND cer.status = 'APPROVED'
    `;
    const params = [agentId];

    if (rawCollId && !isNaN(parseInt(rawCollId, 10)) && parseInt(rawCollId, 10) > 0) {
      query += ` AND (cer.collection_id = ? OR cer.id = ?)`;
      params.push(parseInt(rawCollId, 10), parseInt(rawCollId, 10));
    }
    query += ` ORDER BY cer.id DESC LIMIT 1`;

    const [requests] = await pool.query(query, params);

    if (requests.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'No approved edit request found for this payment. You can only edit a payment if Admin has approved an edit request for it.',
      });
    }

    const request = requests[0];
    const approvedMax = parseFloat(request.requested_amount);
    if (newAmount > approvedMax + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Entered amount (₹${newAmount.toLocaleString('en-IN')}) cannot exceed the Admin-approved amount (₹${approvedMax.toLocaleString('en-IN')}).`,
      });
    }

    const oldAmount = parseFloat(request.current_amount || 0);
    const installmentAmt = parseFloat(request.installment_amount || 0);

    // Calculate normal vs advance portions
    const normalPortion = installmentAmt > 0 ? Math.min(newAmount, installmentAmt) : newAmount;
    const advancePortion = Math.max(0, newAmount - normalPortion);

    let targetCollectionId = request.collection_id;
    let receiptNumber = request.receipt_number;

    if (targetCollectionId) {
      // 2a. Update existing collection record
      const updatedNotes = editNotes
        ? `${editNotes} (Corrected from ₹${oldAmount}${advancePortion > 0 ? `, Advance: ₹${advancePortion}` : ''})`
        : `Corrected from ₹${oldAmount} with Admin Approval${advancePortion > 0 ? ` (Advance: ₹${advancePortion})` : ''}`;

      await pool.query(
        `UPDATE collections
         SET amount = ?,
             normal_amount = ?,
             advance_amount = ?,
             payment_method = ?,
             notes = ?
         WHERE id = ? AND agent_id = ?`,
        [newAmount, normalPortion, advancePortion, newPaymentMethod, updatedNotes, targetCollectionId, agentId]
      );
    } else {
      // 2b. Insert new collection record for pre-approved collection
      const todayIST = getTodayIST();
      const randDigits = Math.floor(1000 + Math.random() * 9000);
      receiptNumber = `REC-${todayIST.replace(/-/g, '')}-${randDigits}`;

      const [newColl] = await pool.query(
        `INSERT INTO collections (
          receipt_number, group_id, member_id, agent_id, amount, normal_amount, advance_amount,
          payment_method, collection_date, collection_time, notes, verification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIME(), ?, 'VERIFIED')`,
        [
          receiptNumber,
          request.group_id,
          request.member_id,
          agentId,
          newAmount,
          normalPortion,
          advancePortion,
          newPaymentMethod,
          todayIST,
          editNotes || `Collected with Admin Advance Approval (Advance: ₹${advancePortion})`,
        ]
      );
      targetCollectionId = newColl.insertId;
      await pool.query('UPDATE collection_edit_requests SET collection_id = ? WHERE id = ?', [targetCollectionId, request.id]);
    }

    // 3. If excess/advance collected, record Advance Credit
    if (advancePortion > 0) {
      await createAdvanceCredit(pool, {
        groupId: request.group_id,
        memberId: request.member_id,
        collectionId: targetCollectionId,
        advanceAmount: advancePortion,
        createdDate: request.collection_date || getTodayIST(),
      });
    }

    // 4. Mark request as APPLIED (Locks the edit permission)
    await pool.query(
      `UPDATE collection_edit_requests
       SET status = 'APPLIED',
           applied_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [request.id]
    );

    // 5. Update tracking log
    try {
      await pool.query(
        `UPDATE agent_tracking_logs
         SET status = 'PAID', notes = CONCAT('Payment confirmed: ₹', ?, ?)
         WHERE group_id = ? AND member_id = ? AND tracking_date = ?`,
        [newAmount, advancePortion > 0 ? ` (Advance ₹${advancePortion})` : '', request.group_id, request.member_id, request.collection_date || getTodayIST()]
      );
    } catch (_) {}

    // 6. Audit Log
    await recordAuditLog({
      userId: agentId,
      action: 'APPLY_COLLECTION_EDIT',
      resource: 'COLLECTIONS',
      details: {
        collectionId: targetCollectionId,
        requestId: request.id,
        oldAmount,
        newAmount,
        normalPortion,
        advancePortion,
        newPaymentMethod,
      },
    });

    // 7. Notify Admin
    createNotification({
      targetRole: 'ADMIN',
      title: advancePortion > 0 ? '⚡ Advance Collection Entered & Confirmed' : '✏️ Collection Edit Applied by Agent',
      message: `${req.user.full_name} updated payment for ${request.member_name} (${request.group_name}): Total ₹${newAmount.toLocaleString('en-IN')}${advancePortion > 0 ? ` (Normal: ₹${normalPortion}, Advance: ₹${advancePortion})` : ''} via ${newPaymentMethod}. Receipt #${receiptNumber || targetCollectionId}.`,
      type: 'COLLECTION',
      link: '/admin/collection-edits',
    }).catch(() => {});

    broadcastSync({
      business: 'chitfund',
      entity: 'collections',
      action: 'UPDATE',
      data: { collectionId: targetCollectionId, amount: newAmount, paymentMethod: newPaymentMethod, advanceAmount: advancePortion },
    });
    broadcastSync({
      business: 'chitfund',
      entity: 'collection_edits',
      action: 'APPLY',
      data: { collectionId: targetCollectionId },
    });

    res.status(200).json({
      success: true,
      message: `Collection successfully confirmed at ₹${newAmount.toLocaleString('en-IN')}${advancePortion > 0 ? ` (₹${advancePortion.toLocaleString('en-IN')} Advance Credit created for future days)` : ''}. Edit access is now locked.`,
      data: {
        collectionId: targetCollectionId,
        amount: newAmount,
        normalAmount: normalPortion,
        advanceAmount: advancePortion,
        paymentMethod: newPaymentMethod,
        receiptNumber,
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
       LEFT JOIN collections c ON cer.collection_id = c.id
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
