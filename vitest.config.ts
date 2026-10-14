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
