// The editor setup runs before the wrapper below can mount an editor
import '../../lib/monaco-setup'
import { useMemo, useCallback, useState, useRef, useEffect, useDeferredValue } from 'react'
import { Editor } from '@monaco-editor/react'
import { Copy, Download, Check, FileCode2, GitCompare } from 'lucide-react'
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
  generatePluginOutput,
  isImported,
  isRawMode,
  type PluginOutput
} from '../../lib/plugin-output'
import { reloadFromProject } from '../../lib/raw-mode'
import { savePlugin } from '../../lib/save-plugin'
import { NOTICE_MS } from '../../stores/toastStore'
import { DiffView } from './DiffView'
import { ExportMenu } from './ExportMenu'
import { cn, refusalReason, userMessage } from '../../lib/utils'
import type { PluginBaseline, PluginDefinition } from '../../types/plugin'
import log from 'electron-log/renderer'

const RAW_UNAVAILABLE = 'Raw mode unavailable: plugin was not imported from a file'
const DIFF_UNAVAILABLE = 'Diff unavailable: no saved version to compare'
const DIFF_LAST_COPY = 'Left: the copy this app last read or wrote'
const DIFF_CHOOSE_FILE = "The saved file can't be opened automatically. Choose it to compare."
const JS_FILTERS = [{ name: 'JavaScript', extensions: ['js'] }]
const REMEDY =
  'Open its project and click Reload from project to restore it. Until then, raw mode cannot save it.'

/**
Whether main refused a read because the file is outside what the app may read on its own
*/
const isAccessDenied = (error: unknown): boolean => refusalReason(error) !== null

// A text that is set and not empty
const hasText = (text: string | null | undefined): boolean => (text ?? '') !== ''

// The baseline kept for a plugin, if any
const baselineOf = (
  baselineByPluginId: Readonly<Partial<Record<string, PluginBaseline>>>,
  id: string
): PluginBaseline | null => baselineByPluginId[id] ?? null

const plural = (count: number): string => (count === 1 ? '' : 's')

// The open diff belongs to the plugin it was opened for; another plugin's tab shows none
interface OpenedDiff {
  pluginId: string
  original: string | null
  // The left panel's label when it shows the kept copy instead of the saved file
  label: string | null
  // The saved file is out of reach and no copy was kept: the diff area offers Choose file
  isFileNeeded: boolean
}

type Validation = ReturnType<typeof validatePlugin>

