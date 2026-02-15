import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog'
import { SHORTCUTS, type ShortcutDef } from '../../lib/shortcuts'

interface ShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES = ['File', 'Edit', 'View', 'Navigation'] as const

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    shortcuts: SHORTCUTS.filter((s) => s.category === cat)
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Available keyboard shortcuts in the editor.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {grouped.map(({ category, shortcuts }) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                {category}
              </h3>
              <div className="space-y-1">
                {shortcuts.map((shortcut: ShortcutDef) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono">
                      {shortcut.label}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
