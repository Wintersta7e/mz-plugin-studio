// Packaging and dependency policy checks. Exit 0 = pass, 1 = any failure.
//   node scripts/ci-policy.mjs package <app.asar>
//   node scripts/ci-policy.mjs runtime-deps        (run from the repository root)
import { readFileSync, readdirSync } from 'node:fs'
import { isBuiltin } from 'node:module'
import { join, relative, sep } from 'node:path'

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

// Every pattern is line-anchored or call-shaped: a misread can only add a package to the
// value set, never drop one.
const FROM_IMPORT =
  /^[ \t]*(import|export)[ \t]+(type[ \t]+)?([\w$\s{},*]*?)\s*from[ \t]*(['"])([^'"\n]+)\4/gm
const BARE_IMPORT = /^[ \t]*import[ \t]*(['"])([^'"\n]+)\1/gm
const CALL_IMPORT = /\b(?:import|require)\([ \t]*(['"])([^'"\n]+)\1[ \t]*\)/g

const SUBCOMMANDS = { package: checkPackage, 'runtime-deps': checkRuntimeDeps }

function print(line) {
  process.stdout.write(`${line}\n`)
}

function printError(line) {
  process.stderr.write(`${line}\n`)
}

function usage() {
  printError('usage: ci-policy <package <app.asar> | runtime-deps>')
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

// TypeScript and esbuild elide `import type …` and a clause of only `{ type … }` items.
function isTypeOnly(typeKeyword, clause) {
  if (typeKeyword) return true
  const named = /^\{([^{}]*)\}$/.exec(clause.trim())
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

function valueSpecifiers(source) {
  const specifiers = []
  for (const match of source.matchAll(FROM_IMPORT)) {
    if (!isTypeOnly(match[2], match[3])) specifiers.push(match[5])
  }
  for (const match of source.matchAll(BARE_IMPORT)) specifiers.push(match[2])
  for (const match of source.matchAll(CALL_IMPORT)) specifiers.push(match[2])
  return specifiers
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
  for (const root of SOURCE_ROOTS) {
    const files = listSources(root)
    if (files === undefined) return 1
    counts.push(`${root} ${files.length}`)
    scanned += files.length
    for (const file of files) {
      const source = readInput(file, (path) => readFileSync(path, 'utf8'))
      if (source === undefined) return 1
      for (const specifier of valueSpecifiers(source)) {
        const name = packageOf(specifier)
        if (name) imported.add(name)
      }
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
  const failed = scanned === 0 || unused.length > 0 || undeclared.length > 0
  print(`ci-policy runtime-deps: ${failed ? 'FAILED' : 'ok'}`)
  return failed ? 1 : 0
}

const [command, ...rest] = process.argv.slice(2)
const run = Object.hasOwn(SUBCOMMANDS, command ?? '') ? SUBCOMMANDS[command] : usage
process.exitCode = run(rest)
