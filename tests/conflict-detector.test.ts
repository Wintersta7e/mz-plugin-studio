// Tests for conflict detector — override extraction
import { describe, it, expect } from 'vitest'
import { extractOverrides } from '../src/renderer/src/lib/conflict-detector'

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
    expect(result.filter((r) => r === 'Game_Player.prototype.update')).toHaveLength(1)
    expect(result.filter((r) => r === 'Scene_Map.prototype.createDisplayObjects')).toHaveLength(
      1
    )
    expect(result).toHaveLength(2)
  })
})
