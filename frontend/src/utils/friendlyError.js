/**
 * friendlyError.js
 * 
 * Formats server responses, network errors, and technical exceptions into
 * clear, polite, understandable messages suitable for Chit Fund Admins and Field Agents.
 */

export function getFriendlyErrorMessage(error, defaultFallback = 'An unexpected issue occurred. Please try again.') {
  if (!error) return defaultFallback;

  // 1. If error is already a string
  if (typeof error === 'string') {
    return cleanMessageString(error);
  }

  // 2. Network connectivity / server down
  if (error.code === 'ERR_NETWORK' || error.message?.toLowerCase().includes('network error') || error.message?.toLowerCase().includes('failed to fetch')) {
    return 'Unable to reach the server. Please verify your internet connection or check if the server is online.';
  }

  // 3. Timeout
  if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
    return 'The connection timed out while waiting for a response. Please check your network and try again.';
  }

  // 4. Server returned a structured message in response payload
  const serverMsg = error.response?.data?.message || error.response?.data?.error;
  if (serverMsg && typeof serverMsg === 'string') {
    return cleanMessageString(serverMsg);
  }

  // 5. HTTP Status Code specific friendly messages
  const status = error.response?.status;
  if (status === 400) {
    return 'The entered details are incomplete or invalid. Please check the form and try again.';
  }
  if (status === 401) {
    return 'Incorrect username or password, or your session has expired. Please sign in again.';
  }
  if (status === 403) {
    return 'You do not have administrative permission to perform this action.';
  }
  if (status === 404) {
    return 'The requested record or chit fund information was not found.';
  }
  if (status === 409) {
    return 'This record or entry already exists in the system. Please verify details.';
  }
  if (status === 429) {
    return 'Too many attempts in a short period. Please wait a moment before trying again.';
  }
  if (status >= 500) {
    return 'The server encountered a temporary issue. Please refresh or try again shortly.';
  }

  // 6. Generic JS error message fallback
  if (error.message) {
    return cleanMessageString(error.message);
  }

  return defaultFallback;
}

/**
 * Filter out developer-oriented terms and stack messages
 */
function cleanMessageString(msg) {
  if (!msg) return 'An unexpected issue occurred. Please try again.';

  const lower = msg.toLowerCase();

  // MySQL specific errors
  if (lower.includes('er_dup_entry') || lower.includes('duplicate entry')) {
    if (lower.includes('username')) return 'This username is already taken. Please enter a different one.';
    if (lower.includes('phone') || lower.includes('mobile')) return 'This phone number is already registered.';
    return 'A record with these details already exists in the database.';
  }

  if (lower.includes('econnrefused') || lower.includes('protocol_connection_lost')) {
    return 'Database connection is temporarily unavailable. Please verify MySQL service status.';
  }

  if (lower.includes('foreign key constraint fails') || lower.includes('referenced row')) {
    return 'The selected group or member does not exist or has been modified. Please refresh the page.';
  }

  if (lower.includes('jwt expired') || lower.includes('tokenexpired')) {
    return 'Your login session has expired. Please sign in again to continue.';
  }

  if (lower.includes('jwt malformed') || lower.includes('invalid signature')) {
    return 'Your session token could not be verified. Please sign in again.';
  }

  if (lower.includes('request failed with status code 500')) {
    return 'A temporary server issue occurred. Please try again in a few moments.';
  }

  if (lower.includes('request failed with status code 401')) {
    return 'Invalid username or password. Please verify and try again.';
  }

  if (lower.includes('request failed with status code 403')) {
    return 'Access denied. You do not have permission for this action.';
  }

  if (lower.includes('typeerror') || lower.includes('referenceerror') || lower.includes('syntaxerror')) {
    return 'The application encountered an unexpected display issue. Please refresh the page.';
  }

  return msg;
}
