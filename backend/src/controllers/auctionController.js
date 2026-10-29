import crypto from 'crypto';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';

const auctionSchema = z.object({
  group_id: z.number().int().positive('Chit Group is required'),
  period_number: z.number().int().positive('Auction period/month number must be positive'),
  draw_number: z.number().int().min(1).max(2).default(1),
  auction_type: z.enum(['AUCTION', 'DOUBLE_CHIT_DRAW', 'LOTTERY_DRAW']).default('AUCTION'),
  winning_member_id: z.number().int().positive('Winning member is required'),
  winning_ticket_number: z.number().int().positive('Winning ticket number is required'),
  bid_discount: z.number().min(0, 'Bid discount cannot be negative'),
  auction_date: z.string().min(8, 'Auction date is required'),
  notes: z.string().optional().nullable(),
});

export async function listAuctions(req, res, next) {
  try {
    const { groupId, payoutStatus } = req.query;
    let query = `
      SELECT 
        a.id, a.group_id, a.period_number, a.draw_number, a.auction_type,
        a.winning_member_id, a.winning_ticket_number,
        a.bid_discount, a.foreman_commission, a.total_dividend, a.double_chit_reserve, a.dividend_per_member,
        a.net_payable_amount, a.next_installment_payable, a.auction_date,
        a.payout_status, a.payout_reference, a.notes, a.created_at,
        g.group_name, g.group_code, g.chit_type, g.frequency, g.route_category, g.total_pool_amount, g.installment_amount,
        m.full_name as winner_name, m.phone as winner_phone, m.member_code as winner_code,
        u.full_name as conducted_by_name
      FROM auctions a
      JOIN chit_groups g ON a.group_id = g.id
      JOIN members m ON a.winning_member_id = m.id
      JOIN users u ON a.conducted_by = u.id
    `;
    const params = [];
    const conditions = [];

    if (groupId) {
      conditions.push('a.group_id = ?');
      params.push(groupId);
    }
    if (payoutStatus) {
      conditions.push('a.payout_status = ?');
      params.push(payoutStatus.toUpperCase());
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.auction_date DESC, a.period_number DESC, a.draw_number DESC LIMIT 100';

    const [rows] = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function conductAuction(req, res, next) {
  try {
    const validated = auctionSchema.parse({
      ...req.body,
      group_id: parseInt(req.body.group_id ?? req.body.groupId, 10),
      period_number: parseInt(req.body.period_number ?? req.body.periodNumber, 10),
      draw_number: parseInt(req.body.draw_number ?? req.body.drawNumber ?? 1, 10),
      winning_member_id: parseInt(req.body.winning_member_id ?? req.body.winningMemberId, 10),
      winning_ticket_number: parseInt(req.body.winning_ticket_number ?? req.body.winningTicketNumber, 10),
      bid_discount: parseFloat(req.body.bid_discount ?? req.body.bid_discount_amount ?? req.body.bidDiscountAmount ?? 0),
      auction_date: req.body.auction_date ?? req.body.auctionDate ?? new Date().toISOString().slice(0, 10),
    });

    // 1. Fetch group details
    const [groupRows] = await pool.execute(
      'SELECT * FROM chit_groups WHERE id = ? LIMIT 1',
      [validated.group_id]
    );

    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chit Group not found.' });
    }

    const group = groupRows[0];

    // 2. Check if this auction cycle has already been conducted
    const [existingAuction] = await pool.execute(
      'SELECT id FROM auctions WHERE group_id = ? AND period_number = ? AND draw_number = ? LIMIT 1',
      [validated.group_id, validated.period_number, validated.draw_number]
    );

    if (existingAuction.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Auction for Month/Period #${validated.period_number} (Draw #${validated.draw_number}) has already been recorded for this group.`,
      });
    }

    // 3. Verify member belongs to group with the specified ticket and get details
    const [membershipRows] = await pool.execute(
      `SELECT gm.id, gm.is_prized, gm.prized_period, m.full_name, m.phone 
       FROM group_memberships gm
       JOIN members m ON gm.member_id = m.id
       WHERE gm.group_id = ? AND gm.member_id = ? AND gm.ticket_number = ? LIMIT 1`,
      [validated.group_id, validated.winning_member_id, validated.winning_ticket_number]
    );

    if (membershipRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Selected member does not hold ticket #${validated.winning_ticket_number} in this chit group.`,
      });
    }

    const winnerName = membershipRows[0]?.full_name || 'Subscriber';

    // 3a. Disqualification rule: Previous winners CANNOT and MUST NOT participate in any further auctions in this chit scheme
    const [previousWins] = await pool.execute(
      'SELECT period_number, draw_number FROM auctions WHERE group_id = ? AND winning_member_id = ? LIMIT 1',
      [validated.group_id, validated.winning_member_id]
    );

    if (previousWins.length > 0 || membershipRows[0].is_prized === 1) {
      const priorPeriod = previousWins[0]?.period_number || membershipRows[0].prized_period || 'previous';
      return res.status(400).json({
        success: false,
        message: `Subscriber has already won a prize in this chit scheme in Round #${priorPeriod} and is strictly disqualified from bidding or participating again in this chit scheme.`,
      });
    }

    // 4. Calculate ChitBase Financials according to business rules:
    // User Specification:
    // Admin gets 5% commission on the auction discount amount (e.g., if winner discount is ₹4,000, admin gets 5% = ₹200).
    // Remaining surplus (₹3,800) is handled based on chit mechanism:
    // - AUCTION_CHIT: Remaining surplus is divided equally among members (₹3,800 / totalMembers) and credited to passbook (reducing next installment).
    // - DOUBLE_CHIT: Remaining surplus is NOT divided (0 dividend, 0 passbook records); it is kept in that respective chitti pool reserve (doubleChitReserve) so eligible unprized members can win it in subsequent draws!
    const poolAmount = parseFloat(group.total_pool_amount);
    const bidDiscount = parseFloat(validated.bid_discount || 0);
    const commissionPercent = parseFloat(group.foreman_commission_percent || 5);

    // Admin Commission: 5% applied directly to the auction discount amount
    const foremanCommission = parseFloat(((bidDiscount * commissionPercent) / 100).toFixed(2));

    // Net prize money payable to winning subscriber = Total Pool Amount - Bid Discount
    const netPayableAmount = Math.max(0, parseFloat((poolAmount - bidDiscount).toFixed(2)));

    // Remaining surplus after 5% admin commission
    const netRemainingSurplus = Math.max(0, parseFloat((bidDiscount - foremanCommission).toFixed(2)));

    // Total members in group (denominator for dividend share)
    const totalMembers = parseInt(group.total_members_limit || 20, 10);

    // Strictly two types: AUCTION_CHIT vs DOUBLE_CHIT
    const isDoubleChit = group.chit_type === 'DOUBLE_CHIT' || validated.auction_type === 'DOUBLE_CHIT_DRAW';

    let finalDrawNumber = validated.draw_number;
    let finalAuctionType = validated.auction_type;
    let totalDividend = 0.00;
    let doubleChitReserve = 0.00;
    let dividendPerMember = 0.00;
    let nextInstallmentPayable = parseFloat(group.installment_amount);

    if (isDoubleChit) {
      // DOUBLE CHIT:
      // Do NOT divide the remaining amount among members! Total dividend = 0.
      // Retain full surplus in this chitti reserve pool so eligible unprized members can win it!
      doubleChitReserve = netRemainingSurplus;
      totalDividend = 0.00;
      dividendPerMember = 0.00;
      nextInstallmentPayable = parseFloat(group.installment_amount);
      if (!finalAuctionType || finalAuctionType === 'AUCTION') {
        finalAuctionType = 'DOUBLE_CHIT_DRAW';
      }
    } else {
      // AUCTION CHIT:
      // Single auction round per period (no Draw #1 / Draw #2 choice)
      finalDrawNumber = 1;
      finalAuctionType = 'AUCTION';
      doubleChitReserve = 0.00;
      totalDividend = netRemainingSurplus;
      dividendPerMember = totalMembers > 0 ? parseFloat((totalDividend / totalMembers).toFixed(2)) : 0.00;
      nextInstallmentPayable = Math.max(0, parseFloat((parseFloat(group.installment_amount) - dividendPerMember).toFixed(2)));
    }

    // 5. Insert into auctions table
    const [insertResult] = await pool.execute(
      `INSERT INTO auctions 
        (group_id, period_number, draw_number, auction_type, winning_member_id, winning_ticket_number,
         bid_discount, foreman_commission, total_dividend, double_chit_reserve, dividend_per_member,
         net_payable_amount, next_installment_payable, auction_date, payout_status, conducted_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        validated.group_id,
        validated.period_number,
        finalDrawNumber,
        finalAuctionType,
        validated.winning_member_id,
        validated.winning_ticket_number,
        validated.bid_discount,
        foremanCommission,
        totalDividend,
        doubleChitReserve,
        dividendPerMember,
        netPayableAmount,
        nextInstallmentPayable,
        validated.auction_date,
        req.user.id,
        validated.notes || null,
      ]
    );

    const auctionId = insertResult.insertId;

    // 6. Update winning member in group_memberships to PRIZED (cannot participate again)
    await pool.execute(
      'UPDATE group_memberships SET is_prized = 1, prized_period = ?, prized_auction_id = ? WHERE group_id = ? AND member_id = ?',
      [validated.period_number, auctionId, validated.group_id, validated.winning_member_id]
    );

    // 7. Persist distributed dividend into subscriber passbook (member_dividends table)
    // STRICT RULE: Record goes to passbook ONLY IF IT IS AN AUCTION CHIT with dividend > 0
    // Double Chit never creates passbook dividend records.
    if (!isDoubleChit && totalDividend > 0) {
      const [enrolledMembers] = await pool.execute(
        'SELECT member_id, ticket_number, is_prized FROM group_memberships WHERE group_id = ?',
        [validated.group_id]
      );

      for (const mem of enrolledMembers) {
        const isWinner = mem.member_id === validated.winning_member_id;
        const alreadyPrized = isWinner || mem.is_prized === 1;

        await pool.execute(
          `INSERT INTO member_dividends
            (auction_id, group_id, member_id, ticket_number, period_number, draw_number,
             dividend_amount, net_installment_due, credited_date, is_prized, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREDITED', ?)
           ON DUPLICATE KEY UPDATE 
             dividend_amount = VALUES(dividend_amount),
             net_installment_due = VALUES(net_installment_due),
             is_prized = VALUES(is_prized)`,
          [
            auctionId,
            validated.group_id,
            mem.member_id,
            mem.ticket_number,
            validated.period_number,
            finalDrawNumber,
            dividendPerMember,
            nextInstallmentPayable,
            validated.auction_date,
            alreadyPrized ? 1 : 0,
            isWinner ? 'Prize Winner in this Round' : 'Subscriber Dividend Credited Equally',
          ]
        );
      }
    }

    // 8. Generate payout voucher record for the winning member
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const payoutNumber = `PAY-${dateStr}-${randSuffix}`;

    await pool.execute(
      `INSERT INTO payouts 
        (payout_number, group_id, member_id, period_number, gross_chit_amount, bid_discount, net_payable_amount, payout_date, payment_method, approved_by, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NEFT_RTGS', ?, 'PENDING_APPROVAL', ?)`,
      [
        payoutNumber,
        validated.group_id,
        validated.winning_member_id,
        validated.period_number,
        group.total_pool_amount,
        validated.bid_discount,
        netPayableAmount,
        validated.auction_date,
        req.user.id,
        `Auction Month ${validated.period_number} Draw ${finalDrawNumber} (${finalAuctionType})`,
      ]
    );

    await recordAuditLog({
      userId: req.user.id,
      action: 'CONDUCT_AUCTION',
      resource: 'AUCTIONS',
      details: {
        auctionId,
        groupId: validated.group_id,
        period: validated.period_number,
        draw: finalDrawNumber,
        type: finalAuctionType,
        winnerId: validated.winning_member_id,
        netPayable: netPayableAmount,
        foremanCommission,
        dividendPerMember,
        doubleChitReserve,
      },
    });

    await createNotification({
      targetRole: 'ALL',
      title: `🏆 Auction Won: ${group.group_name || group.name || 'Chit Scheme'}`,
      message: `Winner: ${winnerName} · Prize: ₹${Number(netPayableAmount).toLocaleString('en-IN')}${dividendPerMember > 0 ? ` · Dividend: ₹${dividendPerMember}/member (Credited to Passbook)` : ` · Surplus: ₹${doubleChitReserve.toLocaleString('en-IN')} retained in Chit Pool Reserve`}`,
      type: 'AUCTION',
      link: '/admin/auctions',
    });

    res.status(201).json({
      success: true,
      message: isDoubleChit
        ? `Double Chit Round #${validated.period_number} Draw #${finalDrawNumber} conducted successfully. 5% admin commission (₹${foremanCommission.toLocaleString('en-IN')}) taken, remaining surplus of ₹${doubleChitReserve.toLocaleString('en-IN')} retained in this chitti reserve pool for eligible unprized members.`
        : `Auction for Round #${validated.period_number} conducted successfully. 5% admin commission of ₹${foremanCommission.toLocaleString('en-IN')} deducted from auction discount, remaining ₹${totalDividend.toLocaleString('en-IN')} divided equally among all ${totalMembers} members (₹${dividendPerMember}/member) and credited to their passbooks.`,
      data: {
        auctionId,
        payoutNumber,
        netPayableAmount,
        foremanCommission,
        totalDividend,
        doubleChitReserve,
        dividendPerMember,
        nextInstallmentPayable,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Invalid auction input',
      });
    }
    next(error);
  }
}

