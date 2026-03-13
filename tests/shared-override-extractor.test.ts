import { describe, it, expect } from 'vitest'
import { extractOverrides } from '../src/shared/override-extractor'

describe('extractOverrides (shared module)', () => {
  it('extracts direct prototype assignments', () => {
    const code = `Game_Actor.prototype.setup = function(actorId) { };`
    expect(extractOverrides(code)).toContain('Game_Actor.prototype.setup')
  })

  it('extracts alias captures', () => {
    const code = `const _alias = Scene_Map.prototype.update;`
    expect(extractOverrides(code)).toContain('Scene_Map.prototype.update')
  })

  it('deduplicates results', () => {
    const code = `
      const _alias = Game_Map.prototype.setup;
      Game_Map.prototype.setup = function() { _alias.call(this); };
    `
    const result = extractOverrides(code)
    expect(result.filter((r) => r === 'Game_Map.prototype.setup')).toHaveLength(1)
  })

  it('ignores overrides inside comments', () => {
    const code = `
      // Game_Actor.prototype.setup = function() {};
      /* Game_Party.prototype.members = function() {}; */
    `
    expect(extractOverrides(code)).toEqual([])
  })

  it('ignores overrides inside string literals', () => {
    const code = `
      const s = "Game_Actor.prototype.setup = function() {}";
      const t = 'Game_Party.prototype.members = function() {}';
    `
    expect(extractOverrides(code)).toEqual([])
  })

  it('does not match == or === as assignments', () => {
    const code = `if (Game_Actor.prototype.setup === undefined) {}`
    expect(extractOverrides(code)).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(extractOverrides('')).toEqual([])
  })

  it('handles multiple classes', () => {
    const code = `
      Game_Actor.prototype.setup = function() {};
      Game_Party.prototype.members = function() {};
      Scene_Map.prototype.update = function() {};
    `
    const result = extractOverrides(code)
    expect(result).toHaveLength(3)
    expect(result).toContain('Game_Actor.prototype.setup')
    expect(result).toContain('Game_Party.prototype.members')
    expect(result).toContain('Scene_Map.prototype.update')
  })

  it('handles let and var alias captures', () => {
    const code = `
      let _a = Game_Actor.prototype.setup;
      var _b = Game_Party.prototype.members;
    `
    const result = extractOverrides(code)
    expect(result).toContain('Game_Actor.prototype.setup')
    expect(result).toContain('Game_Party.prototype.members')
  })

  it('handles chained property access after prototype method', () => {
    const code = `Game_Map.prototype.tileset.name = 'test';`
    const result = extractOverrides(code)
    expect(result).toContain('Game_Map.prototype.tileset')
  })
})
