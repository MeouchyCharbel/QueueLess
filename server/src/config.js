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

export const config = {
  port: Number(process.env.PORT) || 3000,
  clientOrigin: process.env.CLIENT_ORIGIN,
  jwtSecret: process.env.JWT_SECRET,
  // Business hours ("09:00") are read in this timezone. Beirut by default;
  // it also handles the summer/winter clock change automatically.
  timezone: process.env.APP_TIMEZONE || 'Asia/Beirut',
};
