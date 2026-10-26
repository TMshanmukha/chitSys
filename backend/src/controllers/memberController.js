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
        COALESCE(SUM(c.amount), 0) as total_paid
      FROM members m
      LEFT JOIN group_memberships gm ON m.id = gm.member_id
      LEFT JOIN collections c ON m.id = c.member_id
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
    const { groupId, memberId, ticketNumber } = req.body;
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
