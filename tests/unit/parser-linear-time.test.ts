// Parse time of the custom-code marker patterns on a long run of spaces after the marker,
// of help text and tag values on long runs of spaces or blank lines, of a wrapper close
// followed by a long run of spaces, and of a project note tag left open.
import { describe, it, expect } from 'vitest'
import {
  PluginParser,
  joinStarLines,
  matchHelp,
  matchPlugindesc,
  matchScriptName,
  stripTrailingStar
} from '../../src/main/services/pluginParser'
import { ProjectParser } from '../../src/main/services/projectParser'

const BOUND_MS = 250

const HEADER = '/*:\n * @target MZ\n * @plugindesc Marker timing\n */\n'
const PADDING = ' '.repeat(102_400)

function timeParse(marker: string): number {
  const content = HEADER + marker + PADDING + 'x;\n'
  const start = performance.now()
  PluginParser.parsePlugin(content)
  const ms = performance.now() - start
  process.stdout.write(`marker "${marker}": ${String(Math.round(ms))} ms\n`)
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

// Tags whose value runs to the line break; the legs leave none after the spaces
const TAG_VALUE_TAGS = ['author', 'target', 'url', 'base', 'orderAfter', 'orderBefore', 'noteParam']

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
  ['word run', (size) => "/*:\n * @plugindesc x\n */\nconst D = '" + 'a'.repeat(size) + "';\n"],
  [
    'wrapper close',
    (size) => '/*:\n * @plugindesc x\n */\n(() => {\n})()' + ' '.repeat(size) + 'x'
  ],
  ...TAG_VALUE_TAGS.map((tag): [string, (size: number) => string] => [
    tag,
    (size) => `/*:\n * @${tag}` + ' '.repeat(size) + 'x*/'
  ])
]

function expectRampWithinBound(
  leg: string,
  input: (size: number) => string,
  parse: (content: string) => unknown
): void {
  for (const size of RAMP) {
    const content = input(size)
    const start = performance.now()
    parse(content)
    const elapsed = performance.now() - start
    process.stdout.write(`${leg} ramp: ${String(size)} chars ${String(Math.round(elapsed))} ms\n`)

    expect(elapsed, `${String(size)} chars`).toBeLessThan(BOUND_MS)
  }
}

describe('parse time of help text and tag values', () => {
  it.each(LEGS)('%s ramp stays within the bound', (leg, input) => {
    expect.hasAssertions()

    expectRampWithinBound(leg, input, (content) => PluginParser.parsePlugin(content))
  })
})

describe('parse time of project note tags', () => {
  it('note tag left open ramp stays within the bound', () => {
    expect.hasAssertions()

    expectRampWithinBound(
      'note tag',
      (size) => '<' + 'a'.repeat(size),
      (note) => ProjectParser.parseNoteTags(note)
    )
  })
})

