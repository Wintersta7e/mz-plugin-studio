import type {
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  PluginStruct,
  ParamType,
  LocalizedContent,
  NoteParam
} from '../../shared/types/plugin'
import { findAnnotationBlocks } from '../../shared/annotation-blocks'
import type { AnnotationBlock } from '../../shared/annotation-blocks'

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

/** Same result as header.match(/@help\s*([\s\S]*?)(?=\n\s*\*\s*@[a-z]|\n\s*\*\/)/i)?.[1], in linear time. */
export function matchHelp(header: string): string | undefined {
  const n = header.length
  const isWs = (i: number): boolean => i < n && /\s/.test(header[i])
  // nextNonWs[i]: first index >= i that is not whitespace (n if none)
  const nextNonWs = new Int32Array(n + 1)
  nextNonWs[n] = n
  for (let i = n - 1; i >= 0; i--) nextNonWs[i] = isWs(i) ? nextNonWs[i + 1] : i
  // A help body ends before a newline followed by `*` and then a tag (`@` + letter) or `/`
  const endsAt = (p: number): boolean => {
    if (header[p] !== '\n') return false
    const star = nextNonWs[p + 1]
    if (header[star] !== '*') return false
    if (header[star + 1] === '/') return true
    const at = nextNonWs[star + 1]
    return header[at] === '@' && at + 1 < n && /[a-z]/i.test(header[at + 1])
  }
  // nextEnd[p]: first index >= p where the body can end (-1 if none)
  const nextEnd = new Int32Array(n + 1)
  nextEnd[n] = -1
  for (let p = n - 1; p >= 0; p--) nextEnd[p] = endsAt(p) ? p : nextEnd[p + 1]
  for (const m of header.matchAll(/@help/gi)) {
    const s0 = m.index + m[0].length
    const e = nextNonWs[s0]
    if (nextEnd[e] !== -1) return header.slice(e, nextEnd[e])
    // The regex gives back leading whitespace to reach an end inside it, capturing nothing
    if (nextEnd[s0] !== -1 && nextEnd[s0] < e) return ''
  }
  return undefined
}

/** Same result as value.replace(/\s*\*?\s*$/, ''), in linear time. */
export function stripTrailingStar(value: string): string {
  const trimmed = value.trimEnd()
  return trimmed.endsWith('*') ? trimmed.slice(0, -1).trimEnd() : trimmed
}

