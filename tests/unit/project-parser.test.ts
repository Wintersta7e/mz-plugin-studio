import { describe, it, expect } from 'vitest'
import { ProjectParser } from '../../src/main/services/projectParser'

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

  // Each way a note tag can be written, read as the pattern reads it today.
  it.each<[string, string, Record<string, string>]>([
    ['a name alone', '<a>', { a: 'true' }],
    ['a name and an empty value', '<a:>', { a: 'true' }],
    ['a name and a value', '<a:b>', { a: 'b' }],
    ['a value holding a colon', '<a:b:c>', { a: 'b:c' }],
    ['the same tag twice in a row', '<a:b><a:b>', { a: 'b' }],
    ['a tag never closed', '<a:b', {}],
    ['a value without a name', '<:b>', {}],
    ['a space as the name', '< >', { ' ': 'true' }]
  ])('reads %s', (_shape, note, tags) => {
    expect(ProjectParser.parseNoteTags(note)).toStrictEqual(tags)
  })
})
