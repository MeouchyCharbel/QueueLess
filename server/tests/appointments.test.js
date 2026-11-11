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
import { localDateOf, zonedDateTime } from '../src/lib/time.js';

const RUN = Date.now(); // makes this run's emails unique
const userIds = [];
let business, service, staff, aliceToken, bobToken;

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
  await prisma.business.deleteMany({ where: { id: business?.id } }); // also removes service, staff, hours
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
