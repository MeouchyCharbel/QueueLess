// Bearer tokens remain supported for API clients and existing tests.
// The browser uses an HttpOnly cookie sent through the same-origin API proxy.
import { verifyToken } from '../auth/token.js';
import { config } from '../config.js';

const COOKIE_NAME = 'queueless_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function cookieToken(rawCookie = '') {
  const entry = rawCookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return entry ? decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)) : null;
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, bearerToken] = header.split(' ');
  const hasBearer = scheme === 'Bearer' && Boolean(bearerToken);
  let token;

  try {
    token = hasBearer ? bearerToken : cookieToken(req.headers.cookie);
  } catch {
    return res.status(401).json({ error: 'Invalid session' });
  }

  if (!token) return res.status(401).json({ error: 'Missing session' });

  // For cookie-authenticated writes, reject requests from other origins.
  // SameSite=Lax is also used, but we check Origin as defense in depth.
  if (!hasBearer && !SAFE_METHODS.has(req.method) && req.get('origin') !== config.clientOrigin) {
    return res.status(403).json({ error: 'Invalid request origin' });
  }

  try {
    const payload = verifyToken(token);
    const id = Number(payload.sub);
    if (!Number.isSafeInteger(id) || id <= 0 || !['CUSTOMER', 'OWNER'].includes(payload.role)) {
      throw new Error('Invalid JWT payload');
    }
    req.userId = id;
    req.userRole = payload.role;
    res.set('Cache-Control', 'private, no-store');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}
