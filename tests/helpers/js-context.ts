// Where a piece of text lands in JavaScript source: inside a comment, inside a string, template
// or regex token, or in code position. Judges position only; compiling and running belong to
// the evaluation helper.
import ts from 'typescript'

export type JsContext =
  | 'line-comment'
  | 'block-comment'
  | 'single-quote'
  | 'double-quote'
  | 'template-literal'
  | 'regex'
  | 'code'

interface Span {
  start: number
  end: number
  context: JsContext
}

const TEMPLATE_KINDS = new Set([
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail
])

function tokenContext(token: ts.Node, code: string, sf: ts.SourceFile): JsContext | null {
  if (token.kind === ts.SyntaxKind.StringLiteral) {
    return code[token.getStart(sf)] === "'" ? 'single-quote' : 'double-quote'
  }
  if (TEMPLATE_KINDS.has(token.kind)) return 'template-literal'
  if (token.kind === ts.SyntaxKind.RegularExpressionLiteral) return 'regex'
  return null
}

/** Every comment and every string, template and regex token of `code`, in no set order. */
function spansOf(code: string): Span[] {
  const sf = ts.createSourceFile('snippet.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const spans: Span[] = []
  const seen = new Set<number>()
  const addComments = (ranges: ts.CommentRange[] | undefined): void => {
    for (const range of ranges ?? []) {
      if (seen.has(range.pos)) continue
      seen.add(range.pos)
      const line = range.kind === ts.SyntaxKind.SingleLineCommentTrivia
      spans.push({
        start: range.pos,
        end: range.end,
        context: line ? 'line-comment' : 'block-comment'
      })
    }
  }
  const visit = (node: ts.Node): void => {
    // JSDoc nodes sit inside a comment the next token already reports.
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) {
      return
    }
    const children = node.getChildren(sf)
    if (children.length > 0 && node.kind !== ts.SyntaxKind.EndOfFileToken) {
      for (const child of children) visit(child)
      return
    }
    addComments(ts.getLeadingCommentRanges(code, node.pos))
    addComments(ts.getTrailingCommentRanges(code, node.end))
    const context = tokenContext(node, code, sf)
    if (context !== null) spans.push({ start: node.getStart(sf), end: node.end, context })
  }
  visit(sf)
  return spans
}

function occurrences(code: string, needle: string): number[] {
  if (needle === '') throw new Error('needle is empty')
  const found: number[] = []
  for (let at = code.indexOf(needle); at !== -1; at = code.indexOf(needle, at + 1)) found.push(at)
  return found
}

/** The context each occurrence of `needle` starts in, in source order. */
export function contextsOf(code: string, needle: string): JsContext[] {
  const spans = spansOf(code)
  return occurrences(code, needle).map(
    (at) => spans.find((s) => s.start <= at && at < s.end)?.context ?? 'code'
  )
}

/** True when every occurrence of `needle` lies wholly inside one comment, string, template or regex. */
export function isContained(code: string, needle: string): boolean {
  const spans = spansOf(code)
  return occurrences(code, needle).every((at) =>
    spans.some((s) => s.start <= at && at + needle.length <= s.end)
  )
}
