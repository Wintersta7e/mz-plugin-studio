// Packaging and dependency policy checks. Exit 0 = pass, 1 = any failure.
//   node scripts/ci-policy.mjs package <app.asar>
//   node scripts/ci-policy.mjs runtime-deps        (run from the repository root)
//   node scripts/ci-policy.mjs toolchain [--electron]
//   node scripts/ci-policy.mjs needs               (reads NEEDS_JSON)
//   node scripts/ci-policy.mjs osv-ignores
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire, isBuiltin } from 'node:module'
import { join, relative, resolve, sep } from 'node:path'

const NODE_MODULES_BUDGET = 2097152

// Top-level entries the packaged app may hold, with their kind.
const ALLOWED_TOP_LEVEL = new Map([
  ['out', 'directory'],
  ['resources', 'directory'],
  ['node_modules', 'directory'],
  ['package.json', 'file'],
  ['LICENSE', 'file'],
  ['THIRD_PARTY_LICENSES.md', 'file']
])
const REQUIRED_FILES = ['LICENSE', 'THIRD_PARTY_LICENSES.md']

const SOURCE_ROOTS = ['src/main', 'src/preload', 'src/shared']
const SOURCE_EXTENSION = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/
const DECLARATION_FILE = /\.d\.(ts|mts|cts)$/

