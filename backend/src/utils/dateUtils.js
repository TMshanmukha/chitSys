/**
 * Authoritative Indian Standard Time (IST, UTC+5:30) Date Utilities
 * Ensures all daily operations, schedules, and collections reset precisely at 12:00 AM midnight IST.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns a date string in YYYY-MM-DD format based on Indian Standard Time (IST).
 * @param {Date|string|number} [dateInput]
 * @returns {string} e.g. '2026-11-07'
 */
export function getTodayIST(dateInput) {
  if (dateInput) {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
    }
  }
  return new Date().toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
}

/**
 * Returns current time in HH:mm:ss format in Indian Standard Time (IST).
 * @param {Date|string|number} [dateInput]
 * @returns {string} e.g. '14:35:22'
 */
export function getCurrentTimeIST(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  return d.toLocaleTimeString('en-GB', {
    timeZone: IST_TIMEZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Returns current authoritative date and timestamp in IST.
 */
export function getNowIST() {
  const now = new Date();
  return {
    ymd: getTodayIST(now),
    time: getCurrentTimeIST(now),
    timestamp: now.getTime(),
    iso: now.toISOString(),
  };
}