/**
Every string of up to `maxLength` pieces from `alphabet`, the empty string included.
*/
function* strings(alphabet: string[], maxLength: number): Generator<string> {
  let level = ['']
  yield ''
  for (let length = 1; length <= maxLength; length++) {
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
  process.stdout.write(
    `equivalence ${name}: inputs ${String(count)}, mismatches ${String(mismatches.length)}\n`
  )
  for (const line of mismatches.slice(0, 5)) process.stdout.write(`  ${line}\n`)

  expect(count).toBeGreaterThan(0)
  expect(mismatches).toHaveLength(0)
}

// Help and the description end before a line that starts a tag (same line start as the tag
// itself) or ends the comment. Help with no end after it (written last in a block) runs to the
// end of the header instead of reading as missing.
const LINE = String.raw`(?<![^\r\n])[^\S\r\n]*(?:\*[^\S\r\n]*)?`
// The earlier pattern, compiled from its source text: kept only as the reference and run on
// inputs of at most a few characters, where its slow backtracking costs nothing.
const previousPattern = (source: string, flags = ''): RegExp => new RegExp(source, flags)
const oldHelp = (header: string): string | undefined =>
  previousPattern(
    String.raw`${LINE}@help\s*([\s\S]*?)(?=\n(?:${LINE}@[a-z]|[^\S\r\n]*\*\/))`,
    'i'
  ).exec(header)?.[1] ??
  previousPattern(String.raw`${LINE}@help\s*([\s\S]*)$`, 'i').exec(header)?.[1]
const oldStrip = (value: string): string =>
  value.replace(previousPattern(String.raw`\s*\*?\s*$`), '')
const oldPlugindesc = (header: string): string | undefined =>
  previousPattern(
    String.raw`${LINE}@plugindesc(?!\S)[^\S\r\n]*(.*?)(?=\n(?:${LINE}@|[^\S\r\n]*\*\/)|$)`,
    's'
  ).exec(header)?.[1]
const oldJoin = (text: string): string => text.replaceAll(/\n\s*\*\s*/g, ' ')
const oldScriptName = (content: string): string | undefined =>
  previousPattern(String.raw`\*\s+@plugindesc[\s\S]*?(\w+)\.js`, 'i').exec(content)?.[1]
const afterHelpTag = (s: string): string => ' * @help' + s
const afterPlugindescTag = (s: string): string => ' * @plugindesc' + s
const oldWrapperClose = (code: string): number | undefined =>
  previousPattern(String.raw`\}\s*\)\s*\(\s*\)\s*;?\s*$`).exec(code)?.index
const oldNoteTags = (note: string): string => {
  const tags: Record<string, string> = {}
  const matches = note.matchAll(previousPattern('<([^:>]+):?([^>]*)>', 'g'))
  for (const [, name = '', value = ''] of matches) {
    tags[name] = value === '' ? 'true' : value
  }
  return JSON.stringify(tags)
}
// Tag values run to the line break: built from the tag as the parser built them. `\u{2028}` is
// whitespace for the spaces before the value but ends the value, like `\r`.
const oldTagValue = (tag: string, flags: string): RegExp =>
  new RegExp(String.raw`${LINE}@${tag}(?!\S)[^\S\r\n]*(.*?)(?=\n)`, flags)
const TAG_VALUE_PIECES = [' ', '\t', '\n', '\r', '\u{2028}', 'a', '@', '*', '/']

// Timeouts at three times the test's slowest CI time under coverage, rounded up to the next 5 s.
// One to two and a half million generated strings, each read by both readers.
const ENUMERATION_TIMEOUT_MS = 15_000
// About a million generated strings, every value of each listed and serialized by both readers.
const ALL_VALUES_TIMEOUT_MS = 20_000

describe('linear-time help and tag readers match the regular expressions they replace', () => {
  it('help text, any header', () => {
    expect.hasAssertions()

    checkEquivalence(
      'help',
      strings(['\n', ' ', '*', '/', '@', 'a', '@help', '@HeLp', '\u{A0}'], 5),
      oldHelp,
      matchHelp
    )
  })

  it('help text after a help tag', () => {
    expect.hasAssertions()

    checkEquivalence(
      'help after tag',
      strings(['\n', ' ', '*', '/', '@', 'a', '\t'], 6),
      (s) => oldHelp(afterHelpTag(s)),
      (s) => matchHelp(afterHelpTag(s))
    )
  })

  it('trailing star and spaces', () => {
    expect.hasAssertions()

    checkEquivalence(
      'trailing star',
      strings([' ', '\t', '*', 'a', '\u{A0}', '\u{FEFF}', '/'], 6),
      oldStrip,
      stripTrailingStar
    )
  })

  it('description, any header', () => {
    expect.hasAssertions()

    checkEquivalence(
      'plugindesc',
      strings(['\n', ' ', '*', '/', '@', 'a', '@plugindesc', '@PluginDesc'], 5),
      oldPlugindesc,
      matchPlugindesc
    )
  })

  it('description after a plugindesc tag', () => {
    expect.hasAssertions()

    checkEquivalence(
      'plugindesc after tag',
      strings(['\n', ' ', '*', '/', '@', 'a', '\t'], 6),
      (s) => oldPlugindesc(afterPlugindescTag(s)),
      (s) => matchPlugindesc(afterPlugindescTag(s))
    )
  })

  it('description lines joined', () => {
    expect.hasAssertions()

    checkEquivalence(
      'description join',
      strings(['\n', ' ', '*', 'a', '\t', ' '], 6),
      oldJoin,
      joinStarLines
    )
  })

  it('script name after a plugindesc tag', () => {
    expect.hasAssertions()

    checkEquivalence(
      'script name',
      strings(['* @plugindesc', '*', ' ', 'a', '_', '.js', '.', '\n'], 5),
      oldScriptName,
      matchScriptName
    )
  })

  it(
    'wrapper close at the end of the code',
    () => {
      expect.hasAssertions()

      checkEquivalence(
        'wrapper close',
        strings([' ', '\t', '\n', 'a', ';', ')', '}', '('], 7),
        oldWrapperClose,
        (s) => PluginParser.matchWrapperClose(s)
      )
    },
    ENUMERATION_TIMEOUT_MS
  )
})

describe('linear-time tag value readers match the regular expressions they replace', () => {
  it.each(['author', 'target', 'url'])(
    '%s value, first tag with a line break',
    (tag) => {
      expect.hasAssertions()

      checkEquivalence(
        `${tag} value`,
        strings([...TAG_VALUE_PIECES, tag], 6),
        (s) => oldTagValue(tag, 'i').exec(s)?.at(1),
        (s) => PluginParser.matchTagValue(s, tag)
      )
    },
    ENUMERATION_TIMEOUT_MS
  )

  it.each(['base', 'orderAfter', 'orderBefore', 'noteParam'])(
    '%s values, every tag with a line break',
    (tag) => {
      expect.hasAssertions()

      checkEquivalence(
        `${tag} values`,
        strings([...TAG_VALUE_PIECES, tag], 6),
        (s) =>
          JSON.stringify(
            s
              .matchAll(oldTagValue(tag, 'gi'))
              .map((m) => [m.index, m.index + m[0].length, m.at(1)])
              .toArray()
          ),
        (s) =>
          JSON.stringify(PluginParser.matchTagValues(s, tag).map((v) => [v.index, v.end, v.value]))
      )
    },
    ALL_VALUES_TIMEOUT_MS
  )
})

describe('linear-time note tag reader matches the regular expression it replaces', () => {
  it('note tags, any note', () => {
    expect.hasAssertions()

    checkEquivalence('note tags', strings(['<', '>', ':', 'a'], 9), oldNoteTags, (s) =>
      JSON.stringify(ProjectParser.parseNoteTags(s))
    )
  })
})
