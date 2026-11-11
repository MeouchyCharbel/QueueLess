// Free time slots for the booking page, mounted at /api (public).
import express from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { parseId } from '../lib/ids.js';
import { isValidDate } from '../lib/time.js';
import { getAvailableSlots } from '../lib/availability.js';

export const availabilityRouter = express.Router();

const AvailabilityQuery = z.object({
  serviceId: z.coerce.number().int().positive(),
  staffId: z.coerce.number().int().positive(),
  date: z.string().refine(isValidDate, 'Use a real date in YYYY-MM-DD form'),
});

// GET /api/businesses/:businessId/availability?serviceId=1&staffId=2&date=2026-11-20
// -> 200 { date, timezone, slots: [{ startAt, endAt }] } | 400 | 404
availabilityRouter.get('/businesses/:businessId/availability', async (req, res) => {
  const businessId = parseId(req.params.businessId);
  if (!businessId) {
    return res.status(404).json({ error: 'Business not found' });
  }

  const result = AvailabilityQuery.safeParse(req.query);
  if (!result.success) {
    const issue = result.error.issues[0];
    return res.status(400).json({ error: `${issue.path.join('.')}: ${issue.message}` });
  }

  const { serviceId, staffId, date } = result.data;
  const slots = await getAvailableSlots({ businessId, serviceId, staffId, date });
  res.json({ date, timezone: config.timezone, slots });
});
