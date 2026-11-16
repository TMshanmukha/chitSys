import { pool, ensureHolidaysTable } from '../config/db.js';
import { z } from 'zod';
import { getTodayIST, isTuesday } from '../utils/dateUtils.js';
import { broadcastSync } from '../services/realtimeService.js';
import { recordAuditLog } from '../services/authService.js';

const holidaySchema = z.object({
  title: z.string().min(1, 'Holiday title or festival name is required'),
  description: z.string().optional().nullable(),
  holiday_type: z.string().optional().nullable().default('ADMIN_DECLARED'),
  start_date: z.string().min(4, 'Start date is required'),
  end_date: z.string().optional().nullable(),
});

/**
 * Check if a specific date (YYYY-MM-DD) is a company holiday (Tuesday or declared holiday)
 */
export async function isDateHoliday(dateStr, connection = pool) {
  const targetDate = dateStr ? String(dateStr).slice(0, 10) : getTodayIST();
  
  // 1. Every Tuesday is an authoritative weekly business holiday
  if (isTuesday(targetDate)) {
    return {
      isHoliday: true,
      title: 'Tuesday Weekly Off',
      isTuesday: true,
      holidayDate: targetDate,
    };
  }

  // 2. Check declared company holidays
  try {
    const [rows] = await connection.query(
      'SELECT id, holiday_date, title, holiday_type, description FROM company_holidays WHERE holiday_date = ? LIMIT 1',
      [targetDate]
    );
    if (rows && rows.length > 0) {
      return {
        isHoliday: true,
        title: rows[0].title,
        holiday_type: rows[0].holiday_type,
        isTuesday: false,
        holidayDate: targetDate,
        id: rows[0].id,
      };
    }
  } catch (_) {
    // If table not yet initialized, fail gracefully
  }

  return {
    isHoliday: false,
    title: null,
    isTuesday: false,
    holidayDate: targetDate,
  };
}

/**
 * GET /api/admin/holidays - List all declared holidays and current day status
 */
export async function listHolidays(req, res, next) {
  try {
    await ensureHolidaysTable();
    const todayIST = getTodayIST();
    const todayStatus = await isDateHoliday(todayIST);

    const [rows] = await pool.query(
      `SELECT id, holiday_date, title, holiday_type, description, created_at
       FROM company_holidays
       ORDER BY holiday_date ASC`
    );

    res.status(200).json({
      success: true,
      data: {
        holidays: rows || [],
        todayStatus,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/holidays - Declare a single holiday or range of holidays
 */
export async function declareHoliday(req, res, next) {
  try {
    await ensureHolidaysTable();
    const validated = holidaySchema.parse(req.body);

    const normalizeDate = (d) => {
      if (!d) return null;
      d = String(d).trim();
      if (d.includes('/')) {
        const parts = d.split('/');
        if (parts.length === 3) {
          if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      return d.slice(0, 10);
    };

    const startDate = normalizeDate(validated.start_date);
    const endDate = normalizeDate(validated.end_date || validated.start_date);

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Valid start date is required.' });
    }

    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date.',
      });
    }

    const cur = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    const datesToInsert = [];
    while (cur <= end) {
      datesToInsert.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const createdBy = req.user?.id || 1;
    const holidayType = (validated.holiday_type || 'ADMIN_DECLARED').toUpperCase();
    let insertedCount = 0;

    for (const d of datesToInsert) {
      await pool.query(
        `INSERT INTO company_holidays (holiday_date, title, holiday_type, description, created_by)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), holiday_type = VALUES(holiday_type), description = VALUES(description)`,
        [d, validated.title.trim(), holidayType, validated.description?.trim() || null, createdBy]
      );
      insertedCount++;
    }

    await recordAuditLog({
      userId: req.user?.id || 1,
      action: 'DECLARE_COMPANY_HOLIDAY',
      resource: 'HOLIDAYS',
      details: {
        title: validated.title,
        startDate,
        endDate,
        daysCount: insertedCount,
      },
    });

    broadcastSync({
      business: 'chitfund',
      entity: 'holidays',
      action: 'CREATE',
      data: { title: validated.title, startDate, endDate },
    });

    res.status(201).json({
      success: true,
      message: `Successfully declared ${insertedCount} holiday day(s): ${validated.title}.`,
      insertedCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Invalid holiday input',
      });
    }
    next(error);
  }
}

/**
 * DELETE /api/admin/holidays/:id - Remove a declared holiday
 */
export async function deleteHoliday(req, res, next) {
  try {
    await ensureHolidaysTable();
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT id, holiday_date, title FROM company_holidays WHERE id = ? LIMIT 1',
      [id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Holiday record not found.',
      });
    }

    await pool.query('DELETE FROM company_holidays WHERE id = ?', [id]);

    await recordAuditLog({
      userId: req.user?.id || 1,
      action: 'DELETE_COMPANY_HOLIDAY',
      resource: 'HOLIDAYS',
      details: { holidayId: id, details: existing[0] },
    });

    broadcastSync({
      business: 'chitfund',
      entity: 'holidays',
      action: 'DELETE',
      data: { id },
    });

    res.status(200).json({
      success: true,
      message: `Holiday '${existing[0].title}' (${existing[0].holiday_date}) removed successfully.`,
    });
  } catch (error) {
    next(error);
  }
}

