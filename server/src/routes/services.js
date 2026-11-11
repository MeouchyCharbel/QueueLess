// Services a business offers (owner only), mounted at /api.
// There is no DELETE: a service is deactivated instead, so past
// appointments that used it keep their history.
import express from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { findOwnedBusiness, findOwnedService } from '../lib/ownership.js';
import { serializeService } from '../lib/serialize.js';

export const servicesRouter = express.Router();

const ownerOnly = [requireAuth, requireRole('OWNER')];

const ServiceInput = z.object({
  name: z.string().trim().min(1, 'Enter the service name').max(80),
  price: z.number().min(0).max(100_000),
  durationMinutes: z.number().int().min(5, 'At least 5 minutes').max(480, 'At most 8 hours'),
  active: z.boolean().default(true),
});

// POST /api/businesses/:businessId/services -> 201 service | 400 | 404
servicesRouter.post(
  '/businesses/:businessId/services',
  ...ownerOnly,
  validate(ServiceInput),
  async (req, res) => {
    const business = await findOwnedBusiness(req.params.businessId, req.userId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const service = await prisma.service.create({ data: { ...req.body, businessId: business.id } });
    res.status(201).json(serializeService(service));
  },
);

// PATCH /api/services/:id -> 200 service | 400 | 404
// Only the fields that are sent are changed (e.g. { active: false }).
servicesRouter.patch('/services/:id', ...ownerOnly, validate(ServiceInput.partial()), async (req, res) => {
  const service = await findOwnedService(req.params.id, req.userId);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  const updated = await prisma.service.update({ where: { id: service.id }, data: req.body });
  res.json(serializeService(updated));
});
