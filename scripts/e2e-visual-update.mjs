// Runs the visual end-to-end project inside the pinned Playwright image, the only place its
// baselines are pixel-exact, from the repository root:
//   1. copies the files git tracks or would add (so no node_modules, dist, out) to a temp dir;
//   2. runs the image on that copy: install, Electron download, e2e:prepare, the visual project
//      with --update-snapshots=changed (with --check: compare only);
//   3. copies back the changed Linux baselines (not with --check) and the HTML report, prints
//      their names and the report path, and exits with the container's status.
import { execFileSync, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

export const IMAGE =
  'mcr.microsoft.com/playwright:v1.64.1-noble@sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea'

// The image's run options, shared with the CI container job; each caller adds its user
export const CONTAINER_OPTIONS = ['--init', '--ipc=host', '--security-opt', 'seccomp=unconfined']
// A screen larger than the app's window, so its content size is never clamped
export const XVFB = 'xvfb-run -a -s "-screen 0 1920x1080x24"'

// Set where the image runs the suite: the end-to-end config defines its visual project only then
export const VISUAL_IMAGE_ENV = 'E2E_VISUAL_IMAGE'

export const BASELINES = 'e2e/__screenshots__/linux'
// Where Playwright writes the HTML report: below the directory of package.json
export const REPORT = 'playwright-report'

const print = (line) => process.stdout.write(`${line}\n`)

/** @param {string} relPath a repository path with `/` @returns {boolean} */
export function isCopyBack(relPath) {
  return /^e2e\/__screenshots__\/linux\/[^/]+\.png$/.test(relPath)
}

/** @param {boolean} check @returns {string} the command the image runs in the copy */
export function imageCommand(check) {
  const visual = [
    `${VISUAL_IMAGE_ENV}=1`,
    XVFB,
    'node node_modules/@playwright/test/cli.js test -c e2e/playwright.config.ts --project=visual',
    ...(check ? [] : ['--update-snapshots=changed'])
  ].join(' ')
  return [
    'npm ci --ignore-scripts',
    'node node_modules/electron/install.js',
    'npm run e2e:prepare',
    visual
  ].join(' && ')
}

/** @param {string} dir @returns {string[]} the PNG names in `dir` */
const pngs = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith('.png')) : []

/** @param {string} copy */
function copyTree(copy) {
  const files = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {
      cwd: ROOT,
      encoding: 'utf8'
    }
  )
    .split('\0')
    .filter((file) => file && existsSync(join(ROOT, file)))
  for (const file of files) {
    mkdirSync(dirname(join(copy, file)), { recursive: true })
    cpSync(join(ROOT, file), join(copy, file))
  }
  // The suite compares git status before and after; baselines the run writes are its output
  execFileSync('git', ['init', '-q'], { cwd: copy })
  writeFileSync(join(copy, 'e2e', '__screenshots__', '.gitignore'), '*\n')
  return files.length
}

/** @param {string[]} argv @returns {number} the container's exit status */
export function main(argv) {
  const check = argv.includes('--check')
  const copy = mkdtempSync(join(tmpdir(), 'mz-visual-'))
  try {
    mkdirSync(join(copy, BASELINES), { recursive: true })
    print(`visual-update: copied ${copyTree(copy)} files`)
    // The image's files then belong to the caller, who deletes the copy
    if (!process.getuid || !process.getgid) throw new Error('runs on a Linux host only')
    const [uid, gid] = [process.getuid(), process.getgid()]
    const docker = spawnSync(
      'docker',
      [
        'run',
        '--rm',
        ...CONTAINER_OPTIONS,
        '--user',
        `${uid}:${gid}`,
        '-e',
        'HOME=/tmp/home',
        '-v',
        `${copy}:/work`,
        '-w',
        '/work',
        IMAGE,
        'bash',
        '-c',
        imageCommand(check)
      ],
      { stdio: 'inherit' }
    )
    const status = docker.status ?? 1
    if (docker.error) print(`visual-update: docker failed to start: ${docker.error.message}`)

    const changed = check
      ? []
      : pngs(join(copy, BASELINES)).filter((name) => {
          const host = join(ROOT, BASELINES, name)
          const fresh = join(copy, BASELINES, name)
          return !existsSync(host) || !readFileSync(host).equals(readFileSync(fresh))
        })
    for (const name of changed) {
      const relPath = `${BASELINES}/${name}`
      if (!isCopyBack(relPath)) throw new Error(`not a Linux baseline: ${relPath}`)
      mkdirSync(join(ROOT, BASELINES), { recursive: true })
      cpSync(join(copy, relPath), join(ROOT, relPath))
    }
    print(
      `visual-update: changed ${changed.length}${changed.map((name) => `\n  ${name}`).join('')}`
    )

    if (existsSync(join(copy, REPORT))) {
      rmSync(join(ROOT, REPORT), { recursive: true, force: true })
      cpSync(join(copy, REPORT), join(ROOT, REPORT), { recursive: true })
      print(`visual-update: report ${join(ROOT, REPORT, 'index.html')}`)
    } else print('visual-update: no report written')
    print(`visual-update: exit ${status}`)
    return status
  } finally {
    rmSync(copy, { recursive: true, force: true, maxRetries: 3 })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2))
}
