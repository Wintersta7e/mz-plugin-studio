// The only holder of the fixture project's location. Resolved from the working directory
// (test runners start at the repository root) so CommonJS and ESM loaders both accept it.
import { existsSync } from 'fs'
import { cp, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
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

/**
 * Copies the fixture project to `<new temp dir>/<leaf>` and returns that project path, so
 * every test works on its own copy. The caller removes `dirname(path)`.
 */
export async function copyFixtureProject(leaf = 'Fixture Game'): Promise<string> {
  const project = join(await mkdtemp(join(tmpdir(), 'mz-fixture-')), leaf)
  await cp(fixtureRoot(), project, { recursive: true })
  return project
}
