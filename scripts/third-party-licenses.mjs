// Writes THIRD_PARTY_LICENSES.md from package-lock.json and the installed packages; --check compares instead.
// Covered: the lockfile closure of the root `dependencies` (shipped in the app's node_modules) and of every
// package value-imported from src/ (bundled into out/), plus GENERATED_INTO_APP, without electron and Node builtins.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUTPUT = path.join(ROOT, 'THIRD_PARTY_LICENSES.md')
// Build-time packages whose output ships: the app's CSS is generated from them (globals.css)
const GENERATED_INTO_APP = ['tailwindcss', 'tw-animate-css']
// Path aliases from electron.vite.config.ts
const ALIASES = ['@/', '@renderer/']
const BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]))
const SOURCE_FILE = /\.(?:m?[jt]sx?|cjs|css)$/
const LICENSE_FILE_RE = /^(?:licen[cs]e|copying)/i
// The notices a package publishes for the code it vendors, reproduced after its own license
const NOTICES_FILE = 'ThirdPartyNotices.txt'

// The characters an import is read by. A statement starts at the start of the text or after a
// space or `;`; a stylesheet `@import` starts anywhere.
const LEAD = /[\s;]/
const SPACE = /\s/
const WORD = /\w/
const CLAUSE_CHAR = /[\w*{}\s,$]/
const QUOTE = /['"]/

/**
@param {unknown} value
@returns {value is Record<string, unknown>}
*/
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
@param {string} file
@returns {unknown}
*/
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

/**
@param {RegExp} pattern a one-character class
@param {string} text
@param {number} index
*/
const isAt = (pattern, text, index) =>
  index >= 0 && index < text.length && pattern.test(text.charAt(index))

/**
@param {RegExp} pattern
@param {string} text
@param {number} index
@returns {number} the index after the run of `pattern` characters starting at `index`
*/
function skip(pattern, text, index) {
  let end = index
  while (isAt(pattern, text, end)) end++
  return end
}

/**
@param {string} text
@param {number} end
@returns {number} the index of the run of spaces that ends at `end`
*/
function spacesBefore(text, end) {
  let start = end
  while (isAt(SPACE, text, start - 1)) start--
  return start
}

/**
The specifier quoted at `quote`: one or more characters up to the next quote of either kind.
@param {string} text
@param {number | undefined} quote
@returns {{ specifier: string, end: number } | undefined}
*/
function quoted(text, quote) {
  // No quote there: an empty run at the end of the text, which reads nothing
  const start = quote !== undefined && isAt(QUOTE, text, quote) ? quote + 1 : text.length
  let end = start
  while (end < text.length && !isAt(QUOTE, text, end)) end++
  return end > start && end < text.length
    ? { specifier: text.slice(start, end), end: end + 1 }
    : undefined
}

/**
The quote after `<keyword> <clause> from `. The clause starts after the keyword's spaces, does
not start with the word `type`, and runs over `[\w*{}\s,$]` up to the space ahead of `from`.
@param {string} text
@param {number} keywordEnd
@returns {number | undefined}
*/
function clauseQuote(text, keywordEnd) {
  const clauseStart = skip(SPACE, text, keywordEnd)
  const isTypeWord = text.startsWith('type', clauseStart) && !isAt(WORD, text, clauseStart + 4)
  const quote = skip(CLAUSE_CHAR, text, clauseStart)
  const fromEnd = spacesBefore(text, quote)
  const isClause =
    clauseStart > keywordEnd &&
    !isTypeWord &&
    fromEnd < quote &&
    text.slice(fromEnd - 4, fromEnd) === 'from' &&
    isAt(SPACE, text, fromEnd - 5) &&
    clauseStart <= fromEnd - 5
  return isClause && isAt(QUOTE, text, quote) ? quote : undefined
}

/**
`import 'x'`, else `import <clause> from 'x'`.
@param {string} text
@param {number} keywordEnd
*/
function importQuote(text, keywordEnd) {
  const next = skip(SPACE, text, keywordEnd)
  return next > keywordEnd && isAt(QUOTE, text, next) ? next : clauseQuote(text, keywordEnd)
}

/**
`import(…)`, with or without spaces around the parenthesis.
@param {string} text
@param {number} keywordEnd
*/
function callQuote(text, keywordEnd) {
  const parenthesis = skip(SPACE, text, keywordEnd)
  return text.charAt(parenthesis) === '(' ? skip(SPACE, text, parenthesis + 1) : undefined
}

/**
The import or export statement whose keyword starts at `start`.
@param {string} text
@param {number} start
*/
function statementAt(text, start) {
  if (text.startsWith('export', start)) return quoted(text, clauseQuote(text, start + 6))
  const isImport = text.startsWith('import', start)
  const read = isImport ? quoted(text, importQuote(text, start + 6)) : undefined
  return isImport ? (read ?? quoted(text, callQuote(text, start + 6))) : undefined
}

/**
A stylesheet `@import 'x'` or `@import url('x')`.
@param {string} text
@param {number} start
*/
function stylesheetAt(text, start) {
  const next = skip(SPACE, text, start + 7)
  const isImport = text.startsWith('@import', start) && next > start + 7
  const inUrl = isImport && text.startsWith('url(', next) ? quoted(text, next + 4) : undefined
  return isImport ? (inUrl ?? quoted(text, next)) : undefined
}

/**
The import read at `start`, if one starts there.
@param {string} text
@param {number} start
*/
function importAt(text, start) {
  const keyword = start === 0 && !isAt(LEAD, text, 0) ? 0 : start + 1
  const isLead = keyword === 0 || isAt(LEAD, text, start)
  return (isLead ? statementAt(text, keyword) : undefined) ?? stylesheetAt(text, start)
}

/**
Every specifier a source imports, in text order; reading resumes after an import's closing quote.
@param {string} text
@returns {string[]}
*/
function importSpecifiers(text) {
  /**
  @type {string[]}
  */
  const specifiers = []
  let index = 0
  while (index < text.length) {
    const found = importAt(text, index)
    if (found === undefined) {
      index++
    } else {
      specifiers.push(found.specifier)
      index = found.end
    }
  }
  return specifiers
}

const lockfile = readJson(path.join(ROOT, 'package-lock.json'))
const { packages: lockPackages } = isRecord(lockfile) ? lockfile : {}
if (!isRecord(lockPackages)) throw new TypeError('package-lock.json: packages is not an object')
const lock = lockPackages
const rootManifest = readJson(path.join(ROOT, 'package.json'))
const { dependencies: rootDependencies } = isRecord(rootManifest) ? rootManifest : {}

/**
@param {string} key
@returns {Record<string, unknown>}
*/
function lockEntry(key) {
  const entry = lock[key]
  if (!isRecord(entry)) throw new TypeError(`${key}: not an object in package-lock.json`)
  return entry
}

/**
@param {string} directory
@returns {string[]}
*/
function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(file)
    return SOURCE_FILE.test(entry.name) ? [file] : []
  })
}

