// A bare tool name in a script resolves to whatever is on PATH; on a tree installed
// without bin links that is a global install of another version.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const readJson = (file: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(ROOT, file), 'utf8'))

const scripts = readJson('package.json').scripts as Record<string, string>

// Packages whose bin file a script must name exactly
const PINNED_BINS = [
  'eslint',
  'typescript',
  'prettier',
  'electron-builder',
  'electron-vite',
  'vitest',
  '@playwright/test'
]

const NPM_RUN = /^npm run ([\w:-]+)(?: -- .+)?$/
const NPM_TEST = /^npm test(?: -- .+)?$/
const NODE_SCRIPT = /^node (scripts\/[^\s]+)(?: .+)?$/
const NODE_MODULE = /^node node_modules\/((?:@[^/\s]+\/)?[^/\s]+)\/([^\s]+)(?: .+)?$/

const commandsOf = (script: string): string[] => script.split('&&').map((c) => c.trim())

function binPaths(pkg: string): string[] {
  const { bin } = readJson(`node_modules/${pkg}/package.json`)
  const paths = typeof bin === 'string' ? [bin] : Object.values(bin as Record<string, string>)
  return paths.map((p) => p.replace(/^\.\//, ''))
}

const isTracked = (file: string): boolean =>
  execFileSync('git', ['ls-files', '--', file], { cwd: ROOT, encoding: 'utf8' }).trim() !== ''

// Why a command is rejected, or null when it is allowed
function problem(command: string): string | null {
  const run = NPM_RUN.exec(command)
  if (run) return run[1] in scripts ? null : `runs a missing script "${run[1]}"`
  if (NPM_TEST.test(command)) return null
  const local = NODE_SCRIPT.exec(command)
  if (local) return isTracked(local[1]) ? null : `runs an untracked file ${local[1]}`
  const tool = NODE_MODULE.exec(command)
  if (tool) {
    const [, pkg, path] = tool
    if (path.startsWith('.bin/')) return 'calls a .bin shim'
    if (!existsSync(join(ROOT, 'node_modules', pkg, path))) return `calls a missing file ${path}`
    if (PINNED_BINS.includes(pkg) && !binPaths(pkg).includes(path))
      return `calls ${pkg}/${path}, not its package bin`
    return null
  }
  return 'calls a tool by bare name'
}

describe('package.json scripts', () => {
  it('every script calls its tool by its package bin path', () => {
    const names = Object.keys(scripts)
    const commands = names.flatMap((name) => commandsOf(scripts[name]).map((c) => ({ name, c })))
    console.log(`package scripts: scripts ${names.length}, commands ${commands.length}`)
    expect(commands.length).toBeGreaterThan(0)
    const failures = commands.flatMap(({ name, c }) => {
      const why = problem(c)
      return why ? [`${name}: "${c}" ${why}`] : []
    })
    expect(failures).toEqual([])
  })

  it('check runs the local gate and leaves out the toolchain check', () => {
    expect(scripts.check).toBeDefined()
    expect(commandsOf(scripts.check)).not.toContain('npm run ci:toolchain')
  })

  it('check runs the golden project once besides the full suite, with coverage', () => {
    const golden = commandsOf(scripts.check).filter((c) =>
      (scripts[NPM_RUN.exec(c)?.[1] ?? ''] ?? '').includes('--project golden')
    )
    expect(golden).toEqual(['npm run test:golden:coverage'])
  })

  it('check runs the format check right after the lint', () => {
    const commands = commandsOf(scripts.check)
    const lint = commands.indexOf('npm run lint')
    expect(lint).toBeGreaterThanOrEqual(0)
    expect(commands.slice(lint + 1, lint + 2)).toEqual(['npm run format:check'])
  })

  it('the lint covers the whole tree and fails on any warning', () => {
    expect(scripts.lint).toBe('node node_modules/eslint/bin/eslint.js --max-warnings 0 .')
    expect(scripts['lint:scripts']).toBeUndefined()
  })

  it('the format check covers the whole tree the formatter writes', () => {
    expect(scripts['format:check']).toBe('node node_modules/prettier/bin/prettier.cjs --check .')
    expect(scripts['format:check']).toBe(scripts.format.replace('--write', '--check'))
  })

  it('a script runs the golden commit rules outside check, and the README names it', () => {
    const runners = Object.keys(scripts).filter((name) =>
      commandsOf(scripts[name]).some(
        (c) => NODE_SCRIPT.exec(c)?.[1] === 'scripts/check-golden-commits.mjs'
      )
    )
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')
    const section = (heading: string): string => {
      const start = readme.indexOf(`\n## ${heading}\n`)
      expect(start, heading).toBeGreaterThanOrEqual(0)
      const end = readme.indexOf('\n## ', start + 1)
      return readme.slice(start, end < 0 ? undefined : end)
    }
    console.log(`golden commit rules: scripts running them ${runners.length}`)
    expect(runners).toEqual(['check:commits'])
    expect(commandsOf(scripts.check)).not.toContain('npm run check:commits')
    for (const heading of ['Development', 'Contributing'])
      expect(section(heading), heading).toContain('npm run check:commits')
  })

  it('a script runs the core-script parity check, and the README names it', () => {
    expect(scripts['test:parity']).toBe(
      'node node_modules/vitest/vitest.mjs run --project node tests/integration/mz-parity.test.ts'
    )
    expect(commandsOf(scripts.check)).not.toContain('npm run test:parity')
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')
    const development = readme.slice(
      readme.indexOf('\n## Development\n'),
      readme.indexOf('\n## Layout\n')
    )
    expect(development).toContain('MZ_CORESCRIPT_DIR=<core-scripts-folder> npm run test:parity')
  })

  it('the README names the e2e commands, and that check and typecheck differ on e2e', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')
    const lines = readme
      .slice(readme.indexOf('\n## Development\n'), readme.indexOf('\n## Layout\n'))
      .split('\n')
    const commented = (command: string): string | undefined =>
      lines.find((line) => line.startsWith(`${command} `) && line.includes(' # '))
    const e2e = ['npm run e2e:prepare', 'npm run e2e', 'npm run e2e:visual:update']
    const named = e2e.filter((command) => commented(command) !== undefined)
    console.log(`README e2e commands: named ${named.length}/${e2e.length}`)
    expect(named).toEqual(e2e)
    expect(commandsOf(scripts.check).filter((c) => c.startsWith('npm run e2e'))).toEqual([])
    expect(commented('npm run check')).toMatch(/not the e2e suite/)
    expect(commented('npm run typecheck')).toMatch(/\be2e\b/)
  })

  it('typecheck includes the scripts project', () => {
    expect(commandsOf(scripts.typecheck)).toContain('npm run typecheck:scripts')
  })

  it('typecheck includes the e2e project', () => {
    expect(commandsOf(scripts.typecheck)).toContain('npm run typecheck:e2e')
  })

  it('the Windows package script never publishes', () => {
    expect(scripts['package:win']).toMatch(/ --publish never(?: |$)/)
  })

  it('CI and the release package the exe with that script', () => {
    for (const [file, job] of [
      ['ci.yml', 'package-win'],
      ['release.yml', 'build']
    ]) {
      const lines = readFileSync(join(ROOT, '.github/workflows', file), 'utf8').split(/\r?\n/)
      const start = lines.indexOf(`  ${job}:`)
      expect(start, `${file} ${job}`).toBeGreaterThanOrEqual(0)
      const end = lines.findIndex((line, index) => index > start && /^ {0,2}\S/.test(line))
      const body = lines.slice(start + 1, end < 0 ? undefined : end)
      expect(body, `${file} ${job}`).toContain('      - run: npm run package:win')
    }
  })
})
