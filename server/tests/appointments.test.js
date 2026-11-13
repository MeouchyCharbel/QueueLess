// Back-end test (Vitest + Supertest): the server must reject overlapping
// bookings for the same staff member — the core promise of QueueLess.
//
// Runs against the database in DATABASE_URL. It creates its own business,
// staff member and customers, and deletes all of them afterwards.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db.js';
import { signToken } from '../src/auth/token.js';
import { config } from '../src/config.js';
import { localDateOf, zonedDateTime } from '../src/lib/time.js';

const RUN = Date.now(); // makes this run's emails unique
const userIds = [];
let business, service, staff, aliceToken, bobToken, ownerToken;

// A date one week from now, so the times are always in the future.
const DAY = localDateOf(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
const at = (hours, minutes = 0) => zonedDateTime(DAY, hours * 60 + minutes).toISOString();

async function createUser(name, role) {
  const user = await prisma.user.create({
    data: { name, email: `${name}.${RUN}@test.local`, passwordHash: 'not-used', role },
  });
  userIds.push(user.id);
  return user;
}

function book(token, startAt) {
  return request(app)
    .post('/api/appointments')
    .set('Authorization', `Bearer ${token}`)
    .send({ businessId: business.id, serviceId: service.id, staffId: staff.id, startAt });
}

beforeAll(async () => {
  const owner = await createUser('owner', 'OWNER');
  ownerToken = signToken(owner);
  const category = await prisma.category.upsert({
    where: { name: 'Barbershop' },
    update: {},
    create: { name: 'Barbershop' },
  });
  business = await prisma.business.create({
    data: {
      ownerId: owner.id, categoryId: category.id, name: 'Test Barber',
      location: 'Beirut', address: 'Test St', phone: '123456', email: 'barber@test.local',
    },
  });
  service = await prisma.service.create({
    data: { businessId: business.id, name: 'Haircut', price: 15, durationMinutes: 30 },
  });
  staff = await prisma.staff.create({
    data: { businessId: business.id, name: 'Rami', staffServices: { create: { serviceId: service.id } } },
  });
  // Open every day 09:00-17:00, so the test date is always a working day.
  await prisma.workingHours.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      businessId: business.id, weekday, startTime: '09:00', endTime: '17:00',
    })),
  });

  aliceToken = signToken(await createUser('alice', 'CUSTOMER'));
  bobToken = signToken(await createUser('bob', 'CUSTOMER'));
});

afterAll(async () => {
  await prisma.appointment.deleteMany({ where: { customerId: { in: userIds } } });
  await prisma.business.deleteMany({ where: { ownerId: { in: userIds } } }); // cleans both fixtures
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe('POST /api/appointments — no double bookings', () => {
  it('books a free slot', async () => {
    const res = await book(aliceToken, at(10, 0));

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.endAt).toBe(at(10, 30)); // the server adds the 30-minute duration
  });

  it('rejects the same time for the same staff member', async () => {
    const res = await book(bobToken, at(10, 0));

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/not available/i);
  });

  it('rejects a booking that overlaps part of an existing one', async () => {
    const res = await book(bobToken, at(10, 15)); // 10:15-10:45 overlaps 10:00-10:30

    expect(res.status).toBe(409);
  });

  it('allows a booking that starts exactly when the previous one ends', async () => {
    const res = await book(bobToken, at(10, 30));

    expect(res.status).toBe(201);
  });

  it('lets only one of two simultaneous bookings for the same time win', async () => {
    const [first, second] = await Promise.all([book(aliceToken, at(14, 0)), book(bobToken, at(14, 0))]);

    // Both requests pass the availability check at the same moment; the
    // database exclusion constraint makes sure only one is saved.
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    const saved = await prisma.appointment.count({
      where: { staffId: staff.id, startAt: new Date(at(14, 0)) },
    });
    expect(saved).toBe(1);
  });
});

// An appointment cannot end up in two different final states. The API must
// handle competing updates, not only competing new bookings.
describe('PATCH /api/appointments/:id — conflicting changes', () => {
  it('accepts at most one competing cancellation/completion', async () => {
    const created = await book(aliceToken, at(15, 0));
    expect(created.status).toBe(201);
    const id = created.body.id;
    const url = `/api/appointments/${id}`;
    const ownerChange = (status) => request(app)
      .patch(url)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status });

    const confirmed = await ownerChange('CONFIRMED');
    expect(confirmed.status).toBe(200);

    const [first, second] = await Promise.all([
      ownerChange('COMPLETED'),
      ownerChange('CANCELLED'),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);

    const saved = await prisma.appointment.findUnique({ where: { id } });
    expect(['CANCELLED', 'COMPLETED']).toContain(saved.status);
  });
});

