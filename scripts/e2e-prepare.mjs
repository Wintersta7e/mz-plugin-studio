// Prepares the packaged builds the end-to-end tests drive, from the repository root:
//   1. builds dist/<platform>-unpacked/ with the release configuration; with --reuse, reuses it
//      if present (for a build made earlier in the same job), and fails if a script the renderer
//      page loads at start holds the code editor (out/renderer, attributed by each script's
//      source map; prints each script's bytes and sources);
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
import path from 'node:path'
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

/**
@param {string} line
*/
const print = (line) => process.stdout.write(`${line}\n`)

/**
@param {unknown} value
@returns {value is Record<string, unknown>}
*/
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
@param {unknown} value
@returns {value is unknown[]}
*/
const isArray = (value) => Array.isArray(value)

// The order Array#sort uses without a compare function, for strings: by UTF-16 code unit
/**
@param {string} left
@param {string} right
*/
const byCodeUnit = (left, right) => {
  if (left < right) return -1
  return left > right ? 1 : 0
}

/**
@typedef {Record<string, unknown>} Wire fuse index -> state char code, plus `version`
@typedef {{ release: string; twin: string; releaseWire: Wire; twinWire: Wire }} Artifacts
*/

/**
@param {Wire} wire
@returns {[number, number][]} fuse index and state byte, in wire order
*/
function fuses(wire) {
  return Object.entries(wire)
    .filter(([key]) => /^\d+$/.test(key))
    .map(([key, state]) => [Number(key), Number(state)])
}

/**
@param {number} index
*/
const fuseName = (index) => FuseV1Options[index] ?? `Fuse${index}`

/**
@param {number} index
@param {number} state
*/
function stateChar(index, state) {
  const char = STATES.get(state)
  if (char === undefined) throw new Error(`fuse ${fuseName(index)}: unknown state byte ${state}`)
  return char
}

/**
@param {number} index
@param {number | undefined} state
*/
const show = (index, state) => (state === undefined ? 'absent' : stateChar(index, state))

/**
@param {Wire} wire
@returns {string} `<name>=<0|1|r>` for each fuse
*/
export function formatWire(wire) {
  return fuses(wire)
    .map(([index, state]) => `${fuseName(index)}=${stateChar(index, state)}`)
    .join(' ')
}

