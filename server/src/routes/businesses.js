// Businesses, mounted at /api/businesses.
// Owner setup routes (profile and working hours) and public search/detail.
import express from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { findOwnedBusiness } from '../lib/ownership.js';
import { ScheduleInput, saveSchedule, loadSchedule } from '../lib/schedule.js';
import { serializeService } from '../lib/serialize.js';
import { parseId } from '../lib/ids.js';

export const businessesRouter = express.Router();

const ownerOnly = [requireAuth, requireRole('OWNER')];

const BusinessInput = z.object({
  name: z.string().trim().min(1, 'Enter the business name').max(100),
  categoryId: z.number().int().positive(),
  location: z.string().trim().min(1, 'Enter a city or area').max(80),
  address: z.string().trim().min(1, 'Enter the address').max(200),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/, 'Enter a valid phone number'),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
});

async function categoryExists(categoryId) {
  return (await prisma.category.count({ where: { id: categoryId } })) > 0;
}

// POST /api/businesses -> 201 business | 400 | 409
// Each owner manages one business.
businessesRouter.post('/', ...ownerOnly, validate(BusinessInput), async (req, res) => {
  if (await prisma.business.findFirst({ where: { ownerId: req.userId } })) {
    return res.status(409).json({ error: 'You already have a business' });
  }
  if (!(await categoryExists(req.body.categoryId))) {
    return res.status(400).json({ error: 'categoryId: Unknown category' });
  }
  const business = await prisma.business.create({
    data: { ...req.body, ownerId: req.userId }, // owner comes from the token, never the body
  });
  res.status(201).json(business);
});

// GET /api/businesses/mine -> 200 everything the setup pages need | 404
businessesRouter.get('/mine', ...ownerOnly, async (req, res) => {
  const business = await prisma.business.findFirst({
    where: { ownerId: req.userId },
    include: {
      category: true,
      services: { orderBy: { id: 'asc' } },
      staff: { orderBy: { id: 'asc' }, include: { staffServices: true } },
    },
  });
  if (!business) {
    return res.status(404).json({ error: 'No business yet' });
  }

  const staff = await Promise.all(
    business.staff.map(async ({ staffServices, ...member }) => ({
      ...member,
      serviceIds: staffServices.map((s) => s.serviceId),
      ...(await loadSchedule({ staffId: member.id })),
    })),
  );

  res.json({
    ...business,
    services: business.services.map(serializeService),
    staff,
    ...(await loadSchedule({ businessId: business.id })),
  });
});

// PATCH /api/businesses/:id -> 200 business | 400 | 404
// Only the fields that are sent are changed.
businessesRouter.patch('/:id', ...ownerOnly, validate(BusinessInput.partial()), async (req, res) => {
  const business = await findOwnedBusiness(req.params.id, req.userId);
  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }
  if (req.body.categoryId !== undefined && !(await categoryExists(req.body.categoryId))) {
    return res.status(400).json({ error: 'categoryId: Unknown category' });
  }
  const updated = await prisma.business.update({ where: { id: business.id }, data: req.body });
  res.json(updated);
});

// PUT /api/businesses/:id/hours -> 200 { hours, breaks } | 400 | 404
// Replaces the whole weekly schedule of the business.
businessesRouter.put('/:id/hours', ...ownerOnly, validate(ScheduleInput), async (req, res) => {
  const business = await findOwnedBusiness(req.params.id, req.userId);
  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }
  await saveSchedule({ businessId: business.id }, req.body);
  res.json(await loadSchedule({ businessId: business.id }));
});

// ---------------------------------------------------------------------------
// Public routes: anyone can search and view businesses (no login needed).
// They are defined after /mine so "/mine" is never read as an :id.
// ---------------------------------------------------------------------------

const SearchQuery = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  location: z.string().trim().max(80).optional(),
});

// Only businesses a customer can actually book: at least one active staff
// member who performs at least one active service.
const BOOKABLE = {
  staff: {
    some: { active: true, staffServices: { some: { service: { active: true } } } },
  },
};

// GET /api/businesses?categoryId=1&location=beirut -> 200 list | 400
// Both filters are optional. Location matches part of the city/area or of
// the address ("old souk" finds "Old Souk 3"), ignoring upper/lower case.
businessesRouter.get('/', async (req, res) => {
  const result = SearchQuery.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid search filters' });
  }
  const { categoryId, location } = result.data;

  const businesses = await prisma.business.findMany({
    where: {
      ...BOOKABLE,
      ...(categoryId && { categoryId }),
      // The location text can match the city/area or the street address.
      ...(location && {
        OR: [
          { location: { contains: location, mode: 'insensitive' } },
          { address: { contains: location, mode: 'insensitive' } },
        ],
      }),
    },
    select: { id: true, name: true, location: true, address: true, category: true },
    orderBy: { name: 'asc' },
    take: 50,
  });
  res.json(businesses);
});

// GET /api/businesses/:id -> 200 business with active services and staff | 404
// Everything the booking page needs to show its choices.
businessesRouter.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const business = id
    ? await prisma.business.findUnique({
        where: { id },
        include: {
          category: true,
          services: { where: { active: true }, orderBy: { name: 'asc' } },
          staff: {
            where: { active: true },
            orderBy: { name: 'asc' },
            include: { staffServices: { where: { service: { active: true } } } },
          },
        },
      })
    : null;
  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  const { ownerId, createdAt, services, staff, ...profile } = business;
  res.json({
    ...profile,
    services: services.map(({ id, name, price, durationMinutes }) =>
      serializeService({ id, name, price, durationMinutes }),
    ),
    staff: staff.map(({ id, name, staffServices }) => ({
      id,
      name,
      serviceIds: staffServices.map((s) => s.serviceId),
    })),
  });
});
