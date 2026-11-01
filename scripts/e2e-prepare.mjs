// Prepares the packaged builds the end-to-end tests drive, from the repository root:
//   1. builds dist/<platform>-unpacked/ with the release configuration; with --reuse, reuses it
//      if present (for a build made earlier in the same job), and fails if a script the renderer
//      page loads at start holds the code editor (out/renderer, printing each script's bytes);
//   2. copies it to dist/e2e-twin/ and enables EnableNodeCliInspectArguments there, the fuse
//      Playwright's Electron launch needs and the release keeps off;
//   3. fails unless the two fuse wires differ in that fuse only and every other file is identical;
//   4. writes dist/e2e-artifacts.json: { release, twin, releaseWire, twinWire }.
import { flipFuses, FuseV1Options, FuseVersion, getCurrentFuseWire } from '@electron/fuses'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const INSPECT = FuseV1Options.EnableNodeCliInspectArguments
// Fuse state bytes as getCurrentFuseWire returns them
const STATES = new Map([
  [48, '0'],
  [49, '1'],
  [114, 'r']
])

// Reuses the unpacked release only when passed: for a build made earlier in the same job
export const REUSE_FLAG = '--reuse'

const print = (line) => process.stdout.write(`${line}\n`)

/**
 * @typedef {Record<string, unknown>} Wire fuse index -> state char code, plus `version`
 * @typedef {{ release: string; twin: string; releaseWire: Wire; twinWire: Wire }} Artifacts
 */

/** @param {Wire} wire @returns {[number, number][]} fuse index and state byte, in wire order */
function fuses(wire) {
  return Object.entries(wire)
    .filter(([key]) => /^\d+$/.test(key))
    .map(([key, state]) => [Number(key), Number(state)])
}

/** @param {number} index */
const fuseName = (index) => FuseV1Options[index] ?? `Fuse${index}`

/** @param {number} index @param {number} state */
function stateChar(index, state) {
  const char = STATES.get(state)
  if (char === undefined) throw new Error(`fuse ${fuseName(index)}: unknown state byte ${state}`)
  return char
}

/** @param {Wire} wire @returns {string} `<name>=<0|1|r>` for each fuse */
export function formatWire(wire) {
  return fuses(wire)
    .map(([index, state]) => `${fuseName(index)}=${stateChar(index, state)}`)
    .join(' ')
}

/**
 * Fails unless the twin differs from the release in the inspect fuse only, off in the release
 * and on in the twin.
 * @param {Wire} releaseWire
 * @param {Wire} twinWire
 * @returns {{ diff: string[] }}
 */
export function compareWires(releaseWire, twinWire) {
  const release = new Map(fuses(releaseWire))
  const twin = new Map(fuses(twinWire))
  const inspect = fuseName(INSPECT)
  /** @param {number} index @param {number | undefined} state */
  const show = (index, state) => (state === undefined ? 'absent' : stateChar(index, state))
  if (release.get(INSPECT) !== 48) {
    throw new Error(`release has ${inspect} ${show(INSPECT, release.get(INSPECT))}, not 0`)
  }
  const diff = []
  for (const index of new Set([...release.keys(), ...twin.keys()])) {
    const from = release.get(index)
    const to = twin.get(index)
    if (from === to) continue
    const states = `${show(index, from)}→${show(index, to)}`
    if (index !== INSPECT) throw new Error(`fuse ${fuseName(index)} differs (${states})`)
    if (to !== 49) throw new Error(`twin has ${inspect} ${states}, not 0→1`)
    diff.push(`${inspect} ${states}`)
  }
  if (diff.length === 0) throw new Error(`no fuse differs: the twin needs ${inspect} 0→1`)
  return { diff }
}

/** @param {string} dir @returns {string[]} every entry below `dir`, relative with `/` */
function entries(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => !entry.isDirectory())
    .map((entry) => {
      const path = relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/')
      if (!entry.isFile()) throw new Error(`not a regular file: ${join(dir, path)}`)
      return path
    })
}

/** @param {string} file */
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

/**
 * Compares every file of the two trees but the executable by sha256.
 * @param {string} releaseDir
 * @param {string} twinDir
 * @param {string} exeRelPath the executable, relative to each directory
 * @returns {Promise<{ compared: number; differing: string[] }>}
 */
export async function diffTrees(releaseDir, twinDir, exeRelPath) {
  const release = new Set(entries(releaseDir))
  const twin = new Set(entries(twinDir))
  const differing = []
  let compared = 0
  for (const path of [...new Set([...release, ...twin])].sort()) {
    if (path === exeRelPath) continue
    if (!twin.has(path)) differing.push(`${path} (release only)`)
    else if (!release.has(path)) differing.push(`${path} (twin only)`)
    else {
      compared++
      if (sha256(join(releaseDir, path)) !== sha256(join(twinDir, path))) differing.push(path)
    }
  }
  if (compared === 0) throw new Error(`no file compared between ${releaseDir} and ${twinDir}`)
  return { compared, differing }
}

