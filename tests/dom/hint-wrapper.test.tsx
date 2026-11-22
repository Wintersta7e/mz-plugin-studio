// A disabled control ignores the pointer, so its hint sits on a wrapper around it; one component
// owns that wrapper, and no component writes the wrapper's span by hand.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HintWrapper } from '../../src/renderer/src/components/ui/hint-wrapper'

const COMPONENTS_ROOT = path.join(import.meta.dirname, '../../src/renderer/src/components')
const OWNER = path.join('ui', 'hint-wrapper.tsx')

// The opening tags of the spans that carry a title on an inline-flex wrapper
function handWrittenHintSpans(source: string): number {
  const tags = source.match(/<span\b[^>]*>/g) ?? []
  return tags.filter((tag) => tag.includes('title=') && tag.includes('className="inline-flex'))
    .length
}

describe('hint wrapper', () => {
  it('puts the hint on an inline-flex wrapper with the class it is given', () => {
    render(
      <HintWrapper hint="Not available" className="shrink-0">
        <button type="button" disabled>
          Go
        </button>
      </HintWrapper>
    )
    const wrapper = screen.getByTitle('Not available')

    expect(wrapper.tagName).toBe('SPAN')
    expect(wrapper).toHaveClass('inline-flex', 'shrink-0')
    expect(wrapper).toContainElement(screen.getByRole('button', { name: 'Go' }))
  })

  it('carries no title while there is no hint', () => {
    render(
      <HintWrapper hint={undefined}>
        <button type="button">Go</button>
      </HintWrapper>
    )

    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument()
    expect(screen.queryByTitle(/.*/)).not.toBeInTheDocument()
  })

  it('is the only place a component wraps a control in a titled inline-flex span', () => {
    const files = readdirSync(COMPONENTS_ROOT, { recursive: true, encoding: 'utf8' }).filter(
      (file) => file.endsWith('.tsx') && file !== OWNER
    )
    const counts = files.map((file) => ({
      file,
      count: handWrittenHintSpans(readFileSync(path.join(COMPONENTS_ROOT, file), 'utf8'))
    }))
    const holders = counts.filter((entry) => entry.count > 0)
    const total = counts.reduce((sum, entry) => sum + entry.count, 0)

    expect(files.length, `component files scanned: ${String(files.length)}`).toBeGreaterThan(0)
    expect(holders, `hand-written hint spans: ${String(total)}`).toStrictEqual([])
  })
})