export async function updateAuctionPayout(req, res, next) {
  try {
    const { id } = req.params;
    const { payout_status, payout_reference, payment_method } = req.body;

    if (!['PENDING', 'APPROVED', 'DISBURSED'].includes(payout_status)) {
      return res.status(400).json({ success: false, message: 'Invalid payout status.' });
    }

    await pool.execute(
      'UPDATE auctions SET payout_status = ?, payout_reference = ? WHERE id = ?',
      [payout_status, payout_reference || null, id]
    );

    await pool.execute(
      `UPDATE payouts p
       JOIN auctions a ON p.group_id = a.group_id AND p.period_number = a.period_number AND p.member_id = a.winning_member_id
       SET p.status = ?, p.payment_reference = ?, p.payment_method = COALESCE(?, p.payment_method)
       WHERE a.id = ?`,
      [
        payout_status === 'DISBURSED' ? 'DISBURSED' : (payout_status === 'APPROVED' ? 'APPROVED' : 'PENDING_APPROVAL'),
        payout_reference || null,
        payment_method || null,
        id,
      ]
    );

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_AUCTION_PAYOUT',
      resource: 'AUCTIONS',
      details: { auctionId: id, status: payout_status, reference: payout_reference },
    });

    res.status(200).json({
      success: true,
      message: `Auction prize disbursement status updated to ${payout_status}.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAuctionSummary(req, res, next) {
  try {
    const [[stats]] = await pool.execute(`
      SELECT 
        COUNT(id) as totalAuctionsCount,
        COALESCE(SUM(net_payable_amount), 0) as totalPrizeMoneyDisbursed,
        COALESCE(SUM(total_dividend), 0) as totalDividendsGenerated,
        COALESCE(SUM(double_chit_reserve), 0) as totalDoubleChitReserve,
        COALESCE(SUM(foreman_commission), 0) as totalForemanCommissionEarned,
        COALESCE(SUM(CASE WHEN payout_status = 'PENDING' THEN net_payable_amount ELSE 0 END), 0) as pendingPayoutAmount
      FROM auctions
    `);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSchemeAuctionBreakdown(req, res, next) {
  try {
    const { groupId } = req.params;

    // 1. Fetch group details
    const [groupRows] = await pool.execute(
      'SELECT * FROM chit_groups WHERE id = ? LIMIT 1',
      [groupId]
    );

    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chit Group not found.' });
    }

    const group = groupRows[0];

    // 2. Fetch all auctions conducted for this group
    const [auctions] = await pool.execute(
      `SELECT a.*, 
              m.full_name as winner_name, m.phone as winner_phone, m.member_code as winner_code,
              u.full_name as conducted_by_name
       FROM auctions a
       JOIN members m ON a.winning_member_id = m.id
       JOIN users u ON a.conducted_by = u.id
       WHERE a.group_id = ?
       ORDER BY a.period_number ASC, a.draw_number ASC`,
      [groupId]
    );

    // 3. Fetch all enrolled subscribers with prized status and individual dividend totals
    const [subscribers] = await pool.execute(
      `SELECT gm.id as membership_id, gm.ticket_number, gm.joined_date, gm.status,
              gm.is_prized, gm.prized_period, gm.prized_auction_id,
              m.id as member_id, m.member_code, m.full_name, m.phone, m.kyc_type, m.kyc_number, m.address,
              COALESCE(col.total_paid_in_group, 0) as total_paid_in_group,
              COALESCE(div_sum.total_dividend_credited, 0) as total_dividend_credited
       FROM group_memberships gm
       JOIN members m ON gm.member_id = m.id
       LEFT JOIN (
         SELECT member_id, group_id, SUM(amount) as total_paid_in_group
         FROM collections
         WHERE group_id = ? AND verification_status != 'CANCELLED'
         GROUP BY member_id, group_id
       ) col ON col.member_id = gm.member_id
       LEFT JOIN (
         SELECT member_id, group_id, SUM(dividend_amount) as total_dividend_credited
         FROM member_dividends
         WHERE group_id = ?
         GROUP BY member_id, group_id
       ) div_sum ON div_sum.member_id = gm.member_id
       WHERE gm.group_id = ?
       ORDER BY gm.ticket_number ASC`,
      [groupId, groupId, groupId]
    );

    // 4. Fetch all member_dividends records for this group
    const [dividendDistributions] = await pool.execute(
      `SELECT md.*, m.full_name as member_name, m.phone as member_phone
       FROM member_dividends md
       JOIN members m ON md.member_id = m.id
       WHERE md.group_id = ?
       ORDER BY md.period_number DESC, md.draw_number DESC, md.ticket_number ASC`,
      [groupId]
    );

    // 5. Aggregate Financial Metrics
    const totalPrizedCount = subscribers.filter((s) => s.is_prized === 1).length;
    const totalEligibleCount = subscribers.length - totalPrizedCount;

    const totalDividendsDistributed = auctions.reduce((acc, a) => acc + parseFloat(a.total_dividend || 0), 0);
    const totalDoubleChitReserve = auctions.reduce((acc, a) => acc + parseFloat(a.double_chit_reserve || 0), 0);
    const totalForemanCommissionEarned = auctions.reduce((acc, a) => acc + parseFloat(a.foreman_commission || 0), 0);
    const totalPrizeMoneyDisbursed = auctions.reduce((acc, a) => acc + parseFloat(a.net_payable_amount || 0), 0);

    const latestAuction = auctions.length > 0 ? auctions[auctions.length - 1] : null;
    const latestDividendPerMember = latestAuction ? parseFloat(latestAuction.dividend_per_member || 0) : 0;
    const currentInstallmentDue = latestAuction
      ? parseFloat(latestAuction.next_installment_payable || group.installment_amount)
      : parseFloat(group.installment_amount);

    res.status(200).json({
      success: true,
      data: {
        group,
        auctions,
        subscribers,
        dividendDistributions,
        totals: {
          totalPoolAmount: parseFloat(group.total_pool_amount),
          baseInstallmentAmount: parseFloat(group.installment_amount),
          totalMembersLimit: parseInt(group.total_members_limit || 20, 10),
          enrolledCount: subscribers.length,
          totalPrizedCount,
          totalEligibleCount,
          totalDividendsDistributed,
          totalDoubleChitReserve,
          totalForemanCommissionEarned,
          totalPrizeMoneyDisbursed,
          latestDividendPerMember,
          currentInstallmentDue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