/**
@param {string} spec
*/
const isLocal = (spec) =>
  /^[./]/.test(spec) || BUILTINS.has(spec) || ALIASES.some((alias) => spec.startsWith(alias))

function importedPackages() {
  /**
  @type {Set<string>}
  */
  const names = new Set()
  const files = sourceFiles(path.join(ROOT, 'src'))
  for (const file of files) {
    const specifiers = importSpecifiers(readFileSync(file, 'utf8'))
    for (const specifier of specifiers) {
      const [spec = ''] = specifier.split('?', 1)
      if (isLocal(spec)) continue
      const name = spec
        .split('/')
        .slice(0, spec.startsWith('@') ? 2 : 1)
        .join('/')
      if (name === 'electron') continue
      if (!Object.hasOwn(lock, `node_modules/${name}`)) {
        throw new Error(
          `${path.relative(ROOT, file)} imports "${spec}", which is not in package-lock.json`
        )
      }
      names.add(name)
    }
  }
  return names
}

// npm's lookup: the nearest node_modules/<dependency>, walking up from the dependent's own folder
/**
@param {string} from
@param {string} dependency
@returns {string | undefined}
*/
function resolve(from, dependency) {
  const bases = [from]
  for (let base = from; base; ) {
    const index = base.lastIndexOf('/node_modules/')
    base = index === -1 ? '' : base.slice(0, index)
    bases.push(base)
  }
  const keys = bases.map((base) =>
    base ? `${base}/node_modules/${dependency}` : `node_modules/${dependency}`
  )
  return keys.find((key) => Object.hasOwn(lock, key))
}

/**
@param {readonly string[] | ReadonlySet<string>} names
*/
function closure(names) {
  /**
  @type {Set<string>}
  */
  const seen = new Set()
  /**
  @param {string} key
  */
  const visit = (key) => {
    if (seen.has(key)) return
    seen.add(key)
    const entry = lockEntry(key)
    const dependencies = isRecord(entry['dependencies']) ? entry['dependencies'] : {}
    const optional = isRecord(entry['optionalDependencies']) ? entry['optionalDependencies'] : {}
    const all = Object.keys({ ...dependencies, ...optional })
    for (const dependency of all) {
      const found = resolve(key, dependency)
      if (found) visit(found)
      else if (!Object.hasOwn(optional, dependency)) {
        throw new Error(`${key} needs ${dependency}, not in package-lock.json`)
      }
    }
  }
  for (const name of names) visit(`node_modules/${name}`)
  return seen
}

/**
@param {Record<string, unknown>} manifest
@param {string} key
*/
function repository(manifest, key) {
  const { repository: field } = manifest
  const { url } = isRecord(field) ? field : {}
  const raw = typeof field === 'string' ? field : url
  if (!raw) return '—'
  if (typeof raw !== 'string') throw new TypeError(`${key}: repository url is not a string`)
  const normalised = raw
    .replace(/^git\+/, '')
    .replace(/^(?:git|http|ssh):\/\/(?:git@)?/, 'https://')
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/^github:/, 'https://github.com/')
    .replace(/^([\w.-]+\/[\w.-]+)$/, 'https://github.com/$1')
    .replace(/#.*$/, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
  if (!normalised.startsWith('https://')) {
    throw new Error(`${key}: cannot normalise repository "${raw}"`)
  }
  return normalised
}

