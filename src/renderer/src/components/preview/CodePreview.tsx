import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
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
import { usePluginStore, useProjectStore, useSettingsStore, useToastStore } from '../../stores'
import { generatePlugin, generateRawMode, validatePlugin } from '../../lib/generator'
import {
  generatePluginsJsonEntry,
  generateTypeDeclaration,
  generateReadme
} from '../../lib/exportFormats'
import { DiffView } from './DiffView'
import { cn } from '../../lib/utils'
import log from 'electron-log/renderer'

export function CodePreview() {
  const plugin = usePluginStore((s) => s.plugin)
  const project = useProjectStore((s) => s.project)
  const savedPath = usePluginStore((s) => s.savedPath)
  const setSavedPath = usePluginStore((s) => s.setSavedPath)
  const setDirty = usePluginStore((s) => s.setDirty)

  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const editorWordWrap = useSettingsStore((s) => s.editorWordWrap)
  const editorMinimap = useSettingsStore((s) => s.editorMinimap)
  const editorLineNumbers = useSettingsStore((s) => s.editorLineNumbers)
  const theme = useSettingsStore((s) => s.theme)

  const addToast = useToastStore((s) => s.addToast)

  const [copied, setCopied] = useState(false)
  const [rawMode, setRawMode] = useState(Boolean(plugin.rawSource))
  const [showDiff, setShowDiff] = useState(false)
  const [onDiskCode, setOnDiskCode] = useState<string | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [badgeBounce, setBadgeBounce] = useState(false)
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

  const hasRawSource = Boolean(plugin.rawSource)
  const hasSavedVersion = Boolean(savedPath || plugin.rawSource)

  // Auto-enable raw mode for imported plugins, disable for new plugins
  useEffect(() => {
    setRawMode(hasRawSource)
  }, [hasRawSource])

  const code = useMemo(() => {
    try {
      if (rawMode && hasRawSource) {
        return generateRawMode(plugin)
      }
      return generatePlugin(plugin)
    } catch (e) {
      log.error('Code generation error:', e)
      return `// Code generation error: ${e instanceof Error ? e.message : String(e)}`
    }
  }, [plugin, rawMode, hasRawSource])

  // Diff always uses raw mode for imported plugins (shows meaningful metadata changes, not full regeneration noise)
  const diffModifiedCode = useMemo(() => {
    if (!hasRawSource) return code
    try {
      return generateRawMode(plugin)
    } catch {
      return code
    }
  }, [plugin, hasRawSource, code])

  const validation = useMemo(() => {
    try {
      return validatePlugin(plugin)
    } catch (e) {
      log.error('Validation error:', e)
      return { valid: false, errors: [String(e)], warnings: [] }
    }
  }, [plugin])

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
    await navigator.clipboard.writeText(code)
    setCopied(true)
    addToast({ type: 'success', message: 'Code copied to clipboard' })
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [code, addToast])

  const handleExport = useCallback(async () => {
    if (!project) {
      const filePath = await window.api.dialog.saveFile({
        defaultPath: `${plugin.meta.name || 'NewPlugin'}.js`,
        filters: [{ name: 'JavaScript Files', extensions: ['js'] }]
      })
      if (filePath) {
        try {
          const result = await window.api.plugin.saveToPath(filePath, code)
          if (result.success) {
            setSavedPath(result.path)
            setDirty(false)
            addToast({ type: 'success', message: 'Plugin exported successfully' })
            log.info('[save] Plugin saved successfully')
          }
        } catch (error) {
          log.error('Failed to save plugin:', error)
          addToast({
            type: 'error',
            message: `Export failed: ${error instanceof Error ? error.message : String(error)}`
          })
        }
      }
      return
    }

    const filename = `${plugin.meta.name || 'NewPlugin'}.js`
    try {
      const result = await window.api.plugin.save(project.path, filename, code)
      if (result.success) {
        setSavedPath(result.path)
        setDirty(false)
        addToast({ type: 'success', message: 'Plugin exported successfully' })
        log.info('[save] Plugin saved successfully')
      }
    } catch (error) {
      log.error('Failed to save plugin:', error)
      addToast({
        type: 'error',
        message: `Export failed: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }, [code, plugin.meta.name, project, setSavedPath, setDirty, addToast])

  const handleDiffToggle = useCallback(async () => {
    if (showDiff) {
      setShowDiff(false)
      return
    }

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
  }, [showDiff, savedPath, plugin.rawSource])

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
            message: `Export failed: ${error instanceof Error ? error.message : String(error)}`
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
                    'text-destructive',
                    badgeBounce && validation.errors.length > 0 && 'animate-badge-bounce'
                  )}
                >
                  {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
                </span>
              )}
              {validation.warnings && validation.warnings.length > 0 && (
                <span
                  className={cn(
                    'text-yellow-500',
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
            variant={rawMode && hasRawSource ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRawMode(!rawMode)}
            disabled={!hasRawSource}
            title={
              hasRawSource
                ? 'Raw mode: regenerate headers only, preserve original code body'
                : 'Raw mode unavailable: plugin was not imported from a file'
            }
          >
            <FileCode2 className="mr-1 h-4 w-4" />
            Raw
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
              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-md border border-border bg-popover p-1 shadow-md">
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleExportFormat('readme')}
                >
                  <FileText className="h-4 w-4" />
                  Export README.md
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleExportFormat('dts')}
                >
                  <FileType className="h-4 w-4" />
                  Export .d.ts
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleExportFormat('plugins-json')}
                >
                  <FileJson className="h-4 w-4" />
                  Export plugins.json entry
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
              <ul className="space-y-1 text-sm text-destructive">
                {validation.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {validation.warnings && validation.warnings.length > 0 && (
            <div className="border-b border-border bg-yellow-500/10 p-3">
              <ul className="space-y-1 text-sm text-yellow-500">
                {validation.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="flex-1">
        {showDiff && onDiskCode !== null ? (
          <DiffView original={onDiskCode} modified={diffModifiedCode} />
        ) : (
          <Editor
            height="100%"
            language="javascript"
            value={code}
            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
            options={{
              readOnly: true,
              minimap: { enabled: editorMinimap },
              fontSize: editorFontSize,
              lineNumbers: editorLineNumbers ? 'on' : 'off',
              scrollBeyondLastLine: false,
              wordWrap: editorWordWrap ? 'on' : 'off',
              automaticLayout: true,
              padding: { top: 16, bottom: 16 }
            }}
          />
        )}
      </div>
    </div>
  )
}
