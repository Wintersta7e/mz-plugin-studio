/**
Override Extractor — Shared between main and renderer processes

Extracts prototype override method names from RPG Maker MZ plugin code.
Used by the IPC scan handler (main) and conflict detector (renderer).
*/

// Block and single-line comments
const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g

/**
A comment, string, template or regex literal: `start` is its first character, `end` one past
its last.
@internal exported for tests
*/
export interface LiteralRange {
  kind: 'comment' | 'string' | 'template' | 'regex'
  start: number
  end: number
}

// Words after which a `/` starts a regex: each expects an expression next
const EXPRESSION_WORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await'
])
// Words whose `( … )` a statement follows, so a `/` after that `)` starts a regex
const CONDITION_WORDS = new Set(['if', 'while', 'for', 'with'])
const WORD_CHARACTER = /[\w$\u{80}-\u{FFFF}]/u
const SPACE = /\s/
const LINE_BREAK = /[\n\r\u{2028}\u{2029}]/u

/**
Where a scan stands. The open templates outnumber the open substitutions by one while the
scan reads template text, and equal them while it reads code.
*/
interface ScanState {
  readonly code: string
  at: number
  readonly ranges: LiteralRange[]
  inTemplateText: boolean
  /**
  Whether a `/` here starts a regex: false right after a value.
  */
  regexAllowed: boolean
  /**
  The word just read, while it is the last token.
  */
  previousWord: string | undefined
  /**
  Per open `(`: whether a statement follows its `)`.
  */
  readonly parens: boolean[]
  /**
  Per open template substitution, the depth of `{` its code has reached.
  */
  readonly substitutions: number[]
  /**
  How many template literals are open, nested ones counted.
  */
  openTemplates: number
  /**
  Where the outermost open template literal starts.
  */
  templateStart: number
}

/**
Index one past a string literal opened at `start`; a line break ends an unclosed one.
*/
function stringEnd(code: string, start: number): number {
  const quote = code.charAt(start)
  let at = start + 1
  while (at < code.length && code.charAt(at) !== quote && !LINE_BREAK.test(code.charAt(at))) {
    at += code.charAt(at) === '\\' ? 2 : 1
  }
  return Math.min(at + 1, code.length)
}

/**
Index one past a regex literal opened at `start`, its flags included, or -1 when the
candidate meets a line break first: then the `/` is division.
*/
function regexEnd(code: string, start: number): number {
  let at = start + 1
  // A `/` inside a character class does not end the literal
  let isInClass = false
  while (at < code.length && !LINE_BREAK.test(code.charAt(at))) {
    const character = code.charAt(at)
    if (character === '/' && !isInClass) return wordEnd(code, at + 1)
    if (character === '[') isInClass = true
    else if (character === ']') isInClass = false
    at += character === '\\' ? 2 : 1
  }
  return -1
}

/**
Index one past the word (identifier, keyword or number) starting at `start`.
*/
function wordEnd(code: string, start: number): number {
  let at = start
  while (at < code.length && WORD_CHARACTER.test(code.charAt(at))) at += 1
  return at
}

/**
Records a literal from `state.at` to `end`, unless it lies inside a template, whose own range
holds it, and moves past it.
*/
function addRange(state: ScanState, kind: LiteralRange['kind'], end: number): void {
  if (state.openTemplates === 0) state.ranges.push({ kind, start: state.at, end })
  state.at = end
}

/**
Reads template text up to its closing backtick, which ends the template, or a `${`, which
opens a substitution.
*/
function scanTemplateText(state: ScanState): void {
  const { code } = state
  while (state.at < code.length) {
    const character = code.charAt(state.at)
    if (character === '`') {
      state.at += 1
      state.openTemplates -= 1
      if (state.openTemplates === 0) {
        state.ranges.push({ kind: 'template', start: state.templateStart, end: state.at })
      }
      state.inTemplateText = false
      state.regexAllowed = false
      return
    }
    if (character === '$' && code.charAt(state.at + 1) === '{') {
      state.at += 2
      state.substitutions.push(0)
      state.inTemplateText = false
      state.regexAllowed = true
      return
    }
    state.at += character === '\\' ? 2 : 1
  }
  // An unclosed template runs to the end of the code
  state.ranges.push({ kind: 'template', start: state.templateStart, end: code.length })
  state.openTemplates = 0
}

/**
Reads a `/` in code: a comment, a regex literal or division.
*/
function scanSlash(state: ScanState): void {
  const { code } = state
  const next = code.charAt(state.at + 1)
  if (next === '/') {
    const newline = code.indexOf('\n', state.at)
    addRange(state, 'comment', newline === -1 ? code.length : newline)
  } else if (next === '*') {
    const close = code.indexOf('*/', state.at + 2)
    addRange(state, 'comment', close === -1 ? code.length : close + 2)
  } else {
    const end = state.regexAllowed ? regexEnd(code, state.at) : -1
    if (end === -1) {
      state.at += 1
      state.regexAllowed = true
    } else {
      addRange(state, 'regex', end)
      state.regexAllowed = false
    }
  }
}

/**
Reads a brace in code. A `}` that closes a template substitution returns the scan to the
template's text.
*/
function scanBrace(state: ScanState, character: string): void {
  state.at += 1
  state.regexAllowed = true
  const open = state.substitutions.length - 1
  const depth = state.substitutions[open]
  if (depth === undefined) return
  if (character === '{') {
    state.substitutions[open] = depth + 1
  } else if (depth === 0) {
    state.substitutions.pop()
    state.inTemplateText = true
  } else {
    state.substitutions[open] = depth - 1
  }
}

