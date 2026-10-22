import { useMemo, useCallback, useState, useRef, useEffect, useDeferredValue } from 'react'
import Editor from '@monaco-editor/react'
import {
  Copy,
  Download,
  Check,
  FileCode2,
  GitCompare,
  ChevronDown,
  FileText,
  FileType,
  FileJson
} from 'lucide-react'
import { Button } from '../ui/button'
import {
  usePluginStore,
  useProjectStore,
  useSettingsStore,
  useToastStore,
  useUIStore
} from '../../stores'
import { validatePlugin } from '../../lib/generator'
import {
  generatePluginsJsonEntry,
  generateTypeDeclaration,
  generateReadme
} from '../../lib/exportFormats'
import { generatePluginOutput, isImported, isRawMode } from '../../lib/plugin-output'
import type { PluginOutput } from '../../lib/plugin-output'
import { reloadFromProject } from '../../lib/raw-mode'
import { savePlugin } from '../../lib/save-plugin'
import { NOTICE_MS } from '../../stores/toastStore'
import { DiffView } from './DiffView'
import { cn, userMessage } from '../../lib/utils'
import log from 'electron-log/renderer'

export function CodePreview() {
  const plugin = usePluginStore((s) => s.plugin)
  const project = useProjectStore((s) => s.project)
  const savedPath = usePluginStore((s) => s.savedPath)

  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const editorWordWrap = useSettingsStore((s) => s.editorWordWrap)
  const editorMinimap = useSettingsStore((s) => s.editorMinimap)
  const editorLineNumbers = useSettingsStore((s) => s.editorLineNumbers)
  const theme = useSettingsStore((s) => s.theme)

  const addToast = useToastStore((s) => s.addToast)
  const previewRawMode = isRawMode(
    plugin,
    useUIStore((s) => s.rawModeByPluginId[plugin.id])
  )
  const setRawModeForPlugin = useUIStore((s) => s.setRawModeForPlugin)
  const diffRequested = useUIStore((s) => s.diffRequestPluginId === plugin.id)

  const [copied, setCopied] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [onDiskCode, setOnDiskCode] = useState<string | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [badgeBounce, setBadgeBounce] = useState(false)

  const previewOptions = useMemo(
    () => ({
      readOnly: true,
      minimap: { enabled: editorMinimap },
      fontSize: editorFontSize,
      lineNumbers: editorLineNumbers ? ('on' as const) : ('off' as const),
      scrollBeyondLastLine: false,
      wordWrap: editorWordWrap ? ('on' as const) : ('off' as const),
      automaticLayout: true,
      padding: { top: 16, bottom: 16 }
    }),
    [editorMinimap, editorFontSize, editorLineNumbers, editorWordWrap]
  )
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef({ errors: 0, warnings: 0 })
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Clean up copy timer on unmount
  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    },
    []
  )

  const imported = isImported(plugin)
  const hasSavedVersion = Boolean(savedPath || plugin.rawSource)

  // Defer expensive computations so keystrokes aren't blocked by code gen + validation
  const deferredPlugin = useDeferredValue(plugin)

  // Derive raw mode from deferred plugin to keep code gen consistent (R3-02)
  const deferredRawMode = isRawMode(
    deferredPlugin,
    useUIStore((s) => s.rawModeByPluginId[deferredPlugin.id])
  )
  const deferredBaseline = usePluginStore((s) => s.baselineByPluginId[deferredPlugin.id]) ?? null

  const output = useMemo((): PluginOutput => {
    try {
      return generatePluginOutput(deferredPlugin, deferredRawMode, deferredBaseline)
    } catch (e) {
      log.error('Code generation error:', e)
      return {
        ok: true,
        code: `// Code generation error: ${e instanceof Error ? e.message : String(e)}`
      }
    }
  }, [deferredPlugin, deferredRawMode, deferredBaseline])
  // The diff shows the code a save would write
  const code = output.ok ? output.code : ''
  const sourceMissing = !output.ok && output.refusal === 'source-missing'
  const remedy =
    'Open its project and click Reload from project to restore it. Until then, raw mode cannot save it.'
  const banner = sourceMissing
    ? deferredPlugin.rawSource
      ? `The app's copy of ${deferredPlugin.importedFrom} as it was last read is missing, so raw mode cannot tell what changed. ${remedy}`
      : `This plugin's file text (${deferredPlugin.importedFrom}) is not loaded — plugins opened in an older version of the app did not keep it. ${remedy}`
    : output.ok
      ? null
      : output.message

  const validation = useMemo(() => {
    try {
      return validatePlugin(deferredPlugin)
    } catch (e) {
      log.error('Validation error:', e)
      return { valid: false, errors: [String(e)], warnings: [] }
    }
  }, [deferredPlugin])

  // Badge bounce when validation counts change
  useEffect(() => {
    const prevErrors = prevCountRef.current.errors
    const prevWarnings = prevCountRef.current.warnings
    let timer: ReturnType<typeof setTimeout> | undefined
    if (
      validation.errors.length !== prevErrors ||
      (validation.warnings?.length ?? 0) !== prevWarnings
    ) {
      setBadgeBounce(true)
      timer = setTimeout(() => setBadgeBounce(false), 300)
    }
    prevCountRef.current = {
      errors: validation.errors.length,
      warnings: validation.warnings?.length ?? 0
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [validation.errors.length, validation.warnings?.length])

  // Close export menu on outside click
  useEffect(() => {
    if (!exportMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [exportMenuOpen])

  const handleCopy = useCallback(async () => {
    // Generate fresh code from immediate state, not deferred (R3-06)
    const { plugin: currentPlugin, baselineByPluginId } = usePluginStore.getState()
    const rawMode = isRawMode(
      currentPlugin,
      useUIStore.getState().rawModeByPluginId[currentPlugin.id]
    )
    const fresh = generatePluginOutput(
      currentPlugin,
      rawMode,
      baselineByPluginId[currentPlugin.id] ?? null
    )
    if (!fresh.ok) {
      addToast({ type: 'error', message: fresh.message })
      return
    }
    await navigator.clipboard.writeText(fresh.code)
    setCopied(true)
    addToast({ type: 'success', message: 'Code copied to clipboard' })
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [addToast])

  const handleExport = useCallback(async () => {
    // Generate from immediate state (not deferred) to avoid saving stale code
    await savePlugin(usePluginStore.getState().plugin.id, 'export')
  }, [])

  const openDiff = useCallback(async () => {
    // Try to load on-disk version
    try {
      if (savedPath) {
        const diskCode = await window.api.plugin.readByPath(savedPath)
        setOnDiskCode(diskCode)
      } else if (plugin.rawSource) {
        setOnDiskCode(plugin.rawSource)
      }
      setShowDiff(true)
    } catch (error) {
      log.error('Failed to load on-disk version:', error)
    }
  }, [savedPath, plugin.rawSource])

  const handleDiffToggle = useCallback(async () => {
    if (showDiff) {
      setShowDiff(false)
      return
    }
    await openDiff()
  }, [showDiff, openDiff])

  // "Show Diff" in the save confirmation opens the diff of the plugin it asked about
  useEffect(() => {
    if (!diffRequested) return
    useUIStore.getState().clearDiffRequest()
    void openDiff()
  }, [diffRequested, openDiff])

  const handleExportFormat = useCallback(
    async (format: 'readme' | 'dts' | 'plugins-json') => {
      setExportMenuOpen(false)

      let content: string
      let defaultName: string
      let filters: { name: string; extensions: string[] }[]

      switch (format) {
        case 'readme':
          content = generateReadme(plugin)
          defaultName = `${plugin.meta.name || 'NewPlugin'}_README.md`
          filters = [{ name: 'Markdown Files', extensions: ['md'] }]
          break
        case 'dts':
          content = generateTypeDeclaration(plugin)
          defaultName = `${plugin.meta.name || 'NewPlugin'}.d.ts`
          filters = [{ name: 'TypeScript Declaration', extensions: ['d.ts'] }]
          break
        case 'plugins-json':
          content = generatePluginsJsonEntry(plugin)
          defaultName = `${plugin.meta.name || 'NewPlugin'}_plugins-entry.json`
          filters = [{ name: 'JSON Files', extensions: ['json'] }]
          break
      }

      const filePath = await window.api.dialog.saveFile({ defaultPath: defaultName, filters })
      if (filePath) {
        try {
          await window.api.plugin.saveToPath(filePath, content)
          addToast({ type: 'success', message: 'Plugin exported successfully' })
          log.info('[export] Plugin exported')
        } catch (error) {
          log.error('Failed to export:', error)
          addToast({
            type: 'error',
            message: `Export failed: ${userMessage(error)}`,
            duration: NOTICE_MS
          })
        }
      }
    },
    [plugin, addToast]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="text-lg font-semibold">Generated Code</h2>
          {(!validation.valid || (validation.warnings && validation.warnings.length > 0)) && (
            <button
              className="mt-1 flex items-center gap-2 text-sm"
              onClick={() => setShowValidation(!showValidation)}
            >
              {!validation.valid && (
                <span
                  className={cn(
                    'text-destructive-text',
                    badgeBounce && validation.errors.length > 0 && 'animate-badge-bounce'
                  )}
                >
                  {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
                </span>
              )}
              {validation.warnings && validation.warnings.length > 0 && (
                <span
                  className={cn(
                    'text-warning-text',
                    badgeBounce && validation.warnings.length > 0 && 'animate-badge-bounce'
                  )}
                >
                  {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}
                </span>
              )}
              <span className="text-muted-foreground">{showValidation ? '▲' : '▼'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={previewRawMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRawModeForPlugin(plugin.id, !previewRawMode)}
            disabled={!imported}
            title={
              imported
                ? previewRawMode
                  ? "Raw mode ON: the file's own code and unchanged blocks are kept"
                  : 'Raw mode OFF: the whole plugin is regenerated from the editor'
                : 'Raw mode unavailable: plugin was not imported from a file'
            }
          >
            <FileCode2 className="mr-1 h-4 w-4" />
            {previewRawMode ? 'Raw ON' : 'Raw'}
          </Button>

          <Button
            variant={showDiff ? 'default' : 'outline'}
            size="sm"
            onClick={handleDiffToggle}
            disabled={!hasSavedVersion}
            title={
              hasSavedVersion
                ? 'Compare generated output with saved file'
                : 'Diff unavailable: no saved version to compare'
            }
          >
            <GitCompare className="mr-1 h-4 w-4" />
            Diff
          </Button>

          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-1 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-1 h-4 w-4" />
                Copy
              </>
            )}
          </Button>

          <Button size="sm" onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>

          {/* Export formats dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <Button
              variant="outline"
              size="sm"
              className="px-1.5"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              title="Export in other formats"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>

            {exportMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-popover p-1 shadow-md">
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleExportFormat('readme')}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <div className="text-left">
                    <div>Export README.md</div>
                    <div className="text-xs text-muted-foreground">
                      Auto-generated documentation
                    </div>
                  </div>
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleExportFormat('dts')}
                >
                  <FileType className="h-4 w-4 shrink-0" />
                  <div className="text-left">
                    <div>Export .d.ts</div>
                    <div className="text-xs text-muted-foreground">TypeScript type definitions</div>
                  </div>
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleExportFormat('plugins-json')}
                >
                  <FileJson className="h-4 w-4 shrink-0" />
                  <div className="text-left">
                    <div>Export plugins.json entry</div>
                    <div className="text-xs text-muted-foreground">PluginManager configuration</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Validation errors & warnings (collapsible) */}
      {showValidation && (
        <>
          {!validation.valid && (
            <div className="border-b border-border bg-destructive/10 p-3">
              <ul className="space-y-1 text-sm text-destructive-text">
                {validation.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {validation.warnings && validation.warnings.length > 0 && (
            <div className="border-b border-border bg-yellow-500/10 p-3">
              <ul className="space-y-1 text-sm text-warning-text">
                {validation.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {banner !== null && (
        <div
          role={sourceMissing ? 'status' : 'alert'}
          className={cn(
            'flex items-center gap-3 border-b border-border p-3 text-sm',
            sourceMissing
              ? 'bg-yellow-500/10 text-warning-text'
              : 'bg-destructive/10 text-destructive-text'
          )}
        >
          <span className="flex-1">{banner}</span>
          {sourceMissing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void reloadFromProject(deferredPlugin.id)}
              disabled={!project}
              title={project ? undefined : 'Open the project first.'}
            >
              Reload from project
            </Button>
          )}
        </div>
      )}

      <div className="flex-1">
        {showDiff && onDiskCode !== null ? (
          <DiffView original={onDiskCode} modified={code} />
        ) : (
          <Editor
            height="100%"
            language="javascript"
            value={code}
            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
            options={previewOptions}
          />
        )}
      </div>
    </div>
  )
}
