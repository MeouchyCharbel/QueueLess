// Converting between business wall-clock time ("2026-11-20" at "09:00" in
// Beirut) and exact moments (Date objects, stored in UTC in the database).
// Uses only the built-in Intl API, which knows every timezone's rules,
// including the summer/winter clock change.
import { config } from '../config.js';

// "YYYY-MM-DD" -> [year, month, day] as numbers.
function splitDate(date) {
  return date.split('-').map(Number);
}

// "HH:MM" -> minutes since midnight, e.g. "09:30" -> 570.
export function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// True for a real calendar date in "YYYY-MM-DD" form (rejects "2026-02-30").
export function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = splitDate(date);
  const check = new Date(Date.UTC(y, m - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
}

// 0 = Sunday ... 6 = Saturday (same numbering as the WorkingHours table).
export function weekdayOf(date) {
  const [y, m, d] = splitDate(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// How many minutes the timezone is ahead of UTC at a given moment
// (Beirut: +120 in winter, +180 in summer).
function offsetMinutes(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const wallClockAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((wallClockAsUtc - utcMs) / 60_000);
}

// The exact moment when the wall clock in the app timezone shows
// `minutes` after midnight on `date`.
export function zonedDateTime(date, minutes, timeZone = config.timezone) {
  const [y, m, d] = splitDate(date);
  const asIfUtc = Date.UTC(y, m - 1, d, 0, minutes);
  // First guess with the offset at that time, then correct once in case the
  // clock changes between the guess and the real moment.
  let utcMs = asIfUtc - offsetMinutes(asIfUtc, timeZone) * 60_000;
  utcMs = asIfUtc - offsetMinutes(utcMs, timeZone) * 60_000;
  return new Date(utcMs);
}
