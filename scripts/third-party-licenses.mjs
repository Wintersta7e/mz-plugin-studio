// Writes THIRD_PARTY_LICENSES.md from package-lock.json and the installed packages; --check compares instead;
// --sbom <file> writes the same packages as a CycloneDX 1.6 software bill of materials instead.
// Covered: the lockfile closure of the root `dependencies` (shipped in the app's node_modules) and of every
// package value-imported from src/ (bundled into out/), plus GENERATED_INTO_APP, without electron and Node builtins.
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { bundledImports } from './import-reader.mjs'

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
// Subresource-integrity algorithm names and their CycloneDX names
const HASH_ALGORITHMS = new Map([
  ['sha1', 'SHA-1'],
  ['sha256', 'SHA-256'],
  ['sha384', 'SHA-384'],
  ['sha512', 'SHA-512']
])
// An SPDX license id or expression; anything else is named as free text
const SPDX_EXPRESSION = /^[\w.+\-() ]+$/

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
    const specifiers = bundledImports(readFileSync(file, 'utf8'))
    for (const specifier of specifiers) {
      const [spec = ''] = specifier.split('?', 1)
      if (isLocal(spec)) continue
      const name = spec
        .split('/')
        .slice(0, spec.startsWith('@') ? 2 : 1)
        .join('/')
      if (name === 'electron') continue
      if (!Object.hasOwn(lock, `node_modules/${name}`)) {
        // The same `/`-separated path on every system
        const shown = path.relative(ROOT, file).split(path.sep).join('/')
        throw new Error(`${shown} imports "${spec}", which is not in package-lock.json`)
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
  for (let base = from; base;) {
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
@typedef {{ license: string, integrity: unknown }} Release
@typedef {{ licenses: Set<string>, repo: string, texts: Set<string>, isBundled: boolean, releases: Map<string, Release> }} Row
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
      isBundled: false,
      releases: new Map()
    }
    const entry = lockEntry(key)
    const license = String(entry['license'] ?? manifest['license'] ?? 'UNKNOWN')
    row.licenses.add(license)
    row.releases.set(String(entry['version'] ?? manifest['version'] ?? ''), {
      license,
      integrity: entry['integrity']
    })
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
The CycloneDX hashes of a lockfile `integrity` value.
@param {string} id
@param {unknown} integrity
*/
function hashesOf(id, integrity) {
  if (typeof integrity !== 'string') throw new TypeError(`${id}: no integrity in package-lock.json`)
  return integrity
    .split(' ')
    .filter((item) => item !== '')
    .map((item) => {
      const dash = item.indexOf('-')
      const alg = HASH_ALGORITHMS.get(item.slice(0, dash))
      if (alg === undefined) throw new Error(`${id}: unknown integrity algorithm in ${item}`)
      return { alg, content: Buffer.from(item.slice(dash + 1), 'base64').toString('hex') }
    })
}

/**
One CycloneDX component per package version.
@param {[string, Row][]} rows
*/
function sbomComponents(rows) {
  return rows.flatMap(([name, row]) =>
    [...row.releases]
      .toSorted(([left], [right]) => byCodeUnit(left, right))
      .map(([version, { license, integrity }]) => {
        if (version === '') throw new Error(`${name}: no version in package-lock.json`)
        const id = `${name}@${version}`
        const slash = name.startsWith('@') ? name.indexOf('/') : -1
        const purl = `pkg:npm/${name.replaceAll('@', '%40')}@${encodeURIComponent(version)}`
        const isExpression = SPDX_EXPRESSION.test(license) && license !== 'UNKNOWN'
        return {
          type: 'library',
          'bom-ref': purl,
          ...(slash !== -1 && { group: name.slice(0, slash) }),
          name: name.slice(slash + 1),
          version,
          purl,
          licenses: [isExpression ? { expression: license } : { license: { name: license } }],
          hashes: hashesOf(id, integrity)
        }
      })
  )
}

/**
Writes the CycloneDX bill of materials of the listed packages to `file`.
@param {string | undefined} file
@param {[string, Row][]} rows
@returns {number} the exit status
*/
function writeSbom(file, rows) {
  if (file === undefined || file.startsWith('--')) {
    process.stderr.write('--sbom needs a file to write to\n')
    return 1
  }
  const manifest = isRecord(rootManifest) ? rootManifest : {}
  const name = String(manifest['name'])
  const version = String(manifest['version'])
  const components = sbomComponents(rows)
  const body = {
    version: 1,
    metadata: {
      component: { type: 'application', 'bom-ref': `${name}@${version}`, name, version }
    },
    components
  }
  // SBOM attestation rejects a CycloneDX file without a serial number. A name-based UUID taken
  // from the content keeps the file the same for the same packages.
  const digest = createHash('sha256').update(JSON.stringify(body)).digest()
  digest[6] = (digest.readUInt8(6) & 0x0f) | 0x50
  digest[8] = (digest.readUInt8(8) & 0x3f) | 0x80
  const hex = digest.toString('hex')
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  const bom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber: `urn:uuid:${uuid}`,
    ...body
  }
  writeFileSync(file, `${JSON.stringify(bom, undefined, 2)}\n`)
  process.stdout.write(`sbom components ${components.length}\n`)
  return 0
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
  const sbom = process.argv.indexOf('--sbom')
  if (sbom !== -1) return writeSbom(process.argv.at(sbom + 1), rows)
  writeFileSync(OUTPUT, generated)
  return 0
}

process.exitCode = main()
