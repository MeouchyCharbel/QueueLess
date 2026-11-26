import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30_000, // the database is in the cloud, give it time
    hookTimeout: 30_000,
  },
});
