import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['node_modules', 'tools/reference-repos/**'],
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    }
  }
})
