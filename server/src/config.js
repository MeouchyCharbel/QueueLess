// Loads server/.env and checks every required setting once, at startup.
// A missing secret should crash the server immediately with a clear message,
// not cause a confusing error later in the middle of a request.
import 'dotenv/config';

const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET', 'CLIENT_ORIGIN'];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key} (see server/.env.example)`);
  }
}

// Optional and staging-only: allow writes from this Vercel team's preview URLs.
// Leave unset in production. Never accept arbitrary .vercel.app hostnames.
const previewHostSuffix = process.env.CLIENT_PREVIEW_HOST_SUFFIX?.trim() || '';
if (previewHostSuffix && !/^-[a-z0-9-]+\.vercel\.app$/.test(previewHostSuffix)) {
  throw new Error('CLIENT_PREVIEW_HOST_SUFFIX must be a specific Vercel team suffix');
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  clientOrigin: process.env.CLIENT_ORIGIN,
  previewHostSuffix,
  jwtSecret: process.env.JWT_SECRET,
  // Business hours ("09:00") are read in this timezone. Beirut by default;
  // it also handles the summer/winter clock change automatically.
  timezone: process.env.APP_TIMEZONE || 'Asia/Beirut',
  // Email is optional: without a key, emails are printed to the terminal.
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'QueueLess <onboarding@resend.dev>',
};

// Strict Origin allowlist for cookie-authenticated browser writes.
// The optional suffix is enabled only on the staging Render service.
export function isAllowedClientOrigin(origin) {
  if (origin === config.clientOrigin) return true;
  if (!origin || !config.previewHostSuffix) return false;
  try {
    const url = new URL(origin);
    return url.origin === origin &&
      url.protocol === 'https:' &&
      url.port === '' &&
      url.hostname.length > config.previewHostSuffix.length &&
      url.hostname.endsWith(config.previewHostSuffix);
  } catch {
    return false;
  }
}
