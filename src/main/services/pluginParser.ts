import type {
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  PluginStruct,
  ParamType,
  LocalizedContent,
  NoteParam
} from '../../shared/types/plugin'
import { type AnnotationBlock, findAnnotationBlocks } from '../../shared/annotation-blocks'
import { COMPACT_PARAM_TAG } from '../../shared/compact-param'

interface ParsedMeta {
  name: string
  version: string
  author: string
  description: string
  help: string
  url: string
  target: string
  dependencies: string[]
  orderAfter: string[]
  orderBefore: string[]
  noteParams: NoteParam[]
  requiredAssets: string[]
  localizations: Record<string, LocalizedContent>
}

/**
Optional whitespace, an optional `*` and optional whitespace, read at the start of a line.
*/
const LINE_INDENT = String.raw`[^\S\r\n]*(?:\*[^\S\r\n]*)?`

/**
A tag counts only at the start of a line (optional whitespace, an optional `*`, optional
whitespace), so an `@` inside a value or after a zero-width space in help text is not a tag.
*/
const LINE_START = String.raw`(?<![^\r\n])${LINE_INDENT}`

/**
`@` followed by `rest`, where a tag can start.
*/
function tagRegex(rest: string, flags = ''): RegExp {
  return new RegExp(`${LINE_START}@${rest}`, flags)
}

/**
`value`, which is always there: a capture group that takes part in every match, or an entry
inside a table's bounds. A missing one throws a `TypeError`.
*/
function present<T>(value: T | undefined): T {
  if (value === undefined) throw new TypeError('A value the parser always reads is missing')
  return value
}

/**
nextNonWs[i]: first index >= i of `text` that is not whitespace (the length if none).
*/
function nextNonWsTable(text: string): Int32Array {
  const n = text.length
  const nextNonWs = new Int32Array(n + 1)
  let next = n
  nextNonWs[n] = next
  for (let index = n - 1; index >= 0; index--) {
    if (!/\s/.test(text.charAt(index))) next = index
    nextNonWs[index] = next
  }
  return nextNonWs
}

/**
A help body ends at a line break before a line that starts a tag (`@` and a letter after the
same indent as every tag) or the end of the comment; a description at any `@` there.
*/
const HELP_END = new RegExp(String.raw`\n(?:${LINE_INDENT}@[a-z]|[^\S\r\n]*\*\/)`, 'iy')
const DESC_END = new RegExp(String.raw`\n(?:${LINE_INDENT}@|[^\S\r\n]*\*\/)`, 'y')

/**
First line break at or after `from` where `end` matches (-1 if none). Each test reads only the
start of the line after the break, so the whole search is linear.
*/
function firstEnd(text: string, end: RegExp, from: number): number {
  for (let p = text.indexOf('\n', from); p !== -1; p = text.indexOf('\n', p + 1)) {
    end.lastIndex = p
    if (end.test(text)) return p
  }
  return -1
}

/**
Same result as header.match(/<line start>@help\s*([\s\S]*?)(?=<HELP_END>)/i)?.[1], in linear
time, except that a body with no end after it runs to the end of the header (help written last
in a block).
*/
export function matchHelp(header: string): string | undefined {
  const m = tagRegex('help', 'i').exec(header)
  if (m === null) return undefined
  const s0 = m.index + m[0].length
  let bodyStart = s0
  while (bodyStart < header.length && /\s/.test(header.charAt(bodyStart))) bodyStart++
  const end = firstEnd(header, HELP_END, bodyStart)
  if (end !== -1) return header.slice(bodyStart, end)
  // The regex gives back leading whitespace to reach an end inside it, capturing nothing
  if (firstEnd(header, HELP_END, s0) !== -1) return ''
  // No end after the tag: the body runs to the end of the header
  return header.slice(bodyStart)
}

/**
Same result as header.match(/<line start>@plugindesc(?!\S)[^\S\r\n]*(.*?)(?=<DESC_END>|$)/s)?.[1],
in linear time.
*/
export function matchPlugindesc(header: string): string | undefined {
  const m = tagRegex(String.raw`plugindesc(?!\S)[^\S\r\n]*`).exec(header)
  if (m === null) return undefined
  const start = m.index + m[0].length
  const end = firstEnd(header, DESC_END, start)
  // Written last in the block, it runs to the end of the header
  return end === -1 ? header.slice(start) : header.slice(start, end)
}

