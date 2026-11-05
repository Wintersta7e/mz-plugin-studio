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

interface PluginBrowserProps {
  onClose: () => void
}

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

export function PluginBrowser({ onClose }: PluginBrowserProps) {
  type SortMode = 'name' | 'order'
  type FilterMode = 'all' | 'open' | 'dirty' | 'errors'
  const project = useProjectStore((s) => s.project)
  const openPlugins = usePluginStore((s) => s.openPlugins)
  const activePluginId = usePluginStore((s) => s.activePluginId)
  const dirtyByPluginId = usePluginStore((s) => s.dirtyByPluginId)
  const openPlugin = usePluginStore((s) => s.openPlugin)
  const closePlugin = usePluginStore((s) => s.closePlugin)
  const setActivePlugin = usePluginStore((s) => s.setActivePlugin)
  const dependencyReport = useProjectStore((s) => s.dependencyReport)
  const {
    files: allPluginFiles,
    isLoading,
    refresh
  } = usePluginFiles(project === null || project.path === '' ? undefined : project.path)
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<SortMode>('order')

  const pluginIssues = useMemo(() => {
    const map = new Map<string, DependencyIssue[]>()
    if (!dependencyReport) return map
    for (const issue of dependencyReport.issues) {
      const existing = map.get(issue.pluginName) ?? []
      existing.push(issue)
      map.set(issue.pluginName, existing)
    }
    return map
  }, [dependencyReport])

  // Join file list + open-plugin state into a single row model
  const allRows = useMemo<PluginRow[]>(() => {
    const openByName = new Map<string, { id: string; isActive: boolean; isDirty: boolean }>()
    for (const p of openPlugins) {
      openByName.set(p.meta.name, {
        id: p.id,
        isActive: activePluginId === p.id,
        isDirty: !!dirtyByPluginId[p.id]
      })
    }

    const rows: PluginRow[] = []
    const seenNames = new Set<string>()

    const buildRow = (
      name: string,
      filename: string,
      fileOrder: number,
      openState: { id: string; isActive: boolean; isDirty: boolean } | undefined,
      issues: DependencyIssue[]
    ): PluginRow => {
      let hasError = false
      let hasWarning = false
      for (const issue of issues) {
        if (issue.severity === 'error') hasError = true
        else if (issue.severity === 'warning') hasWarning = true
      }
      return {
        name,
        filename,
        fileOrder,
        openId: openState?.id ?? null,
        isActive: openState?.isActive ?? false,
        isDirty: openState?.isDirty ?? false,
        issues,
        hasError,
        hasWarning,
        issueTitle: issues.length > 0 ? issues.map((index) => index.message).join('\n') : null
      }
    }

    // Start with on-disk files in their list() order
    for (const [index, filename] of allPluginFiles.entries()) {
      const name = filename.replace(/\.js$/, '')
      rows.push(buildRow(name, filename, index, openByName.get(name), pluginIssues.get(name) ?? []))
      seenNames.add(name)
    }

    // Append any open plugins that aren't on disk yet (new/unsaved)
    for (const p of openPlugins) {
      if (seenNames.has(p.meta.name)) continue
      rows.push(
        buildRow(
          p.meta.name || '(unnamed)',
          `${p.meta.name}.js`,
          Number.MAX_SAFE_INTEGER,
          { id: p.id, isActive: activePluginId === p.id, isDirty: !!dirtyByPluginId[p.id] },
          []
        )
      )
    }

    return rows
  }, [allPluginFiles, openPlugins, activePluginId, dirtyByPluginId, pluginIssues])

  const filteredAndSorted = useMemo(() => {
    const needle = search.trim().toLowerCase()
    let rows = allRows
    if (needle) {
      rows = rows.filter((r) => r.name.toLowerCase().includes(needle))
    }
    if (filterMode === 'open') {
      rows = rows.filter((r) => r.openId !== null)
    } else if (filterMode === 'dirty') {
      rows = rows.filter((r) => r.isDirty)
    } else if (filterMode === 'errors') {
      rows = rows.filter((r) => r.hasError)
    }
    if (sortMode === 'name') {
      return [...rows].sort((a, b) => a.name.localeCompare(b.name))
    }
    return rows // already in file order
  }, [allRows, search, filterMode, sortMode])

  const counts = useMemo(() => {
    let open = 0
    let dirty = 0
    let errors = 0
    for (const r of allRows) {
      if (r.openId !== null) open++
      if (r.isDirty) dirty++
      if (r.hasError) errors++
    }
    return { total: allRows.length, open, dirty, errors }
  }, [allRows])

  const handleRowClick = async (row: PluginRow) => {
    if (row.openId) {
      // Already open — just switch to it
      setActivePlugin(row.openId)
      return
    }
    if (!project?.path) return
    try {
      const loaded = await window.api.plugin.load(project.path, row.filename)
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

  const handleClose = async (e: React.MouseEvent, openId: string, pluginName: string) => {
    e.stopPropagation()
    if (dirtyByPluginId[openId]) {
      const result = await window.api.dialog.message({
        type: 'question',
        title: 'Unsaved Changes',
        message: `"${pluginName}" has unsaved changes. Close anyway?`,
        buttons: ['Cancel', 'Close Without Saving']
      })
      if (result === 0) return
    }
    closePlugin(openId)
  }

  return (
    <div
      data-testid="plugin-browser-panel"
      className="flex h-full w-72 flex-col border-l border-border bg-background"
    >
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
            onClick={() => {
              void refresh()
            }}
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

      {/* Search */}
      <div className="relative border-b border-border px-3 py-2">
        <Search className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plugins…"
          className="h-8 pl-7 text-sm"
        />
      </div>

      {/* Filter + sort controls */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
        </div>
        <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
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
        <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
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

      {/* Plugin list */}
      <ScrollArea className="flex-1">
        {filteredAndSorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {search.trim() || filterMode !== 'all'
              ? 'No plugins match the current filter.'
              : 'No plugins found in js/plugins.'}
          </div>
        ) : (
          <ul className="py-1">
            {filteredAndSorted.map((row) => (
              <li
                key={row.filename}
                className={cn(
                  'group flex items-center text-sm transition-colors',
                  'hover:bg-muted/70 has-focus-visible:bg-muted/70',
                  row.isActive && 'bg-primary/15 text-foreground',
                  !row.isActive && row.openId && 'text-foreground',
                  !row.openId && 'text-muted-foreground'
                )}
              >
                <button
                  data-testid="plugin-browser-row"
                  onClick={() => handleRowClick(row)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left focus-visible:outline-hidden"
                  aria-current={row.isActive ? 'page' : undefined}
                  title={row.issueTitle ?? row.filename}
                >
                  <FileCode
                    className={cn(
                      'h-4 w-4 shrink-0',
                      row.isActive && 'text-primary',
                      !row.isActive && row.openId && 'text-foreground/80',
                      !row.openId && 'text-muted-foreground/60'
                    )}
                  />
                  <span className={cn('flex-1 truncate', row.openId && 'font-medium')}>
                    {row.name}
                  </span>

                  {/* Status glyphs */}
                  <span className="flex items-center gap-1">
                    {row.hasError && (
                      <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-label="has errors" />
                    )}
                    {!row.hasError && row.hasWarning && (
                      <AlertTriangle
                        className="h-3.5 w-3.5 text-amber-500"
                        aria-label="has warnings"
                      />
                    )}
                    {row.isDirty && (
                      <CircleDot className="h-3 w-3 text-orange-500" aria-label="unsaved changes" />
                    )}
                  </span>
                </button>

                {/* Close-if-open button — only visible on hover for open plugins */}
                {row.openId && (
                  <button
                    onClick={(e) => row.openId && handleClose(e, row.openId, row.name)}
                    className="mr-3 hidden h-4 w-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive hover:text-destructive-foreground group-hover:flex"
                    aria-label={`Close ${row.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      {/* Footer summary */}
      <footer className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {counts.total} total
        {counts.dirty > 0 && <span className="ml-2 text-orange-400">• {counts.dirty} dirty</span>}
        {counts.errors > 0 && <span className="ml-2 text-red-400">• {counts.errors} errors</span>}
      </footer>
    </div>
  )
}
