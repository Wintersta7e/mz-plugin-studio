// Packaging and dependency policy checks. Exit 0 = pass, 1 = any failure.
//   node scripts/ci-policy.mjs package <app.asar>
//   node scripts/ci-policy.mjs runtime-deps        (run from the repository root)
//   node scripts/ci-policy.mjs toolchain [--electron]
//   node scripts/ci-policy.mjs needs               (reads NEEDS_JSON)
//   node scripts/ci-policy.mjs osv-ignores
//   node scripts/ci-policy.mjs fuses <executable>
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire, isBuiltin } from 'node:module'
import path from 'node:path'

const NODE_MODULES_BUDGET = 2_097_152

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
const SOURCE_EXTENSION = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/
const DECLARATION_FILE = /\.d\.(?:ts|mts|cts)$/

// Every statement read is line-anchored or call-shaped. An import clause may hold comments but
// not the `import`/`export` of a following statement, so a misread clause can only add a
// package to the value set; a `from '<package>'` that no statement reads fails the check with
// its file:line. `import(…)`, `require(…)` and `import '…'` are read in their one-line form only.
const COMMENT = /\/\/[^\n]*(?![^\n])|\/\*[\s\S]*?\*\//g
const BARE_IMPORT = /^[ \t]*import[ \t]*(['"])([^'"\n]+)\1/gm
const CALL_IMPORT = /\b(?:import|require)\([ \t]*(['"])([^'"\n]+)\1[ \t]*\)/g
const FROM_SPECIFIER = /\bfrom\s*(['"])([^'"\n]+)\1/g

// The characters a `… from '…'` statement is read by, one at a time.
const BLANK = /[ \t]/
const SPACE = /\s/
const WORD = /\w/
const CLAUSE_CHAR = /[\w$\s{},*]/
const QUOTE = /['"]/
const SOURCE_CHAR = /[^'"\n]/
const COMMENT_CHAR = /[^\n]/
const LINE_CHAR = /[^\n\r\u{2028}\u{2029}]/u
const KEYWORDS = ['import', 'export']
const KEYWORD_LENGTH = 6

const CARET_RANGE = /^\^(\d+)\.(\d+)\.(\d+)$/
const VERSION = /^v?(\d+)\.(\d+)\.(\d+)/
const OSV_CONFIG = 'osv-scanner.toml'
const OSV_MAX_DAYS = 90
const DAY_MS = 86_400_000
const NOT_JSON = Symbol('not JSON')

// Fuse wire: sentinel, version byte, length byte, then one state byte per fuse.
const FUSE_SENTINEL = Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX', 'latin1')
const FUSE_STATES = new Map([
  [0x30, 'disabled'],
  [0x31, 'enabled'],
  [0x72, 'removed'],
  [0x90, 'inherit']
])
const FUSE_NAMES = [
  'RunAsNode',
  'EnableCookieEncryption',
  'EnableNodeOptionsEnvironmentVariable',
  'EnableNodeCliInspectArguments',
  'EnableEmbeddedAsarIntegrityValidation',
  'OnlyLoadAppFromAsar',
  'LoadBrowserProcessSpecificV8Snapshot',
  'GrantFileProtocolExtraPrivileges',
  'WasmTrapHandlers'
]
// The states the packaged app must carry, by wire index; the others keep Electron's default.
const REQUIRED_FUSES = new Map([
  [0, 'disabled'],
  [1, 'enabled'],
  [2, 'disabled'],
  [3, 'disabled'],
  [4, 'enabled'],
  [5, 'enabled'],
  [7, 'enabled']
])
const FUSE_MIN_LENGTH = 8

// The only keys an [[IgnoredVulns]] table may hold, each in this one form.
const OSV_KEYS = new Map([
  ['id', /^id = "([^"\\]+)"$/],
  ['ignoreUntil', /^ignoreUntil = (\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}:\d{2}Z)?$/],
  ['reason', /^reason = "([^"\\]*)"$/]
])

const SUBCOMMANDS = new Map([
  ['package', checkPackage],
  ['runtime-deps', checkRuntimeDependencies],
  ['toolchain', checkToolchain],
  ['needs', checkNeeds],
  ['osv-ignores', checkOsvIgnores],
  ['fuses', checkFuses]
])

/**
@typedef {{ segments: string[], size: number }} Leaf
@typedef {{ name: string, kind: string }} TopLevelEntry
@typedef {{ clauseEnd: number, specifier: string, end: number }} ClauseSource
@typedef {{ start: number, end: number, isTypeKeyword: boolean, clause: string, specifier: string }} FromStatement
@typedef {{ counts: string[], scanned: number, imported: Set<string>, unclassified: string[] }} Scan
@typedef {[number, number, number]} VersionParts
@typedef {{ where: string, keys: Map<string, string> }} OsvEntry
@typedef {{ version: number, states: Buffer }} FuseWire
*/

/**
@param {string} line
*/
function print(line) {
  process.stdout.write(`${line}\n`)
}

/**
@param {string} line
*/
function printError(line) {
  process.stderr.write(`${line}\n`)
}

function usage() {
  printError(
    'usage: ci-policy <package <app.asar> | runtime-deps | toolchain [--electron] | needs | osv-ignores | fuses <executable>>'
  )
  return 1
}

/**
Prints each problem and the verdict line of one subcommand; returns its exit code.
@param {string} name
@param {readonly string[]} problems
*/
function finish(name, problems) {
  for (const problem of problems) print(`FAIL ${problem}`)
  const verdict = problems.length > 0 ? `FAILED (${problems.length} problems)` : 'ok'
  print(`ci-policy ${name}: ${verdict}`)
  return problems.length > 0 ? 1 : 0
}

/**
@param {string} label
@param {readonly string[]} items
*/
function listLine(label, items) {
  const list = items.length > 0 ? ` ${items.join(', ')}` : ''
  return `${label} ${items.length}:${list}`
}

/**
@param {unknown} value
@returns {value is Record<string, unknown>}
*/
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
The fields of a JSON object or a thrown error; anything else has none.
@param {unknown} value
@returns {Record<string, unknown>}
*/
const fieldsOf = (value) => (isObject(value) ? value : {})

/**
@param {string} text
@returns {unknown} the parsed value, or NOT_JSON
*/
function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return NOT_JSON
  }
}

/**
The read result, or undefined after printing why the input could not be read.
@template T
@param {string} file
@param {(file: string) => T} read
@returns {T | undefined}
*/
function readInput(file, read) {
  /**
  @type {T | undefined}
  */
  let result
  try {
    result = read(file)
  } catch (error) {
    const { code } = fieldsOf(error)
    printError(code === 'ENOENT' ? `not found: ${file}` : `unreadable: ${file} (${String(code)})`)
  }
  return result
}

/**
Parsed JSON from a file, or undefined after printing why it could not be read.
@param {string} file
@returns {unknown}
*/
function readJson(file) {
  const text = readInput(file, (input) => readFileSync(input, 'utf8'))
  const value = text === undefined ? NOT_JSON : parseJson(text)
  if (text !== undefined && value === NOT_JSON) printError(`unreadable: ${file} (not JSON)`)
  return value === NOT_JSON ? undefined : value
}

// The order Array#sort uses without a compare function, for strings: by UTF-16 code unit
/**
@param {string} left
@param {string} right
*/
function byCodeUnit(left, right) {
  if (left === right) return 0
  return left < right ? -1 : 1
}

/**
Asar layout: u32le 4, u32le header size H, u32le H - 4, i32le JSON length L, JSON at 16.
@param {Buffer} buffer at least 16 bytes
@returns {number} the index after the header JSON, or 0 when the buffer is not laid out so
*/
function asarJsonEnd(buffer) {
  const size = buffer.readUInt32LE(4)
  const jsonLength = buffer.readInt32LE(12)
  const isLaidOut =
    buffer.readUInt32LE(0) === 4 &&
    buffer.readUInt32LE(8) === size - 4 &&
    jsonLength > 0 &&
    16 + jsonLength <= 8 + size &&
    8 + size <= buffer.length
  return isLaidOut ? 16 + jsonLength : 0
}

/**
@param {Buffer} buffer
@returns {{ files: Record<string, unknown> } | undefined}
*/
function parseAsarHeader(buffer) {
  const jsonEnd = buffer.length >= 16 ? asarJsonEnd(buffer) : 0
  const header = jsonEnd > 0 ? parseJson(buffer.toString('utf8', 16, jsonEnd)) : NOT_JSON
  const { files } = fieldsOf(header)
  return isObject(header) && isObject(files) ? { files } : undefined
}

/**
@param {{ files: Record<string, unknown> }} directory
@param {string[]} segments
@param {Leaf[]} leaves
@param {string[]} problems
*/
function collectLeaves(directory, segments, leaves, problems) {
  for (const [name, node] of Object.entries(directory.files)) {
    const nodeSegments = [...segments, name]
    const hasFiles = isObject(node) && 'files' in node
    const { files, size, link } = fieldsOf(node)
    if (hasFiles && isObject(files)) {
      collectLeaves({ files }, nodeSegments, leaves, problems)
    } else if (!hasFiles && typeof size === 'number') {
      leaves.push({ segments: nodeSegments, size })
    } else if (!hasFiles && typeof link === 'string') {
      leaves.push({ segments: nodeSegments, size: 0 })
    } else {
      problems.push(`malformed entry: ${nodeSegments.join('/')}`)
    }
  }
}

/**
@param {readonly Leaf[]} leaves
*/
function packageNames(leaves) {
  /**
  @type {Set<string>}
  */
  const names = new Set()
  for (const { segments } of leaves) {
    for (const [index, segment] of segments.entries()) {
      const [name, scopedName] = segments.slice(index + 1, index + 3)
      if (segment === 'node_modules' && name !== undefined) {
        names.add(scopedName !== undefined && name.startsWith('@') ? `${name}/${scopedName}` : name)
      }
    }
  }
  return [...names].toSorted(byCodeUnit)
}

/**
The bytes of a subcommand's one file argument, after printing `ci-policy <name>: <file>`.
@param {string} name
@param {readonly string[]} args
@returns {Buffer | number} the bytes, or the exit code after printing why they are missing
*/
function readFileArgument(name, args) {
  if (args.length !== 1) return usage()
  const [file = ''] = args
  const buffer = readInput(file, (input) => readFileSync(input))
  if (buffer !== undefined) print(`ci-policy ${name}: ${file}`)
  return buffer ?? 1
}

/**
@param {TopLevelEntry} entry
*/
function displayName({ name, kind }) {
  return kind === 'directory' ? `${name}/` : name
}

/**
@param {readonly string[]} args
*/
function checkPackage(args) {
  const buffer = readFileArgument('package', args)
  if (typeof buffer === 'number') return buffer
  const header = parseAsarHeader(buffer)
  if (!header) return finish('package', ['not an asar header'])

  /**
  @type {Leaf[]}
  */
  const leaves = []
  /**
  @type {string[]}
  */
  const problems = []
  collectLeaves(header, [], leaves, problems)
  /**
  @param {string} top
  */
  const bytesUnder = (top) =>
    leaves.filter((leaf) => leaf.segments[0] === top).reduce((sum, leaf) => sum + leaf.size, 0)
  const total = leaves.reduce((sum, leaf) => sum + leaf.size, 0)
  const nodeModulesBytes = bytesUnder('node_modules')

  /**
  @type {TopLevelEntry[]}
  */
  const topLevel = Object.entries(header.files).map(([name, node]) => ({
    name,
    kind: isObject(node) && 'files' in node ? 'directory' : 'file'
  }))
  for (const entry of topLevel) {
    if (ALLOWED_TOP_LEVEL.get(entry.name) !== entry.kind) {
      problems.push(`disallowed top-level entry: ${displayName(entry)}`)
    }
  }
  for (const name of REQUIRED_FILES) {
    if (topLevel.every((entry) => !(entry.name === name && entry.kind === 'file'))) {
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
  const names = topLevel.map((entry) => displayName(entry)).toSorted(byCodeUnit)
  print(`top-level: ${names.join(', ')}`)
  print(listLine('node_modules packages', packageNames(leaves)))
  return finish('package', problems)
}

/**
Source files under one root, sorted; a missing root contributes none. Returns undefined
after printing why the root could not be read.
@param {string} root
*/
function listSources(root) {
  /**
  @type {import('node:fs').Dirent[] | undefined}
  */
  let entries
  try {
    entries = readdirSync(root, { recursive: true, withFileTypes: true })
  } catch (error) {
    const { code } = fieldsOf(error)
    entries = code === 'ENOENT' ? [] : undefined
    if (entries === undefined) printError(`unreadable: ${root} (${String(code)})`)
  }
  return entries
    ?.filter((entry) => entry.isFile() && SOURCE_EXTENSION.test(entry.name))
    .filter((entry) => !DECLARATION_FILE.test(entry.name))
    .map((entry) =>
      path.relative('.', path.join(entry.parentPath, entry.name)).split(path.sep).join('/')
    )
    .toSorted(byCodeUnit)
}

/**
One character of `text` against a one-character class; outside the text reads as no match.
@param {RegExp} pattern
@param {string} text
@param {number} index
*/
const isAt = (pattern, text, index) => pattern.test(text.charAt(index))

/**
@param {RegExp} pattern
@param {string} text
@param {number} index
@returns {number} the index after the run of `pattern` characters that starts at `index`
*/
function skip(pattern, text, index) {
  let end = index
  while (isAt(pattern, text, end)) end += 1
  return end
}

/**
`from '<specifier>'` after any spaces at `start`: one or more characters up to the matching
quote, on one line.
@param {string} text
@param {number} start
@returns {{ specifier: string, end: number } | undefined}
*/
function sourceAt(text, start) {
  const from = skip(SPACE, text, start)
  const open = skip(BLANK, text, from + 4)
  const close = skip(SOURCE_CHAR, text, open + 1)
  const isSource =
    text.startsWith('from', from) &&
    isAt(QUOTE, text, open) &&
    close > open + 1 &&
    text.charAt(close) === text.charAt(open)
  return isSource ? { specifier: text.slice(open + 1, close), end: close + 1 } : undefined
}

/**
The index the clause walk moves to from `at`: past a line comment to its line end, else one
clause character on; -1 at any other character and at the `import`/`export` keyword of a later
statement.
@param {string} text
@param {number} at
*/
function clauseStep(text, at) {
  if (text.startsWith('//', at)) return skip(COMMENT_CHAR, text, at)
  const isKeyword =
    KEYWORDS.some((word) => text.startsWith(word, at)) &&
    !isAt(WORD, text, at - 1) &&
    !isAt(WORD, text, at + KEYWORD_LENGTH)
  return !isKeyword && isAt(CLAUSE_CHAR, text, at) ? at + 1 : -1
}

/**
The first `from '…'` the clause starting at `start` reaches. A block comment is tried as
ending at each later `*\/` in turn, the first ending first.
@param {string} text
@param {number} start
@param {Set<number>} failed the starts already walked without reaching a source
@returns {ClauseSource | undefined}
*/
function clauseSource(text, start, failed) {
  /**
  @type {number[]}
  */
  const walked = []
  /**
  @type {ClauseSource | undefined}
  */
  let found
  for (let at = start; found === undefined && at >= 0 && !failed.has(at); ) {
    const source = sourceAt(text, at)
    walked.push(at)
    if (source) {
      found = { clauseEnd: at, ...source }
    } else if (text.startsWith('/*', at)) {
      found = blockCommentSource(text, at, failed)
      at = -1
    } else {
      at = clauseStep(text, at)
    }
  }
  if (found === undefined) for (const index of walked) failed.add(index)
  return found
}

/**
@param {string} text
@param {number} at the start of the block comment
@param {Set<number>} failed
@returns {ClauseSource | undefined}
*/
function blockCommentSource(text, at, failed) {
  /**
  @type {ClauseSource | undefined}
  */
  let found
  for (
    let close = text.indexOf('*/', at + 2);
    found === undefined && close >= 0;
    close = text.indexOf('*/', close + 1)
  ) {
    found = clauseSource(text, close + 2, failed)
  }
  return found
}

/**
The `import … from '…'` or `export … from '…'` statement on the line starting at `lineStart`.
@param {string} text
@param {number} lineStart
@param {Set<number>} failed
@returns {FromStatement | undefined}
*/
function statementAt(text, lineStart, failed) {
  const keyword = skip(BLANK, text, lineStart)
  const keywordEnd = skip(BLANK, text, keyword + KEYWORD_LENGTH)
  const typeEnd = skip(BLANK, text, keywordEnd + 4)
  const isTypeKeyword = text.startsWith('type', keywordEnd) && typeEnd > keywordEnd + 4
  const clauseStart = isTypeKeyword ? typeEnd : keywordEnd
  const isStatement =
    KEYWORDS.some((word) => text.startsWith(word, keyword)) && keywordEnd > keyword + KEYWORD_LENGTH
  const source = isStatement ? clauseSource(text, clauseStart, failed) : undefined
  return (
    source && {
      start: lineStart,
      end: source.end,
      isTypeKeyword,
      clause: text.slice(clauseStart, source.clauseEnd),
      specifier: source.specifier
    }
  )
}

/**
Every `… from '…'` statement, each read at a line start after the end of the one before.
@param {string} text
*/
function fromStatements(text) {
  /**
  @type {FromStatement[]}
  */
  const statements = []
  /**
  @type {Set<number>}
  */
  const failed = new Set()
  let readEnd = 0
  for (
    let lineStart = 0;
    lineStart < text.length;
    lineStart = skip(LINE_CHAR, text, lineStart) + 1
  ) {
    const statement = lineStart >= readEnd ? statementAt(text, lineStart, failed) : undefined
    if (statement === undefined) continue
    statements.push(statement)
    readEnd = statement.end
  }
  return statements
}

// TypeScript and esbuild elide `import type …` and a clause of only `{ type … }` items;
// `import type from '…'` imports a default export named `type`.
/**
@param {boolean} isTypeKeyword
@param {string} clause
*/
function isTypeOnly(isTypeKeyword, clause) {
  const bindings = clause.replaceAll(COMMENT, ' ').trim()
  const [, named = ''] = /^\{([^{}]*)\}$/.exec(bindings) ?? []
  const items = named
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return isTypeKeyword
    ? bindings !== ''
    : items.length > 0 && items.every((item) => /^type\s/.test(item))
}

/**
@param {string} specifier
*/
function packageOf(specifier) {
  const isOutside =
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('node:') ||
    isBuiltin(specifier) ||
    specifier === 'electron' ||
    specifier.startsWith('electron/')
  const segments = specifier.split('/')
  const name = specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0]
  return isOutside ? undefined : name
}

/**
Value specifiers in one source, and the lines of every `from '<package>'` outside a
`… from '…'` statement read.
@param {string} source
*/
function readImports(source) {
  /**
  @type {string[]}
  */
  const specifiers = []
  const statements = fromStatements(source)
  for (const statement of statements) {
    if (!isTypeOnly(statement.isTypeKeyword, statement.clause)) {
      specifiers.push(statement.specifier)
    }
  }
  for (const match of source.matchAll(BARE_IMPORT)) specifiers.push(match.at(2) ?? '')
  for (const match of source.matchAll(CALL_IMPORT)) specifiers.push(match.at(2) ?? '')
  /**
  @type {number[]}
  */
  const unclassified = []
  for (const match of source.matchAll(FROM_SPECIFIER)) {
    const specifier = match.at(2) ?? ''
    const isRead = statements.some(({ start, end }) => match.index >= start && match.index < end)
    if (!isRead && packageOf(specifier) !== undefined) {
      unclassified.push(source.slice(0, match.index).split('\n').length)
    }
  }
  return { specifiers, unclassified }
}

/**
The manifest's dependencies, or undefined after printing why they could not be read.
@returns {Record<string, unknown> | undefined}
*/
function readDependencies() {
  const text = readInput('package.json', (file) => readFileSync(file, 'utf8'))
  if (text === undefined) return text
  const manifest = parseJson(text)
  const { dependencies: declared } = fieldsOf(manifest)
  const dependencies = declared ?? {}
  if (manifest === NOT_JSON) {
    printError('unreadable: package.json (not JSON)')
  } else if (!isObject(dependencies)) {
    printError('unreadable: package.json (dependencies is not an object)')
  }
  return manifest !== NOT_JSON && isObject(dependencies) ? dependencies : undefined
}

/**
Adds one root's files to the scan; false after printing why a file could not be read.
@param {string} root
@param {readonly string[]} files
@param {Scan} scan
*/
function scanRoot(root, files, scan) {
  scan.counts.push(`${root} ${files.length}`)
  scan.scanned += files.length
  return files.every((file) => {
    const source = readInput(file, (input) => readFileSync(input, 'utf8'))
    if (source === undefined) return false
    const imports = readImports(source)
    for (const specifier of imports.specifiers) {
      const name = packageOf(specifier)
      if (name) scan.imported.add(name)
    }
    for (const line of imports.unclassified) scan.unclassified.push(`${file}:${line}`)
    return true
  })
}

/**
@param {readonly string[]} args
*/
function checkRuntimeDependencies(args) {
  if (args.length > 0) return usage()
  const dependencies = readDependencies()
  if (dependencies === undefined) return 1

  /**
  @type {Scan}
  */
  const scan = { counts: [], scanned: 0, imported: new Set(), unclassified: [] }
  const isRead = SOURCE_ROOTS.every((root) => {
    const files = listSources(root)
    return files !== undefined && scanRoot(root, files, scan)
  })
  if (!isRead) return 1

  const declared = Object.keys(dependencies).toSorted(byCodeUnit)
  const values = [...scan.imported].toSorted(byCodeUnit)
  const unused = declared.filter((name) => !scan.imported.has(name))
  const undeclared = values.filter((name) => !Object.hasOwn(dependencies, name))
  print(`ci-policy runtime-deps: files scanned ${scan.scanned} (${scan.counts.join(', ')})`)
  print(listLine('dependencies', declared))
  print(listLine('value imports', values))
  print(listLine('in dependencies, not imported', unused))
  print(listLine('imported, not in dependencies', undeclared))
  print(listLine('unclassified imports', scan.unclassified))
  const isFailed =
    scan.scanned === 0 || unused.length > 0 || undeclared.length > 0 || scan.unclassified.length > 0
  print(`ci-policy runtime-deps: ${isFailed ? 'FAILED' : 'ok'}`)
  return isFailed ? 1 : 0
}

/**
@param {RegExpExecArray} match three numeric groups
@returns {VersionParts}
*/
function versionOf(match) {
  const [, major = '', minor = '', patch = ''] = match
  return [Number(major), Number(minor), Number(patch)]
}

/**
@param {unknown} version
*/
function versionParts(version) {
  const match = VERSION.exec(String(version))
  return match ? versionOf(match) : undefined
}

/**
^A.B.C: the same major, and minor.patch at or above B.C.
@param {VersionParts | undefined} version
@param {VersionParts} wanted
*/
function satisfiesCaret(version, wanted) {
  if (version === undefined) return false
  const [major, minor, patch] = version
  const [wantMajor, wantMinor, wantPatch] = wanted
  return major === wantMajor && (minor > wantMinor || (minor === wantMinor && patch >= wantPatch))
}

/**
The Node version the installed Electron binary bundles, or why it could not be read.
@returns {{ version: string } | { problem: string }}
*/
function electronNodeVersion() {
  /**
  @type {unknown}
  */
  let binary
  try {
    binary = createRequire(path.resolve('package.json'))('electron')
  } catch (error) {
    const { message } = fieldsOf(error)
    const [firstLine = ''] = String(message).split('\n', 1)
    return { problem: `electron could not be loaded (${firstLine})` }
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

/**
@param {VersionParts | undefined} wanted
@returns {string[]}
*/
function electronProblems(wanted) {
  const result = electronNodeVersion()
  if ('problem' in result) return [result.problem]
  print(`ci-policy toolchain: electron node ${result.version}`)
  const isOtherMajor = wanted !== undefined && versionParts(result.version)?.[0] !== wanted[0]
  return isOtherMajor ? [`electron node ${result.version} is not major ${wanted[0]}`] : []
}

/**
engines.node and, when it is ^major.minor.patch, its parts.
@param {unknown} manifest
@returns {{ engines: unknown, wanted: VersionParts | undefined }}
*/
function nodeRange(manifest) {
  const { engines: enginesField } = fieldsOf(manifest)
  const { node: engines } = fieldsOf(enginesField)
  const range = typeof engines === 'string' ? CARET_RANGE.exec(engines) : undefined
  return { engines, wanted: range ? versionOf(range) : undefined }
}

/**
@param {unknown} types the installed @types/node manifest
@param {VersionParts | undefined} wanted
@returns {string[]}
*/
function typesProblems(types, wanted) {
  const { version } = fieldsOf(types)
  print(`ci-policy toolchain: @types/node ${String(version)}`)
  const isOtherMajor = wanted !== undefined && versionParts(version)?.[0] !== wanted[0]
  return isOtherMajor ? [`@types/node ${String(version)} is not major ${wanted[0]}`] : []
}

/**
@param {readonly string[]} args
*/
function checkToolchain(args) {
  const isElectron = args.length === 1 && args[0] === '--electron'
  if (!isElectron && args.length > 0) return usage()
  const manifest = readJson('package.json')
  if (manifest === undefined) return 1
  const types = readJson('node_modules/@types/node/package.json')
  if (types === undefined) return 1

  const { engines, wanted } = nodeRange(manifest)
  print(`ci-policy toolchain: engines.node ${String(engines ?? '(absent)')}`)
  /**
  @type {string[]}
  */
  const problems = []
  if (!wanted) {
    problems.push(
      engines === undefined
        ? 'engines.node absent'
        : `engines.node ${String(engines)} is not ^major.minor.patch`
    )
  }
  print(`ci-policy toolchain: node ${process.version}`)
  if (wanted && !satisfiesCaret(versionParts(process.version), wanted)) {
    problems.push(`node ${process.version} does not satisfy ${String(engines)}`)
  }
  problems.push(...typesProblems(types, wanted))
  if (isElectron) problems.push(...electronProblems(wanted))
  return finish('toolchain', problems)
}

// NEEDS_JSON is the aggregate job's `toJSON(needs)`: { "<job>": { "result": "…" }, … }.
/**
@param {readonly string[]} args
*/
function checkNeeds(args) {
  if (args.length > 0) return usage()
  const { NEEDS_JSON: text } = process.env
  if (text === undefined) {
    printError('not set: NEEDS_JSON')
    return 1
  }
  const needs = parseJson(text)
  if (needs === NOT_JSON) {
    printError('unreadable: NEEDS_JSON (not JSON)')
    return 1
  }
  if (!isObject(needs)) {
    printError('unreadable: NEEDS_JSON (not an object)')
    return 1
  }

  /**
  @type {string[]}
  */
  const problems = []
  const jobs = Object.entries(needs)
  for (const [job, need] of jobs) {
    const { result } = fieldsOf(need)
    print(`ci-policy needs: ${job} ${String(result)}`)
    if (result !== 'success') problems.push(`${job} ${String(result)}`)
  }
  print(`ci-policy needs: jobs ${jobs.length}`)
  if (jobs.length === 0) problems.push('0 jobs')
  return finish('needs', problems)
}

/**
Reads one non-blank, non-comment line into the open entry, or records why it cannot be.
@param {OsvEntry | undefined} entry
@param {string} line
@param {string} where
@param {string[]} problems
*/
function readOsvLine(entry, line, where, problems) {
  const [, key = ''] = /^(\w+) = /.exec(line) ?? []
  const [, value] = OSV_KEYS.get(key)?.exec(line) ?? []
  if (entry === undefined || value === undefined) {
    problems.push(`${where}: unexpected line: ${line}`)
  } else if (entry.keys.has(key)) {
    problems.push(`${where}: duplicate ${key}`)
  } else {
    entry.keys.set(key, value)
  }
}

/**
@param {string} text
*/
function readOsvEntries(text) {
  /**
  @type {OsvEntry[]}
  */
  const entries = []
  /**
  @type {string[]}
  */
  const problems = []
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim()
    const where = `${OSV_CONFIG}:${index + 1}`
    if (line === '[[IgnoredVulns]]') {
      entries.push({ where, keys: new Map() })
    } else if (line !== '' && !line.startsWith('#')) {
      readOsvLine(entries.at(-1), line, where, problems)
    }
  }
  return { entries, problems }
}

/**
@param {OsvEntry} entry
@param {number} today
*/
function osvEntryProblems({ where, keys }, today) {
  /**
  @type {string[]}
  */
  const problems = []
  for (const key of OSV_KEYS.keys()) {
    if (!keys.has(key)) problems.push(`${where}: missing ${key}`)
  }
  if (keys.get('reason') === '') problems.push(`${where}: empty reason`)
  const until = keys.get('ignoreUntil')
  if (until === undefined) return problems
  const day = Date.parse(`${until}T00:00:00Z`)
  if (Number.isNaN(day) || new Date(day).toISOString().slice(0, 10) !== until) {
    problems.push(`${where}: not a date: ${until}`)
  } else if (day > today + OSV_MAX_DAYS * DAY_MS) {
    problems.push(`${where}: ignoreUntil ${until} is more than ${OSV_MAX_DAYS} days ahead`)
  }
  return problems
}

/**
@param {readonly string[]} args
*/
function checkOsvIgnores(args) {
  if (args.length > 0) return usage()
  const text = readInput(OSV_CONFIG, (file) => readFileSync(file, 'utf8'))
  if (text === undefined) return 1

  const { entries, problems } = readOsvEntries(text)
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  for (const entry of entries) problems.push(...osvEntryProblems(entry, today))

  const expiries = entries.flatMap(({ keys }) => keys.get('ignoreUntil') ?? []).toSorted(byCodeUnit)
  print(`ci-policy osv-ignores: entries ${entries.length}`)
  print(`ci-policy osv-ignores: nearest expiry ${expiries[0] ?? 'none'}`)
  return finish('osv-ignores', problems)
}

/**
The one fuse wire in an executable, or the problem that stops reading it.
@param {Buffer} buffer
@returns {FuseWire | string}
*/
function readFuseWire(buffer) {
  const at = buffer.indexOf(FUSE_SENTINEL)
  if (at === -1) return 'no fuse wire found'
  let wires = 0
  for (let next = at; next >= 0; next = buffer.indexOf(FUSE_SENTINEL, next + 1)) wires++
  if (wires > 1) return `${wires} fuse wires found`
  const start = at + FUSE_SENTINEL.length
  if (start + 2 > buffer.length) return 'fuse wire truncated'
  const version = buffer.readUInt8(start)
  if (version !== 1) return `wire version ${version}, expected 1`
  const length = buffer.readUInt8(start + 1)
  if (length < FUSE_MIN_LENGTH) {
    return `wire length ${length}, expected at least ${FUSE_MIN_LENGTH}`
  }
  if (start + 2 + length > buffer.length) return 'fuse wire truncated'
  return { version, states: buffer.subarray(start + 2, start + 2 + length) }
}

/**
@param {readonly string[]} args
*/
function checkFuses(args) {
  const buffer = readFileArgument('fuses', args)
  if (typeof buffer === 'number') return buffer
  const wire = readFuseWire(buffer)
  if (typeof wire === 'string') return finish('fuses', [wire])

  /**
  @type {string[]}
  */
  const problems = []
  for (const [index, byte] of wire.states.entries()) {
    const name = FUSE_NAMES[index] ?? `Fuse${index}`
    const state = FUSE_STATES.get(byte) ?? `unknown 0x${byte.toString(16)}`
    const required = REQUIRED_FUSES.get(index)
    const check = required ? `required ${required}` : 'default, not checked'
    print(`fuse ${name}: ${state} (${check})`)
    if (required && state !== required) {
      problems.push(`fuse ${name}: ${state}, required ${required}`)
    }
  }
  print(
    `ci-policy fuses: wire version ${wire.version}, fuses ${wire.states.length}, checked ${REQUIRED_FUSES.size}`
  )
  return finish('fuses', problems)
}

const [command = '', ...rest] = process.argv.slice(2)
const run = SUBCOMMANDS.get(command) ?? usage
process.exitCode = run(rest)