/**
A tag with its value: `index` where its line starts, `end` at the line break after the value.
*/
interface TagValue {
  index: number
  end: number
  value: string
}

// The rest of a line up to its line break; fails on `\r`, `\u2028`, `\u2029` or no break
const VALUE_TO_LINE_BREAK = /.*(?=\n)/y

function nextTagValue(header: string, start: RegExp): TagValue | undefined {
  for (let m = start.exec(header); m !== null; m = start.exec(header)) {
    VALUE_TO_LINE_BREAK.lastIndex = start.lastIndex
    const value = VALUE_TO_LINE_BREAK.exec(header)
    if (value !== null) {
      return { index: m.index, end: VALUE_TO_LINE_BREAK.lastIndex, value: value[0] }
    }
  }
  return undefined
}

function tagValueStart(tag: string): RegExp {
  return tagRegex(String.raw`${tag}(?!\S)[^\S\r\n]*`, 'gi')
}

/**
Same result as content.match(/\*\s+@plugindesc[\s\S]*?(\w+)\.js/i)?.[1], in linear time: a
name is tried right after the tag and then only where a word starts, since a name tried inside
a long word would re-read the rest of the word at every character.
*/
export function matchScriptName(content: string): string | undefined {
  return /\*\s+@plugindesc(?:[\s\S]+?\b)??(\w+)\.js/i.exec(content)?.[1]
}

// Same result as text.replace(/\n\s*\*\s*/g, ' '), in linear time
export function joinStarLines(text: string): string {
  const nextNonWs = nextNonWsTable(text)
  let out = ''
  let copied = 0
  let index = text.indexOf('\n')
  while (index !== -1) {
    const star = present(nextNonWs[index + 1])
    let from = index + 1
    if (text[star] === '*') {
      out += text.slice(copied, index) + ' '
      copied = present(nextNonWs[star + 1])
      from = copied
    }
    index = text.indexOf('\n', from)
  }
  return out + text.slice(copied)
}

/**
Same result as value.replace(/\s*\*?\s*$/, ''), in linear time.
*/
export function stripTrailingStar(value: string): string {
  const trimmed = value.trimEnd()
  return trimmed.endsWith('*') ? trimmed.slice(0, -1).trimEnd() : trimmed
}

/**
Same result as parseFloat(text) for a text of an optional `-` and then digits and dots: Number
reads the part before a second dot, which is the part parseFloat reads (`.` and `-.` are NaN
to both).
*/
function leadingNumber(text: string): number {
  return Number(text.split('.', 2).join('.'))
}

function parsePlugin(content: string, filename = ''): PluginDefinition {
  // Values are read from an LF copy, so a CRLF file parses the same as its LF twin
  const text = content.replaceAll('\r\n', '\n')
  const blocks = findAnnotationBlocks(text)
  const inner = (b: AnnotationBlock): string => text.slice(b.start + b.opener.length, b.end - 2)
  const headers = blocks.filter((b) => b.kind !== 'struct')
  const main = headers.find((b) => b.kind === 'main')
  // Without a main block, parameters and commands are shown from the first language block
  const source = main ?? headers[0]
  const sourceText = source === undefined ? '' : inner(source)

  const meta = parseMeta(
    text,
    main === undefined ? '' : inner(main),
    headers.filter((b) => b.kind === 'language').map((b): [string, string] => [b.lang, inner(b)])
  )
  const parameters = parseParameters(sourceText)
  const commands = parseCommands(sourceText)
  const structs = parseStructs(
    blocks
      .filter((b) => b.kind === 'struct')
      .map((b): [string, string, string] => [b.structName ?? '', b.lang, inner(b)])
  )
  const codeBody = extractCodeBody(content)
  const customCode = extractCustomCode(codeBody)

  // Plugin name comes from filename (most reliable) or fallback to parsed meta
  let pluginName = meta.name
  if (filename) {
    // Strip .js extension to get plugin name
    pluginName = filename.replace(/\.js$/i, '')
  }

  return {
    id: crypto.randomUUID(),
    meta: {
      name: pluginName,
      version: meta.version,
      author: meta.author,
      description: meta.description,
      help: meta.help,
      url: meta.url,
      target: meta.target,
      dependencies: meta.dependencies,
      orderAfter: meta.orderAfter,
      orderBefore: meta.orderBefore,
      noteParams: meta.noteParams,
      requiredAssets: meta.requiredAssets,
      localizations: meta.localizations
    },
    parameters,
    commands,
    structs,
    codeBody,
    customCode,
    rawSource: content
  }
}