// Every pattern is line-anchored or call-shaped. An import clause may hold comments but not
// the `import`/`export` of a following statement, so a misread clause can only add a package
// to the value set; a `from '<package>'` that no pattern reads fails the check with its
// file:line. `import(…)`, `require(…)` and `import '…'` are read in their one-line form only.
const COMMENT = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g
const FROM_IMPORT = new RegExp(
  String.raw`^[ \t]*(import|export)[ \t]+(type[ \t]+)?` +
    String.raw`((?:${COMMENT.source}|(?!\b(?:import|export)\b)[\w$\s{},*])*?)` +
    String.raw`\s*from[ \t]*(['"])([^'"\n]+)\4`,
  'gm'
)
const BARE_IMPORT = /^[ \t]*import[ \t]*(['"])([^'"\n]+)\1/gm
const CALL_IMPORT = /\b(?:import|require)\([ \t]*(['"])([^'"\n]+)\1[ \t]*\)/g
const FROM_SPECIFIER = /\bfrom\s*(['"])([^'"\n]+)\1/g

const CARET_RANGE = /^\^(\d+)\.(\d+)\.(\d+)$/
const OSV_CONFIG = 'osv-scanner.toml'
const OSV_MAX_DAYS = 90
const DAY_MS = 86_400_000

const SUBCOMMANDS = {
  package: checkPackage,
  'runtime-deps': checkRuntimeDeps,
  toolchain: checkToolchain,
  needs: checkNeeds,
  'osv-ignores': checkOsvIgnores
}

function print(line) {
  process.stdout.write(`${line}\n`)
}

function printError(line) {
  process.stderr.write(`${line}\n`)
}

function usage() {
  printError(
    'usage: ci-policy <package <app.asar> | runtime-deps | toolchain [--electron] | needs | osv-ignores>'
  )
  return 1
}

function listLine(label, items) {
  return `${label} ${items.length}:${items.length ? ` ${items.join(', ')}` : ''}`
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Returns the read result, or undefined after printing why the input could not be read.
function readInput(path, read) {
  try {
    return read(path)
  } catch (error) {
    printError(
      error.code === 'ENOENT' ? `not found: ${path}` : `unreadable: ${path} (${error.code})`
    )
    return undefined
  }
}

// Asar layout: u32le 4, u32le header size H, u32le H - 4, i32le JSON length L, JSON at 16.
function parseAsarHeader(buffer) {
  if (buffer.length < 16) return undefined
  const size = buffer.readUInt32LE(4)
  const jsonLength = buffer.readInt32LE(12)
  if (
    buffer.readUInt32LE(0) !== 4 ||
    buffer.readUInt32LE(8) !== size - 4 ||
    jsonLength <= 0 ||
    16 + jsonLength > 8 + size ||
    8 + size > buffer.length
  ) {
    return undefined
  }
  try {
    const header = JSON.parse(buffer.toString('utf8', 16, 16 + jsonLength))
    return isObject(header) && isObject(header.files) ? header : undefined
  } catch {
    return undefined
  }
}

function collectLeaves(directory, segments, leaves, problems) {
  for (const [name, node] of Object.entries(directory.files)) {
    const path = [...segments, name]
    if (isObject(node) && 'files' in node && isObject(node.files)) {
      collectLeaves(node, path, leaves, problems)
    } else if (isObject(node) && !('files' in node) && typeof node.size === 'number') {
      leaves.push({ path, size: node.size })
    } else if (isObject(node) && !('files' in node) && typeof node.link === 'string') {
      leaves.push({ path, size: 0 })
    } else {
      problems.push(`malformed entry: ${path.join('/')}`)
    }
  }
}

function packageNames(leaves) {
  const names = new Set()
  for (const { path } of leaves) {
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i] !== 'node_modules') continue
      const name = path[i + 1]
      names.add(name.startsWith('@') && i + 2 < path.length ? `${name}/${path[i + 2]}` : name)
    }
  }
  return [...names].sort()
}

function checkPackage(args) {
  if (args.length !== 1) return usage()
  const [path] = args
  const buffer = readInput(path, readFileSync)
  if (buffer === undefined) return 1
  print(`ci-policy package: ${path}`)
  const header = parseAsarHeader(buffer)
  if (!header) {
    print('FAIL not an asar header')
    print('ci-policy package: FAILED (1 problems)')
    return 1
  }

  const leaves = []
  const problems = []
  collectLeaves(header, [], leaves, problems)
  const bytesUnder = (top) =>
    leaves.filter((leaf) => leaf.path[0] === top).reduce((sum, leaf) => sum + leaf.size, 0)
  const total = leaves.reduce((sum, leaf) => sum + leaf.size, 0)
  const nodeModulesBytes = bytesUnder('node_modules')

  const topLevel = Object.entries(header.files).map(([name, node]) => ({
    name,
    kind: isObject(node) && 'files' in node ? 'directory' : 'file'
  }))
  const display = ({ name, kind }) => (kind === 'directory' ? `${name}/` : name)
  for (const entry of topLevel) {
    if (ALLOWED_TOP_LEVEL.get(entry.name) !== entry.kind) {
      problems.push(`disallowed top-level entry: ${display(entry)}`)
    }
  }
  for (const name of REQUIRED_FILES) {
    if (!topLevel.some((entry) => entry.name === name && entry.kind === 'file')) {
      problems.push(`missing: ${name}`)
    }
  }
  if (nodeModulesBytes > NODE_MODULES_BUDGET) {
    problems.push(`node_modules/ ${nodeModulesBytes} bytes > budget ${NODE_MODULES_BUDGET}`)
  }
  if (leaves.length === 0) problems.push('0 entries scanned')

  print(
    `entries ${leaves.length}; total ${total} bytes; out/ ${bytesUnder('out')} bytes; ` +
      `node_modules/ ${nodeModulesBytes} bytes (budget ${NODE_MODULES_BUDGET})`
  )
  print(`top-level: ${topLevel.map(display).sort().join(', ')}`)
  print(listLine('node_modules packages', packageNames(leaves)))
  for (const problem of problems) print(`FAIL ${problem}`)
  print(`ci-policy package: ${problems.length ? `FAILED (${problems.length} problems)` : 'ok'}`)
  return problems.length ? 1 : 0
}

// Source files under one root, sorted; a missing root contributes none. Returns undefined
// after printing why the root could not be read.
function listSources(root) {
  let entries
  try {
    entries = readdirSync(root, { recursive: true, withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    printError(`unreadable: ${root} (${error.code})`)
    return undefined
  }
  return entries
    .filter((entry) => entry.isFile() && SOURCE_EXTENSION.test(entry.name))
    .filter((entry) => !DECLARATION_FILE.test(entry.name))
    .map((entry) => relative('.', join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort()
}

// TypeScript and esbuild elide `import type …` and a clause of only `{ type … }` items;
// `import type from '…'` imports a default export named `type`.
function isTypeOnly(typeKeyword, clause) {
  const bindings = clause.replace(COMMENT, ' ').trim()
  if (typeKeyword) return bindings !== ''
  const named = /^\{([^{}]*)\}$/.exec(bindings)
  if (!named) return false
  const items = named[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return items.length > 0 && items.every((item) => /^type\s/.test(item))
}

function packageOf(specifier) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return undefined
  if (specifier.startsWith('node:') || isBuiltin(specifier)) return undefined
  if (specifier === 'electron' || specifier.startsWith('electron/')) return undefined
  const segments = specifier.split('/')
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0]
}

// Value specifiers in one source, and the lines of every `from '<package>'` outside a
// statement FROM_IMPORT read.
function readImports(source) {
  const specifiers = []
  const statements = []
  for (const match of source.matchAll(FROM_IMPORT)) {
    statements.push([match.index, match.index + match[0].length])
    if (!isTypeOnly(match[2], match[3])) specifiers.push(match[5])
  }
  for (const match of source.matchAll(BARE_IMPORT)) specifiers.push(match[2])
  for (const match of source.matchAll(CALL_IMPORT)) specifiers.push(match[2])
  const unclassified = [...source.matchAll(FROM_SPECIFIER)]
    .filter((match) => packageOf(match[2]) !== undefined)
    .filter(
      (match) => !statements.some(([start, end]) => match.index >= start && match.index < end)
    )
    .map((match) => source.slice(0, match.index).split('\n').length)
  return { specifiers, unclassified }
}

function checkRuntimeDeps(args) {
  if (args.length !== 0) return usage()
  const manifestText = readInput('package.json', (path) => readFileSync(path, 'utf8'))
  if (manifestText === undefined) return 1
  let manifest
  try {
    manifest = JSON.parse(manifestText)
  } catch {
    printError('unreadable: package.json (not JSON)')
    return 1
  }
  const dependencies = manifest.dependencies ?? {}
  if (!isObject(dependencies)) {
    printError('unreadable: package.json (dependencies is not an object)')
    return 1
  }

  const counts = []
  let scanned = 0
  const imported = new Set()
  const unclassified = []
  for (const root of SOURCE_ROOTS) {
    const files = listSources(root)
    if (files === undefined) return 1
    counts.push(`${root} ${files.length}`)
    scanned += files.length
    for (const file of files) {
      const source = readInput(file, (path) => readFileSync(path, 'utf8'))
      if (source === undefined) return 1
      const imports = readImports(source)
      for (const specifier of imports.specifiers) {
        const name = packageOf(specifier)
        if (name) imported.add(name)
      }
      for (const line of imports.unclassified) unclassified.push(`${file}:${line}`)
    }
  }

  const declared = Object.keys(dependencies).sort()
  const values = [...imported].sort()
  const unused = declared.filter((name) => !imported.has(name))
  const undeclared = values.filter((name) => !Object.hasOwn(dependencies, name))
  print(`ci-policy runtime-deps: files scanned ${scanned} (${counts.join(', ')})`)
  print(listLine('dependencies', declared))
  print(listLine('value imports', values))
  print(listLine('in dependencies, not imported', unused))
  print(listLine('imported, not in dependencies', undeclared))
  print(listLine('unclassified imports', unclassified))
  const failed =
    scanned === 0 || unused.length > 0 || undeclared.length > 0 || unclassified.length > 0
  print(`ci-policy runtime-deps: ${failed ? 'FAILED' : 'ok'}`)
  return failed ? 1 : 0
}

// Parsed JSON from a file, or undefined after printing why it could not be read.
function readJson(path) {
  const text = readInput(path, (file) => readFileSync(file, 'utf8'))
  if (text === undefined) return undefined
  try {
    return JSON.parse(text)
  } catch {
    printError(`unreadable: ${path} (not JSON)`)
    return undefined
  }
}

function versionParts(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(version))
  return match ? match.slice(1, 4).map(Number) : undefined
}

// ^A.B.C: the same major, and minor.patch at or above B.C.
function satisfiesCaret(version, wanted) {
  const [major, minor, patch] = version
  const [wantMajor, wantMinor, wantPatch] = wanted
  return major === wantMajor && (minor > wantMinor || (minor === wantMinor && patch >= wantPatch))
}

// The Node version the installed Electron binary bundles, or why it could not be read.
function electronNodeVersion() {
  let binary
  try {
    binary = createRequire(resolve('package.json'))('electron')
  } catch (error) {
    return { problem: `electron could not be loaded (${String(error.message).split('\n')[0]})` }
  }
  if (typeof binary !== 'string') return { problem: 'electron did not export a binary path' }
  const result = spawnSync(binary, ['-p', 'process.versions.node'], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    encoding: 'utf8'
  })
  const version = (result.stdout ?? '').trim()
  if (result.status !== 0 || !versionParts(version)) {
    const why = result.error ? result.error.message : `exit ${result.status}`
    return { problem: `electron did not print its Node version (${why})` }
  }
  return { version }
}

function checkToolchain(args) {
  const electron = args.length === 1 && args[0] === '--electron'
  if (args.length !== 0 && !electron) return usage()
  const manifest = readJson('package.json')
  if (manifest === undefined) return 1
  const types = readJson('node_modules/@types/node/package.json')
  if (types === undefined) return 1

  const problems = []
  const engines =
    isObject(manifest) && isObject(manifest.engines) ? manifest.engines.node : undefined
  const range = typeof engines === 'string' ? CARET_RANGE.exec(engines) : null
  const wanted = range ? range.slice(1, 4).map(Number) : undefined
  print(`ci-policy toolchain: engines.node ${engines ?? '(absent)'}`)
  if (!wanted) {
    problems.push(
      engines === undefined
        ? 'engines.node absent'
        : `engines.node ${engines} is not ^major.minor.patch`
    )
  }
  print(`ci-policy toolchain: node ${process.version}`)
  if (wanted && !satisfiesCaret(versionParts(process.version), wanted)) {
    problems.push(`node ${process.version} does not satisfy ${engines}`)
  }
  const typesVersion = isObject(types) ? types.version : undefined
  print(`ci-policy toolchain: @types/node ${typesVersion}`)
  if (wanted && versionParts(typesVersion)?.[0] !== wanted[0]) {
    problems.push(`@types/node ${typesVersion} is not major ${wanted[0]}`)
  }
  if (electron) {
    const result = electronNodeVersion()
    if (result.problem) {
      problems.push(result.problem)
    } else {
      print(`ci-policy toolchain: electron node ${result.version}`)
      if (wanted && versionParts(result.version)[0] !== wanted[0]) {
        problems.push(`electron node ${result.version} is not major ${wanted[0]}`)
      }
    }
  }

  for (const problem of problems) print(`FAIL ${problem}`)
  print(`ci-policy toolchain: ${problems.length ? `FAILED (${problems.length} problems)` : 'ok'}`)
  return problems.length ? 1 : 0
}

// NEEDS_JSON is the aggregate job's `toJSON(needs)`: { "<job>": { "result": "…" }, … }.
function checkNeeds(args) {
  if (args.length !== 0) return usage()
  const text = process.env.NEEDS_JSON
  if (text === undefined) {
    printError('not set: NEEDS_JSON')
    return 1
  }
  let needs
  try {
    needs = JSON.parse(text)
  } catch {
    printError('unreadable: NEEDS_JSON (not JSON)')
    return 1
  }
  if (!isObject(needs)) {
    printError('unreadable: NEEDS_JSON (not an object)')
    return 1
  }

  const problems = []
  const jobs = Object.entries(needs)
  for (const [job, need] of jobs) {
    const result = isObject(need) ? need.result : undefined
    print(`ci-policy needs: ${job} ${result}`)
    if (result !== 'success') problems.push(`${job} ${result}`)
  }
  print(`ci-policy needs: jobs ${jobs.length}`)
  if (jobs.length === 0) problems.push('0 jobs')
  for (const problem of problems) print(`FAIL ${problem}`)
  print(`ci-policy needs: ${problems.length ? `FAILED (${problems.length} problems)` : 'ok'}`)
  return problems.length ? 1 : 0
}

// The only keys an [[IgnoredVulns]] table may hold, each in this one form.
const OSV_KEYS = {
  id: /^id = "([^"\\]+)"$/,
  ignoreUntil: /^ignoreUntil = (\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}:\d{2}Z)?$/,
  reason: /^reason = "([^"\\]*)"$/
}

function checkOsvIgnores(args) {
  if (args.length !== 0) return usage()
  const text = readInput(OSV_CONFIG, (path) => readFileSync(path, 'utf8'))
  if (text === undefined) return 1

  const problems = []
  const entries = []
  let entry
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    const where = `${OSV_CONFIG}:${index + 1}`
    if (line === '' || line.startsWith('#')) return
    if (line === '[[IgnoredVulns]]') {
      entry = { where, keys: {} }
      entries.push(entry)
      return
    }
    const key = /^(\w+) = /.exec(line)?.[1]
    const match = key && Object.hasOwn(OSV_KEYS, key) ? OSV_KEYS[key].exec(line) : null
    if (!entry || !match) {
      problems.push(`${where}: unexpected line: ${line}`)
    } else if (Object.hasOwn(entry.keys, key)) {
      problems.push(`${where}: duplicate ${key}`)
    } else {
      entry.keys[key] = match[1]
    }
  })

  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  for (const { where, keys } of entries) {
    for (const key of Object.keys(OSV_KEYS)) {
      if (!Object.hasOwn(keys, key)) problems.push(`${where}: missing ${key}`)
    }
    if (keys.reason === '') problems.push(`${where}: empty reason`)
    if (keys.ignoreUntil === undefined) continue
    const day = Date.parse(`${keys.ignoreUntil}T00:00:00Z`)
    if (Number.isNaN(day) || new Date(day).toISOString().slice(0, 10) !== keys.ignoreUntil) {
      problems.push(`${where}: not a date: ${keys.ignoreUntil}`)
    } else if (day > today + OSV_MAX_DAYS * DAY_MS) {
      problems.push(
        `${where}: ignoreUntil ${keys.ignoreUntil} is more than ${OSV_MAX_DAYS} days ahead`
      )
    }
  }

  const expiries = entries.flatMap(({ keys }) => keys.ignoreUntil ?? []).sort()
  print(`ci-policy osv-ignores: entries ${entries.length}`)
  print(`ci-policy osv-ignores: nearest expiry ${expiries[0] ?? 'none'}`)
  for (const problem of problems) print(`FAIL ${problem}`)
  print(`ci-policy osv-ignores: ${problems.length ? `FAILED (${problems.length} problems)` : 'ok'}`)
  return problems.length ? 1 : 0
}

const [command, ...rest] = process.argv.slice(2)
const run = Object.hasOwn(SUBCOMMANDS, command ?? '') ? SUBCOMMANDS[command] : usage
process.exitCode = run(rest)
