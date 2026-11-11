// The availability engine: which start times can a customer book for one
// service with one staff member on one date?
//
// A start time is offered only when the whole appointment
//   1. fits inside the working hours for that weekday,
//   2. does not overlap a break,
//   3. does not overlap another active (not cancelled) appointment
//      of the same staff member,
//   4. starts in the future.
//
// Booking (step 8) uses the same function, so the server never accepts a
// time this engine would not offer. The database exclusion constraint is
// the last line of defence when two customers book at the same moment.
import { prisma } from '../db.js';
import { HttpError } from './httpError.js';
import { toMinutes, weekdayOf, zonedDateTime } from './time.js';

const SLOT_STEP_MINUTES = 15; // a new possible start time every 15 minutes
const MINUTE_MS = 60_000;

// Two time ranges overlap when each one starts before the other ends.
// (A range ending at 10:30 and one starting at 10:30 do not overlap.)
function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

// Returns [{ startAt, endAt }] as ISO strings, sorted by time.
// `ignoreAppointmentId` lets a reschedule ignore the appointment being moved.
export async function getAvailableSlots({ businessId, serviceId, staffId, date, ignoreAppointmentId }) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true },
  });
  if (!service) {
    throw new HttpError(404, 'Service not found');
  }

  const staff = await prisma.staff.findFirst({
    where: { id: staffId, businessId, active: true, staffServices: { some: { serviceId } } },
  });
  if (!staff) {
    throw new HttpError(404, 'This staff member does not offer this service');
  }

  // 1. Working hours: the staff member's own hours for this weekday,
  //    otherwise the business hours. No hours = closed that day.
  const weekday = weekdayOf(date);
  const hours =
    (await prisma.workingHours.findFirst({ where: { staffId, weekday } })) ??
    (await prisma.workingHours.findFirst({ where: { businessId, weekday } }));
  if (!hours) {
    return [];
  }

  // 2. Breaks of the business and of this staff member.
  const breaks = await prisma.break.findMany({
    where: { weekday, OR: [{ businessId }, { staffId }] },
  });

  // 3. This staff member's active appointments that touch this date.
  const dayStart = zonedDateTime(date, 0);
  const dayEnd = zonedDateTime(date, 24 * 60);
  const booked = await prisma.appointment.findMany({
    where: {
      staffId,
      status: { not: 'CANCELLED' },
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
      ...(ignoreAppointmentId && { id: { not: ignoreAppointmentId } }),
    },
    select: { startAt: true, endAt: true },
  });

  // Everything that blocks time, as [start, end] in milliseconds.
  const busy = [
    ...breaks.map((b) => [
      zonedDateTime(date, toMinutes(b.startTime)).getTime(),
      zonedDateTime(date, toMinutes(b.endTime)).getTime(),
    ]),
    ...booked.map((a) => [a.startAt.getTime(), a.endAt.getTime()]),
  ];

  const now = Date.now();
  const open = toMinutes(hours.startTime);
  const close = toMinutes(hours.endTime);
  const duration = service.durationMinutes;
  const slots = [];

  for (let minute = open; minute + duration <= close; minute += SLOT_STEP_MINUTES) {
    const start = zonedDateTime(date, minute).getTime();
    const end = start + duration * MINUTE_MS;

    if (start <= now) continue; // 4. only future times
    if (busy.some(([busyStart, busyEnd]) => overlaps(start, end, busyStart, busyEnd))) continue;

    slots.push({ startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString() });
  }

  return slots;
}
