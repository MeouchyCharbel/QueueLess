import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.js'], // placeholder settings when there is no .env
    testTimeout: 30_000, // the database is in the cloud, give it time
    hookTimeout: 30_000,
  },
});
