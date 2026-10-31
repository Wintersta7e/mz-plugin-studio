// The Content Security Policy strings: their values, the module's purity and their single holder
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import { DEV_SERVER_CSP, PRODUCTION_CSP } from '../../src/main/csp'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const SRC = join(ROOT, 'src')
const MODULE = join(SRC, 'main', 'csp.ts')
const INDEX = join(SRC, 'main', 'index.ts')

// A policy string starts with its default-src directive
const POLICY_MARK = 'default-src'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

describe('Content Security Policy module', () => {
  it('keeps the production policy byte-identical', () => {
    expect(PRODUCTION_CSP).toBe(
      "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' data: https://cdn.jsdelivr.net; img-src 'self' data:; worker-src 'self' blob: https://cdn.jsdelivr.net"
    )
    expect(PRODUCTION_CSP).toHaveLength(241)
  })

  it('keeps the dev-server policy byte-identical', () => {
    expect(DEV_SERVER_CSP).toBe(
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' data: https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self' ws://localhost:* http://localhost:*; worker-src 'self' blob: https://cdn.jsdelivr.net"
    )
    expect(DEV_SERVER_CSP).toHaveLength(327)
  })

  it('runs nothing at import and imports only types', () => {
    const lines = readFileSync(MODULE, 'utf8').split(/\r?\n/)
    const statements = lines.filter((line) => line.trim() !== '' && !line.startsWith('//'))
    console.log(`csp module: statements checked ${statements.length}`)
    expect(statements.length).toBeGreaterThan(0)
    for (const line of statements) {
      if (line.startsWith('import')) {
        expect(line, 'a runtime import').toMatch(/^import type /)
        continue
      }
      // A constant bound to a plain string or a template with only name substitutions
      expect(line, 'a statement that is not a string constant').toMatch(
        /^(export )?const \w+ = (['`])[^()]*\2$/
      )
    }
  })

  it('is the only source file holding a policy string', () => {
    const files = sourceFiles(SRC)
    const holders = files
      .filter((file) => readFileSync(file, 'utf8').includes(POLICY_MARK))
      .map((file) => relative(ROOT, file).split('\\').join('/'))
    console.log(`csp: files scanned ${files.length}, holders ${holders.length}`)
    expect(files.length).toBeGreaterThan(0)
    expect(holders).toEqual(['src/main/csp.ts'])

    const imports = [...readFileSync(INDEX, 'utf8').matchAll(/import \{([^}]*)\} from '\.\/csp'/g)]
    const names = imports.flatMap((match) => match[1].split(',').map((name) => name.trim()))
    expect(names.sort()).toEqual(['DEV_SERVER_CSP', 'PRODUCTION_CSP'])
  })
})