// The code a save would write, from the deferred plugin so keystrokes are not blocked
function usePreviewOutput(deferredPlugin: PluginDefinition): PluginOutput {
  // Derive raw mode from deferred plugin to keep code gen consistent (R3-02)
  const isDeferredRawMode = isRawMode(
    deferredPlugin,
    useUIStore((s) => s.rawModeByPluginId[deferredPlugin.id])
  )
  const deferredBaseline = usePluginStore((s) =>
    baselineOf(s.baselineByPluginId, deferredPlugin.id)
  )

  return useMemo((): PluginOutput => {
    try {
      return generatePluginOutput(deferredPlugin, isDeferredRawMode, deferredBaseline)
    } catch (error) {
      log.error('Code generation error:', error)
      return {
        ok: true,
        code: `// Code generation error: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }, [deferredPlugin, isDeferredRawMode, deferredBaseline])
}

function useValidation(deferredPlugin: PluginDefinition): Validation {
  return useMemo(() => {
    try {
      return validatePlugin(deferredPlugin)
    } catch (error) {
      log.error('Validation error:', error)
      return { valid: false, errors: [String(error)], warnings: [] }
    }
  }, [deferredPlugin])
}

// True for a moment after the error or warning count changes
function useIsBadgeBouncing(errorCount: number, warningCount: number): boolean {
  const [isBouncing, setIsBouncing] = useState(false)
  const previousCountRef = useRef({ errors: 0, warnings: 0 })

  useEffect(() => {
    const previous = previousCountRef.current
    let timer: ReturnType<typeof setTimeout> | undefined
    if (errorCount !== previous.errors || warningCount !== previous.warnings) {
      setIsBouncing(true)
      timer = setTimeout(() => {
        setIsBouncing(false)
      }, 300)
    }
    previousCountRef.current = { errors: errorCount, warnings: warningCount }
    return () => {
      clearTimeout(timer)
    }
  }, [errorCount, warningCount])

  return isBouncing
}

// Copy puts freshly generated code on the clipboard and shows Copied! for a moment
function useCopyCode(): { isCopied: boolean; copy: () => Promise<void> } {
  const addToast = useToastStore((s) => s.addToast)
  const [isCopied, setIsCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Clean up copy timer on unmount
  useEffect(
    () => () => {
      clearTimeout(copyTimerRef.current)
    },
    []
  )

  const copy = useCallback(async () => {
    // Generate fresh code from immediate state, not deferred (R3-06)
    const { plugin: currentPlugin, baselineByPluginId } = usePluginStore.getState()
    const isCurrentRawMode = isRawMode(
      currentPlugin,
      useUIStore.getState().rawModeByPluginId[currentPlugin.id]
    )
    const fresh = generatePluginOutput(
      currentPlugin,
      isCurrentRawMode,
      baselineOf(baselineByPluginId, currentPlugin.id)
    )
    if (!fresh.ok) {
      addToast({ type: 'error', message: fresh.message })
      return
    }
    await navigator.clipboard.writeText(fresh.code)
    setIsCopied(true)
    addToast({ type: 'success', message: 'Code copied to clipboard' })
    clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => {
      setIsCopied(false)
    }, 2000)
  }, [addToast])

  return { isCopied, copy }
}

// The diff of the active plugin against its saved file, or the copy kept of it
function usePreviewDiff(plugin: PluginDefinition, savedPath: string | null) {
  const addToast = useToastStore((s) => s.addToast)
  const isDiffRequested = useUIStore((s) => s.diffRequestPluginId === plugin.id)
  const [openedDiff, setOpenedDiff] = useState<OpenedDiff | null>(null)
  const diff = openedDiff?.pluginId === plugin.id ? openedDiff : null

  const showDiffWith = useCallback(
    (pluginId: string, original: string | null, label: string | null) => {
      setOpenedDiff({ pluginId, original, label, isFileNeeded: original === null })
    },
    []
  )

  const openDiff = useCallback(async () => {
    const pluginId = plugin.id
    // Compare with the saved file; when main may not read it on its own, with the kept copy
    if (savedPath !== null && savedPath !== '') {
      try {
        showDiffWith(pluginId, await globalThis.api.plugin.readByPath(savedPath), null)
        return
      } catch (error) {
        if (!isAccessDenied(error)) {
          log.error('Failed to load on-disk version:', error)
          addToast({
            type: 'error',
            message: `Could not compare with the saved file: ${userMessage(error)}`,
            duration: NOTICE_MS
          })
          return
        }
        log.warn(`Diff: the saved file can't be opened automatically: ${userMessage(error)}`)
      }
    }
    if (plugin.rawSource !== undefined && plugin.rawSource !== '') {
      showDiffWith(pluginId, plugin.rawSource, DIFF_LAST_COPY)
    } else if (hasText(savedPath)) {
      showDiffWith(pluginId, null, null)
    } else {
      setOpenedDiff({ pluginId, original: null, label: null, isFileNeeded: false })
    }
  }, [savedPath, plugin.id, plugin.rawSource, addToast, showDiffWith])

  const chooseDiffFile = useCallback(async () => {
    const pluginId = plugin.id
    try {
      const chosen = await globalThis.api.dialog.openFile({ filters: JS_FILTERS })
      if (chosen === null || chosen === '') return
      showDiffWith(pluginId, await globalThis.api.plugin.readByPath(chosen), null)
    } catch (error) {
      log.warn(`Diff: couldn't open the chosen file: ${userMessage(error)}`)
      addToast({
        type: 'error',
        message: `Couldn't open the chosen file: ${userMessage(error)}`,
        duration: NOTICE_MS
      })
    }
  }, [plugin.id, addToast, showDiffWith])

  const isShowingDiff = diff !== null
  const toggleDiff = useCallback(async () => {
    if (isShowingDiff) {
      setOpenedDiff(null)
      return
    }
    await openDiff()
  }, [isShowingDiff, openDiff])

  // "Show Diff" in the save confirmation opens the diff of the plugin it asked about
  useEffect(() => {
    if (!isDiffRequested) return
    useUIStore.getState().clearDiffRequest()
    // Opened from a task, as a click opens it: the effect only takes the request
    queueMicrotask(() => {
      void openDiff()
    })
  }, [isDiffRequested, openDiff])

  return { diff, toggleDiff, chooseDiffFile }
}

// The error and warning counts; a click shows or hides their lists
function ValidationBadges({
  validation,
  isBouncing,
  isShowingValidation,
  setIsShowingValidation
}: Readonly<{
  validation: Validation
  isBouncing: boolean
  isShowingValidation: boolean
  setIsShowingValidation: (isShowing: boolean) => void
}>) {
  const errorCount = validation.errors.length
  const warningCount = validation.warnings.length
  if (warningCount === 0 && validation.valid) return null
  return (
    <button
      type="button"
      className="mt-1 flex items-center gap-2 text-sm"
      onClick={() => {
        setIsShowingValidation(!isShowingValidation)
      }}
    >
      {!validation.valid && (
        <span
          className={cn(
            'text-destructive-text',
            isBouncing && errorCount > 0 && 'animate-badge-bounce'
          )}
        >
          {errorCount} error{plural(errorCount)}
        </span>
      )}
      {warningCount > 0 && (
        <span className={cn('text-warning-text', isBouncing && 'animate-badge-bounce')}>
          {warningCount} warning{plural(warningCount)}
        </span>
      )}
      <span className="text-muted-foreground">{isShowingValidation ? '▲' : '▼'}</span>
    </button>
  )
}

