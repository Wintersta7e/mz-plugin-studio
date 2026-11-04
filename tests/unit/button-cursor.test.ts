// The app stylesheet as Tailwind builds it: enabled buttons show the hand cursor, which
// Tailwind's own base styles no longer give them.
import { readFile } from 'fs/promises'
import { dirname, join, resolve } from 'path'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const STYLESHEET = join(process.cwd(), 'src/renderer/src/styles/globals.css')

/** The stylesheets the app imports by package name */
const PACKAGES: Record<string, string> = {
  tailwindcss: 'node_modules/tailwindcss/index.css',
  'tw-animate-css': 'node_modules/tw-animate-css/dist/tw-animate.css'
}

async function loadStylesheet(
  id: string,
  base: string
): Promise<{ path: string; base: string; content: string }> {
  const file = id in PACKAGES ? join(process.cwd(), PACKAGES[id]) : resolve(base, id)
  return { path: file, base: dirname(file), content: await readFile(file, 'utf8') }
}

describe('button cursor', () => {
  it('gives enabled buttons and button roles the pointer in the base layer', async () => {
    const compiler = await compile(await readFile(STYLESHEET, 'utf8'), {
      base: dirname(STYLESHEET),
      loadStylesheet
    })
    const css = compiler.build([])
    const base = [...css.matchAll(/@layer base \{[\s\S]*?\n\}/g)].map((m) => m[0]).join('\n')
    const rules = [...base.matchAll(/([^{}]+)\{\s*cursor: pointer;\s*\}/g)].map((m) =>
      m[1].trim().replace(/\s+/g, ' ').replace(/'/g, '"')
    )
    console.log(`button cursor: base layer ${base.length} chars, pointer rules ${rules.length}`)

    expect(base.length).toBeGreaterThan(0)
    expect(rules).toContain('button:not(:disabled), [role="button"]:not(:disabled)')
  })
})
