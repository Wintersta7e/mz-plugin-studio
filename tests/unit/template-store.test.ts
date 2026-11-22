// COV-09: Template system tests
// Tests the template registry: building it from a list, getTemplatesByCategory,
// validateTemplateValues, getTemplateDefaults
import { describe, it, expect } from 'vitest'
import {
  createTemplateRegistry,
  type TemplateRegistry
} from '../../src/renderer/src/lib/generator/templates/index'
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
A registry built from the given templates alone, so no case sees another's
*/
function freshRegistry(...registered: CodeTemplate[]): TemplateRegistry {
  return createTemplateRegistry(registered)
}

describe('template registry: registration and listing', () => {
  describe('registerTemplate', () => {
    it('registers a template and makes it retrievable by id', () => {
      expect.assertions(1)

      const tmpl = makeTemplate()
      const registry = freshRegistry(tmpl)

      expect(registry.getTemplate('test-template')).toStrictEqual(tmpl)
    })

    it('throws on a template id defined twice', () => {
      expect.assertions(1)

      const tmpl1 = makeTemplate({ name: 'First' })
      const tmpl2 = makeTemplate({ name: 'Second' })

      expect(() => freshRegistry(tmpl1, tmpl2)).toThrow(
        'Template id "test-template" is defined twice'
      )
    })
  })

  describe('getTemplatesByCategory', () => {
    it('returns only templates matching the category', () => {
      expect.assertions(2)

      const registry = freshRegistry(
        makeTemplate({ id: 'ma1', category: 'method-alias' }),
        makeTemplate({ id: 'ma2', category: 'method-alias' }),
        makeTemplate({ id: 'sc1', category: 'scene-hooks' })
      )

      const methodAliasTemplates = registry.getTemplatesByCategory('method-alias')

      expect(methodAliasTemplates).toHaveLength(2)
      expect(methodAliasTemplates.every((t) => t.category === 'method-alias')).toBe(true)
    })

    it('returns empty array for category with no templates', () => {
      expect.assertions(1)

      const registry = freshRegistry()

      expect(registry.getTemplatesByCategory('save-load')).toHaveLength(0)
    })
  })

  describe('getAllTemplates', () => {
    it('returns all registered templates', () => {
      expect.assertions(1)

      const registry = freshRegistry(
        makeTemplate({ id: 't1' }),
        makeTemplate({ id: 't2' }),
        makeTemplate({ id: 't3' })
      )

      expect(registry.getAllTemplates()).toHaveLength(3)
    })

    it('returns empty array when registry is empty', () => {
      expect.assertions(1)

      const registry = freshRegistry()

      expect(registry.getAllTemplates()).toHaveLength(0)
    })
  })
})

describe('template registry: validation', () => {
  describe('validateTemplateValues', () => {
    it('returns valid when all required fields are provided', () => {
      expect.assertions(2)

      const registry = freshRegistry(makeTemplate())
      const result = registry.validateTemplateValues('test-template', {
        className: 'Game_Actor',
        methodName: 'initialize'
      })

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns invalid when a required field is missing', () => {
      expect.assertions(2)

      const registry = freshRegistry(makeTemplate())
      const result = registry.validateTemplateValues('test-template', {
        className: 'Game_Actor'
        // methodName is required but missing
      })

      expect(result.valid).toBe(false)
      expect(result.errors.some((error) => error.includes('Method Name'))).toBe(true)
    })

    it('returns invalid when a required field is empty string', () => {
      expect.assertions(1)

      const registry = freshRegistry(makeTemplate())
      const result = registry.validateTemplateValues('test-template', {
        className: 'Game_Actor',
        methodName: ''
      })

      expect(result.valid).toBe(false)
    })

    it('returns invalid for non-existent template id', () => {
      expect.assertions(2)

      const registry = freshRegistry(makeTemplate())
      const result = registry.validateTemplateValues('nonexistent', {})

      expect(result.valid).toBe(false)
      expect(result.errors.some((error) => error.includes('nonexistent'))).toBe(true)
    })

    it('runs custom validator when provided', () => {
      expect.assertions(3)

      const registry = freshRegistry(makeTemplate(), customValidated())

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
    it('returns default values for all fields that have defaults', () => {
      expect.assertions(1)

      const registry = freshRegistry(makeTemplate())
      const defaults = registry.getTemplateDefaults('test-template')

      expect(defaults).toStrictEqual({
        className: 'Game_Actor',
        methodName: 'initialize',
        timing: 'after'
      })
    })

    it('returns empty object for non-existent template', () => {
      expect.assertions(1)

      const registry = freshRegistry()
      const defaults = registry.getTemplateDefaults('nonexistent')

      expect(defaults).toStrictEqual({})
    })

    it('excludes fields with no default value', () => {
      expect.assertions(1)

      const registry = freshRegistry(
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