/**
Reads a word: a name or a number is a value, so a `/` after it divides; a keyword that expects
an expression lets a regex follow.
*/
function scanWord(state: ScanState): void {
  const end = wordEnd(state.code, state.at)
  const word = state.code.slice(state.at, end)
  state.at = end
  state.regexAllowed = EXPRESSION_WORDS.has(word)
  state.previousWord = word
}

/**
Reads one punctuator in code.
*/
function scanPunctuator(state: ScanState, character: string, previousWord?: string): void {
  if (character === '{' || character === '}') {
    scanBrace(state, character)
    return
  }
  state.at += 1
  switch (character) {
    case '(': {
      state.parens.push(previousWord !== undefined && CONDITION_WORDS.has(previousWord))
      state.regexAllowed = true
      break
    }
    case ')': {
      state.regexAllowed = state.parens.pop() ?? false
      break
    }
    case ']': {
      state.regexAllowed = false
      break
    }
    case '+':
    case '-': {
      // `a++ / b` divides; `a + /b/` does not
      const isIncrement = state.code.charAt(state.at) === character
      if (isIncrement) state.at += 1
      state.regexAllowed = !isIncrement
      break
    }
    default: {
      state.regexAllowed = true
    }
  }
}

/**
Reads one token of code, or the whitespace before one.
*/
function scanCode(state: ScanState): void {
  const character = state.code.charAt(state.at)
  if (SPACE.test(character)) {
    state.at += 1
    return
  }
  const { previousWord } = state
  state.previousWord = undefined
  switch (character) {
    case '/': {
      scanSlash(state)
      break
    }
    case "'":
    case '"': {
      addRange(state, 'string', stringEnd(state.code, state.at))
      state.regexAllowed = false
      break
    }
    case '`': {
      if (state.openTemplates === 0) state.templateStart = state.at
      state.openTemplates += 1
      state.at += 1
      state.inTemplateText = true
      break
    }
    default: {
      if (WORD_CHARACTER.test(character)) scanWord(state)
      else scanPunctuator(state, character, previousWord)
    }
  }
}

/**
The comment, string, template and regex literal ranges of `code`, in order. A `/` starts a
regex where the previous token cannot end a value (after `)`, only when its `(` follows `if`,
`while`, `for` or `with`); a regex literal never spans a line break. A template's range holds
its substitutions, and the templates nested in them.
@internal exported for tests
*/
export function scanLiterals(code: string): readonly LiteralRange[] {
  const state: ScanState = {
    code,
    at: 0,
    ranges: [],
    inTemplateText: false,
    regexAllowed: true,
    previousWord: undefined,
    parens: [],
    substitutions: [],
    openTemplates: 0,
    templateStart: 0
  }
  while (state.at < code.length) {
    if (state.inTemplateText) scanTemplateText(state)
    else scanCode(state)
  }
  return state.ranges
}

/**
Replace comments and string, template and regex literals with spaces so that
prototype references inside them are not matched by the
extraction regexes.
@internal exported for tests
*/
export function stripCommentsAndStrings(code: string): string {
  let stripped = ''
  let at = 0
  for (const { start, end } of scanLiterals(code)) {
    stripped += code.slice(at, start) + ' '.repeat(end - start)
    at = end
  }
  return stripped + code.slice(at)
}

/**
Replace only comments (block + line) with spaces, keeping string contents
intact. Used for substring matching where the search target is a string
literal that must remain comparable (e.g. command name dedup).
*/
export function stripCommentsOnly(code: string): string {
  return code.replaceAll(COMMENTS, (match) => ' '.repeat(match.length))
}

/**
Capture group `index`, which takes part in every match. A missing one throws a `TypeError`:
`String.prototype.toString` accepts only a string as `this`, so this check adds no branch.
*/
function group(match: RegExpExecArray, index: number): string {
  return String.prototype.toString.call(match[index])
}

/**
Extract prototype override method names from JavaScript plugin code.

Detects two patterns:
 1. Direct assignment:  `ClassName.prototype.method = ...`
 2. Alias capture:      `const|let|var _alias = ClassName.prototype.method;`

Returns a deduplicated array of `"ClassName.prototype.methodName"` strings.
*/
export function extractOverrides(code: string): string[] {
  if (!code) return []

  const cleaned = stripCommentsAndStrings(code)
  const seen = new Set<string>()

  // Pattern 1: direct assignment — ClassName.prototype.method(…chain…) =
  // The optional (?:\.\w+)* allows nested chains like .tileset.name
  // while still capturing only the first property after prototype.
  // Negative lookahead (?![=>]) prevents matching ==, ===, =>, !=
  const directRe = /(\w+)\.prototype\.(\w+)(?:\.\w+)*\s*=(?![=>])/g
  let match: RegExpExecArray | null
  while ((match = directRe.exec(cleaned)) !== null) {
    seen.add(`${group(match, 1)}.prototype.${group(match, 2)}`)
  }

  // Pattern 2: alias capture — const|let|var _x = ClassName.prototype.method;
  const aliasRe = /(?:const|let|var)\s+\w+\s*=\s*(\w+)\.prototype\.(\w+)\s*[;,]/g
  while ((match = aliasRe.exec(cleaned)) !== null) {
    seen.add(`${group(match, 1)}.prototype.${group(match, 2)}`)
  }

  return [...seen]
}
