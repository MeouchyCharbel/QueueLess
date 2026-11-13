// Signup, login and "who am I" routes, mounted at /api/auth.
import express from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../db.js';
import { signToken } from '../auth/token.js';
import { config, isAllowedClientOrigin } from '../config.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = express.Router();

const BCRYPT_COST = 12; // each guess takes time on purpose

const SignupInput = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  password: z.string().min(8, 'Use at least 8 characters').max(72), // bcrypt reads at most 72 bytes
  role: z.enum(['CUSTOMER', 'OWNER']),
});

const LoginInput = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  password: z.string().min(1, 'Enter your password').max(72),
});

// Only these fields ever leave the server — never passwordHash.
const PUBLIC_USER_FIELDS = { id: true, name: true, email: true, role: true };

const COOKIE_NAME = 'queueless_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.clientOrigin.startsWith('https://'),
  sameSite: 'lax',
  path: '/api',
};

// Never allow browsers/proxies to cache session details.
authRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

function setSession(res, token) {
  res.cookie(COOKIE_NAME, token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });
}


// POST /api/auth/signup -> 201 { token, user } | 400 | 409
authRouter.post('/signup', validate(SignupInput), async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: PUBLIC_USER_FIELDS,
    });
    const token = signToken(user);
    setSession(res, token);
    // Temporary bearer token compatibility for clients deployed before Fix #3.
    res.status(201).json({ token, user });
  } catch (err) {
    // Two signups with the same email at the same moment: the unique index wins.
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw err;
  }
});

// POST /api/auth/login -> 200 { token, user } | 400 | 401
authRouter.post('/login', validate(LoginInput), async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));

  // Same message for "no such email" and "wrong password", so an attacker
  // cannot find out which emails have accounts.
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { id, name, role } = user;
  const token = signToken(user);
  setSession(res, token);
  // Temporary bearer token compatibility for clients deployed before Fix #3.
  res.json({ token, user: { id, name, email, role } });
});

// POST /api/auth/logout: clear the HttpOnly browser cookie.
authRouter.post('/logout', (req, res) => {
  const origin = req.get('origin');
  if (origin && !isAllowedClientOrigin(origin)) {
    return res.status(403).json({ error: 'Invalid request origin' });
  }
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.status(204).end();
});

// GET /api/auth/me -> 200 user | 401   (protected: valid cookie or bearer token)
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: PUBLIC_USER_FIELDS,
  });
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  res.json(user);
});
