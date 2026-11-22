import { parse, type Program } from 'acorn'

export type {
  AnyNode,
  ArrowFunctionExpression,
  BlockStatement,
  FunctionExpression,
  Program
} from 'acorn'

/**
Parses code the way MZ loads a plugin: as a classic script.
*/
export const parseScript = (code: string): Program =>
  parse(code, { ecmaVersion: 'latest', sourceType: 'script' })

/**
Why `code` does not parse as a classic script, or undefined when it does.
*/
export function scriptParseError(code: string): string | undefined {
  try {
    parseScript(code)
    return undefined
  } catch (error) {
    if (error instanceof SyntaxError) return error.message
    throw error
  }
}