/**
@typedef {{ licenses: Set<string>, repo: string, texts: Set<string>, isBundled: boolean }} Row
*/

/**
@param {string} file
*/
const readText = (file) => readFileSync(file, 'utf8').replaceAll(/\r\n?/g, '\n').trim()

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
Adds the license texts a package publishes, in file name order, then its notices.
@param {string} directory
@param {Set<string>} texts
*/
function addTexts(directory, texts) {
  const files = readdirSync(directory)
    .filter((file) => LICENSE_FILE_RE.test(file))
    .toSorted(byCodeUnit)
  for (const file of files) texts.add(readText(path.join(directory, file)))
  if (existsSync(path.join(directory, NOTICES_FILE))) {
    texts.add(readText(path.join(directory, NOTICES_FILE)))
  }
}

/**
@returns {Map<string, Row>}
*/
function readPackages() {
  const shipped = closure(Object.keys(isRecord(rootDependencies) ? rootDependencies : {}))
  const keys = new Set(shipped)
  for (const key of closure(importedPackages())) keys.add(key)
  for (const name of GENERATED_INTO_APP) keys.add(`node_modules/${name}`)
  /**
  @type {Map<string, Row>}
  */
  const packages = new Map()
  const sorted = [...keys].toSorted(byCodeUnit)
  for (const key of sorted) {
    const name = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length)
    const directory = path.join(ROOT, key)
    if (!existsSync(directory)) {
      throw new Error(`${key} is in package-lock.json but not installed; run npm ci`)
    }
    const parsed = readJson(path.join(directory, 'package.json'))
    const manifest = isRecord(parsed) ? parsed : {}
    const row = packages.get(name) ?? {
      licenses: new Set(),
      repo: repository(manifest, key),
      texts: new Set(),
      isBundled: false
    }
    row.licenses.add(String(lockEntry(key)['license'] ?? manifest['license'] ?? 'UNKNOWN'))
    if (!shipped.has(key)) {
      row.isBundled = true
      addTexts(directory, row.texts)
    }
    packages.set(name, row)
  }
  return packages
}

/**
@param {Row} row
*/
const licensesOf = (row) => [...row.licenses].toSorted(byCodeUnit).join(', ')

/**
The license text section of each package compiled into the app.
@param {[string, Row][]} rows
@returns {{ lines: string[], texts: number, withoutFile: number }}
*/
function licenseTexts(rows) {
  /**
  @type {string[]}
  */
  const lines = []
  let texts = 0
  let withoutFile = 0
  for (const [name, row] of rows) {
    if (!row.isBundled) continue
    lines.push('', `### ${name}`, '')
    if (row.texts.size === 0) {
      if (row.repo === '—') {
        throw new Error(`${name}: no license file and no repository to point to`)
      }
      withoutFile++
      lines.push(
        `No license file is published with this package; its package.json declares ${licensesOf(row)}, and its source is at ${row.repo}.`
      )
    }
    for (const text of row.texts) {
      texts++
      lines.push('````text', text, '````')
    }
  }
  return { lines, texts, withoutFile }
}

/**
@param {string} generated
@returns {number} the exit status
*/
function check(generated) {
  const committed = existsSync(OUTPUT)
    ? readFileSync(OUTPUT, 'utf8').replaceAll(/\r\n?/g, '\n')
    : ''
  if (committed === generated) return 0
  const committedLines = committed.split('\n')
  const generatedLines = generated.split('\n')
  let line = 0
  while (committedLines[line] === generatedLines[line]) line++
  process.stderr.write(
    `THIRD_PARTY_LICENSES.md is stale from line ${line + 1}; run npm run licenses\n` +
      `  committed: ${committedLines[line] ?? '(end of file)'}\n` +
      `  generated: ${generatedLines[line] ?? '(end of file)'}\n`
  )
  return 1
}

/**
@returns {number} the exit status
*/
function main() {
  const rows = [...readPackages()].toSorted(([left], [right]) => byCodeUnit(left, right))
  const { lines, texts, withoutFile } = licenseTexts(rows)
  const out = [
    '# Third-Party Licenses',
    '',
    'MZ Plugin Studio includes the third-party packages below. This file is generated by',
    '`npm run licenses`; change the script, not this file.',
    '',
    '| Package | License | Repository |',
    '|---|---|---|',
    ...rows.map(([name, row]) => `| ${name} | ${licensesOf(row)} | ${row.repo} |`),
    '',
    '## License texts',
    '',
    "The packages below are compiled into the app's own code, so their license texts are reproduced here.",
    "Packages in the app's `node_modules` folder carry their own license files.",
    ...lines
  ]
  const generated = `${out.join('\n')}\n`
  process.stdout.write(
    `third-party licenses: ${rows.length} packages, ${texts} license texts, ${withoutFile} without a license file\n`
  )
  if (rows.length === 0) return 1
  if (process.argv.includes('--check')) return check(generated)
  writeFileSync(OUTPUT, generated)
  return 0
}

process.exitCode = main()
