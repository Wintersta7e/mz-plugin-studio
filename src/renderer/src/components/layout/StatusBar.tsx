import { useState, useEffect } from 'react'
import { useProjectStore, usePluginStore } from '../../stores'
import { Download, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog'
import { ScrollArea } from '../ui/scroll-area'

export function StatusBar() {
  const project = useProjectStore((s) => s.project)
  const isDirty = usePluginStore((s) => s.isDirty)
  const savedPath = usePluginStore((s) => s.savedPath)
  const plugin = usePluginStore((s) => s.plugin)
  const dependencyReport = useProjectStore((s) => s.dependencyReport)

  const [showIssues, setShowIssues] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const cleanupAvailable = window.api.update?.onUpdateAvailable((info) => {
      setUpdateAvailable(info.version)
    })
    const cleanupDownloaded = window.api.update?.onUpdateDownloaded(() => {
      setUpdateDownloaded(true)
      setDownloading(false)
    })
    return () => {
      cleanupAvailable?.()
      cleanupDownloaded?.()
    }
  }, [])

  const handleDownload = async () => {
    setDownloading(true)
    await window.api.update?.downloadUpdate()
  }

  const handleInstall = () => {
    window.api.update?.installUpdate()
  }

  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-card px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        {project ? (
          <span>Project: {project.gameTitle}</span>
        ) : (
          <span>No project loaded</span>
        )}
        {plugin.meta.name && (
          <span>
            Plugin: {plugin.meta.name}
            {isDirty && <span className="text-destructive"> (modified)</span>}
          </span>
        )}
        {dependencyReport && (
          <>
            <button
              className={cn(
                'flex items-center gap-1',
                dependencyReport.health === 'healthy' && 'text-emerald-400',
                dependencyReport.health === 'warnings' && 'text-amber-400 hover:text-amber-300',
                dependencyReport.health === 'errors' && 'text-red-400 hover:text-red-300'
              )}
              onClick={() => dependencyReport.issues.length > 0 && setShowIssues(true)}
              title={dependencyReport.health === 'healthy' ? 'All dependencies satisfied' : 'Click to view issues'}
            >
              {dependencyReport.health === 'healthy' && <CheckCircle className="h-3 w-3" />}
              {dependencyReport.health === 'warnings' && <AlertTriangle className="h-3 w-3" />}
              {dependencyReport.health === 'errors' && <XCircle className="h-3 w-3" />}
              {dependencyReport.health === 'healthy'
                ? 'Deps OK'
                : dependencyReport.issues.length +
                  ' dep issue' +
                  (dependencyReport.issues.length > 1 ? 's' : '')}
            </button>
            <Dialog open={showIssues} onOpenChange={setShowIssues}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Dependency Issues</DialogTitle>
                  <DialogDescription>
                    {dependencyReport.issues.length} issue{dependencyReport.issues.length > 1 ? 's' : ''} found in project plugins
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
        {updateDownloaded ? (
          <button
            onClick={handleInstall}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
          >
            <CheckCircle className="h-3 w-3" />
            Restart to update
          </button>
        ) : updateAvailable ? (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            <Download className="h-3 w-3" />
            {downloading ? 'Downloading...' : `v${updateAvailable} available`}
          </button>
        ) : null}
        {savedPath && <span className="truncate max-w-[300px]">{savedPath}</span>}
        <span>MZ Plugin Studio v1.3.0</span>
      </div>
    </div>
  )
}
