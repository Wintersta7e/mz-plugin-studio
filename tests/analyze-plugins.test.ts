import { describe, it, expect } from 'vitest'
import {
  detectIIFEStyle,
  detectParamLoading,
  detectUseStrict,
  extractAliases,
  extractMethodOverrides,
  extractRegisterCommands,
  extractParamTypes,
  detectNoteTagPattern,
  detectNewClasses
} from '../tools/analyze-plugins'

// ── detectIIFEStyle ────────────────────────────────────────────────────────

describe('detectIIFEStyle', () => {
  it('detects arrow IIFE', () => {
    expect(detectIIFEStyle('(() => {\n  // code\n})();')).toBe('arrow')
  })

  it('detects arrow IIFE without spaces', () => {
    expect(detectIIFEStyle('(()=>{\ncode\n})();')).toBe('arrow')
  })

  it('detects function IIFE', () => {
    expect(detectIIFEStyle('(function() {\n  // code\n})();')).toBe('function')
  })

  it('detects function IIFE with space before parens', () => {
    expect(detectIIFEStyle('(function () { code })();')).toBe('function')
  })

  it('returns none for non-IIFE code', () => {
    expect(detectIIFEStyle('var x = 1;\nfunction setup() {}')).toBe('none')
  })

  it('prefers arrow when both patterns exist', () => {
    // Arrow is checked first
    expect(detectIIFEStyle('(() => {\n(function() {})();\n})();')).toBe('arrow')
  })
})

// ── detectParamLoading ─────────────────────────────────────────────────────

describe('detectParamLoading', () => {
  it('detects standard PluginManager.parameters', () => {
    const code = "const params = PluginManager.parameters('MyPlugin');"
    expect(detectParamLoading(code)).toBe('standard')
  })

  it('detects PluginManagerEx', () => {
    const code = 'const params = PluginManagerEx.createParameter(document.currentScript);'
    expect(detectParamLoading(code)).toBe('pluginmanagerex')
  })

  it('prefers PluginManagerEx when both present', () => {
    const code = `
      const params = PluginManagerEx.createParameter(document.currentScript);
      const old = PluginManager.parameters('name');
    `
    expect(detectParamLoading(code)).toBe('pluginmanagerex')
  })

  it('returns none when no parameter loading', () => {
    expect(detectParamLoading('var x = 1;')).toBe('none')
  })
})

// ── detectUseStrict ────────────────────────────────────────────────────────

describe('detectUseStrict', () => {
  it('detects single-quoted use strict', () => {
    expect(detectUseStrict("'use strict';")).toBe(true)
  })

  it('detects double-quoted use strict', () => {
    expect(detectUseStrict('"use strict";')).toBe(true)
  })

  it('returns false when absent', () => {
    expect(detectUseStrict('var x = 1;')).toBe(false)
  })
})

// ── extractAliases ─────────────────────────────────────────────────────────

describe('extractAliases', () => {
  it('finds const alias', () => {
    const code = 'const _Game_Map_setup = Game_Map.prototype.setup;'
    const result = extractAliases(code)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ style: 'const', className: 'Game_Map', methodName: 'setup' })
  })

  it('finds var alias', () => {
    const code = 'var _Scene_Boot_start = Scene_Boot.prototype.start;'
    const result = extractAliases(code)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ style: 'var', className: 'Scene_Boot', methodName: 'start' })
  })

  it('finds let alias', () => {
    const code = 'let _Window_Base_update = Window_Base.prototype.update;'
    const result = extractAliases(code)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ style: 'let', className: 'Window_Base', methodName: 'update' })
  })

  it('finds multiple aliases', () => {
    const code = `
      const _Game_System_initialize = Game_System.prototype.initialize;
      const _Game_System_onAfterLoad = Game_System.prototype.onAfterLoad;
      const _Scene_Map_update = Scene_Map.prototype.update;
    `
    expect(extractAliases(code)).toHaveLength(3)
  })

  it('ignores non-alias assignments', () => {
    const code = 'const x = Game_Map.prototype.setup;' // no underscore prefix
    expect(extractAliases(code)).toHaveLength(0)
  })

  it('returns empty for no aliases', () => {
    expect(extractAliases('var x = 1;')).toHaveLength(0)
  })
})

// ── extractMethodOverrides ─────────────────────────────────────────────────

describe('extractMethodOverrides', () => {
  it('finds prototype method override', () => {
    const code = 'Game_Map.prototype.setup = function() {'
    const result = extractMethodOverrides(code)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ className: 'Game_Map', methodName: 'setup' })
  })

  it('finds multiple overrides', () => {
    const code = `
      Scene_Map.prototype.update = function() { };
      Scene_Map.prototype.start = function() { };
    `
    expect(extractMethodOverrides(code)).toHaveLength(2)
  })

  it('captures single-letter class names (filtered later in aggregation)', () => {
    const code = 'n.prototype.apply = function() {'
    const result = extractMethodOverrides(code)
    // Single-letter detected but uppercase check fails (lowercase n)
    expect(result).toHaveLength(0)
  })

  it('returns empty for no overrides', () => {
    expect(extractMethodOverrides('var x = 1;')).toHaveLength(0)
  })
})

