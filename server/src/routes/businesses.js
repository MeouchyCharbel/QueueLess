// Businesses, mounted at /api/businesses.
// This file holds the owner's setup routes (profile and working hours).
import express from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { findOwnedBusiness } from '../lib/ownership.js';
import { ScheduleInput, saveSchedule, loadSchedule } from '../lib/schedule.js';
import { serializeService } from '../lib/serialize.js';

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
