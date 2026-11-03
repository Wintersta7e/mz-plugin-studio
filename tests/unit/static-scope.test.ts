// Every tracked code file is type-checked by a program on the one strict flag set, data files are in none.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { basename, dirname, join, matchesGlob, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import scope from '../../lint-scope.json'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const STRICT_FILE = 'tsconfig.strict.json'

const STRICT_FLAGS: Record<string, boolean> = {
  strict: true,
  noImplicitAny: true,
  allowUnusedLabels: false,
  allowUnreachableCode: false,
  exactOptionalPropertyTypes: true,
  noFallthroughCasesInSwitch: true,
  noImplicitOverride: true,
  noImplicitReturns: true,
  noPropertyAccessFromIndexSignature: true,
  noUncheckedIndexedAccess: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  isolatedModules: true,
  verbatimModuleSyntax: true,
  erasableSyntaxOnly: true,
  noUncheckedSideEffectImports: true,
  forceConsistentCasingInFileNames: true
}

// Root `tsconfig.json` references these, in this order; a flag a program does not meet yet waits in its pending file.
const PROGRAMS = [
  { name: 'node', config: 'tsconfig.node.json', pending: 'tsconfig.node.pending.json' },
  { name: 'web', config: 'tsconfig.web.json', pending: 'tsconfig.web.pending.json' },
  { name: 'test', config: 'tsconfig.test.json', pending: 'tsconfig.test.pending.json' },
  { name: 'tools', config: 'tools/tsconfig.json', pending: 'tsconfig.tools.pending.json' },
  { name: 'scripts', config: 'tsconfig.scripts.json', pending: 'tsconfig.scripts.pending.json' },
  { name: 'e2e', config: 'tsconfig.e2e.json', pending: 'tsconfig.e2e.pending.json' }
]

// The only files more than one program may hold, each with the programs allowed to hold it.
const PROGRAM_OVERLAPS: { glob: string; programs: string[] }[] = [
  { glob: 'src/main/csp.ts', programs: ['node', 'test', 'e2e'] },
  { glob: 'src/main/services/syntax-check.ts', programs: ['node', 'test', 'e2e'] },
  { glob: 'src/main/window-size.ts', programs: ['node', 'test', 'e2e'] },
  { glob: 'src/main/**', programs: ['node', 'test'] },
  { glob: 'src/shared/annotation-blocks.ts', programs: ['node', 'web', 'test', 'e2e'] },
  { glob: 'src/shared/ipc-types.ts', programs: ['node', 'web', 'test', 'e2e'] },
  { glob: 'src/shared/types/{mz,plugin}.ts', programs: ['node', 'web', 'test', 'e2e'] },
  { glob: 'src/shared/**', programs: ['node', 'web', 'test'] },
  { glob: 'src/preload/**', programs: ['node', 'test'] },
  { glob: 'src/renderer/src/stores/{persist,toastStore}.ts', programs: ['web', 'test', 'e2e'] },
  { glob: 'src/renderer/src/**', programs: ['web', 'test'] },
  { glob: 'tests/helpers/**', programs: ['test', 'e2e'] },
  { glob: 'tools/analyze-plugins.ts', programs: ['tools', 'test'] },
  { glob: 'scripts/e2e-prepare.mjs', programs: ['scripts', 'test', 'e2e'] },
  { glob: 'scripts/**', programs: ['scripts', 'test'] },
  { glob: 'e2e/{reporter,playwright.config}.ts', programs: ['test', 'e2e'] },
  { glob: 'vitest.config.ts', programs: ['node', 'test'] }
]

const CODE_FILE = /\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
const isData = (file: string): boolean => scope.dataGlobs.some((glob) => matchesGlob(file, glob))
const codeFiles = tracked.filter((file) => CODE_FILE.test(file) && !isData(file))

interface RawConfig {
  extends?: string | string[]
  references?: { path: string }[]
  compilerOptions?: Record<string, unknown>
}
const rawConfig = (file: string): RawConfig => {
  const { config, error } = ts.readConfigFile(join(ROOT, file), ts.sys.readFile)
  expect(error, file).toBeUndefined()
  return config
}
const parsed = (file: string): ts.ParsedCommandLine => {
  const result = ts.getParsedCommandLineOfConfigFile(
    join(ROOT, file),
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} }
  )
  if (!result) throw new Error(`${file}: no parsed config`)
  return result
}
const extendsList = (file: string): string[] => {
  const value = rawConfig(file).extends ?? []
  return (Array.isArray(value) ? value : [value]).map((entry) =>
    entry.startsWith('.') ? resolve(ROOT, dirname(file), entry) : entry
  )
}
const repoPath = (file: string): string => relative(ROOT, file).split('\\').join('/')

