// A bare tool name in a script resolves to whatever is on PATH; on a tree installed
// without bin links that is a global install of another version.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const readJson = (file: string): unknown => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'))

/**
A member of a value parsed from JSON; undefined when the value holds no such member.
*/
function member(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}

const listed = member(readJson('package.json'), 'scripts')
const scripts = new Map(
  (typeof listed === 'object' && listed !== null ? Object.keys(listed) : []).flatMap(
    (name): [string, string][] => {
      const body = member(listed, name)
      return typeof body === 'string' ? [[name, body]] : []
    }
  )
)
// A script's text; empty when package.json has no such script
const script = (name: string): string => scripts.get(name) ?? ''

// Packages whose bin file a script must name exactly
const PINNED_BINS = new Set([
  'eslint',
  'typescript',
  'prettier',
  'electron-builder',
  'electron-vite',
  'vitest',
  '@playwright/test',
  'dependency-cruiser',
  'knip',
  'type-coverage',
  'jscpd'
])

const NPM_RUN = /^npm run ([\w:-]+)(?: -- .+)?$/
const NPM_TEST = /^npm test(?: -- .+)?$/
const NODE_SCRIPT = /^node (scripts\/\S+)(?: .+)?$/
const NODE_MODULE = /^node node_modules\/((?:@[^/\s]+\/)?[^/\s]+)\/(\S+)(?: .+)?$/

const commandsOf = (body: string): string[] => body.split('&&').map((c) => c.trim())

