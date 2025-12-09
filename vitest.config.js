import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.js'],
    onConsoleLog(log, type) {
      const suppress = /Invalid URL: components\//.test(log)
        || /Failed to parse URL/.test(log)
        || /Error loading component components\//.test(log);
      if (suppress) return false;
    }
  }
});
