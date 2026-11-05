// Regression tests for the six MZ template bug fixes in session 30.
// Each test validates the GENERATED output string produced by a template's
// `generate()` function.

import { describe, it, expect, vi } from 'vitest'

// Mock electron-log/renderer before template files (which import it transitively)
vi.mock('electron-log/renderer', () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

// Side-effect imports register each template into the shared registry
import '../../src/renderer/src/lib/generator/templates/method-alias'
import '../../src/renderer/src/lib/generator/templates/save-load'
import '../../src/renderer/src/lib/generator/templates/input-handler'
import '../../src/renderer/src/lib/generator/templates/battle-system'
import '../../src/renderer/src/lib/generator/templates/plugin-commands'
import '../../src/renderer/src/lib/generator/templates/message-system'

import {
  getTemplate,
  getTemplateDefaults,
  validateTemplateValues
} from '../../src/renderer/src/lib/generator/templates/index'
import { compileCheck } from '../../src/main/services/syntax-check'

describe('save-load template', () => {
  it('injects a warning comment when storageLocation is Game_Actors', () => {
    const tpl = getTemplate('save-load-basic')!
    const out = tpl.generate({
      dataName: 'partyBuffs',
      storageLocation: 'Game_Actors',
      dataType: 'object',
      defaultValue: ''
    })

    expect(out).toMatch(/WARNING: Game_Actors is a CONTAINER/i)
    expect(out).toMatch(/will be lost on save reload/i)
  })

  it('injects a warning comment when storageLocation is Game_Map', () => {
    const tpl = getTemplate('save-load-basic')!
    const out = tpl.generate({
      dataName: 'mapFlags',
      storageLocation: 'Game_Map',
      dataType: 'object',
      defaultValue: ''
    })

    expect(out).toMatch(/WARNING: Game_Map is reinitialized/i)
  })

  it('does not inject warning for Game_System (save-persistent)', () => {
    const tpl = getTemplate('save-load-basic')!
    const out = tpl.generate({
      dataName: 'questData',
      storageLocation: 'Game_System',
      dataType: 'object',
      defaultValue: ''
    })

    expect(out).not.toMatch(/WARNING/i)
  })
})

describe('input-handler template (global scene)', () => {
  it('uses a key-scoped method name to avoid cross-plugin collision', () => {
    const tpl = getTemplate('input-handler-basic')!
    const out = tpl.generate({
      keyName: 'q',
      triggerType: 'isTriggered',
      activeScene: 'all'
    })

    // Method name should include the key suffix
    expect(out).toMatch(/updateGlobalKeyInput_Q/)
    // The old colliding name should not appear as a bare call
    expect(out).not.toMatch(/\.updateGlobalKeyInput\(\)/)
  })

  it('uses a key-scoped alias name for the Scene_Base.update hook', () => {
    const tpl = getTemplate('input-handler-basic')!
    const out = tpl.generate({
      keyName: 'tab',
      triggerType: 'isTriggered',
      activeScene: 'all'
    })

    expect(out).toMatch(/_Scene_Base_update_tab/)
  })
})

describe('method-alias template', () => {
  it('emits a strong warning when replace-without-call is chosen', () => {
    const tpl = getTemplate('method-alias-basic')!
    const out = tpl.generate({
      className: 'Game_Battler',
      methodName: 'canMove',
      timing: 'replace',
      callOriginal: false
    })

    expect(out).toMatch(/WARNING: This replacement does NOT call the original/i)
    expect(out).toMatch(/canMove/)
    expect(out).toMatch(/TODO: return an appropriate value/i)
  })

  it('does not emit warning for normal aliases', () => {
    const tpl = getTemplate('method-alias-basic')!
    const out = tpl.generate({
      className: 'Scene_Map',
      methodName: 'update',
      timing: 'after',
      callOriginal: true
    })

    expect(out).not.toMatch(/WARNING/i)
  })
})

describe('battle-system damage modifier', () => {
  it('generates sign-preserving multiplication for damage modifier', () => {
    const tpl = getTemplate('battle-damage-modifier')!
    const out = tpl.generate({
      modifyType: 'multiply',
      modifyValue: 1.5,
      condition: 'always'
    })

    // New behavior: value >= 0 ? floor : ceil — keeps heals symmetric
    expect(out).toMatch(/value >= 0 \? Math\.floor\(value \* 1\.5\) : Math\.ceil\(value \* 1\.5\)/)
  })
})

describe('message-system custom escape code', () => {
  it('adds negative lookahead on no-parameter replace regex', () => {
    const tpl = getTemplate('message-custom-text-code')!
    const out = tpl.generate({
      escapeChar: 'X',
      codeType: 'replace',
      hasParameter: false,
      replacementText: "'replaced'"
    })

    // Word boundary prevents \X from matching \XY, \XX, etc.
    expect(out).toMatch(/\/\\\\X\(\?!\[A-Za-z\]\)\/gi/)
  })
})

// The message window template's size mode, from its defaults with the given values
function sizeCode(values: Record<string, unknown>): string {
  const template = getTemplate('message-window-mod')
  if (template === undefined) throw new Error('message-window-mod is not registered')
  return template.generate({
    ...getTemplateDefaults('message-window-mod'),
    modType: 'size',
    ...values
  })
}

describe('message-system window size', () => {
  it('sets the window height it is given', () => {
    const out = sizeCode({ windowHeight: 300 })

    expect(out).toContain('    rect.width = 816;\n    rect.height = 300;\n')
  })

  it('sets the default height when none is given', () => {
    expect(sizeCode({ windowHeight: undefined })).toContain('    rect.height = 180;\n')
  })
})

describe('plugin-commands async callback', () => {
  it('uses per-interpreter pending state (not module-scope flag)', () => {
    const tpl = getTemplate('plugin-command-async')!
    const out = tpl.generate({
      commandName: 'LoadData',
      pluginName: 'MyPlugin',
      waitType: 'callback'
    })

    // The key/interpreter-based pattern should appear
    expect(out).toMatch(/_LoadDataPendingKey/)
    expect(out).toMatch(/interpreter\[_LoadDataPendingKey\]/)
    // Old module-scope pattern must NOT appear
    expect(out).not.toMatch(/^let _LoadDataPending = false/m)
  })
})

// The basic command's code as it runs, inside the plugin's strict-mode wrapper
function basicCommandCode(values: Record<string, unknown>): string {
  const template = getTemplate('plugin-command-basic')
  if (template === undefined) throw new Error('plugin-command-basic is not registered')
  return `'use strict';\n${template.generate(values)}`
}

describe('plugin-command-basic argument names', () => {
  const base = {
    commandName: 'Sample',
    pluginName: 'Sample',
    arg1Type: 'string',
    arg2Type: 'number'
  }

  it.each([
    ['x', 'x'],
    ['x', ' x '],
    ['args', 'y'],
    ['class', 'y'],
    ['y', 'let'],
    ['eval', 'y'],
    ['String', 'y'],
    ['y', 'Number'],
    ['JSON', 'y'],
    ['console', 'y'],
    ['params', 'y']
  ])('rejects the names %j and %j', (arg1Name, arg2Name) => {
    const verdict = validateTemplateValues('plugin-command-basic', { ...base, arg1Name, arg2Name })

    expect(verdict.valid).toBe(false)
  })

  it('accepts two other names, and their code compiles', () => {
    const values = { ...base, arg1Name: 'target', arg2Name: 'amount' }

    expect(validateTemplateValues('plugin-command-basic', values).valid).toBe(true)
    expect(compileCheck(basicCommandCode(values), 'plugin.js')).toBeNull()
  })

  it.each([
    ['x', 'x'],
    ['args', 'y'],
    ['class', 'y']
  ])('makes code that does not compile from the names %j and %j', (arg1Name, arg2Name) => {
    const code = basicCommandCode({ ...base, arg1Name, arg2Name })

    expect(compileCheck(code, 'plugin.js')).not.toBeNull()
  })
})