/**
Extract the code body (implementation) from the plugin content: the text outside every
annotation block, as written.
*/
function extractCodeBody(content: string): string {
  let codeBody = ''
  let at = 0
  for (const block of findAnnotationBlocks(content)) {
    codeBody += content.slice(at, block.start)
    at = block.end
  }
  return (codeBody + content.slice(at)).trim()
}

/**
Extract custom code from the code body.
This attempts to find user-written code after the boilerplate sections
(parameter parsing and command registration).

Heuristics used:
1. Unwrap IIFE wrapper if present, so heuristics work on inner content
2. Look for common markers like "// Custom", "// Plugin code", etc.
3. Look for code after the last PluginManager.registerCommand block
4. Look for code after PluginManager.parameters parsing
5. If no boilerplate detected, return the entire (unwrapped) body
*/
function extractCustomCode(codeBody: string): string {
  if (!codeBody) return ''

  // Unwrap IIFE if present - work with inner content to avoid
  // trailing })(); contaminating extracted code
  const workingCode = unwrapIIFE(codeBody) ?? codeBody

  const marked = codeFromMarker(workingCode)
  if (marked !== undefined) return marked

  // Try to find the end of boilerplate sections: the last registerCommand block, else the
  // parameter parsing section
  const lastRegisterCommand = workingCode.lastIndexOf('PluginManager.registerCommand')
  const afterBoilerplate =
    lastRegisterCommand === -1
      ? codeAfterParameters(workingCode)
      : codeAfterCommand(workingCode, lastRegisterCommand)

  // No boilerplate detected - return the entire working content
  return afterBoilerplate || workingCode.trim()
}

/**
The code from the first explicit custom code marker on, undefined without a marker.
*/
function codeFromMarker(code: string): string | undefined {
  const customMarkers = [
    /\/\/\s*custom\s*(?:plugin\s*)?code/i,
    /\/\/\s*your\s*code\s*here/i,
    /\/\/\s*implementation/i,
    /\/\/\s*main\s*(?:plugin\s*)?logic/i,
    /\/\/\s*={3,}\s*custom/i,
    /\/\/\s*-{3,}\s*custom/i
  ]

  for (const marker of customMarkers) {
    const match = code.match(marker)
    if (match?.index !== undefined) {
      return code.slice(match.index).trim()
    }
  }
  return undefined
}

/**
The code after the registerCommand block that starts at `start`: '' when the block has no end.
*/
function codeAfterCommand(code: string, start: number): string {
  const closingIndex = findBlockEnd(code.slice(start))
  return closingIndex === -1 ? '' : code.slice(start + closingIndex + 1).trim()
}

