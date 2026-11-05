import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { ALL_PARAM_TYPES } from '../../src/shared/types/plugin'
import { CATEGORIES } from '../../src/renderer/src/lib/generator/templates/types'
import { TEST_DIRS } from '../helpers/test-directories'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')

// Published files whose numbers and names drift; CHANGELOG.md is a dated record and is not checked
const DOCS = ['README.md', 'docs/USER_GUIDE.md', 'docs/CONTRIBUTING_TEMPLATES.md', 'SECURITY.md']
const ISSUE_TEMPLATES = '.github/ISSUE_TEMPLATE'
// A count before a noun, in three patterns that together match the nouns one pattern listed
const DENYLIST = [
  /\b\d+\+?\s+(?:[\w.&/-]+\s+){0,3}?(?:tests?|suites?|templates?|categories)\b/i,
  /\b\d+\+?\s+(?:[\w.&/-]+\s+){0,3}?(?:classes|methods|(?:parameter\s+)?types|global objects)\b/i,
  /\b\d+\+?\s+(?:[\w.&/-]+\s+){0,3}?(?:names|database types|objects)\b/i,
  /\b(Electron|TypeScript|React|Node(\.js)?|Vite|Tailwind( CSS)?|Monaco|Vitest|Playwright)[\s-]v?\d+/i,
  /img\.shields\.io\/badge\/(Electron|React|TypeScript|Node|Vite|Tailwind)/
]

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

const readme = read('README.md')

// Body rows of the first README table under `heading`, each as trimmed cells
function tableAfter(heading: string): string[][] {
  const lines = readme.split(/\r?\n/)
  const start = lines.indexOf(heading)
  if (start === -1) throw new Error(`no "${heading}" heading`)
  const rows: string[][] = []
  const following = lines.slice(start + 1)
  for (const line of following) {
    if (line.startsWith('#')) break
    if (line.startsWith('|'))
      rows.push(
        line
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim())
      )
    else if (rows.length > 0) break
  }
  return rows.slice(2)
}

/**
The string scripts of package.json, by name
*/
function packageScripts(): Map<string, string> {
  const manifest: unknown = JSON.parse(read('package.json'))
  const scripts: unknown =
    typeof manifest === 'object' && manifest !== null ? Reflect.get(manifest, 'scripts') : undefined
  const byName = new Map<string, string>()
  if (typeof scripts === 'object' && scripts !== null)
    for (const name of Object.keys(scripts)) {
      const script: unknown = Reflect.get(scripts, name)
      if (typeof script === 'string') byName.set(name, script)
    }
  return byName
}

const scripts = packageScripts()

/**
`file:line: text` of each line of `file` that `isListed` accepts
*/
function linesWhere(
  file: string,
  lines: string[],
  isListed: (line: string, index: number) => boolean
): string[] {
  return lines
    .map((line, index) => ({ line, index }))
    .filter(({ line, index }) => isListed(line, index))
    .map(({ line, index }) => `${file}:${String(index + 1)}: ${line.trim()}`)
}

/**
The published files scanned for the denylist, the ones missing, and each line it matches
*/
function denylistScan(): { scanned: string[]; missing: string[]; matches: string[] } {
  const directory = path.join(ROOT, ISSUE_TEMPLATES)
  const templates = existsSync(directory)
    ? readdirSync(directory)
        .filter((name) => name.endsWith('.yml'))
        .map((name) => `${ISSUE_TEMPLATES}/${name}`)
    : []
  const missing = [
    ...DOCS.filter((file) => !existsSync(path.join(ROOT, file))),
    ...(templates.length === 0 ? [`${ISSUE_TEMPLATES}/*.yml`] : [])
  ]
  const scanned = [...DOCS, ...templates].filter((file) => existsSync(path.join(ROOT, file)))
  const matches = scanned.flatMap((file) =>
    linesWhere(file, read(file).split(/\r?\n/), (line) => DENYLIST.some((re) => re.test(line)))
  )
  process.stdout.write(
    `docs denylist: files scanned ${String(scanned.length)}, matches ${String(matches.length)}\n`
  )
  return { scanned, missing, matches }
}

/**
The CHANGELOG lines outside code fences that hold a bare `@word` outside a code span. The release
notes are copied from CHANGELOG.md, and GitHub turns a bare @word there into a mention of the
account of that name, notifying it and listing it as a contributor.
*/
function changelogMentions(): { lines: string[]; mentions: string[] } {
  let isFenced = false
  const lines = read('CHANGELOG.md').split(/\r?\n/)
  const prose = lines.map((line) => {
    if (line.trimStart().startsWith('```')) isFenced = !isFenced
    return isFenced ? '' : line.replaceAll(/`[^`]*`/g, '')
  })
  const mentions = linesWhere('CHANGELOG.md', lines, (_line, index) =>
    /(?:^|[^\w`/.])@[A-Z]/i.test(prose[index] ?? '')
  )
  process.stdout.write(
    `changelog mentions: lines scanned ${String(lines.length)}, bare @words ${String(mentions.length)}\n`
  )
  return { lines, mentions }
}

/**
The tsconfigs `npm run typecheck` passes to tsc, through the scripts it runs
*/
function typecheckConfigs(): string[] {
  return (scripts.get('typecheck') ?? '').split('&&').flatMap((command) => {
    const name = /^npm run ([\w:-]+)$/.exec(command.trim())?.at(1)
    const script = name === undefined ? command : (scripts.get(name) ?? '')
    return script
      .matchAll(/ -p (\S+)/g)
      .map(([, file = '']) => file)
      .toArray()
  })
}

