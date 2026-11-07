import crypto from 'crypto';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';
import { getTodayIST } from '../utils/dateUtils.js';

const draw2Schema = z.object({
  winning_member_id: z.number().int().positive('Winning member for Draw #2 is required'),
  winning_ticket_number: z.number().int().positive('Winning ticket number for Draw #2 is required'),
  pool_amount: z.number().min(0).optional().nullable(),
  bid_discount: z.number().min(0, 'Bid discount for Draw #2 cannot be negative').default(0),
  custom_commission_percent: z.number().min(0).max(100).optional().nullable(),
  custom_foreman_commission: z.number().min(0).optional().nullable(),
  custom_net_payable: z.number().min(0).optional().nullable(),
  custom_double_chit_reserve: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
}).optional().nullable();

const auctionSchema = z.object({
  group_id: z.number().int().positive('Chit Group is required'),
  period_number: z.number().int().positive('Auction period/month number must be positive'),
  draw_number: z.number().int().min(1).max(2).default(1),
  auction_type: z.enum(['AUCTION', 'DOUBLE_CHIT_DRAW', 'LOTTERY_DRAW']).default('AUCTION'),
  winning_member_id: z.number().int().positive('Winning member is required'),
  winning_ticket_number: z.number().int().positive('Winning ticket number is required'),
  bid_discount: z.number().min(0, 'Bid discount cannot be negative'),
  auction_date: z.string().min(8, 'Auction date is required'),
  pool_source: z.enum(['REGULAR', 'SAVED_RESERVE', 'REGULAR_PLUS_RESERVE']).optional().default('REGULAR'),
  custom_pool_amount: z.number().min(0).optional().nullable(),
  custom_commission_percent: z.number().min(0).max(100).optional().nullable(),
  custom_foreman_commission: z.number().min(0).optional().nullable(),
  custom_net_payable: z.number().min(0).optional().nullable(),
  custom_total_dividend: z.number().min(0).optional().nullable(),
  custom_dividend_per_member: z.number().min(0).optional().nullable(),
  custom_next_installment: z.number().min(0).optional().nullable(),
  custom_double_chit_reserve: z.number().min(0).optional().nullable(),
  conduct_draw2: z.boolean().optional().default(false),
  draw2: draw2Schema,
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
      pool_source: req.body.pool_source || 'REGULAR',
      custom_pool_amount: req.body.custom_pool_amount !== undefined && req.body.custom_pool_amount !== null && req.body.custom_pool_amount !== '' ? parseFloat(req.body.custom_pool_amount) : null,
      custom_commission_percent: req.body.custom_commission_percent !== undefined && req.body.custom_commission_percent !== null && req.body.custom_commission_percent !== '' ? parseFloat(req.body.custom_commission_percent) : null,
      custom_foreman_commission: req.body.custom_foreman_commission !== undefined && req.body.custom_foreman_commission !== null && req.body.custom_foreman_commission !== '' ? parseFloat(req.body.custom_foreman_commission) : null,
      custom_net_payable: req.body.custom_net_payable !== undefined && req.body.custom_net_payable !== null && req.body.custom_net_payable !== '' ? parseFloat(req.body.custom_net_payable) : null,
      custom_total_dividend: req.body.custom_total_dividend !== undefined && req.body.custom_total_dividend !== null && req.body.custom_total_dividend !== '' ? parseFloat(req.body.custom_total_dividend) : null,
      custom_dividend_per_member: req.body.custom_dividend_per_member !== undefined && req.body.custom_dividend_per_member !== null && req.body.custom_dividend_per_member !== '' ? parseFloat(req.body.custom_dividend_per_member) : null,
      custom_next_installment: req.body.custom_next_installment !== undefined && req.body.custom_next_installment !== null && req.body.custom_next_installment !== '' ? parseFloat(req.body.custom_next_installment) : null,
      custom_double_chit_reserve: req.body.custom_double_chit_reserve !== undefined && req.body.custom_double_chit_reserve !== null && req.body.custom_double_chit_reserve !== '' ? parseFloat(req.body.custom_double_chit_reserve) : null,
      conduct_draw2: Boolean(req.body.conduct_draw2),
      draw2: req.body.draw2 ? {
        winning_member_id: parseInt(req.body.draw2.winning_member_id ?? req.body.draw2.winningMemberId, 10),
        winning_ticket_number: parseInt(req.body.draw2.winning_ticket_number ?? req.body.draw2.winningTicketNumber, 10),
        pool_amount: req.body.draw2.pool_amount !== undefined && req.body.draw2.pool_amount !== null && req.body.draw2.pool_amount !== '' ? parseFloat(req.body.draw2.pool_amount) : null,
        bid_discount: parseFloat(req.body.draw2.bid_discount ?? 0),
        custom_commission_percent: req.body.draw2.custom_commission_percent !== undefined && req.body.draw2.custom_commission_percent !== null && req.body.draw2.custom_commission_percent !== '' ? parseFloat(req.body.draw2.custom_commission_percent) : null,
        custom_foreman_commission: req.body.draw2.custom_foreman_commission !== undefined && req.body.draw2.custom_foreman_commission !== null && req.body.draw2.custom_foreman_commission !== '' ? parseFloat(req.body.draw2.custom_foreman_commission) : null,
        custom_net_payable: req.body.draw2.custom_net_payable !== undefined && req.body.draw2.custom_net_payable !== null && req.body.draw2.custom_net_payable !== '' ? parseFloat(req.body.draw2.custom_net_payable) : null,
        custom_double_chit_reserve: req.body.draw2.custom_double_chit_reserve !== undefined && req.body.draw2.custom_double_chit_reserve !== null && req.body.draw2.custom_double_chit_reserve !== '' ? parseFloat(req.body.draw2.custom_double_chit_reserve) : null,
        notes: req.body.draw2.notes || null,
      } : null,
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

    // 3b. If conduct_draw2 is enabled, validate Draw #2 winner and rules upfront
    const isDoubleChit = group.chit_type === 'DOUBLE_CHIT' || validated.auction_type === 'DOUBLE_CHIT_DRAW';
    let draw2WinnerName = 'Subscriber 2';

    if (validated.conduct_draw2) {
      if (!isDoubleChit) {
        return res.status(400).json({
          success: false,
          message: 'Double Auction (Draw #2) is only available for Double Chit schemes.',
        });
      }

      if (!validated.draw2) {
        return res.status(400).json({
          success: false,
          message: 'Draw #2 details are required when conducting double auction.',
        });
      }

      if (validated.draw2.winning_member_id === validated.winning_member_id) {
        return res.status(400).json({
          success: false,
          message: 'Draw #2 winning subscriber must be different from Draw #1 winner. The same subscriber cannot win two prizes in the same round.',
        });
      }

      const [existingDraw2] = await pool.execute(
        'SELECT id FROM auctions WHERE group_id = ? AND period_number = ? AND draw_number = 2 LIMIT 1',
        [validated.group_id, validated.period_number]
      );

      if (existingDraw2.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Auction Draw #2 for Month/Period #${validated.period_number} has already been recorded for this group.`,
        });
      }

      const [draw2MembershipRows] = await pool.execute(
        `SELECT gm.id, gm.is_prized, gm.prized_period, m.full_name, m.phone 
         FROM group_memberships gm
         JOIN members m ON gm.member_id = m.id
         WHERE gm.group_id = ? AND gm.member_id = ? AND gm.ticket_number = ? LIMIT 1`,
        [validated.group_id, validated.draw2.winning_member_id, validated.draw2.winning_ticket_number]
      );

      if (draw2MembershipRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Selected Draw #2 member does not hold ticket #${validated.draw2.winning_ticket_number} in this chit group.`,
        });
      }

      if (draw2MembershipRows[0].is_prized === 1) {
        return res.status(400).json({
          success: false,
          message: `Subscriber ${draw2MembershipRows[0].full_name} has already won in Round #${draw2MembershipRows[0].prized_period || 'past'} and is strictly disqualified from winning Draw #2.`,
        });
      }

      const [draw2PreviousWins] = await pool.execute(
        'SELECT period_number, draw_number FROM auctions WHERE group_id = ? AND winning_member_id = ? LIMIT 1',
        [validated.group_id, validated.draw2.winning_member_id]
      );

      if (draw2PreviousWins.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Subscriber ${draw2MembershipRows[0].full_name} has already won in Round #${draw2PreviousWins[0].period_number} and is strictly disqualified from participating again.`,
        });
      }

      draw2WinnerName = draw2MembershipRows[0].full_name || 'Subscriber 2';
    }

    // 4. Calculate ChitBase Financials according to updated business rules:
    // Specification:
    // - Admin Commission is deducted from the WINNER'S PRIZE AMOUNT (Gross Winner Prize = Pool - Bid Discount),
    //   NOT from the entire chit pool amount.
    // - Admin has full authority to modify/override any commission, net prize, or dividend value in the auction form.
    // - In AUCTION CHIT: The winning bid discount is distributed as dividend among all members (credited to passbook).
    // - In DOUBLE CHIT: Admin gets commission from winner prize as usual. No dividend/member distribution (totalDividend = 0).
    //   The winning bid discount is saved in that chit's pool reserve (doubleChitReserve) so it can be auctioned in Draw #2.
    // - Option to auction the saved reserve: If auctioning saved reserve, effective pool amount is the specified reserve amount.
    const groupPoolAmount = parseFloat(group.total_pool_amount);

    let effectivePoolAmount = groupPoolAmount;
    // Fetch accumulated saved reserve for this scheme
    const [reserveRows] = await pool.execute(
      'SELECT COALESCE(SUM(double_chit_reserve), 0) as totalReserve FROM auctions WHERE group_id = ?',
      [validated.group_id]
    );
    const accumulatedReserve = parseFloat(reserveRows[0]?.totalReserve || 0);

    if (validated.custom_pool_amount && parseFloat(validated.custom_pool_amount) > 0) {
      effectivePoolAmount = parseFloat(validated.custom_pool_amount);
    } else if (validated.pool_source === 'SAVED_RESERVE' || validated.draw_number === 2) {
      // In Double Auction (Draw #2), only the reserved amount is used to auction
      effectivePoolAmount = accumulatedReserve;
    } else if (validated.pool_source === 'REGULAR_PLUS_RESERVE') {
      // Regular auction rule: regular pool + saved reserve
      effectivePoolAmount = groupPoolAmount + accumulatedReserve;
    } else if (isDoubleChit && validated.pool_source === 'SAVED_RESERVE' && validated.custom_pool_amount && parseFloat(validated.custom_pool_amount) > 0) {
      effectivePoolAmount = parseFloat(validated.custom_pool_amount);
    }

    // Requirement: For regular auction, the total pool amount must be fully collected in the scheme
    if (validated.pool_source !== 'SAVED_RESERVE' && validated.draw_number !== 2) {
      const [collSumRows] = await pool.execute(
        "SELECT COALESCE(SUM(amount), 0) as totalCollected FROM collections WHERE group_id = ? AND verification_status != 'CANCELLED'",
        [validated.group_id]
      );
      const actualCollected = parseFloat(collSumRows[0]?.totalCollected || 0);
      if (actualCollected < groupPoolAmount) {
        return res.status(400).json({
          success: false,
          message: `Total chit pool of ₹${groupPoolAmount.toLocaleString('en-IN')} must be fully collected before conducting the auction. Currently collected: ₹${actualCollected.toLocaleString('en-IN')} (Shortfall: ₹${(groupPoolAmount - actualCollected).toLocaleString('en-IN')}). Please record member collections or have Admin cover the pending dues first.`,
        });
      }
    }

    const bidDiscount = parseFloat(validated.bid_discount || 0);

    // Boundary checkings: Avoid mistyped numbers
    if (bidDiscount > effectivePoolAmount) {
      return res.status(400).json({
        success: false,
        message: `Winning bid discount (₹${bidDiscount.toLocaleString('en-IN')}) cannot exceed the auction pool amount (₹${effectivePoolAmount.toLocaleString('en-IN')}).`,
      });
    }

    if ((validated.pool_source === 'SAVED_RESERVE' || validated.draw_number === 2) && effectivePoolAmount > accumulatedReserve) {
      return res.status(400).json({
        success: false,
        message: `Double auction pool (₹${effectivePoolAmount.toLocaleString('en-IN')}) cannot exceed available saved reserve (₹${accumulatedReserve.toLocaleString('en-IN')}).`,
      });
    }

    // Gross Winner Prize = Effective Pool - Bid Discount (Prize before Admin commission deduction)
    const grossWinnerPrize = Math.max(0, parseFloat((effectivePoolAmount - bidDiscount).toFixed(2)));

    // Commission Percentage: Admin custom override or group standard setting
    const commissionPercent = validated.custom_commission_percent !== null && validated.custom_commission_percent !== undefined
      ? parseFloat(validated.custom_commission_percent)
      : parseFloat(group.foreman_commission_percent || 5);

    // Admin Commission: percentage of GROSS WINNER PRIZE (deducted from Winner Prize), with Admin override support
    const defaultForemanCommission = parseFloat(((grossWinnerPrize * commissionPercent) / 100).toFixed(2));
    const foremanCommission = validated.custom_foreman_commission !== null && validated.custom_foreman_commission !== undefined
      ? parseFloat(validated.custom_foreman_commission)
      : defaultForemanCommission;

    if (foremanCommission > grossWinnerPrize) {
      return res.status(400).json({
        success: false,
        message: `Admin commission (₹${foremanCommission.toLocaleString('en-IN')}) cannot exceed gross winner prize (₹${grossWinnerPrize.toLocaleString('en-IN')}).`,
      });
    }

    // Net prize money payable to winning subscriber = Gross Winner Prize - Admin Commission, with Admin override support
    const defaultNetPayable = Math.max(0, parseFloat((grossWinnerPrize - foremanCommission).toFixed(2)));
    const netPayableAmount = validated.custom_net_payable !== null && validated.custom_net_payable !== undefined
      ? parseFloat(validated.custom_net_payable)
      : defaultNetPayable;

    if (netPayableAmount > grossWinnerPrize) {
      return res.status(400).json({
        success: false,
        message: `Net payable prize (₹${netPayableAmount.toLocaleString('en-IN')}) cannot exceed gross winner prize (₹${grossWinnerPrize.toLocaleString('en-IN')}).`,
      });
    }

    // Total members in group (denominator for dividend share)
    const totalMembers = parseInt(group.total_members_limit || 20, 10);

    let finalDrawNumber = validated.draw_number;
    let finalAuctionType = validated.auction_type;
    let totalDividend = 0.00;
    let doubleChitReserve = 0.00;
    let dividendPerMember = 0.00;
    let nextInstallmentPayable = validated.custom_next_installment !== null && validated.custom_next_installment !== undefined
      ? parseFloat(validated.custom_next_installment)
      : parseFloat(group.installment_amount);

    if (isDoubleChit) {
      // DOUBLE CHIT:
      // No dividend distribution to members (totalDividend = 0, dividendPerMember = 0).
      // The bid amount is saved into this chit's pool reserve (doubleChitReserve) and can be auctioned again!
      doubleChitReserve = validated.custom_double_chit_reserve !== null && validated.custom_double_chit_reserve !== undefined
        ? parseFloat(validated.custom_double_chit_reserve)
        : bidDiscount;
      totalDividend = 0.00;
      dividendPerMember = 0.00;
      if (!finalAuctionType || finalAuctionType === 'AUCTION') {
        finalAuctionType = 'DOUBLE_CHIT_DRAW';
      }
    } else {
      // AUCTION CHIT:
      // Single auction round per period (no Draw #1 / Draw #2 choice)
      // Dividend per member comes directly from the bid discount (or Admin override)!
      finalDrawNumber = 1;
      finalAuctionType = 'AUCTION';
      doubleChitReserve = 0.00;
      totalDividend = validated.custom_total_dividend !== null && validated.custom_total_dividend !== undefined
        ? parseFloat(validated.custom_total_dividend)
        : bidDiscount;
      dividendPerMember = validated.custom_dividend_per_member !== null && validated.custom_dividend_per_member !== undefined
        ? parseFloat(validated.custom_dividend_per_member)
        : (totalMembers > 0 ? parseFloat((totalDividend / totalMembers).toFixed(2)) : 0.00);
      // CRITICAL BUSINESS RULE:
      // Always the next installment due is the full chit installment amount (e.g. ₹500 only) unless overridden.
      // Dividend is credited to the respective member, but NOT subtracted from the installment due.
    }

    // Draw #2 Financial Calculations (if double auction is enabled)
    let draw2PoolAmount = 0.00;
    let draw2BidDiscount = 0.00;
    let draw2GrossWinnerPrize = 0.00;
    let draw2CommPercent = commissionPercent;
    let draw2ForemanCommission = 0.00;
    let draw2NetPayableAmount = 0.00;
    let draw2DoubleChitReserve = 0.00;

    if (validated.conduct_draw2 && validated.draw2) {
      draw2PoolAmount = validated.draw2.pool_amount && parseFloat(validated.draw2.pool_amount) > 0
        ? parseFloat(validated.draw2.pool_amount)
        : bidDiscount; // Defaults to the reversing amount from Draw #1!
      draw2BidDiscount = parseFloat(validated.draw2.bid_discount || 0);
      draw2GrossWinnerPrize = Math.max(0, parseFloat((draw2PoolAmount - draw2BidDiscount).toFixed(2)));
      draw2CommPercent = validated.draw2.custom_commission_percent !== null && validated.draw2.custom_commission_percent !== undefined
        ? parseFloat(validated.draw2.custom_commission_percent)
        : commissionPercent;
      const defaultDraw2ForemanComm = parseFloat(((draw2GrossWinnerPrize * draw2CommPercent) / 100).toFixed(2));
      draw2ForemanCommission = validated.draw2.custom_foreman_commission !== null && validated.draw2.custom_foreman_commission !== undefined
        ? parseFloat(validated.draw2.custom_foreman_commission)
        : defaultDraw2ForemanComm;
      const defaultDraw2Net = Math.max(0, parseFloat((draw2GrossWinnerPrize - draw2ForemanCommission).toFixed(2)));
      draw2NetPayableAmount = validated.draw2.custom_net_payable !== null && validated.draw2.custom_net_payable !== undefined
        ? parseFloat(validated.draw2.custom_net_payable)
        : defaultDraw2Net;
      draw2DoubleChitReserve = validated.draw2.custom_double_chit_reserve !== null && validated.draw2.custom_double_chit_reserve !== undefined
        ? parseFloat(validated.draw2.custom_double_chit_reserve)
        : draw2BidDiscount;
    }

    // 5. Execute DB Inserts inside a transactional connection
    const connection = await pool.getConnection();
    let auctionId = null;
    let payoutNumber = null;
    let auctionId2 = null;
    let payoutNumber2 = null;

    try {
      await connection.beginTransaction();

      // 5a. Insert Draw #1 into auctions table
      const [insertResult] = await connection.execute(
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

      auctionId = insertResult.insertId;

      // 5b. Update Draw #1 winning member in group_memberships to PRIZED
      await connection.execute(
        'UPDATE group_memberships SET is_prized = 1, prized_period = ?, prized_auction_id = ? WHERE group_id = ? AND member_id = ?',
        [validated.period_number, auctionId, validated.group_id, validated.winning_member_id]
      );

      // 5b-2. AUTOMATIC PENDING AMOUNT TO ADMIN FOR AUCTION SHORTFALL
      // As per real-life chit fund workflow:
      // The auction proceeds up to the full chit max pool amount.
      // Any subscriber who has not fully paid their installment for this auction round
      // automatically has their shortfall added to Pending Amount owed to Admin.
      const expectedInstallment = parseFloat(chitGroup.installment_amount);
      const [allEnrolledMembers] = await connection.execute(
        `SELECT gm.member_id, gm.ticket_number,
                (
                  SELECT COALESCE(SUM(c.amount), 0)
                  FROM collections c
                  WHERE c.group_id = gm.group_id AND c.member_id = gm.member_id
                    AND c.verification_status != 'CANCELLED'
                    AND (
                      ( ? = 'DAILY' AND c.collection_date = ? )
                      OR
                      ( ? = 'MONTHLY' AND (
                          (YEAR(c.collection_date) = YEAR(?) AND MONTH(c.collection_date) = MONTH(?))
                          OR c.collection_date = ?
                        )
                      )
                    )
                ) as cycle_paid
         FROM group_memberships gm
         WHERE gm.group_id = ? AND gm.status = 'ACTIVE'`,
        [
          chitGroup.frequency,
          validated.auction_date,
          chitGroup.frequency,
          validated.auction_date,
          validated.auction_date,
          validated.auction_date,
          validated.group_id,
        ]
      );

      for (const mem of allEnrolledMembers) {
        const paidSoFar = parseFloat(mem.cycle_paid || 0);
        const shortfall = Math.max(0, expectedInstallment - paidSoFar);

        if (shortfall > 0) {
          const [existingAdv] = await connection.execute(
            `SELECT id, advance_amount FROM admin_member_advances 
             WHERE group_id = ? AND member_id = ? AND status = 'PENDING_RECOVERY' 
             ORDER BY id DESC LIMIT 1`,
            [validated.group_id, mem.member_id]
          );

          if (existingAdv.length > 0) {
            await connection.execute(
              `UPDATE admin_member_advances 
               SET advance_amount = advance_amount + ?,
                   advance_date = ?,
                   notes = CONCAT(COALESCE(notes, ''), ' | Round #${validated.period_number} deficit: ₹', ?)
               WHERE id = ?`,
              [shortfall, validated.auction_date, shortfall, existingAdv[0].id]
            );
          } else {
            await connection.execute(
              `INSERT INTO admin_member_advances
                (group_id, member_id, advance_amount, advance_date, cycle_period, status, recovered_amount, notes, created_by)
               VALUES (?, ?, ?, ?, ?, 'PENDING_RECOVERY', 0.00, ?, ?)`,
              [
                validated.group_id,
                mem.member_id,
                shortfall,
                validated.auction_date,
                `Round #${validated.period_number}`,
                `Round #${validated.period_number} auction shortfall deficit owed to Admin`,
                req.user.id,
              ]
            );
          }
        }
      }

      // 5c. Persist distributed dividend into subscriber passbook (member_dividends table) for Auction Chit
      if (!isDoubleChit && totalDividend > 0) {
        const [enrolledMembers] = await connection.execute(
          'SELECT member_id, ticket_number, is_prized FROM group_memberships WHERE group_id = ?',
          [validated.group_id]
        );

        for (const mem of enrolledMembers) {
          const isWinner = mem.member_id === validated.winning_member_id;
          const alreadyPrized = isWinner || mem.is_prized === 1;

          await connection.execute(
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

      // 5d. Generate payout voucher record for Draw #1
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      payoutNumber = `PAY-${dateStr}-${randSuffix}`;

      await connection.execute(
        `INSERT INTO payouts 
          (payout_number, group_id, member_id, period_number, gross_chit_amount, bid_discount, net_payable_amount, payout_date, payment_method, approved_by, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NEFT_RTGS', ?, 'PENDING_APPROVAL', ?)`,
        [
          payoutNumber,
          validated.group_id,
          validated.winning_member_id,
          validated.period_number,
          effectivePoolAmount,
          validated.bid_discount,
          netPayableAmount,
          validated.auction_date,
          req.user.id,
          `Auction Month ${validated.period_number} Draw ${finalDrawNumber} (${finalAuctionType})`,
        ]
      );

      // 5e. If conduct_draw2 is enabled, insert Draw #2 auction and payout voucher
      if (validated.conduct_draw2 && validated.draw2) {
        const [insertResult2] = await connection.execute(
          `INSERT INTO auctions 
            (group_id, period_number, draw_number, auction_type, winning_member_id, winning_ticket_number,
             bid_discount, foreman_commission, total_dividend, double_chit_reserve, dividend_per_member,
             net_payable_amount, next_installment_payable, auction_date, payout_status, conducted_by, notes)
           VALUES (?, ?, 2, 'DOUBLE_CHIT_DRAW', ?, ?, ?, ?, 0.00, ?, 0.00, ?, ?, ?, 'PENDING', ?, ?)`,
          [
            validated.group_id,
            validated.period_number,
            validated.draw2.winning_member_id,
            validated.draw2.winning_ticket_number,
            draw2BidDiscount,
            draw2ForemanCommission,
            draw2DoubleChitReserve,
            draw2NetPayableAmount,
            nextInstallmentPayable,
            validated.auction_date,
            req.user.id,
            validated.draw2.notes || `Double Auction Draw #2 for Reversing Amount (Period ${validated.period_number})`,
          ]
        );

        auctionId2 = insertResult2.insertId;

        // Update Draw #2 winning member in group_memberships to PRIZED
        await connection.execute(
          'UPDATE group_memberships SET is_prized = 1, prized_period = ?, prized_auction_id = ? WHERE group_id = ? AND member_id = ?',
          [validated.period_number, auctionId2, validated.group_id, validated.draw2.winning_member_id]
        );

        // Generate payout voucher for Draw #2
        const dateStr2 = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randSuffix2 = crypto.randomBytes(2).toString('hex').toUpperCase();
        payoutNumber2 = `PAY-${dateStr2}-${randSuffix2}`;

        await connection.execute(
          `INSERT INTO payouts 
            (payout_number, group_id, member_id, period_number, gross_chit_amount, bid_discount, net_payable_amount, payout_date, payment_method, approved_by, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NEFT_RTGS', ?, 'PENDING_APPROVAL', ?)`,
          [
            payoutNumber2,
            validated.group_id,
            validated.draw2.winning_member_id,
            validated.period_number,
            draw2PoolAmount,
            draw2BidDiscount,
            draw2NetPayableAmount,
            validated.auction_date,
            req.user.id,
            `Double Auction Month ${validated.period_number} Draw 2 (Reversing Pool)`,
          ]
        );
      }

      await connection.commit();
    } catch (txError) {
      await connection.rollback();
      throw txError;
    } finally {
      connection.release();
    }

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
        poolSource: validated.pool_source,
        effectivePoolAmount,
        grossWinnerPrize,
        winnerId: validated.winning_member_id,
        netPayable: netPayableAmount,
        foremanCommission,
        commissionPercent,
        dividendPerMember,
        doubleChitReserve,
        conductDraw2: validated.conduct_draw2,
        draw2: validated.conduct_draw2 ? {
          auctionId: auctionId2,
          winnerId: validated.draw2.winning_member_id,
          poolAmount: draw2PoolAmount,
          netPayable: draw2NetPayableAmount,
          foremanCommission: draw2ForemanCommission,
        } : null,
      },
    });

    await createNotification({
      targetRole: 'ALL',
      title: `🏆 Auction Won: ${group.group_name || group.name || 'Chit Scheme'}`,
      message: validated.conduct_draw2
        ? `Double Chit Round #${validated.period_number} Completed: Draw #1 won by ${winnerName} (Prize: ₹${Number(netPayableAmount).toLocaleString('en-IN')}) & Draw #2 (Reversing Pool) won by ${draw2WinnerName} (Prize: ₹${Number(draw2NetPayableAmount).toLocaleString('en-IN')}) · Total Admin Comm: ₹${(foremanCommission + draw2ForemanCommission).toLocaleString('en-IN')}`
        : `Winner: ${winnerName} · Prize: ₹${Number(netPayableAmount).toLocaleString('en-IN')} (Admin Comm: ₹${foremanCommission.toLocaleString('en-IN')} from Winner Prize)${dividendPerMember > 0 ? ` · Dividend: ₹${dividendPerMember}/member (from Bid Amount)` : ` · Saved Chit Reserve: ₹${doubleChitReserve.toLocaleString('en-IN')}`}`,
      type: 'AUCTION',
      link: '/admin/auctions',
    });

    res.status(201).json({
      success: true,
      message: validated.conduct_draw2
        ? `Double Chit Round #${validated.period_number} completed: Draw #1 won by ${winnerName} (Prize: ₹${Number(netPayableAmount).toLocaleString('en-IN')}) and Draw #2 (Reversing Amount Double Auction) won by ${draw2WinnerName} (Prize: ₹${Number(draw2NetPayableAmount).toLocaleString('en-IN')}) in a single session.`
        : isDoubleChit
          ? `Double Chit Round #${validated.period_number} Draw #${finalDrawNumber} conducted successfully. Admin commission of ₹${foremanCommission.toLocaleString('en-IN')} deducted from winner prize, and ₹${doubleChitReserve.toLocaleString('en-IN')} saved in this chit's pool reserve (available to auction again).`
          : `Auction for Round #${validated.period_number} conducted successfully. Admin commission of ₹${foremanCommission.toLocaleString('en-IN')} deducted from winner prize, and full bid discount of ₹${totalDividend.toLocaleString('en-IN')} distributed equally among all ${totalMembers} members (₹${dividendPerMember}/member) in passbook.`,
      data: {
        auctionId,
        payoutNumber,
        effectivePoolAmount,
        grossWinnerPrize,
        netPayableAmount,
        foremanCommission,
        commissionPercent,
        totalDividend,
        doubleChitReserve,
        dividendPerMember,
        nextInstallmentPayable,
        draw2: validated.conduct_draw2 ? {
          auctionId: auctionId2,
          payoutNumber: payoutNumber2,
          poolAmount: draw2PoolAmount,
          grossWinnerPrize: draw2GrossWinnerPrize,
          netPayableAmount: draw2NetPayableAmount,
          foremanCommission: draw2ForemanCommission,
          commissionPercent: draw2CommPercent,
          doubleChitReserve: draw2DoubleChitReserve,
          winningMemberId: validated.draw2.winning_member_id,
          winningTicketNumber: validated.draw2.winning_ticket_number,
          winnerName: draw2WinnerName,
        } : null,
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
    if (!groupId) {
      return res.status(400).json({ success: false, message: 'Scheme/Group ID is required.' });
    }

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

    const todayIST = getTodayIST();
    // 3. Fetch all enrolled subscribers with prized status, individual dividend totals, cycle payment, and admin advances
    const [subscribers] = await pool.execute(
      `SELECT gm.id as membership_id, gm.ticket_number, gm.joined_date, gm.status,
              gm.is_prized, gm.prized_period, gm.prized_auction_id,
              m.id as member_id, m.member_code, m.full_name, m.phone, m.kyc_type, m.kyc_number, m.address,
              COALESCE(col.total_paid_in_group, 0) as total_paid_in_group,
              COALESCE(div_sum.total_dividend_credited, 0) as total_dividend_credited,
              COALESCE(col_cycle.cycle_paid, 0) as cycle_paid,
              ama.id as active_advance_id,
              COALESCE(ama.advance_amount, 0) as active_advance_amount,
              ama.advance_date as active_advance_date,
              ama.notes as active_advance_notes
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
       LEFT JOIN (
         SELECT c.member_id, c.group_id, SUM(c.amount) as cycle_paid
         FROM collections c
         JOIN chit_groups g2 ON c.group_id = g2.id
         WHERE c.group_id = ? AND c.verification_status != 'CANCELLED'
           AND (
             (g2.frequency = 'DAILY' AND c.collection_date = '${todayIST}')
             OR
             (g2.frequency = 'MONTHLY' AND c.collection_date >= DATE_SUB('${todayIST}', INTERVAL 30 DAY))
           )
         GROUP BY c.member_id, c.group_id
       ) col_cycle ON col_cycle.member_id = gm.member_id
       LEFT JOIN (
         SELECT group_id, member_id, MAX(id) as id, COALESCE(SUM(advance_amount), 0) as advance_amount, MAX(advance_date) as advance_date, GROUP_CONCAT(notes SEPARATOR ' | ') as notes
         FROM admin_member_advances
         WHERE group_id = ? AND status = 'PENDING_RECOVERY'
         GROUP BY group_id, member_id
       ) ama ON ama.member_id = gm.member_id
       WHERE gm.group_id = ?
       ORDER BY gm.ticket_number ASC`,
      [groupId, groupId, groupId, groupId, groupId]
    );

    const baseInstallment = parseFloat(group.installment_amount);
    const poolAmount = parseFloat(group.total_pool_amount || (baseInstallment * (group.duration_periods || 20)));

    const enrichedSubscribers = subscribers.map((sub) => {
      const paidInCycle = parseFloat(sub.cycle_paid || 0);
      const totalPaidInGroup = parseFloat(sub.total_paid_in_group || 0);
      const hasAdvance = Boolean(sub.active_advance_id);
      const advanceAmount = hasAdvance ? parseFloat(sub.active_advance_amount || 0) : 0;
      const isPrized = sub.is_prized === 1;

      let paymentStatus = 'PAID';
      let pendingAmount = 0;

      if (hasAdvance) {
        paymentStatus = 'ADMIN_COVERED';
        pendingAmount = advanceAmount;
      } else if (paidInCycle < baseInstallment) {
        paymentStatus = paidInCycle > 0 ? 'PARTIAL' : 'NOT_PAID';
        pendingAmount = Math.max(0, baseInstallment - paidInCycle);
      }

      // ChitFund Pro Scheme Liability & Pending Calculation:
      // When a member wins an auction and lifts prize money (m1 in month 1, m2 in month 2, m3 in month 3...):
      // The pending amount to complete the chit scheme is: Total Chit Value - Total Paid To Date!
      // Example:
      // - Month 1: Winner m1 lifts 1,00,000, paid 20,000 -> Pending Amount = 80,000
      // - Month 2: Winner m2 lifts 1,00,000, paid 40,000 -> Pending Amount = 60,000
      // - Month 3: Winner m3 lifts 1,00,000, paid 60,000 -> Pending Amount = 40,000
      // If member has NOT won/lifted prize (unprized contributor):
      // Pending liability = 0; Accumulated savings = totalPaidInGroup (giving amount * rounds paid).
      const schemeTotalLiability = isPrized ? poolAmount : 0;
      const schemePendingBalance = isPrized ? Math.max(0, poolAmount - totalPaidInGroup) : 0;
      const accumulatedSavings = !isPrized ? totalPaidInGroup : 0;

      return {
        ...sub,
        base_installment: baseInstallment,
        cycle_paid: paidInCycle,
        pending_amount: pendingAmount,
        total_paid_in_group: totalPaidInGroup,
        scheme_total_liability: schemeTotalLiability,
        scheme_pending_balance: schemePendingBalance,
        accumulated_savings: accumulatedSavings,
        is_prized: isPrized,
        is_admin_covered: hasAdvance,
        advance_id: sub.active_advance_id || null,
        advance_amount: advanceAmount,
        advance_date: sub.active_advance_date || null,
        advance_notes: sub.active_advance_notes || null,
        payment_status: paymentStatus,
      };
    });

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

    const totalCollected = subscribers.reduce((acc, s) => acc + parseFloat(s.total_paid_in_group || 0), 0);
    // poolAmount already declared above
    const isPoolFullyCollected = totalCollected >= poolAmount;
    const collectionShortfall = Math.max(0, poolAmount - totalCollected);
    const collectionPercentage = poolAmount > 0 ? Math.min(100, Math.round((totalCollected / poolAmount) * 100)) : 100;

    const latestAuction = auctions.length > 0 ? auctions[auctions.length - 1] : null;
    const latestDividendPerMember = latestAuction ? parseFloat(latestAuction.dividend_per_member || 0) : 0;
    // CRITICAL BUSINESS RULE: Always the installment due is the full chit installment amount (e.g. ₹500 only).
    // Dividends are credited to the subscriber passbook, never reducing the base installment due.
    const currentInstallmentDue = parseFloat(group.installment_amount);

    const unpaidCount = enrichedSubscribers.filter((s) => s.payment_status === 'NOT_PAID' || s.payment_status === 'PARTIAL').length;
    const unpaidAmount = enrichedSubscribers
      .filter((s) => s.payment_status === 'NOT_PAID' || s.payment_status === 'PARTIAL')
      .reduce((sum, s) => sum + s.pending_amount, 0);
    const adminCoveredCount = enrichedSubscribers.filter((s) => s.is_admin_covered).length;
    const adminCoveredAmount = enrichedSubscribers
      .filter((s) => s.is_admin_covered)
      .reduce((sum, s) => sum + s.advance_amount, 0);

    res.status(200).json({
      success: true,
      data: {
        group,
        auctions,
        subscribers: enrichedSubscribers,
        dividendDistributions,
        totals: {
          totalPoolAmount: parseFloat(group.total_pool_amount),
          baseInstallmentAmount: parseFloat(group.installment_amount),
          totalMembersLimit: parseInt(group.total_members_limit || 20, 10),
          enrolledCount: enrichedSubscribers.length,
          totalPrizedCount,
          totalEligibleCount,
          totalDividendsDistributed,
          totalDoubleChitReserve,
          totalForemanCommissionEarned,
          totalPrizeMoneyDisbursed,
          latestDividendPerMember,
          currentInstallmentDue,
          totalCollected: parseFloat(totalCollected.toFixed(2)),
          isPoolFullyCollected,
          collectionShortfall: parseFloat(collectionShortfall.toFixed(2)),
          collectionPercentage,
          unpaidCount,
          unpaidAmount,
          adminCoveredCount,
          adminCoveredAmount,
          totalPendingAmount: unpaidAmount + adminCoveredAmount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

