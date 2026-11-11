// Authentication: "who are you?" Runs before every private route.
// Expects the header  Authorization: Bearer <token>
// and sets req.userId and req.userRole for the routes after it.
import { verifyToken } from '../auth/token.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = verifyToken(token);
    req.userId = Number(payload.sub);
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
