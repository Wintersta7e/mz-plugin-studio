// The diff view shows the file on disk on the left and the generated code on the right.
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DiffView } from '../../src/renderer/src/components/preview/DiffView'
import { resetStores } from './support/reset-stores'

const sides = (): [string, string] => [
  (screen.getByTestId('monaco-diff-original') as HTMLTextAreaElement).value,
  (screen.getByTestId('monaco-diff-modified') as HTMLTextAreaElement).value
]

describe('diff view', () => {
  beforeEach(resetStores)

  afterEach(cleanup)

  it('shows the original on the left and the modified text on the right, and follows changes', () => {
    const { rerender } = render(<DiffView original="a" modified="b" />)
    expect(sides()).toEqual(['a', 'b'])
    rerender(<DiffView original="c" modified="d" />)
    expect(sides()).toEqual(['c', 'd'])
  })
})
