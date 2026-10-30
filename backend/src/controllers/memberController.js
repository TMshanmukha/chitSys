import { pool } from '../config/db.js';
import { z } from 'zod';
import { recordAuditLog } from '../services/authService.js';

const memberSchema = z.object({
  member_code: z.string().optional(),
  full_name: z.string().min(2, 'Member name is required'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  alternate_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  kyc_type: z.string().optional().nullable(),
  kyc_number: z.string().optional().nullable(),
});

export async function listMembers(req, res, next) {
  try {
    const { search } = req.query;
    let query = `
      SELECT 
        m.id, m.member_code, m.full_name, m.phone, m.alternate_phone,
        m.address, m.kyc_type, m.kyc_number, m.is_active, m.created_at,
        COUNT(DISTINCT gm.id) as total_groups,
        COALESCE(SUM(c.amount), 0) as total_paid,
        COUNT(DISTINCT a.id) as auctions_won_count
      FROM members m
      LEFT JOIN group_memberships gm ON m.id = gm.member_id
      LEFT JOIN collections c ON m.id = c.member_id AND c.verification_status != 'CANCELLED'
      LEFT JOIN auctions a ON m.id = a.winning_member_id
    `;
    const params = [];

    if (search) {
      query += ' WHERE m.full_name LIKE ? OR m.phone LIKE ? OR m.member_code LIKE ?';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' GROUP BY m.id ORDER BY m.created_at DESC';

    const [rows] = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function createMember(req, res, next) {
  try {
    const validated = memberSchema.parse(req.body);

    // Auto-generate member code if not provided
    let memberCode = validated.member_code?.trim()?.toUpperCase();
    if (!memberCode) {
      const [[{ count }]] = await pool.execute('SELECT COUNT(*) as count FROM members');
      memberCode = `MEM-${String(count + 1).padStart(4, '0')}`;
    }

    // Check unique phone
    const [existing] = await pool.execute(
      'SELECT id FROM members WHERE phone = ? LIMIT 1',
      [validated.phone]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Member with phone number '${validated.phone}' already exists.`,
      });
    }

    const [insertResult] = await pool.execute(
      `INSERT INTO members (member_code, full_name, phone, alternate_phone, address, kyc_type, kyc_number, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        memberCode,
        validated.full_name,
        validated.phone,
        validated.alternate_phone || null,
        validated.address || null,
        validated.kyc_type || 'Aadhaar',
        validated.kyc_number || null,
        req.user.id,
      ]
    );

    await recordAuditLog({
      userId: req.user.id,
      action: 'REGISTER_MEMBER',
      resource: 'MEMBERS',
      details: { memberId: insertResult.insertId, code: memberCode, name: validated.full_name },
    });

    res.status(201).json({
      success: true,
      message: 'Member registered successfully.',
      memberId: insertResult.insertId,
      memberCode,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Invalid member data',
      });
    }
    next(error);
  }
}

export async function enrollMemberInGroup(req, res, next) {
  try {
    const groupId = req.body.groupId || req.body.group_id;
    const memberId = req.body.memberId || req.body.member_id;
    const ticketNumber = req.body.ticketNumber || req.body.ticket_number;

    if (!groupId || !memberId) {
      return res.status(400).json({ success: false, message: 'Group ID and Member ID are required.' });
    }

    // If ticket number not provided, auto-assign next available ticket number
    let ticket = ticketNumber;
    if (!ticket) {
      const [[{ maxTicket }]] = await pool.execute(
        'SELECT COALESCE(MAX(ticket_number), 0) as maxTicket FROM group_memberships WHERE group_id = ?',
        [groupId]
      );
      ticket = maxTicket + 1;
    }

    const [insertResult] = await pool.execute(
      `INSERT INTO group_memberships (group_id, member_id, ticket_number, joined_date, status)
       VALUES (?, ?, ?, CURDATE(), 'ACTIVE')`,
      [groupId, memberId, ticket]
    );

    // Also auto-add as a stop in route_stops if route stops exist
    const [[{ stopCount }]] = await pool.execute(
      'SELECT COUNT(*) as stopCount FROM route_stops WHERE group_id = ?',
      [groupId]
    );
    if (stopCount < 20) {
      const progress = stopCount / 20;
      const coordX = Math.round(80 + progress * 640);
      const coordY = Math.round(180 + Math.sin(progress * Math.PI * 2) * 80);

      // Get member name
      const [[mem]] = await pool.execute('SELECT full_name, address FROM members WHERE id = ?', [memberId]);
      const [[grp]] = await pool.execute('SELECT installment_amount FROM chit_groups WHERE id = ?', [groupId]);

      await pool.execute(
        `INSERT INTO route_stops (group_id, member_id, stop_order, stop_name, landmark, expected_amount, coord_x, coord_y)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE stop_name = VALUES(stop_name)`,
        [
          groupId,
          memberId,
          ticket,
          `${mem.full_name} (${mem.address || 'Member Residence'})`,
          `Stop #${ticket}`,
          grp.installment_amount,
          coordX,
          coordY,
        ]
      );
    }

    await recordAuditLog({
      userId: req.user.id,
      action: 'ENROLL_MEMBER_IN_GROUP',
      resource: 'GROUP_MEMBERSHIPS',
      details: { groupId, memberId, ticketNumber: ticket },
    });

    res.status(201).json({
      success: true,
      message: `Member enrolled with Ticket #${ticket}`,
      membershipId: insertResult.insertId,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'This ticket slot is already occupied or the member is already enrolled with this ticket.',
      });
    }
    next(error);
  }
}

export async function getMemberPassbook(req, res, next) {
  try {
    const { id } = req.params;

    // 1. Member profile
    const [memberRows] = await pool.execute(
      'SELECT * FROM members WHERE id = ? LIMIT 1',
      [id]
    );

    if (memberRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const member = memberRows[0];

    // 2. Enrolled groups
    const [enrolledGroups] = await pool.execute(
      `SELECT gm.id as membership_id, gm.ticket_number, gm.joined_date, gm.status as membership_status,
              g.id as group_id, g.group_code, g.group_name, g.chit_type, g.frequency, g.route_category,
              g.location_name, g.installment_amount, g.total_pool_amount, g.duration_periods
       FROM group_memberships gm
       JOIN chit_groups g ON gm.group_id = g.id
       WHERE gm.member_id = ?
       ORDER BY gm.joined_date DESC`,
      [id]
    );

    // 3. Collections Ledger (Payments Made)
    const [collections] = await pool.execute(
      `SELECT c.id, c.receipt_number, c.amount, c.payment_method, c.payment_reference,
              c.collection_date, c.collection_time, c.verification_status, c.notes,
              g.group_name, g.group_code, g.chit_type,
              u.full_name as agent_name
       FROM collections c
       JOIN chit_groups g ON c.group_id = g.id
       JOIN users u ON c.agent_id = u.id
       WHERE c.member_id = ? AND c.verification_status != 'CANCELLED'
       ORDER BY c.collection_date DESC, c.collection_time DESC`,
      [id]
    );

    // 4. Auctions Won / Prize Money Lifted
    const [auctionsWon] = await pool.execute(
      `SELECT a.*, g.group_name, g.group_code, g.total_pool_amount
       FROM auctions a
       JOIN chit_groups g ON a.group_id = g.id
       WHERE a.winning_member_id = ?
       ORDER BY a.auction_date DESC`,
      [id]
    );

    // 5. Member Individual Dividends Ledger (Saved per-member records)
    const [dividendsLedger] = await pool.execute(
      `SELECT md.id, md.auction_id, md.group_id, md.period_number, md.draw_number,
              md.dividend_amount, md.net_installment_due, md.credited_date, md.is_prized,
              md.status, md.notes,
              g.group_name, g.group_code, g.chit_type, g.frequency, g.installment_amount,
              a.bid_discount, a.foreman_commission
       FROM member_dividends md
       JOIN chit_groups g ON md.group_id = g.id
       JOIN auctions a ON md.auction_id = a.id
       WHERE md.member_id = ? AND g.chit_type = 'AUCTION_CHIT' AND md.dividend_amount > 0
       ORDER BY md.credited_date DESC, md.period_number DESC`,
      [id]
    );

    const totalDividendsEarned = dividendsLedger.reduce(
      (acc, d) => acc + parseFloat(d.dividend_amount || 0),
      0
    );

    // Totals
    const totalPaid = collections.reduce((acc, c) => acc + parseFloat(c.amount), 0);
    const totalPrizeMoneyWon = auctionsWon.reduce((acc, a) => acc + parseFloat(a.net_payable_amount), 0);

    res.status(200).json({
      success: true,
      data: {
        member,
        enrolledGroups,
        collections,
        auctionsWon,
        dividendsLedger,
        summary: {
          totalPaid,
          totalDividendsEarned,
          totalPrizeMoneyWon,
          totalReceiptsCount: collections.length,
          netPosition: totalPrizeMoneyWon - totalPaid,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
