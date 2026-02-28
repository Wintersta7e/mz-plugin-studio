import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToastStore, type ToastType } from '../../stores/toastStore'
import { cn } from '@/lib/utils'

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

function ToastItem({
  id,
  type,
  message,
  duration
}: {
  id: string
  type: ToastType
  message: string
  duration: number
  createdAt: number
}): React.ReactElement {
  const dismiss = useToastStore((s) => s.dismiss)
  const Icon = icons[type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={toastSpring}
      className={cn(
        'pointer-events-auto relative flex items-start gap-3 rounded-lg border border-border border-l-4 bg-card p-3 pr-8 shadow-lg',
        accentColors[type]
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-sm text-foreground">{message}</p>
      <button
        onClick={() => dismiss(id)}
        className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-lg">
          <div
            className={cn('h-full', progressColors[type])}
            style={{
              animationName: 'progress-shrink',
              animationDuration: `${duration}ms`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards'
            }}
          />
        </div>
      )}
    </motion.div>
  )
}

export function ToastContainer(): React.ReactElement {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="pointer-events-none fixed bottom-10 right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
