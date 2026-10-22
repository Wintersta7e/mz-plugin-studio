import * as vm from 'node:vm'
import type { SyntaxProblem } from '../../shared/ipc-types'

/**
 * Compiles `content` as a script without running any of it; null when it compiles.
 * The line is read from the first stack line, `<filename>:<line>`, when it names one.
 */
export function compileCheck(content: string, filename: string): SyntaxProblem | null {
  try {
    new vm.Script(content, { filename })
    return null
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'SyntaxError') throw error
    const first = String(error.stack).split('\n', 1)[0]
    const prefix = `${filename}:`
    const line = first.startsWith(prefix) ? /^\d+/.exec(first.slice(prefix.length))?.[0] : undefined
    return { message: error.message, line: line === undefined ? null : Number(line) }
  }
}
