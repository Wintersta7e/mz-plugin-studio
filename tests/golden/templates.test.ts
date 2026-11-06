// Every template's output for its base values, one-factor variants and hostile text, pinned
// before any generator change.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  getTemplate,
  validateTemplateValues,
  type CodeTemplate
} from '../../src/renderer/src/lib/generator/templates/index'
import { evaluatePlugin } from '../helpers/evaluate-plugin'
import { freezeTime, restoreTime } from './corpus/normalise'
import {
  renderCases,
  renderTemplateCases,
  templateCases,
  templateIds,
  type TemplateCase
} from './corpus/templates'
import { typeViolatingTemplateCases } from './corpus/type-violating'

const ids = templateIds()

function template(id: string): CodeTemplate {
  const found = getTemplate(id)
  if (found === undefined) throw new Error(`Unknown template ${id}`)
  return found
}

const kindOf = (c: TemplateCase): 'base' | 'variants' | 'hostile' => {
  if (c.hostile !== null) return 'hostile'
  return c.name === 'base' ? 'base' : 'variants'
}

// What evaluating an accepted non-hostile case in the template context finds wrong, if anything.
function caseProblem(id: string, c: TemplateCase): string | undefined {
  const result = evaluatePlugin(template(id).generate(c.values), { mode: 'template' })
  return result.compileProblem === null && result.threw === null && !result.sentinel
    ? undefined
    : `${id} ${c.name}: ${JSON.stringify(result.compileProblem ?? result.threw)}`
}

interface CaseSummary {
  counts: { base: number; variants: number; hostile: number; rejected: number }
  rejectedBases: string[]
  problems: string[]
}

// Counts one case by kind, and records a rejected base or the problem of an accepted case.
function addCase(summary: CaseSummary, id: string, c: TemplateCase): void {
  summary.counts[kindOf(c)]++
  if (!validateTemplateValues(id, c.values).valid) {
    summary.counts.rejected++
    if (c.name === 'base') summary.rejectedBases.push(id)
    return
  }
  const problem = c.hostile === null ? caseProblem(id, c) : undefined
  if (problem !== undefined) summary.problems.push(problem)
}

// Every case of every template counted by kind, the templates whose base is rejected, and the
// problems of the accepted non-hostile cases.
function evaluateCases(): CaseSummary {
  const summary: CaseSummary = {
    counts: { base: 0, variants: 0, hostile: 0, rejected: 0 },
    rejectedBases: [],
    problems: []
  }
  for (const id of ids) {
    for (const c of templateCases(id)) addCase(summary, id, c)
  }
  return summary
}

describe('template goldens', () => {
  beforeAll(freezeTime)

  afterAll(restoreTime)

  it.each(ids)('%s: all cases', async (id) => {
    expect.assertions(1)
    await expect(renderTemplateCases(id)).toMatchFileSnapshot(`__golden__/templates/${id}.js`)
  })

  it.each(ids)('%s: type-violating cases', async (id) => {
    expect.hasAssertions()
    await expect(renderCases(id, typeViolatingTemplateCases(id))).toMatchFileSnapshot(
      `__golden__/templates/${id}.type-violating.js`
    )
  })

  it('accepted non-hostile cases evaluate clean in the template context', () => {
    const { counts, rejectedBases, problems } = evaluateCases()
    const total = counts.base + counts.variants + counts.hostile
    process.stdout.write(
      `template cases: templates ${String(ids.length)}, cases ${String(total)} (base ${String(counts.base)}, ` +
        `variants ${String(counts.variants)}, hostile ${String(counts.hostile)}; rejected ${String(counts.rejected)})\n`
    )

    expect(ids.length).toBeGreaterThan(0)
    expect(rejectedBases).toStrictEqual([])
    expect(problems).toStrictEqual([])
  })
})
