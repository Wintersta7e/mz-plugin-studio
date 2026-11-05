import { useMemo, type ReactElement } from 'react'

const KEYWORD =
  /\b(?:const|let|var|function|return|if|else|for|while|this|new|prototype|call|apply)\b/g
const STRING = /(['"`])(?:\\.|(?!\1)[^\\])*?\1/g
const NUMBER = /\b\d+\b/g

const TOKEN_CLASS = {
  keyword: 'text-purple-400',
  string: 'text-amber-400',
  number: 'text-blue-400'
} as const

type Token = Readonly<{ start: number; end: number; type: keyof typeof TOKEN_CLASS; text: string }>

function findTokens(text: string, pattern: RegExp, type: Token['type']): Token[] {
  return Array.from(text.matchAll(pattern), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
    type,
    text: match[0]
  }))
}

/**
The keywords, strings and numbers in a line in start order, each dropped that overlaps one kept
before it (a string starts before the words inside it, so it wins)
*/
function codeTokens(text: string): Token[] {
  const tokens = [
    ...findTokens(text, KEYWORD, 'keyword'),
    ...findTokens(text, STRING, 'string'),
    ...findTokens(text, NUMBER, 'number')
  ].toSorted((a, b) => a.start - b.start)
  const kept: Token[] = []
  for (const token of tokens) {
    const isOverlapping = kept.some(
      (other) =>
        (token.start >= other.start && token.start < other.end) ||
        (token.end > other.start && token.end <= other.end)
    )
    if (!isOverlapping) kept.push(token)
  }
  return kept
}

// Each part is keyed by the column it starts at
function codeParts(text: string): ReactElement[] {
  const parts: ReactElement[] = []
  let lastIndex = 0
  for (const token of codeTokens(text)) {
    if (token.start > lastIndex) {
      parts.push(<span key={lastIndex}>{text.slice(lastIndex, token.start)}</span>)
    }
    parts.push(
      <span key={token.start} className={TOKEN_CLASS[token.type]}>
        {token.text}
      </span>
    )
    lastIndex = token.end
  }
  if (lastIndex < text.length) {
    parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>)
  }
  return parts
}

// A comment runs from the first `//` to the end of the line, after the code before it
function lineParts(line: string): ReactElement[] {
  const commentStart = line.indexOf('//')
  if (commentStart === -1) return codeParts(line)
  return [
    ...codeParts(line.slice(0, commentStart)),
    <span key={commentStart} className="text-emerald-500">
      {line.slice(commentStart)}
    </span>
  ]
}

// Each line is keyed by the offset it starts at in the code
function codeLines(code: string): ReactElement[] {
  const lines: ReactElement[] = []
  let offset = 0
  for (const line of code.split('\n')) {
    const parts = lineParts(line)
    lines.push(
      <div key={offset} className="whitespace-pre">
        {parts.length > 0 ? parts : ' '}
      </div>
    )
    offset += line.length + 1
  }
  return lines
}

/**
JavaScript with its keywords, strings, numbers and comments coloured, a line to a row
*/
export function HighlightedCode({ code }: Readonly<{ code: string }>) {
  const lines = useMemo(() => codeLines(code), [code])
  return <>{lines}</>
}
