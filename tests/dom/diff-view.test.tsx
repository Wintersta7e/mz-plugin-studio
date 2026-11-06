// The diff view shows the file on disk on the left and the generated code on the right.
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DiffView } from '../../src/renderer/src/components/preview/DiffView'
import { resetStores } from './support/reset-stores'

const sideText = (testId: string): string => {
  const side = screen.getByTestId(testId)
  if (!(side instanceof HTMLTextAreaElement)) throw new TypeError(`${testId} is no text area`)
  return side.value
}

const sides = (): [string, string] => [
  sideText('monaco-diff-original'),
  sideText('monaco-diff-modified')
]

describe('diff view', () => {
  beforeEach(resetStores)

  it('shows the original on the left and the modified text on the right, and follows changes', () => {
    const { rerender } = render(<DiffView original="a" modified="b" />)

    expect(sides()).toStrictEqual(['a', 'b'])

    rerender(<DiffView original="c" modified="d" />)

    expect(sides()).toStrictEqual(['c', 'd'])
  })
})
