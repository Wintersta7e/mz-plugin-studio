// Parse time of the custom-code marker patterns on a long run of spaces after the marker,
// and of help text and tag values on long runs of spaces or blank lines.
import { describe, it, expect } from 'vitest'
import { PluginParser, matchHelp, stripTrailingStar } from '../../src/main/services/pluginParser'

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
  ['tag', (size) => '/*:\n * @param p\n * @desc a' + ' '.repeat(size) + 'b\n */\n']
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

const oldHelp = (header: string): string | undefined =>
  header.match(/@help\s*([\s\S]*?)(?=\n\s*\*\s*@[a-z]|\n\s*\*\/)/i)?.[1]
const oldStrip = (value: string): string => value.replace(/\s*\*?\s*$/, '')

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
})
