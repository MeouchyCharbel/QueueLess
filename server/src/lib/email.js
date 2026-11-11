// Sends one email through Resend (third-party email API).
// Emails are plain text: names typed by users are never turned into HTML.
// Sending never throws — a failed email is logged and the booking itself
// still succeeds, because the appointment matters more than the message.
import { Resend } from 'resend';
import { config } from '../config.js';

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

export async function sendEmail({ to, subject, text }) {
  if (!resend) {
    console.log(`[email not sent: RESEND_API_KEY missing] to=${to} subject="${subject}"`);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: config.emailFrom, to, subject, text });
    if (error) {
      console.error(`Email to ${to} failed:`, error.message);
    }
  } catch (err) {
    console.error(`Email to ${to} failed:`, err.message);
  }
}
