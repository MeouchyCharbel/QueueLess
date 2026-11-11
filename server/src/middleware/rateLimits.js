// Rate limits: slow down password guessing and scripts flooding the API.
// Over the limit -> 429 Too Many Requests.
import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60_000;

// Every API route: 300 requests per 15 minutes per IP address.
export const apiLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 300,
  message: { error: 'Too many requests. Try again later.' },
});

// Login and signup: 5 failed attempts per 15 minutes per IP address.
export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  skipSuccessfulRequests: true, // only failed attempts count
  message: { error: 'Too many attempts. Try again later.' },
});
