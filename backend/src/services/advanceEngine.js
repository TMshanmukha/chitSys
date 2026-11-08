import { pool } from '../config/db.js';
import { getTodayIST } from '../utils/dateUtils.js';

let tablesEnsured = false;

/**
 * Ensures all required advance collection tables & column extensions exist
 */
export async function ensureAdvanceTables() {
  if (tablesEnsured) return;
  try {
    // 1. Table: member_advance_credits
    await pool.query(`
      CREATE TABLE IF NOT EXISTS member_advance_credits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        member_id INT NOT NULL,
        collection_id INT NULL,
        advance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        adjusted_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        balance_remaining DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        created_date DATE NOT NULL,
        status ENUM('AVAILABLE', 'PARTIALLY_ADJUSTED', 'EXHAUSTED', 'CANCELLED') DEFAULT 'AVAILABLE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_member_group (member_id, group_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 2. Table: member_advance_adjustments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS member_advance_adjustments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        credit_id INT NOT NULL,
        group_id INT NOT NULL,
        member_id INT NOT NULL,
        adjustment_date DATE NOT NULL,
        amount_adjusted DECIMAL(12,2) NOT NULL,
        notes VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_member_date (member_id, group_id, adjustment_date),
        INDEX idx_credit (credit_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 3. Extend collections table columns
    const [collCols] = await pool.query('SHOW COLUMNS FROM collections');
    const collColNames = collCols.map((c) => c.Field);

    if (!collColNames.includes('normal_amount')) {
      await pool.query('ALTER TABLE collections ADD COLUMN normal_amount DECIMAL(12,2) DEFAULT NULL AFTER amount');
    }
    if (!collColNames.includes('advance_amount')) {
      await pool.query('ALTER TABLE collections ADD COLUMN advance_amount DECIMAL(12,2) DEFAULT 0.00 AFTER normal_amount');
    }
    if (!collColNames.includes('advance_adjusted_amount')) {
      await pool.query('ALTER TABLE collections ADD COLUMN advance_adjusted_amount DECIMAL(12,2) DEFAULT 0.00 AFTER advance_amount');
    }

    // 4. Extend collection_edit_requests table columns
    const [cerCols] = await pool.query('SHOW COLUMNS FROM collection_edit_requests');
    const cerColNames = cerCols.map((c) => c.Field);

    if (cerColNames.includes('collection_id')) {
      const collIdCol = cerCols.find((c) => c.Field === 'collection_id');
      if (collIdCol && collIdCol.Null === 'NO') {
        await pool.query('ALTER TABLE collection_edit_requests MODIFY collection_id INT NULL');
      }
    }
    if (!cerColNames.includes('advance_amount')) {
      await pool.query('ALTER TABLE collection_edit_requests ADD COLUMN advance_amount DECIMAL(12,2) DEFAULT 0.00 AFTER requested_amount');
    }
    if (!cerColNames.includes('normal_amount')) {
      await pool.query('ALTER TABLE collection_edit_requests ADD COLUMN normal_amount DECIMAL(12,2) DEFAULT 0.00 AFTER requested_amount');
    }
    if (!cerColNames.includes('request_type')) {
      await pool.query("ALTER TABLE collection_edit_requests ADD COLUMN request_type ENUM('AMOUNT_CORRECTION', 'ADVANCE_COLLECTION') DEFAULT 'AMOUNT_CORRECTION' AFTER status");
    }

    tablesEnsured = true;
  } catch (err) {
    console.error('ensureAdvanceTables error:', err);
  }
}

/**
 * Returns the total available advance balance for a member in a group up to or at a given date.
 */
export async function getMemberAdvanceBalance(memberId, groupId, connection = pool) {
  await ensureAdvanceTables();
  const [rows] = await connection.query(
    `SELECT COALESCE(SUM(balance_remaining), 0) as total_balance
     FROM member_advance_credits
     WHERE member_id = ? AND group_id = ? AND status IN ('AVAILABLE', 'PARTIALLY_ADJUSTED')`,
    [memberId, groupId]
  );
  return parseFloat(rows[0]?.total_balance || 0);
}

/**
 * Get map of all members' available advance balance in a group
 */
export async function getGroupAdvanceBalances(groupId, connection = pool) {
  await ensureAdvanceTables();
  const [rows] = await connection.query(
    `SELECT member_id, COALESCE(SUM(balance_remaining), 0) as balance
     FROM member_advance_credits
     WHERE group_id = ? AND status IN ('AVAILABLE', 'PARTIALLY_ADJUSTED')
     GROUP BY member_id`,
    [groupId]
  );
  const map = new Map();
  for (const r of rows) {
    map.set(Number(r.member_id), parseFloat(r.balance || 0));
  }
  return map;
}

/**
 * Get advance adjustments made for a specific date across members in a group
 */
export async function getGroupAdvanceAdjustmentsForDate(groupId, dateStr, connection = pool) {
  await ensureAdvanceTables();
  const [rows] = await connection.query(
    `SELECT member_id, COALESCE(SUM(amount_adjusted), 0) as adjusted_amount
     FROM member_advance_adjustments
     WHERE group_id = ? AND adjustment_date = ?
     GROUP BY member_id`,
    [groupId, dateStr]
  );
  const map = new Map();
  for (const r of rows) {
    map.set(Number(r.member_id), parseFloat(r.adjusted_amount || 0));
  }
  return map;
}

/**
 * Record an advance payment credit when excess collection is confirmed
 */
export async function createAdvanceCredit(connection, {
  groupId,
  memberId,
  collectionId,
  advanceAmount,
  createdDate = getTodayIST(),
}) {
  await ensureAdvanceTables();
  const parsedAmt = parseFloat(advanceAmount || 0);
  if (parsedAmt <= 0) return null;

  const [res] = await connection.query(
    `INSERT INTO member_advance_credits
      (group_id, member_id, collection_id, advance_amount, adjusted_amount, balance_remaining, created_date, status)
     VALUES (?, ?, ?, ?, 0.00, ?, ?, 'AVAILABLE')`,
    [groupId, memberId, collectionId, parsedAmt, parsedAmt, createdDate]
  );
  return res.insertId;
}

/**
 * Auto-adjusts advance balance to cover today's installment for a member.
 * Runs in idempotent fashion: if adjustment already recorded for this member & date, returns existing.
 */
export async function autoAdjustAdvanceForDate(connection, {
  groupId,
  memberId,
  dateStr = getTodayIST(),
  installmentAmount,
  alreadyCollectedToday = 0,
}) {
  await ensureAdvanceTables();
  const instAmt = parseFloat(installmentAmount || 0);
  const collToday = parseFloat(alreadyCollectedToday || 0);
  const needed = Math.max(0, instAmt - collToday);

  // Check if already adjusted for this date
  const [existingAdj] = await connection.query(
    `SELECT COALESCE(SUM(amount_adjusted), 0) as already_adjusted
     FROM member_advance_adjustments
     WHERE group_id = ? AND member_id = ? AND adjustment_date = ?`,
    [groupId, memberId, dateStr]
  );
  const alreadyAdjusted = parseFloat(existingAdj[0]?.already_adjusted || 0);

  // Remaining needed to settle today
  const remainingNeeded = Math.max(0, needed - alreadyAdjusted);
  if (remainingNeeded <= 0) {
    const curBal = await getMemberAdvanceBalance(memberId, groupId, connection);
    return {
      adjustedToday: alreadyAdjusted,
      remainingDueToday: 0,
      remainingAdvanceBalance: curBal,
      isFullyCovered: true,
    };
  }

  // Fetch available credits ordered FIFO (earliest first)
  const [credits] = await connection.query(
    `SELECT id, advance_amount, adjusted_amount, balance_remaining
     FROM member_advance_credits
     WHERE group_id = ? AND member_id = ? AND status IN ('AVAILABLE', 'PARTIALLY_ADJUSTED')
       AND created_date < ?
     ORDER BY created_date ASC, id ASC`,
    [groupId, memberId, dateStr]
  );

  let toAdjust = remainingNeeded;
  let newlyAdjusted = 0;

  for (const cred of credits) {
    if (toAdjust <= 0) break;
    const credBal = parseFloat(cred.balance_remaining || 0);
    if (credBal <= 0) continue;

    const useAmt = Math.min(credBal, toAdjust);
    const newBal = credBal - useAmt;
    const newAdj = parseFloat(cred.adjusted_amount || 0) + useAmt;
    const newStatus = newBal <= 0 ? 'EXHAUSTED' : 'PARTIALLY_ADJUSTED';

    await connection.query(
      `UPDATE member_advance_credits
       SET balance_remaining = ?, adjusted_amount = ?, status = ?
       WHERE id = ?`,
      [newBal, newAdj, newStatus, cred.id]
    );

    await connection.query(
      `INSERT INTO member_advance_adjustments
        (credit_id, group_id, member_id, adjustment_date, amount_adjusted, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cred.id, groupId, memberId, dateStr, useAmt, `Auto-adjusted from Advance Credit #${cred.id}`]
    );

    newlyAdjusted += useAmt;
    toAdjust -= useAmt;
  }

  const totalAdjustedToday = alreadyAdjusted + newlyAdjusted;
  const remainingDue = Math.max(0, instAmt - (collToday + totalAdjustedToday));
  const finalBal = await getMemberAdvanceBalance(memberId, groupId, connection);

  return {
    adjustedToday: totalAdjustedToday,
    remainingDueToday: remainingDue,
    remainingAdvanceBalance: finalBal,
    isFullyCovered: remainingDue <= 0,
  };
}

