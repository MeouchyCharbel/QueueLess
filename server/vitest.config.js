import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // No real emails during tests: with an empty key the server only
    // prints them (dotenv never overwrites a variable that is already set).
    env: { RESEND_API_KEY: '' },
    testTimeout: 30_000, // the database is in the cloud, give it time
    hookTimeout: 30_000,
  },
});
