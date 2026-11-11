// The emails QueueLess sends, as listed in the proposal: bookings,
// cancellations and rescheduling. Each event emails the customer and the
// business (its contact email). `appointment` must include business,
// service, staff and customer details.
import { config } from '../config.js';
import { sendEmail } from './email.js';

// "Fri 20 Nov 2026, 09:00" in business time.
function formatWhen(moment) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: config.timezone,
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(moment);
}

function details(appointment) {
  const { business, service, staff, customer, startAt } = appointment;
  return [
    `Business: ${business.name} (${business.address}, ${business.location})`,
    `Service: ${service.name} with ${staff.name}`,
    `When: ${formatWhen(startAt)}`,
    `Customer: ${customer.name}`,
  ].join('\n');
}

// Same message to the customer and to the business.
function notifyBoth(appointment, subject, intro) {
  const text = `${intro}\n\n${details(appointment)}\n\n— QueueLess`;
  return Promise.all([
    sendEmail({ to: appointment.customer.email, subject, text }),
    sendEmail({ to: appointment.business.email, subject, text }),
  ]);
}

export function notifyBooked(appointment) {
  return notifyBoth(
    appointment,
    `Booking received: ${appointment.service.name} at ${appointment.business.name}`,
    'A new appointment was booked. The business will confirm it soon.',
  );
}

export function notifyCancelled(appointment, cancelledBy) {
  const who = cancelledBy === 'OWNER' ? 'the business' : 'the customer';
  return notifyBoth(
    appointment,
    `Appointment cancelled: ${appointment.service.name} at ${appointment.business.name}`,
    `This appointment was cancelled by ${who}. The time is free again.`,
  );
}

export function notifyRescheduled(appointment, previousStartAt) {
  return notifyBoth(
    appointment,
    `Appointment rescheduled: ${appointment.service.name} at ${appointment.business.name}`,
    `This appointment moved from ${formatWhen(previousStartAt)} to a new time.`,
  );
}
