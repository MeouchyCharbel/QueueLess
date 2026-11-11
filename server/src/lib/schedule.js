// Weekly schedule: working hours plus breaks.
// Used for the whole business and for one staff member's own hours.
import { z } from 'zod';
import { prisma } from '../db.js';

// "HH:MM" on a 24-hour clock, e.g. "09:00" or "17:30".
// Zero-padded times compare correctly as strings ("09:00" < "17:30").
const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24-hour) time');

const TimeRange = z
  .object({
    weekday: z.number().int().min(0).max(6), // 0 = Sunday ... 6 = Saturday
    startTime: Time,
    endTime: Time,
  })
  .refine((r) => r.startTime < r.endTime, 'End time must be after start time');

export const ScheduleInput = z
  .object({
    hours: z.array(TimeRange).max(7),
    breaks: z.array(TimeRange).max(21).default([]),
  })
  .superRefine(({ hours, breaks }, ctx) => {
    // At most one opening period per day (lunch is a break, not a second period).
    const days = hours.map((h) => h.weekday);
    if (new Set(days).size !== days.length) {
      ctx.addIssue({ code: 'custom', path: ['hours'], message: 'Each weekday can only appear once' });
    }
    // Every break must sit inside that day's working hours.
    for (const b of breaks) {
      const day = hours.find((h) => h.weekday === b.weekday);
      if (!day || b.startTime < day.startTime || b.endTime > day.endTime) {
        ctx.addIssue({ code: 'custom', path: ['breaks'], message: 'Breaks must be inside working hours' });
        return;
      }
    }
  });

// Replaces the whole weekly schedule of one business ({ businessId })
// or one staff member ({ staffId }). Runs in a transaction: either the old
// rows are all replaced by the new ones, or nothing changes.
export async function saveSchedule(owner, { hours, breaks }) {
  const toRows = (ranges) => ranges.map((r) => ({ ...owner, ...r }));
  await prisma.$transaction([
    prisma.workingHours.deleteMany({ where: owner }),
    prisma.break.deleteMany({ where: owner }),
    prisma.workingHours.createMany({ data: toRows(hours) }),
    prisma.break.createMany({ data: toRows(breaks) }),
  ]);
}

// Same shape the client sent, sorted by day then time.
const SCHEDULE_FIELDS = { weekday: true, startTime: true, endTime: true };
const SCHEDULE_ORDER = [{ weekday: 'asc' }, { startTime: 'asc' }];

export async function loadSchedule(owner) {
  const [hours, breaks] = await Promise.all([
    prisma.workingHours.findMany({ where: owner, select: SCHEDULE_FIELDS, orderBy: SCHEDULE_ORDER }),
    prisma.break.findMany({ where: owner, select: SCHEDULE_FIELDS, orderBy: SCHEDULE_ORDER }),
  ]);
  return { hours, breaks };
}
