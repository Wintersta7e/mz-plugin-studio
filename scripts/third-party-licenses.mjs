// Writes THIRD_PARTY_LICENSES.md from package-lock.json and the installed packages; --check compares instead.
// Covered: the lockfile closure of the root `dependencies` (shipped in the app's node_modules) and of every
// package value-imported from src/ (bundled into out/), plus GENERATED_INTO_APP, without electron and Node builtins.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUTPUT = join(ROOT, 'THIRD_PARTY_LICENSES.md')
// Build-time packages whose output ships: the app's CSS is generated from them (globals.css, tailwind.config.js)
const GENERATED_INTO_APP = ['tailwindcss', 'tailwindcss-animate']
// Path aliases from electron.vite.config.ts
const ALIASES = ['@/', '@renderer/']
const BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]))
const IMPORT_RE =
  /(?:^|[\s;])(?:import\s+(?!type\b)(?:[\w*{}\s,$]+\s+from\s+)?|export\s+(?!type\b)[\w*{}\s,$]*\s+from\s+|import\s*\(\s*)['"]([^'"]+)['"]|@import\s+(?:url\()?['"]([^'"]+)['"]/g
const LICENSE_FILE_RE = /^(licen[cs]e|copying)/i

const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8')).packages
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(m?[jt]sx?|cjs|css)$/.test(entry.name) ? [path] : []
  })
}

function importedPackages() {
  const names = new Set()
  for (const file of sourceFiles(join(ROOT, 'src'))) {
    for (const match of readFileSync(file, 'utf8').matchAll(IMPORT_RE)) {
      const spec = (match[1] ?? match[2]).split('?')[0]
      if (/^[./]/.test(spec) || BUILTINS.has(spec) || ALIASES.some((a) => spec.startsWith(a)))
        continue
      const name = spec
        .split('/')
        .slice(0, spec.startsWith('@') ? 2 : 1)
        .join('/')
      if (name === 'electron') continue
      if (!lock[`node_modules/${name}`]) {
        throw new Error(
          `${relative(ROOT, file)} imports "${spec}", which is not in package-lock.json`
        )
      }
      names.add(name)
    }
  }
  return names
}

// npm's lookup: the nearest node_modules/<dep>, walking up from the dependent's own folder
function resolve(from, dep) {
  for (let base = from; ; ) {
    const key = `${base ? `${base}/` : ''}node_modules/${dep}`
    if (lock[key]) return key
    if (!base) return null
    const i = base.lastIndexOf('/node_modules/')
    base = i === -1 ? '' : base.slice(0, i)
  }
}

function closure(names) {
  const seen = new Set()
  const visit = (key) => {
    if (seen.has(key)) return
    seen.add(key)
    const entry = lock[key]
    for (const dep of Object.keys({ ...entry.dependencies, ...entry.optionalDependencies })) {
      const found = resolve(key, dep)
      if (found) visit(found)
      else if (!entry.optionalDependencies?.[dep])
        throw new Error(`${key} needs ${dep}, not in package-lock.json`)
    }
  }
  for (const name of names) visit(`node_modules/${name}`)
  return seen
}

function repository(manifest, key) {
  const raw =
    typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url
  if (!raw) return '—'
  const url = raw
    .replace(/^git\+/, '')
    .replace(/^(git|http|ssh):\/\/(git@)?/, 'https://')
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/^github:/, 'https://github.com/')
    .replace(/^([\w.-]+\/[\w.-]+)$/, 'https://github.com/$1')
    .replace(/#.*$/, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
  if (!url.startsWith('https://')) throw new Error(`${key}: cannot normalise repository "${raw}"`)
  return url
}

const shipped = closure(Object.keys(pkg.dependencies ?? {}))
const packages = new Map()
const generatedIntoApp = GENERATED_INTO_APP.map((name) => `node_modules/${name}`)
for (const key of [
  ...new Set([...shipped, ...closure(importedPackages()), ...generatedIntoApp])
].sort()) {
  const name = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length)
  const dir = join(ROOT, key)
  if (!existsSync(dir))
    throw new Error(`${key} is in package-lock.json but not installed; run npm ci`)
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const row = packages.get(name) ?? {
    licenses: new Set(),
    repo: repository(manifest, key),
    texts: new Set(),
    bundled: false
  }
  row.licenses.add(lock[key].license ?? manifest.license ?? 'UNKNOWN')
  if (!shipped.has(key)) {
    row.bundled = true
    for (const file of readdirSync(dir)
      .filter((f) => LICENSE_FILE_RE.test(f))
      .sort()) {
      row.texts.add(readFileSync(join(dir, file), 'utf8').replace(/\r\n?/g, '\n').trim())
    }
  }
  packages.set(name, row)
}

const names = [...packages.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
const licenses = (name) => [...packages.get(name).licenses].sort().join(', ')
const out = [
  '# Third-Party Licenses',
  '',
  'MZ Plugin Studio includes the third-party packages below. This file is generated by',
  '`npm run licenses`; change the script, not this file.',
  '',
  '| Package | License | Repository |',
  '|---|---|---|',
  ...names.map((name) => `| ${name} | ${licenses(name)} | ${packages.get(name).repo} |`),
  '',
  '## License texts',
  '',
  "The packages below are compiled into the app's own code, so their license texts are reproduced here.",
  "Packages in the app's `node_modules` folder carry their own license files."
]
let texts = 0
let withoutFile = 0
for (const name of names.filter((n) => packages.get(n).bundled)) {
  const row = packages.get(name)
  out.push('', `### ${name}`, '')
  if (row.texts.size === 0) {
    if (row.repo === '—') throw new Error(`${name}: no license file and no repository to point to`)
    withoutFile++
    out.push(
      `No license file is published with this package; its package.json declares ${licenses(name)}, and its source is at ${row.repo}.`
    )
  }
  for (const text of row.texts) {
    texts++
    out.push('````text', text, '````')
  }
}
const generated = `${out.join('\n')}\n`
process.stdout.write(
  `third-party licenses: ${names.length} packages, ${texts} license texts, ${withoutFile} without a license file\n`
)
if (names.length === 0) process.exit(1)

if (!process.argv.includes('--check')) {
  writeFileSync(OUTPUT, generated)
} else {
  const committed = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8').replace(/\r\n?/g, '\n') : ''
  if (committed !== generated) {
    const a = committed.split('\n')
    const b = generated.split('\n')
    let line = 0
    while (a[line] === b[line]) line++
    process.stderr.write(
      `THIRD_PARTY_LICENSES.md is stale from line ${line + 1}; run npm run licenses\n` +
        `  committed: ${a[line] ?? '(end of file)'}\n  generated: ${b[line] ?? '(end of file)'}\n`
    )
    process.exit(1)
  }
}
