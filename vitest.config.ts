import { defineConfig } from 'vitest/config'
import path from 'node:path'
import react from '@vitejs/plugin-react'

const mocks = 'tests/setup/mocks.ts'
const dom = 'tests/setup/dom.ts'
// The golden suite of what stores save: it needs jsdom's localStorage, where every other golden
// suite runs under node like the generator it covers.
const persistedGolden = 'tests/golden/persisted.test.ts'
// Fails a test on console.error/console.warn output it does not expect.
const consoleGuard = 'tests/setup/console.ts'
// Fails the run on a skipped, todo or expected-to-fail test, however it was written.
const noSkips = './tests/setup/no-skips-reporter.ts'
// Mutation testing (scripts/mutation.mjs sets MUTATION_TESTING) runs the suite on instrumented
// copies of the changed source, in a sandbox without the git history. A test that parses a source
// module's own statements, or asks git about the tree, fails there and cannot catch a mutant, so
// that run leaves it out.
const repositoryReadingTests =
  process.env['MUTATION_TESTING'] === '1'
    ? ['tests/unit/csp.test.ts', 'tests/unit/documentation-sync.test.ts']
    : []

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src')
    }
  },
  test: {
    globals: true,
    update: 'none',
    // A focused test fails the run locally as well as in CI.
    allowOnly: false,
    // Files and tests run in a new random order each run, in every project, so a test that only
    // passes after another one fails; the run prints its seed to replay that order.
    sequence: { shuffle: true },
    // Gate logs are read by the count lines tests print.
    silent: false,
    reporters: ['default', noSkips],
    // Floors live in ratchets.json and scripts/check-coverage.mjs checks them, so a golden-only
    // run never meets suite floors. CI reads lcov.info for the coverage of changed lines.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts'],
      reporter: ['text-summary', 'json-summary', 'json', 'lcovonly'],
      reportsDirectory: 'coverage'
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.test.{ts,tsx}'],
          exclude: [
            'tests/dom/**',
            'tests/golden/**',
            'tests/fixtures/**',
            ...repositoryReadingTests
          ],
          setupFiles: [consoleGuard, mocks]
        }
      },
      {
        extends: true,
        test: {
          name: 'golden',
          environment: 'node',
          include: ['tests/golden/**/*.test.ts'],
          exclude: [persistedGolden],
          setupFiles: [consoleGuard, mocks]
        }
      },
      {
        extends: true,
        test: {
          name: 'golden-persisted',
          environment: 'jsdom',
          include: [persistedGolden],
          setupFiles: [consoleGuard, mocks, dom]
        }
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['tests/dom/**/*.test.{ts,tsx}'],
          setupFiles: [consoleGuard, mocks, dom]
        }
      }
    ]
  }
})
