// Builds the Express app: middleware first, then routes, then the 404 and
// error handlers. The app is exported separately from server.js so the
// automated tests can use it without opening a real port.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { apiLimiter, authLimiter } from './middleware/rateLimits.js';
import { authRouter } from './routes/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { businessesRouter } from './routes/businesses.js';
import { servicesRouter } from './routes/services.js';
import { staffRouter } from './routes/staff.js';

export const app = express();

// The live API runs behind the host's proxy; this lets the rate limiter
// see each visitor's real IP address instead of the proxy's.
app.set('trust proxy', 1);

// Order matters: every request passes through these in this order.
app.use(helmet()); // secure HTTP headers
app.use(cors({ origin: config.clientOrigin })); // only our front end may call the API
app.use(express.json({ limit: '10kb' })); // parse JSON bodies, cap their size
app.use('/api', apiLimiter);
app.use(['/api/auth/login', '/api/auth/signup'], authLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes. Each router protects its own private routes with requireAuth
// and requireRole, so public and private routes can share a path prefix.
app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/businesses', businessesRouter);
app.use('/api', servicesRouter);
app.use('/api', staffRouter);

// No route matched.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Any error thrown in a route ends up here, so the server never crashes.
// Express 5 also forwards errors from async route handlers automatically.
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  if (status === 500) console.error(err);

  let message = err.message;
  if (err.type === 'entity.parse.failed') message = 'Invalid JSON body';
  if (status === 500) message = 'Something went wrong'; // never leak internals

  res.status(status).json({ error: message });
});
