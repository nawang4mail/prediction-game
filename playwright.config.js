const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  // These are integration tests against one shared API/DB with a single active
  // game. Running spec files in parallel races on that shared state, so run
  // them serially.
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
});
