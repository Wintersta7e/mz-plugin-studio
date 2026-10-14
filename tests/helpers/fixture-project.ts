// The only holder of the fixture project's location. Resolved from the working directory
// (test runners start at the repository root) so CommonJS and ESM loaders both accept it.
import { existsSync } from 'fs'
import { join, resolve } from 'path'

let root: string | null = null

function fixtureRoot(): string {
  if (root === null) {
    const candidate = resolve(process.cwd(), 'tests/fixtures/mz-project')
    if (!existsSync(candidate)) {
      throw new Error(
        `Fixture project not found: tests/fixtures/mz-project under ${process.cwd()} ` +
          '(run tests from the repository root)'
      )
    }
    root = candidate
  }
  return root
}

/** Absolute path of a file or directory inside the fixture project. */
export function fixturePath(...segments: string[]): string {
  return join(fixtureRoot(), ...segments)
}
