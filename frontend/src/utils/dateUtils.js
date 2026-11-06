/**
 * Centralized Date & Server Time Synchronization Utilities
 * Standardized to DD-MM-YYYY across the ChitFund Pro application.
 * All live "today", "calendar", and "now" timestamps follow authoritative server time.
 */

// Server Time Synchronization State
let serverTimeOffset = 0; // offset in milliseconds: (serverTime - clientLocalTime)
let serverTimeSynced = false;
const syncListeners = new Set();

/**
 * Update the client-to-server time offset using authoritative server time
 * @param {string|number|Date} serverTimeInput
 */
export function setServerTime(serverTimeInput) {
  if (!serverTimeInput) return;
  try {
    const serverMs = typeof serverTimeInput === 'number'
      ? serverTimeInput
      : new Date(serverTimeInput).getTime();
    if (!isNaN(serverMs) && serverMs > 0) {
      serverTimeOffset = serverMs - Date.now();
      serverTimeSynced = true;
      syncListeners.forEach((fn) => {
        try { fn(getServerDate()); } catch (_) { }
      });
    }
  } catch (e) {
    console.warn('Failed to parse server time:', e);
  }
}

/**
 * Subscribe to server time synchronization events
 * @param {(serverDate: Date) => void} listener
 * @returns {() => void} unsubscribe function
 */
export function onServerTimeSync(listener) {
  if (typeof listener !== 'function') return () => { };
  syncListeners.add(listener);
  if (serverTimeSynced) {
    try { listener(getServerDate()); } catch (_) { }
  }
  return () => syncListeners.delete(listener);
}

/**
 * Returns a Date object representing the authoritative current server time
 * (Accurate regardless of whether the user computer's clock is in the past, future, or different year)
 * @returns {Date}
 */
export function getServerDate() {
  return new Date(Date.now() + serverTimeOffset);
}

/**
 * Returns current server time in YYYY-MM-DD format
 * @returns {string} e.g. '2026-11-06'
 */
export function getServerYMD() {
  const d = getServerDate();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current server time in ISO string
 * @returns {string}
 */
export function getServerISO() {
  return getServerDate().toISOString();
}

/**
 * Returns whether server time has been successfully synchronized with the backend
 * @returns {boolean}
 */
export function isServerTimeSynced() {
  return serverTimeSynced;
}

/**
 * Returns the current client-server offset in milliseconds
 * @returns {number}
 */
export function getServerTimeOffset() {
  return serverTimeOffset;
}

/**
 * Convert any Date or Date string to YYYY-MM-DD.
 * Defaults to current server date if omitted.
 * @param {Date|string|number} [d]
 * @returns {string}
 */
export function ymd(d = getServerDate()) {
  if (!d) return getServerYMD();
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return getServerYMD();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Initialize periodic and immediate server time synchronization using the API client
 * @param {import('axios').AxiosInstance} api
 */
export function initServerTimeSync(api) {
  if (!api || typeof api.get !== 'function') return () => { };

  const fetchServerTime = async () => {
    try {
      const res = await api.get('/time', { _skipRetry: true });
      if (res?.data?.serverTime || res?.data?.timestamp) {
        setServerTime(res.data.serverTime || res.data.timestamp);
      }
    } catch (_) {
      // Fallback: check Date header if /time fails
    }
  };

  // Immediate sync on load
  fetchServerTime();

  // Re-sync every 5 minutes in background
  if (typeof window !== 'undefined') {
    const timer = setInterval(fetchServerTime, 5 * 60 * 1000);
    window.addEventListener('focus', fetchServerTime);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', fetchServerTime);
    };
  }
  return () => { };
}

/**
 * Formats any date input into DD-MM-YYYY
 * @param {string|Date|number|null|undefined} dateInput 
 * @returns {string} Formatted date like '27-10-2026'
 */
export function formatDate(dateInput) {
  if (!dateInput) return '-';

  try {
    // If it's a simple YYYY-MM-DD string, parse directly to avoid timezone shift
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-');
      return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats any date input into DD-MM-YYYY, HH:mm AM/PM (12-hour format)
 * @param {string|Date|number|null|undefined} dateInput 
 * @param {boolean} includeSeconds 
 * @returns {string} Formatted date like '27-10-2026, 08:30 PM'
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
      return `${day}-${month}-${year}, ${formattedHours}:${minutes}:${seconds} ${ampm}`;
    }

    return `${day}-${month}-${year}, ${formattedHours}:${minutes} ${ampm}`;
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
