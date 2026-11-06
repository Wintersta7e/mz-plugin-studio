import { useState, type ReactNode } from 'react'
import { useProjectStore } from '../../stores'
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import type { ConflictReport, PluginConflict } from '../../lib/conflict-detector'
import type { DependencyIssue, DependencyReport } from '../../lib/dependency-analyzer'

// Each entry keyed by its text and how often it came before, so a repeat keeps a key of its own
function keyedByText<T>(
  entries: readonly T[],
  textOf: (entry: T) => string
): { key: string; entry: T }[] {
  const seen = new Map<string, number>()
  return entries.map((entry) => {
    const text = textOf(entry)
    const count = seen.get(text) ?? 0
    seen.set(text, count + 1)
    return { key: `${text}#${String(count)}`, entry }
  })
}

function NoProject() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center text-muted-foreground">
        <p className="mb-2">No project loaded</p>
        <p className="text-sm">Open an RPG Maker MZ project to see plugin analysis</p>
      </div>
    </div>
  )
}

function ScanSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="shimmer h-8 w-48 rounded-lg bg-muted" />
      <div className="flex gap-4">
        <div className="shimmer h-24 flex-1 rounded-lg bg-muted" />
        <div className="shimmer h-24 flex-1 rounded-lg bg-muted" />
        <div className="shimmer h-24 flex-1 rounded-lg bg-muted" />
        <div className="shimmer h-24 flex-1 rounded-lg bg-muted" />
      </div>
      <div className="shimmer h-48 rounded-lg bg-muted" />
      <div className="shimmer h-48 rounded-lg bg-muted" />
    </div>
  )
}

function OverviewCard({
  pluginCount,
  totalOverrides,
  conflictCount,
  dependencyIssueCount
}: Readonly<{
  pluginCount: number
  totalOverrides: number
  conflictCount: number
  dependencyIssueCount: number
}>) {
  return (
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
              dependencyIssueCount > 0 ? 'text-amber-500' : 'text-green-500'
            )}
          >
            {dependencyIssueCount}
          </div>
        </div>
      </div>
    </div>
  )
}

// A card whose header button shows or hides its body; the badge sits after the title
function AnalysisCard({
  title,
  isOpen,
  setIsOpen,
  badge,
  children
}: Readonly<{
  title: string
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  badge: ReactNode
  children: ReactNode
}>) {
  return (
    <div className="mb-4 rounded-lg border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium"
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        aria-expanded={isOpen}
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
        {badge}
      </button>
      {isOpen && <div className="border-t border-border px-4 pb-4">{children}</div>}
    </div>
  )
}

function NoneFound({ text }: Readonly<{ text: string }>) {
  return (
    <div className="flex items-center gap-2 pt-3 text-sm text-muted-foreground">
      <CheckCircle className="h-4 w-4 text-green-500" />
      {text}
    </div>
  )
}

function ConflictList({ conflicts }: Readonly<{ conflicts: readonly PluginConflict[] }>) {
  if (conflicts.length === 0) return <NoneFound text="No conflicts detected" />
  return (
    <div className="divide-y divide-border">
      {keyedByText(conflicts, (conflict) => conflict.method).map(({ key, entry: conflict }) => (
        <div key={key} className="py-3">
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
            {conflict.plugins.map((p) => p || '(unnamed)').join(' \u{2192} ')}
          </div>
        </div>
      ))}
    </div>
  )
}

function IssueList({ issues }: Readonly<{ issues: readonly DependencyIssue[] }>) {
  if (issues.length === 0) return <NoneFound text="No dependency issues" />
  const keyed = keyedByText(issues, (issue) => `${issue.type}:${issue.pluginName}:${issue.message}`)
  return (
    <div className="divide-y divide-border">
      {keyed.map(({ key, entry: issue }) => (
        <div key={key} className="py-3">
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
          {issue.details !== undefined && issue.details !== '' && (
            <div className="pl-6 pt-1 text-xs text-muted-foreground">{issue.details}</div>
          )}
        </div>
      ))}
    </div>
  )
}

// The overview and the conflicts and dependencies cards of the last scan
function AnalysisReport({
  conflictReport,
  dependencyReport,
  isConflictsOpen,
  setIsConflictsOpen,
  isDependenciesOpen,
  setIsDependenciesOpen
}: Readonly<{
  conflictReport: ConflictReport | null
  dependencyReport: DependencyReport | null
  isConflictsOpen: boolean
  setIsConflictsOpen: (isOpen: boolean) => void
  isDependenciesOpen: boolean
  setIsDependenciesOpen: (isOpen: boolean) => void
}>) {
  const conflicts = conflictReport?.conflicts ?? []
  const issues = dependencyReport?.issues ?? []
  const conflictCount = conflicts.length
  const dependencyIssueCount = issues.length

  return (
    <>
      <OverviewCard
        pluginCount={dependencyReport?.pluginNames.length ?? 0}
        totalOverrides={conflictReport?.totalOverrides ?? 0}
        conflictCount={conflictCount}
        dependencyIssueCount={dependencyIssueCount}
      />
      <AnalysisCard
        title="Conflicts"
        isOpen={isConflictsOpen}
        setIsOpen={setIsConflictsOpen}
        badge={
          conflictCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-500">
              {conflictCount}
            </span>
          )
        }
      >
        <ConflictList conflicts={conflicts} />
      </AnalysisCard>
      <AnalysisCard
        title="Dependencies"
        isOpen={isDependenciesOpen}
        setIsOpen={setIsDependenciesOpen}
        badge={
          dependencyIssueCount > 0 && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs',
                dependencyReport?.health === 'errors'
                  ? 'bg-red-500/20 text-red-500'
                  : 'bg-amber-500/20 text-amber-500'
              )}
            >
              {dependencyIssueCount}
            </span>
          )
        }
      >
        <IssueList issues={issues} />
      </AnalysisCard>
    </>
  )
}

export function AnalysisView() {
  const project = useProjectStore((s) => s.project)
  const conflictReport = useProjectStore((s) => s.conflictReport)
  const dependencyReport = useProjectStore((s) => s.dependencyReport)
  const isScanning = useProjectStore((s) => s.isScanning)
  const scanDependencies = useProjectStore((s) => s.scanDependencies)

  // The cards' open state outlives a rescan and a project change, as the view does
  const [isConflictsOpen, setIsConflictsOpen] = useState(true)
  const [isDependenciesOpen, setIsDependenciesOpen] = useState(true)

  if (!project) return <NoProject />

  const isInitialScan = isScanning && !conflictReport && !dependencyReport

  return (
    <div className="flex-1 overflow-auto p-6" data-testid="analysis-view">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Plugin Analysis</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void scanDependencies()
          }}
          disabled={isScanning}
        >
          <RefreshCw className={cn('mr-1 h-4 w-4', isScanning && 'animate-spin')} />
          Rescan
        </Button>
      </div>

      {/* Loading state during initial scan */}
      {isInitialScan && <ScanSkeleton />}

      {!isInitialScan && (
        <AnalysisReport
          conflictReport={conflictReport}
          dependencyReport={dependencyReport}
          isConflictsOpen={isConflictsOpen}
          setIsConflictsOpen={setIsConflictsOpen}
          isDependenciesOpen={isDependenciesOpen}
          setIsDependenciesOpen={setIsDependenciesOpen}
        />
      )}
    </div>
  )
}