/**
Fails unless the twin differs from the release in the inspect fuse only, off in the release
and on in the twin.
@param {Wire} releaseWire
@param {Wire} twinWire
@returns {{ diff: string[] }}
*/
export function compareWires(releaseWire, twinWire) {
  const release = new Map(fuses(releaseWire))
  const twin = new Map(fuses(twinWire))
  const inspect = fuseName(INSPECT)
  if (release.get(INSPECT) !== 48) {
    throw new Error(`release has ${inspect} ${show(INSPECT, release.get(INSPECT))}, not 0`)
  }
  /**
  @type {string[]}
  */
  const diff = []
  const indexes = new Set([...release.keys(), ...twin.keys()])
  for (const index of indexes) {
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

/**
@param {string} directory
@returns {string[]} every entry below `directory`, relative with `/`
*/
function entries(directory) {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => !entry.isDirectory())
    .map((entry) => {
      const relativePath = path
        .relative(directory, path.join(entry.parentPath, entry.name))
        .split(path.sep)
        .join('/')
      if (!entry.isFile())
        throw new Error(`not a regular file: ${path.join(directory, relativePath)}`)
      return relativePath
    })
}

/**
@param {string} file
*/
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

/**
Compares every file of the two trees but the executable by sha256.
@param {string} releaseDirectory
@param {string} twinDirectory
@param {string} executablePath the executable, relative to each directory
@returns {Promise<{ compared: number; differing: string[] }>}
*/
export async function diffTrees(releaseDirectory, twinDirectory, executablePath) {
  const releaseFiles = entries(releaseDirectory)
  const twinFiles = entries(twinDirectory)
  const release = new Set(releaseFiles)
  const twin = new Set(twinFiles)
  /**
  @type {string[]}
  */
  const differing = []
  let compared = 0
  const all = [...new Set([...releaseFiles, ...twinFiles])].toSorted(byCodeUnit)
  for (const file of all) {
    if (file === executablePath) continue
    if (!twin.has(file)) differing.push(`${file} (release only)`)
    else if (release.has(file)) {
      compared++
      const isSame =
        sha256(path.join(releaseDirectory, file)) === sha256(path.join(twinDirectory, file))
      if (!isSame) differing.push(file)
    } else {
      differing.push(`${file} (twin only)`)
    }
  }
  if (compared === 0) {
    throw new Error(`no file compared between ${releaseDirectory} and ${twinDirectory}`)
  }
  return { compared, differing }
}

// The renderer bundle is minified with hidden source maps: each script's .map lists the modules
// it holds, and a source under this path is the code editor
const EDITOR_SOURCE = 'node_modules/monaco-editor/'

/**
The sources a script's source map lists; fails when the map is missing or lists none.
@param {string} rendererDirectory
@param {string} file the script, relative to the page
@returns {string[]}
*/
function mapSources(rendererDirectory, file) {
  const mapFile = path.join(rendererDirectory, `${file}.map`)
  if (!existsSync(mapFile)) throw new Error(`${file}: no source map to attribute its modules by`)
  /**
  @type {unknown}
  */
  const map = JSON.parse(readFileSync(mapFile, 'utf8'))
  const { sources } = isRecord(map) ? map : {}
  const listed = isArray(sources) ? sources.filter((source) => typeof source === 'string') : []
  if (listed.length === 0) throw new Error(`${file}.map lists no source`)
  return listed
}

/**
Fails if a script the renderer page loads at start holds the code editor, which loads with the
first editor shown, or if a script has no source map to attribute its modules by.
@param {string} rendererDirectory the built renderer, holding index.html
@returns {{ file: string; bytes: number; sources: number; editorSources: number }[]} each script
  the page loads
*/
export function checkStartScripts(rendererDirectory) {
  const html = readFileSync(path.join(rendererDirectory, 'index.html'), 'utf8')
  /**
  @type {string[]}
  */
  const files = []
  for (const [, file = ''] of html.matchAll(/\b(?:src|href)="([^"]+\.js)"/g)) files.push(file)
  if (files.length === 0) throw new Error(`${rendererDirectory}/index.html loads no script`)
  return files.map((file) => {
    const { size: bytes } = statSync(path.join(rendererDirectory, file))
    const sources = mapSources(rendererDirectory, file)
    const editorSources = sources.filter((source) => source.includes(EDITOR_SOURCE)).length
    print(
      `renderer start script ${file}: ${bytes} bytes, sources ${sources.length}, ` +
        `code editor sources ${editorSources}`
    )
    if (editorSources > 0) throw new Error(`${file} loads the code editor at start`)
    return { file, bytes, sources: sources.length, editorSources }
  })
}

/**
@param {string} bin
@param {string[]} args
*/
function run(bin, args) {
  const result = spawnSync(process.execPath, [bin, ...args], { cwd: ROOT, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`${bin} ${args.join(' ')} exited ${result.status}`)
}

/**
@param {string[]} argv
@param {string} releaseDirectory
@returns {boolean}
*/
export function shouldReuse(argv, releaseDirectory) {
  return argv.includes(REUSE_FLAG) && existsSync(releaseDirectory)
}

/**
@param {string[]} argv the script's arguments
@returns {Promise<Artifacts>}
*/
export async function prepare(argv) {
  const platform = process.platform === 'win32' ? 'win' : 'linux'
  const releaseDirectory = path.join(ROOT, 'dist', `${platform}-unpacked`)
  const twinDirectory = path.join(ROOT, 'dist', 'e2e-twin')
  /**
  @type {unknown}
  */
  const manifest = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const { name } = isRecord(manifest) ? manifest : {}
  if (typeof name !== 'string') throw new TypeError('package.json: name is not a string')
  const exeName = platform === 'win' ? `${name}.exe` : name

  if (shouldReuse(argv, releaseDirectory)) {
    const asar = path.join(releaseDirectory, 'resources', 'app.asar')
    const built = statSync(asar).mtime.toISOString()
    print(`release: reused ${path.relative(ROOT, releaseDirectory)} (built ${built})`)
  } else {
    // Built as from a clean checkout: no file of an older build survives
    rmSync(releaseDirectory, { recursive: true, force: true })
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
  checkStartScripts(path.join(ROOT, 'out', 'renderer'))
  const release = path.join(releaseDirectory, exeName)
  if (!existsSync(release)) {
    const listing = existsSync(releaseDirectory)
      ? readdirSync(releaseDirectory).join('\n  ')
      : '(absent)'
    throw new Error(`no ${exeName} in ${releaseDirectory}:\n  ${listing}`)
  }

  rmSync(twinDirectory, { recursive: true, force: true })
  cpSync(releaseDirectory, twinDirectory, { recursive: true, verbatimSymlinks: true })
  const twin = path.join(twinDirectory, exeName)
  await flipFuses(twin, { version: FuseVersion.V1, [INSPECT]: true })

  const releaseWire = await getCurrentFuseWire(release)
  const twinWire = await getCurrentFuseWire(twin)
  print(`fuses release: ${formatWire(releaseWire)}`)
  print(`fuses twin: ${formatWire(twinWire)}`)
  const { diff } = compareWires(releaseWire, twinWire)
  print(`fuse diff: ${diff.join(', ')} (${diff.length} fuse)`)

  const { compared, differing } = await diffTrees(releaseDirectory, twinDirectory, exeName)
  print(`twin files compared ${compared}, differing ${differing.length}`)
  if (differing.length > 0) throw new Error(`twin files differ:\n  ${differing.join('\n  ')}`)

  /**
  @type {Artifacts}
  */
  const artifacts = { release, twin, releaseWire, twinWire }
  const artifactsFile = path.join(ROOT, 'dist', 'e2e-artifacts.json')
  writeFileSync(artifactsFile, `${JSON.stringify(artifacts, undefined, 2)}\n`)
  print(`artifacts: ${artifactsFile}`)
  return artifacts
}

// Prepares when run as a script, not when imported; a failure prints its message and sets exit 1
async function runFromCommandLine() {
  try {
    await prepare(process.argv.slice(2))
  } catch (/** @type {unknown} */ error) {
    const { message } = isRecord(error) ? error : { message: undefined }
    process.stderr.write(`e2e-prepare: FAILED: ${String(message)}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runFromCommandLine()
}
