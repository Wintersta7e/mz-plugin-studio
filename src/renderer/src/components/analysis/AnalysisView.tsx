import { useState } from 'react'
import { useProjectStore } from '../../stores'
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export function AnalysisView() {
  const project = useProjectStore((s) => s.project)
  const conflictReport = useProjectStore((s) => s.conflictReport)
  const dependencyReport = useProjectStore((s) => s.dependencyReport)
  const isScanning = useProjectStore((s) => s.isScanning)
  const scanDependencies = useProjectStore((s) => s.scanDependencies)

  const [conflictsOpen, setConflictsOpen] = useState(true)
  const [depsOpen, setDepsOpen] = useState(true)

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="mb-2">No project loaded</p>
          <p className="text-sm">Open an RPG Maker MZ project to see plugin analysis</p>
        </div>
      </div>
    )
  }

  const initialScan = isScanning && !conflictReport && !dependencyReport
  const conflictCount = conflictReport?.conflicts.length ?? 0
  const depIssueCount = dependencyReport?.issues.length ?? 0
  const pluginCount = dependencyReport?.pluginNames.length ?? 0
  const totalOverrides = conflictReport?.totalOverrides ?? 0

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Plugin Analysis</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => scanDependencies()}
          disabled={isScanning}
        >
          <RefreshCw className={cn('mr-1 h-4 w-4', isScanning && 'animate-spin')} />
          Rescan
        </Button>
      </div>

      {/* Loading state during initial scan */}
      {initialScan && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Scanning plugins...</span>
          </div>
        </div>
      )}

      {!initialScan && (
        <>
          {/* Overview card */}
          <div className="mb-4 rounded-lg border border-border bg-card p-4">
            <div className="flex gap-8">
              <div>
                <div className="text-sm text-muted-foreground">Plugins</div>
                <div className="text-2xl font-semibold">{pluginCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Overrides</div>
                <div className="text-2xl font-semibold">{totalOverrides}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Conflicts</div>
                <div
                  className={cn(
                    'text-2xl font-semibold',
                    conflictCount > 0 ? 'text-amber-500' : 'text-green-500'
                  )}
                >
                  {conflictCount}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Dependency Issues</div>
                <div
                  className={cn(
                    'text-2xl font-semibold',
                    depIssueCount > 0 ? 'text-amber-500' : 'text-green-500'
                  )}
                >
                  {depIssueCount}
                </div>
              </div>
            </div>
          </div>

          {/* Conflicts card */}
          <div className="mb-4 rounded-lg border border-border bg-card">
            <button
              className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium"
              onClick={() => setConflictsOpen(!conflictsOpen)}
              aria-expanded={conflictsOpen}
            >
              {conflictsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Conflicts
              {conflictCount > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-500">
                  {conflictCount}
                </span>
              )}
            </button>
            {conflictsOpen && (
              <div className="border-t border-border px-4 pb-4">
                {conflictCount === 0 ? (
                  <div className="flex items-center gap-2 pt-3 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    No conflicts detected
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {conflictReport!.conflicts.map((conflict, i) => (
                      <div key={i} className="py-3">
                        <div className="flex items-center gap-2">
                          {conflict.severity === 'warning' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Info className="h-4 w-4 text-blue-500" />
                          )}
                          <code className="text-sm font-medium">{conflict.method}</code>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs',
                              conflict.severity === 'warning'
                                ? 'bg-amber-500/20 text-amber-500'
                                : 'bg-blue-500/20 text-blue-500'
                            )}
                          >
                            {conflict.severity}
                          </span>
                        </div>
                        <div className="pl-6 pt-1 text-sm text-muted-foreground">
                          {conflict.plugins.map((p) => p || '(unnamed)').join(' \u2192 ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dependencies card */}
          <div className="mb-4 rounded-lg border border-border bg-card">
            <button
              className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium"
              onClick={() => setDepsOpen(!depsOpen)}
              aria-expanded={depsOpen}
            >
              {depsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Dependencies
              {depIssueCount > 0 && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    dependencyReport?.health === 'errors'
                      ? 'bg-red-500/20 text-red-500'
                      : 'bg-amber-500/20 text-amber-500'
                  )}
                >
                  {depIssueCount}
                </span>
              )}
            </button>
            {depsOpen && (
              <div className="border-t border-border px-4 pb-4">
                {depIssueCount === 0 ? (
                  <div className="flex items-center gap-2 pt-3 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    No dependency issues
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {dependencyReport!.issues.map((issue, i) => (
                      <div key={i} className="py-3">
                        <div className="flex items-center gap-2">
                          {issue.severity === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                          <span className="text-sm">{issue.message}</span>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs',
                              issue.severity === 'error'
                                ? 'bg-red-500/20 text-red-500'
                                : 'bg-amber-500/20 text-amber-500'
                            )}
                          >
                            {issue.severity}
                          </span>
                        </div>
                        {issue.details && (
                          <div className="pl-6 pt-1 text-xs text-muted-foreground">
                            {issue.details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