// The database, not just the API's existence check, must enforce this rule.
describe('POST /api/businesses — one business per owner', () => {
  it('allows only one concurrent creation and enforces uniqueness in PostgreSQL', async () => {
    const newOwner = await createUser('secondOwner', 'OWNER');
    const token = signToken(newOwner);
    const details = {
      name: 'A new test business',
      categoryId: business.categoryId,
      location: 'Beirut',
      address: 'Main street',
      phone: '12345678',
      email: 'second-owner@test.local',
    };
    const create = () => request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${token}`)
      .send(details);

    const [first, second] = await Promise.all([create(), create()]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await prisma.business.count({ where: { ownerId: newOwner.id } })).toBe(1);

    await expect(prisma.business.create({
      data: { ...details, name: 'Another business', ownerId: newOwner.id },
    })).rejects.toMatchObject({ code: 'P2002' });
  });
});

// Cookie login is same-origin, HttpOnly and protected from cross-origin writes.
describe('authentication — secure browser cookies', () => {
  it('sets HttpOnly cookie, authenticates /me, rejects cross-origin writes, and clears session', async () => {
    const signup = await request(app).post('/api/auth/signup').send({
      name: 'Cookie Tester', email: `cookie.${RUN}@test.local`,
      password: 'TestPassword123!', role: 'CUSTOMER',
    });
    expect(signup.status).toBe(201);
    userIds.push(signup.body.user.id); // remove this test user in afterAll
    const setCookies = signup.headers['set-cookie'];
    expect(setCookies).toBeDefined();
    const session = setCookies[0];
    expect(session).toContain('HttpOnly');
    expect(session).toContain('SameSite=Lax');
    expect(session).toContain('Path=/api');
    const cookie = session.split(';')[0];
    expect(cookie.startsWith('queueless_session=')).toBe(true);

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(`cookie.${RUN}@test.local`);

    const blocked = await request(app).post('/api/appointments')
      .set('Cookie', cookie)
      .set('Origin', 'https://attacker.example')
      .send({});
    expect(blocked.status).toBe(403);

    const logout = await request(app).post('/api/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', config.clientOrigin);
    expect(logout.status).toBe(204);
    expect(logout.headers['set-cookie'][0]).toMatch(/Max-Age=0|Expires=/);
  });
});

// Render staging may explicitly allow this Vercel team's preview hostnames.
// Production never sets the suffix, so only CLIENT_ORIGIN is accepted there.
describe('authentication — staging preview origins', () => {
  it('allows configured preview writes, blocks foreign origins, and denies previews when disabled', async () => {
    const previousSuffix = config.previewHostSuffix;
    const preview = 'https://queue-less-abc123-queue-less4.vercel.app';
    const cookie = `queueless_session=${aliceToken}`;
    try {
      config.previewHostSuffix = '-queue-less4.vercel.app';

      const validWrite = await request(app).post('/api/appointments')
        .set('Origin', preview).set('Cookie', cookie).send({});
      // Invalid body produces 400, rather than failing CSRF protection (403).
      expect(validWrite.status).toBe(400);

      const logout = await request(app).post('/api/auth/logout')
        .set('Origin', preview).set('Cookie', cookie);
      expect(logout.status).toBe(204);

      const foreignWrite = await request(app).post('/api/appointments')
        .set('Origin', 'https://attacker.example').set('Cookie', cookie).send({});
      expect(foreignWrite.status).toBe(403);

      const deceptiveOrigin = await request(app).post('/api/auth/logout')
        .set('Origin', `${preview}.attacker.example`).set('Cookie', cookie);
      expect(deceptiveOrigin.status).toBe(403);

      config.previewHostSuffix = '';
      const disabled = await request(app).post('/api/auth/logout')
        .set('Origin', preview).set('Cookie', cookie);
      expect(disabled.status).toBe(403);
    } finally {
      config.previewHostSuffix = previousSuffix;
    }
  });
});