function binPaths(name: string): string[] {
  const bin = member(readJson(`node_modules/${name}/package.json`), 'bin')
  const paths: unknown[] = typeof bin === 'object' && bin !== null ? Object.values(bin) : [bin]
  return paths.flatMap((p) => (typeof p === 'string' ? p.replace(/^\.\//, '') : []))
}

const isTracked = (file: string): boolean =>
  execFileSync('git', ['ls-files', '--', file], { cwd: ROOT, encoding: 'utf8' }).trim() !== ''

const CD = /^cd ([\w.-]+)$/
// Each command of a script with the folder an earlier `cd` in that script moved it to
function located(body: string): { c: string; folder: string }[] {
  let folder = '.'
  return commandsOf(body).map((c) => {
    folder = CD.exec(c)?.at(1) ?? folder
    return { c, folder }
  })
}

// Why a command run from a folder is rejected, or null when it is allowed
function locatedProblem(raw: string, folder: string): string | null {
  if (CD.test(raw)) return isTracked(folder) ? null : `moves to an untracked folder ${folder}`
  // A tool path from a moved-to folder names the root's node_modules through that folder
  return problem(
    raw.replace(`node ${path.posix.relative(folder, '.')}/node_modules/`, 'node node_modules/')
  )
}

// Why a command is rejected, or null when it is allowed
function problem(command: string): string | null {
  const run = NPM_RUN.exec(command)?.at(1)
  if (run !== undefined) return scripts.has(run) ? null : `runs a missing script "${run}"`
  if (NPM_TEST.test(command)) return null
  const local = NODE_SCRIPT.exec(command)?.at(1)
  if (local !== undefined) return isTracked(local) ? null : `runs an untracked file ${local}`
  const tool = NODE_MODULE.exec(command)
  if (tool) {
    const name = tool.at(1) ?? ''
    const file = tool.at(2) ?? ''
    if (file.startsWith('.bin/')) return 'calls a .bin shim'
    if (!existsSync(path.join(ROOT, 'node_modules', name, file)))
      return `calls a missing file ${file}`
    if (PINNED_BINS.has(name) && !binPaths(name).includes(file))
      return `calls ${name}/${file}, not its package bin`
    return null
  }
  return 'calls a tool by bare name'
}

const README = readFileSync(path.join(ROOT, 'README.md'), 'utf8')
// The README's text from its `## heading` line to the next heading; empty when it has none
function section(heading: string): string {
  const start = README.indexOf(`\n## ${heading}\n`)
  if (start === -1) return ''
  const end = README.indexOf('\n## ', start + 1)
  return README.slice(start, end === -1 ? README.length : end)
}
const DEVELOPMENT_LINES = README.slice(
  README.indexOf('\n## Development\n'),
  README.indexOf('\n## Layout\n')
).split('\n')
// The Development line that runs a command and explains it in a comment
const commented = (command: string): string | undefined =>
  DEVELOPMENT_LINES.find((line) => line.startsWith(`${command} `) && line.includes(' # '))

// Whether a workflow job runs the Windows package script
function doesJobPackage(file: string, job: string): boolean {
  const lines = readFileSync(path.join(ROOT, '.github/workflows', file), 'utf8').split(/\r?\n/)
  const start = lines.indexOf(`  ${job}:`)
  if (start === -1) return false
  const end = lines.findIndex((line, index) => index > start && /^ {0,2}\S/.test(line))
  return lines
    .slice(start + 1, end === -1 ? lines.length : end)
    .includes('      - run: npm run package:win')
}
const PACKAGE_JOBS: [file: string, job: string][] = [
  ['ci.yml', 'package-win'],
  ['release.yml', 'build']
]

describe('package.json scripts', () => {
  it('every script calls its tool by its package bin path', () => {
    const commands = [...scripts].flatMap(([name, body]) =>
      located(body).map((at) => ({ name, ...at }))
    )
    process.stdout.write(
      `package scripts: scripts ${String(scripts.size)}, commands ${String(commands.length)}\n`
    )

    expect(commands.length).toBeGreaterThan(0)

    const failures = commands.flatMap(({ name, c, folder }) => {
      const why = locatedProblem(c, folder)
      return why === null ? [] : `${name}: "${c}" ${why}`
    })

    expect(failures).toStrictEqual([])
  })

  it('check runs the local gate and leaves out the toolchain check', () => {
    expect(scripts.get('check')).toBeDefined()
    expect(commandsOf(script('check'))).not.toContain('npm run ci:toolchain')
  })

  it('check runs the golden project once besides the full suite, with coverage', () => {
    const golden = commandsOf(script('check')).filter((c) =>
      script(NPM_RUN.exec(c)?.at(1) ?? '').includes('--project golden')
    )

    expect(golden).toStrictEqual(['npm run test:golden:coverage'])
  })

  it('check runs the static gates in their CI order', () => {
    const gates = [
      'npm run ci:runtime-deps',
      'npm run lint',
      'npm run typecheck',
      'npm run typecov:report',
      'npm run deps',
      'npm run knip:report',
      'npm run jscpd:report',
      'npm run format:check',
      'npm run strictness:status',
      'npm run licenses -- --check'
    ]

    expect(commandsOf(script('check')).slice(0, gates.length)).toStrictEqual(gates)
  })

  it('each type coverage script runs one program or the report that holds their ceilings', () => {
    const typecov = scripts
      .keys()
      .filter((name) => name === 'typecov' || name.startsWith('typecov:'))
      .toArray()
    const other = typecov.filter((name) => name.split(':').length !== 2)

    expect(typecov.length).toBeGreaterThan(1)
    expect(other).toStrictEqual([])
  })

  it('the lint covers the whole tree and fails on any warning', () => {
    expect(scripts.get('lint')).toBe('node node_modules/eslint/bin/eslint.js --max-warnings 0 .')
    expect(scripts.get('lint:scripts')).toBeUndefined()
  })

  it('the format check covers the whole tree the formatter writes', () => {
    expect(scripts.get('format:check')).toBe(
      'node node_modules/prettier/bin/prettier.cjs --check .'
    )
    expect(scripts.get('format:check')).toBe(script('format').replace('--write', '--check'))
  })

  it('typecheck includes the scripts project', () => {
    expect(commandsOf(script('typecheck'))).toContain('npm run typecheck:scripts')
  })

  it('typecheck includes the e2e project', () => {
    expect(commandsOf(script('typecheck'))).toContain('npm run typecheck:e2e')
  })

  it('the Windows package script never publishes', () => {
    expect(scripts.get('package:win')).toMatch(/ --publish never(?: |$)/)
  })
})

describe('package.json scripts: README and workflows', () => {
  it('a script runs the golden commit rules outside check, and the README names it', () => {
    const runners = [...scripts]
      .filter(([, body]) =>
        commandsOf(body).some(
          (c) => NODE_SCRIPT.exec(c)?.at(1) === 'scripts/check-golden-commits.mjs'
        )
      )
      .map(([name]) => name)
    process.stdout.write(`golden commit rules: scripts running them ${String(runners.length)}\n`)

    expect(runners).toStrictEqual(['check:commits'])
    expect(commandsOf(script('check'))).not.toContain('npm run check:commits')
    expect(
      ['Development', 'Contributing'].map((heading) => [
        heading,
        section(heading).includes('npm run check:commits')
      ])
    ).toStrictEqual([
      ['Development', true],
      ['Contributing', true]
    ])
  })

  it('a script runs the core-script parity check, and the README names it', () => {
    expect(scripts.get('test:parity')).toBe(
      'node node_modules/vitest/vitest.mjs run --project node tests/integration/mz-parity.test.ts'
    )
    expect(commandsOf(script('check'))).not.toContain('npm run test:parity')
    expect(DEVELOPMENT_LINES.join('\n')).toContain(
      'MZ_CORESCRIPT_DIR=<core-scripts-folder> npm run test:parity'
    )
  })

  it('the README names the e2e commands, and that check and typecheck differ on e2e', () => {
    const e2e = ['npm run e2e:prepare', 'npm run e2e', 'npm run e2e:visual:update']
    const named = e2e.filter((command) => commented(command) !== undefined)
    process.stdout.write(
      `README e2e commands: named ${String(named.length)}/${String(e2e.length)}\n`
    )

    expect(named).toStrictEqual(e2e)
    expect(commandsOf(script('check')).filter((c) => c.startsWith('npm run e2e'))).toStrictEqual([])
    expect(commented('npm run check')).toMatch(/not the e2e suite/)
    expect(commented('npm run typecheck')).toMatch(/\be2e\b/)
  })

  it('the CI and the release package the exe with that script', () => {
    expect(PACKAGE_JOBS.map(([file, job]) => [file, job, doesJobPackage(file, job)])).toStrictEqual(
      PACKAGE_JOBS.map(([file, job]) => [file, job, true])
    )
  })
})
