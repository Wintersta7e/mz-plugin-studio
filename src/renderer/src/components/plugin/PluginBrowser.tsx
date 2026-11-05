import { useState, useMemo, useEffect } from 'react'
import {
  X,
  Search,
  RefreshCw,
  FileCode,
  AlertCircle,
  AlertTriangle,
  Filter,
  ArrowDownAZ,
  ListOrdered,
  CircleDot
} from 'lucide-react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useProjectStore, usePluginStore, useToastStore } from '../../stores'
import { NOTICE_MS } from '../../stores/toastStore'
import type { DependencyIssue } from '../../lib/dependency-analyzer'
import { cn, userMessage } from '../../lib/utils'
import log from 'electron-log/renderer'

type PluginBrowserProps = Readonly<{ onClose: () => void }>

const SORT_MODES = ['name', 'order'] as const
type SortMode = (typeof SORT_MODES)[number]
const FILTER_MODES = ['all', 'open', 'dirty', 'errors'] as const
type FilterMode = (typeof FILTER_MODES)[number]

type OpenState = Readonly<{ id: string; isActive: boolean; isDirty: boolean }>

type RowCounts = Readonly<{ total: number; open: number; dirty: number; errors: number }>

interface PluginRow {
  name: string // filename without .js
  filename: string
  fileOrder: number // index from list() — preserves on-disk order
  openId: string | null // pluginStore id if currently open
  isActive: boolean
  isDirty: boolean
  issues: DependencyIssue[]
  hasError: boolean
  hasWarning: boolean
  issueTitle: string | null
}

const NO_FILES: readonly string[] = []

// The plugin files in the project folder, or none when they cannot be listed
async function listPluginFiles(projectPath: string): Promise<readonly string[]> {
  try {
    return await globalThis.api.plugin.list(projectPath)
  } catch (error) {
    log.error('PluginBrowser: failed to list plugins', error)
    return NO_FILES
  }
}