export class PluginParser {
  static parsePlugin(content: string, filename?: string): PluginDefinition {
    // Values are read from an LF copy, so a CRLF file parses the same as its LF twin
    const text = content.replace(/\r\n/g, '\n')
    const blocks = findAnnotationBlocks(text)
    const inner = (b: AnnotationBlock): string => text.slice(b.start + b.opener.length, b.end - 2)
    const headers = blocks.filter((b) => b.kind !== 'struct')
    const main = headers.find((b) => b.kind === 'main')
    // Without a main block, parameters and commands are shown from the first language block
    const source = main ?? headers[0]
    const sourceText = source === undefined ? '' : inner(source)

    const meta = this.parseMeta(
      text,
      main === undefined ? '' : inner(main),
      headers.filter((b) => b.kind === 'language').map((b): [string, string] => [b.lang, inner(b)])
    )
    const parameters = this.parseParameters(sourceText)
    const commands = this.parseCommands(sourceText)
    const structs = this.parseStructs(
      blocks
        .filter((b) => b.kind === 'struct')
        .map((b): [string, string, string] => [b.structName ?? '', b.lang, inner(b)])
    )
    const codeBody = this.extractCodeBody(content)
    const customCode = this.extractCustomCode(codeBody)

    // Plugin name comes from filename (most reliable) or fallback to parsed meta
    let pluginName = meta.name
    if (filename) {
      // Strip .js extension to get plugin name
      pluginName = filename.replace(/\.js$/i, '')
    }

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
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
   * Extract the code body (implementation) from the plugin content: the text outside every
   * annotation block, as written.
   */
  private static extractCodeBody(content: string): string {
    let codeBody = ''
    let at = 0
    for (const block of findAnnotationBlocks(content)) {
      codeBody += content.slice(at, block.start)
      at = block.end
    }
    return (codeBody + content.slice(at)).trim()
  }

  /**
   * Extract custom code from the code body.
   * This attempts to find user-written code after the boilerplate sections
   * (parameter parsing and command registration).
   *
   * Heuristics used:
   * 1. Unwrap IIFE wrapper if present, so heuristics work on inner content
   * 2. Look for common markers like "// Custom", "// Plugin code", etc.
   * 3. Look for code after the last PluginManager.registerCommand block
   * 4. Look for code after PluginManager.parameters parsing
   * 5. If no boilerplate detected, return the entire (unwrapped) body
   */
  private static extractCustomCode(codeBody: string): string {
    if (!codeBody) return ''

    // Unwrap IIFE if present - work with inner content to avoid
    // trailing })(); contaminating extracted code
    const innerCode = this.unwrapIIFE(codeBody)
    const workingCode = innerCode ?? codeBody

    // Look for explicit custom code markers
    const customMarkers = [
      /\/\/\s*custom\s*(?:plugin\s*)?code/i,
      /\/\/\s*your\s*code\s*here/i,
      /\/\/\s*implementation/i,
      /\/\/\s*main\s*(?:plugin\s*)?logic/i,
      /\/\/\s*===+\s*custom/i,
      /\/\/\s*---+\s*custom/i
    ]

    for (const marker of customMarkers) {
      const match = workingCode.match(marker)
      if (match && match.index !== undefined) {
        return workingCode.slice(match.index).trim()
      }
    }

    // Try to find the end of boilerplate sections
    // Look for the last registerCommand block
    const lastRegisterCommand = workingCode.lastIndexOf('PluginManager.registerCommand')
    if (lastRegisterCommand !== -1) {
      const afterRegister = workingCode.slice(lastRegisterCommand)
      const closingIndex = this.findBlockEnd(afterRegister)
      if (closingIndex !== -1) {
        const afterBlock = workingCode.slice(lastRegisterCommand + closingIndex + 1).trim()
        if (afterBlock) return afterBlock
      }
    }

    // Look for code after parameter parsing section
    // Match various patterns: params["x"], parameters["x"], PluginManager.parameters(...)
    const paramsEndMarkers = [
      /const\s+\w+\s*=\s*(?:params|parameters|param)\[["']/g,
      /PluginManager\.parameters\(/g,
      /PluginManagerEx\.createParameter\(/g
    ]

    let lastParamLine = -1
    for (const marker of paramsEndMarkers) {
      let match
      while ((match = marker.exec(workingCode)) !== null) {
        const lineEnd = workingCode.indexOf('\n', match.index)
        if (lineEnd > lastParamLine) lastParamLine = lineEnd
      }
    }

    if (lastParamLine !== -1 && lastRegisterCommand === -1) {
      const afterParams = workingCode.slice(lastParamLine + 1).trim()
      if (afterParams) return afterParams
    }

    // No boilerplate detected - return the entire working content
    if (workingCode.trim()) {
      return workingCode.trim()
    }

    return ''
  }

  /**
   * Unwrap an IIFE wrapper, returning the inner content.
   * Handles: (() => { ... })(); and (function() { ... })();
   * Returns null if the code is not wrapped in an IIFE.
   */
  private static unwrapIIFE(code: string): string | null {
    // Check for IIFE opening pattern
    const iifeOpen = code.match(/^\s*\(\s*(?:\(\s*\)\s*=>|function\s*\(\s*\))\s*\{/)
    if (!iifeOpen) return null

    // Check for IIFE closing pattern at the end
    const iifeClose = code.match(/\}\s*\)\s*\(\s*\)\s*;?\s*$/)
    if (!iifeClose || iifeClose.index === undefined) return null

    // Extract inner content between opening { and closing }
    const innerStart = iifeOpen[0].length
    const innerEnd = iifeClose.index
    if (innerEnd <= innerStart) return null

    const inner = code.slice(innerStart, innerEnd)

    // Dedent: find the minimum indentation and remove it
    const lines = inner.split('\n')
    let minIndent = Infinity
    for (const line of lines) {
      if (line.trim().length === 0) continue
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0
      if (indent < minIndent) minIndent = indent
    }
    if (minIndent > 0 && minIndent < Infinity) {
      return lines
        .map((line) => line.slice(minIndent))
        .join('\n')
        .trim()
    }
    return inner.trim()
  }

  /**
   * Find the end of a code block (matching closing brace and parenthesis for registerCommand)
   */
  private static findBlockEnd(code: string): number {
    let braceCount = 0
    let inString = false
    let stringChar = ''

    for (let i = 0; i < code.length; i++) {
      const char = code[i]

      // Count consecutive backslashes before this character
      let backslashes = 0
      for (let j = i - 1; j >= 0 && code[j] === '\\'; j--) backslashes++
      const isEscaped = backslashes % 2 !== 0

      // Handle string literals
      if ((char === '"' || char === "'" || char === '`') && !isEscaped) {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
        }
        continue
      }

      if (inString) continue

      if (char === '{') braceCount++
      if (char === '}') {
        braceCount--
        // Found the closing of registerCommand's function block
        if (braceCount === 0) {
          // Look for the closing );
          const rest = code.slice(i + 1)
          const closeMatch = rest.match(/^\s*\)\s*;?/)
          if (closeMatch) {
            return i + 1 + closeMatch[0].length
          }
          return i
        }
      }
    }

    return -1
  }

  private static parseMeta(
    content: string,
    header: string,
    languages: [string, string][]
  ): ParsedMeta {
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
      localizations: {}
    }

    const localizations = this.parseLocalizations(languages)
    if (!header) return { ...meta, localizations }

    // Parse @plugindesc
    const descMatch = header.match(/@plugindesc(?!\S)[^\S\r\n]*(.*?)(?=\n\s*\*\s*@|\n\s*\*\/)/s)
    if (descMatch) {
      meta.description = descMatch[1].replace(/\n\s*\*\s*/g, ' ').trim()
    }

    // Parse @author
    const authorMatch = header.match(/@author(?!\S)[^\S\r\n]*(.*?)(?=\n)/i)
    if (authorMatch) {
      meta.author = authorMatch[1].trim()
    }

    // Parse @target
    const targetMatch = header.match(/@target(?!\S)[^\S\r\n]*(.*?)(?=\n)/i)
    if (targetMatch) {
      meta.target = targetMatch[1].trim()
    }

    // Parse @url
    const urlMatch = header.match(/@url(?!\S)[^\S\r\n]*(.*?)(?=\n)/i)
    if (urlMatch) {
      meta.url = urlMatch[1].trim()
    }

    // Parse @help
    const help = matchHelp(header)
    if (help !== undefined) {
      meta.help = help
        .split('\n')
        .map((line) => line.replace(/^\s*\*\s?/, ''))
        .join('\n')
        .trim()
    }

    // Parse @base (dependencies)
    const baseMatches = header.matchAll(/@base(?!\S)[^\S\r\n]*(.*?)(?=\n)/gi)
    for (const match of baseMatches) {
      const value = match[1].trim()
      if (value) meta.dependencies.push(value)
    }

    // Parse @orderAfter (same pattern as @base)
    const orderMatches = header.matchAll(/@orderAfter(?!\S)[^\S\r\n]*(.*?)(?=\n)/gi)
    for (const match of orderMatches) {
      const value = match[1].trim()
      if (value) meta.orderAfter.push(value)
    }

    // Parse @orderBefore (same pattern as @orderAfter)
    const orderBeforeMatches = header.matchAll(/@orderBefore(?!\S)[^\S\r\n]*(.*?)(?=\n)/gi)
    for (const match of orderBeforeMatches) {
      const value = match[1].trim()
      if (value) meta.orderBefore.push(value)
    }

    // Parse @requiredAssets (assets preserved during "Exclude unused files" deploy)
    // Also match a final entry that lacks a trailing newline (right before */).
    const requiredAssetMatches = header.matchAll(
      /@requiredAssets(?!\S)[^\S\r\n]*(.*?)(?=\n|\r|\*\/|$)/gi
    )
    for (const match of requiredAssetMatches) {
      const value = stripTrailingStar(match[1]).trim()
      if (value) meta.requiredAssets.push(value)
    }

    // Parse @noteParam groups
    // Each @noteParam starts a new group; subsequent @noteType/@noteDir/@noteData/@noteRequire belong to it
    const noteParamMatches = [...header.matchAll(/@noteParam(?!\S)[^\S\r\n]*(.*?)(?=\n)/gi)]
    for (let i = 0; i < noteParamMatches.length; i++) {
      const npMatch = noteParamMatches[i]
      // Get the text between this @noteParam and the next one (or end of header)
      const startIdx = npMatch.index! + npMatch[0].length
      const endIdx =
        i + 1 < noteParamMatches.length ? noteParamMatches[i + 1].index! : header.length
      const groupBlock = header.slice(startIdx, endIdx)

      const noteParam: NoteParam = {
        name: npMatch[1].trim(),
        type: 'file'
      }

      const noteType = this.tagValue(groupBlock, 'noteType')
      if (noteType) noteParam.type = noteType

      const noteDir = this.tagValue(groupBlock, 'noteDir')
      if (noteDir) noteParam.dir = noteDir

      const noteData = this.tagValue(groupBlock, 'noteData')
      if (noteData) noteParam.data = noteData

      const noteRequireMatch = groupBlock.match(/@noteRequire\s+1/i)
      if (noteRequireMatch) noteParam.require = true

      meta.noteParams.push(noteParam)
    }

    // Infer name from filename comment or plugin structure
    const nameMatch = content.match(/\*\s+@plugindesc[\s\S]*?(\w+)\.js/i)
    if (nameMatch) {
      meta.name = nameMatch[1]
    }

    meta.localizations = localizations
    return meta
  }

  private static parseLocalizations(
    languages: [string, string][]
  ): Record<string, LocalizedContent> {
    const localizations: Record<string, LocalizedContent> = {}
    for (const [lang, langHeader] of languages) {
      if (lang) {
        const locDesc = langHeader.match(
          /@plugindesc(?!\S)[^\S\r\n]*(.*?)(?=\n\s*\*\s*@|\n\s*\*\/)/s
        )
        const locHelp = matchHelp(langHeader)

        localizations[lang] = {
          description: locDesc ? locDesc[1].replace(/\n\s*\*\s*/g, ' ').trim() : '',
          help:
            locHelp !== undefined
              ? locHelp
                  .split('\n')
                  .map((line) => line.replace(/^\s*\*\s?/, ''))
                  .join('\n')
                  .trim()
              : ''
        }
      }
    }
    return localizations
  }

  private static parseParameters(header: string): PluginParameter[] {
    const parameters: PluginParameter[] = []

    // Match @param blocks - capture full name (may include spaces) to end of line
    // Uses [^\n\r]+ to handle both LF and CRLF line endings
    const paramRegex =
      /@param(?!\S)[^\S\r\n]*([^\n\r]*)([\s\S]*?)(?=\*\s*@param\s|\*\s*@command\s|$)/g
    let match

    while ((match = paramRegex.exec(header)) !== null) {
      const rawParamName = stripTrailingStar(match[1]).trim()
      // Skip empty @param lines (used as visual separators)
      if (!rawParamName) continue
      const paramBlock = match[2]

      // Detect single-line compact format (all attributes on one line with the @param)
      const isCompact = this.isCompactFormat(rawParamName)
      let paramName: string
      let effectiveBlock: string

      if (isCompact) {
        // Parse name and attributes from the single line
        const parsed = this.parseCompactParam(rawParamName)
        paramName = parsed.name
        effectiveBlock = parsed.block + '\n' + paramBlock
      } else {
        paramName = rawParamName
        effectiveBlock = paramBlock
      }

      const rawTypeStr = this.extractTag(effectiveBlock, 'type') || 'string'
      const { type, arrayType, structType: arrayStructType } = this.parseParamTypeEx(rawTypeStr)

      const param: PluginParameter = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
        name: paramName,
        text: this.extractTag(effectiveBlock, 'text') || paramName,
        desc: this.extractTag(effectiveBlock, 'desc') || '',
        type,
        default: this.parseDefault(effectiveBlock),
        rawType: rawTypeStr !== type ? rawTypeStr : undefined
      }

      // Set array-specific fields
      if (type === 'array') {
        if (arrayType) param.arrayType = arrayType
        if (arrayStructType) param.structType = arrayStructType
      }

      // Parse type-specific attributes
      const minMatch = effectiveBlock.match(/@min\s+(-?[\d.]+)/i)
      if (minMatch) param.min = parseFloat(minMatch[1])

      const maxMatch = effectiveBlock.match(/@max\s+(-?[\d.]+)/i)
      if (maxMatch) param.max = parseFloat(maxMatch[1])

      // Parse @decimals
      const decimalsMatch = effectiveBlock.match(/@decimals\s+(\d+)/i)
      if (decimalsMatch) param.decimals = parseInt(decimalsMatch[1], 10)

      // Parse @parent for nested parameters
      const parent = this.extractTag(effectiveBlock, 'parent')
      if (parent) param.parent = parent

      // Parse @dir for file type
      const dir = this.tagValue(effectiveBlock, 'dir')
      if (dir) param.dir = dir

      // Parse @require for file/animation type
      const requireMatch = effectiveBlock.match(/@require\s+1/i)
      if (requireMatch) param.require = true

      // Parse options for select/combo type
      const options = this.parseOptions(effectiveBlock)
      if (options.length > 0) {
        param.options = options
      }

      // Parse struct reference (only if not already set by array type parsing)
      if (!param.structType) {
        const structMatch = effectiveBlock.match(/@type\s+struct<(\w+)>/i)
        if (structMatch) {
          param.structType = structMatch[1]
        }
      }

      // Parse @on/@off for boolean types
      if (param.type === 'boolean') {
        const onLabel = this.tagValue(effectiveBlock, 'on')
        if (onLabel) param.onLabel = onLabel

        const offLabel = this.tagValue(effectiveBlock, 'off')
        if (offLabel) param.offLabel = offLabel
      }

      parameters.push(param)
    }

    return parameters
  }

  private static parseCommands(header: string): PluginCommand[] {
    const commands: PluginCommand[] = []

    // Match @command blocks
    const cmdRegex = /@command(?!\S)[^\S\r\n]*(\S*)([\s\S]*?)(?=@command\s+\S|\*\/|$)/g
    let match

    while ((match = cmdRegex.exec(header)) !== null) {
      const cmdName = match[1]
      if (!cmdName) continue
      const cmdBlock = match[2]
      // The command's own tags come before its first @arg
      const firstArg = cmdBlock.search(/@arg\s/)
      const cmdHead = firstArg === -1 ? cmdBlock : cmdBlock.slice(0, firstArg)

      const command: PluginCommand = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
        name: cmdName,
        text: this.extractTag(cmdHead, 'text') || cmdName,
        desc: this.extractTag(cmdHead, 'desc') || '',
        args: this.parseArgs(cmdBlock)
      }

      commands.push(command)
    }

    return commands
  }

