export const formatCurrency = (amt) => {
  const num = Number(amt) || 0;
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export const formatDate = (dateInput) => {
  if (!dateInput) return '';
  try {
    // If it's a simple YYYY-MM-DD string, parse directly to avoid timezone shift
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(dateInput);
  }
};

export const formatTime = (timeInput) => {
  if (!timeInput) return '';
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
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
};

export { getServerDate, getServerYMD, getServerISO, ymd, onServerTimeSync } from './dateUtils';