/**
The plugin files of the open project. A list is kept with the folder it was read from, so the
list of one project is never shown for the next while that one's list loads.
*/
function usePluginFiles(projectPath: string | undefined): {
  files: readonly string[]
  isLoading: boolean
  refresh: () => Promise<void>
} {
  type Listing = Readonly<{ path: string; files: readonly string[] }>
  const [listing, setListing] = useState<Listing | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const scanDependencies = useProjectStore((s) => s.scanDependencies)

  useEffect(() => {
    if (projectPath === undefined) return
    let isCancelled = false
    const load = async (): Promise<void> => {
      const files = await listPluginFiles(projectPath)
      if (!isCancelled) setListing({ path: projectPath, files })
    }
    void load()
    return () => {
      isCancelled = true
    }
  }, [projectPath])

  const refresh = async (): Promise<void> => {
    if (projectPath === undefined) return
    setIsRefreshing(true)
    try {
      const files = await globalThis.api.plugin.list(projectPath)
      setListing({ path: projectPath, files })
      await scanDependencies()
    } catch (error) {
      log.error('PluginBrowser: refresh failed', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const isCurrent = listing !== null && listing.path === projectPath
  return {
    files: isCurrent ? listing.files : NO_FILES,
    isLoading: isRefreshing || (projectPath !== undefined && !isCurrent),
    refresh
  }
}

function buildRow(
  name: string,
  filename: string,
  fileOrder: number,
  openState: OpenState | undefined,
  issues: DependencyIssue[]
): PluginRow {
  return {
    name,
    filename,
    fileOrder,
    openId: openState?.id ?? null,
    isActive: openState?.isActive ?? false,
    isDirty: openState?.isDirty ?? false,
    issues,
    hasError: issues.some((issue) => issue.severity === 'error'),
    hasWarning: issues.some((issue) => issue.severity === 'warning'),
    issueTitle: issues.length > 0 ? issues.map((issue) => issue.message).join('\n') : null
  }
}

// The dependency issues of the project scan, by plugin name
function useIssuesByPlugin(): Map<string, DependencyIssue[]> {
  const dependencyReport = useProjectStore((s) => s.dependencyReport)
  return useMemo(
    () => Map.groupBy(dependencyReport?.issues ?? [], (issue) => issue.pluginName),
    [dependencyReport]
  )
}

// A plugin with no entry has no unsaved changes
const isDirtyPlugin = (
  dirtyByPluginId: Readonly<Partial<Record<string, boolean>>>,
  id: string
): boolean => dirtyByPluginId[id] === true

// One row per plugin file in list order, then the open plugins not on disk yet (new or unsaved)
function usePluginRows(files: readonly string[]): PluginRow[] {
  const openPlugins = usePluginStore((s) => s.openPlugins)
  const activePluginId = usePluginStore((s) => s.activePluginId)
  const dirtyByPluginId = usePluginStore((s) => s.dirtyByPluginId)
  const issuesByPlugin = useIssuesByPlugin()
  return useMemo(() => {
    const openState = (id: string): OpenState => ({
      id,
      isActive: activePluginId === id,
      isDirty: isDirtyPlugin(dirtyByPluginId, id)
    })
    const openByName = new Map(openPlugins.map((p) => [p.meta.name, openState(p.id)]))
    const rows = files.map((filename, index) => {
      const name = filename.replace(/\.js$/, '')
      return buildRow(name, filename, index, openByName.get(name), issuesByPlugin.get(name) ?? [])
    })
    const seenNames = new Set(rows.map((row) => row.name))
    for (const p of openPlugins) {
      if (seenNames.has(p.meta.name)) continue
      const name = p.meta.name === '' ? '(unnamed)' : p.meta.name
      rows.push(buildRow(name, `${p.meta.name}.js`, Number.MAX_SAFE_INTEGER, openState(p.id), []))
    }
    return rows
  }, [files, openPlugins, activePluginId, dirtyByPluginId, issuesByPlugin])
}

function isInFilter(row: PluginRow, filterMode: FilterMode): boolean {
  switch (filterMode) {
    case 'open': {
      return row.openId !== null
    }
    case 'dirty': {
      return row.isDirty
    }
    case 'errors': {
      return row.hasError
    }
    case 'all': {
      return true
    }
  }
}

function filterAndSort(
  rows: PluginRow[],
  search: string,
  filterMode: FilterMode,
  sortMode: SortMode
): PluginRow[] {
  const needle = search.trim().toLowerCase()
  const kept = rows.filter(
    (row) => row.name.toLowerCase().includes(needle) && isInFilter(row, filterMode)
  )
  // Rows are already in file order
  return sortMode === 'name' ? kept.toSorted((a, b) => a.name.localeCompare(b.name)) : kept
}

function countRows(rows: PluginRow[]): RowCounts {
  return {
    total: rows.length,
    open: rows.filter((row) => row.openId !== null).length,
    dirty: rows.filter((row) => row.isDirty).length,
    errors: rows.filter((row) => row.hasError).length
  }
}

// Switches to an open plugin, or opens it from the project folder
async function openRow(row: PluginRow, projectPath: string | undefined): Promise<void> {
  const { openPlugin, setActivePlugin } = usePluginStore.getState()
  if (row.openId !== null) {
    setActivePlugin(row.openId)
    return
  }
  if (projectPath === undefined) return
  try {
    const loaded = await globalThis.api.plugin.load(projectPath, row.filename)
    openPlugin(loaded.plugin, { path: loaded.path, sha256: loaded.sha256 })
  } catch (error) {
    log.error(`PluginBrowser: failed to load ${row.filename}`, error)
    // Main's message names the file and says why it was not opened
    useToastStore.getState().addToast({
      type: 'error',
      message: userMessage(error),
      duration: NOTICE_MS
    })
  }
}

// Closes an open plugin, asking first when it has unsaved changes
async function closeRow(openId: string, pluginName: string): Promise<void> {
  if (isDirtyPlugin(usePluginStore.getState().dirtyByPluginId, openId)) {
    const result = await globalThis.api.dialog.message({
      type: 'question',
      title: 'Unsaved Changes',
      message: `"${pluginName}" has unsaved changes. Close anyway?`,
      buttons: ['Cancel', 'Close Without Saving']
    })
    if (result === 0) return
  }
  usePluginStore.getState().closePlugin(openId)
}

type BrowserHeaderProps = Readonly<{
  counts: RowCounts
  isLoading: boolean
  onRefresh: () => void
  onClose: () => void
}>

function BrowserHeader({ counts, isLoading, onRefresh, onClose }: BrowserHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border px-3 py-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Plugins</h2>
        <span className="text-xs text-muted-foreground">
          {counts.open}/{counts.total}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh plugin list"
          title="Refresh"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
          aria-label="Close plugin browser"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

type BrowserControlsProps = Readonly<{
  counts: RowCounts
  filterMode: FilterMode
  sortMode: SortMode
  onFilterMode: (mode: FilterMode) => void
  onSortMode: (mode: SortMode) => void
}>

function BrowserControls({
  counts,
  filterMode,
  sortMode,
  onFilterMode,
  onSortMode
}: BrowserControlsProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
      </div>
      <Select
        value={filterMode}
        onValueChange={(value) => {
          const mode = FILTER_MODES.find((m) => m === value)
          if (mode !== undefined) onFilterMode(mode)
        }}
      >
        <SelectTrigger className="h-7 flex-1 text-xs" aria-label="Filter plugins">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All ({counts.total})</SelectItem>
          <SelectItem value="open">Open ({counts.open})</SelectItem>
          <SelectItem value="dirty">Dirty ({counts.dirty})</SelectItem>
          <SelectItem value="errors">Errors ({counts.errors})</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={sortMode}
        onValueChange={(value) => {
          const mode = SORT_MODES.find((m) => m === value)
          if (mode !== undefined) onSortMode(mode)
        }}
      >
        <SelectTrigger className="h-7 w-24 text-xs" aria-label="Sort plugins">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="order">
            <div className="flex items-center gap-2">
              <ListOrdered className="h-3.5 w-3.5" />
              Order
            </div>
          </SelectItem>
          <SelectItem value="name">
            <div className="flex items-center gap-2">
              <ArrowDownAZ className="h-3.5 w-3.5" />
              A–Z
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

// The status glyphs of a row: errors, else warnings, and unsaved changes
function RowStatus({ row }: Readonly<{ row: PluginRow }>) {
  return (
    <span className="flex items-center gap-1">
      {row.hasError && <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-label="has errors" />}
      {!row.hasError && row.hasWarning && (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label="has warnings" />
      )}
      {row.isDirty && (
        <CircleDot className="h-3 w-3 text-orange-500" aria-label="unsaved changes" />
      )}
    </span>
  )
}

function PluginRowItem({
  row,
  projectPath
}: Readonly<{ row: PluginRow; projectPath: string | undefined }>) {
  const isOpen = row.openId !== null
  return (
    <li
      className={cn(
        'group flex items-center text-sm transition-colors',
        'hover:bg-muted/70 has-focus-visible:bg-muted/70',
        row.isActive && 'bg-primary/15 text-foreground',
        !row.isActive && isOpen && 'text-foreground',
        !isOpen && 'text-muted-foreground'
      )}
    >
      <button
        type="button"
        data-testid="plugin-browser-row"
        onClick={() => {
          void openRow(row, projectPath)
        }}
        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left focus-visible:outline-hidden"
        aria-current={row.isActive ? 'page' : undefined}
        title={row.issueTitle ?? row.filename}
      >
        <FileCode
          className={cn(
            'h-4 w-4 shrink-0',
            row.isActive && 'text-primary',
            !row.isActive && isOpen && 'text-foreground/80',
            !isOpen && 'text-muted-foreground/60'
          )}
        />
        <span className={cn('flex-1 truncate', isOpen && 'font-medium')}>{row.name}</span>
        <RowStatus row={row} />
      </button>

      {/* Close-if-open button — only visible on hover for open plugins */}
      {row.openId !== null && <CloseRowButton openId={row.openId} name={row.name} />}
    </li>
  )
}

function CloseRowButton({ openId, name }: Readonly<{ openId: string; name: string }>) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        void closeRow(openId, name)
      }}
      className="mr-3 hidden h-4 w-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive hover:text-destructive-foreground group-hover:flex"
      aria-label={`Close ${name}`}
    >
      <X className="h-3 w-3" />
    </button>
  )
}

export function PluginBrowser({ onClose }: PluginBrowserProps) {
  const project = useProjectStore((s) => s.project)
  const projectPath = project === null || project.path === '' ? undefined : project.path
  const { files, isLoading, refresh } = usePluginFiles(projectPath)
  const allRows = usePluginRows(files)
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<SortMode>('order')
  const shownRows = filterAndSort(allRows, search, filterMode, sortMode)
  const counts = countRows(allRows)

  return (
    <div
      data-testid="plugin-browser-panel"
      className="flex h-full w-72 flex-col border-l border-border bg-background"
    >
      <BrowserHeader
        counts={counts}
        isLoading={isLoading}
        onRefresh={() => {
          void refresh()
        }}
        onClose={onClose}
      />

      <div className="relative border-b border-border px-3 py-2">
        <Search className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
          }}
          placeholder="Search plugins…"
          className="h-8 pl-7 text-sm"
        />
      </div>

      <BrowserControls
        counts={counts}
        filterMode={filterMode}
        sortMode={sortMode}
        onFilterMode={setFilterMode}
        onSortMode={setSortMode}
      />

      <ScrollArea className="flex-1">
        {shownRows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {filterMode === 'all' && search.trim() === ''
              ? 'No plugins found in js/plugins.'
              : 'No plugins match the current filter.'}
          </div>
        ) : (
          <ul className="py-1">
            {shownRows.map((row) => (
              <PluginRowItem key={row.filename} row={row} projectPath={projectPath} />
            ))}
          </ul>
        )}
      </ScrollArea>

      <footer className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {counts.total} total
        {counts.dirty > 0 && <span className="ml-2 text-orange-400">• {counts.dirty} dirty</span>}
        {counts.errors > 0 && <span className="ml-2 text-red-400">• {counts.errors} errors</span>}
      </footer>
    </div>
  )
}
