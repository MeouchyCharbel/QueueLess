// Staff members of a business (owner only), mounted at /api.
// A solo business is simply a business with one staff member.
// Like services, staff are deactivated instead of deleted.
import express from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { findOwnedBusiness, findOwnedStaff } from '../lib/ownership.js';
import { ScheduleInput, saveSchedule, loadSchedule } from '../lib/schedule.js';

export const staffRouter = express.Router();

const ownerOnly = [requireAuth, requireRole('OWNER')];

const StaffInput = z.object({
  name: z.string().trim().min(1, 'Enter the staff member name').max(80),
  active: z.boolean().default(true),
  serviceIds: z.array(z.number().int().positive()).max(100).default([]), // services this person performs
});

// True when every id is a service of this business (blocks linking
// a staff member to another business's service).
async function servicesBelongTo(serviceIds, businessId) {
  const unique = [...new Set(serviceIds)];
  const found = await prisma.service.count({ where: { id: { in: unique }, businessId } });
  return found === unique.length;
}

function toResponse(staff, serviceIds) {
  return { ...staff, serviceIds };
}

// POST /api/businesses/:businessId/staff -> 201 staff | 400 | 404
staffRouter.post('/businesses/:businessId/staff', ...ownerOnly, validate(StaffInput), async (req, res) => {
  const business = await findOwnedBusiness(req.params.businessId, req.userId);
  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }
  const { name, active, serviceIds } = req.body;
  if (!(await servicesBelongTo(serviceIds, business.id))) {
    return res.status(400).json({ error: 'serviceIds: Unknown service' });
  }
  const staff = await prisma.staff.create({
    data: {
      name,
      active,
      businessId: business.id,
      staffServices: { create: [...new Set(serviceIds)].map((serviceId) => ({ serviceId })) },
    },
  });
  res.status(201).json(toResponse(staff, [...new Set(serviceIds)]));
});

// PATCH /api/staff/:id -> 200 staff | 400 | 404
// Sending serviceIds replaces the list of services this person performs.
staffRouter.patch('/staff/:id', ...ownerOnly, validate(StaffInput.partial()), async (req, res) => {
  const staff = await findOwnedStaff(req.params.id, req.userId);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  const { name, active, serviceIds } = req.body;
  if (serviceIds !== undefined && !(await servicesBelongTo(serviceIds, staff.businessId))) {
    return res.status(400).json({ error: 'serviceIds: Unknown service' });
  }

  const updated = await prisma.staff.update({
    where: { id: staff.id },
    data: {
      name,
      active,
      ...(serviceIds !== undefined && {
        staffServices: {
          deleteMany: {}, // remove the old links, then add the new ones
          create: [...new Set(serviceIds)].map((serviceId) => ({ serviceId })),
        },
      }),
    },
    include: { staffServices: true },
  });
  const { staffServices, ...rest } = updated;
  res.json(toResponse(rest, staffServices.map((s) => s.serviceId)));
});

// PUT /api/staff/:id/hours -> 200 { hours, breaks } | 400 | 404
// A staff member's own hours replace the business hours on those weekdays.
// Sending { hours: [] } means "same hours as the business".
staffRouter.put('/staff/:id/hours', ...ownerOnly, validate(ScheduleInput), async (req, res) => {
  const staff = await findOwnedStaff(req.params.id, req.userId);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  await saveSchedule({ staffId: staff.id }, req.body);
  res.json(await loadSchedule({ staffId: staff.id }));
});
