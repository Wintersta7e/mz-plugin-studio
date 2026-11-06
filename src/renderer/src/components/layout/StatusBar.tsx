import { useState, useEffect, useRef } from 'react'
import { useProjectStore, usePluginStore } from '../../stores'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { DependencyIssue, DependencyReport } from '../../lib/dependency-analyzer'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { ScrollArea } from '../ui/scroll-area'

// Each issue keyed by its text and how often it came before, so a repeat keeps a key of its own
function keyedIssues(
  issues: readonly DependencyIssue[]
): { key: string; issue: DependencyIssue }[] {
  const seen = new Map<string, number>()
  return issues.map((issue) => {
    const text = `${issue.type}:${issue.pluginName}:${issue.message}`
    const count = seen.get(text) ?? 0
    seen.set(text, count + 1)
    return { key: `${text}#${String(count)}`, issue }
  })
}

function IssueRow({ issue }: Readonly<{ issue: DependencyIssue }>) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded px-2 py-1.5 text-sm',
        issue.severity === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
      )}
    >
      {issue.severity === 'error' ? (
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      )}
      <span>{issue.message}</span>
    </div>
  )
}

// The dependency health of the project's plugins; a click lists the issues, if any
function DependencyStatus({
  report,
  isShowingIssues,
  setIsShowingIssues
}: Readonly<{
  report: DependencyReport
  isShowingIssues: boolean
  setIsShowingIssues: (isShowing: boolean) => void
}>) {
  const count = report.issues.length
  const plural = count > 1 ? 's' : ''
  const isHealthy = report.health === 'healthy'
  const issuesText = `${String(count)} dependency issue${plural}`

  return (
    <>
      <button
        type="button"
        aria-label={isHealthy ? 'All dependencies satisfied' : issuesText}
        className={cn(
          'flex items-center gap-1',
          isHealthy && 'text-emerald-400',
          report.health === 'warnings' && 'text-amber-400 hover:text-amber-300',
          report.health === 'errors' && 'text-red-400 hover:text-red-300'
        )}
        onClick={() => {
          if (count > 0) setIsShowingIssues(true)
        }}
      >
        {isHealthy && <CheckCircle className="h-3 w-3" />}
        {report.health === 'warnings' && <AlertTriangle className="h-3 w-3" />}
        {report.health === 'errors' && <XCircle className="h-3 w-3" />}
        {isHealthy ? 'Dependencies OK' : issuesText}
      </button>
      <Dialog open={isShowingIssues} onOpenChange={setIsShowingIssues}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dependency Issues</DialogTitle>
            <DialogDescription>
              {count} issue
              {plural} found in project plugins
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-2 pr-4">
              {keyedIssues(report.issues).map(({ key, issue }) => (
                <IssueRow key={key} issue={issue} />
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function StatusBar() {
  const project = useProjectStore((s) => s.project)
  const isDirty = usePluginStore((s) => s.isDirty)
  const savedPath = usePluginStore((s) => s.savedPath)
  const pluginName = usePluginStore((s) => s.plugin.meta.name)
  const dependencyReport = useProjectStore((s) => s.dependencyReport)

  const [isShowingIssues, setIsShowingIssues] = useState(false)
  const [isShowingSaved, setIsShowingSaved] = useState(false)
  const previousDirtyRef = useRef(isDirty)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    if (!isDirty && previousDirtyRef.current) {
      setIsShowingSaved(true)
      timer = setTimeout(() => {
        setIsShowingSaved(false)
      }, 1500)
    }
    previousDirtyRef.current = isDirty
    return () => {
      clearTimeout(timer)
    }
  }, [isDirty])

  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-card px-3 text-[13px] text-muted-foreground">
      <div className="flex items-center gap-4">
        {project ? (
          <span data-testid="status-project">Project: {project.gameTitle}</span>
        ) : (
          <span>No project loaded</span>
        )}
        {pluginName && (
          <span>
            Plugin: {pluginName}
            {isDirty && <span className="text-destructive"> (modified)</span>}
          </span>
        )}
        {dependencyReport && (
          <DependencyStatus
            report={dependencyReport}
            isShowingIssues={isShowingIssues}
            setIsShowingIssues={setIsShowingIssues}
          />
        )}
      </div>

      <div className="flex items-center gap-4">
        {isShowingSaved && <span className="text-green-400 animate-save-flash">Saved</span>}
        {savedPath !== null && savedPath !== '' && (
          <span className="truncate max-w-[300px]">{savedPath}</span>
        )}
        <span data-testid="app-version">MZ Plugin Studio v{__APP_VERSION__}</span>
      </div>
    </div>
  )
}
