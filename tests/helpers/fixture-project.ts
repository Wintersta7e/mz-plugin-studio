// The only holder of the fixture project's location. Resolved from the working directory
// (test runners start at the repository root) so CommonJS and ESM loaders both accept it.
import { existsSync } from 'node:fs'
import { cp, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Found on first use
const found: { root: string | null } = { root: null }

function fixtureRoot(): string {
  if (found.root === null) {
    const candidate = path.resolve(process.cwd(), 'tests/fixtures/mz-project')
    if (!existsSync(candidate)) {
      throw new Error(
        `Fixture project not found: tests/fixtures/mz-project under ${process.cwd()} ` +
          '(run tests from the repository root)'
      )
    }
    found.root = candidate
  }
  return found.root
}

/**
Absolute path of a file or directory inside the fixture project.
*/
export function fixturePath(...segments: string[]): string {
  return path.join(fixtureRoot(), ...segments)
}

/**
Copies the fixture project to `<new temp dir>/<leaf>` and returns that project path, so
every test works on its own copy. The caller removes `dirname(path)`.
*/
export async function copyFixtureProject(leaf = 'Fixture Game'): Promise<string> {
  const parent = await mkdtemp(path.join(tmpdir(), 'mz-fixture-'))
  const project = path.join(parent, leaf)
  await cp(fixtureRoot(), project, { recursive: true })
  return project
}
