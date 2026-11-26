// Runs before every test file (see vitest.config.js).
// Loads server/.env if there is one, then fills in harmless placeholders for
// any setting that is still missing, so `npm test` also works on a fresh clone
// without a .env file. Real values (from .env, CI or the shell) always win.
// With the placeholder database the database tests are skipped: they only run
// against a database named queueless_test (see tests/appointments.test.js).
import 'dotenv/config';

process.env.DATABASE_URL ??= 'postgresql://placeholder:placeholder@localhost:5432/not_configured';
process.env.JWT_SECRET ??= 'test-only-placeholder-secret-never-used-by-the-real-server';
process.env.CLIENT_ORIGIN ??= 'http://localhost:5173';
