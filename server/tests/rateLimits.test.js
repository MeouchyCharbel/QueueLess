// Rate limits must count each visitor separately, even though every browser
// request reaches the API through two proxies (Vercel, then Render).
// This test never touches the database.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

// What the API receives: the visitor's IP, then Vercel's IP, added by the proxies.
const VERCEL_IP = '76.76.21.9';
const via = (visitorIp) => ({ 'X-Forwarded-For': `${visitorIp}, ${VERCEL_IP}` });

function remaining(res) {
  return Number(/remaining=(\d+)/.exec(res.get('RateLimit'))[1]);
}

describe('rate limits behind the Vercel + Render proxies', () => {
  it('gives two visitors sharing a Vercel IP their own separate limits', async () => {
    const first = await request(app).get('/api/health').set(via('203.0.113.7'));
    const again = await request(app).get('/api/health').set(via('203.0.113.7'));
    const other = await request(app).get('/api/health').set(via('198.51.100.4'));

    expect(remaining(again)).toBe(remaining(first) - 1); // same visitor: same counter
    expect(remaining(other)).toBe(remaining(first)); // other visitor: own counter
  });

  it("does not lock one visitor out because of another visitor's failed logins", async () => {
    const attacker = via('192.0.2.50');
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').set(attacker).send({ email: 'bad', password: 'x' });
    }
    const blocked = await request(app).post('/api/auth/login').set(attacker).send({ email: 'bad', password: 'x' });
    const someoneElse = await request(app).post('/api/auth/login').set(via('192.0.2.99')).send({ email: 'bad', password: 'x' });

    expect(blocked.status).toBe(429);
    expect(someoneElse.status).toBe(400); // reaches validation, not the limiter
  });
});
