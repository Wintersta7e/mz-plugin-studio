// Reads the imports of a source file for the dependency audits: one tokenizer, two readings.
//   valueImports (scripts/ci-policy.mjs runtime-deps): the specifiers the bundler keeps, so
//     type-only clauses are skipped and `require(…)` is read; every `from '…'` outside a
//     statement read is returned too, so a statement the tokenizer cannot read fails the audit.
//   bundledImports (scripts/third-party-licenses.mjs): every package the app may ship, so only
//     `import type` / `export type` and clause-less statements are skipped, `{ type X }` clauses
//     are kept, `import(…)` is read but `require(…)` is not, and a stylesheet `@import` is read.
// Every statement read is line-anchored or call-shaped. An import clause may hold comments but
// not the `import`/`export` of a following statement, so a misread clause can only add a
// package to the value set. `import(…)`, `require(…)` and `import '…'` are read in their one-line
// form only.
const COMMENT = /\/\/[^\n]*(?![^\n])|\/\*[\s\S]*?\*\//g
const BARE_IMPORT = /^[ \t]*import[ \t]*(['"])([^'"\n]+)\1/gm
const CALL_IMPORT = /\b(import|require)\([ \t]*(['"])([^'"\n]+)\2[ \t]*\)/g
const FROM_SPECIFIER = /\bfrom\s*(['"])([^'"\n]+)\1/g
// `@import 'x'` or `@import url('x')`: one or more characters up to the next quote of either kind.
const STYLESHEET_IMPORT = /@import\s+(?:url\()?['"]([^'"]+)['"]/g

// The characters a `… from '…'` statement is read by, one at a time.
const BLANK = /[ \t]/
const SPACE = /\s/
const WORD = /\w/
const CLAUSE_CHAR = /[\w$\s{},*]/
const QUOTE = /['"]/
const SOURCE_CHAR = /[^'"\n]/
const COMMENT_CHAR = /[^\n]/
const LINE_CHAR = /[^\n\r\u{2028}\u{2029}]/u
const KEYWORDS = ['import', 'export']
const KEYWORD_LENGTH = 6

/**
@typedef {{ clauseEnd: number, specifier: string, end: number }} ClauseSource
@typedef {{ kind: 'from', start: number, end: number, isTypeKeyword: boolean, clause: string, specifier: string }} FromToken
@typedef {{ kind: 'bare' | 'import' | 'require' | 'stylesheet', start: number, specifier: string }} OtherToken
@typedef {FromToken | OtherToken} ImportToken
@typedef {{ line: number, specifier: string }} UnreadSource
*/

/**
One character of `text` against a one-character class; outside the text reads as no match.
@param {RegExp} pattern
@param {string} text
@param {number} index
*/
const isAt = (pattern, text, index) => pattern.test(text.charAt(index))

/**
@param {RegExp} pattern
@param {string} text
@param {number} index
@returns {number} the index after the run of `pattern` characters that starts at `index`
*/
function skip(pattern, text, index) {
  let end = index
  while (isAt(pattern, text, end)) end += 1
  return end
}

/**
`from '<specifier>'` after any spaces at `start`: one or more characters up to the matching
quote, on one line.
@param {string} text
@param {number} start
@returns {{ specifier: string, end: number } | undefined}
*/
function sourceAt(text, start) {
  const from = skip(SPACE, text, start)
  const open = skip(BLANK, text, from + 4)
  const close = skip(SOURCE_CHAR, text, open + 1)
  const isSource =
    text.startsWith('from', from) &&
    isAt(QUOTE, text, open) &&
    close > open + 1 &&
    text.charAt(close) === text.charAt(open)
  return isSource ? { specifier: text.slice(open + 1, close), end: close + 1 } : undefined
}

/**
The index the clause walk moves to from `at`: past a line comment to its line end, else one
clause character on; -1 at any other character and at the `import`/`export` keyword of a later
statement.
@param {string} text
@param {number} at
*/
function clauseStep(text, at) {
  if (text.startsWith('//', at)) return skip(COMMENT_CHAR, text, at)
  const isKeyword =
    KEYWORDS.some((word) => text.startsWith(word, at)) &&
    !isAt(WORD, text, at - 1) &&
    !isAt(WORD, text, at + KEYWORD_LENGTH)
  return !isKeyword && isAt(CLAUSE_CHAR, text, at) ? at + 1 : -1
}

/**
The first `from '…'` the clause starting at `start` reaches. A block comment is tried as
ending at each later `*\/` in turn, the first ending first.
@param {string} text
@param {number} start
@param {Set<number>} failed the starts already walked without reaching a source
@returns {ClauseSource | undefined}
*/
function clauseSource(text, start, failed) {
  /**
  @type {number[]}
  */
  const walked = []
  /**
  @type {ClauseSource | undefined}
  */
  let found
  for (let at = start; found === undefined && at >= 0 && !failed.has(at);) {
    const source = sourceAt(text, at)
    walked.push(at)
    if (source) {
      found = { clauseEnd: at, ...source }
    } else if (text.startsWith('/*', at)) {
      found = blockCommentSource(text, at, failed)
      at = -1
    } else {
      at = clauseStep(text, at)
    }
  }
  if (found === undefined) for (const index of walked) failed.add(index)
  return found
}

/**
@param {string} text
@param {number} at the start of the block comment
@param {Set<number>} failed
@returns {ClauseSource | undefined}
*/
function blockCommentSource(text, at, failed) {
  /**
  @type {ClauseSource | undefined}
  */
  let found
  for (
    let close = text.indexOf('*/', at + 2);
    found === undefined && close >= 0;
    close = text.indexOf('*/', close + 1)
  ) {
    found = clauseSource(text, close + 2, failed)
  }
  return found
}

/**
The `import … from '…'` or `export … from '…'` statement on the line starting at `lineStart`.
@param {string} text
@param {number} lineStart
@param {Set<number>} failed
@returns {FromToken | undefined}
*/
function statementAt(text, lineStart, failed) {
  const keyword = skip(BLANK, text, lineStart)
  const keywordEnd = skip(BLANK, text, keyword + KEYWORD_LENGTH)
  const typeEnd = skip(BLANK, text, keywordEnd + 4)
  const isTypeKeyword = text.startsWith('type', keywordEnd) && typeEnd > keywordEnd + 4
  const clauseStart = isTypeKeyword ? typeEnd : keywordEnd
  const isStatement =
    KEYWORDS.some((word) => text.startsWith(word, keyword)) && keywordEnd > keyword + KEYWORD_LENGTH
  const source = isStatement ? clauseSource(text, clauseStart, failed) : undefined
  return (
    source && {
      kind: 'from',
      start: lineStart,
      end: source.end,
      isTypeKeyword,
      clause: text.slice(clauseStart, source.clauseEnd),
      specifier: source.specifier
    }
  )
}

/**
Every `… from '…'` statement, each read at a line start after the end of the one before.
@param {string} text
*/
function fromStatements(text) {
  /**
  @type {FromToken[]}
  */
  const statements = []
  /**
  @type {Set<number>}
  */
  const failed = new Set()
  let readEnd = 0
  for (
    let lineStart = 0;
    lineStart < text.length;
    lineStart = skip(LINE_CHAR, text, lineStart) + 1
  ) {
    const statement = lineStart >= readEnd ? statementAt(text, lineStart, failed) : undefined
    if (statement === undefined) continue
    statements.push(statement)
    readEnd = statement.end
  }
  return statements
}

/**
Every import a source holds, in text order.
@param {string} source
@returns {ImportToken[]}
*/
function importTokens(source) {
  /**
  @type {ImportToken[]}
  */
  const tokens = fromStatements(source)
  for (const match of source.matchAll(BARE_IMPORT)) {
    tokens.push({ kind: 'bare', start: match.index, specifier: match.at(2) ?? '' })
  }
  for (const match of source.matchAll(CALL_IMPORT)) {
    const kind = match.at(1) === 'require' ? 'require' : 'import'
    tokens.push({ kind, start: match.index, specifier: match.at(3) ?? '' })
  }
  for (const match of source.matchAll(STYLESHEET_IMPORT)) {
    tokens.push({ kind: 'stylesheet', start: match.index, specifier: match.at(1) ?? '' })
  }
  return tokens.toSorted((left, right) => left.start - right.start)
}

/**
The clause of a statement without its comments and outer spaces.
@param {string} clause
*/
const bindingsOf = (clause) => clause.replaceAll(COMMENT, ' ').trim()

// TypeScript and esbuild elide `import type …` and a clause of only `{ type … }` items;
// `import type from '…'` imports a default export named `type`.
/**
@param {FromToken} token
*/
function isTypeOnly({ isTypeKeyword, clause }) {
  const bindings = bindingsOf(clause)
  const [, named = ''] = /^\{([^{}]*)\}$/.exec(bindings) ?? []
  const items = named
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return isTypeKeyword
    ? bindings !== ''
    : items.length > 0 && items.every((item) => /^type\s/.test(item))
}

/**
The specifiers the bundler keeps from one source, in text order, and every `from '…'` outside a
statement read, with its line.
@param {string} source
*/
export function valueImports(source) {
  const tokens = importTokens(source)
  const specifiers = tokens
    .filter((token) => (token.kind === 'from' ? !isTypeOnly(token) : token.kind !== 'stylesheet'))
    .map(({ specifier }) => specifier)
  /**
  @type {UnreadSource[]}
  */
  const unread = []
  for (const match of source.matchAll(FROM_SPECIFIER)) {
    const isRead = tokens.some(
      (token) => token.kind === 'from' && match.index >= token.start && match.index < token.end
    )
    if (isRead) continue
    unread.push({
      line: source.slice(0, match.index).split('\n').length,
      specifier: match.at(2) ?? ''
    })
  }
  return { specifiers, unread }
}

/**
Every specifier the app may ship from one source, in text order: what `import`, `export … from`,
`import(…)` and a stylesheet `@import` name, without `import type`, `export type` and statements
that bind nothing.
@param {string} source
@returns {string[]}
*/
export function bundledImports(source) {
  return importTokens(source)
    .filter((token) =>
      token.kind === 'from'
        ? !token.isTypeKeyword && bindingsOf(token.clause) !== ''
        : token.kind !== 'require'
    )
    .map(({ specifier }) => specifier)
}
