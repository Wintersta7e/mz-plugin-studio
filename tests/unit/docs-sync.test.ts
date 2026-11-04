import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { ALL_PARAM_TYPES } from '../../src/shared/types/plugin'
import { CATEGORIES } from '../../src/renderer/src/lib/generator/templates/types'
import { TEST_DIRS } from '../helpers/test-dirs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const read = (file: string): string => readFileSync(join(ROOT, file), 'utf8')

// Published files whose numbers and names drift; CHANGELOG.md is a dated record and is not checked
const DOCS = ['README.md', 'docs/USER_GUIDE.md', 'docs/CONTRIBUTING_TEMPLATES.md', 'SECURITY.md']
const ISSUE_TEMPLATES = '.github/ISSUE_TEMPLATE'
const DENYLIST = [
  /\b\d+\+?\s+(?:[\w.&/-]+\s+){0,3}?(tests?|suites?|templates?|categories|classes|methods|(parameter\s+)?types|global objects|names|database types|objects)\b/i,
  /\b(Electron|TypeScript|React|Node(\.js)?|Vite|Tailwind( CSS)?|Monaco|Vitest|Playwright)[\s-]v?\d+/i,
  /img\.shields\.io\/badge\/(Electron|React|TypeScript|Node|Vite|Tailwind)/
]

