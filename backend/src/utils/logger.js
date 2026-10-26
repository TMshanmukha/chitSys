const SENSITIVE_KEYS = new Set([
  'password',
  'pin',
  'password_hash',
  'token',
  'jwt',
  'secret',
  'authorization',
  'cookie',
  'set-cookie'
]);

function sanitize(obj, depth = 0) {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item, depth + 1));
  }

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object') {
      clean[key] = sanitize(val, depth + 1);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, Object.keys(meta).length ? JSON.stringify(sanitize(meta)) : '');
  },
  warn: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, Object.keys(meta).length ? JSON.stringify(sanitize(meta)) : '');
  },
  error: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, Object.keys(meta).length ? JSON.stringify(sanitize(meta)) : '');
  },
  audit: (action, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [AUDIT] [${action}]`, JSON.stringify(sanitize(meta)));
  }
};
