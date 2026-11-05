// The app stylesheet as Tailwind builds it: enabled buttons show the hand cursor, which
// Tailwind's own base styles no longer give them.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const STYLESHEET = path.join(process.cwd(), 'src/renderer/src/styles/globals.css')

/**
The stylesheets the app imports by package name
*/
const PACKAGES = new Map([
  ['tailwindcss', 'node_modules/tailwindcss/index.css'],
  ['tw-animate-css', 'node_modules/tw-animate-css/dist/tw-animate.css']
])

async function loadStylesheet(
  id: string,
  base: string
): Promise<{ path: string; base: string; content: string }> {
  const packageFile = PACKAGES.get(id)
  const file =
    packageFile === undefined ? path.resolve(base, id) : path.join(process.cwd(), packageFile)
  return { path: file, base: path.dirname(file), content: await readFile(file, 'utf8') }
}

describe('button cursor', () => {
  it('gives enabled buttons and button roles the pointer in the base layer', async () => {
    expect.assertions(2)

    const compiler = await compile(await readFile(STYLESHEET, 'utf8'), {
      base: path.dirname(STYLESHEET),
      loadStylesheet
    })
    const css = compiler.build([])
    const base = css
      .matchAll(/@layer base \{[\s\S]*?\n\}/g)
      .map((m) => m[0])
      .toArray()
      .join('\n')
    const rules = base
      .matchAll(/([^{}]+)\{\s*cursor: pointer;\s*\}/g)
      .map(([, selector = '']) => selector.trim().replaceAll(/\s+/g, ' ').replaceAll("'", '"'))
      .toArray()
    process.stdout.write(
      `button cursor: base layer ${String(base.length)} chars, pointer rules ${String(rules.length)}\n`
    )

    expect(base.length).toBeGreaterThan(0)
    expect(rules).toContain('button:not(:disabled), [role="button"]:not(:disabled)')
  })
})
