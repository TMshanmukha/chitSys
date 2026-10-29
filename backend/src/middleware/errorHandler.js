import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Maps technical, database, and system errors into clear, polite, human-understandable
 * messages suitable for Chit Fund Administrators and Collection Agents.
 */
function toFriendlyMessage(err) {
  if (!err) return 'An unexpected system error occurred. Please try again.';

  const msg = err.message || '';
  const code = err.code || '';

  // 1. MySQL Duplicate Entry
  if (code === 'ER_DUP_ENTRY' || msg.includes('ER_DUP_ENTRY') || msg.toLowerCase().includes('duplicate entry')) {
    if (msg.includes('username')) {
      return 'This username is already taken. Please choose a different username.';
    }
    if (msg.includes('phone') || msg.includes('mobile')) {
      return 'This mobile number is already registered for another account or subscriber.';
    }
    if (msg.includes('receipt_number') || msg.includes('receipt')) {
      return 'A collection receipt with this receipt number has already been recorded.';
    }
    return 'This record already exists in the system. Please verify the entered information and try again.';
  }

  // 2. MySQL Connection & Database Unreachable
  if (code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED') || code === 'PROTOCOL_CONNECTION_LOST') {
    return 'Database connection is currently unavailable. Please verify your MySQL database is running and try again.';
  }
  if (code === 'ER_ACCESS_DENIED_ERROR' || msg.includes('Access denied for user')) {
    return 'Database access authentication failed. Please verify your database credentials in the system settings.';
  }
  if (code === 'ER_BAD_DB_ERROR' || msg.includes('Unknown database')) {
    return 'The specified chit fund database could not be found. Please check database configuration.';
  }

  // 3. Foreign Key / Relational Integrity Errors
  if (code === 'ER_NO_REFERENCED_ROW_2' || msg.includes('foreign key constraint fails')) {
    return 'The requested chit group, member, or route could not be found. Please refresh the page and try again.';
  }
  if (code === 'ER_ROW_IS_REFERENCED_2' || msg.includes('cannot delete or update a parent row')) {
    return 'This item cannot be removed because it is linked to active subscriber records, collections, or auctions.';
  }

  // 4. Data Length / Format Errors
  if (code === 'ER_DATA_TOO_LONG') {
    return 'One of the entered fields exceeds the maximum allowed character limit. Please shorten the text.';
  }
  if (code === 'ER_BAD_NULL_ERROR') {
    return 'A required field was left empty. Please fill in all mandatory fields before submitting.';
  }

  // 5. JWT & Authentication Errors
  if (msg.includes('jwt expired') || msg.includes('TokenExpiredError')) {
    return 'Your login session has expired for security. Please sign in again to continue.';
  }
  if (msg.includes('invalid signature') || msg.includes('jwt malformed')) {
    return 'Your login session could not be verified. Please sign in again.';
  }

  // 6. Common Business Logic Errors that are already user-friendly
  if (
    msg.toLowerCase().includes('invalid credentials') ||
    msg.toLowerCase().includes('incorrect password') ||
    msg.toLowerCase().includes('account is deactivated') ||
    msg.toLowerCase().includes('not authorized') ||
    msg.toLowerCase().includes('already assigned') ||
    msg.toLowerCase().includes('please provide') ||
    msg.toLowerCase().includes('required')
  ) {
    return msg;
  }

  // 7. Generic Fallback: Avoid developer jargon (e.g. TypeError, ReferenceError, SQL syntax)
  const errName = err.name || '';
  if (
    errName === 'TypeError' ||
    errName === 'ReferenceError' ||
    errName === 'SyntaxError' ||
    msg.includes('TypeError') ||
    msg.includes('ReferenceError') ||
    msg.includes('SQL syntax') ||
    msg.includes('ER_BAD_FIELD_ERROR') ||
    msg.includes('Cannot read properties') ||
    msg.includes('is not a function')
  ) {
    return 'A technical issue occurred while processing your request. Please refresh the page or contact your system administrator.';
  }

  return msg || 'An unexpected issue occurred. Please check your connection and try again.';
}

export function errorHandler(err, req, res, next) {
  // Always log full technical details on the server for diagnostics
  logger.error('Server Request Error', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500);
  const friendlyMessage = toFriendlyMessage(err);

  const response = {
    success: false,
    message: friendlyMessage,
  };

  res.status(statusCode).json(response);
}

