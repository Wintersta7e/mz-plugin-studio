// The template dialog: what it does with field text the template's own checks would refuse.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TemplateInserter } from '../../src/renderer/src/components/plugin/TemplateInserter'
import { resetStores } from './support/reset-stores'

const HOSTILE_NAME = 'x = 0; globalThis.__pwn = 1; this.y'

let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  resetStores()
  writeText = vi.fn()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

function openPropertyTemplate(onInsert: (code: string) => void, propertyName: string): void {
  render(<TemplateInserter open onClose={vi.fn()} onInsert={onInsert} />)
  fireEvent.change(screen.getByPlaceholderText(/search/i), {
    target: { value: 'Custom Actor Property' }
  })
  fireEvent.click(screen.getByText('Custom Actor Property'))
  fireEvent.change(screen.getByLabelText(/Property Name/), { target: { value: propertyName } })
}

const preview = (): string => document.querySelector('code')?.textContent ?? ''

describe('template dialog', () => {
  it('inserts and copies a property name that is not an identifier', async () => {
    const onInsert = vi.fn()
    openPropertyTemplate(onInsert, HOSTILE_NAME)
    expect(preview()).toContain(HOSTILE_NAME)

    fireEvent.click(screen.getByRole('button', { name: /Copy/ }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toContain(HOSTILE_NAME)

    fireEvent.click(screen.getByRole('button', { name: /Insert Code/ }))
    expect(onInsert).toHaveBeenCalledTimes(1)
    expect(onInsert.mock.calls[0][0]).toContain(HOSTILE_NAME)
  })
})
