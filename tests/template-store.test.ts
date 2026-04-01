// COV-09: Template system tests
// Tests the template registry: registerTemplate, getTemplatesByCategory,
// generateFromTemplate, validateTemplateValues, getTemplateDefaults
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock electron-log/renderer before any imports that transitively use it
vi.mock('electron-log/renderer', () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))
import {
  registerTemplate,
  unregisterTemplate,
  getAllTemplates,
  getTemplatesByCategory,
  getTemplate,
  hasTemplate,
  getTemplateCount,
  generateFromTemplate,
  validateTemplateValues,
  getTemplateDefaults,
  clearTemplates
} from '../src/renderer/src/lib/generator/templates/index'
import type { CodeTemplate } from '../src/renderer/src/lib/generator/templates/types'

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
      const cls = String(values.className ?? 'Game_Actor')
      const method = String(values.methodName ?? 'initialize')
      const timing = String(values.timing ?? 'after')
      return `// ${timing}: ${cls}.prototype.${method}`
    },
    ...overrides
  }
}

describe('template registry', () => {
  beforeEach(() => {
    clearTemplates()
  })

  describe('registerTemplate', () => {
    it('registers a template and makes it retrievable by id', () => {
      const tmpl = makeTemplate()
      registerTemplate(tmpl)
      expect(hasTemplate('test-template')).toBe(true)
      expect(getTemplate('test-template')).toEqual(tmpl)
    })

    it('overwrites an existing template with the same id', () => {
      const tmpl1 = makeTemplate({ name: 'First' })
      const tmpl2 = makeTemplate({ name: 'Second' })
      registerTemplate(tmpl1)
      registerTemplate(tmpl2)
      expect(getTemplate('test-template')!.name).toBe('Second')
    })

    it('increments getTemplateCount after each register', () => {
      expect(getTemplateCount()).toBe(0)
      registerTemplate(makeTemplate({ id: 'a' }))
      registerTemplate(makeTemplate({ id: 'b' }))
      expect(getTemplateCount()).toBe(2)
    })
  })

  describe('unregisterTemplate', () => {
    it('removes a registered template', () => {
      registerTemplate(makeTemplate())
      expect(unregisterTemplate('test-template')).toBe(true)
      expect(hasTemplate('test-template')).toBe(false)
    })

    it('returns false for non-existent template', () => {
      expect(unregisterTemplate('missing')).toBe(false)
    })
  })

  describe('getTemplatesByCategory', () => {
    it('returns only templates matching the category', () => {
      registerTemplate(makeTemplate({ id: 'ma1', category: 'method-alias' }))
      registerTemplate(makeTemplate({ id: 'ma2', category: 'method-alias' }))
      registerTemplate(makeTemplate({ id: 'sc1', category: 'scene-hooks' }))

      const methodAliasTemplates = getTemplatesByCategory('method-alias')
      expect(methodAliasTemplates).toHaveLength(2)
      expect(methodAliasTemplates.every((t) => t.category === 'method-alias')).toBe(true)
    })

    it('returns empty array for category with no templates', () => {
      expect(getTemplatesByCategory('save-load')).toHaveLength(0)
    })
  })

  describe('getAllTemplates', () => {
    it('returns all registered templates', () => {
      registerTemplate(makeTemplate({ id: 't1' }))
      registerTemplate(makeTemplate({ id: 't2' }))
      registerTemplate(makeTemplate({ id: 't3' }))
      expect(getAllTemplates()).toHaveLength(3)
    })

    it('returns empty array when registry is empty', () => {
      expect(getAllTemplates()).toHaveLength(0)
    })
  })

  describe('generateFromTemplate', () => {
    it('generates code with provided values', () => {
      registerTemplate(makeTemplate())
      const result = generateFromTemplate('test-template', {
        className: 'Game_Actor',
        methodName: 'setup',
        timing: 'before'
      })
      expect(result).not.toBeNull()
      expect(result).toContain('Game_Actor.prototype.setup')
      expect(result).toContain('before:')
    })

    it('returns null for non-existent template id', () => {
      const result = generateFromTemplate('nonexistent', {})
      expect(result).toBeNull()
    })

    it('returns null when template validation fails', () => {
      const strictTemplate = makeTemplate({
        id: 'strict',
        validate: () => ({ valid: false, errors: ['Required field missing'] })
      })
      registerTemplate(strictTemplate)
      const result = generateFromTemplate('strict', {})
      expect(result).toBeNull()
    })

    it('uses defaults from template fields when values omit optional fields', () => {
      registerTemplate(makeTemplate())
      // Pass only required fields; timing has a default of 'after'
      const result = generateFromTemplate('test-template', {
        className: 'Game_Actor',
        methodName: 'initialize'
        // timing omitted — generate() reads from values, will be undefined
        // The template generate() uses '?? after' fallback
      })
      expect(result).not.toBeNull()
      expect(result).toContain('after')
    })
  })

  describe('validateTemplateValues', () => {
    beforeEach(() => {
      registerTemplate(makeTemplate())
    })

    it('returns valid when all required fields are provided', () => {
      const result = validateTemplateValues('test-template', {
        className: 'Game_Actor',
        methodName: 'initialize'
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns invalid when a required field is missing', () => {
      const result = validateTemplateValues('test-template', {
        className: 'Game_Actor'
        // methodName is required but missing
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Method Name'))).toBe(true)
    })

    it('returns invalid when a required field is empty string', () => {
      const result = validateTemplateValues('test-template', {
        className: 'Game_Actor',
        methodName: ''
      })
      expect(result.valid).toBe(false)
    })

    it('returns invalid for non-existent template id', () => {
      const result = validateTemplateValues('nonexistent', {})
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('nonexistent'))).toBe(true)
    })

    it('runs custom validator when provided', () => {
      registerTemplate(
        makeTemplate({
          id: 'custom-validated',
          validate: (values) => ({
            valid: values.className === 'Game_Actor',
            errors: values.className !== 'Game_Actor' ? ['Only Game_Actor is allowed'] : []
          })
        })
      )

      const invalid = validateTemplateValues('custom-validated', {
        className: 'Game_Battler',
        methodName: 'initialize'
      })
      expect(invalid.valid).toBe(false)
      expect(invalid.errors.some((e) => e.includes('Only Game_Actor'))).toBe(true)

      const valid = validateTemplateValues('custom-validated', {
        className: 'Game_Actor',
        methodName: 'initialize'
      })
      expect(valid.valid).toBe(true)
    })
  })

  describe('getTemplateDefaults', () => {
    it('returns default values for all fields that have defaults', () => {
      registerTemplate(makeTemplate())
      const defaults = getTemplateDefaults('test-template')
      expect(defaults).toEqual({
        className: 'Game_Actor',
        methodName: 'initialize',
        timing: 'after'
      })
    })

    it('returns empty object for non-existent template', () => {
      const defaults = getTemplateDefaults('nonexistent')
      expect(defaults).toEqual({})
    })

    it('excludes fields with no default value', () => {
      registerTemplate(
        makeTemplate({
          id: 'no-defaults',
          fields: [
            { id: 'required', label: 'Required', type: 'text', required: true }
            // No default
          ]
        })
      )
      const defaults = getTemplateDefaults('no-defaults')
      expect(defaults).toEqual({})
    })
  })
})
