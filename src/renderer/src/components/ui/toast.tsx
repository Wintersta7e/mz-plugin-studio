import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToastStore, type ToastAction, type ToastType } from '../../stores/toastStore'
import { cn } from '@/lib/utilities'
import { Button } from './button'

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle
}

const accentColors: Record<ToastType, string> = {
  success: 'border-l-green-500 text-green-400',
  error: 'border-l-red-500 text-red-400',
  info: 'border-l-blue-500 text-blue-400',
  warning: 'border-l-yellow-500 text-yellow-400'
}

const progressColors: Record<ToastType, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  warning: 'bg-yellow-500'
}

const toastSpring = { type: 'spring' as const, stiffness: 400, damping: 30 }

/**
The bar that shrinks over the toast's lifetime; it stops while the toast is held
*/
function ToastProgress({
  type,
  duration,
  paused
}: Readonly<{ type: ToastType; duration: number; paused: boolean }>): React.ReactElement {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-lg">
      <div
        className={cn('h-full', progressColors[type])}
        style={{
          animationName: 'progress-shrink',
          animationDuration: `${String(duration)}ms`,
          animationTimingFunction: 'linear',
          animationFillMode: 'forwards',
          animationPlayState: paused ? 'paused' : 'running'
        }}
      />
    </div>
  )
}

type HoldReason = 'pointer' | 'focus'

/**
The countdown waits while the pointer is over the toast or focus is inside it
*/
function useCountdownHold(id: string): Readonly<{
  paused: boolean
  hold: (reason: HoldReason, isHolding: boolean) => void
}> {
  const pause = useToastStore((s) => s.pause)
  const resume = useToastStore((s) => s.resume)
  const holdsRef = useRef({ pointer: false, focus: false })
  const [paused, setPaused] = useState(false)

  const hold = (reason: HoldReason, isHolding: boolean): void => {
    const wasHeld = holdsRef.current.pointer || holdsRef.current.focus
    holdsRef.current[reason] = isHolding
    const isHeld = holdsRef.current.pointer || holdsRef.current.focus
    if (isHeld === wasHeld) return
    if (isHeld) pause(id)
    else resume(id)
    setPaused(isHeld)
  }
  return { paused, hold }
}

function ToastItem({
  id,
  type,
  message,
  duration,
  action
}: Readonly<{
  id: string
  type: ToastType
  message: string
  duration: number
  action?: ToastAction
}>): React.ReactElement {
  const dismiss = useToastStore((s) => s.dismiss)
  const Icon = icons[type]
  const { paused, hold } = useCountdownHold(id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={toastSpring}
      onPointerEnter={() => {
        hold('pointer', true)
      }}
      onPointerLeave={() => {
        hold('pointer', false)
      }}
      onFocus={() => {
        hold('focus', true)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) hold('focus', false)
      }}
      className={cn(
        'pointer-events-auto relative flex items-start gap-3 rounded-lg border border-border border-l-4 bg-card p-3 pr-8 shadow-lg',
        accentColors[type]
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-2">
        <p className="text-sm text-foreground">{message}</p>
        {action && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              dismiss(id)
              action.run()
            }}
          >
            {action.label}
          </Button>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          dismiss(id)
        }}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
      {duration > 0 && <ToastProgress type={type} duration={duration} paused={paused} />}
    </motion.div>
  )
}

export function ToastContainer(): React.ReactElement {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Notifications"
      data-testid="toast-viewport"
      className="pointer-events-none fixed bottom-10 right-4 z-100 flex flex-col gap-2"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
