import { describe, it, expect } from 'vitest'
import { ProjectParser } from '../src/main/services/projectParser'

describe('parseNoteTags', () => {
  it('parses tag with value', () => {
    expect(ProjectParser.parseNoteTags('<foo:bar>')).toEqual({ foo: 'bar' })
  })

  it('parses tag without value (defaults to true)', () => {
    expect(ProjectParser.parseNoteTags('<noValue>')).toEqual({ noValue: 'true' })
  })

  it('parses multiple tags', () => {
    const result = ProjectParser.parseNoteTags('<hp:100>\n<mp:50>\n<boss>')
    expect(result).toEqual({ hp: '100', mp: '50', boss: 'true' })
  })

  it('returns empty object for empty string', () => {
    expect(ProjectParser.parseNoteTags('')).toEqual({})
  })

  it('returns empty object for string with no tags', () => {
    expect(ProjectParser.parseNoteTags('just some text')).toEqual({})
  })

  it('handles tags with colons in value', () => {
    // The regex captures everything after the first colon until >
    expect(ProjectParser.parseNoteTags('<url:http://example.com>')).toEqual({
      url: 'http://example.com'
    })
  })

  it('handles tags on the same line', () => {
    expect(ProjectParser.parseNoteTags('<a:1><b:2>')).toEqual({ a: '1', b: '2' })
  })

  it('handles tags with spaces in value', () => {
    expect(ProjectParser.parseNoteTags('<name:Hello World>')).toEqual({
      name: 'Hello World'
    })
  })

  it('treats space-only tag names as valid (parser limitation)', () => {
    // Known limitation: the regex doesn't reject whitespace-only tag names
    expect(ProjectParser.parseNoteTags('< >')).toEqual({ ' ': 'true' })
    // No angle brackets at all — returns empty
    expect(ProjectParser.parseNoteTags('hello world')).toEqual({})
  })

  it('overwrites duplicate tags with last value', () => {
    const result = ProjectParser.parseNoteTags('<x:1>\n<x:2>')
    expect(result).toEqual({ x: '2' })
  })
})
