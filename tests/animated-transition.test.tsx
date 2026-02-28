// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnimatePresence } from 'framer-motion'
import { AnimatedTransition } from '../src/renderer/src/components/ui/animated-transition'

describe('AnimatedTransition', () => {
  it('renders children', () => {
    render(
      <AnimatePresence>
        <AnimatedTransition preset="fade">
          <div data-testid="child">Hello</div>
        </AnimatedTransition>
      </AnimatePresence>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <AnimatePresence>
        <AnimatedTransition preset="fade" className="custom-class">
          <span>Test</span>
        </AnimatedTransition>
      </AnimatePresence>
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('forwards layoutId prop', () => {
    render(
      <AnimatePresence>
        <AnimatedTransition preset="scale" layoutId="test-layout">
          <span>Layout</span>
        </AnimatedTransition>
      </AnimatePresence>
    )
    expect(screen.getByText('Layout')).toBeInTheDocument()
  })

  it('renders with slide-up preset', () => {
    render(
      <AnimatePresence>
        <AnimatedTransition preset="slide-up">
          <span>Slide</span>
        </AnimatedTransition>
      </AnimatePresence>
    )
    expect(screen.getByText('Slide')).toBeInTheDocument()
  })

  it('renders with slide-left preset', () => {
    render(
      <AnimatePresence>
        <AnimatedTransition preset="slide-left">
          <span>Left</span>
        </AnimatedTransition>
      </AnimatePresence>
    )
    expect(screen.getByText('Left')).toBeInTheDocument()
  })
})
