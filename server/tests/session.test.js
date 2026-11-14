// The page-load session check. These cases never touch the database.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('GET /api/auth/session', () => {
  it('answers 200 { user: null } for a visitor without a session (no console error)', async () => {
    const res = await request(app).get('/api/auth/session');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });

  it('rejects a forged session cookie', async () => {
    const res = await request(app).get('/api/auth/session').set('Cookie', 'queueless_session=not-a-real-token');
    expect(res.status).toBe(401);
  });
});
