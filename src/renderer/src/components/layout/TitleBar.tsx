import { useState, useEffect } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'
import { Button } from '../ui/button'
import { useProjectStore, usePluginStore } from '../../stores'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const project = useProjectStore((s) => s.project)
  const isDirty = usePluginStore((s) => s.isDirty)

  useEffect(() => {
    window.api.window.isMaximized().then(setIsMaximized)
    const unsubscribe = window.api.window.onMaximizeChange(setIsMaximized)
    return () => unsubscribe()
  }, [])

  const handleMinimize = () => window.api.window.minimize()
  const handleMaximize = () => window.api.window.maximize()
  const handleClose = async () => {
    if (isDirty) {
      const result = await window.api.dialog.message({
        type: 'question',
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Do you want to close without saving?',
        buttons: ['Close Without Saving', 'Cancel']
      })
      if (result === 0) {
        window.api.window.forceClose()
      }
    } else {
      window.api.window.forceClose()
    }
  }

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
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
