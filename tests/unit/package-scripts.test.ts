// A bare tool name in a script resolves to whatever is on PATH; on a tree installed
// without bin links that is a global install of another version.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { typeScriptPrograms } from '../../scripts/typecov.mjs'
import { readJobs } from '../helpers/workflow-reader'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const readJsonAt = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'))
const readJson = (file: string): unknown => readJsonAt(path.join(ROOT, file))

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

// Every command a shell would run, so one behind `||`, `;` or a pipe is checked like one behind `&&`
const commandsOf = (body: string): string[] => body.split(/&&|\|\||;|\|/v).map((c) => c.trim())
// The toolchain check runs in CI only: it holds the running Node to the version CI installs
const TOOLCHAIN = 'npm run ci:toolchain'

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
    expect(commandsOf(script('check'))).not.toContain(TOOLCHAIN)
  })

  it('check runs the golden project once besides the full suite, with coverage', () => {
    const golden = commandsOf(script('check')).filter((c) =>
      script(NPM_RUN.exec(c)?.at(1) ?? '').includes('--project golden')
    )

    expect(golden).toStrictEqual(['npm run test:golden:coverage'])
  })

  it('check runs the static gates in their CI order', () => {
    const staticJob = readJobs(path.join(ROOT, '.github/workflows/ci.yml')).find(
      (job) => job.id === 'static'
    )
    const gates = (staticJob?.steps ?? [])
      .flatMap((step) => step.run)
      .filter((line) => line.startsWith('npm run ') && line !== TOOLCHAIN)
    process.stdout.write(`check: static gates ${String(gates.length)}\n`)

    expect(gates.length).toBeGreaterThan(0)
    expect(commandsOf(script('check')).slice(0, gates.length)).toStrictEqual(gates)
  })

  it('each type coverage script runs one program, or the runner that runs them all', () => {
    const typecov = scripts
      .keys()
      .filter((name) => name === 'typecov' || name.startsWith('typecov:'))
      .toArray()
    const other = typecov.filter((name) => name.split(':').length !== 2)

    expect(typecov.length).toBeGreaterThan(1)
    expect(other).toStrictEqual(['typecov'])
    expect(scripts.get('typecov')).toBe('node scripts/typecov.mjs')
  })

  it('check runs both knip modes, and the production run allows no finding', () => {
    expect(commandsOf(script('check'))).toContain('npm run knip')
    expect(commandsOf(script('check'))).toContain('npm run knip:production')
    expect(script('knip:production')).not.toContain('--max-issues')
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

describe('package.json scripts: TypeScript programs', () => {
  it('typecheck and type coverage name exactly the TypeScript programs', () => {
    const programs = typeScriptPrograms(ROOT).map((program) => program.name)
    const named = (prefix: string): Set<string> =>
      new Set(
        scripts
          .keys()
          .filter((name) => name.startsWith(prefix))
          .map((name) => name.slice(prefix.length))
      )
    process.stdout.write(`programs ${String(programs.length)}\n`)

    expect(programs.length).toBeGreaterThan(0)
    expect(commandsOf(script('typecheck'))).toStrictEqual(
      programs.map((name) => `npm run typecheck:${name}`)
    )
    expect(named('typecheck:')).toStrictEqual(new Set(programs))
    expect(named('typecov:')).toStrictEqual(new Set(programs))
  })

  it("each program's type coverage script fails below full coverage", () => {
    const lax = typeScriptPrograms(ROOT)
      .map((program) => `typecov:${program.name}`)
      .filter((name) => !script(name).endsWith(' --at-least 100'))

    expect(lax).toStrictEqual([])
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

// The package.json override that installs the jsx-a11y ESLint plugin beside an ESLint its peer
// range does not admit. npm stays silent once a release of the plugin admits that ESLint, so the
// override would outlive its need unnoticed.
const A11Y_PLUGIN = 'eslint-plugin-jsx-a11y'
interface A11yFiles {
  manifest: string
  plugin: string
  eslint: string
}
const A11Y_FILES: A11yFiles = {
  manifest: path.join(ROOT, 'package.json'),
  plugin: path.join(ROOT, 'node_modules', A11Y_PLUGIN, 'package.json'),
  eslint: path.join(ROOT, 'node_modules', 'eslint', 'package.json')
}

// The majors a peer range of `^N` alternatives admits; undefined for a range of any other form.
const caretMajors = (range: string): number[] | undefined => {
  const majors = range
    .split('||')
    .map((part) => /^\^(?<major>\d+)(?:\.\d+){0,2}$/v.exec(part.trim())?.groups?.['major'])
  return majors.every((major): major is string => major !== undefined)
    ? majors.map(Number)
    : undefined
}

// The plugin's peer range for ESLint, the installed ESLint major, and what to do with the
// override: empty while the override is present exactly when the range excludes that major.
const a11yOverride = (files: A11yFiles): { range: string; major: number; action: string } => {
  const range = member(member(readJsonAt(files.plugin), 'peerDependencies'), 'eslint')
  const version = member(readJsonAt(files.eslint), 'version')
  const major = Number(String(version).split('.', 1)[0])
  const hasOverride =
    member(member(readJsonAt(files.manifest), 'overrides'), A11Y_PLUGIN) !== undefined
  const majors = typeof range === 'string' ? caretMajors(range) : undefined
  const shown = String(range)
  let action = ''
  if (majors === undefined) {
    action = `read the ${A11Y_PLUGIN} peer range ${shown} by hand: it is not a list of ^N ranges`
  } else if (hasOverride && majors.includes(major)) {
    action = `remove the override: ${A11Y_PLUGIN} admits ESLint ${String(major)} (${shown})`
  } else if (!hasOverride && !majors.includes(major)) {
    action = `add back the override: ${A11Y_PLUGIN} excludes ESLint ${String(major)} (${shown})`
  }
  return { range: shown, major, action }
}

// The override's verdict on copies of the three manifests, with `change` applied to the copy
// of the one it names.
const a11yOverrideOn = (
  name: keyof A11yFiles,
  change: (value: Record<string, unknown>) => Record<string, unknown>
): string => {
  const directory = mkdtempSync(path.join(tmpdir(), 'a11y-override-'))
  const copyOf = (key: keyof A11yFiles): string => {
    const copy = path.join(directory, `${key}.json`)
    const parsed = readJsonAt(A11Y_FILES[key])
    const value = typeof parsed === 'object' && parsed !== null ? { ...parsed } : {}
    writeFileSync(copy, JSON.stringify(key === name ? change(value) : value))
    return copy
  }
  try {
    return a11yOverride({
      manifest: copyOf('manifest'),
      plugin: copyOf('plugin'),
      eslint: copyOf('eslint')
    }).action
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe('package.json overrides', () => {
  it('the jsx-a11y override stays only while its peer range excludes the installed ESLint', () => {
    const { range, major, action } = a11yOverride(A11Y_FILES)
    process.stdout.write(`jsx-a11y peer eslint ${range}, installed ${String(major)}\n`)

    expect(major).toBeGreaterThan(0)
    expect(action).toBe('')
  })

  it('names the jsx-a11y override to remove once the peer range admits the installed ESLint, or to add back', () => {
    const admitted = a11yOverrideOn('plugin', (plugin) => ({
      ...plugin,
      peerDependencies: { eslint: '^10' }
    }))
    const missing = a11yOverrideOn('manifest', (manifest) => ({ ...manifest, overrides: {} }))
    const unread = a11yOverrideOn('plugin', (plugin) => ({
      ...plugin,
      peerDependencies: { eslint: '>=9' }
    }))

    expect(admitted).toContain(`remove the override: ${A11Y_PLUGIN} admits ESLint`)
    expect(missing).toContain(`add back the override: ${A11Y_PLUGIN} excludes ESLint`)
    expect(unread).toContain('by hand: it is not a list of ^N ranges')
  })
})

// The override that lifts the qs copy the mutation tester's HTTP client pins exactly to a release
// past its advisories; once the client asks for a range instead, the override can go.
const versionParts = (version: string): number[] => version.split('.').map(Number)
const isOlder = (version: string, than: string): boolean => {
  const [a, b] = [versionParts(version), versionParts(than)]
  const at = a.findIndex((part, index) => part !== b[index])
  return at !== -1 && (a[at] ?? 0) < (b[at] ?? 0)
}

describe('package.json overrides: qs', () => {
  it('the qs override stays only while typed-rest-client pins an older qs', () => {
    const client = readJson('node_modules/typed-rest-client/package.json')
    const overrides = member(readJson('package.json'), 'overrides')
    const pinned = String(member(member(client, 'dependencies'), 'qs'))
    const forced = String(member(member(overrides, 'typed-rest-client'), 'qs'))
    process.stdout.write(`typed-rest-client qs ${pinned}, override ${forced}\n`)

    expect({
      exactPin: /^\d+\.\d+\.\d+$/v.test(pinned),
      older: isOlder(pinned, forced)
    }).toStrictEqual({ exactPin: true, older: true })
  })
})

// The Dependabot hold that keeps TypeScript on the minor the installed typescript-eslint supports.
// Its comment, the exact pin and the peer range agree; the hold goes once the range admits the
// next minor.
const TYPESCRIPT_HOLD =
  /^\s*# Hold TypeScript at (\d+\.\d+)\.x: typescript-eslint \S+ supports typescript (.+)\. Remove when/v
const COMPARATOR = /^([<>]=?|=)?(\d+\.\d+\.\d+)$/v
const COMPARES = new Map<string, (version: string, bound: string) => boolean>([
  ['>=', (version, bound) => !isOlder(version, bound)],
  ['>', (version, bound) => isOlder(bound, version)],
  ['<=', (version, bound) => !isOlder(bound, version)],
  ['<', (version, bound) => isOlder(version, bound)],
  ['=', (version, bound) => version === bound]
])

// Whether a version satisfies a range of `||` alternatives, each of space-separated comparators;
// undefined when a comparator has another form (read the range by hand then)
function satisfies(version: string, range: string): boolean | undefined {
  const alternatives = range.split('||').map((alternative) =>
    alternative
      .trim()
      .split(/\s+/v)
      .map((part) => COMPARATOR.exec(part))
  )
  const isAdmitted = (comparators: (RegExpExecArray | null)[]): boolean =>
    comparators.every(
      (match) => COMPARES.get(match?.at(1) ?? '=')?.(version, match?.at(2) ?? '') === true
    )
  return alternatives.flat().includes(null)
    ? undefined
    : alternatives.some((comparators) => isAdmitted(comparators))
}

describe('dependabot: the TypeScript hold', () => {
  it('holds TypeScript on its pinned minor while the installed typescript-eslint excludes the next', () => {
    const lines = readFileSync(path.join(ROOT, '.github/dependabot.yml'), 'utf8').split('\n')
    const at = lines.findIndex((line) => line.trim() === '- dependency-name: typescript')
    const hold = TYPESCRIPT_HOLD.exec(lines.at(at - 1) ?? '')
    const devDependencies = member(readJson('package.json'), 'devDependencies')
    const pinned = String(member(devDependencies, 'typescript'))
    const linter = readJson('node_modules/typescript-eslint/package.json')
    const range = String(member(member(linter, 'peerDependencies'), 'typescript'))
    const [major = 0, minor = 0] = versionParts(pinned)
    const next = `${String(major)}.${String(minor + 1)}.0`
    process.stdout.write(
      `typescript ${pinned}, hold ${String(hold?.at(1))}.x, typescript-eslint ${String(member(linter, 'version'))} peer typescript ${range}\n`
    )

    expect(at).toBeGreaterThan(0)
    expect({
      updateTypes: lines.at(at + 1)?.trim(),
      exactPin: /^\d+\.\d+\.\d+$/v.test(pinned),
      heldMinor: hold?.at(1),
      commentRange: hold?.at(2),
      pinAdmitted: satisfies(pinned, range),
      nextMinorAdmitted: satisfies(next, range)
    }).toStrictEqual({
      updateTypes: 'update-types: [version-update:semver-major, version-update:semver-minor]',
      exactPin: true,
      heldMinor: `${String(major)}.${String(minor)}`,
      commentRange: range,
      pinAdmitted: true,
      nextMinorAdmitted: false
    })
  })
})

// What is wrong with a Stryker config's thresholds; empty when high, low and break are all
// numbers with break <= low <= high <= 100.
const thresholdProblem = (config: unknown): string => {
  const thresholds = member(config, 'thresholds')
  const [floor, low, high] = ['break', 'low', 'high'].map((key) => member(thresholds, key))
  if (typeof floor !== 'number' || typeof low !== 'number' || typeof high !== 'number') {
    return `thresholds break, low and high must all be numbers: ${JSON.stringify(thresholds)}`
  }
  return floor <= low && low <= high && high <= 100
    ? ''
    : `thresholds must hold break <= low <= high <= 100: ${JSON.stringify(thresholds)}`
}

describe('package.json scripts: mutation testing', () => {
  it('the mutation thresholds set break, low and high together, in order', () => {
    expect(thresholdProblem(readJson('stryker.config.json'))).toBe('')
  })

  it('names a missing or misordered mutation threshold', () => {
    const config = readJson('stryker.config.json')
    const withThresholds = (thresholds: Record<string, number>): unknown => ({
      ...(typeof config === 'object' && config),
      thresholds
    })

    expect(thresholdProblem(withThresholds({ break: 50, low: 50 }))).toContain(
      'must all be numbers'
    )
    expect(thresholdProblem(withThresholds({ break: 60, low: 50, high: 70 }))).toContain(
      'break <= low <= high <= 100'
    )
    expect(thresholdProblem(withThresholds({ break: 50, low: 50, high: 101 }))).toContain(
      'break <= low <= high <= 100'
    )
  })

  it('mutation testing of a range without a source change runs nothing', () => {
    const run = spawnSync(process.execPath, ['scripts/mutation.mjs', '--since', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8'
    })
    const bare = spawnSync(process.execPath, ['scripts/mutation.mjs'], {
      cwd: ROOT,
      encoding: 'utf8'
    })

    expect({ status: run.status, stdout: run.stdout }).toStrictEqual({
      status: 0,
      stdout: 'mutation: no src change\n'
    })
    expect({ status: bare.status, stdout: bare.stdout }).toStrictEqual({
      status: 2,
      stdout: 'usage: node scripts/mutation.mjs --since <base>\n'
    })
  })
})
