import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      enabled: true,
      reporter: ['lcov', 'text'],
      reportOnFailureOnly: false,
      directory: 'coverage',
    },
  },
})