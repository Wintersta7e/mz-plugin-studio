// End-to-end runs against the packaged app; `npm run e2e:prepare` builds what they drive.
import { defineConfig } from '@playwright/test'

export default defineConfig({
  // Resolved against this file's directory: '.' is e2e/
  testDir: '.',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  updateSnapshots: 'none',
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixels: 0, threshold: 0 } },
  use: { trace: 'retain-on-failure' },
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  reporter: [['list'], ['html', { open: 'never' }], ['./reporter.ts']],
  projects: [
    { name: 'flows', testMatch: 'flows/**/*.e2e.ts' },
    { name: 'release-smoke', testMatch: 'release-smoke.e2e.ts' },
    // Screenshots are compared only inside the pinned Linux image
    ...(process.platform === 'linux' ? [{ name: 'visual', testMatch: 'visual/**/*.e2e.ts' }] : [])
  ]
})
