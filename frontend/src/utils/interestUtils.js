export const formatCurrency = (amt) => {
  const num = Number(amt) || 0;
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export const formatDate = (dateInput) => {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(dateInput);
  }
};

export const formatTime = (dateInput) => {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export { getServerDate, getServerYMD, getServerISO, ymd } from './dateUtils';

