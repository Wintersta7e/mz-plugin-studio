import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

const mocks = 'tests/setup/mocks.ts'
const dom = 'tests/setup/dom.ts'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src')
    }
  },
  test: {
    globals: true,
    update: 'none',
    // Gate logs are read by the count lines tests print.
    silent: false,
    // Floors live in scripts/check-coverage.mjs, so a golden-only run never meets suite floors.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts'],
      reporter: ['text-summary', 'json-summary', 'json'],
      reportsDirectory: 'coverage'
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.test.{ts,tsx}'],
          exclude: ['tests/dom/**', 'tests/golden/**', 'tests/fixtures/**'],
          setupFiles: [mocks]
        }
      },
      {
        extends: true,
        test: {
          name: 'golden',
          environment: 'jsdom',
          include: ['tests/golden/**/*.test.ts'],
          setupFiles: [mocks, dom]
        }
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['tests/dom/**/*.test.{ts,tsx}'],
          setupFiles: [mocks, dom]
        }
      }
    ]
  }
})
