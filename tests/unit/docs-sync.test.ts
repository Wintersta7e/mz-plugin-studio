import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ALL_PARAM_TYPES } from '../../src/shared/types/plugin'
import { CATEGORIES } from '../../src/renderer/src/lib/generator/templates/types'

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