  private static parseArgs(block: string): PluginParameter[] {
    const args: PluginParameter[] = []

    // Arg names can include spaces (same as param names)
    const argRegex = /@arg(?!\S)[^\S\r\n]*([^\n\r]*)([\s\S]*?)(?=\*\s*@arg\s|\*\s*@command\s|$)/g
    let match

    while ((match = argRegex.exec(block)) !== null) {
      const argName = stripTrailingStar(match[1]).trim()
      if (!argName) continue
      const argBlock = match[2]

      const rawTypeStr = this.extractTag(argBlock, 'type') || 'string'
      const { type, arrayType, structType: arrayStructType } = this.parseParamTypeEx(rawTypeStr)

      const arg: PluginParameter = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
        name: argName,
        text: this.extractTag(argBlock, 'text') || argName,
        desc: this.extractTag(argBlock, 'desc') || '',
        type,
        default: this.parseDefault(argBlock),
        rawType: rawTypeStr !== type ? rawTypeStr : undefined
      }

      // Set array-specific fields
      if (type === 'array') {
        if (arrayType) arg.arrayType = arrayType
        if (arrayStructType) arg.structType = arrayStructType
      }

      // Parse type-specific attributes for args
      const minMatch = argBlock.match(/@min\s+(-?[\d.]+)/i)
      if (minMatch) arg.min = parseFloat(minMatch[1])

      const maxMatch = argBlock.match(/@max\s+(-?[\d.]+)/i)
      if (maxMatch) arg.max = parseFloat(maxMatch[1])

      const decimalsMatch = argBlock.match(/@decimals\s+(\d+)/i)
      if (decimalsMatch) arg.decimals = parseInt(decimalsMatch[1], 10)

      const dir = this.tagValue(argBlock, 'dir')
      if (dir) arg.dir = dir

      // Parse @require for file/animation type
      const requireMatch = argBlock.match(/@require\s+1/i)
      if (requireMatch) arg.require = true

      // Parse struct reference for args (only if not set by array type)
      if (!arg.structType) {
        const structMatch = argBlock.match(/@type\s+struct<(\w+)>/i)
        if (structMatch) arg.structType = structMatch[1]
      }

      // Parse options for select/combo type
      const options = this.parseOptions(argBlock)
      if (options.length > 0) arg.options = options

      // Parse @on/@off for boolean types
      if (arg.type === 'boolean') {
        const onLabel = this.tagValue(argBlock, 'on')
        if (onLabel) arg.onLabel = onLabel

        const offLabel = this.tagValue(argBlock, 'off')
        if (offLabel) arg.offLabel = offLabel
      }

      args.push(arg)
    }

