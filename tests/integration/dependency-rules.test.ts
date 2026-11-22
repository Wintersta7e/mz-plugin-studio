// The module-boundary rules of `.dependency-cruiser.mjs`: each refuses the import it names in a
// synthetic tree, and its paths match modules of the real one, so it guards something.
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { cruise } from 'dependency-cruiser'
import extractDepcruiseConfig from 'dependency-cruiser/config-utl/extract-depcruise-config'

const FIXTURES = 'tests/fixtures/dependency-rules'

/**
The repository's rule set, without its options: those leave the fixtures out of a cruise.
*/
async function forbiddenRules() {
  const { forbidden } = await extractDepcruiseConfig('./.dependency-cruiser.mjs')
  if (forbidden === undefined) throw new Error('the dependency rules forbid nothing')
  return forbidden
}

/**
The rules each module of the fixture tree breaks, cruised from the tree's own root, and the number
of modules cruised.
*/
async function violationsIn(tree: string): Promise<{ modules: number; violations: string[] }> {
  const { output } = await cruise(
    ['src'],
    {
      baseDir: path.resolve(FIXTURES, tree),
      validate: true,
      ruleSet: { forbidden: await forbiddenRules() }
    },
    { extensions: ['.ts'] }
  )
  if (typeof output === 'string') throw new TypeError('the cruise returned a report, not a result')
  return {
    modules: output.modules.length,
    violations: output.summary.violations.map(
      (violation) => `${violation.rule.name}: ${violation.from} -> ${violation.to}`
    )
  }
}

// The repository's source modules, as the rules' paths name them.
const sourceModules = (): string[] =>
  readdirSync('src', { recursive: true, encoding: 'utf8' }).map((file) =>
    path.posix.join('src', file.split(path.sep).join('/'))
  )

async function rulePath(name: string, end: 'from' | 'to'): Promise<RegExp> {
  const rules = await forbiddenRules()
  const restriction: unknown = Reflect.get(rules.find((rule) => rule.name === name) ?? {}, end)
  const pattern: unknown =
    typeof restriction === 'object' && restriction !== null
      ? Reflect.get(restriction, 'path')
      : undefined
  if (typeof pattern !== 'string') throw new TypeError(`rule ${name} names no ${end} path`)
  return new RegExp(pattern)
}

describe('dependency rules', () => {
  it('templates-through-registry refuses a category module read outside the registry', async () => {
    expect.hasAssertions()

    const { modules, violations } = await violationsIn('registry')

    expect(modules, `modules cruised: ${String(modules)}`).toBeGreaterThan(0)
    expect(violations).toStrictEqual([
      'templates-through-registry: src/renderer/src/components/sample-dialog.ts -> src/renderer/src/lib/generator/templates/sample-category.ts'
    ])
  })

  it('templates-through-registry names real category modules', async () => {
    expect.hasAssertions()

    const to = await rulePath('templates-through-registry', 'to')
    const matched = sourceModules().filter((file) => to.test(file))
    process.stdout.write(
      `templates-through-registry: to matches ${String(matched.length)} modules\n`
    )

    expect(
      matched.length,
      `templates-through-registry: to matches ${String(matched.length)} modules`
    ).toBeGreaterThan(0)
  })

  it('generator-is-process-neutral refuses a generator module importing a renderer package', async () => {
    expect.hasAssertions()

    const { modules, violations } = await violationsIn('generator')

    expect(modules, `modules cruised: ${String(modules)}`).toBeGreaterThan(0)
    expect(
      violations.filter((violation) => violation.startsWith('generator-is-process-neutral: '))
    ).toStrictEqual([
      'generator-is-process-neutral: src/renderer/src/lib/generator/violator.ts -> ../../../../node_modules/zustand/index.js'
    ])
  })

  it('generator-is-process-neutral names real generator modules', async () => {
    expect.hasAssertions()

    const from = await rulePath('generator-is-process-neutral', 'from')
    const matched = sourceModules().filter((file) => from.test(file))
    process.stdout.write(
      `generator-is-process-neutral: from matches ${String(matched.length)} modules\n`
    )

    expect(
      matched.length,
      `generator-is-process-neutral: from matches ${String(matched.length)} modules`
    ).toBeGreaterThan(0)
  })
})
