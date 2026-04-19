// Regression tests for the six MZ template bug fixes in session 30.
// Each test validates the GENERATED output string produced by a template's
// `generate()` function.

import { describe, it, expect, vi } from 'vitest'

// Mock electron-log/renderer before template files (which import it transitively)
vi.mock('electron-log/renderer', () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

// Side-effect imports register each template into the shared registry
import '../src/renderer/src/lib/generator/templates/method-alias'
import '../src/renderer/src/lib/generator/templates/save-load'
import '../src/renderer/src/lib/generator/templates/input-handler'
import '../src/renderer/src/lib/generator/templates/battle-system'
import '../src/renderer/src/lib/generator/templates/plugin-commands'
import '../src/renderer/src/lib/generator/templates/message-system'

import { getTemplate } from '../src/renderer/src/lib/generator/templates/index'

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
