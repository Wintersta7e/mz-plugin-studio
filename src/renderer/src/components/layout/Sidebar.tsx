import { useState, useEffect } from 'react'
import {
  FolderOpen,
  FilePlus,
  FileCode,
  Settings,
  Keyboard,
  ChevronRight,
  X,
  Database,
  RefreshCw
} from 'lucide-react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'
import { useProjectStore, usePluginStore } from '../../stores'
import { createEmptyPlugin } from '../../types/plugin'

interface SidebarProps {
  onOpenProject: () => void
  onToggleProjectBrowser?: () => void
  projectBrowserOpen?: boolean
  onOpenSettings: () => void
  onOpenShortcuts: () => void
}

export function Sidebar({ onOpenProject, onToggleProjectBrowser, projectBrowserOpen, onOpenSettings, onOpenShortcuts }: SidebarProps) {
  const project = useProjectStore((s) => s.project)
  const openPlugins = usePluginStore((s) => s.openPlugins)
  const activePluginId = usePluginStore((s) => s.activePluginId)
  const isDirty = usePluginStore((s) => s.isDirty)
  const openPlugin = usePluginStore((s) => s.openPlugin)
  const closePlugin = usePluginStore((s) => s.closePlugin)
  const setActivePlugin = usePluginStore((s) => s.setActivePlugin)

  // State for all plugin files in the js/plugins folder
  const [allPluginFiles, setAllPluginFiles] = useState<string[]>([])

  // Fetch all plugin files when project changes
  useEffect(() => {
    if (project?.path) {
      window.api.plugin.list(project.path).then((files) => {
        setAllPluginFiles(files)
      })
    } else {
      setAllPluginFiles([])
    }
  }, [project?.path])

  const refreshPluginList = async () => {
    if (project?.path) {
      const files = await window.api.plugin.list(project.path)
      setAllPluginFiles(files)
    }
  }

  const handleNewPlugin = () => {
    const plugin = createEmptyPlugin()
    openPlugin(plugin)
  }

  const handleClosePlugin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering setActivePlugin

    // Check if closing the active plugin with unsaved changes
    if (isDirty && activePluginId === id) {
      const result = await window.api.dialog.message({
        type: 'question',
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Close anyway?',
        buttons: ['Cancel', 'Close Without Saving']
      })
      if (result === 0) return // Cancel
    }
    closePlugin(id)
  }

  const handleLoadPlugin = async (name: string) => {
    if (!project) return
    try {
      const plugin = await window.api.plugin.load(project.path, `${name}.js`)
      openPlugin(plugin)
    } catch (error) {
      console.error('Failed to load plugin:', error)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-full w-14 flex-col border-r border-border bg-card">
        {/* Top actions */}
        <div className="flex flex-col items-center gap-1 border-b border-border p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onOpenProject}>
                <FolderOpen className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Open Project</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleNewPlugin}>
                <FilePlus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New Plugin</TooltipContent>
          </Tooltip>
        </div>

        {/* Open plugins list */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center gap-1 p-2">
            {openPlugins.map((plugin) => (
              <Tooltip key={plugin.id}>
                <TooltipTrigger asChild>
                  <div className="group relative">
                    <Button
                      variant={activePluginId === plugin.id ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => setActivePlugin(plugin.id)}
                      className="relative"
                    >
                      <FileCode className="h-5 w-5" />
                      {activePluginId === plugin.id && (
                        <ChevronRight className="absolute -right-1 h-3 w-3 text-primary" />
                      )}
                      {/* Dirty indicator */}
                      {isDirty && activePluginId === plugin.id && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500" />
                      )}
                    </Button>
                    {/* Close button (visible on hover) */}
                    <button
                      onClick={(e) => handleClosePlugin(plugin.id, e)}
                      className="absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
                      title="Close plugin"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {plugin.meta.name || 'Untitled'}
                  {isDirty && activePluginId === plugin.id && ' (unsaved)'}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </ScrollArea>

        {/* Project plugins - shows ALL .js files from js/plugins folder */}
        {project && allPluginFiles.length > 0 && (
          <>
            <div className="border-t border-border p-2 flex items-center justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={refreshPluginList}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Refresh Plugins ({allPluginFiles.length})
                </TooltipContent>
              </Tooltip>
            </div>
            <ScrollArea className="max-h-60">
              <div className="flex flex-col items-center gap-1 p-2">
                {allPluginFiles.map((filename) => {
                  const name = filename.replace(/\.js$/, '')
                  return (
                    <Tooltip key={filename}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => handleLoadPlugin(name)}
                        >
                          <FileCode className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{name}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </ScrollArea>
          </>
        )}

        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-1 border-t border-border p-2">
          {project && onToggleProjectBrowser && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={projectBrowserOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  className={projectBrowserOpen ? '' : 'text-muted-foreground'}
                  onClick={onToggleProjectBrowser}
                >
                  <Database className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Project Data Browser</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={onOpenSettings}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings (Ctrl+,)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={onOpenShortcuts}
              >
                <Keyboard className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Keyboard Shortcuts (F1)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
