import type * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utilities'

const Dialog = DialogPrimitive.Root
const DialogPortal = DialogPrimitive.Portal

function DialogOverlay({
  className,
  ...props
}: Readonly<React.ComponentProps<typeof DialogPrimitive.Overlay>>) {
  return (
    <DialogPrimitive.Overlay asChild {...props}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-[fade-out_150ms_ease-out]',
          className
        )}
      />
    </DialogPrimitive.Overlay>
  )
}

function DialogContent({
  className,
  children,
  ...props
}: Readonly<React.ComponentProps<typeof DialogPrimitive.Content>>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content asChild {...props}>
        <motion.div
          style={{ x: '-50%' }}
          initial={{ opacity: 0, scale: 0.95, y: 'calc(-50% - 8px)' }}
          animate={{ opacity: 1, scale: 1, y: '-50%' }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
            mass: 0.8
          }}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg data-[state=closed]:animate-[fade-out_150ms_ease-out]',
            className
          )}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

function DialogTitle({
  className,
  ...props
}: Readonly<React.ComponentProps<typeof DialogPrimitive.Title>>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: Readonly<React.ComponentProps<typeof DialogPrimitive.Description>>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription }
