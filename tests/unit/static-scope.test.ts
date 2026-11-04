// Every tracked code file is type-checked by a program on the one strict flag set, linted and
// formatted; data files are in no program and read by neither tool.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { cruise, type ICruiseOptions, type ICruiseResult } from 'dependency-cruiser'
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options'
import extractTSConfig from 'dependency-cruiser/config-utl/extract-ts-config'
import { ESLint, type Linter } from 'eslint'
import { getFileInfo } from 'prettier'
import * as ts from 'typescript'
import { beforeAll, describe, expect, it } from 'vitest'
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

interface Program {
  name: string
  config: string
  pending: string
}
// Root `tsconfig.json` references these, in this order; a flag a program does not meet yet waits in its pending file.
const PROGRAMS: Program[] = [
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
const isData = (file: string): boolean =>
  scope.dataGlobs.some((glob) => path.matchesGlob(file, glob))
const codeFiles = tracked.filter((file) => CODE_FILE.test(file) && !isData(file))
const dataFiles = tracked.filter((file) => isData(file))

// Count lines go to stdout: the console guard fails a test on warn and error output.
const report = (line: string): void => {
  process.stdout.write(`${line}\n`)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

interface RawConfig {
  extends?: string | string[]
  references?: { path: string }[]
  compilerOptions?: Record<string, unknown>
}
const isReference = (value: unknown): value is { path: string } => {
  if (!isRecord(value)) return false
  const { path: target } = value
  return typeof target === 'string'
}
const isRawConfig = (value: unknown): value is RawConfig => {
  if (!isRecord(value)) return false
  const { extends: base, references, compilerOptions } = value
  return (
    (base === undefined || typeof base === 'string' || isStringArray(base)) &&
    (references === undefined || (Array.isArray(references) && references.every(isReference))) &&
    (compilerOptions === undefined || isRecord(compilerOptions))
  )
}
const rawConfig = (file: string): RawConfig => {
  const result = ts.readConfigFile(path.join(ROOT, file), (name) => ts.sys.readFile(name))
  const config: unknown = result.config
  if (result.error !== undefined || !isRawConfig(config))
    throw new Error(`${file}: unreadable config`)
  return config
}
const parsed = (file: string): ts.ParsedCommandLine => {
  const result = ts.getParsedCommandLineOfConfigFile(
    path.join(ROOT, file),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`)
      }
    }
  )
  if (!result) throw new Error(`${file}: no parsed config`)
  return result
}
const extendsList = (file: string): string[] => {
  const value = rawConfig(file).extends ?? []
  return (Array.isArray(value) ? value : [value]).map((entry) =>
    entry.startsWith('.') ? path.resolve(ROOT, path.dirname(file), entry) : entry
  )
}
const repositoryPath = (file: string): string => path.relative(ROOT, file).replaceAll('\\', '/')

// Strict flags a program sets wrongly, given what its pending file holds.
const flagProblems = (program: Program): { problems: string[]; roots: number; pending: number } => {
  const { options, fileNames } = parsed(program.config)
  const hasPending = ts.sys.fileExists(path.join(ROOT, program.pending))
  const pending = hasPending ? (rawConfig(program.pending).compilerOptions ?? {}) : {}
  const problems: string[] = []
  if (hasPending && extendsList(program.pending).join(',') !== path.join(ROOT, program.config)) {
    problems.push(`${program.pending}: extends`)
  }
  for (const [key, value] of Object.entries(pending)) {
    if (STRICT_FLAGS[key] !== value) problems.push(`${program.pending} ${key}`)
  }
  for (const [flag, value] of Object.entries(STRICT_FLAGS)) {
    const isPending = Object.hasOwn(pending, flag)
    if (options[flag] !== (isPending ? !value : value)) {
      problems.push(`${program.name} ${flag}${isPending ? ' (pending)' : ''}`)
    }
  }
  if (fileNames.length === 0) problems.push(`${program.name}: no root files`)
  return { problems, roots: fileNames.length, pending: Object.keys(pending).length }
}

// Which programs hold each tracked file (imports included), and every program's root files.
const programMembership = (): { holders: Map<string, string[]>; rootFiles: Set<string> } => {
  const trackedSet = new Set(tracked)
  const holders = new Map<string, string[]>()
  const rootFiles = new Set<string>()
  for (const program of PROGRAMS) {
    const config = parsed(program.config)
    for (const file of config.fileNames) rootFiles.add(repositoryPath(file))
    const sources = ts.createProgram(config.fileNames, config.options).getSourceFiles()
    const held = sources
      .map((source) => repositoryPath(source.fileName))
      .filter((file) => trackedSet.has(file))
    for (const file of held) holders.set(file, [...(holders.get(file) ?? []), program.name])
  }
  return { holders, rootFiles }
}

// Files held by more than one program that no overlap entry declares, and the count per entry.
const overlapProblems = (
  holders: Map<string, string[]>
): { undeclared: string[]; perEntry: Map<string, number> } => {
  const perEntry = new Map(PROGRAM_OVERLAPS.map((entry) => [entry.glob, 0]))
  const undeclared: string[] = []
  const shared = [...holders].filter(([, programs]) => programs.length > 1)
  for (const [file, programs] of shared) {
    const entry = PROGRAM_OVERLAPS.find(
      (candidate) =>
        path.matchesGlob(file, candidate.glob) &&
        programs.every((name) => candidate.programs.includes(name))
    )
    if (entry === undefined) undeclared.push(`${file}: ${programs.join(', ')}`)
    else perEntry.set(entry.glob, (perEntry.get(entry.glob) ?? 0) + 1)
  }
  return { undeclared, perEntry }
}

describe('static scope: TypeScript programs', () => {
  it('lists the tracked code files it scans', () => {
    report(`tracked code files ${String(codeFiles.length)}`)

    expect(codeFiles.length).toBeGreaterThan(0)
  })

  it('keeps the strict flag set in one file', () => {
    expect(rawConfig(STRICT_FILE).compilerOptions).toStrictEqual(STRICT_FLAGS)
  })

  it('references the six programs, each extending the strict file last', () => {
    const references = (rawConfig('tsconfig.json').references ?? []).map((ref) => ref.path)
    report(`programs ${String(references.length)}`)

    expect(references).toStrictEqual(PROGRAMS.map((program) => `./${program.config}`))

    const lastBases = PROGRAMS.map((program) => extendsList(program.config).at(-1))

    expect(lastBases).toStrictEqual(PROGRAMS.map(() => path.join(ROOT, STRICT_FILE)))
  })

  it('sets every strict flag in each program or in its pending file, never both', () => {
    const problems = PROGRAMS.flatMap((program) => {
      const result = flagProblems(program)
      report(
        `program ${program.name}: root files ${String(result.roots)}, strict flags ${String(Object.keys(STRICT_FLAGS).length)}, pending ${String(result.pending)}`
      )
      return result.problems
    })

    expect(problems).toStrictEqual([])
  })

  it(
    'puts every code file in a program, overlapping only where declared, and no data file in any',
    { timeout: 300_000 },
    () => {
      const { holders, rootFiles } = programMembership()

      // Membership is by root files: a file only an import reaches leaves its program with that import.
      const outside = codeFiles.filter(
        (file) => !rootFiles.has(file) && !scope.jsAllowlist.includes(file)
      )
      report(`root files in programs ${String(rootFiles.size)}, outside ${String(outside.length)}`)

      expect(outside).toStrictEqual([])

      const { undeclared, perEntry } = overlapProblems(holders)
      for (const [glob, count] of perEntry) report(`overlap ${glob}: files ${String(count)}`)

      const unusedOverlaps = [...perEntry].filter(([, count]) => count === 0).map(([glob]) => glob)

      expect({ undeclared, unusedOverlaps }).toStrictEqual({ undeclared: [], unusedOverlaps: [] })

      const dataCounts = scope.dataGlobs.map((glob) => ({
        glob,
        files: tracked.filter((file) => path.matchesGlob(file, glob))
      }))
      for (const { glob, files } of dataCounts)
        report(`data ${glob}: files ${String(files.length)}`)

      expect(dataCounts.filter(({ files }) => files.length === 0)).toStrictEqual([])
      expect(dataFiles.filter((file) => holders.has(file) || rootFiles.has(file))).toStrictEqual([])

      const misplaced = scope.jsAllowlist.filter(
        (file) => !tracked.includes(file) || rootFiles.has(file)
      )
      report(`js allowlist: files ${String(scope.jsAllowlist.length)}`)

      expect(misplaced).toStrictEqual([])
    }
  )

  it('pins TypeScript exactly and lets no tsconfig silence a deprecation', () => {
    const configs = tracked.filter((file) => /^tsconfig.*\.json$/.test(path.basename(file)))
    const silencing = configs.filter((file) => {
      const { ignoreDeprecations } = rawConfig(file).compilerOptions ?? {}
      return ignoreDeprecations !== undefined
    })
    report(`tsconfig files ${String(configs.length)}`)

    expect(configs.length).toBeGreaterThan(0)
    expect(silencing).toStrictEqual([])

    const manifest: unknown = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    const installedManifest: unknown = JSON.parse(
      readFileSync(path.join(ROOT, 'node_modules/typescript/package.json'), 'utf8')
    )
    const { devDependencies } = isRecord(manifest) ? manifest : {}
    const { typescript: pinned } = isRecord(devDependencies) ? devDependencies : {}
    const { version: installed } = isRecord(installedManifest) ? installedManifest : {}

    expect(pinned).toMatch(/^6\.0\.\d+$/)
    expect(pinned).toBe(installed)
  })
})

// ESLint and Prettier: every rule the config resolves differently from its preset is a listed decision.

interface Scoped {
  files: string[]
  ignores?: string[]
}
interface Resolved {
  rules: Record<string, unknown>
  settings: Record<string, unknown>
  linterOptions: Record<string, unknown>
}

// ESLint's globs match dotfiles (`dot: true`); `path.matchesGlob` has no such option, so a
// dotfile is also tried with each leading dot replaced.
const isGlobMatch = (file: string, glob: string): boolean =>
  path.matchesGlob(file, glob) || path.matchesGlob(file.replaceAll(/(?<=^|\/)\./gv, '_'), glob)
const isInScope = (file: string, entry: Scoped): boolean =>
  entry.files.some((glob) => isGlobMatch(file, glob)) &&
  (entry.ignores ?? []).every((glob) => !isGlobMatch(file, glob))
const firstInScope = (entry: Scoped): string | undefined =>
  codeFiles.find((file) => isInScope(file, entry))

const SEVERITY: Record<string, number> = { '0': 0, off: 0, '1': 1, warn: 1, '2': 2, error: 2 }
const severityOf = (entry: unknown): number => {
  const level: unknown = Array.isArray(entry) ? entry[0] : entry
  return SEVERITY[String(level)] ?? -1
}
const optionsOf = (entry: unknown): unknown[] => (Array.isArray(entry) ? entry.slice(1) : [])
const isSameSetting = (left: unknown, right: unknown): boolean =>
  severityOf(left) === severityOf(right) &&
  JSON.stringify(optionsOf(left)) === JSON.stringify(optionsOf(right))
// A resolved entry carries a rule's default options merged in: the listed options must be within it.
const isWithin = (listed: unknown, resolved: unknown): boolean =>
  isRecord(listed)
    ? isRecord(resolved) &&
      Object.entries(listed).every(([key, value]) => isWithin(value, resolved[key]))
    : JSON.stringify(listed) === JSON.stringify(resolved)
const isListedSetting = (resolved: unknown, listed: unknown): boolean => {
  const options = optionsOf(resolved)
  return (
    severityOf(resolved) === severityOf(listed) &&
    optionsOf(listed).every((option, index) => isWithin(option, options[index]))
  )
}

interface ConfigModule {
  config: unknown[]
  presetBlocks: Linter.Config[]
  prettierOffRules: string[]
}
// ESLint validates each block when it loads them; this only rules out a missing export.
const isConfigArray = (value: unknown): value is Linter.Config[] =>
  Array.isArray(value) && value.every((block) => isRecord(block))
const loadConfigModule = async (): Promise<ConfigModule> => {
  const configModule: unknown = await import(
    pathToFileURL(path.join(ROOT, 'eslint.config.mjs')).href
  )
  const {
    default: config,
    presetBlocks,
    prettierOffRules
  } = isRecord(configModule) ? configModule : {}
  if (!Array.isArray(config) || !isConfigArray(presetBlocks) || !isStringArray(prettierOffRules)) {
    throw new Error('eslint.config.mjs: no default, presetBlocks or prettierOffRules export')
  }
  return { config, presetBlocks, prettierOffRules }
}

const resolveConfig = async (eslint: ESLint, file: string): Promise<Resolved> => {
  const config: unknown = await eslint.calculateConfigForFile(path.join(ROOT, file))
  const { rules, settings, linterOptions } = isRecord(config) ? config : {}
  if (!isRecord(rules)) throw new Error(`${file}: no resolved config`)
  return {
    rules,
    settings: isRecord(settings) ? settings : {},
    linterOptions: isRecord(linterOptions) ? linterOptions : {}
  }
}
const resolveAll = async (eslint: ESLint, files: string[]): Promise<Map<string, Resolved>> => {
  const resolved = new Map<string, Resolved>()
  for (const file of files) resolved.set(file, await resolveConfig(eslint, file))
  return resolved
}

const isExplained = (
  prettierOffRules: string[],
  file: string,
  rule: string,
  got: unknown
): boolean =>
  scope.exclusions.some((row) => row.rule === rule && isInScope(file, row)) ||
  scope.ownerSwaps.some((row) => row.rule === rule && isInScope(file, row)) ||
  scope.optIns.some((row) => Object.keys(row.rules).includes(rule) && isInScope(file, row)) ||
  (prettierOffRules.includes(rule) && severityOf(got) === 0)

// Preset rules the real config resolves differently and no table explains, as `rule (first file)`.
const unexplainedDifferences = (
  actual: Map<string, Resolved>,
  expected: Map<string, Resolved>,
  prettierOffRules: string[]
): string[] => {
  const unexplained = new Map<string, string>()
  for (const [file, config] of actual) {
    const wanted = Object.entries(expected.get(file)?.rules ?? {})
    for (const [rule, entry] of wanted) {
      const got = config.rules[rule]
      const isDifferent = !isSameSetting(entry, got)
      if (
        isDifferent &&
        !isExplained(prettierOffRules, file, rule, got) &&
        !unexplained.has(rule)
      ) {
        unexplained.set(rule, file)
      }
    }
  }
  return [...unexplained].map(([rule, file]) => `${rule} (${file})`)
}

// Table entries whose setting is not the one the real config resolves in their scope.
const entriesNotInEffect = (actual: Map<string, Resolved>): string[] => {
  const rulesIn = (entry: Scoped): Record<string, unknown> =>
    actual.get(firstInScope(entry) ?? '')?.rules ?? {}
  const exclusions = scope.exclusions
    .filter((row) => {
      // An `off` keeps the preset's options in the resolved entry: only its severity counts.
      const got = rulesIn(row)[row.rule]
      return row.options === undefined
        ? severityOf(got) !== 0
        : !isListedSetting(got, ['error', ...row.options])
    })
    .map((row) => `exclusion ${row.rule}`)
  const swaps = scope.ownerSwaps
    .filter((row) => {
      const rules = rulesIn(row)
      const isReplaced = row.replacement === undefined || severityOf(rules[row.replacement]) === 2
      return severityOf(rules[row.rule]) !== 0 || !isReplaced
    })
    .map((row) => `owner swap ${row.rule}`)
  const optIns = scope.optIns.flatMap((row) => {
    const rules = rulesIn(row)
    return Object.entries(row.rules)
      .filter(([rule, entry]) => !isListedSetting(rules[rule], entry))
      .map(([rule]) => `opt-in ${rule}`)
  })
  return [...exclusions, ...swaps, ...optIns]
}

// S and X/D rows that span a whole preset scope: their options, not their files, narrow them.
const WHOLE_SCOPE_ROWS = [
  'unicorn/name-replacements',
  'n/no-unpublished-import',
  'n/no-missing-import'
]
type ExclusionRow = (typeof scope.exclusions)[number]
const isWholeScope = (row: ExclusionRow): boolean =>
  scope.presets.some((preset) => JSON.stringify(preset.files) === JSON.stringify(row.files))
const isRowBlock = (block: unknown, rule: string): boolean => {
  const { files, rules } = isRecord(block) ? block : {}
  return (
    isRecord(rules) &&
    Object.keys(rules).join(',') === rule &&
    scope.exclusions.some(
      (row) => row.rule === rule && JSON.stringify(row.files) === JSON.stringify(files)
    )
  )
}
// Findings of one rule per file under the real config, every other rule removed; `hasRows`
// false also drops that rule's exclusion rows, so the preset setting applies.
const findingsOf = async (
  config: Linter.Config[],
  rule: string,
  hasRows: boolean,
  files: string[]
): Promise<Map<string, number>> => {
  const blocks = config
    .filter((block) => hasRows || !isRowBlock(block, rule))
    .map((block) =>
      block.rules === undefined
        ? block
        : {
            ...block,
            rules: Object.hasOwn(block.rules, rule) ? { [rule]: block.rules[rule] } : {}
          }
    )
  const isTyped = rule.startsWith('@typescript-eslint/')
  const linter = new ESLint({
    cwd: ROOT,
    overrideConfigFile: true,
    overrideConfig: [
      ...blocks,
      ...(isTyped ? [] : [{ languageOptions: { parserOptions: { projectService: false } } }])
    ]
  })
  const results = await linter.lintFiles(files.map((file) => path.join(ROOT, file)))
  return new Map(
    results.map((result) => [
      repositoryPath(result.filePath),
      result.messages.filter((message) => message.ruleId === rule).length
    ])
  )
}
// The files a row covers where the row excuses no finding: an off row must excuse one, a
// re-optioned row must leave fewer findings than the preset setting.
const idleFilesOf = async (
  config: unknown[],
  row: ExclusionRow
): Promise<{ files: number; idle: string[] }> => {
  if (!isConfigArray(config)) throw new Error('eslint.config.mjs: a block is not an object')
  const files = codeFiles.filter((file) => isInScope(file, row))
  const preset = await findingsOf(config, row.rule, false, files)
  const kept =
    'options' in row ? await findingsOf(config, row.rule, true, files) : new Map<string, number>()
  const idle = files
    .filter((file) => (preset.get(file) ?? 0) <= (kept.get(file) ?? 0))
    .map((file) => `${row.rule}: ${file}`)
  return { files: files.length, idle }
}

const DIRECTIVE =
  /^(?:eslint-disable(?:-next-line|-line)?\b|eslint-enable\b|eslint\s|@ts-ignore|@ts-expect-error|@ts-nocheck)/

// Comment trivia of a code file as TypeScript's scanner reads it, so string and template text never counts.
const commentsOf = (file: string): string[] => {
  const text = readFileSync(path.join(ROOT, file), 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const seen = new Set<number>()
  const comments: string[] = []
  const visit = (node: ts.Node): void => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode)
      return
    const ranges = ts.getLeadingCommentRanges(text, node.pos) ?? []
    for (const range of ranges) {
      if (seen.has(range.pos)) continue
      seen.add(range.pos)
      comments.push(text.slice(range.pos, range.end))
    }
    for (const child of node.getChildren(source)) visit(child)
  }
  visit(source)
  return comments
}
const directiveOf = (comment: string): string | undefined => {
  const body = comment.startsWith('//') ? comment.slice(2) : comment.slice(2, -2)
  const trimmed = body.replace(/^[\s*]+/, '')
  return DIRECTIVE.test(trimmed) ? trimmed : undefined
}

// The evaluating calls: the one inline directive form the closing state keeps, each described.
const CODE_EVAL_SITES: Record<string, number> = {
  'src/main/services/syntax-check.ts': 1,
  'tests/helpers/evaluate-plugin.ts': 3,
  'tests/helpers/mz-runtime.ts': 3,
  'tests/helpers/mz-corescript.ts': 5,
  'tests/helpers/mz-conformance.ts': 1,
  'tests/unit/raw-mode-insertion.test.ts': 1
}
const CODE_EVAL_DIRECTIVE = /^eslint-disable-next-line sonarjs\/code-eval -- \S/
// Directives that predate the rule set; each leaves with its file's fix.
const TRANSITIONAL_DIRECTIVES: { file: string; rule: string }[] = [
  { file: 'src/main/services/projectParser.ts', rule: '@typescript-eslint/no-explicit-any' }
]

interface Directive {
  file: string
  text: string
}
const directives = (): Directive[] =>
  codeFiles.flatMap((file) =>
    commentsOf(file)
      .map((comment) => directiveOf(comment))
      .filter((text): text is string => text !== undefined)
      .map((text) => ({ file, text }))
  )
const isTransitional = (entry: Directive): boolean =>
  TRANSITIONAL_DIRECTIVES.some(
    (allowed) => allowed.file === entry.file && entry.text.split(/\s+/, 2)[1] === allowed.rule
  )

const eslint = new ESLint({ cwd: ROOT })

const prettierIgnore = [path.join(ROOT, '.gitignore'), path.join(ROOT, '.prettierignore')]
const isFormatIgnored = async (file: string): Promise<boolean> => {
  const info = await getFileInfo(path.join(ROOT, file), { ignorePath: prettierIgnore })
  return info.ignored
}
const isFormatRead = async (file: string): Promise<boolean> => {
  const info = await getFileInfo(path.join(ROOT, file), { ignorePath: prettierIgnore })
  return !info.ignored && info.inferredParser !== null
}
const isLintIgnored = async (file: string): Promise<boolean> =>
  eslint.isPathIgnored(path.join(ROOT, file))
const isLintRead = async (file: string): Promise<boolean> => !(await isLintIgnored(file))
const filterAsync = async (
  files: string[],
  isKept: (file: string) => Promise<boolean>
): Promise<string[]> => {
  const kept: string[] = []
  for (const file of files) if (await isKept(file)) kept.push(file)
  return kept
}

const SNIPPET_QUOTE = "'"
const quoted = (text: string): string => `${SNIPPET_QUOTE}${text}${SNIPPET_QUOTE}`
const SNIPPETS = [
  {
    file: 'src/renderer/src/App.tsx',
    source: `import { ipcRenderer } from ${quoted('electron')}\nvoid ipcRenderer.invoke(${quoted('x')})\n`,
    rule: 'no-restricted-syntax'
  },
  {
    file: 'src/main/index.ts',
    source: `import { ipcMain } from ${quoted('electron')}\nipcMain.handle(${quoted('x')}, () => 1)\n`,
    rule: 'no-restricted-syntax'
  },
  {
    file: 'tests/unit/static-scope.test.ts',
    source: `import { usePluginStore } from ${quoted('../../src/renderer/src/stores/pluginStore')}\nexport const probe = usePluginStore.getState()\n`,
    rule: 'no-restricted-imports'
  },
  {
    file: 'src/shared/ipc-types.ts',
    source: `// @ts-expect-error -- the probe assigns a string to a number\nexport const probe: number = ${quoted('x')}\n`,
    rule: '@typescript-eslint/ban-ts-comment'
  }
]
const missedSnippets = async (): Promise<string[]> => {
  const missed: string[] = []
  for (const snippet of SNIPPETS) {
    const results = await eslint.lintText(snippet.source, {
      filePath: path.join(ROOT, snippet.file)
    })
    const rules = results.flatMap((result) => result.messages.map((message) => message.ruleId))
    if (!rules.includes(snippet.rule))
      missed.push(`${snippet.file}: ${snippet.rule} (${rules.join(', ')})`)
  }
  return missed
}

const isLooseDirectiveConfig = (resolved: Resolved): boolean => {
  const { reportUnusedDisableDirectives, reportUnusedInlineConfigs } = resolved.linterOptions
  return (
    severityOf(reportUnusedDisableDirectives) !== 2 ||
    severityOf(reportUnusedInlineConfigs) !== 2 ||
    !isSameSetting(resolved.rules['@eslint-community/eslint-comments/no-use'], [
      'error',
      { allow: ['eslint-disable-next-line'] }
    ]) ||
    severityOf(resolved.rules['@eslint-community/eslint-comments/require-description']) !== 2
  )
}
const isRelaxedForTests = (resolved: Resolved): boolean =>
  severityOf(resolved.rules['@typescript-eslint/no-explicit-any']) !== 2 ||
  severityOf(resolved.rules['@typescript-eslint/no-non-null-assertion']) !== 2 ||
  !isSameSetting(resolved.rules['no-console'], ['error', { allow: ['warn', 'error'] }])
const hasNodeVersion = (resolved: Resolved): boolean => {
  const { node } = resolved.settings
  return isRecord(node) && Object.hasOwn(node, 'version')
}

// The resolved config of every code file, computed once for all ESLint describes.
const resolvedConfigs: { pending?: Promise<Map<string, Resolved>> } = {}
const loadConfigs = async (): Promise<Map<string, Resolved>> =>
  (resolvedConfigs.pending ??= resolveAll(eslint, codeFiles))

describe('static scope: ESLint and Prettier', () => {
  let configs: Map<string, Resolved>

  beforeAll(async () => {
    configs = await loadConfigs()
  }, 300_000)

  it('lints and formats every code file and reads no data file', { timeout: 300_000 }, async () => {
    const lintIgnoredCode = await filterAsync(codeFiles, isLintIgnored)
    const formatIgnoredCode = await filterAsync(codeFiles, isFormatIgnored)
    const lintedData = await filterAsync(dataFiles, isLintRead)
    const formattedData = await filterAsync(dataFiles, isFormatRead)
    report(
      `eslint/prettier: code files ${String(codeFiles.length)} (lint-ignored ${String(lintIgnoredCode.length)}, format-ignored ${String(formatIgnoredCode.length)}); data files ${String(dataFiles.length)} (linted ${String(lintedData.length)}, formatted ${String(formattedData.length)})`
    )

    expect(dataFiles.length).toBeGreaterThan(0)
    expect({ lintIgnoredCode, formatIgnoredCode }).toStrictEqual({
      lintIgnoredCode: [],
      formatIgnoredCode: []
    })
    expect(lintedData).toStrictEqual([])
    expect(formattedData).toStrictEqual([])

    const probes = ['tools/reference-repos/probe.js', 'tools/output/probe.js']

    await expect(filterAsync(probes, isLintIgnored)).resolves.toStrictEqual(probes)
  })

  it('scopes every block to tracked files and resolves no rule to warn', async () => {
    expect.hasAssertions()

    const { config } = await loadConfigModule()
    const scoped: (Scoped & { name: string })[] = [
      ...scope.presets.map((entry) => ({ ...entry, name: entry.id })),
      ...scope.exclusions.map((entry) => ({ ...entry, name: `exclusion ${entry.rule}` })),
      ...scope.ownerSwaps.map((entry) => ({ ...entry, name: `owner swap ${entry.rule}` })),
      ...scope.optIns.map((entry) => ({ ...entry, name: `opt-in ${entry.files.join(',')}` }))
    ]
    const configGlobs = config.flatMap((block) => {
      const { files } = isRecord(block) ? block : {}
      return isStringArray(files) ? files : []
    })
    const unmatched = [...scoped.flatMap((entry) => entry.files), ...configGlobs].filter((glob) =>
      codeFiles.every((file) => !path.matchesGlob(file, glob))
    )

    expect(unmatched).toStrictEqual([])

    const unsampled = scoped.filter((entry) => firstInScope(entry) === undefined)

    expect(unsampled.map((entry) => entry.name)).toStrictEqual([])

    for (const entry of scoped) {
      const rules = configs.get(firstInScope(entry) ?? '')?.rules ?? {}
      report(`scope ${entry.name}: rules ${String(Object.keys(rules).length)}`)
    }
    const warned = [...configs].flatMap(([file, resolved]) =>
      Object.entries(resolved.rules)
        .filter(([, entry]) => severityOf(entry) === 1)
        .map(([rule]) => `${file}: ${rule}`)
    )

    expect(warned).toStrictEqual([])
  })
})

describe('static scope: ESLint departures from the presets', () => {
  let configs: Map<string, Resolved>

  beforeAll(async () => {
    configs = await loadConfigs()
  }, 300_000)

  it(
    'explains every rule that resolves differently from its preset',
    { timeout: 300_000 },
    async () => {
      const { presetBlocks, prettierOffRules } = await loadConfigModule()
      const presetsOnly = new ESLint({
        cwd: ROOT,
        overrideConfigFile: true,
        overrideConfig: presetBlocks
      })
      const expected = await resolveAll(presetsOnly, codeFiles)

      expect(unexplainedDifferences(configs, expected, prettierOffRules)).toStrictEqual([])
      expect(entriesNotInEffect(configs)).toStrictEqual([])

      const byCode: Record<string, number> = {}
      for (const row of scope.exclusions) byCode[row.code] = (byCode[row.code] ?? 0) + 1
      const { S: safe = 0, D: duplicate = 0, 'X/D': falsePositive = 0 } = byCode
      report(
        `exclusions ${String(scope.exclusions.length)} (S ${String(safe)}, D ${String(duplicate)}, X/D ${String(falsePositive)})`
      )

      expect(scope.exclusions).toHaveLength(30)
      expect(byCode).toStrictEqual({ S: 9, D: 20, 'X/D': 1 })

      // Negative control: a preset rule switched off outside the tables is reported.
      const control = new ESLint({
        cwd: ROOT,
        overrideConfig: [{ rules: { 'unicorn/no-array-reduce': 'off' } }]
      })
      const sample = codeFiles.slice(0, 1)
      const controlled = await resolveAll(control, sample)

      expect(unexplainedDifferences(controlled, expected, prettierOffRules)).toStrictEqual([
        `unicorn/no-array-reduce (${sample.join('')})`
      ])
    }
  )

  it(
    'keeps each by-design exclusion to files where its rule reports',
    { timeout: 300_000 },
    async () => {
      const { config } = await loadConfigModule()
      const rows = scope.exclusions.filter((row) => row.code !== 'D')
      const wholeScope = rows.filter((row) => isWholeScope(row))

      expect(wholeScope.map((row) => row.rule)).toStrictEqual(WHOLE_SCOPE_ROWS)
      expect(wholeScope.filter((row) => !('options' in row))).toStrictEqual([])

      // A narrowed row excuses something in every file it covers, or it is wider than its reason.
      const narrowed = rows.filter((entry) => !isWholeScope(entry))
      const scans: { files: number; idle: string[] }[] = []
      for (const row of narrowed) scans.push(await idleFilesOf(config, row))
      const idle = scans.flatMap((scan) => scan.idle)
      let covered = 0
      for (const scan of scans) covered += scan.files
      report(
        `exclusion scopes: rows ${String(rows.length)} (whole-scope ${String(wholeScope.length)}), ` +
          `files ${String(covered)}, idle ${String(idle.length)}`
      )

      expect(covered).toBeGreaterThan(0)
      expect(idle).toStrictEqual([])
    }
  )

  it(
    'reports raw IPC, a routed store import and a described ts-expect-error',
    { timeout: 300_000 },
    async () => {
      const missed = await missedSnippets()
      report(
        `snippets ${String(SNIPPETS.length)}, missed ${String(missed.length)}; ipc exempt ${String(scope.ipcExempt.length)}`
      )

      expect(missed).toStrictEqual([])
      expect(scope.ipcExempt).toHaveLength(2)
      expect(scope.ipcExempt.filter((file) => !tracked.includes(file))).toStrictEqual([])
    }
  )
})

describe('static scope: ESLint directives, test rules and suppressions', () => {
  let configs: Map<string, Resolved>

  beforeAll(async () => {
    configs = await loadConfigs()
  }, 300_000)

  it('keeps inline directives to the evaluation sites and the transitional list', () => {
    const found = directives()
    const tsComments = found.filter((entry) => entry.text.startsWith('@ts-'))
    const codeEval = found.filter((entry) => CODE_EVAL_DIRECTIVE.test(entry.text))
    const transitional = found.filter((entry) => isTransitional(entry))
    const perFile: Record<string, number> = {}
    for (const entry of codeEval) perFile[entry.file] = (perFile[entry.file] ?? 0) + 1
    report(
      `inline directives ${String(found.length)} (allow-list ${String(codeEval.length)}, transitional ${String(transitional.length)})`
    )
    report(`@ts-* ${String(tsComments.length)}`)

    expect(perFile).toStrictEqual(CODE_EVAL_SITES)
    expect(transitional).toHaveLength(TRANSITIONAL_DIRECTIVES.length)
    expect(found).toHaveLength(codeEval.length + transitional.length)
    expect(tsComments).toStrictEqual([])
  })

  it('reports unused directives and allows only described next-line disables', () => {
    const loose = [...configs]
      .filter(([, resolved]) => isLooseDirectiveConfig(resolved))
      .map(([file]) => file)
    report(`directive options: files ${String(configs.size)}, loose ${String(loose.length)}`)

    expect(configs.size).toBeGreaterThan(0)
    expect(loose).toStrictEqual([])
  })

  it('holds tests to the source rules for any, non-null assertions and console', () => {
    const testFiles = [...configs].filter(([file]) => file.startsWith('tests/'))
    const relaxed = testFiles
      .filter(([, resolved]) => isRelaxedForTests(resolved))
      .map(([file]) => file)
    report(`test files ${String(testFiles.length)}, relaxed ${String(relaxed.length)}`)

    expect(testFiles.length).toBeGreaterThan(0)
    expect(relaxed).toStrictEqual([])
  })

  it('leaves the Node version to package.json engines', () => {
    const pinned = [...configs]
      .filter(([, resolved]) => hasNodeVersion(resolved))
      .map(([file]) => file)
    report(`node version settings: files ${String(configs.size)}, pinned ${String(pinned.length)}`)

    expect(configs.size).toBeGreaterThan(0)
    expect(pinned).toStrictEqual([])
  })

  it('freezes no evaluation, builtin or command-path finding, no data file and no new file', () => {
    const suppressions: unknown = JSON.parse(
      readFileSync(path.join(ROOT, 'eslint-suppressions.json'), 'utf8')
    )
    const entries = isRecord(suppressions) ? suppressions : {}
    const files = Object.keys(entries)
    const rules = Object.values(entries).flatMap((value) =>
      isRecord(value) ? Object.keys(value) : []
    )
    report(
      `eslint-suppressions: files ${String(files.length)}, rule entries ${String(rules.length)}`
    )

    expect(files.length).toBeGreaterThan(0)

    const barred = new Set([
      'sonarjs/code-eval',
      'n/no-unsupported-features/node-builtins',
      'sonarjs/no-os-command-from-path'
    ])
    const ownFiles = new Set(['eslint.config.mjs', 'tests/unit/static-scope.test.ts'])

    expect(rules.filter((rule) => barred.has(rule))).toStrictEqual([])
    expect(files.filter((file) => isData(file) || ownFiles.has(file))).toStrictEqual([])
  })
})

// dependency-cruiser, knip, type-coverage and Prettier: each gate scans files and reads no data file.

const CRUISE_ROOTS = ['src', 'tests', 'tools', 'scripts', 'e2e']

// Files that exist only until the strict configuration is met in full. A commit that deletes one
// removes it here; deleting the known-violations file also drops `--ignore-known` from `deps`.
const KNOWN_VIOLATIONS = '.dependency-cruiser-known-violations.json'
const TRANSITIONAL_ARTEFACTS: string[] = [
  'eslint-suppressions.json',
  'tsconfig.node.pending.json',
  'tsconfig.web.pending.json',
  'tsconfig.test.pending.json',
  'tsconfig.tools.pending.json',
  'tsconfig.scripts.pending.json',
  'tsconfig.e2e.pending.json',
  KNOWN_VIOLATIONS,
  'scripts/strictness-status.mjs'
]

const readJson = (file: string): unknown => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'))
const packageScripts = (): Record<string, string> => {
  const manifest = readJson('package.json')
  const { scripts } = isRecord(manifest) ? manifest : {}
  return isRecord(scripts)
    ? Object.fromEntries(
        Object.entries(scripts).flatMap(([name, command]) =>
          typeof command === 'string' ? [[name, command]] : []
        )
      )
    : {}
}

// Every key of a JSON value, at any depth.
const keysOf = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap((item: unknown) => keysOf(item))
  if (!isRecord(value)) return []
  return Object.entries(value).flatMap(([key, child]) => [key, ...keysOf(child)])
}
const knipNegatedGlobs = (): string[] => {
  const knip = readJson('knip.json')
  const { project } = isRecord(knip) ? knip : {}
  const globs = isStringArray(project) ? project : []
  return globs.filter((glob) => glob.startsWith('!')).map((glob) => glob.slice(1))
}

// How many files jscpd analyses under `.jscpd.json` once no file is too short to hold a clone.
const jscpdSources = (): number => {
  const output = mkdtempSync(path.join(tmpdir(), 'jscpd-'))
  try {
    execFileSync(
      process.execPath,
      // The smallest clone size counts every file.
      [
        'node_modules/jscpd/run-jscpd.js',
        '--min-tokens',
        '1',
        '--min-lines',
        '1',
        '--reporters',
        'json',
        '--output',
        output
      ],
      { cwd: ROOT, stdio: 'ignore' }
    )
    const result: unknown = JSON.parse(readFileSync(path.join(output, 'jscpd-report.json'), 'utf8'))
    const { statistics } = isRecord(result) ? result : {}
    const { total } = isRecord(statistics) ? statistics : {}
    const { sources } = isRecord(total) ? total : {}
    return typeof sources === 'number' ? sources : 0
  } finally {
    rmSync(output, { recursive: true, force: true })
  }
}

// The cruise options' `exclude.path` patterns, as dependency-cruiser's own extractor resolves them.
const excludePatterns = (options: ICruiseOptions): RegExp[] => {
  const { exclude } = options
  const value: unknown = isRecord(exclude) ? exclude.path : exclude
  if (typeof value === 'string') return [new RegExp(value, 'v')]
  return isStringArray(value) ? value.map((pattern) => new RegExp(pattern, 'v')) : []
}
const cruiseScan = async (
  roots: string[]
): Promise<{ options: ICruiseOptions; result: ICruiseResult }> => {
  const options = await extractDepcruiseOptions(path.join(ROOT, '.dependency-cruiser.mjs'))
  const tsConfig = extractTSConfig(path.join(ROOT, 'tsconfig.test.json'))
  const { output } = await cruise(roots, { ...options, baseDir: ROOT }, {}, { tsConfig })
  if (typeof output === 'string') throw new TypeError('dependency-cruiser: no cruise result')
  return { options, result: output }
}

// type-coverage resolves a config's folder twice, so each script runs from its program's folder.
const TYPECOV_SCRIPT =
  /^(?:cd (?<folder>[\w.\-]+) && )?node [\w.\/\-]+\/type-coverage -p (?<config>[\w.\-]+) --strict --ignore-as-assertion --ignore-type-assertion --ignore-non-null-assertion --at-least 100$/v
const typecovConfig = (script = ''): string | undefined => {
  // An optional group that did not take part in the match is undefined.
  const groups: Partial<Record<string, string>> = TYPECOV_SCRIPT.exec(script)?.groups ?? {}
  return groups.config === undefined
    ? undefined
    : path.posix.join(groups.folder ?? '.', groups.config)
}

// Whether Prettier would format a file under the glob if `.prettierignore` did not name it.
const isParsedWithoutIgnoreFile = async (glob: string): Promise<boolean> => {
  const files = tracked.filter((file) => path.matchesGlob(file, glob))
  const parsedFiles = await filterAsync(files, async (file) => {
    const info = await getFileInfo(path.join(ROOT, file), {
      ignorePath: [path.join(ROOT, '.gitignore')]
    })
    return !info.ignored && info.inferredParser !== null
  })
  return parsedFiles.length > 0
}

describe('static scope: dependency, dead-code, type-coverage and format gates', () => {
  it('lets knip ignore nothing and keeps every data file out of its project', () => {
    const keys = keysOf(readJson('knip.json'))
    const negated = knipNegatedGlobs()
    const kept = dataFiles.filter((file) => negated.every((glob) => !path.matchesGlob(file, glob)))
    report(
      `knip.json: keys walked ${String(keys.length)}; data files ${String(dataFiles.length)}, not negated ${String(kept.length)}`
    )

    expect(keys.length).toBeGreaterThan(0)
    expect(keys.filter((key) => key.startsWith('ignore'))).toStrictEqual([])
    expect(dataFiles.length).toBeGreaterThan(0)
    expect(kept).toStrictEqual([])
  })

  it('lets jscpd scan every code file and no data file', { timeout: 60_000 }, () => {
    const config = readJson('.jscpd.json')
    const { path: roots, ignore } = isRecord(config) ? config : {}
    const ignored = isStringArray(ignore) ? ignore : []
    const kept = dataFiles.filter((file) => ignored.every((glob) => !path.matchesGlob(file, glob)))
    const scanned = jscpdSources()
    report(
      `.jscpd.json: ignore ${String(ignored.length)}, data files not ignored ${String(kept.length)}; files scanned ${String(scanned)} of ${String(codeFiles.length)}`
    )

    expect(roots).toStrictEqual(['.'])
    expect(ignored).toStrictEqual(scope.dataGlobs)
    expect(kept).toStrictEqual([])
    expect(scanned).toBe(codeFiles.length)
  })

  it(
    'cruises the source and tooling trees and reads no data file',
    { timeout: 300_000 },
    async () => {
      expect.hasAssertions()

      const { options, result } = await cruiseScan(CRUISE_ROOTS)
      const patterns = excludePatterns(options)
      const cruisedData = result.modules
        .map((module) => module.source)
        .filter((file) => isData(file))
      const kept = dataFiles.filter((file) => patterns.every((pattern) => !pattern.test(file)))
      report(
        `depcruise: modules cruised ${String(result.summary.totalCruised)}, data modules ${String(cruisedData.length)}; data files not excluded ${String(kept.length)}`
      )

      expect(result.summary.totalCruised).toBeGreaterThan(0)
      expect(cruisedData).toStrictEqual([])
      expect(kept).toStrictEqual([])
    }
  )

  it('gives type-coverage the root files of each of the six programs', () => {
    const counts = PROGRAMS.map((program) => ({
      name: program.name,
      files: parsed(program.config).fileNames.length
    }))
    for (const { name, files } of counts) report(`typecov program ${name}: files ${String(files)}`)

    expect(counts.filter(({ files }) => files === 0)).toStrictEqual([])

    const scripts = packageScripts()
    const configs = PROGRAMS.map((program) => typecovConfig(scripts[`typecov:${program.name}`]))

    expect(configs).toStrictEqual(PROGRAMS.map((program) => program.config))
  })
})

describe('static scope: format gate, transitional files and gate scripts', () => {
  it(
    'pins Prettier exactly and ignores only generated, data and frozen files',
    { timeout: 300_000 },
    async () => {
      expect.hasAssertions()

      const manifest = readJson('package.json')
      const { devDependencies } = isRecord(manifest) ? manifest : {}
      const { prettier: pinned } = isRecord(devDependencies) ? devDependencies : {}

      expect(pinned).toBe('3.8.3')

      const lines = readFileSync(path.join(ROOT, '.prettierignore'), 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '' && !line.startsWith('#'))
      // A data glob needs a line only where Prettier would parse one of its files (screenshots are PNG).
      const parsedGlobs = await filterAsync(scope.dataGlobs, isParsedWithoutIgnoreFile)
      report(
        `.prettierignore: lines ${String(lines.length)}; data globs Prettier parses ${String(parsedGlobs.length)} of ${String(scope.dataGlobs.length)}`
      )

      expect(lines).toStrictEqual([
        'THIRD_PARTY_LICENSES.md',
        ...parsedGlobs,
        'eslint-suppressions.json'
      ])
    }
  )

  it('names only tracked transitional artefacts', () => {
    report(
      `transitional artefacts ${String(TRANSITIONAL_ARTEFACTS.length)}: ${TRANSITIONAL_ARTEFACTS.join(', ')}`
    )

    expect(TRANSITIONAL_ARTEFACTS.filter((file) => !tracked.includes(file))).toStrictEqual([])
    expect(packageScripts().deps.includes('--ignore-known')).toBe(
      TRANSITIONAL_ARTEFACTS.includes(KNOWN_VIOLATIONS)
    )
  })

  it('lets no gate script cache lint results, pass unpruned suppressions or skip known cycles', () => {
    const scripts = Object.entries(packageScripts())
    const loose = scripts
      .filter(([, command]) => /--cache\b|--pass-on-unpruned-suppressions/v.test(command))
      .map(([name]) => name)
    const ignoringKnown = scripts
      .filter(([, command]) => command.includes('--ignore-known'))
      .map(([name]) => name)
    report(
      `package scripts ${String(scripts.length)}: loose ${String(loose.length)}, ignoring known violations ${String(ignoringKnown.length)}`
    )

    expect(scripts.length).toBeGreaterThan(0)
    expect(loose).toStrictEqual([])
    expect(ignoringKnown).toStrictEqual(['deps'])
  })
})
