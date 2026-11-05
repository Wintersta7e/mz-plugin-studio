// Fixture and golden files are exact bytes: formatting, linting and the test program must
// never read or rewrite them. Every data file on disk is checked against all three.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { getFileInfo } from 'prettier'
import { ESLint } from 'eslint'
import * as ts from 'typescript'

const DATA_GLOBS = ['tests/fixtures/**', 'tests/golden/__golden__/**']

function filesUnder(directory: string): string[] {
  const root = path.join(process.cwd(), directory)
  return existsSync(root)
    ? readdirSync(root, { recursive: true, encoding: 'utf8' })
        .map((file) => path.join(root, file))
        .filter((file) => statSync(file).isFile())
    : []
}

/**
The `exclude` list a parsed tsconfig declares, as read from its raw JSON
*/
function excludeOf(parsed: unknown): unknown {
  const raw: unknown =
    typeof parsed === 'object' && parsed !== null ? Reflect.get(parsed, 'raw') : undefined
  return typeof raw === 'object' && raw !== null ? Reflect.get(raw, 'exclude') : undefined
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
        const info = await getFileInfo(file, { ignorePath: '.prettierignore' })
        if (info.ignored) prettierIgnored++
        if (await eslint.isPathIgnored(file)) eslintIgnored++
      }

      const parsed = ts.getParsedCommandLineOfConfigFile(
        path.join(process.cwd(), 'tsconfig.test.json'),
        {},
        {
          ...ts.sys,
          onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
            throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
          }
        }
      )
      const program = new Set((parsed?.fileNames ?? []).map((file) => path.resolve(file)))
      const inProgram = files.filter((file) => program.has(path.resolve(file))).length
      const total = String(files.length)

      process.stdout.write(
        `data exclusions: files ${total} (fixtures ${String(fixtures.length)}, ` +
          `goldens ${String(goldens.length)}); prettier ${String(prettierIgnored)}/${total}, ` +
          `eslint ${String(eslintIgnored)}/${total}, test program ${String(inProgram)}\n`
      )

      expect(files.length).toBeGreaterThan(0)
      expect([prettierIgnored, eslintIgnored]).toStrictEqual([files.length, files.length])
      expect(program.size).toBeGreaterThan(0)
      expect(inProgram).toBe(0)
      expect(excludeOf(parsed)).toStrictEqual(expect.arrayContaining(DATA_GLOBS))
    }
  )
})
