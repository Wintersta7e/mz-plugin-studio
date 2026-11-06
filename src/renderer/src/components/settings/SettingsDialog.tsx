import { useState, useRef, useEffect, type ReactNode } from 'react'
import log from 'electron-log/renderer'
import { Trash2, Sun, Moon, FolderOpen, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { Button } from '../ui/button'
import { useSettingsStore, useProjectStore, useTemplateStore, useToastStore } from '../../stores'
import { deleteBackup, listBackups, type SavedBackup } from '../../stores/persist'
import { NOTICE_MS } from '../../stores/toastStore'
import { userMessage } from '../../lib/utilities'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (isOpen: boolean) => void
}

// A flag shown for a moment after a button is used
interface Flash {
  isOn: boolean
  flash: () => void
}

function formatSize(text: string): string {
  const bytes = new Blob([text]).size
  return bytes < 1024 ? `${String(bytes)} B` : `${(bytes / 1024).toFixed(1)} KB`
}

/**
Copies of saved state the app could not load; mounted with the Data tab, so it lists afresh.
*/
function BackupsSection() {
  const [backups, setBackups] = useState(listBackups)
  const addToast = useToastStore((s) => s.addToast)

  const handleExport = async (backup: SavedBackup) => {
    const filePath = await globalThis.api.dialog.saveFile({
      defaultPath: `${backup.key}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (filePath === null || filePath === '') return
    try {
      await globalThis.api.plugin.saveToPath(filePath, backup.text)
      addToast({ type: 'success', message: `Backup exported to ${filePath}` })
    } catch (error) {
      log.error('Failed to export backup:', error)
      addToast({
        type: 'error',
        message: `Export failed: ${userMessage(error)}`,
        duration: NOTICE_MS
      })
    }
  }

  const handleDelete = async (backup: SavedBackup) => {
    const choice = await globalThis.api.dialog.message({
      type: 'warning',
      title: 'Delete backup',
      message: `Delete the ${backup.area} backup? Export it first to keep a copy.`,
      buttons: ['Cancel', 'Delete']
    })
    if (choice !== 1) return
    deleteBackup(backup.key)
    setBackups(listBackups())
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">Saved-state backups</p>
        <p className="text-xs text-muted-foreground">
          Copies of saved data the app could not load. Only one copy per kind is kept, so delete one
          once exported to make room for the next.
        </p>
      </div>
      {backups.length === 0 ? (
        <p className="text-xs text-muted-foreground">No backups.</p>
      ) : (
        <div className="space-y-1 rounded border border-border p-2">
          {backups.map((backup) => (
            <div key={backup.key} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p>{backup.area}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <span>{backup.key}</span> · {formatSize(backup.text)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label={`Export the ${backup.area} backup`}
                  onClick={() => void handleExport(backup)}
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label={`Delete the ${backup.area} backup`}
                  onClick={() => void handleDelete(backup)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// On for two seconds after each `flash`; the timer is stopped when the dialog unmounts
function useFlash(): Flash {
  const [isOn, setIsOn] = useState(false)
  // A timer per button, cleared on unmount to avoid a leak (LEAK-03)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
    }
  }, [])
  const flash = (): void => {
    setIsOn(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsOn(false)
    }, 2000)
  }
  return { isOn, flash }
}

function ThemeButton({
  isSelected,
  onSelect,
  children
}: Readonly<{ isSelected: boolean; onSelect: () => void; children: ReactNode }>) {
  return (
    <button
      type="button"
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${isSelected ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
      onClick={onSelect}
    >
      {children}
    </button>
  )
}

function ThemeRow() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  return (
    <div className="flex items-center justify-between">
      <Label>Theme</Label>
      <div className="flex items-center gap-1 rounded-md border border-input p-0.5">
        <ThemeButton
          isSelected={theme === 'dark'}
          onSelect={() => {
            setTheme('dark')
          }}
        >
          <Moon className="h-3 w-3" />
          Dark
        </ThemeButton>
        <ThemeButton
          isSelected={theme === 'light'}
          onSelect={() => {
            setTheme('light')
          }}
        >
          <Sun className="h-3 w-3" />
          Light
        </ThemeButton>
      </div>
    </div>
  )
}

// The font size as typed: a size is kept within range only when the field is left
function FontSizeField({
  draft,
  setDraft
}: Readonly<{ draft: string | null; setDraft: (draft: string | null) => void }>) {
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const setEditorFontSize = useSettingsStore((s) => s.setEditorFontSize)
  const commitFontSize = (): void => {
    if (draft !== null && draft !== '') setEditorFontSize(Number(draft))
    setDraft(null)
  }
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor="fontSize">Font Size</Label>
      <Input
        id="fontSize"
        type="number"
        min={10}
        max={24}
        value={draft ?? editorFontSize}
        onChange={(event) => {
          setDraft(event.target.value)
          const size = Number(event.target.value)
          // A size already in range applies as it is typed
          if (event.target.value && size >= 10 && size <= 24) setEditorFontSize(size)
        }}
        onBlur={commitFontSize}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commitFontSize()
        }}
        className="w-20"
      />
    </div>
  )
}

function SwitchRow({
  id,
  label,
  isChecked,
  onCheckedChange
}: Readonly<{
  id: string
  label: string
  isChecked: boolean
  onCheckedChange: (isChecked: boolean) => void
}>) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={isChecked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function DiagnosticsSection() {
  const isDebugLogging = useSettingsStore((s) => s.debugLogging)
  const setDebugLogging = useSettingsStore((s) => s.setDebugLogging)
  return (
    <div className="border-t border-border pt-4 mt-4">
      <p className="text-xs font-medium text-muted-foreground mb-3">Diagnostics</p>
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="debugLogging">Debug Logging</Label>
          <p className="text-xs text-muted-foreground">
            Enable verbose logging for troubleshooting
          </p>
        </div>
        <Switch id="debugLogging" checked={isDebugLogging} onCheckedChange={setDebugLogging} />
      </div>
      <div className="flex items-center justify-between mt-3">
        <div>
          <p className="text-sm font-medium">Log Files</p>
          <p className="text-xs text-muted-foreground">
            Open the folder containing application logs
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void globalThis.api.log.openFolder()
          }}
        >
          <FolderOpen className="mr-1 h-3 w-3" />
          Open Folder
        </Button>
      </div>
    </div>
  )
}

function ResetSection({ reset }: Readonly<{ reset: Flash }>) {
  const resetEditorSettings = useSettingsStore((s) => s.resetEditorSettings)
  return (
    <div className="border-t border-border pt-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Reset Editor Settings</p>
          <p className="text-xs text-muted-foreground">Restore all editor settings to defaults</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetEditorSettings()
            reset.flash()
          }}
          disabled={reset.isOn}
        >
          {reset.isOn ? 'Reset!' : 'Reset to Defaults'}
        </Button>
      </div>
    </div>
  )
}

function EditorTab({
  fontSizeDraft,
  setFontSizeDraft,
  reset
}: Readonly<{
  fontSizeDraft: string | null
  setFontSizeDraft: (draft: string | null) => void
  reset: Flash
}>) {
  const isWordWrapOn = useSettingsStore((s) => s.editorWordWrap)
  const isMinimapOn = useSettingsStore((s) => s.editorMinimap)
  const isLineNumbersOn = useSettingsStore((s) => s.editorLineNumbers)
  const setEditorWordWrap = useSettingsStore((s) => s.setEditorWordWrap)
  const setEditorMinimap = useSettingsStore((s) => s.setEditorMinimap)
  const setEditorLineNumbers = useSettingsStore((s) => s.setEditorLineNumbers)
  return (
    <TabsContent value="editor" className="space-y-4">
      <ThemeRow />
      <FontSizeField draft={fontSizeDraft} setDraft={setFontSizeDraft} />
      <SwitchRow
        id="wordWrap"
        label="Word Wrap"
        isChecked={isWordWrapOn}
        onCheckedChange={setEditorWordWrap}
      />
      <SwitchRow
        id="minimap"
        label="Minimap"
        isChecked={isMinimapOn}
        onCheckedChange={setEditorMinimap}
      />
      <SwitchRow
        id="lineNumbers"
        label="Line Numbers"
        isChecked={isLineNumbersOn}
        onCheckedChange={setEditorLineNumbers}
      />
      <DiagnosticsSection />
      <ResetSection reset={reset} />
    </TabsContent>
  )
}

function DefaultsTab() {
  const defaultAuthor = useSettingsStore((s) => s.defaultAuthor)
  const setDefaultAuthor = useSettingsStore((s) => s.setDefaultAuthor)
  return (
    <TabsContent value="defaults" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="defaultAuthor">Default Author</Label>
        <Input
          id="defaultAuthor"
          value={defaultAuthor}
          onChange={(event) => {
            setDefaultAuthor(event.target.value)
          }}
          placeholder="Your name"
        />
        <p className="text-xs text-muted-foreground">
          Pre-fills the author field when creating new plugins.
        </p>
      </div>
    </TabsContent>
  )
}

// A stored list's row: what it holds, and a button that empties it
function ClearRow({
  title,
  summary,
  isEmpty,
  clearLabel,
  cleared,
  onClear
}: Readonly<{
  title: string
  summary: ReactNode
  isEmpty: boolean
  clearLabel: string
  cleared: Flash
  onClear: () => void
}>) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{summary}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onClear()
          cleared.flash()
        }}
        disabled={isEmpty || cleared.isOn}
      >
        {cleared.isOn ? (
          'Cleared!'
        ) : (
          <>
            <Trash2 className="mr-1 h-3 w-3" />
            {clearLabel}
          </>
        )}
      </Button>
    </div>
  )
}

function PresetsSection({ cleared }: Readonly<{ cleared: Flash }>) {
  const parameterPresets = useSettingsStore((s) => s.parameterPresets)
  const deletePreset = useSettingsStore((s) => s.deletePreset)
  const clearAllPresets = useSettingsStore((s) => s.clearAllPresets)
  const presets = Object.entries(parameterPresets)
  return (
    <div className="space-y-2">
      <ClearRow
        title="Parameter Presets"
        summary={<>{presets.length} preset(s) saved</>}
        isEmpty={presets.length === 0}
        clearLabel="Clear All"
        cleared={cleared}
        onClear={clearAllPresets}
      />

      {presets.length > 0 && (
        <div className="space-y-1 rounded border border-border p-2">
          {presets.map(([name, params]) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <span>
                {name} ({params.length} params)
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  deletePreset(name)
                }}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DataTab({
  clearedRecent,
  clearedFavorites,
  clearedRecentTemplates,
  clearedPresets
}: Readonly<{
  clearedRecent: Flash
  clearedFavorites: Flash
  clearedRecentTemplates: Flash
  clearedPresets: Flash
}>) {
  const recentProjects = useProjectStore((s) => s.recentProjects)
  const favorites = useTemplateStore((s) => s.favorites)
  const recentlyUsed = useTemplateStore((s) => s.recentlyUsed)
  return (
    <TabsContent value="data" className="space-y-4">
      <ClearRow
        title="Recent Projects"
        summary={<>{recentProjects.length} project(s) stored</>}
        isEmpty={recentProjects.length === 0}
        clearLabel="Clear"
        cleared={clearedRecent}
        onClear={() => {
          useProjectStore.setState({ recentProjects: [] })
        }}
      />
      <ClearRow
        title="Template Favorites"
        summary={<>{favorites.length} favorite(s) saved</>}
        isEmpty={favorites.length === 0}
        clearLabel="Clear"
        cleared={clearedFavorites}
        onClear={() => {
          useTemplateStore.setState({ favorites: [] })
        }}
      />
      <ClearRow
        title="Recently Used Templates"
        summary={<>{recentlyUsed.length} template(s) tracked</>}
        isEmpty={recentlyUsed.length === 0}
        clearLabel="Clear"
        cleared={clearedRecentTemplates}
        onClear={() => {
          useTemplateStore.getState().clearRecent()
        }}
      />
      <PresetsSection cleared={clearedPresets} />
      <BackupsSection />
    </TabsContent>
  )
}

export function SettingsDialog({ open, onOpenChange }: Readonly<SettingsDialogProps>) {
  // Held here, not in the tabs, so a draft and a "Cleared!" survive a tab switch
  const [fontSizeDraft, setFontSizeDraft] = useState<string | null>(null)
  const clearedRecent = useFlash()
  const clearedFavorites = useFlash()
  const clearedRecentTemplates = useFlash()
  const clearedPresets = useFlash()
  const clearedSettings = useFlash()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure editor preferences and defaults.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="editor">
          <TabsList className="w-full">
            <TabsTrigger value="editor" className="flex-1">
              Editor
            </TabsTrigger>
            <TabsTrigger value="defaults" className="flex-1">
              Defaults
            </TabsTrigger>
            <TabsTrigger value="data" className="flex-1">
              Data
            </TabsTrigger>
          </TabsList>

          <EditorTab
            fontSizeDraft={fontSizeDraft}
            setFontSizeDraft={setFontSizeDraft}
            reset={clearedSettings}
          />
          <DefaultsTab />
          <DataTab
            clearedRecent={clearedRecent}
            clearedFavorites={clearedFavorites}
            clearedRecentTemplates={clearedRecentTemplates}
            clearedPresets={clearedPresets}
          />
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
