import * as vm from 'node:vm'
import log from 'electron-log/main'
import type { SyntaxProblem } from '../../shared/ipc-types'

/**
Compiles `content` as a script without running any of it; null when it compiles, and when it
nests too deeply for the compiler to finish, so such a file can still be saved.
The line is read from the first stack line, `<filename>:<line>`, when it names one.
*/
export function compileCheck(content: string, filename: string): SyntaxProblem | null {
  try {
    // eslint-disable-next-line sonarjs/code-eval -- compile-only syntax check of generated plugin text; the script never runs
    new vm.Script(content, { filename })
    return null
  } catch (error) {
    if (error instanceof Error && error.name === 'RangeError') {
      log.warn(`[syntax-check] ${filename} could not be checked:`, error.message)
      return null
    }
    if (!(error instanceof Error) || error.name !== 'SyntaxError') throw error
    const stack = String(error.stack)
    // The first line: everything before the first line break, all of it when there is none
    const first = stack.slice(0, `${stack}\n`.indexOf('\n'))
    const prefix = `${filename}:`
    const line = first.startsWith(prefix) ? /^\d+/.exec(first.slice(prefix.length))?.[0] : undefined
    return { message: error.message, line: line === undefined ? null : Number(line) }
  }
}
