// Login tokens (JWT). The server signs a token once at signup/login and
// verifies its signature on every protected request — nothing is stored.
// A JWT is signed, not encrypted: anyone can read the payload, so it only
// holds the user's id and role, never anything secret.
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, config.jwtSecret, {
    expiresIn: '1h', // a short life limits the damage if a token leaks
    algorithm: 'HS256',
  });
}

// Throws if the token was tampered with or has expired.
export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}
