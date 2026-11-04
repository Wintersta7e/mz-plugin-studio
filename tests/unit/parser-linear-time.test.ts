// Parse time of the custom-code marker patterns on a long run of spaces after the marker,
// and of help text and tag values on long runs of spaces or blank lines.
import { describe, it, expect } from 'vitest'
import {
  PluginParser,
  joinStarLines,
  matchHelp,
  matchPlugindesc,
  matchScriptName,
  stripTrailingStar
} from '../../src/main/services/pluginParser'

const BOUND_MS = 250

const HEADER = '/*:\n * @target MZ\n * @plugindesc Marker timing\n */\n'
const PADDING = ' '.repeat(102_400)

function timeParse(marker: string): number {
  const content = HEADER + marker + PADDING + 'x;\n'
  const start = performance.now()
  PluginParser.parsePlugin(content)
  const ms = performance.now() - start
  console.log(`marker "${marker}": ${Math.round(ms)} ms`)
  return ms
}

describe('parse time after a custom-code marker', () => {
  it.each(['// custom', '// main', '// your', '// implementation', '// ===', '// ---'])(
    '%s finishes within the bound',
    (marker) => {
      expect(timeParse(marker)).toBeLessThan(BOUND_MS)
    }
  )
})

const RAMP = [1, 2, 4, 8, 16, 32, 64, 100].map((k) => k * 1024)

const LEGS: [string, (size: number) => string][] = [
  ['help', (size) => '/*:\n * @help' + '\n '.repeat(size / 2) + '\n */\n'],
  [
    'language help',
    (size) => '/*:\n * @plugindesc x\n */\n/*:ja\n * @help' + '\n '.repeat(size / 2) + '\n */\n'
  ],
  ['asset', (size) => '/*:\n * @requiredAssets a' + ' '.repeat(size) + 'b\n */\n'],
  ['param name', (size) => '/*:\n * @param a' + ' '.repeat(size) + 'b\n */\n'],
  ['parent', (size) => '/*:\n * @param p\n * @parent a' + ' '.repeat(size) + 'b\n */\n'],
  ['arg name', (size) => '/*:\n * @command c\n * @arg a' + ' '.repeat(size) + 'b\n */\n'],
  ['tag', (size) => '/*:\n * @param p\n * @desc a' + ' '.repeat(size) + 'b\n */\n'],
  ['plugindesc', (size) => '/*:\n * @plugindesc x' + '\n'.repeat(size) + 'y\n */\n'],
  [
    'language plugindesc',
    (size) => '/*:\n * @plugindesc x\n */\n/*:ja\n * @plugindesc x' + '\n'.repeat(size) + 'y\n */\n'
  ],
  ['word run', (size) => "/*:\n * @plugindesc x\n */\nconst D = '" + 'a'.repeat(size) + "';\n"]
]

describe('parse time of help text and tag values', () => {
  it.each(LEGS)('%s ramp stays within the bound', (leg, input) => {
    for (const size of RAMP) {
      const content = input(size)
      const start = performance.now()
      PluginParser.parsePlugin(content)
      const elapsed = performance.now() - start
      console.log(`${leg} ramp: ${size} chars ${Math.round(elapsed)} ms`)

      expect(elapsed, `${size} chars`).toBeLessThan(BOUND_MS)
    }
  })
})

/** Every string of up to `maxLen` pieces from `alphabet`, the empty string included. */
function* strings(alphabet: string[], maxLen: number): Generator<string> {
  let level = ['']
  yield ''
  for (let len = 1; len <= maxLen; len++) {
    const next: string[] = []
    for (const prefix of level) {
      for (const piece of alphabet) {
        next.push(prefix + piece)
        yield prefix + piece
      }
    }
    level = next
  }
}

function checkEquivalence<T>(
  name: string,
  inputs: Iterable<string>,
  oracle: (s: string) => T,
  actual: (s: string) => T
): void {
  let count = 0
  const mismatches: string[] = []
  for (const input of inputs) {
    count++
    const expected = oracle(input)
    const got = actual(input)
    if (expected !== got) {
      mismatches.push(
        `${JSON.stringify(input)}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`
      )
    }
  }
  console.log(`equivalence ${name}: inputs ${count}, mismatches ${mismatches.length}`)
  for (const line of mismatches.slice(0, 5)) console.log(`  ${line}`)

  expect(count).toBeGreaterThan(0)
  expect(mismatches.length).toBe(0)
}

// Help and the description end before a line that starts a tag (same line start as the tag
// itself) or ends the comment. Help with no end after it (written last in a block) runs to the
// end of the header instead of reading as missing.
const LINE = String.raw`(?<![^\r\n])[^\S\r\n]*(?:\*[^\S\r\n]*)?`
const oldHelp = (header: string): string | undefined =>
  header.match(
    new RegExp(String.raw`${LINE}@help\s*([\s\S]*?)(?=\n(?:${LINE}@[a-z]|[^\S\r\n]*\*\/))`, 'i')
  )?.[1] ?? header.match(new RegExp(String.raw`${LINE}@help\s*([\s\S]*)$`, 'i'))?.[1]
const oldStrip = (value: string): string => value.replace(/\s*\*?\s*$/, '')
const oldPlugindesc = (header: string): string | undefined =>
  header.match(
    new RegExp(
      String.raw`${LINE}@plugindesc(?!\S)[^\S\r\n]*(.*?)(?=\n(?:${LINE}@|[^\S\r\n]*\*\/)|$)`,
      's'
    )
  )?.[1]
const oldJoin = (text: string): string => text.replace(/\n\s*\*\s*/g, ' ')
const oldScriptName = (content: string): string | undefined =>
  content.match(/\*\s+@plugindesc[\s\S]*?(\w+)\.js/i)?.[1]

describe('linear-time help and tag readers match the regular expressions they replace', () => {
  it('help text, any header', () => {
    checkEquivalence(
      'help',
      strings(['\n', ' ', '*', '/', '@', 'a', '@help', '@HeLp', ' '], 5),
      oldHelp,
      matchHelp
    )
  })

  it('help text after a help tag', () => {
    const after = (s: string): string => ' * @help' + s
    checkEquivalence(
      'help after tag',
      strings(['\n', ' ', '*', '/', '@', 'a', '\t'], 6),
      (s) => oldHelp(after(s)),
      (s) => matchHelp(after(s))
    )
  })

  it('trailing star and spaces', () => {
    checkEquivalence(
      'trailing star',
      strings([' ', '\t', '*', 'a', ' ', '﻿', '/'], 6),
      oldStrip,
      stripTrailingStar
    )
  })

  it('description, any header', () => {
    checkEquivalence(
      'plugindesc',
      strings(['\n', ' ', '*', '/', '@', 'a', '@plugindesc', '@PluginDesc'], 5),
      oldPlugindesc,
      matchPlugindesc
    )
  })

  it('description after a plugindesc tag', () => {
    const after = (s: string): string => ' * @plugindesc' + s
    checkEquivalence(
      'plugindesc after tag',
      strings(['\n', ' ', '*', '/', '@', 'a', '\t'], 6),
      (s) => oldPlugindesc(after(s)),
      (s) => matchPlugindesc(after(s))
    )
  })

  it('description lines joined', () => {
    checkEquivalence(
      'description join',
      strings(['\n', ' ', '*', 'a', '\t', ' '], 6),
      oldJoin,
      joinStarLines
    )
  })

  it('script name after a plugindesc tag', () => {
    checkEquivalence(
      'script name',
      strings(['* @plugindesc', '*', ' ', 'a', '_', '.js', '.', '\n'], 5),
      oldScriptName,
      matchScriptName
    )
  })
})
