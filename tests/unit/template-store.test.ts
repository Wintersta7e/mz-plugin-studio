// COV-09: Template system tests
// Tests the template registry: registerTemplate, getTemplatesByCategory,
// validateTemplateValues, getTemplateDefaults
import { describe, it, expect, vi } from 'vitest'

// Mock electron-log/renderer before any imports that transitively use it
vi.mock<Record<'default', unknown>>(import('electron-log/renderer'), () => ({
  default: {
    warn: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
    debug: vi.fn<() => void>()
  }
}))
import type * as Registry from '../../src/renderer/src/lib/generator/templates/index'
import type { CodeTemplate } from '../../src/renderer/src/lib/generator/templates/types'

const textOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback

function makeTemplate(overrides: Partial<CodeTemplate> = {}): CodeTemplate {
  return {
    id: 'test-template',
    category: 'method-alias',
    name: 'Test Template',
    description: 'A test template',
    icon: 'GitBranch',
    fields: [
      {
        id: 'className',
        label: 'Class Name',
        type: 'text',
        required: true,
        default: 'Game_Actor'
      },
      {
        id: 'methodName',
        label: 'Method Name',
        type: 'text',
        required: true,
        default: 'initialize'
      },
      {
        id: 'timing',
        label: 'Timing',
        type: 'select',
        options: [
          { value: 'after', label: 'After' },
          { value: 'before', label: 'Before' }
        ],
        default: 'after'
      }
    ],
    generate: (values) => {
      const cls = textOr(Reflect.get(values, 'className'), 'Game_Actor')
      const method = textOr(Reflect.get(values, 'methodName'), 'initialize')
      const timing = textOr(Reflect.get(values, 'timing'), 'after')
      return `// ${timing}: ${cls}.prototype.${method}`
    },
    ...overrides
  }
}

const customValidated = (): CodeTemplate =>
  makeTemplate({
    id: 'custom-validated',
    validate: (values) => ({
      valid: Reflect.get(values, 'className') === 'Game_Actor',
      errors:
        Reflect.get(values, 'className') === 'Game_Actor' ? [] : ['Only Game_Actor is allowed']
    })
  })

/**
Imports the registry afresh, with the given templates registered: it is module state, so no case
sees another's
*/
async function freshRegistry(...registered: CodeTemplate[]): Promise<typeof Registry> {
  vi.resetModules()
  const registry = await import('../../src/renderer/src/lib/generator/templates/index')
  for (const template of registered) registry.registerTemplate(template)
  return registry
}

describe('template registry: registration and listing', () => {
  describe('registerTemplate', () => {
    it('registers a template and makes it retrievable by id', async () => {
      expect.assertions(1)

      const registry = await freshRegistry()
      const tmpl = makeTemplate()
      registry.registerTemplate(tmpl)

      expect(registry.getTemplate('test-template')).toStrictEqual(tmpl)
    })

    it('overwrites an existing template with the same id', async () => {
      expect.assertions(1)

      const registry = await freshRegistry()
      const tmpl1 = makeTemplate({ name: 'First' })
      const tmpl2 = makeTemplate({ name: 'Second' })
      registry.registerTemplate(tmpl1)
      registry.registerTemplate(tmpl2)

      expect(registry.getTemplate('test-template')?.name).toBe('Second')
    })
  })

  describe('getTemplatesByCategory', () => {
    it('returns only templates matching the category', async () => {
      expect.assertions(2)

      const registry = await freshRegistry()
      registry.registerTemplate(makeTemplate({ id: 'ma1', category: 'method-alias' }))
      registry.registerTemplate(makeTemplate({ id: 'ma2', category: 'method-alias' }))
      registry.registerTemplate(makeTemplate({ id: 'sc1', category: 'scene-hooks' }))

      const methodAliasTemplates = registry.getTemplatesByCategory('method-alias')

      expect(methodAliasTemplates).toHaveLength(2)
      expect(methodAliasTemplates.every((t) => t.category === 'method-alias')).toBe(true)
    })

    it('returns empty array for category with no templates', async () => {
      expect.assertions(1)

      const registry = await freshRegistry()

      expect(registry.getTemplatesByCategory('save-load')).toHaveLength(0)
    })
  })

  describe('getAllTemplates', () => {
    it('returns all registered templates', async () => {
      expect.assertions(1)

      const registry = await freshRegistry()
      registry.registerTemplate(makeTemplate({ id: 't1' }))
      registry.registerTemplate(makeTemplate({ id: 't2' }))
      registry.registerTemplate(makeTemplate({ id: 't3' }))

      expect(registry.getAllTemplates()).toHaveLength(3)
    })

    it('returns empty array when registry is empty', async () => {
      expect.assertions(1)

      const registry = await freshRegistry()

      expect(registry.getAllTemplates()).toHaveLength(0)
    })
  })
})