// The comment the bundler writes above each module of an unminified chunk, naming its source
const MODULE_MARKER = /^\/\/ (node_modules\/|src\/|\\0)/
const EDITOR_MODULE = '// node_modules/monaco-editor/'

/**
 * Fails if a script the renderer page loads at start holds the code editor, which loads with the
 * first editor shown, or if a script holds no module comment to attribute its bytes by.
 * @param {string} rendererDir the built renderer, holding index.html
 * @returns {{ file: string; bytes: number; editorBytes: number }[]} each script the page loads
 */
export function checkStartScripts(rendererDir) {
  const html = readFileSync(join(rendererDir, 'index.html'), 'utf8')
  const files = [...html.matchAll(/\b(?:src|href)="([^"]+\.js)"/g)].map((match) => match[1])
  if (files.length === 0) throw new Error(`${rendererDir}/index.html loads no script`)
  return files.map((file) => {
    const text = readFileSync(join(rendererDir, file), 'utf8')
    const bytes = Buffer.byteLength(text)
    let editorBytes = 0
    let modules = 0
    let inEditor = false
    for (const line of text.split('\n')) {
      if (MODULE_MARKER.test(line)) {
        modules++
        inEditor = line.startsWith(EDITOR_MODULE)
      }
      // The line and its newline; the last line's missing newline overcounts by one at most
      if (inEditor) editorBytes += Buffer.byteLength(line) + 1
    }
    if (modules === 0) throw new Error(`${file}: no module comment to attribute its bytes by`)
    const share = ((100 * editorBytes) / bytes).toFixed(1)
    print(`renderer start script ${file}: ${bytes} bytes, code editor ${editorBytes} (${share}%)`)
    if (editorBytes > 0) throw new Error(`${file} loads the code editor at start`)
    return { file, bytes, editorBytes }
  })
}

/** @param {string} bin @param {string[]} args */
function run(bin, args) {
  const result = spawnSync(process.execPath, [bin, ...args], { cwd: ROOT, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`${bin} ${args.join(' ')} exited ${result.status}`)
}

/** @param {string[]} argv @param {string} releaseDir @returns {boolean} */
export function shouldReuse(argv, releaseDir) {
  return argv.includes(REUSE_FLAG) && existsSync(releaseDir)
}

/** @param {string[]} argv the script's arguments @returns {Promise<Artifacts>} */
export async function prepare(argv) {
  const platform = process.platform === 'win32' ? 'win' : 'linux'
  const releaseDir = join(ROOT, 'dist', `${platform}-unpacked`)
  const twinDir = join(ROOT, 'dist', 'e2e-twin')
  const { name } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const exeName = platform === 'win' ? `${name}.exe` : name

  if (shouldReuse(argv, releaseDir)) {
    const built = statSync(join(releaseDir, 'resources', 'app.asar')).mtime.toISOString()
    print(`release: reused ${relative(ROOT, releaseDir)} (built ${built})`)
  } else {
    // Built as from a clean checkout: no file of an older build survives
    rmSync(releaseDir, { recursive: true, force: true })
    run('node_modules/electron-vite/bin/electron-vite.js', ['build'])
    run('node_modules/electron-builder/cli.js', [
      '--dir',
      `--${platform}`,
      '--publish',
      'never',
      '-c.electronDist=node_modules/electron/dist'
    ])
    print('release: built')
  }
  checkStartScripts(join(ROOT, 'out', 'renderer'))
  const release = join(releaseDir, exeName)
  if (!existsSync(release)) {
    const listing = existsSync(releaseDir) ? readdirSync(releaseDir).join('\n  ') : '(absent)'
    throw new Error(`no ${exeName} in ${releaseDir}:\n  ${listing}`)
  }

  rmSync(twinDir, { recursive: true, force: true })
  cpSync(releaseDir, twinDir, { recursive: true, verbatimSymlinks: true })
  const twin = join(twinDir, exeName)
  await flipFuses(twin, { version: FuseVersion.V1, [INSPECT]: true })

  const releaseWire = await getCurrentFuseWire(release)
  const twinWire = await getCurrentFuseWire(twin)
  print(`fuses release: ${formatWire(releaseWire)}`)
  print(`fuses twin: ${formatWire(twinWire)}`)
  const { diff } = compareWires(releaseWire, twinWire)
  print(`fuse diff: ${diff.join(', ')} (${diff.length} fuse)`)

  const { compared, differing } = await diffTrees(releaseDir, twinDir, exeName)
  print(`twin files compared ${compared}, differing ${differing.length}`)
  if (differing.length > 0) throw new Error(`twin files differ:\n  ${differing.join('\n  ')}`)

  /** @type {Artifacts} */
  const artifacts = { release, twin, releaseWire, twinWire }
  const manifest = join(ROOT, 'dist', 'e2e-artifacts.json')
  writeFileSync(manifest, `${JSON.stringify(artifacts, null, 2)}\n`)
  print(`artifacts: ${manifest}`)
  return artifacts
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  prepare(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`e2e-prepare: FAILED: ${error.message}\n`)
    process.exitCode = 1
  })
}
