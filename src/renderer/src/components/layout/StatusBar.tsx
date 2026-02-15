import { useState, useEffect } from 'react'
import { useProjectStore, usePluginStore } from '../../stores'
import { Download, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

export function StatusBar() {
  const project = useProjectStore((s) => s.project)
  const isDirty = usePluginStore((s) => s.isDirty)
  const savedPath = usePluginStore((s) => s.savedPath)
  const plugin = usePluginStore((s) => s.plugin)
  const dependencyReport = useProjectStore((s) => s.dependencyReport)

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
          <span
            className={cn(
              'flex items-center gap-1',
              dependencyReport.health === 'healthy' && 'text-emerald-400',
              dependencyReport.health === 'warnings' && 'text-amber-400',
              dependencyReport.health === 'errors' && 'text-red-400'
            )}
            title={
              dependencyReport.issues.length === 0
                ? 'All dependencies satisfied'
                : dependencyReport.issues.map((i) => i.message).join('\n')
            }
          >
            {dependencyReport.health === 'healthy' && <CheckCircle className="h-3 w-3" />}
            {dependencyReport.health === 'warnings' && <AlertTriangle className="h-3 w-3" />}
            {dependencyReport.health === 'errors' && <XCircle className="h-3 w-3" />}
            {dependencyReport.health === 'healthy'
              ? 'Deps OK'
              : dependencyReport.issues.length +
                ' dep issue' +
                (dependencyReport.issues.length > 1 ? 's' : '')}
          </span>
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
        <span>MZ Plugin Studio v1.1.0</span>
      </div>
    </div>
  )
}