// Each message keyed by its text and how often it came before, so a repeat keeps a key of its own
function keyedMessages(messages: readonly string[]): { key: string; message: string }[] {
  const seen = new Map<string, number>()
  return messages.map((message) => {
    const count = seen.get(message) ?? 0
    seen.set(message, count + 1)
    return { key: `${message}#${String(count)}`, message }
  })
}

function ValidationLists({ validation }: Readonly<{ validation: Validation }>) {
  return (
    <>
      {!validation.valid && (
        <div className="border-b border-border bg-destructive/10 p-3">
          <ul className="space-y-1 text-sm text-destructive-text">
            {keyedMessages(validation.errors).map(({ key, message }) => (
              <li key={key}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {validation.warnings.length > 0 && (
        <div className="border-b border-border bg-yellow-500/10 p-3">
          <ul className="space-y-1 text-sm text-warning-text">
            {keyedMessages(validation.warnings).map(({ key, message }) => (
              <li key={key}>{message}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

// Why the code cannot be shown as raw mode would save it, if it cannot
function bannerText(output: PluginOutput, deferredPlugin: PluginDefinition): string | null {
  if (output.ok) return null
  if (output.refusal !== 'source-missing') return output.message
  const file = String(deferredPlugin.importedFrom)
  return hasText(deferredPlugin.rawSource)
    ? `The app's copy of ${file} as it was last read is missing, so raw mode cannot tell what changed. ${REMEDY}`
    : `This plugin's file text (${file}) is not loaded — plugins opened in an older version of the app did not keep it. ${REMEDY}`
}

function SourceBanner({
  banner,
  isSourceMissing,
  pluginId
}: Readonly<{ banner: string; isSourceMissing: boolean; pluginId: string }>) {
  const project = useProjectStore((s) => s.project)
  const reloadHint = project ? undefined : 'Open the project first.'
  return (
    <div
      role={isSourceMissing ? 'status' : 'alert'}
      className={cn(
        'flex items-center gap-3 border-b border-border p-3 text-sm',
        isSourceMissing
          ? 'bg-yellow-500/10 text-warning-text'
          : 'bg-destructive/10 text-destructive-text'
      )}
    >
      <span className="flex-1">{banner}</span>
      {isSourceMissing && (
        // A disabled button ignores the pointer, so its hint also sits on this wrapper
        <span title={reloadHint} className="inline-flex">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void reloadFromProject(pluginId)
            }}
            disabled={!project}
            data-testid="source-missing-reload"
            title={reloadHint}
          >
            Reload from project
          </Button>
        </span>
      )}
    </div>
  )
}

function ChooseDiffFile({ chooseDiffFile }: Readonly<{ chooseDiffFile: () => Promise<void> }>) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
      <p>{DIFF_CHOOSE_FILE}</p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          void chooseDiffFile()
        }}
      >
        Choose file
      </Button>
    </div>
  )
}

// The diff when one is open, else the generated code
function PreviewBody({
  diff,
  code,
  chooseDiffFile
}: Readonly<{ diff: OpenedDiff | null; code: string; chooseDiffFile: () => Promise<void> }>) {
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const isEditorWordWrap = useSettingsStore((s) => s.editorWordWrap)
  const isEditorMinimap = useSettingsStore((s) => s.editorMinimap)
  const isEditorLineNumbers = useSettingsStore((s) => s.editorLineNumbers)
  const theme = useSettingsStore((s) => s.theme)

  const previewOptions = useMemo(
    () => ({
      readOnly: true,
      minimap: { enabled: isEditorMinimap },
      fontSize: editorFontSize,
      lineNumbers: isEditorLineNumbers ? ('on' as const) : ('off' as const),
      scrollBeyondLastLine: false,
      wordWrap: isEditorWordWrap ? ('on' as const) : ('off' as const),
      automaticLayout: true,
      padding: { top: 16, bottom: 16 }
    }),
    [isEditorMinimap, editorFontSize, isEditorLineNumbers, isEditorWordWrap]
  )

  if (diff !== null && diff.original !== null) {
    if (diff.label === null) return <DiffView original={diff.original} modified={code} />
    return (
      <div className="flex h-full flex-col">
        <p className="border-b border-border px-4 py-1 text-xs text-muted-foreground">
          {diff.label}
        </p>
        <div className="min-h-0 flex-1">
          <DiffView original={diff.original} modified={code} />
        </div>
      </div>
    )
  }
  if (diff?.isFileNeeded === true) return <ChooseDiffFile chooseDiffFile={chooseDiffFile} />
  return (
    <Editor
      height="100%"
      language="javascript"
      value={code}
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      options={previewOptions}
    />
  )
}

function rawModeTitle(isImportedPlugin: boolean, isPreviewRawMode: boolean): string {
  if (!isImportedPlugin) return RAW_UNAVAILABLE
  return isPreviewRawMode
    ? "Raw mode ON: the file's own code and unchanged blocks are kept"
    : 'Raw mode OFF: the whole plugin is regenerated from the editor'
}

function CopyButton() {
  const { isCopied, copy } = useCopyCode()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        void copy()
      }}
    >
      {isCopied ? (
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
  )
}

// Raw, Diff, Copy, Export and the other formats
function PreviewToolbar({
  plugin,
  isShowingDiff,
  toggleDiff
}: Readonly<{
  plugin: PluginDefinition
  isShowingDiff: boolean
  toggleDiff: () => Promise<void>
}>) {
  const savedPath = usePluginStore((s) => s.savedPath)
  const isPreviewRawMode = isRawMode(
    plugin,
    useUIStore((s) => s.rawModeByPluginId[plugin.id])
  )
  const setRawModeForPlugin = useUIStore((s) => s.setRawModeForPlugin)

  const isImportedPlugin = isImported(plugin)
  const hasSavedVersion = hasText(savedPath) || hasText(plugin.rawSource)

  return (
    <div className="flex items-center gap-2">
      {/* A disabled button ignores the pointer, so its hint also sits on this wrapper */}
      <span title={isImportedPlugin ? undefined : RAW_UNAVAILABLE} className="inline-flex">
        <Button
          variant={isPreviewRawMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setRawModeForPlugin(plugin.id, !isPreviewRawMode)
          }}
          disabled={!isImportedPlugin}
          title={rawModeTitle(isImportedPlugin, isPreviewRawMode)}
        >
          <FileCode2 className="mr-1 h-4 w-4" />
          {isPreviewRawMode ? 'Raw ON' : 'Raw'}
        </Button>
      </span>

      <span title={hasSavedVersion ? undefined : DIFF_UNAVAILABLE} className="inline-flex">
        <Button
          variant={isShowingDiff ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            void toggleDiff()
          }}
          disabled={!hasSavedVersion}
          title={hasSavedVersion ? 'Compare generated output with saved file' : DIFF_UNAVAILABLE}
        >
          <GitCompare className="mr-1 h-4 w-4" />
          Diff
        </Button>
      </span>

      <CopyButton />

      <Button
        size="sm"
        onClick={() => {
          // Generate from immediate state (not deferred) to avoid saving stale code
          void savePlugin(usePluginStore.getState().plugin.id, 'export')
        }}
        data-testid="export-plugin"
      >
        <Download className="mr-1 h-4 w-4" />
        Export
      </Button>

      <ExportMenu plugin={plugin} />
    </div>
  )
}

export function CodePreview() {
  const plugin = usePluginStore((s) => s.plugin)
  const savedPath = usePluginStore((s) => s.savedPath)
  const [isShowingValidation, setIsShowingValidation] = useState(false)
  const { diff, toggleDiff, chooseDiffFile } = usePreviewDiff(plugin, savedPath)

  // Defer expensive computations so keystrokes aren't blocked by code gen + validation
  const deferredPlugin = useDeferredValue(plugin)
  const output = usePreviewOutput(deferredPlugin)
  const validation = useValidation(deferredPlugin)
  const isBouncing = useIsBadgeBouncing(validation.errors.length, validation.warnings.length)

  // The diff shows the code a save would write
  const code = output.ok ? output.code : ''
  const isSourceMissing = !output.ok && output.refusal === 'source-missing'
  const banner = bannerText(output, deferredPlugin)

  return (
    <div className="flex h-full flex-col" data-testid="code-preview">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="text-lg font-semibold">Generated Code</h2>
          <ValidationBadges
            validation={validation}
            isBouncing={isBouncing}
            isShowingValidation={isShowingValidation}
            setIsShowingValidation={setIsShowingValidation}
          />
        </div>
        <PreviewToolbar plugin={plugin} isShowingDiff={diff !== null} toggleDiff={toggleDiff} />
      </div>

      {/* Validation errors & warnings (collapsible) */}
      {isShowingValidation && <ValidationLists validation={validation} />}

      {banner !== null && (
        <SourceBanner
          banner={banner}
          isSourceMissing={isSourceMissing}
          pluginId={deferredPlugin.id}
        />
      )}

      <div className="flex-1">
        <PreviewBody diff={diff} code={code} chooseDiffFile={chooseDiffFile} />
      </div>
    </div>
  )
}
