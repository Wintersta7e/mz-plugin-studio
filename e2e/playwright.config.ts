// End-to-end runs against the packaged app; `npm run e2e:prepare` builds what they drive.
import { defineConfig } from '@playwright/test'

// The visual project exists only where E2E_VISUAL_IMAGE=1: in the pinned Linux image, where the CI
// job and `npm run e2e:visual:update` set it, as the baselines are pixel-exact only there
const {
  CI: ci = '',
  E2E_VISUAL_IMAGE: visualImage,
  MZ_PROJECT_DIR: mzProject = '',
  MZ_NWJS_EXE: nwjs = ''
} = process.env
const isVisual = process.platform === 'linux' && visualImage === '1'
const isSelects = (project: string): boolean =>
  process.argv.some(
    (arg, index, all) =>
      arg === `--project=${project}` || (arg === '--project' && all[index + 1] === project)
  )
if (!isVisual && isSelects('visual')) {
  throw new Error(
    'the visual project runs only inside the pinned Linux image (E2E_VISUAL_IMAGE=1): ' +
      'compare with npm run e2e:visual:update -- --check'
  )
}
// The MZ runtime project exists only where MZ_PROJECT_DIR names a local MZ project to copy
const isMzRuntime = mzProject !== ''
if (!isMzRuntime && isSelects('mz-runtime')) {
  throw new Error(
    'the mz-runtime project needs MZ_PROJECT_DIR: the absolute path of an MZ project folder'
  )
}

export default defineConfig({
  // Resolved against this file's directory: '.' is e2e/
  testDir: '.',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  retries: 0,
  forbidOnly: ci !== '',
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
    ...(isVisual ? [{ name: 'visual', testMatch: 'visual/**/*.e2e.ts' }] : []),
    // The NW.js level is left out, not skipped, where MZ_NWJS_EXE names no engine
    ...(isMzRuntime
      ? [
          {
            name: 'mz-runtime',
            testMatch: 'mz/**/*.e2e.ts',
            ...(nwjs === '' && { testIgnore: 'mz/nwjs.e2e.ts' })
          }
        ]
      : [])
  ]
})
