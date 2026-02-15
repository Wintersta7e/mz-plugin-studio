import { useState, useRef, useEffect } from 'react'
import { Trash2, Sun, Moon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog'
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
    setTheme,
    setEditorFontSize,
    setEditorWordWrap,
    setEditorMinimap,
    setEditorLineNumbers,
    setDefaultAuthor
  } = useSettingsStore()

  const recentProjects = useProjectStore((s) => s.recentProjects)
  const favorites = useTemplateStore((s) => s.favorites)
  const recentlyUsed = useTemplateStore((s) => s.recentlyUsed)

  const [clearedRecent, setClearedRecent] = useState(false)
  const [clearedFavorites, setClearedFavorites] = useState(false)
  const [clearedRecentTemplates, setClearedRecentTemplates] = useState(false)

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout)
  }, [])

  const handleClearRecentProjects = () => {
    useProjectStore.setState({ recentProjects: [] })
    setClearedRecent(true)
    timersRef.current.push(setTimeout(() => setClearedRecent(false), 2000))
  }

  const handleClearFavorites = () => {
    useTemplateStore.setState({ favorites: [] })
    setClearedFavorites(true)
    timersRef.current.push(setTimeout(() => setClearedFavorites(false), 2000))
  }

  const handleClearRecentTemplates = () => {
    useTemplateStore.getState().clearRecent()
    setClearedRecentTemplates(true)
    timersRef.current.push(setTimeout(() => setClearedRecentTemplates(false), 2000))
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
              <Switch
                id="wordWrap"
                checked={editorWordWrap}
                onCheckedChange={setEditorWordWrap}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="minimap">Minimap</Label>
              <Switch
                id="minimap"
                checked={editorMinimap}
                onCheckedChange={setEditorMinimap}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="lineNumbers">Line Numbers</Label>
              <Switch
                id="lineNumbers"
                checked={editorLineNumbers}
                onCheckedChange={setEditorLineNumbers}
              />
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
