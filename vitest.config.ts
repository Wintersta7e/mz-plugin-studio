import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    exclude: ['node_modules', 'tools/reference-repos/**'],
    environmentMatchGlobs: [
      ['**/*.tsx', 'jsdom'],
    ],
    setupFiles: ['tests/setup-dom.ts'],
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@': resolve(__dirname, 'src/renderer/src'),
    }
  }
})