describe('static scope: TypeScript programs', () => {
  it('lists the tracked code files it scans', () => {
    console.log(`tracked code files ${codeFiles.length}`)
    expect(codeFiles.length).toBeGreaterThan(0)
  })

  it('keeps the strict flag set in one file', () => {
    expect(rawConfig(STRICT_FILE).compilerOptions).toEqual(STRICT_FLAGS)
  })

  it('references the six programs, each extending the strict file last', () => {
    const references = (rawConfig('tsconfig.json').references ?? []).map((ref) => ref.path)
    console.log(`programs ${references.length}`)
    expect(references).toEqual(PROGRAMS.map((program) => `./${program.config}`))
    for (const program of PROGRAMS) {
      expect(extendsList(program.config).at(-1), program.config).toBe(join(ROOT, STRICT_FILE))
    }
  })

  it('sets every strict flag in each program or in its pending file, never both', () => {
    for (const program of PROGRAMS) {
      const { options, fileNames } = parsed(program.config)
      const pendingPath = join(ROOT, program.pending)
      const pending = ts.sys.fileExists(pendingPath)
        ? (rawConfig(program.pending).compilerOptions ?? {})
        : {}
      if (ts.sys.fileExists(pendingPath)) {
        expect(extendsList(program.pending), program.pending).toEqual([join(ROOT, program.config)])
      }
      for (const key of Object.keys(pending)) {
        expect(STRICT_FLAGS[key], `${program.pending} ${key}`).toBe(pending[key])
      }
      for (const [flag, value] of Object.entries(STRICT_FLAGS)) {
        if (flag in pending) expect(options[flag], `${program.name} ${flag} (pending)`).toBe(!value)
        else expect(options[flag], `${program.name} ${flag}`).toBe(value)
      }
      const pendingCount = Object.keys(pending).length
      console.log(
        `program ${program.name}: root files ${fileNames.length}, strict flags ${Object.keys(STRICT_FLAGS).length}, pending ${pendingCount}`
      )
      expect(fileNames.length, program.name).toBeGreaterThan(0)
    }
  })

  it(
    'puts every code file in a program, overlapping only where declared, and no data file in any',
    { timeout: 300_000 },
    () => {
      const trackedSet = new Set(tracked)
      const holders = new Map<string, string[]>()
      const rootFiles = new Set<string>()
      for (const program of PROGRAMS) {
        const config = parsed(program.config)
        for (const file of config.fileNames) rootFiles.add(repoPath(file))
        const sources = ts.createProgram(config.fileNames, config.options).getSourceFiles()
        for (const source of sources) {
          const file = repoPath(source.fileName)
          if (!trackedSet.has(file)) continue
          holders.set(file, [...(holders.get(file) ?? []), program.name])
        }
      }

      // Membership is by root files: a file only an import reaches leaves its program with that import.
      const outside = codeFiles.filter(
        (file) => !rootFiles.has(file) && !scope.jsAllowlist.includes(file)
      )
      console.log(`root files in programs ${rootFiles.size}, outside ${outside.length}`)
      expect(outside).toEqual([])

      const perEntry = new Map(PROGRAM_OVERLAPS.map((entry) => [entry.glob, 0]))
      const undeclared: string[] = []
      for (const [file, programs] of holders) {
        if (programs.length < 2) continue
        const entry = PROGRAM_OVERLAPS.find(
          (candidate) =>
            matchesGlob(file, candidate.glob) &&
            programs.every((name) => candidate.programs.includes(name))
        )
        if (entry) perEntry.set(entry.glob, (perEntry.get(entry.glob) ?? 0) + 1)
        else undeclared.push(`${file}: ${programs.join(', ')}`)
      }
      for (const [glob, count] of perEntry) console.log(`overlap ${glob}: files ${count}`)
      expect(undeclared).toEqual([])
      expect([...perEntry].filter(([, count]) => count === 0).map(([glob]) => glob)).toEqual([])

      for (const glob of scope.dataGlobs) {
        const files = tracked.filter((file) => matchesGlob(file, glob))
        console.log(`data ${glob}: files ${files.length}`)
        expect(files.length, glob).toBeGreaterThan(0)
        expect(files.filter((file) => holders.has(file) || rootFiles.has(file))).toEqual([])
      }

      for (const file of scope.jsAllowlist) {
        expect(trackedSet.has(file), file).toBe(true)
        expect(rootFiles.has(file), file).toBe(false)
      }
      console.log(`js allowlist: files ${scope.jsAllowlist.length}`)
    }
  )

  it('pins TypeScript exactly and lets no tsconfig silence a deprecation', () => {
    const configs = tracked.filter((file) => /^tsconfig.*\.json$/.test(basename(file)))
    const silencing = configs.filter(
      (file) => rawConfig(file).compilerOptions?.['ignoreDeprecations'] !== undefined
    )
    console.log(`tsconfig files ${configs.length}`)
    expect(configs.length).toBeGreaterThan(0)
    expect(silencing).toEqual([])

    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
      devDependencies: Record<string, string>
    }
    const installed = (
      JSON.parse(readFileSync(join(ROOT, 'node_modules/typescript/package.json'), 'utf8')) as {
        version: string
      }
    ).version
    expect(pkg.devDependencies['typescript']).toMatch(/^6\.0\.\d+$/)
    expect(pkg.devDependencies['typescript']).toBe(installed)
  })
})
