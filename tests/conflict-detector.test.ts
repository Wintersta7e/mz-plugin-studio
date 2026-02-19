// Tests for conflict detector — override extraction + conflict detection
import { describe, it, expect } from 'vitest'
import { extractOverrides, detectConflicts } from '../src/renderer/src/lib/conflict-detector'
import type { ConflictReport } from '../src/renderer/src/lib/conflict-detector'

describe('extractOverrides', () => {
  // --- Basic extraction ---

  it('extracts standard prototype assignment', () => {
    const code = `Game_Actor.prototype.setup = function(actorId) { /* ... */ };`
    expect(extractOverrides(code)).toEqual(['Game_Actor.prototype.setup'])
  })

  it('extracts alias pattern with const', () => {
    const code = `const _alias = Game_Map.prototype.update;`
    expect(extractOverrides(code)).toEqual(['Game_Map.prototype.update'])
  })

  it('extracts arrow function assignment', () => {
    const code = `Scene_Map.prototype.update = () => { /* ... */ };`
    expect(extractOverrides(code)).toEqual(['Scene_Map.prototype.update'])
  })

  it('extracts alias pattern with var', () => {
    const code = `var _old_update = Game_Map.prototype.update;`
    expect(extractOverrides(code)).toEqual(['Game_Map.prototype.update'])
  })

  it('extracts alias pattern with let', () => {
    const code = `let _old = Scene_Battle.prototype.start;`
    expect(extractOverrides(code)).toEqual(['Scene_Battle.prototype.start'])
  })

  // --- Multiple overrides ---

  it('extracts multiple overrides from one plugin', () => {
    const code = `
      Game_Actor.prototype.setup = function(actorId) {};
      const _alias = Game_Map.prototype.update;
      Game_Map.prototype.update = function() { _alias.call(this); };
    `
    const result = extractOverrides(code)
    expect(result).toContain('Game_Actor.prototype.setup')
    expect(result).toContain('Game_Map.prototype.update')
  })

  it('deduplicates when same method appears as alias and reassignment', () => {
    const code = `
      const _old = Game_Map.prototype.update;
      Game_Map.prototype.update = function() { _old.call(this); };
    `
    const result = extractOverrides(code)
    expect(result).toEqual(['Game_Map.prototype.update'])
  })

  // --- Empty / no matches ---

  it('returns empty array for empty string', () => {
    expect(extractOverrides('')).toEqual([])
  })

  it('returns empty array for code with no overrides', () => {
    const code = `
      var x = 42;
      function doSomething() { return x + 1; }
      console.log("hello");
    `
    expect(extractOverrides(code)).toEqual([])
  })

  // --- Comment/string filtering ---

  it('ignores prototype refs in single-line comments', () => {
    const code = `
      // Game_Actor.prototype.setup = function() {};
      var x = 1;
    `
    expect(extractOverrides(code)).toEqual([])
  })

  it('ignores prototype refs in block comments', () => {
    const code = `
      /* Game_Actor.prototype.setup = function() {}; */
      var x = 1;
    `
    expect(extractOverrides(code)).toEqual([])
  })

  it('ignores prototype refs in double-quoted strings', () => {
    const code = `
      var desc = "Game_Actor.prototype.setup = function() {};";
      var x = 1;
    `
    expect(extractOverrides(code)).toEqual([])
  })

  it('ignores prototype refs in template literals', () => {
    const code = [
      'var desc = `Game_Actor.prototype.setup = function() {};`;',
      'var x = 1;'
    ].join('\n')
    expect(extractOverrides(code)).toEqual([])
  })

  // --- Whitespace handling ---

  it('handles multiple spaces around =', () => {
    const code = `Game_Actor.prototype.setup   =   function(actorId) {};`
    expect(extractOverrides(code)).toEqual(['Game_Actor.prototype.setup'])
  })

  it('handles tab characters around =', () => {
    const code = `Game_Actor.prototype.setup\t=\tfunction(actorId) {};`
    expect(extractOverrides(code)).toEqual(['Game_Actor.prototype.setup'])
  })

  // --- Edge cases ---

  it('captures only first two parts of nested property chain', () => {
    const code = `Game_Map.prototype.tileset.name = "test";`
    expect(extractOverrides(code)).toContain('Game_Map.prototype.tileset')
  })

  it('handles realistic IIFE-wrapped plugin with alias + reassignment', () => {
    const code = `
      (function() {
        'use strict';

        // Save a reference to the original method
        const _Game_Player_update = Game_Player.prototype.update;

        Game_Player.prototype.update = function(sceneActive) {
          _Game_Player_update.call(this, sceneActive);
          this.updateCustomBehavior();
        };

        const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
        Scene_Map.prototype.createDisplayObjects = function() {
          _Scene_Map_createDisplayObjects.call(this);
          this.createCustomSprite();
        };
      })();
    `
    const result = extractOverrides(code)
    expect(result).toContain('Game_Player.prototype.update')
    expect(result).toContain('Scene_Map.prototype.createDisplayObjects')
    // Deduplication: each should appear only once
    expect(result.filter((r: string) => r === 'Game_Player.prototype.update')).toHaveLength(1)
    expect(result.filter((r: string) => r === 'Scene_Map.prototype.createDisplayObjects')).toHaveLength(
      1
    )
    expect(result).toHaveLength(2)
  })
})

