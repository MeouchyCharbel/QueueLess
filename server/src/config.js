// Loads server/.env and checks every required setting once, at startup.
// A missing secret should crash the server immediately with a clear message,
// not cause a confusing error later in the middle of a request.
import 'dotenv/config';

const REQUIRED_VARS = ['CLIENT_ORIGIN'];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key} (see server/.env.example)`);
  }
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  clientOrigin: process.env.CLIENT_ORIGIN,
};
