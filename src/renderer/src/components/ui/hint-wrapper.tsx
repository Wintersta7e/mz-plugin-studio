import type { ReactNode } from 'react'
import { cn } from '@/lib/utilities'

/**
The wrapper that shows a control's hint: a disabled control ignores the pointer, so the hint it
carries would not show over it; on this wrapper it does
*/
export function HintWrapper({
  hint,
  className,
  children
}: Readonly<{ hint: string | undefined; className?: string; children: ReactNode }>): ReactNode {
  return (
    <span title={hint} className={cn('inline-flex', className)}>
      {children}
    </span>
  )
}