describe('template registry: validation', () => {
  describe('validateTemplateValues', () => {
    it('returns valid when all required fields are provided', async () => {
      expect.assertions(2)

      const registry = await freshRegistry(makeTemplate())
      const result = registry.validateTemplateValues('test-template', {
        className: 'Game_Actor',
        methodName: 'initialize'
      })

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns invalid when a required field is missing', async () => {
      expect.assertions(2)

      const registry = await freshRegistry(makeTemplate())
      const result = registry.validateTemplateValues('test-template', {
        className: 'Game_Actor'
        // methodName is required but missing
      })

      expect(result.valid).toBe(false)
      expect(result.errors.some((error) => error.includes('Method Name'))).toBe(true)
    })

    it('returns invalid when a required field is empty string', async () => {
      expect.assertions(1)

      const registry = await freshRegistry(makeTemplate())
      const result = registry.validateTemplateValues('test-template', {
        className: 'Game_Actor',
        methodName: ''
      })

      expect(result.valid).toBe(false)
    })

    it('returns invalid for non-existent template id', async () => {
      expect.assertions(2)

      const registry = await freshRegistry(makeTemplate())
      const result = registry.validateTemplateValues('nonexistent', {})

      expect(result.valid).toBe(false)
      expect(result.errors.some((error) => error.includes('nonexistent'))).toBe(true)
    })

    it('runs custom validator when provided', async () => {
      expect.assertions(3)

      const registry = await freshRegistry(makeTemplate())
      registry.registerTemplate(customValidated())

      const invalid = registry.validateTemplateValues('custom-validated', {
        className: 'Game_Battler',
        methodName: 'initialize'
      })

      expect(invalid.valid).toBe(false)
      expect(invalid.errors.some((error) => error.includes('Only Game_Actor'))).toBe(true)

      const valid = registry.validateTemplateValues('custom-validated', {
        className: 'Game_Actor',
        methodName: 'initialize'
      })

      expect(valid.valid).toBe(true)
    })
  })
})

describe('template registry: defaults', () => {
  describe('getTemplateDefaults', () => {
    it('returns default values for all fields that have defaults', async () => {
      expect.assertions(1)

      const registry = await freshRegistry()
      registry.registerTemplate(makeTemplate())
      const defaults = registry.getTemplateDefaults('test-template')

      expect(defaults).toStrictEqual({
        className: 'Game_Actor',
        methodName: 'initialize',
        timing: 'after'
      })
    })

    it('returns empty object for non-existent template', async () => {
      expect.assertions(1)

      const registry = await freshRegistry()
      const defaults = registry.getTemplateDefaults('nonexistent')

      expect(defaults).toStrictEqual({})
    })

    it('excludes fields with no default value', async () => {
      expect.assertions(1)

      const registry = await freshRegistry()
      registry.registerTemplate(
        makeTemplate({
          id: 'no-defaults',
          fields: [
            { id: 'required', label: 'Required', type: 'text', required: true }
            // No default
          ]
        })
      )
      const defaults = registry.getTemplateDefaults('no-defaults')

      expect(defaults).toStrictEqual({})
    })
  })
})