// --- detectConflicts tests ---

function pluginWithOverrides(name: string, overrides: string[]) {
  return { filename: name + '.js', name, overrides }
}

const mockMzClasses: Record<string, { popularity?: number }> = {
  Game_Map: { popularity: 29 },
  Scene_Battle: { popularity: 15 },
  Game_Actor: { popularity: 22 },
  Scene_Map: { popularity: 53 },
  Sprite_Character: { popularity: 5 },
  Game_Temp: { popularity: 3 },
}

describe('detectConflicts', () => {
  // --- Core detection ---

  it('returns clean report when no plugins have overrides', () => {
    const headers = [
      pluginWithOverrides('PluginA', []),
      pluginWithOverrides('PluginB', []),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.conflicts).toEqual([])
    expect(report.totalOverrides).toBe(0)
    expect(report.health).toBe('clean')
  })

  it('returns clean report for empty headers array', () => {
    const report = detectConflicts([], mockMzClasses)
    expect(report.conflicts).toEqual([])
    expect(report.totalOverrides).toBe(0)
    expect(report.health).toBe('clean')
  })

  it('returns clean when no methods overlap', () => {
    const headers = [
      pluginWithOverrides('PluginA', ['Game_Map.prototype.setup']),
      pluginWithOverrides('PluginB', ['Game_Actor.prototype.update']),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.conflicts).toEqual([])
    expect(report.totalOverrides).toBe(2)
    expect(report.health).toBe('clean')
  })

  it('single plugin cannot self-conflict', () => {
    const headers = [
      pluginWithOverrides('PluginA', [
        'Game_Map.prototype.setup',
        'Game_Map.prototype.update',
        'Game_Actor.prototype.setup',
      ]),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.conflicts).toEqual([])
    expect(report.totalOverrides).toBe(3)
    expect(report.health).toBe('clean')
  })

  it('detects simple two-plugin conflict', () => {
    const headers = [
      pluginWithOverrides('PluginA', ['Game_Map.prototype.update']),
      pluginWithOverrides('PluginB', ['Game_Map.prototype.update']),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.conflicts).toHaveLength(1)
    expect(report.conflicts[0].method).toBe('Game_Map.prototype.update')
    expect(report.conflicts[0].plugins).toEqual(['PluginA', 'PluginB'])
    expect(report.conflicts[0].className).toBe('Game_Map')
    expect(report.conflicts[0].methodName).toBe('update')
  })

  it('detects three-plugin conflict on same method', () => {
    const headers = [
      pluginWithOverrides('Alpha', ['Scene_Map.prototype.update']),
      pluginWithOverrides('Beta', ['Scene_Map.prototype.update']),
      pluginWithOverrides('Gamma', ['Scene_Map.prototype.update']),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.conflicts).toHaveLength(1)
    expect(report.conflicts[0].plugins).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  it('detects multiple independent conflicts', () => {
    const headers = [
      pluginWithOverrides('PluginA', ['Game_Map.prototype.update', 'Game_Actor.prototype.setup']),
      pluginWithOverrides('PluginB', ['Game_Map.prototype.update', 'Game_Actor.prototype.setup']),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.conflicts).toHaveLength(2)
  })

  it('preserves load order in plugin list (not alphabetical)', () => {
    const headers = [
      pluginWithOverrides('Zebra', ['Game_Map.prototype.update']),
      pluginWithOverrides('Alpha', ['Game_Map.prototype.update']),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.conflicts[0].plugins).toEqual(['Zebra', 'Alpha'])
  })

  it('counts totalOverrides accurately across all plugins', () => {
    const headers = [
      pluginWithOverrides('PluginA', ['Game_Map.prototype.setup', 'Game_Map.prototype.update']),
      pluginWithOverrides('PluginB', ['Game_Actor.prototype.setup']),
      pluginWithOverrides('PluginC', ['Scene_Map.prototype.start', 'Scene_Map.prototype.update', 'Scene_Map.prototype.stop']),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.totalOverrides).toBe(6)
  })

  // --- Severity ---

  it('assigns warning severity for popular class (popularity >= 10)', () => {
    const headers = [
      pluginWithOverrides('A', ['Game_Map.prototype.update']),
      pluginWithOverrides('B', ['Game_Map.prototype.update']),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.conflicts[0].severity).toBe('warning')
  })

  it('assigns info severity for unpopular class (popularity < 10)', () => {
    const headers = [
      pluginWithOverrides('A', ['Sprite_Character.prototype.update']),
      pluginWithOverrides('B', ['Sprite_Character.prototype.update']),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.conflicts[0].severity).toBe('info')
  })

  it('assigns info severity for unknown class (not in mzClasses)', () => {
    const headers = [
      pluginWithOverrides('A', ['MyCustomClass.prototype.init']),
      pluginWithOverrides('B', ['MyCustomClass.prototype.init']),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.conflicts[0].severity).toBe('info')
  })

  it('assigns all info severity when mzClasses is empty', () => {
    const headers = [
      pluginWithOverrides('A', ['Game_Map.prototype.update']),
      pluginWithOverrides('B', ['Game_Map.prototype.update']),
    ]
    const report = detectConflicts(headers, {})
    expect(report.conflicts[0].severity).toBe('info')
  })

  it('sorts warnings before info', () => {
    const headers = [
      pluginWithOverrides('A', ['Sprite_Character.prototype.update', 'Game_Map.prototype.update']),
      pluginWithOverrides('B', ['Sprite_Character.prototype.update', 'Game_Map.prototype.update']),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.conflicts).toHaveLength(2)
    expect(report.conflicts[0].severity).toBe('warning')
    expect(report.conflicts[1].severity).toBe('info')
  })

  it('sorts alphabetically within same severity', () => {
    const headers = [
      pluginWithOverrides('A', [
        'Scene_Battle.prototype.start',
        'Game_Actor.prototype.setup',
        'Game_Map.prototype.update',
      ]),
      pluginWithOverrides('B', [
        'Scene_Battle.prototype.start',
        'Game_Actor.prototype.setup',
        'Game_Map.prototype.update',
      ]),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    // All three are warning (popularity >= 10)
    expect(report.conflicts.map((c) => c.method)).toEqual([
      'Game_Actor.prototype.setup',
      'Game_Map.prototype.update',
      'Scene_Battle.prototype.start',
    ])
  })

  // --- Edge cases ---

  it('handles plugin with empty name string', () => {
    const headers = [
      pluginWithOverrides('', ['Game_Map.prototype.update']),
      pluginWithOverrides('PluginB', ['Game_Map.prototype.update']),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.conflicts).toHaveLength(1)
    expect(report.conflicts[0].plugins).toEqual(['', 'PluginB'])
  })

  it('health is clean when 0 conflicts', () => {
    const report = detectConflicts([], mockMzClasses)
    expect(report.health).toBe('clean')
  })

  it('health is conflicts when any conflicts exist', () => {
    const headers = [
      pluginWithOverrides('A', ['Game_Map.prototype.update']),
      pluginWithOverrides('B', ['Game_Map.prototype.update']),
    ]
    const report = detectConflicts(headers, mockMzClasses)
    expect(report.health).toBe('conflicts')
  })
})
