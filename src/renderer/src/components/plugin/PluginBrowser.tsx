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
import { useProjectStore, usePluginStore } from '../../stores'
import type { DependencyIssue } from '../../lib/dependency-analyzer'
import { cn } from '../../lib/utils'
import log from 'electron-log/renderer'

interface PluginBrowserProps {
  onClose: () => void
}

type FilterMode = 'all' | 'open' | 'dirty' | 'errors'
type SortMode = 'name' | 'order'

interface PluginRow {
  name: string // filename without .js
  filename: string
  fileOrder: number // index from list() — preserves on-disk order
  openId: string | null // pluginStore id if currently open
  isActive: boolean
  isDirty: boolean
  issues: DependencyIssue[]
}

export function PluginBrowser({ onClose }: PluginBrowserProps) {
  const project = useProjectStore((s) => s.project)
  const openPlugins = usePluginStore((s) => s.openPlugins)
  const activePluginId = usePluginStore((s) => s.activePluginId)
  const dirtyByPluginId = usePluginStore((s) => s.dirtyByPluginId)
  const openPlugin = usePluginStore((s) => s.openPlugin)
  const closePlugin = usePluginStore((s) => s.closePlugin)
  const setActivePlugin = usePluginStore((s) => s.setActivePlugin)
  const dependencyReport = useProjectStore((s) => s.dependencyReport)
  const scanDependencies = useProjectStore((s) => s.scanDependencies)

  const [allPluginFiles, setAllPluginFiles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<SortMode>('order')

  // Load plugin file list when project changes
  useEffect(() => {
    let cancelled = false
    if (!project?.path) {
      setAllPluginFiles([])
      return
    }
    setIsLoading(true)
    window.api.plugin.list(project.path).then(
      (files) => {
        if (!cancelled) {
          setAllPluginFiles(files)
          setIsLoading(false)
        }
      },
      (err) => {
        if (!cancelled) {
          log.error('PluginBrowser: failed to list plugins', err)
          setAllPluginFiles([])
          setIsLoading(false)
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [project?.path])

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

    // Start with on-disk files in their list() order
    allPluginFiles.forEach((filename, index) => {
      const name = filename.replace(/\.js$/, '')
      const openState = openByName.get(name)
      rows.push({
        name,
        filename,
        fileOrder: index,
        openId: openState?.id ?? null,
        isActive: openState?.isActive ?? false,
        isDirty: openState?.isDirty ?? false,
        issues: pluginIssues.get(name) ?? []
      })
      seenNames.add(name)
    })

    // Append any open plugins that aren't on disk yet (new/unsaved)
    openPlugins.forEach((p) => {
      if (seenNames.has(p.meta.name)) return
      rows.push({
        name: p.meta.name || '(unnamed)',
        filename: `${p.meta.name}.js`,
        fileOrder: Number.MAX_SAFE_INTEGER,
        openId: p.id,
        isActive: activePluginId === p.id,
        isDirty: !!dirtyByPluginId[p.id],
        issues: []
      })
    })

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
      rows = rows.filter((r) => r.issues.some((i) => i.severity === 'error'))
    }
    if (sortMode === 'name') {
      return [...rows].sort((a, b) => a.name.localeCompare(b.name))
    }
    return rows // already in file order
  }, [allRows, search, filterMode, sortMode])

  const counts = useMemo(
    () => ({
      total: allRows.length,
      open: allRows.filter((r) => r.openId !== null).length,
      dirty: allRows.filter((r) => r.isDirty).length,
      errors: allRows.filter((r) => r.issues.some((i) => i.severity === 'error')).length
    }),
    [allRows]
  )

  const handleRefresh = async () => {
    if (!project?.path) return
    setIsLoading(true)
    try {
      const files = await window.api.plugin.list(project.path)
      setAllPluginFiles(files)
      await scanDependencies()
    } catch (err) {
      log.error('PluginBrowser: refresh failed', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRowClick = async (row: PluginRow) => {
    if (row.openId) {
      // Already open — just switch to it
      setActivePlugin(row.openId)
      return
    }
    if (!project?.path) return
    try {
      const plugin = await window.api.plugin.load(project.path, row.filename)
      openPlugin(plugin)
    } catch (err) {
      log.error(`PluginBrowser: failed to load ${row.filename}`, err)
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

  if (!project) {
    return (
      <div className="flex h-full w-72 flex-col border-l border-border bg-background">
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <h2 className="text-sm font-semibold">Plugins</h2>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Open a project to browse its plugins.
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-72 flex-col border-l border-border bg-background">
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
            onClick={handleRefresh}
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
              <li key={row.filename}>
                <button
                  onClick={() => handleRowClick(row)}
                  className={cn(
                    'group relative flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                    'hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none',
                    row.isActive && 'bg-primary/15 text-foreground',
                    !row.isActive && row.openId && 'text-foreground',
                    !row.openId && 'text-muted-foreground'
                  )}
                  aria-current={row.isActive ? 'page' : undefined}
                  title={
                    row.issues.length > 0
                      ? row.issues.map((i) => i.message).join('\n')
                      : row.filename
                  }
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
                    {row.issues.some((i) => i.severity === 'error') && (
                      <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-label="has errors" />
                    )}
                    {!row.issues.some((i) => i.severity === 'error') &&
                      row.issues.some((i) => i.severity === 'warning') && (
                        <AlertTriangle
                          className="h-3.5 w-3.5 text-amber-500"
                          aria-label="has warnings"
                        />
                      )}
                    {row.isDirty && (
                      <CircleDot className="h-3 w-3 text-orange-500" aria-label="unsaved changes" />
                    )}
                  </span>

                  {/* Close-if-open button — only visible on hover for open plugins */}
                  {row.openId && (
                    <button
                      onClick={(e) => handleClose(e, row.openId!, row.name)}
                      className="ml-1 hidden h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive hover:text-destructive-foreground group-hover:flex"
                      aria-label={`Close ${row.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </button>
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