/**
 * Calculates updated days left and schedule info for a member in a chit group.
 */
export async function calculateMemberDaysSchedule(memberId, groupId, {
  durationPeriods = 50,
  installmentAmount = 1000,
}, connection = pool) {
  await ensureAdvanceTables();
  const instAmt = parseFloat(installmentAmount || 0);
  const dur = parseInt(durationPeriods, 10) || 50;

  if (instAmt <= 0) {
    return {
      durationPeriods: dur,
      daysCovered: 0,
      daysRemaining: dur,
      advanceBalance: 0,
      nextPayableAmount: 0,
    };
  }

  // 1. Total actual money collected from this member in this group
  const [colRow] = await connection.query(
    `SELECT COALESCE(SUM(amount), 0) as total_paid
     FROM collections
     WHERE member_id = ? AND group_id = ? AND verification_status != 'CANCELLED'`,
    [memberId, groupId]
  );
  const totalMoneyPaid = parseFloat(colRow[0]?.total_paid || 0);

  // 2. Current available advance balance
  const advanceBal = await getMemberAdvanceBalance(memberId, groupId, connection);

  // 3. Days fully covered = FLOOR(totalMoneyPaid / installmentAmount)
  const daysCovered = Math.floor(totalMoneyPaid / instAmt);
  const daysRemaining = Math.max(0, dur - daysCovered);

  // 4. Partial amount remaining in advance credit towards next day
  const partialAdvance = advanceBal % instAmt;
  const nextPayableAmount = advanceBal >= instAmt 
    ? 0 
    : (partialAdvance > 0 ? instAmt - partialAdvance : instAmt);

  return {
    durationPeriods: dur,
    totalMoneyPaid,
    daysCovered,
    daysRemaining,
    advanceBalance: advanceBal,
    nextPayableAmount,
    fullyCoveredFutureDays: Math.floor(advanceBal / instAmt),
  };
}

