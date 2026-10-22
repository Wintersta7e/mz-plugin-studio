import { useState, useEffect } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'
import { Button } from '../ui/button'
import { useProjectStore } from '../../stores'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const project = useProjectStore((s) => s.project)

  useEffect(() => {
    window.api.window.isMaximized().then(setIsMaximized)
    const unsubscribe = window.api.window.onMaximizeChange(setIsMaximized)
    return () => unsubscribe()
  }, [])

  const handleMinimize = () => window.api.window.minimize()
  const handleMaximize = () => window.api.window.maximize()
  // Main asks about unsaved changes in any tab, as for Alt+F4 or the taskbar
  const handleClose = () => window.api.window.close()

  return (
    <div className="titlebar-drag-region flex h-10 items-center justify-between border-b border-border bg-card px-2">
      <div className="flex items-center gap-2 titlebar-no-drag">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/20">
          <span className="text-xs font-bold text-primary">MZ</span>
        </div>
        <span className="text-sm font-medium text-foreground">Plugin Studio</span>
        {project && <span className="text-sm text-muted-foreground">- {project.gameTitle}</span>}
      </div>

      <div className="flex titlebar-no-drag">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-10 rounded-none hover:bg-muted"
          onClick={handleMinimize}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-10 rounded-none hover:bg-muted"
          onClick={handleMaximize}
        >
          {isMaximized ? <Square className="h-3.5 w-3.5" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-10 rounded-none hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
          aria-label="Close window"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
