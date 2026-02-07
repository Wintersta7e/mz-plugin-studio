import type {
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  PluginStruct,
  ParamType,
  LocalizedContent
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
        localizations: meta.localizations
      },
      parameters,
      commands,
      structs,
      codeBody,
      customCode
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

    // Match @param blocks
    const paramRegex = /@param\s+(\S+)([\s\S]*?)(?=@param\s+\S|@command\s+\S|$)/g
    let match

    while ((match = paramRegex.exec(header)) !== null) {
      const paramName = match[1]
      const paramBlock = match[2]

      const param: PluginParameter = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
        name: paramName,
        text: this.extractTag(paramBlock, 'text') || paramName,
        desc: this.extractTag(paramBlock, 'desc') || '',
        type: this.parseParamType(this.extractTag(paramBlock, 'type') || 'string'),
        default: this.parseDefault(paramBlock)
      }

      // Parse type-specific attributes
      const minMatch = paramBlock.match(/@min\s+(-?\d+)/i)
      if (minMatch) param.min = parseInt(minMatch[1], 10)

      const maxMatch = paramBlock.match(/@max\s+(-?\d+)/i)
      if (maxMatch) param.max = parseInt(maxMatch[1], 10)

      // Parse @decimals
      const decimalsMatch = paramBlock.match(/@decimals\s+(\d+)/i)
      if (decimalsMatch) param.decimals = parseInt(decimalsMatch[1], 10)

      // Parse @parent for nested parameters
      const parentMatch = paramBlock.match(/@parent\s+(.+?)(?=\n|$)/i)
      if (parentMatch) param.parent = parentMatch[1].trim()

      // Parse @dir for file type
      const dirMatch = paramBlock.match(/@dir\s+(.+?)(?=\n|$)/i)
      if (dirMatch) param.dir = dirMatch[1].trim()

      // Parse options for select type
      const options = this.parseOptions(paramBlock)
      if (options.length > 0) {
        param.options = options
      }

      // Parse struct reference
      const structMatch = paramBlock.match(/@type\s+struct<(\w+)>/i)
      if (structMatch) {
        param.structType = structMatch[1]
      }

      // Parse @on/@off for boolean types
      if (param.type === 'boolean') {
        const onMatch = paramBlock.match(/@on\s+(.+?)(?=\n|$)/i)
        if (onMatch) param.onLabel = onMatch[1].trim()

        const offMatch = paramBlock.match(/@off\s+(.+?)(?=\n|$)/i)
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

    const argRegex = /@arg\s+(\S+)([\s\S]*?)(?=@arg\s+\S|@command\s+\S|$)/g
    let match

    while ((match = argRegex.exec(block)) !== null) {
      const argName = match[1]
      const argBlock = match[2]

      const arg: PluginParameter = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
        name: argName,
        text: this.extractTag(argBlock, 'text') || argName,
        desc: this.extractTag(argBlock, 'desc') || '',
        type: this.parseParamType(this.extractTag(argBlock, 'type') || 'string'),
        default: this.parseDefault(argBlock)
      }

      // Parse type-specific attributes for args
      const minMatch = argBlock.match(/@min\s+(-?\d+)/i)
      if (minMatch) arg.min = parseInt(minMatch[1], 10)

      const maxMatch = argBlock.match(/@max\s+(-?\d+)/i)
      if (maxMatch) arg.max = parseInt(maxMatch[1], 10)

      const decimalsMatch = argBlock.match(/@decimals\s+(\d+)/i)
      if (decimalsMatch) arg.decimals = parseInt(decimalsMatch[1], 10)

      const dirMatch = argBlock.match(/@dir\s+(.+?)(?=\n|$)/i)
      if (dirMatch) arg.dir = dirMatch[1].trim()

      // Parse struct reference for args
      const structMatch = argBlock.match(/@type\s+struct<(\w+)>/i)
      if (structMatch) arg.structType = structMatch[1]

      // Parse options for select type
      const options = this.parseOptions(argBlock)
      if (options.length > 0) arg.options = options

      // Parse @on/@off for boolean types
      if (arg.type === 'boolean') {
        const onMatch = argBlock.match(/@on\s+(.+?)(?=\n|$)/i)
        if (onMatch) arg.onLabel = onMatch[1].trim()

        const offMatch = argBlock.match(/@off\s+(.+?)(?=\n|$)/i)
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
    const regex = new RegExp(`@${tag}\\s+(.+?)(?=\\n|$)`, 'i')
    const match = block.match(regex)
    return match ? match[1].trim() : null
  }

  private static parseParamType(typeStr: string): ParamType {
    const normalizedType = typeStr.toLowerCase().trim()

    if (normalizedType === 'number' || normalizedType === 'num') return 'number'
    if (normalizedType === 'boolean' || normalizedType === 'bool') return 'boolean'
    if (normalizedType === 'select' || normalizedType === 'combo') return 'select'
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
    if (normalizedType === 'note' || normalizedType === 'multiline_string') return 'note'
    if (normalizedType.startsWith('struct<')) return 'struct'
    if (normalizedType.includes('[]')) return 'array'

    return 'string'
  }

  private static parseDefault(block: string): string | number | boolean {
    const defaultMatch = block.match(/@default\s+(.+?)(?=\n|$)/i)
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

    const optionRegex = /@option\s+(.+?)(?=\n|$)/gi
    let match

    while ((match = optionRegex.exec(block)) !== null) {
      const optText = match[1].trim()
      // Check for @value following this option
      const valueMatch = block.slice(match.index).match(/@value\s+(.+?)(?=\n|$)/i)
      const value = valueMatch ? valueMatch[1].trim() : optText

      options.push({ value, text: optText })
    }

    return options
  }
}
