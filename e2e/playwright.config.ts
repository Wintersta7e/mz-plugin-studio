// End-to-end runs against the packaged app; `npm run e2e:prepare` builds what they drive.
import { defineConfig } from '@playwright/test'

// The visual project exists only where E2E_VISUAL_IMAGE=1: in the pinned Linux image, where the CI
// job and `npm run e2e:visual:update` set it, as the baselines are pixel-exact only there
const visual = process.platform === 'linux' && process.env['E2E_VISUAL_IMAGE'] === '1'
const selectsVisual = process.argv.some(
  (arg, i, all) => arg === '--project=visual' || (arg === '--project' && all[i + 1] === 'visual')
)
if (selectsVisual && !visual) {
  throw new Error(
    'the visual project runs only inside the pinned Linux image (E2E_VISUAL_IMAGE=1): ' +
      'compare with npm run e2e:visual:update -- --check'
  )
}

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
    ...(visual ? [{ name: 'visual', testMatch: 'visual/**/*.e2e.ts' }] : [])
  ]
})
