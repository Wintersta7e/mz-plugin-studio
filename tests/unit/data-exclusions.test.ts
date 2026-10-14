// Fixture and golden files are exact bytes: formatting, linting and the test program must
// never read or rewrite them. Every data file on disk is checked against all three.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { getFileInfo } from 'prettier'
import { ESLint } from 'eslint'
import ts from 'typescript'

const DATA_GLOBS = ['tests/fixtures/**', 'tests/golden/__golden__/**']

function filesUnder(dir: string): string[] {
  const root = join(process.cwd(), dir)
  if (!existsSync(root)) return []
  return (readdirSync(root, { recursive: true }) as string[])
    .map((p) => join(root, p))
    .filter((p) => statSync(p).isFile())
}

describe('data exclusions', () => {
  it(
    'keeps every data file out of Prettier, ESLint and the test program',
    { timeout: 60_000 },
    async () => {
      const fixtures = filesUnder('tests/fixtures')
      const goldens = filesUnder('tests/golden/__golden__')
      const files = [...fixtures, ...goldens]

      const eslint = new ESLint()
      let prettierIgnored = 0
      let eslintIgnored = 0
      for (const file of files) {
        if ((await getFileInfo(file, { ignorePath: '.prettierignore' })).ignored) prettierIgnored++
        if (await eslint.isPathIgnored(file)) eslintIgnored++
      }

      const parsed = ts.getParsedCommandLineOfConfigFile(
        join(process.cwd(), 'tsconfig.test.json'),
        {},
        { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} }
      )
      const program = new Set((parsed?.fileNames ?? []).map((f) => resolve(f)))
      const inProgram = files.filter((f) => program.has(resolve(f))).length

      console.log(
        `data exclusions: files ${files.length} (fixtures ${fixtures.length}, goldens ${goldens.length}); ` +
          `prettier ${prettierIgnored}/${files.length}, eslint ${eslintIgnored}/${files.length}, ` +
          `test program ${inProgram}`
      )
      expect(files.length).toBeGreaterThan(0)
      expect(prettierIgnored).toBe(files.length)
      expect(eslintIgnored).toBe(files.length)
      expect(program.size).toBeGreaterThan(0)
      expect(inProgram).toBe(0)
      expect(parsed?.raw.exclude).toEqual(expect.arrayContaining(DATA_GLOBS))
    }
  )
})
