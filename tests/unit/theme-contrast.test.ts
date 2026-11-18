// Text colours that were raised to the 4.5:1 contrast normal text needs: the primary-coloured
// text on a primary tint in both app themes, and the dark code editor's comments
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { darkEditorTheme } from '../../src/renderer/src/lib/editor-theme'

type Rgb = [number, number, number]

const STYLESHEET = path.join(process.cwd(), 'src/renderer/src/styles/globals.css')
const THEMES: [string, string][] = [
  ['dark', ':root {'],
  ['light', ":root[data-theme='light'] {"]
]
// The background of the editor's built-in dark theme, which the dark theme inherits
const DARK_EDITOR_BACKGROUND = '1e1e1e'
// The opacity of the tint behind the primary text (`bg-primary/20`)
const TINT = 0.2
const NORMAL_TEXT = 4.5

/**
The theme's custom properties: each `--name: H S% L%;` line of its block
*/
function themeTokens(css: string, opening: string): Map<string, string> {
  const start = css.indexOf(opening)
  const block = css.slice(start, css.indexOf('}', start))
  return new Map(
    block.matchAll(/--([\w-]+): ([^;]+);/g).map(([, name = '', value = '']) => [name, value])
  )
}

function hslToRgb(value = ''): Rgb {
  const [h = 0, s = 0, l = 0] = value
    .split(/[\s%]+/)
    .filter((part) => part !== '')
    .map(Number)
  const lightness = l / 100
  const a = (s / 100) * Math.min(lightness, 1 - lightness)
  const channel = (n: number): number => {
    const k = (n + h / 30) % 12
    return Math.round((lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255)
  }
  return [channel(0), channel(8), channel(4)]
}

function hexToRgb(hex: string): Rgb {
  const channel = (index: number): number =>
    Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  return [channel(0), channel(1), channel(2)]
}

function linear(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

function contrast(one: Rgb, other: Rgb): number {
  const light = Math.max(luminance(one), luminance(other))
  const dark = Math.min(luminance(one), luminance(other))
  return (light + 0.05) / (dark + 0.05)
}

function over(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  const blend = (index: 0 | 1 | 2): number =>
    Math.round(top[index] * alpha + bottom[index] * (1 - alpha))
  return [blend(0), blend(1), blend(2)]
}

describe('theme contrast', () => {
  it('keeps primary text on a primary tint over a card at 4.5:1 in both themes', () => {
    const css = readFileSync(STYLESHEET, 'utf8')
    const ratios = THEMES.map(([theme, opening]): [string, number] => {
      const tokens = themeTokens(css, opening)
      const tint = over(hslToRgb(tokens.get('primary')), TINT, hslToRgb(tokens.get('card')))
      return [theme, contrast(hslToRgb(tokens.get('primary-text')), tint)]
    })
    process.stdout.write(
      `theme contrast: primary text ${ratios.map(([theme, ratio]) => [theme, ratio.toFixed(2)].join(' ')).join(', ')}\n`
    )

    expect(ratios.filter(([, ratio]) => ratio < NORMAL_TEXT)).toStrictEqual([])
    expect(ratios).toHaveLength(THEMES.length)
  })

  it('keeps comments in the dark code editor at 4.5:1', () => {
    const comment = darkEditorTheme.rules.find(({ token }) => token === 'comment')?.foreground ?? ''
    const ratio = contrast(hexToRgb(comment), hexToRgb(DARK_EDITOR_BACKGROUND))
    process.stdout.write(`theme contrast: dark editor comment ${ratio.toFixed(2)}\n`)

    expect(ratio).toBeGreaterThanOrEqual(NORMAL_TEXT)
  })
})
