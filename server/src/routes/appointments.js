// Appointments, mounted at /api/appointments. Every route needs a login.
// Customers see and change only the appointments they booked; owners see
// and change only the appointments of their own business. Anything else
// answers 404, exactly like an appointment that does not exist.
import express from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { parseId } from '../lib/ids.js';
import { HttpError } from '../lib/httpError.js';
import { getAvailableSlots } from '../lib/availability.js';
import { isValidDate, localDateOf, zonedDateTime } from '../lib/time.js';
import { serializeService } from '../lib/serialize.js';
import { notifyBooked, notifyCancelled, notifyRescheduled } from '../lib/notifications.js';

export const appointmentsRouter = express.Router();

appointmentsRouter.use(requireAuth);

const ACTIVE = ['PENDING', 'CONFIRMED']; // appointments that still hold their time

// Which status changes each role may make: { newStatus: [allowed current statuses] }
const ALLOWED_CHANGES = {
  CUSTOMER: { CANCELLED: ['PENDING', 'CONFIRMED'] },
  OWNER: {
    CONFIRMED: ['PENDING'],
    CANCELLED: ['PENDING', 'CONFIRMED'],
    COMPLETED: ['CONFIRMED'],
  },
};

// What every appointment response contains.
const DETAILS = {
  business: { select: { id: true, name: true, location: true, address: true, phone: true, email: true } },
  service: { select: { id: true, name: true, price: true, durationMinutes: true } },
  staff: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, email: true } },
};

function toResponse({ customerId, businessId, serviceId, staffId, service, ...appointment }) {
  return { ...appointment, service: serializeService(service) };
}

// Only appointments the logged-in user is allowed to see.
function visibleTo(req) {
  return req.userRole === 'OWNER'
    ? { business: { ownerId: req.userId } }
    : { customerId: req.userId };
}

// The database exclusion constraint (see the first migration) refuses a
// booking that overlaps another one for the same staff member.
function isOverlapError(err) {
  return String(err.message).includes('Appointment_no_overlap');
}

// Throws 409 unless `startAt` is one of the free slots the engine offers.
async function findFreeSlot({ businessId, serviceId, staffId, startAt, ignoreAppointmentId }) {
  const slots = await getAvailableSlots({
    businessId,
    serviceId,
    staffId,
    date: localDateOf(startAt),
    ignoreAppointmentId,
  });
  const slot = slots.find((s) => new Date(s.startAt).getTime() === startAt.getTime());
  if (!slot) {
    throw new HttpError(409, 'This time is not available. Please pick another one.');
  }
  return slot;
}

const Moment = z.iso.datetime({ offset: true, message: 'Use an ISO date-time' });

const BookingInput = z.object({
  businessId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  staffId: z.number().int().positive(),
  startAt: Moment,
});

// POST /api/appointments -> 201 appointment | 400 | 404 | 409
// Customers book a free slot. The appointment starts as PENDING until the
// owner confirms it.
appointmentsRouter.post('/', requireRole('CUSTOMER'), validate(BookingInput), async (req, res) => {
  const { businessId, serviceId, staffId } = req.body;
  const startAt = new Date(req.body.startAt);

  const slot = await findFreeSlot({ businessId, serviceId, staffId, startAt });

  try {
    const appointment = await prisma.appointment.create({
      data: {
        customerId: req.userId, // from the token, never the body
        businessId,
        serviceId,
        staffId,
        startAt,
        endAt: new Date(slot.endAt), // the server computes the end from the service duration
      },
      include: DETAILS,
    });
    res.status(201).json(toResponse(appointment));
    // Emails go out after the response, so a slow email never delays the
    // customer (sendEmail logs failures instead of throwing).
    notifyBooked(appointment);
  } catch (err) {
    // Someone else booked this staff member at the same moment.
    if (isOverlapError(err)) {
      throw new HttpError(409, 'This time was just booked by someone else. Please pick another one.');
    }
    throw err;
  }
});

const ListQuery = z.object({
  from: z.string().refine(isValidDate, 'Use YYYY-MM-DD').optional(),
  to: z.string().refine(isValidDate, 'Use YYYY-MM-DD').optional(),
});