/**
The code after the line of the last parameter read: '' without one.
Matches various patterns: params["x"], parameters["x"], PluginManager.parameters(...)
*/
function codeAfterParameters(code: string): string {
  const paramsEndMarkers = [
    /const\s+\w+\s*=\s*(?:params|parameters|param)\[["']/g,
    /PluginManager\.parameters\(/g,
    /PluginManagerEx\.createParameter\(/g
  ]

  let lastParamLine = -1
  for (const marker of paramsEndMarkers) {
    let match: RegExpExecArray | null
    while ((match = marker.exec(code)) !== null) {
      const lineEnd = code.indexOf('\n', match.index)
      if (lineEnd > lastParamLine) lastParamLine = lineEnd
    }
  }

  return lastParamLine === -1 ? '' : code.slice(lastParamLine + 1).trim()
}

/**
Same result as code.match(/\}\s*\)\s*\(\s*\)\s*;?\s*$/)?.index (where `})()` closes a wrapper
at the end of the code), in linear time: trailing whitespace is trimmed instead of matched,
since two whitespace runs around the optional `;` re-read a long run at every split.
*/
function matchWrapperClose(code: string): number | undefined {
  return /\}\s*\)\s*\(\s*\)\s*;?$/.exec(code.trimEnd())?.index
}

/**
Unwrap an IIFE wrapper, returning the inner content.
Handles: (() => { ... })(); and (function() { ... })();
Returns null if the code is not wrapped in an IIFE.
*/
function unwrapIIFE(code: string): string | null {
  // Check for IIFE opening pattern
  const iifeOpen = /^\s*\(\s*(?:\(\s*\)\s*=>|function\s*\(\s*\))\s*\{/.exec(code)
  if (!iifeOpen) return null

  // Check for IIFE closing pattern at the end
  const innerEnd = matchWrapperClose(code)
  if (innerEnd === undefined) return null

  // Extract inner content between opening { and closing }
  const innerStart = iifeOpen[0].length
  if (innerEnd <= innerStart) return null

  const inner = code.slice(innerStart, innerEnd)

  // Dedent: find the minimum indentation and remove it
  const lines = inner.split('\n')
  let minIndent = Infinity
  for (const line of lines) {
    if (line.trim().length === 0) continue
    const indent = line.length - line.trimStart().length
    if (indent < minIndent) minIndent = indent
  }
  return minIndent > 0 && minIndent < Infinity
    ? lines
        .map((line) => line.slice(minIndent))
        .join('\n')
        .trim()
    : inner.trim()
}

const QUOTES = new Set(['"', "'", '`'])

/**
Whether the character at `index` follows an odd number of backslashes.
*/
function isEscapedAt(code: string, index: number): boolean {
  let backslashes = 0
  for (let before = index - 1; before >= 0 && code[before] === '\\'; before--) backslashes++
  return backslashes % 2 !== 0
}

/**
The quote the code is inside after reading `quote` ('' outside a string).
*/
function openQuoteAfter(open: string, quote: string): string {
  if (open === '') return quote
  return quote === open ? '' : open
}

/**
After the `}` at `index`, the end of the closing `)` and optional `;` that follow it (the
brace itself without them).
*/
function callEnd(code: string, index: number): number {
  const closeMatch = /^\s*\)\s*;?/.exec(code.slice(index + 1))
  return closeMatch ? index + 1 + closeMatch[0].length : index
}

/**
Find the end of a code block (matching closing brace and parenthesis for registerCommand)
*/
function findBlockEnd(code: string): number {
  let braceCount = 0
  let openQuote = ''

  for (let index = 0; index < code.length; index++) {
    const char = code.charAt(index)

    // Handle string literals
    if (QUOTES.has(char) && !isEscapedAt(code, index)) {
      openQuote = openQuoteAfter(openQuote, char)
      continue
    }

    if (openQuote !== '') continue

    if (char === '{') braceCount++
    if (char !== '}') {
      continue
    }

    braceCount--
    // Found the closing of registerCommand's function block
    if (braceCount === 0) return callEnd(code, index)
  }

  return -1
}

function parseMeta(content: string, header: string, languages: [string, string][]): ParsedMeta {
  const meta: ParsedMeta = {
    name: '',
    version: '1.0.0',
    author: '',
    description: '',
    help: '',
    url: '',
    target: '',
    dependencies: [],
    orderAfter: [],
    orderBefore: [],
    noteParams: [],
    requiredAssets: [],
    localizations: parseLocalizations(languages)
  }
  if (!header) return meta

  readHeaderText(meta, header)

  // Parse @base (dependencies), @orderAfter and @orderBefore
  meta.dependencies = nonEmptyTagValues(header, 'base')
  meta.orderAfter = nonEmptyTagValues(header, 'orderAfter')
  meta.orderBefore = nonEmptyTagValues(header, 'orderBefore')

  // Parse @requiredAssets (assets preserved during "Exclude unused files" deploy)
  // Also match a final entry that lacks a trailing newline (right before */).
  meta.requiredAssets = header
    .matchAll(tagRegex(String.raw`requiredAssets(?!\S)[^\S\r\n]*(.*?)(?=\n|\r|\*\/|$)`, 'gi'))
    .map((match) => stripTrailingStar(present(match[1])).trim())
    .filter((value) => value !== '')
    .toArray()

  meta.noteParams = parseNoteParams(header)

  // Infer name from filename comment or plugin structure
  const name = matchScriptName(content)
  if (name !== undefined) {
    meta.name = name
  }

  return meta
}

/**
Reads @plugindesc, @author, @target, @url and @help into `meta`.
*/
function readHeaderText(meta: ParsedMeta, header: string): void {
  // Parse @plugindesc (written last in the block, it runs to the end of the header)
  const desc = matchPlugindesc(header)
  if (desc !== undefined) {
    meta.description = joinStarLines(desc).trim()
  }

  // Parse @author
  const author = matchTagValue(header, 'author')
  if (author !== undefined) {
    meta.author = author.trim()
  }

  // Parse @target
  const target = matchTagValue(header, 'target')
  if (target !== undefined) {
    meta.target = target.trim()
  }

  // Parse @url
  const url = matchTagValue(header, 'url')
  if (url !== undefined) {
    meta.url = url.trim()
  }

  // Parse @help
  const help = matchHelp(header)
  if (help !== undefined) {
    meta.help = helpBody(help)
  }
}

/**
A help body without the `*` that starts each comment line.
*/
function helpBody(help: string): string {
  return help
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim()
}

/**
Every value of `@tag`, trimmed, that is not empty.
*/
function nonEmptyTagValues(header: string, tag: string): string[] {
  return matchTagValues(header, tag)
    .map((match) => match.value.trim())
    .filter((value) => value !== '')
}

/**
Parse @noteParam groups: each @noteParam starts a new group; subsequent
@noteType/@noteDir/@noteData/@noteRequire belong to it.
*/
function parseNoteParams(header: string): NoteParam[] {
  const noteParamMatches = matchTagValues(header, 'noteParam')
  return noteParamMatches.map((npMatch, index) => {
    // Get the text between this @noteParam and the next one (or end of header)
    const endIndex = noteParamMatches[index + 1]?.index ?? header.length
    return readNoteParam(npMatch.value.trim(), header.slice(npMatch.end, endIndex))
  })
}

function readNoteParam(name: string, groupBlock: string): NoteParam {
  const noteParam: NoteParam = {
    name,
    type: 'file'
  }

  const noteType = tagText(groupBlock, 'noteType')
  if (noteType) noteParam.type = noteType

  const noteDirectory = tagText(groupBlock, 'noteDir')
  if (noteDirectory) noteParam.dir = noteDirectory

  const noteData = tagText(groupBlock, 'noteData')
  if (noteData) noteParam.data = noteData

  const noteRequireMatch = groupBlock.match(tagRegex(String.raw`noteRequire\s+1`, 'i'))
  if (noteRequireMatch) noteParam.require = true

  return noteParam
}

function parseLocalizations(languages: [string, string][]): Record<string, LocalizedContent> {
  const localizations: Record<string, LocalizedContent> = {}
  for (const [lang, langHeader] of languages) {
    if (!lang) {
      continue
    }

    const locDesc = matchPlugindesc(langHeader)
    const locHelp = matchHelp(langHeader)

    localizations[lang] = {
      description: locDesc === undefined ? '' : joinStarLines(locDesc).trim(),
      help: locHelp === undefined ? '' : helpBody(locHelp)
    }
  }
  return localizations
}

function parseParameters(header: string): PluginParameter[] {
  const parameters: PluginParameter[] = []

  // Match @param blocks - capture full name (may include spaces) to end of line
  // Uses [^\n\r]+ to handle both LF and CRLF line endings
  const paramRegex = tagRegex(
    String.raw`param(?!\S)[^\S\r\n]*([^\n\r]*)([\s\S]*?)(?=${LINE_START}@param\s|${LINE_START}@command\s|$)`,
    'g'
  )
  let match: RegExpExecArray | null

  while ((match = paramRegex.exec(header)) !== null) {
    const rawParamName = stripTrailingStar(present(match[1])).trim()
    // Skip empty @param lines (used as visual separators)
    if (!rawParamName) continue
    parameters.push(readParameter(rawParamName, present(match[2])))
  }

  return parameters
}

function readParameter(rawParamName: string, paramBlock: string): PluginParameter {
  let paramName = rawParamName
  let effectiveBlock = paramBlock

  // Detect single-line compact format (all attributes on one line with the @param)
  if (isCompactFormat(rawParamName)) {
    // Parse name and attributes from the single line
    const parsed = parseCompactParam(rawParamName)
    paramName = parsed.name
    effectiveBlock = parsed.block + '\n' + paramBlock
  }

  const param = readEntry(paramName, effectiveBlock)

  // Parse @parent for nested parameters
  const parent = extractTag(effectiveBlock, 'parent')
  if (parent) param.parent = parent

  readFileFields(param, effectiveBlock)

  // Parse options for select/combo type
  const options = parseOptions(effectiveBlock)
  if (options.length > 0) {
    param.options = options
  }

  readStructReference(param, effectiveBlock)
  readBooleanLabels(param, effectiveBlock)
  return param
}

/**
The fields a parameter and a command argument read alike: name, text, description, type,
default, array element type and the number limits.
*/
function readEntry(name: string, block: string): PluginParameter {
  const rawTypeString = extractTag(block, 'type') || 'string'
  const { type, arrayType, structType: arrayStructType } = parseParamTypeEx(rawTypeString)

  const entry: PluginParameter = {
    id: crypto.randomUUID(),
    name,
    text: extractTag(block, 'text') || name,
    desc: extractTag(block, 'desc'),
    type,
    default: parseDefault(block),
    rawType: rawTypeString === type ? undefined : rawTypeString
  }

  // Set array-specific fields
  if (type === 'array') {
    if (arrayType) entry.arrayType = arrayType
    if (arrayStructType !== undefined) entry.structType = arrayStructType
  }

  // Parse type-specific attributes
  const minMatch = block.match(tagRegex(String.raw`min\s+(-?[\d.]+)`, 'i'))
  if (minMatch) entry.min = leadingNumber(present(minMatch[1]))

  const maxMatch = block.match(tagRegex(String.raw`max\s+(-?[\d.]+)`, 'i'))
  if (maxMatch) entry.max = leadingNumber(present(maxMatch[1]))

  // Parse @decimals
  const decimalsMatch = block.match(tagRegex(String.raw`decimals\s+(\d+)`, 'i'))
  if (decimalsMatch) entry.decimals = Number(present(decimalsMatch[1]))

  return entry
}

/**
Parse @dir for file type and @require for file/animation type.
*/
function readFileFields(entry: PluginParameter, block: string): void {
  const directory = tagText(block, 'dir')
  if (directory) entry.dir = directory

  const requireMatch = block.match(tagRegex(String.raw`require\s+1`, 'i'))
  if (requireMatch) entry.require = true
}

/**
Parse struct reference (only if not already set by array type parsing).
*/
function readStructReference(entry: PluginParameter, block: string): void {
  if (entry.structType !== undefined) return
  const structMatch = block.match(tagRegex(String.raw`type\s+struct<(\w+)>`, 'i'))
  if (structMatch) entry.structType = present(structMatch[1])
}

/**
Parse @on/@off for boolean types.
*/
function readBooleanLabels(entry: PluginParameter, block: string): void {
  if (entry.type !== 'boolean') return

  const onLabel = tagText(block, 'on')
  if (onLabel) entry.onLabel = onLabel

  const offLabel = tagText(block, 'off')
  if (offLabel) entry.offLabel = offLabel
}

function parseCommands(header: string): PluginCommand[] {
  const commands: PluginCommand[] = []

  // Match @command blocks
  const commandRegex = tagRegex(
    String.raw`command(?!\S)[^\S\r\n]*(\S*)([\s\S]*?)(?=${LINE_START}@command\s+\S|\*\/|$)`,
    'g'
  )
  let match: RegExpExecArray | null

  while ((match = commandRegex.exec(header)) !== null) {
    const commandName = present(match[1])
    if (!commandName) continue
    const commandBlock = present(match[2])
    // The command's own tags come before its first @arg
    const firstArg = commandBlock.search(tagRegex(String.raw`arg\s`))
    const commandHead = firstArg === -1 ? commandBlock : commandBlock.slice(0, firstArg)

    const command: PluginCommand = {
      id: crypto.randomUUID(),
      name: commandName,
      text: extractTag(commandHead, 'text') || commandName,
      desc: extractTag(commandHead, 'desc'),
      args: parseArgs(commandBlock)
    }

    commands.push(command)
  }

  return commands
}

function parseArgs(block: string): PluginParameter[] {
  const args: PluginParameter[] = []

  // Arg names can include spaces (same as param names)
  const argRegex = tagRegex(
    String.raw`arg(?!\S)[^\S\r\n]*([^\n\r]*)([\s\S]*?)(?=${LINE_START}@arg\s|${LINE_START}@command\s|$)`,
    'g'
  )
  let match: RegExpExecArray | null

  while ((match = argRegex.exec(block)) !== null) {
    const argName = stripTrailingStar(present(match[1])).trim()
    if (!argName) continue
    args.push(readArg(argName, present(match[2])))
  }

  return args
}

function readArg(argName: string, argBlock: string): PluginParameter {
  const arg = readEntry(argName, argBlock)
  readFileFields(arg, argBlock)

  // Parse struct reference for args (only if not set by array type)
  readStructReference(arg, argBlock)

  // Parse options for select/combo type
  const options = parseOptions(argBlock)
  if (options.length > 0) arg.options = options

  readBooleanLabels(arg, argBlock)
  return arg
}

/**
One struct per name from `[name, lang, block text]` entries: its bare block, else its `:en`
block, else its first block. `/*~struct~Name:ja` and the like are translations of `Name`.
*/
function parseStructs(blocks: [string, string, string][]): PluginStruct[] {
  const names = [...new Set(blocks.map(([name]) => name))]
  return names.map((name) => {
    const own = blocks.filter(([n]) => n === name)
    const structBlock = (own.find(([, lang]) => lang === '') ??
      own.find(([, lang]) => lang === 'en') ??
      present(own[0]))[2]
    return {
      id: crypto.randomUUID(),
      name,
      parameters: parseParameters(structBlock)
    }
  })
}

/**
The value of the first `@tag` without a trailing `*`: '' when the tag has no value or is missing.
*/
function extractTag(block: string, tag: string): string {
  return stripTrailingStar(tagText(block, tag)).trim()
}

/**
The rest of the line after the first `@tag`: '' when the tag has no value or is missing.
*/
function tagText(block: string, tag: string): string {
  return tagValue(block, tag) ?? ''
}

/**
The rest of the line after the first `@tag`: '' when the tag has no value, null without the tag.
*/
function tagValue(block: string, tag: string): string | null {
  const match = block.match(tagRegex(String.raw`${tag}(?!\S)[^\S\r\n]*([^\r\n]*)`, 'i'))
  return match ? present(match[1]).trim() : null
}

/**
Same result as header.match(/<line start>@<tag>(?!\S)[^\S\r\n]*(.*?)(?=\n)/i)?.[1], in linear
time: the spaces after the tag are read once instead of once per space given back to the value.
Unlike tagValue, a value needs a line break after it.
*/
function matchTagValue(header: string, tag: string): string | undefined {
  return nextTagValue(header, tagValueStart(tag))?.value
}

/**
Same results as header.matchAll(/<line start>@<tag>(?!\S)[^\S\r\n]*(.*?)(?=\n)/gi) (index, end
of the match, group 1), in linear time, as matchTagValue reads them.
*/
function matchTagValues(header: string, tag: string): TagValue[] {
  const start = tagValueStart(tag)
  const values: TagValue[] = []
  for (let v = nextTagValue(header, start); v !== undefined; v = nextTagValue(header, start)) {
    values.push(v)
  }
  return values
}

/**
Detect whether a raw param name line uses compact single-line format.
e.g. "disableLoggingSwitch @text ログ記録無効スイッチ @type switch @default 0"
*/
function isCompactFormat(rawName: string): boolean {
  // If the "name" contains @text, @type, @desc, etc., it's compact format
  return COMPACT_PARAM_TAG.test(rawName)
}

/**
Parse a compact single-line parameter definition into name + pseudo-block.
Input: "disableLoggingSwitch @text ログ記録無効スイッチ @type switch @default 0"
Output: { name: "disableLoggingSwitch", block: "@text ログ...\n@type switch\n@default 0" }
*/
function parseCompactParam(rawLine: string): { name: string; block: string } {
  // Find the first @ tag to split name from attributes
  const firstTagIndex = rawLine.search(
    /@(?:text|type|desc|default|min|max|dir|parent|on|off|option|value|decimals)\s/i
  )
  if (firstTagIndex === -1) {
    return { name: rawLine.trim(), block: '' }
  }

  const name = rawLine.slice(0, firstTagIndex).trim()
  const attributesPart = rawLine.slice(firstTagIndex)

  // Split inline attributes into separate lines for standard parsing.
  // Matches @tag followed by value up to next @tag or end.
  const block = attributesPart
    .replaceAll(
      /@(?=text\s|type\s|desc\s|default\s|min\s|max\s|dir\s|parent\s|on\s|off\s|option\s|value\s|decimals\s|require\s)/gi,
      '\n@'
    )
    .trim()

  return { name, block }
}

/**
Extended type parser that also handles arrays and returns structured info.
Returns the ParamType, plus arrayType and structType for arrays.
*/
function parseParamTypeEx(typeString: string): {
  type: ParamType
  arrayType?: ParamType
  structType?: string
} {
  const trimmed = typeString.trim()
  const normalized = trimmed.toLowerCase()

  // Check for array types first (e.g., "struct<Gauge>[]", "select[]", "String[]")
  if (normalized.includes('[]')) {
    const baseString = trimmed.replace(/\[\]$/, '')
    const baseNormalized = baseString.toLowerCase()

    // Array of structs: struct<Name>[]
    const structArrayMatch = /^struct<(\w+)>$/i.exec(baseString)
    if (structArrayMatch) {
      return { type: 'array', arrayType: 'struct', structType: present(structArrayMatch[1]) }
    }

    // Array of other types
    const baseType = parseSingleType(baseNormalized)
    return { type: 'array', arrayType: baseType }
  }

  // Check for struct (non-array)
  const structMatch = /^struct<(\w+)>$/i.exec(trimmed)
  return structMatch
    ? { type: 'struct', structType: present(structMatch[1]) }
    : { type: parseSingleType(normalized) }
}

/**
The ParamType of each lower-case type string a single (non-array, non-struct) type is written
as; any other is a string.
*/
const SINGLE_TYPES = new Map<string, ParamType>([
  ['number', 'number'],
  ['num', 'number'],
  ['boolean', 'boolean'],
  ['bool', 'boolean'],
  ['select', 'select'],
  ['combo', 'combo'],
  ['variable', 'variable'],
  ['switch', 'switch'],
  ['actor', 'actor'],
  ['class', 'class'],
  ['skill', 'skill'],
  ['item', 'item'],
  ['weapon', 'weapon'],
  ['armor', 'armor'],
  ['enemy', 'enemy'],
  ['troop', 'troop'],
  ['state', 'state'],
  ['animation', 'animation'],
  ['tileset', 'tileset'],
  ['common_event', 'common_event'],
  ['file', 'file'],
  ['icon', 'icon'],
  ['map', 'map'],
  ['location', 'location'],
  ['note', 'note'],
  ['multiline_string', 'note'],
  ['color', 'color'],
  ['text', 'text'],
  ['hidden', 'hidden']
])

/**
Parse a single (non-array, non-struct) type string into a ParamType.
*/
function parseSingleType(normalizedType: string): ParamType {
  return SINGLE_TYPES.get(normalizedType) ?? 'string'
}

// A default written as a decimal number
const DEFAULT_NUMBER = /^-?\d+(?:\.\d+)?$/

/**
The `@default` value: `true`/`false` (any case) as a boolean, a decimal number as a number, any
other text as written, '' without the tag.
*/
function parseDefault(block: string): string | number | boolean {
  const value = tagValue(block, 'default') ?? ''
  const lower = value.toLowerCase()
  let result: string | number | boolean = value
  if (lower === 'true') result = true
  else if (lower === 'false') result = false
  else if (DEFAULT_NUMBER.test(value)) result = Number(value)
  return result
}

function parseOptions(block: string): { value: string; text: string }[] {
  const options: { value: string; text: string }[] = []

  const optionRegex = tagRegex(String.raw`option(?!\S)[^\S\r\n]*([^\n\r]*)`, 'gi')
  let match: RegExpExecArray | null

  while ((match = optionRegex.exec(block)) !== null) {
    const optText = present(match[1]).trim()
    // Only look for @value between this @option and the next @option (or end of block)
    const afterOption = match.index + match[0].length
    const nextOptionMatch = block.slice(afterOption).search(tagRegex(String.raw`option\s`, 'i'))
    const searchEnd = nextOptionMatch === -1 ? block.length : afterOption + nextOptionMatch
    const searchSlice = block.slice(afterOption, searchEnd)
    const value = tagValue(searchSlice, 'value') ?? optText

    options.push({ value, text: optText })
  }

  return options
}

/**
Reads an RPG Maker MZ plugin file into a plugin definition (`parsePlugin`); the other members
are the parser's linear-time readers, which run inside it.
*/
export const PluginParser = { parsePlugin, matchWrapperClose, matchTagValue, matchTagValues }
