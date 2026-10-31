// Compiler checks the code already passes stay on, so new code cannot regress them.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))

const COMMON = {
  noFallthroughCasesInSwitch: true,
  verbatimModuleSyntax: true,
  noUncheckedSideEffectImports: true,
  allowUnusedLabels: false,
  allowUnreachableCode: false
}

const PROGRAMS: Record<string, Record<string, boolean>> = {
  'tsconfig.node.json': {
    ...COMMON,
    noImplicitOverride: true,
    erasableSyntaxOnly: true,
    noPropertyAccessFromIndexSignature: true
  },
  'tsconfig.web.json': { ...COMMON, noImplicitOverride: true },
  'tsconfig.test.json': { ...COMMON, noImplicitOverride: true, noImplicitAny: true, allowJs: true },
  'tsconfig.scripts.json': {
    ...COMMON,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noImplicitReturns: true,
    isolatedModules: true,
    noImplicitOverride: true,
    erasableSyntaxOnly: true
  },
  'tsconfig.e2e.json': {
    ...COMMON,
    noImplicitOverride: true,
    erasableSyntaxOnly: true,
    noImplicitAny: true
  }
}

const compilerOptions = (file: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(ROOT, file), 'utf8')).compilerOptions

describe('tsconfig flags', () => {
  it('sets every compiler check each program already passes', () => {
    let checked = 0
    for (const [file, flags] of Object.entries(PROGRAMS)) {
      const options = compilerOptions(file)
      for (const [flag, value] of Object.entries(flags)) {
        expect(options[flag], `${file} ${flag}`).toBe(value)
        checked++
      }
    }
    console.log(
      `tsconfig flags: programs ${Object.keys(PROGRAMS).length}, flags checked ${checked}`
    )
    expect(checked).toBeGreaterThan(0)
  })

  it('leaves the test program on the shared unused-code checks', () => {
    const options = compilerOptions('tsconfig.test.json')
    expect(options.noUnusedLocals).not.toBe(false)
    expect(options.noUnusedParameters).not.toBe(false)
  })
})
