/**
 * Utility for calculating real-life chit cycles and deadlines.
 * For monthly chits, the monthly cycle is anchored to the scheme's start_date (or creation date),
 * rather than hardcoding strictly to the 1st of every calendar month.
 */

export function formatYMD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the monthly cycle window, due date limit, and days remaining
 * based on the chit scheme's start_date (or creation date).
 *
 * Example: Chit created on May 5th -> Anchor day is 5.
 * - If today is Nov 1: Cycle is 2026-10-05 to 2026-11-05 (4 days remaining).
 * - If today is Nov 5: Cycle is 2026-10-05 to 2026-11-05 (0 days remaining - Deadline today!).
 * - If today is Nov 6: Cycle is 2026-11-05 to 2026-12-05 (29 days remaining).
 */
export function getMonthlyCycleInfo(startDateStr, refDateStr) {
  const ref = refDateStr ? new Date(refDateStr + (String(refDateStr).includes('T') ? '' : 'T00:00:00')) : new Date();
  const start = startDateStr ? new Date(startDateStr + (String(startDateStr).includes('T') ? '' : 'T00:00:00')) : new Date();
  const anchorDay = start.getDate() || 1;

  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();

  let cycleStart, cycleDue;

  if (d < anchorDay) {
    // Current cycle started in previous month, ends on anchorDay of current month
    const prevMonthLastDay = new Date(y, m, 0).getDate();
    const startDayClamped = Math.min(anchorDay, prevMonthLastDay);
    cycleStart = new Date(y, m - 1, startDayClamped);

    const curMonthLastDay = new Date(y, m + 1, 0).getDate();
    const dueDayClamped = Math.min(anchorDay, curMonthLastDay);
    cycleDue = new Date(y, m, dueDayClamped);
  } else if (d === anchorDay) {
    // Today is the limit / due date of the cycle that started on anchorDay of previous month
    const prevMonthLastDay = new Date(y, m, 0).getDate();
    const startDayClamped = Math.min(anchorDay, prevMonthLastDay);
    cycleStart = new Date(y, m - 1, startDayClamped);
    cycleDue = new Date(y, m, anchorDay);
  } else {
    // Today is after anchorDay: Current cycle started on anchorDay of this month, ends on anchorDay of next month
    const curMonthLastDay = new Date(y, m + 1, 0).getDate();
    const startDayClamped = Math.min(anchorDay, curMonthLastDay);
    cycleStart = new Date(y, m, startDayClamped);

    const nextMonthLastDay = new Date(y, m + 2, 0).getDate();
    const dueDayClamped = Math.min(anchorDay, nextMonthLastDay);
    cycleDue = new Date(y, m + 1, dueDayClamped);
  }

  // Set to midnight for accurate day difference
  ref.setHours(0, 0, 0, 0);
  const diffMs = cycleDue.getTime() - ref.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return {
    anchorDay,
    cycleStart: formatYMD(cycleStart),
    cycleDue: formatYMD(cycleDue),
    daysRemaining,
    isDeadlineToday: daysRemaining === 0,
    hasTimeRemaining: daysRemaining > 0,
    isOverdue: daysRemaining < 0,
    statusNotice: daysRemaining === 0
      ? `Cycle Deadline Today (${formatYMD(cycleDue)}) · Last day to complete collection`
      : (daysRemaining > 0
          ? `This month there is time to collect (Due: ${formatYMD(cycleDue)} · ${daysRemaining} days remaining) · No worry`
          : `Cycle Overdue (Deadline was ${formatYMD(cycleDue)}) · Not completed`),
  };
}

