// Every template's output for its base values, one-factor variants and hostile text, pinned
// before any generator change.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  getTemplate,
  validateTemplateValues
} from '../../src/renderer/src/lib/generator/templates/index'
import { evaluatePlugin } from '../helpers/evaluate-plugin'
import { freezeTime, restoreTime } from './corpus/normalise'
import { renderTemplateCases, templateCases, templateIds } from './corpus/templates'

const ids = templateIds()

describe('template goldens', () => {
  beforeAll(freezeTime)
  afterAll(restoreTime)

  for (const id of ids) {
    it(`${id}: all cases`, async () => {
      await expect(renderTemplateCases(id)).toMatchFileSnapshot(`__golden__/templates/${id}.js`)
    })
  }

  it('accepted non-hostile cases evaluate clean in the template context', () => {
    const counts = { base: 0, variants: 0, hostile: 0, rejected: 0 }
    const rejectedBases: string[] = []
    const problems: string[] = []
    for (const id of ids) {
      const generate = getTemplate(id)!.generate
      for (const c of templateCases(id)) {
        if (c.hostile !== null) counts.hostile++
        else if (c.name === 'base') counts.base++
        else counts.variants++
        const valid = validateTemplateValues(id, c.values).valid
        if (!valid) {
          counts.rejected++
          if (c.name === 'base') rejectedBases.push(id)
        }
        if (!valid || c.hostile !== null) continue
        const result = evaluatePlugin(generate(c.values), { mode: 'template' })
        if (result.compileProblem !== null || result.threw !== null || result.sentinel) {
          problems.push(`${id} ${c.name}: ${JSON.stringify(result.compileProblem ?? result.threw)}`)
        }
      }
    }
    const total = counts.base + counts.variants + counts.hostile
    console.log(
      `template cases: templates ${ids.length}, cases ${total} (base ${counts.base}, ` +
        `variants ${counts.variants}, hostile ${counts.hostile}; rejected ${counts.rejected})`
    )
    expect(ids.length).toBeGreaterThan(0)
    expect(rejectedBases).toEqual([])
    expect(problems).toEqual([])
  })
})
