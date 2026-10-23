import {
  FolderOpen,
  FilePlus,
  FileCode,
  Settings,
  Keyboard,
  ChevronRight,
  X,
  Database,
  List
} from 'lucide-react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'
import { usePluginStore, useProjectStore } from '../../stores'
import { createEmptyPlugin } from '../../types/plugin'
import { cn } from '../../lib/utils'

interface SidebarProps {
  onOpenProject: () => void
  onToggleProjectBrowser?: () => void
  projectBrowserOpen?: boolean
  onTogglePluginBrowser?: () => void
  pluginBrowserOpen?: boolean
  onOpenSettings: () => void
  onOpenShortcuts: () => void
}

export function Sidebar({
  onOpenProject,
  onToggleProjectBrowser,
  projectBrowserOpen,
  onTogglePluginBrowser,
  pluginBrowserOpen,
  onOpenSettings,
  onOpenShortcuts
}: SidebarProps) {
  const project = useProjectStore((s) => s.project)
  const openPlugins = usePluginStore((s) => s.openPlugins)
  const activePluginId = usePluginStore((s) => s.activePluginId)
  const dirtyByPluginId = usePluginStore((s) => s.dirtyByPluginId)
  const openPlugin = usePluginStore((s) => s.openPlugin)
  const closePlugin = usePluginStore((s) => s.closePlugin)
  const setActivePlugin = usePluginStore((s) => s.setActivePlugin)

  const handleNewPlugin = () => {
    const plugin = createEmptyPlugin()
    openPlugin(plugin)
  }

  const handleClosePlugin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering setActivePlugin

    if (dirtyByPluginId[id]) {
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

  return (
    <TooltipProvider>
      <div className="flex h-full w-14 flex-col border-r border-border bg-card">
        {/* Top actions */}
        <div className="flex flex-col items-center gap-1 border-b border-border p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open Project"
                className="h-9 w-9 transition-all duration-200 hover:scale-110 hover:shadow-[0_0_8px_hsl(var(--primary)/0.3)]"
                onClick={onOpenProject}
              >
                <FolderOpen className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Open Project</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="New Plugin"
                className="h-9 w-9 transition-all duration-200 hover:scale-110 hover:shadow-[0_0_8px_hsl(var(--primary)/0.3)]"
                onClick={handleNewPlugin}
              >
                <FilePlus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New Plugin</TooltipContent>
          </Tooltip>
        </div>

        {/* Open plugins list */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center gap-1 p-2">
            {openPlugins.map((plugin) => {
              const pluginIsDirty = Boolean(dirtyByPluginId[plugin.id])

              return (
                <Tooltip key={plugin.id}>
                  <TooltipTrigger asChild>
                    <div className="group relative">
                      <Button
                        variant={activePluginId === plugin.id ? 'secondary' : 'ghost'}
                        size="icon"
                        aria-label={`${plugin.meta.name || 'Untitled'}${pluginIsDirty ? ' (unsaved changes)' : ''}`}
                        onClick={() => setActivePlugin(plugin.id)}
                        className={cn(
                          'relative h-9 w-9 transition-all duration-200 hover:scale-110',
                          activePluginId === plugin.id && 'shadow-[0_0_8px_hsl(var(--primary)/0.3)]'
                        )}
                      >
                        <FileCode className="h-5 w-5" />
                        {activePluginId === plugin.id && (
                          <ChevronRight className="absolute -right-1 h-3 w-3 text-primary" />
                        )}
                        {/* Dirty state is tracked per open plugin so switching tabs does not hide unsaved edits. */}
                        {pluginIsDirty && (
                          <>
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500 animate-dot-pulse" />
                            <span className="sr-only">unsaved changes</span>
                          </>
                        )}
                      </Button>
                      {/* Close button (visible on hover) */}
                      <button
                        onClick={(e) => handleClosePlugin(plugin.id, e)}
                        aria-label={`Close ${plugin.meta.name || 'Untitled'}`}
                        className="absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {plugin.meta.name || 'Untitled'}
                    {pluginIsDirty && ' (unsaved)'}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </ScrollArea>

        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-1 border-t border-border p-2">
          {project && onTogglePluginBrowser && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={pluginBrowserOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  aria-label="Plugin Browser"
                  className={cn(
                    'h-9 w-9 transition-all duration-200 hover:scale-110 hover:shadow-[0_0_8px_hsl(var(--primary)/0.3)]',
                    !pluginBrowserOpen && 'text-muted-foreground'
                  )}
                  onClick={onTogglePluginBrowser}
                >
                  <List className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Plugin Browser (Ctrl+Shift+E)</TooltipContent>
            </Tooltip>
          )}

          {project && onToggleProjectBrowser && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={projectBrowserOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  aria-label="Project Data Browser"
                  className={cn(
                    'h-9 w-9 transition-all duration-200 hover:scale-110 hover:shadow-[0_0_8px_hsl(var(--primary)/0.3)]',
                    !projectBrowserOpen && 'text-muted-foreground'
                  )}
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
                aria-label="Settings"
                className="h-9 w-9 text-muted-foreground transition-all duration-200 hover:scale-110 hover:shadow-[0_0_8px_hsl(var(--primary)/0.3)]"
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
                aria-label="Keyboard Shortcuts"
                className="h-9 w-9 text-muted-foreground transition-all duration-200 hover:scale-110 hover:shadow-[0_0_8px_hsl(var(--primary)/0.3)]"
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