// Body rows of the first table under `heading`, each as trimmed cells
function tableAfter(markdown: string, heading: string): string[][] {
  const lines = markdown.split(/\r?\n/)
  const start = lines.indexOf(heading)
  if (start === -1) throw new Error(`no "${heading}" heading`)
  const rows: string[][] = []
  for (const line of lines.slice(start + 1)) {
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

describe('published docs match the code', () => {
  const readme = read('README.md')
  const { scripts } = JSON.parse(read('package.json')) as {
    scripts: Record<string, string> & { check: string }
  }

  it(`README parameter-type table lists all ${ALL_PARAM_TYPES.size} types`, () => {
    const listed = tableAfter(readme, '### Parameter Types').flatMap((row) =>
      row[row.length - 1].split(',').map((type) => type.replace(/`/g, '').trim())
    )
    console.log(
      `README parameter types: listed ${listed.length}, in the code ${ALL_PARAM_TYPES.size}`
    )

    expect(listed.filter((type, i) => listed.indexOf(type) !== i)).toEqual([])
    expect([...listed].sort()).toEqual([...ALL_PARAM_TYPES].sort())
  })

  it('README category table names every template category', () => {
    const listed = tableAfter(readme, '### Code Template Library').map((row) =>
      row[0].replace(/\*\*/g, '')
    )
    const names = CATEGORIES.map((category) => category.name)
    const differing = listed.filter((name) => !names.includes(name))
    console.log(
      `README template categories: listed ${listed.length}, in the code ${names.length}, differing ${differing.length}`
    )

    expect(names.length).toBeGreaterThan(0)
    expect([...listed].sort()).toEqual([...names].sort())
  })

  it('published docs carry no counts, version numbers or version badges', () => {
    const dir = join(ROOT, ISSUE_TEMPLATES)
    const templates = existsSync(dir)
      ? readdirSync(dir)
          .filter((name) => name.endsWith('.yml'))
          .map((name) => `${ISSUE_TEMPLATES}/${name}`)
      : []
    const missing = DOCS.filter((file) => !existsSync(join(ROOT, file)))
    if (templates.length === 0) missing.push(`${ISSUE_TEMPLATES}/*.yml`)
    const scanned = [...DOCS, ...templates].filter((file) => existsSync(join(ROOT, file)))
    const matches = scanned.flatMap((file) =>
      read(file)
        .split(/\r?\n/)
        .flatMap((line, i) =>
          DENYLIST.some((re) => re.test(line)) ? [`${file}:${i + 1}: ${line.trim()}`] : []
        )
    )
    console.log(`docs denylist: files scanned ${scanned.length}, matches ${matches.length}`)

    expect(scanned.length).toBeGreaterThan(0)
    expect({ missing, matches }).toEqual({ missing: [], matches: [] })
  })

  it('CHANGELOG writes annotation tags in code spans, so release notes mention no one', () => {
    // The release notes are copied from CHANGELOG.md, and GitHub turns a bare @word there into a
    // mention of the account of that name, notifying it and listing it as a contributor
    let fenced = false
    const lines = read('CHANGELOG.md').split(/\r?\n/)
    const mentions = lines.flatMap((line, i) => {
      if (line.trimStart().startsWith('```')) fenced = !fenced
      if (fenced) return []
      const prose = line.replace(/`[^`]*`/g, '')
      return /(^|[^\w`/.])@[A-Za-z]/.test(prose) ? [`CHANGELOG.md:${i + 1}: ${line.trim()}`] : []
    })
    console.log(`changelog mentions: lines scanned ${lines.length}, bare @words ${mentions.length}`)

    expect(lines.length).toBeGreaterThan(0)
    expect(mentions).toEqual([])
  })

  it('README shows the tsc-strict badge only while every type-checked tsconfig is strict', () => {
    // The tsconfigs `npm run typecheck` passes to tsc, through the scripts it runs
    const configs = scripts.typecheck.split('&&').flatMap((command) => {
      const run = /^npm run ([\w:-]+)$/.exec(command.trim())
      const script = run ? (scripts[run[1]] ?? '') : command
      return [...script.matchAll(/ -p (\S+)/g)].map((match) => match[1])
    })
    // strict as tsc resolves it, through `extends`
    const nonStrict = configs.filter((file) => {
      const { config } = ts.readConfigFile(join(ROOT, file), ts.sys.readFile)
      // `extends` resolves from the config's own folder (tools/tsconfig.json is not at the root)
      const base = join(ROOT, file, '..')
      return ts.parseJsonConfigFileContent(config, ts.sys, base).options.strict !== true
    })
    console.log(`strict badge: tsconfigs ${configs.length}, non-strict ${nonStrict.length}`)

    expect(configs.length).toBeGreaterThan(0)

    if (/img\.shields\.io\/badge\/tsc-strict\b/.test(readme)) expect(nonStrict).toEqual([])
  })

  it('the README names every gate `npm run check` runs', () => {
    const gates = Array.from(scripts.check.matchAll(/npm run ([\w:-]+)/g), ([, gate = '']) => gate)
    // The paragraph under the Development commands that lists the gates
    const start = readme.indexOf('`npm run check` runs')
    const paragraph = start === -1 ? '' : readme.slice(start, readme.indexOf('\n\n', start))
    const missing = gates.filter((gate) => !paragraph.includes(`\`${gate}\``))

    expect(gates.length).toBeGreaterThan(0)
    expect(missing).toStrictEqual([])
  })

  it('README stack table names every test folder and the end-to-end suite', () => {
    const tests = tableAfter(readme, '## Stack').filter((row) => row[0] === 'Tests')

    expect(tests).toHaveLength(1)

    const named = [...TEST_DIRS.map((dir) => `tests/${dir}/`), 'e2e/']
    const missing = named.filter((path) => !tests[0].join(' ').includes(`\`${path}\``))
    console.log(`README test folders: named ${named.length - missing.length}/${named.length}`)

    expect(missing).toEqual([])
  })

  it('README screenshots and tracked screenshots are the same files', () => {
    const referenced = [...new Set(readme.match(/screenshots\/[\w.-]+\.png/g) ?? [])].sort()
    const tracked = execFileSync('git', ['ls-files', '--', 'screenshots/*.png'], {
      cwd: ROOT,
      encoding: 'utf8'
    })
      .split('\n')
      .filter(Boolean)
      .sort()
    console.log(`README screenshots: referenced ${referenced.length} / tracked ${tracked.length}`)

    expect(referenced.filter((file) => !existsSync(join(ROOT, file)))).toEqual([])
    expect(referenced).toEqual(tracked)
  })
})
