// Parse time of the custom-code marker patterns on a long run of spaces after the marker.
import { describe, it, expect } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'

const BOUND_MS = 250

const HEADER = '/*:\n * @target MZ\n * @plugindesc Marker timing\n */\n'
const PADDING = ' '.repeat(102_400)

function timeParse(marker: string): number {
  const content = HEADER + marker + PADDING + 'x;\n'
  const start = performance.now()
  PluginParser.parsePlugin(content)
  const ms = performance.now() - start
  console.log(`marker "${marker}": ${Math.round(ms)} ms`)
  return ms
}

describe('parse time after a custom-code marker', () => {
  // Today these two backtrack over the padding; the others scan it once.
  it.each(['// custom', '// main'])('%s takes longer than the bound', (marker) => {
    expect(timeParse(marker)).toBeGreaterThan(BOUND_MS)
  })

  it.each(['// your', '// implementation', '// ===', '// ---'])(
    '%s finishes within the bound',
    (marker) => {
      expect(timeParse(marker)).toBeLessThan(BOUND_MS)
    }
  )
})
