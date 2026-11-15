/**
 * notificationFormatter.js
 * Human-friendly, polite formatting for system and business notifications.
 * Removes raw database enum values, technical jargon, and coding text so normal users can read clearly.
 */

export function cleanNotificationText(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // Replace raw enum names with natural title-case terms
  cleaned = cleaned.replace(/\bDOUBLE_CHIT\b/g, 'Double Chit');
  cleaned = cleaned.replace(/\bAUCTION_CHIT\b/g, 'Auction Chit');
  cleaned = cleaned.replace(/\bDAILY_ROUTE\b/g, 'Daily Chit');
  cleaned = cleaned.replace(/\bMONTHLY_ROUTE\b/g, 'Monthly Chit');
  cleaned = cleaned.replace(/\bPENDING_RECOVERY\b/g, 'Pending Recovery');
  cleaned = cleaned.replace(/\bNEFT_RTGS\b/g, 'Bank Transfer');
  cleaned = cleaned.replace(/\bCASH\b/g, 'Cash');
  cleaned = cleaned.replace(/\bUPI\b/g, 'UPI');

  // Replace awkward "Group #123" with "Chit Scheme"
  cleaned = cleaned.replace(/\bGroup\s*#\d+\b/gi, 'Chit Scheme');

  // Replace technical parenthesis notes
  cleaned = cleaned.replace(/\s*\(Admin Comm:\s*₹[\d,.]+\s*from Winner Prize\)/gi, '');
  cleaned = cleaned.replace(/\s*\(from Bid Amount\)/gi, '');
  cleaned = cleaned.replace(/\s*\(Reversing Pool\)/gi, '');

  // Normalize spacing and separators
  cleaned = cleaned.replace(/\s*·\s*·/g, ' ·').replace(/\s{2,}/g, ' ').trim();

  return cleaned;
}

export function cleanNotificationTitle(title) {
  if (!title || typeof title !== 'string') return '';
  let cleaned = title;
  cleaned = cleaned.replace(/\bDOUBLE_CHIT\b/g, 'Double Chit');
  cleaned = cleaned.replace(/\bAUCTION_CHIT\b/g, 'Auction Chit');
  cleaned = cleaned.replace(/\bChit Scheme Initialized:\s*/gi, 'New Chit Scheme: ');
  return cleaned.trim();
}
