import { useState, useEffect, useRef } from 'react'
import { useProjectStore, usePluginStore } from '../../stores'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { ScrollArea } from '../ui/scroll-area'

export function StatusBar() {
  const project = useProjectStore((s) => s.project)
  const isDirty = usePluginStore((s) => s.isDirty)
  const savedPath = usePluginStore((s) => s.savedPath)
  const pluginName = usePluginStore((s) => s.plugin.meta.name)
  const dependencyReport = useProjectStore((s) => s.dependencyReport)

  const [showIssues, setShowIssues] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const prevDirtyRef = useRef(isDirty)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    if (prevDirtyRef.current && !isDirty) {
      setShowSaved(true)
      timer = setTimeout(() => setShowSaved(false), 1500)
    }
    prevDirtyRef.current = isDirty
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isDirty])

  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-card px-3 text-[13px] text-muted-foreground">
      <div className="flex items-center gap-4">
        {project ? <span>Project: {project.gameTitle}</span> : <span>No project loaded</span>}
        {pluginName && (
          <span>
            Plugin: {pluginName}
            {isDirty && <span className="text-destructive"> (modified)</span>}
          </span>
        )}
        {dependencyReport && (
          <>
            <button
              aria-label={
                dependencyReport.health === 'healthy'
                  ? 'All dependencies satisfied'
                  : `${dependencyReport.issues.length} dependency issue${dependencyReport.issues.length > 1 ? 's' : ''}`
              }
              className={cn(
                'flex items-center gap-1',
                dependencyReport.health === 'healthy' && 'text-emerald-400',
                dependencyReport.health === 'warnings' && 'text-amber-400 hover:text-amber-300',
                dependencyReport.health === 'errors' && 'text-red-400 hover:text-red-300'
              )}
              onClick={() => dependencyReport.issues.length > 0 && setShowIssues(true)}
            >
              {dependencyReport.health === 'healthy' && <CheckCircle className="h-3 w-3" />}
              {dependencyReport.health === 'warnings' && <AlertTriangle className="h-3 w-3" />}
              {dependencyReport.health === 'errors' && <XCircle className="h-3 w-3" />}
              {dependencyReport.health === 'healthy'
                ? 'Dependencies OK'
                : dependencyReport.issues.length +
                  ' dependency issue' +
                  (dependencyReport.issues.length > 1 ? 's' : '')}
            </button>
            <Dialog open={showIssues} onOpenChange={setShowIssues}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Dependency Issues</DialogTitle>
                  <DialogDescription>
                    {dependencyReport.issues.length} issue
                    {dependencyReport.issues.length > 1 ? 's' : ''} found in project plugins
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-80">
                  <div className="space-y-2 pr-4">
                    {dependencyReport.issues.map((issue, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex items-start gap-2 rounded px-2 py-1.5 text-sm',
                          issue.severity === 'error'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-amber-500/10 text-amber-400'
                        )}
                      >
                        {issue.severity === 'error' ? (
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {showSaved && <span className="text-green-400 animate-save-flash">Saved</span>}
        {savedPath && <span className="truncate max-w-[300px]">{savedPath}</span>}
        <span>MZ Plugin Studio v{__APP_VERSION__}</span>
      </div>
    </div>
  )
}
