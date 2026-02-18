import type {
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  PluginStruct,
  ParamType,
  LocalizedContent,
  NoteParam
} from '../../renderer/src/types/plugin'

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
  localizations: Record<string, LocalizedContent>
}

export class PluginParser {
  static parsePlugin(content: string, filename?: string): PluginDefinition {
    const meta = this.parseMeta(content)
    const parameters = this.parseParameters(content)
    const commands = this.parseCommands(content)
    const structs = this.parseStructs(content)
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
   * Extract the code body (implementation) from the plugin content.
   * This is everything after the last comment block (header or struct).
   */
  private static extractCodeBody(content: string): string {
    // Find the last closing comment marker (*/)
    const lastCommentEnd = content.lastIndexOf('*/')
    if (lastCommentEnd === -1) {
      // No comment blocks found, entire content is code
      return content.trim()
    }

    // Get everything after the last comment block
    const codeBody = content.slice(lastCommentEnd + 2).trim()
    return codeBody
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
      /\/\/\s*custom\s*(plugin)?\s*code/i,
      /\/\/\s*your\s*code\s*here/i,
      /\/\/\s*implementation/i,
      /\/\/\s*main\s*(plugin)?\s*logic/i,
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
    const iifeOpen = code.match(
      /^\s*\(\s*(?:\(\s*\)\s*=>|function\s*\(\s*\))\s*\{/
    )
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
      return lines.map((line) => line.slice(minIndent)).join('\n').trim()
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
      const prevChar = i > 0 ? code[i - 1] : ''

      // Handle string literals
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
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

  private static parseMeta(content: string): ParsedMeta {
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
      localizations: {}
    }

    // Parse all language headers
    const headers = this.parseAllHeaders(content)
    const header = headers.get('en') || headers.get('') || ''
    if (!header) return meta

    // Parse @plugindesc
    const descMatch = header.match(/@plugindesc\s+(.+?)(?=\n\s*\*\s*@|\n\s*\*\/)/s)
    if (descMatch) {
      meta.description = descMatch[1].trim().replace(/\n\s*\*\s*/g, ' ')
    }

    // Parse @author
    const authorMatch = header.match(/@author\s+(.+?)(?=\n)/i)
    if (authorMatch) {
      meta.author = authorMatch[1].trim()
    }

    // Parse @target
    const targetMatch = header.match(/@target\s+(.+?)(?=\n)/i)
    if (targetMatch) {
      meta.target = targetMatch[1].trim()
    }

    // Parse @url
    const urlMatch = header.match(/@url\s+(.+?)(?=\n)/i)
    if (urlMatch) {
      meta.url = urlMatch[1].trim()
    }

    // Parse @help
    const helpMatch = header.match(/@help\s*([\s\S]*?)(?=\n\s*\*\s*@[a-z]|\n\s*\*\/)/i)
    if (helpMatch) {
      meta.help = helpMatch[1]
        .split('\n')
        .map((line) => line.replace(/^\s*\*\s?/, ''))
        .join('\n')
        .trim()
    }

    // Parse @base (dependencies)
    const baseMatches = header.matchAll(/@base\s+(.+?)(?=\n)/gi)
    for (const match of baseMatches) {
      meta.dependencies.push(match[1].trim())
    }

    // Parse @orderAfter (same pattern as @base)
    const orderMatches = header.matchAll(/@orderAfter\s+(.+?)(?=\n)/gi)
    for (const match of orderMatches) {
      meta.orderAfter.push(match[1].trim())
    }

    // Parse @orderBefore (same pattern as @orderAfter)
    const orderBeforeMatches = header.matchAll(/@orderBefore\s+(.+?)(?=\n)/gi)
    for (const match of orderBeforeMatches) {
      meta.orderBefore.push(match[1].trim())
    }

    // Parse @noteParam groups
    // Each @noteParam starts a new group; subsequent @noteType/@noteDir/@noteData/@noteRequire belong to it
    const noteParamMatches = [...header.matchAll(/@noteParam\s+(.+?)(?=\n)/gi)]
    for (let i = 0; i < noteParamMatches.length; i++) {
      const npMatch = noteParamMatches[i]
      // Get the text between this @noteParam and the next one (or end of header)
      const startIdx = npMatch.index! + npMatch[0].length
      const endIdx = i + 1 < noteParamMatches.length ? noteParamMatches[i + 1].index! : header.length
      const groupBlock = header.slice(startIdx, endIdx)

      const noteParam: NoteParam = {
        name: npMatch[1].trim(),
        type: 'file'
      }

      const noteTypeMatch = groupBlock.match(/@noteType\s+([^\n\r]+)/i)
      if (noteTypeMatch) noteParam.type = noteTypeMatch[1].trim()

      const noteDirMatch = groupBlock.match(/@noteDir\s+([^\n\r]+)/i)
      if (noteDirMatch) noteParam.dir = noteDirMatch[1].trim()

      const noteDataMatch = groupBlock.match(/@noteData\s+([^\n\r]+)/i)
      if (noteDataMatch) noteParam.data = noteDataMatch[1].trim()

      const noteRequireMatch = groupBlock.match(/@noteRequire\s+1/i)
      if (noteRequireMatch) noteParam.require = true

      meta.noteParams.push(noteParam)
    }

    // Infer name from filename comment or plugin structure
    const nameMatch = content.match(/\*\s+@plugindesc[\s\S]*?(\w+)\.js/i)
    if (nameMatch) {
      meta.name = nameMatch[1]
    }

    // Parse localizations from other language headers
    for (const [lang, langHeader] of headers) {
      if (lang && lang !== 'en' && lang !== '') {
        const locDesc = langHeader.match(/@plugindesc\s+(.+?)(?=\n\s*\*\s*@|\n\s*\*\/)/s)
        const locHelp = langHeader.match(/@help\s*([\s\S]*?)(?=\n\s*\*\s*@[a-z]|\n\s*\*\/)/i)

        meta.localizations[lang] = {
          description: locDesc ? locDesc[1].trim().replace(/\n\s*\*\s*/g, ' ') : '',
          help: locHelp
            ? locHelp[1]
                .split('\n')
                .map((line) => line.replace(/^\s*\*\s?/, ''))
                .join('\n')
                .trim()
            : ''
        }
      }
    }

    return meta
  }

  private static parseAllHeaders(content: string): Map<string, string> {
    const headers = new Map<string, string>()
    // Match /*: or /*:ja or /*:zh etc.
    const headerRegex = /\/\*:([a-z]*)([\s\S]*?)\*\//g
    let match
    while ((match = headerRegex.exec(content)) !== null) {
      const lang = match[1] || 'en'
      headers.set(lang, match[2])
    }
    return headers
  }

  private static parseParameters(content: string): PluginParameter[] {
    const parameters: PluginParameter[] = []
    const headerMatch = content.match(/\/\*:([\s\S]*?)\*\//)
    if (!headerMatch) return parameters

    const header = headerMatch[1]

    // Match @param blocks - capture full name (may include spaces) to end of line
    // Uses [^\n\r]+ to handle both LF and CRLF line endings
    const paramRegex = /@param\s+([^\n\r]+)([\s\S]*?)(?=\*\s*@param\s|\*\s*@command\s|$)/g
    let match

    while ((match = paramRegex.exec(header)) !== null) {
      const rawParamName = match[1].replace(/\s*\*?\s*$/, '').trim()
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
      const parentMatch = effectiveBlock.match(/@parent\s+([^\n\r]+)/i)
      if (parentMatch) param.parent = parentMatch[1].replace(/\s*\*?\s*$/, '').trim()

      // Parse @dir for file type
      const dirMatch = effectiveBlock.match(/@dir\s+([^\n\r]+)/i)
      if (dirMatch) param.dir = dirMatch[1].trim()

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
        const onMatch = effectiveBlock.match(/@on\s+([^\n\r]+)/i)
        if (onMatch) param.onLabel = onMatch[1].trim()

        const offMatch = effectiveBlock.match(/@off\s+([^\n\r]+)/i)
        if (offMatch) param.offLabel = offMatch[1].trim()
      }

      parameters.push(param)
    }

    return parameters
  }

  private static parseCommands(content: string): PluginCommand[] {
    const commands: PluginCommand[] = []
    const headerMatch = content.match(/\/\*:([\s\S]*?)\*\//)
    if (!headerMatch) return commands

    const header = headerMatch[1]

    // Match @command blocks
    const cmdRegex = /@command\s+(\S+)([\s\S]*?)(?=@command\s+\S|\*\/|$)/g
    let match

    while ((match = cmdRegex.exec(header)) !== null) {
      const cmdName = match[1]
      const cmdBlock = match[2]

      const command: PluginCommand = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
        name: cmdName,
        text: this.extractTag(cmdBlock, 'text') || cmdName,
        desc: this.extractTag(cmdBlock, 'desc') || '',
        args: this.parseArgs(cmdBlock)
      }

      commands.push(command)
    }

    return commands
  }

  private static parseArgs(block: string): PluginParameter[] {
    const args: PluginParameter[] = []

    // Arg names can include spaces (same as param names)
    const argRegex = /@arg\s+([^\n\r]+)([\s\S]*?)(?=\*\s*@arg\s|\*\s*@command\s|$)/g
    let match

    while ((match = argRegex.exec(block)) !== null) {
      const argName = match[1].replace(/\s*\*?\s*$/, '').trim()
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

      const dirMatch = argBlock.match(/@dir\s+([^\n\r]+)/i)
      if (dirMatch) arg.dir = dirMatch[1].trim()

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
        const onMatch = argBlock.match(/@on\s+([^\n\r]+)/i)
        if (onMatch) arg.onLabel = onMatch[1].trim()

        const offMatch = argBlock.match(/@off\s+([^\n\r]+)/i)
        if (offMatch) arg.offLabel = offMatch[1].trim()
      }

      args.push(arg)
    }

    return args
  }

  private static parseStructs(content: string): PluginStruct[] {
    const structs: PluginStruct[] = []

    // Match struct definition blocks /*~struct~StructName:
    const structRegex = /\/\*~struct~(\w+):([\s\S]*?)\*\//g
    let match

    while ((match = structRegex.exec(content)) !== null) {
      const structName = match[1]
      const structBlock = match[2]

      const struct: PluginStruct = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
        name: structName,
        parameters: this.parseParameters('/*:' + structBlock + '*/')
      }

      structs.push(struct)
    }

    return structs
  }

  private static extractTag(block: string, tag: string): string | null {
    const regex = new RegExp(`@${tag}\\s+([^\\n\\r]+)`, 'i')
    const match = block.match(regex)
    return match ? match[1].replace(/\s*\*?\s*$/, '').trim() : null
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
    const firstTagIdx = rawLine.search(/@(?:text|type|desc|default|min|max|dir|parent|on|off|option|value|decimals)\s/i)
    if (firstTagIdx === -1) {
      return { name: rawLine.trim(), block: '' }
    }

    const name = rawLine.slice(0, firstTagIdx).trim()
    const attrsPart = rawLine.slice(firstTagIdx)

    // Split inline attributes into separate lines for standard parsing.
    // Matches @tag followed by value up to next @tag or end.
    const block = attrsPart.replace(/@(?=text\s|type\s|desc\s|default\s|min\s|max\s|dir\s|parent\s|on\s|off\s|option\s|value\s|decimals\s)/gi, '\n@').trim()

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
    if (normalizedType === 'note' || normalizedType === 'multiline_string') return 'note'
    if (normalizedType === 'color') return 'color'
    if (normalizedType === 'text') return 'text'
    if (normalizedType === 'hidden') return 'hidden'

    return 'string'
  }

  private static parseDefault(block: string): string | number | boolean {
    const defaultMatch = block.match(/@default\s+([^\n\r]+)/i)
    if (!defaultMatch) return ''

    const value = defaultMatch[1].trim()

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

    const optionRegex = /@option\s+([^\n\r]+)/gi
    let match

    while ((match = optionRegex.exec(block)) !== null) {
      const optText = match[1].trim()
      // Check for @value following this option
      const valueMatch = block.slice(match.index).match(/@value\s+([^\n\r]+)/i)
      const value = valueMatch ? valueMatch[1].trim() : optText

      options.push({ value, text: optText })
    }

    return options
  }
}
