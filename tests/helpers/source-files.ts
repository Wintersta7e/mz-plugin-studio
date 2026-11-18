// Walks a source tree once for the tests that scan files: one walker, one order.
import { readdirSync } from 'node:fs'
import path from 'node:path'

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

/**
The regular files below `directory` whose name matches `pattern`, as absolute paths in code-unit order
*/
export function sourceFiles(directory: string, pattern: RegExp): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .toSorted(byCodeUnit)
}
