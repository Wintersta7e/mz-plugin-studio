import { type ReactNode, type ReactElement } from 'react'
import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

type Preset = 'fade' | 'slide-up' | 'slide-left' | 'scale' | 'slide-right'

const presets: Record<Preset, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  'slide-up': {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 }
  },
  'slide-left': {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -16 }
  },
  'slide-right': {
    initial: { opacity: 0, x: -16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 16 }
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  }
}

const defaultTransition = {
  duration: 0.2,
  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
}

interface AnimatedTransitionProps {
  children: ReactNode
  preset: Preset
  className?: string
  layoutId?: string
  duration?: number
  layout?: boolean | 'position' | 'size'
}

export function AnimatedTransition({
  children,
  preset,
  className,
  layoutId,
  duration,
  layout
}: AnimatedTransitionProps): ReactElement {
  const variants = presets[preset]
  const transition = duration
    ? { ...defaultTransition, duration }
    : defaultTransition

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className={cn(className)}
      layoutId={layoutId}
      layout={layout}
    >
      {children}
    </motion.div>
  )
}
