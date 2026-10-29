/**
 * Centralized Date Formatting Utilities
 * Standardized to DD/MM/YYYY across the ChitFund Pro application.
 */

/**
 * Formats any date input into DD/MM/YYYY
 * @param {string|Date|number|null|undefined} dateInput 
 * @returns {string} Formatted date like '27/10/2026'
 */
export function formatDate(dateInput) {
  if (!dateInput) return '-';

  try {
    // If it's a simple YYYY-MM-DD string, parse directly to avoid timezone shift
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats any date input into DD/MM/YYYY, HH:mm (or 12-hour format)
 * @param {string|Date|number|null|undefined} dateInput 
 * @param {boolean} includeSeconds 
 * @returns {string} Formatted date like '27/10/2026, 08:30 PM'
 */
export function formatDateTime(dateInput, includeSeconds = false) {
  if (!dateInput) return '-';

  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // '0' should be '12'
    const formattedHours = String(hours).padStart(2, '0');

    if (includeSeconds) {
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year}, ${formattedHours}:${minutes}:${seconds} ${ampm}`;
    }

    return `${day}/${month}/${year}, ${formattedHours}:${minutes} ${ampm}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats time only to HH:mm AM/PM
 * @param {string|Date|number|null|undefined} timeInput 
 * @returns {string} Formatted time like '08:30 PM'
 */
export function formatTime(timeInput) {
  if (!timeInput) return '-';

  try {
    // If it's already a time string like "14:35:00" or "02:30 PM"
    if (typeof timeInput === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(timeInput)) {
      const parts = timeInput.split(':');
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    }

    const d = new Date(timeInput);
    if (isNaN(d.getTime())) return String(timeInput);

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } catch {
    return String(timeInput);
  }
}