// GET /api/appointments?from=2026-11-16&to=2026-11-22 -> 200 list | 400
// Customers get their own bookings; owners get their business's bookings.
// from/to are optional dates in business time, both included (used by the
// owner's day and week views).
appointmentsRouter.get('/', async (req, res) => {
  const result = ListQuery.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid date filter' });
  }
  const { from, to } = result.data;

  const appointments = await prisma.appointment.findMany({
    where: {
      ...visibleTo(req),
      ...((from || to) && {
        startAt: {
          ...(from && { gte: zonedDateTime(from, 0) }),
          ...(to && { lt: zonedDateTime(to, 24 * 60) }),
        },
      }),
    },
    include: DETAILS,
    orderBy: { startAt: 'asc' },
    take: 500,
  });
  res.json(appointments.map(toResponse));
});

// Exactly one change per request: a new status, or a new start time.
const ChangeInput = z.union(
  [
    z.object({ status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']) }).strict(),
    z.object({ startAt: Moment }).strict(),
  ],
  { error: 'Send either a new status or a new startAt' },
);

// PATCH /api/appointments/:id -> 200 appointment | 400 | 404 | 409
//   { "status": "CANCELLED" }  customer or owner
//   { "status": "CONFIRMED" | "COMPLETED" }  owner only
//   { "startAt": "..." }  reschedule (same service and staff member)
appointmentsRouter.patch('/:id', validate(ChangeInput), async (req, res) => {
  const id = parseId(req.params.id);
  const appointment = id
    ? await prisma.appointment.findFirst({ where: { id, ...visibleTo(req) } })
    : null;
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const data = req.body.status
    ? checkStatusChange(req.userRole, appointment, req.body.status)
    : await checkReschedule(req.userRole, appointment, new Date(req.body.startAt));

  try {
    // Optimistic concurrency: only update the version we just validated.
    // The conditions and the write execute atomically in the database.
    const updated = await prisma.appointment.update({
      where: {
        id: appointment.id,
        status: appointment.status,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        updatedAt: appointment.updatedAt,
      },
      data,
      include: DETAILS,
    });
    res.json(toResponse(updated));

    // Email both sides about cancellations and new times (confirming or
    // completing does not send an email).
    if (data.status === 'CANCELLED') {
      notifyCancelled(updated, req.userRole);
    } else if (data.startAt) {
      notifyRescheduled(updated, appointment.startAt);
    }
  } catch (err) {
    // Prisma returns P2025 if another request updated the appointment
    // between our initial read and the conditional update.
    if (err.code === 'P2025') {
      throw new HttpError(409, 'This appointment changed. Refresh and try again.');
    }
    if (isOverlapError(err)) {
      throw new HttpError(409, 'This time was just booked by someone else. Please pick another one.');
    }
    throw err;
  }
});

// Returns the update for a status change, or throws 409 if it is not allowed.
function checkStatusChange(role, appointment, newStatus) {
  const allowedFrom = ALLOWED_CHANGES[role][newStatus];
  if (!allowedFrom) {
    throw new HttpError(403, 'Forbidden');
  }
  if (!allowedFrom.includes(appointment.status)) {
    throw new HttpError(409, `A ${appointment.status.toLowerCase()} appointment cannot become ${newStatus.toLowerCase()}`);
  }
  if (role === 'CUSTOMER' && appointment.startAt <= new Date()) {
    throw new HttpError(409, 'Past appointments cannot be cancelled');
  }
  return { status: newStatus };
}

// Returns the update for a new start time, or throws if it is not allowed.
async function checkReschedule(role, appointment, startAt) {
  if (!ACTIVE.includes(appointment.status)) {
    throw new HttpError(409, `A ${appointment.status.toLowerCase()} appointment cannot be rescheduled`);
  }
  if (role === 'CUSTOMER' && appointment.startAt <= new Date()) {
    throw new HttpError(409, 'Past appointments cannot be rescheduled');
  }
  const slot = await findFreeSlot({
    businessId: appointment.businessId,
    serviceId: appointment.serviceId,
    staffId: appointment.staffId,
    startAt,
    ignoreAppointmentId: appointment.id, // its own old time does not block the new one
  });
  return {
    startAt,
    endAt: new Date(slot.endAt),
    // When the customer moves it, the owner has to confirm the new time.
    ...(role === 'CUSTOMER' && { status: 'PENDING' }),
  };
}