/**
The scripts `npm run check` runs
*/
function checkGates(): string[] {
  return Array.from(
    (scripts.get('check') ?? '').matchAll(/npm run ([\w:-]+)/g),
    ([, gate = '']) => gate
  )
}

/**
The tsconfigs among `configs` that are not strict as tsc resolves them, through `extends`
*/
function nonStrictConfigs(configs: string[]): string[] {
  return configs.filter((file) => {
    const parsed = ts.readConfigFile(path.join(ROOT, file), (name) => ts.sys.readFile(name))
    const config: unknown = Reflect.get(parsed, 'config')
    // `extends` resolves from the config's own folder (tools/tsconfig.json is not at the root)
    const base = path.join(ROOT, file, '..')
    return ts.parseJsonConfigFileContent(config, ts.sys, base).options.strict !== true
  })
}

describe('published docs match the code', () => {
  it(`the README parameter-type table lists all ${String(ALL_PARAM_TYPES.size)} types`, () => {
    const listed = tableAfter('### Parameter Types').flatMap((row) =>
      (row.at(-1) ?? '').split(',').map((type) => type.replaceAll('`', '').trim())
    )
    process.stdout.write(
      `README parameter types: listed ${String(listed.length)}, in the code ${String(ALL_PARAM_TYPES.size)}\n`
    )

    expect(listed.filter((type, index) => listed.indexOf(type) !== index)).toStrictEqual([])
    expect(listed.toSorted(byCodeUnit)).toStrictEqual([...ALL_PARAM_TYPES].toSorted(byCodeUnit))
  })

  it('the README category table names every template category', () => {
    const listed = tableAfter('### Code Template Library').map((row) =>
      (row.at(0) ?? '').replaceAll('**', '')
    )
    const names = CATEGORIES.map((category) => category.name)
    const differing = listed.filter((name) => !names.includes(name))
    process.stdout.write(
      `README template categories: listed ${String(listed.length)}, in the code ${String(names.length)}, differing ${String(differing.length)}\n`
    )

    expect(names.length).toBeGreaterThan(0)
    expect(listed.toSorted(byCodeUnit)).toStrictEqual(names.toSorted(byCodeUnit))
  })

  it('published docs carry no counts, version numbers or version badges', () => {
    const { scanned, missing, matches } = denylistScan()

    expect(scanned.length).toBeGreaterThan(0)
    expect({ missing, matches }).toStrictEqual({ missing: [], matches: [] })
  })

  it('the CHANGELOG writes annotation tags in code spans, so release notes mention no one', () => {
    const { lines, mentions } = changelogMentions()

    expect(lines.length).toBeGreaterThan(0)
    expect(mentions).toStrictEqual([])
  })

  it('the README shows the tsc-strict badge only while every type-checked tsconfig is strict', () => {
    const configs = typecheckConfigs()
    const nonStrict = nonStrictConfigs(configs)
    process.stdout.write(
      `strict badge: tsconfigs ${String(configs.length)}, non-strict ${String(nonStrict.length)}\n`
    )
    const isBadgeShown = /img\.shields\.io\/badge\/tsc-strict\b/.test(readme)

    expect(configs.length).toBeGreaterThan(0)
    // A non-strict tsconfig is wrong only while the badge claims strictness
    expect(isBadgeShown ? nonStrict : []).toStrictEqual([])
  })

  it('the README names every gate `npm run check` runs', () => {
    const gates = checkGates()
    // The paragraph under the Development commands that lists the gates
    const start = readme.indexOf('`npm run check` runs')
    const paragraph = start === -1 ? '' : readme.slice(start, readme.indexOf('\n\n', start))
    const missing = gates.filter((gate) => !paragraph.includes(`\`${gate}\``))

    expect(gates.length).toBeGreaterThan(0)
    expect(missing).toStrictEqual([])
  })

  it('the README stack table names every test folder and the end-to-end suite', () => {
    const tests = tableAfter('## Stack').filter((row) => row.at(0) === 'Tests')

    expect(tests).toHaveLength(1)

    const cells = tests.at(0)?.join(' ') ?? ''
    const named = [...TEST_DIRS.map((directory) => `tests/${directory}/`), 'e2e/']
    const missing = named.filter((folder) => !cells.includes(`\`${folder}\``))
    process.stdout.write(
      `README test folders: named ${String(named.length - missing.length)}/${String(named.length)}\n`
    )

    expect(missing).toStrictEqual([])
  })

  it('the README screenshots and tracked screenshots are the same files', () => {
    const referenced = [...new Set(readme.match(/screenshots\/[\w.-]+\.png/g))].toSorted(byCodeUnit)
    const tracked = execFileSync('git', ['ls-files', '--', 'screenshots/*.png'], {
      cwd: ROOT,
      encoding: 'utf8'
    })
      .split('\n')
      .filter(Boolean)
      .toSorted(byCodeUnit)
    process.stdout.write(
      `README screenshots: referenced ${String(referenced.length)} / tracked ${String(tracked.length)}\n`
    )

    expect(referenced.filter((file) => !existsSync(path.join(ROOT, file)))).toStrictEqual([])
    expect(referenced).toStrictEqual(tracked)
  })
})