// ── extractRegisterCommands ────────────────────────────────────────────────

describe('extractRegisterCommands', () => {
  it('finds PluginManager.registerCommand', () => {
    const code = "PluginManager.registerCommand(pluginName, 'showDialog', args => {});"
    expect(extractRegisterCommands(code)).toEqual(['showDialog'])
  })

  it('finds PluginManagerEx.registerCommand', () => {
    const code = 'PluginManagerEx.registerCommand(document.currentScript, "doThing", args => {});'
    expect(extractRegisterCommands(code)).toEqual(['doThing'])
  })

  it('finds multiple commands', () => {
    const code = `
      PluginManager.registerCommand(name, 'cmd1', () => {});
      PluginManager.registerCommand(name, 'cmd2', () => {});
    `
    expect(extractRegisterCommands(code)).toEqual(['cmd1', 'cmd2'])
  })

  it('returns empty for no commands', () => {
    expect(extractRegisterCommands('var x = 1;')).toHaveLength(0)
  })
})

// ── extractParamTypes ──────────────────────────────────────────────────────

describe('extractParamTypes', () => {
  it('extracts @type declarations', () => {
    const code = `
      * @type number
      * @type boolean
      * @type select
    `
    expect(extractParamTypes(code)).toEqual(['number', 'boolean', 'select'])
  })

  it('lowercases types', () => {
    const code = '* @type Number'
    expect(extractParamTypes(code)).toEqual(['number'])
  })

  it('handles struct types', () => {
    const code = '* @type struct<CustomStruct>'
    // Matches 'struct' from @type struct
    expect(extractParamTypes(code)).toEqual(['struct'])
  })

  it('returns empty for no types', () => {
    expect(extractParamTypes('var x = 1;')).toHaveLength(0)
  })
})

// ── detectNoteTagPattern ───────────────────────────────────────────────────

describe('detectNoteTagPattern', () => {
  it('detects meta bracket access', () => {
    const code = "const val = event.meta['CustomTag'];"
    expect(detectNoteTagPattern(code)).toContain('meta_bracket')
  })

  it('detects meta property access', () => {
    const code = 'const val = event.meta.CustomTag;'
    expect(detectNoteTagPattern(code)).toContain('meta_property')
  })

  it('detects note regex pattern', () => {
    const code = 'const match = obj.note.match(/<CustomTag:(\\d+)>/);'
    expect(detectNoteTagPattern(code)).toContain('note_regex')
  })

  it('detects multiple patterns', () => {
    const code = `
      event.meta['tag1'];
      event.meta.tag2;
      obj.note.match(/<tag3>/);
    `
    const patterns = detectNoteTagPattern(code)
    expect(patterns).toHaveLength(3)
  })

  it('returns empty for no note tag usage', () => {
    expect(detectNoteTagPattern('var x = 1;')).toHaveLength(0)
  })

  it('ignores meta.length (not a tag access)', () => {
    const code = 'if (obj.meta.length > 0) {}'
    // meta.length is excluded by the regex
    expect(detectNoteTagPattern(code)).not.toContain('meta_property')
  })
})

// ── detectNewClasses ───────────────────────────────────────────────────────

describe('detectNewClasses', () => {
  it('detects function constructor class', () => {
    const code = 'function Window_Custom() { this.initialize(...arguments); }'
    const result = detectNewClasses(code)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ name: 'Window_Custom', style: 'function' })
  })

  it('detects ES6 class extends', () => {
    const code = 'class Scene_Custom extends Scene_Base {'
    const result = detectNewClasses(code)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ name: 'Scene_Custom', style: 'es6_extends' })
  })

  it('detects Game_, Sprite_, Spriteset_ prefixed classes', () => {
    const code = `
      function Game_DateSystem() {}
      function Sprite_HUD() {}
      function Spriteset_Custom() {}
    `
    const result = detectNewClasses(code)
    expect(result).toHaveLength(3)
  })

  it('does not duplicate classes found in both styles', () => {
    const code = `
      function Window_Custom() {}
      class Window_Custom extends Window_Base {}
    `
    // Function constructor found first, ES6 skipped (same name)
    const result = detectNewClasses(code)
    expect(result).toHaveLength(1)
  })

  it('ignores non-MZ-prefixed classes', () => {
    const code = 'function MyHelper() {}'
    expect(detectNewClasses(code)).toHaveLength(0)
  })

  it('returns empty for no class definitions', () => {
    expect(detectNewClasses('var x = 1;')).toHaveLength(0)
  })
})
