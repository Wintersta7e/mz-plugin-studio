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
const copyButton = (): HTMLElement => screen.getByRole('button', { name: /Copy/ })
const insertButton = (): HTMLElement => screen.getByRole('button', { name: /Insert Code/ })

describe('template dialog', () => {
  it('refuses to insert or copy a property name that is not an identifier', async () => {
    const onInsert = vi.fn()
    openPropertyTemplate(onInsert, HOSTILE_NAME)
    expect(screen.getByText(/must be a valid JavaScript identifier/)).toBeInTheDocument()
    expect(preview()).not.toContain(HOSTILE_NAME)
    expect(copyButton()).toBeDisabled()
    expect(insertButton()).toBeDisabled()

    fireEvent.click(copyButton())
    fireEvent.click(insertButton())
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true })
    await Promise.resolve()
    expect(writeText).not.toHaveBeenCalled()
    expect(onInsert).not.toHaveBeenCalled()
  })

  it('inserts and copies a property name that passes the checks', async () => {
    const onInsert = vi.fn()
    openPropertyTemplate(onInsert, 'loyalty')
    expect(preview()).toContain('loyalty')

    fireEvent.click(copyButton())
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toContain('loyalty')

    fireEvent.click(insertButton())
    expect(onInsert).toHaveBeenCalledTimes(1)
    expect(onInsert.mock.calls[0][0]).toContain('loyalty')
  })
})
