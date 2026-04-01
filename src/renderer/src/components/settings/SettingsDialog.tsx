import { useState, useRef, useEffect } from 'react'
import { Trash2, Sun, Moon, FolderOpen } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { Button } from '../ui/button'
import { useSettingsStore, useProjectStore, useTemplateStore } from '../../stores'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const {
    theme,
    editorFontSize,
    editorWordWrap,
    editorMinimap,
    editorLineNumbers,
    defaultAuthor,
    parameterPresets,
    setTheme,
    setEditorFontSize,
    setEditorWordWrap,
    setEditorMinimap,
    setEditorLineNumbers,
    setDefaultAuthor,
    debugLogging,
    setDebugLogging,
    deletePreset,
    clearAllPresets,
    resetEditorSettings
  } = useSettingsStore()

  const recentProjects = useProjectStore((s) => s.recentProjects)
  const favorites = useTemplateStore((s) => s.favorites)
  const recentlyUsed = useTemplateStore((s) => s.recentlyUsed)

  const [clearedRecent, setClearedRecent] = useState(false)
  const [clearedFavorites, setClearedFavorites] = useState(false)
  const [clearedRecentTemplates, setClearedRecentTemplates] = useState(false)
  const [clearedPresets, setClearedPresets] = useState(false)
  const [clearedSettings, setClearedSettings] = useState(false)

  // Individual timer refs per button to avoid memory leak (LEAK-03)
  const recentTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const favoritesTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const templatesTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const presetsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const settingsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    return () => {
      if (recentTimerRef.current) clearTimeout(recentTimerRef.current)
      if (favoritesTimerRef.current) clearTimeout(favoritesTimerRef.current)
      if (templatesTimerRef.current) clearTimeout(templatesTimerRef.current)
      if (presetsTimerRef.current) clearTimeout(presetsTimerRef.current)
      if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current)
    }
  }, [])

  const handleClearRecentProjects = () => {
    useProjectStore.setState({ recentProjects: [] })
    setClearedRecent(true)
    if (recentTimerRef.current) clearTimeout(recentTimerRef.current)
    recentTimerRef.current = setTimeout(() => setClearedRecent(false), 2000)
  }

  const handleClearFavorites = () => {
    useTemplateStore.setState({ favorites: [] })
    setClearedFavorites(true)
    if (favoritesTimerRef.current) clearTimeout(favoritesTimerRef.current)
    favoritesTimerRef.current = setTimeout(() => setClearedFavorites(false), 2000)
  }

  const handleClearRecentTemplates = () => {
    useTemplateStore.getState().clearRecent()
    setClearedRecentTemplates(true)
    if (templatesTimerRef.current) clearTimeout(templatesTimerRef.current)
    templatesTimerRef.current = setTimeout(() => setClearedRecentTemplates(false), 2000)
  }

  const handleClearAllPresets = () => {
    clearAllPresets()
    setClearedPresets(true)
    if (presetsTimerRef.current) clearTimeout(presetsTimerRef.current)
    presetsTimerRef.current = setTimeout(() => setClearedPresets(false), 2000)
  }

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

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Theme</Label>
              <div className="flex items-center gap-1 rounded-md border border-input p-0.5">
                <button
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${theme === 'dark' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-3 w-3" />
                  Dark
                </button>
                <button
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${theme === 'light' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-3 w-3" />
                  Light
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="fontSize">Font Size</Label>
              <Input
                id="fontSize"
                type="number"
                min={10}
                max={24}
                value={editorFontSize}
                onChange={(e) => setEditorFontSize(Number(e.target.value))}
                className="w-20"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="wordWrap">Word Wrap</Label>
              <Switch id="wordWrap" checked={editorWordWrap} onCheckedChange={setEditorWordWrap} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="minimap">Minimap</Label>
              <Switch id="minimap" checked={editorMinimap} onCheckedChange={setEditorMinimap} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="lineNumbers">Line Numbers</Label>
              <Switch
                id="lineNumbers"
                checked={editorLineNumbers}
                onCheckedChange={setEditorLineNumbers}
              />
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Diagnostics</p>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="debugLogging">Debug Logging</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable verbose logging for troubleshooting
                  </p>
                </div>
                <Switch
                  id="debugLogging"
                  checked={debugLogging}
                  onCheckedChange={setDebugLogging}
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-sm font-medium">Log Files</p>
                  <p className="text-xs text-muted-foreground">
                    Open the folder containing application logs
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.api.log.openFolder()}>
                  <FolderOpen className="mr-1 h-3 w-3" />
                  Open Folder
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Reset Editor Settings</p>
                  <p className="text-xs text-muted-foreground">
                    Restore all editor settings to defaults
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetEditorSettings()
                    setClearedSettings(true)
                    if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current)
                    settingsTimerRef.current = setTimeout(() => setClearedSettings(false), 2000)
                  }}
                  disabled={clearedSettings}
                >
                  {clearedSettings ? 'Reset!' : 'Reset to Defaults'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Defaults Tab */}
          <TabsContent value="defaults" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultAuthor">Default Author</Label>
              <Input
                id="defaultAuthor"
                value={defaultAuthor}
                onChange={(e) => setDefaultAuthor(e.target.value)}
                placeholder="Your name"
              />
              <p className="text-xs text-muted-foreground">
                Pre-fills the author field when creating new plugins.
              </p>
            </div>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Recent Projects</p>
                <p className="text-xs text-muted-foreground">
                  {recentProjects.length} project(s) stored
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearRecentProjects}
                disabled={recentProjects.length === 0 || clearedRecent}
              >
                {clearedRecent ? (
                  'Cleared!'
                ) : (
                  <>
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Template Favorites</p>
                <p className="text-xs text-muted-foreground">
                  {favorites.length} favorite(s) saved
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFavorites}
                disabled={favorites.length === 0 || clearedFavorites}
              >
                {clearedFavorites ? (
                  'Cleared!'
                ) : (
                  <>
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Recently Used Templates</p>
                <p className="text-xs text-muted-foreground">
                  {recentlyUsed.length} template(s) tracked
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearRecentTemplates}
                disabled={recentlyUsed.length === 0 || clearedRecentTemplates}
              >
                {clearedRecentTemplates ? (
                  'Cleared!'
                ) : (
                  <>
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Parameter Presets</p>
                  <p className="text-xs text-muted-foreground">
                    {Object.keys(parameterPresets).length} preset(s) saved
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllPresets}
                  disabled={Object.keys(parameterPresets).length === 0 || clearedPresets}
                >
                  {clearedPresets ? (
                    'Cleared!'
                  ) : (
                    <>
                      <Trash2 className="mr-1 h-3 w-3" />
                      Clear All
                    </>
                  )}
                </Button>
              </div>

              {Object.entries(parameterPresets).length > 0 && (
                <div className="space-y-1 rounded border border-border p-2">
                  {Object.entries(parameterPresets).map(([name, params]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span>
                        {name} ({params.length} params)
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deletePreset(name)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