    return args
  }

  /**
   * One struct per name from `[name, lang, block text]` entries: its bare block, else its `:en`
   * block, else its first block. `/*~struct~Name:ja` and the like are translations of `Name`.
   */
  private static parseStructs(blocks: [string, string, string][]): PluginStruct[] {
    const names = [...new Set(blocks.map(([name]) => name))]
    return names.map((name) => {
      const own = blocks.filter(([n]) => n === name)
      const [, , structBlock] =
        own.find(([, lang]) => lang === '') ?? own.find(([, lang]) => lang === 'en') ?? own[0]
      return {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
        name,
        parameters: this.parseParameters(structBlock)
      }
    })
  }

  private static extractTag(block: string, tag: string): string | null {
    const value = this.tagValue(block, tag)
    return value === null ? null : stripTrailingStar(value).trim()
  }

  /** The rest of the line after the first `@tag`: '' when the tag has no value, null without the tag. */
  private static tagValue(block: string, tag: string): string | null {
    const match = block.match(new RegExp(`@${tag}(?!\\S)[^\\S\\r\\n]*([^\\r\\n]*)`, 'i'))
    return match ? match[1].trim() : null
  }

  /**
   * Detect whether a raw param name line uses compact single-line format.
   * e.g. "disableLoggingSwitch @text ログ記録無効スイッチ @type switch @default 0"
   */
  private static isCompactFormat(rawName: string): boolean {
    // If the "name" contains @text, @type, @desc, etc., it's compact format
    return /@(?:text|type|desc|default|min|max|dir|parent|on|off|option|decimals)\s/i.test(rawName)
  }

  /**
   * Parse a compact single-line parameter definition into name + pseudo-block.
   * Input: "disableLoggingSwitch @text ログ記録無効スイッチ @type switch @default 0"
   * Output: { name: "disableLoggingSwitch", block: "@text ログ...\n@type switch\n@default 0" }
   */
  private static parseCompactParam(rawLine: string): { name: string; block: string } {
    // Find the first @ tag to split name from attributes
    const firstTagIdx = rawLine.search(
      /@(?:text|type|desc|default|min|max|dir|parent|on|off|option|value|decimals)\s/i
    )
    if (firstTagIdx === -1) {
      return { name: rawLine.trim(), block: '' }
    }

    const name = rawLine.slice(0, firstTagIdx).trim()
    const attrsPart = rawLine.slice(firstTagIdx)

    // Split inline attributes into separate lines for standard parsing.
    // Matches @tag followed by value up to next @tag or end.
    const block = attrsPart
      .replace(
        /@(?=text\s|type\s|desc\s|default\s|min\s|max\s|dir\s|parent\s|on\s|off\s|option\s|value\s|decimals\s)/gi,
        '\n@'
      )
      .trim()

    return { name, block }
  }

  /**
   * Extended type parser that also handles arrays and returns structured info.
   * Returns the ParamType, plus arrayType and structType for arrays.
   */
  private static parseParamTypeEx(typeStr: string): {
    type: ParamType
    arrayType?: ParamType
    structType?: string
  } {
    const trimmed = typeStr.trim()
    const normalized = trimmed.toLowerCase()

    // Check for array types first (e.g., "struct<Gauge>[]", "select[]", "String[]")
    if (normalized.includes('[]')) {
      const baseStr = trimmed.replace(/\[\]$/, '')
      const baseNormalized = baseStr.toLowerCase()

      // Array of structs: struct<Name>[]
      const structArrayMatch = baseStr.match(/^struct<(\w+)>$/i)
      if (structArrayMatch) {
        return { type: 'array', arrayType: 'struct', structType: structArrayMatch[1] }
      }

      // Array of other types
      const baseType = this.parseSingleType(baseNormalized)
      return { type: 'array', arrayType: baseType }
    }

    // Check for struct (non-array)
    const structMatch = trimmed.match(/^struct<(\w+)>$/i)
    if (structMatch) {
      return { type: 'struct', structType: structMatch[1] }
    }

    return { type: this.parseSingleType(normalized) }
  }

  /**
   * Parse a single (non-array, non-struct) type string into a ParamType.
   */
  private static parseSingleType(normalizedType: string): ParamType {
    if (normalizedType === 'number' || normalizedType === 'num') return 'number'
    if (normalizedType === 'boolean' || normalizedType === 'bool') return 'boolean'
    if (normalizedType === 'select') return 'select'
    if (normalizedType === 'combo') return 'combo'
    if (normalizedType === 'variable') return 'variable'
    if (normalizedType === 'switch') return 'switch'
    if (normalizedType === 'actor') return 'actor'
    if (normalizedType === 'class') return 'class'
    if (normalizedType === 'skill') return 'skill'
    if (normalizedType === 'item') return 'item'
    if (normalizedType === 'weapon') return 'weapon'
    if (normalizedType === 'armor') return 'armor'
    if (normalizedType === 'enemy') return 'enemy'
    if (normalizedType === 'troop') return 'troop'
    if (normalizedType === 'state') return 'state'
    if (normalizedType === 'animation') return 'animation'
    if (normalizedType === 'tileset') return 'tileset'
    if (normalizedType === 'common_event') return 'common_event'
    if (normalizedType === 'file') return 'file'
    if (normalizedType === 'icon') return 'icon'
    if (normalizedType === 'map') return 'map'
    if (normalizedType === 'location') return 'location'
    if (normalizedType === 'note' || normalizedType === 'multiline_string') return 'note'
    if (normalizedType === 'color') return 'color'
    if (normalizedType === 'text') return 'text'
    if (normalizedType === 'hidden') return 'hidden'

    return 'string'
  }

  private static parseDefault(block: string): string | number | boolean {
    const value = this.tagValue(block, 'default')
    if (value === null) return ''

    // Boolean
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false

    // Number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value)
    }

    return value
  }

  private static parseOptions(block: string): { value: string; text: string }[] {
    const options: { value: string; text: string }[] = []

    const optionRegex = /@option(?!\S)[^\S\r\n]*([^\n\r]*)/gi
    let match

    while ((match = optionRegex.exec(block)) !== null) {
      const optText = match[1].trim()
      // Only look for @value between this @option and the next @option (or end of block)
      const afterOption = match.index + match[0].length
      const nextOptionMatch = block.slice(afterOption).search(/@option\s/i)
      const searchEnd = nextOptionMatch !== -1 ? afterOption + nextOptionMatch : block.length
      const searchSlice = block.slice(afterOption, searchEnd)
      const value = this.tagValue(searchSlice, 'value') ?? optText

      options.push({ value, text: optText })
    }

    return options
  }
}
