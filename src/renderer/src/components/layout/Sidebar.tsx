import type { ReactNode } from 'react'
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
import { usePluginStore, useProjectStore, useSettingsStore } from '../../stores'
import { createEmptyPlugin, type PluginDefinition } from '../../types/plugin'
import { cn } from '../../lib/utilities'

interface SidebarProps {
  onOpenProject: () => void
  onToggleProjectBrowser?: () => void
  projectBrowserOpen?: boolean
  onTogglePluginBrowser?: () => void
  pluginBrowserOpen?: boolean
  onOpenSettings: () => void
  onOpenShortcuts: () => void
}

const RAIL_BUTTON_CLASS =
  'h-9 w-9 transition-all duration-200 hover:scale-110 hover:shadow-[0_0_8px_hsl(var(--primary)/0.3)]'

// A plugin with no entry has no unsaved changes
const isDirtyPlugin = (
  dirtyByPluginId: Readonly<Partial<Record<string, boolean>>>,
  id: string
): boolean => dirtyByPluginId[id] === true

// An icon button of the rail with its tooltip to the right
function RailButton({
  label,
  tooltip,
  testId,
  variant = 'ghost',
  className,
  onClick,
  children
}: Readonly<{
  label: string
  tooltip: string
  testId?: string
  variant?: 'ghost' | 'secondary'
  className: string
  onClick: () => void
  children: ReactNode
}>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          aria-label={label}
          data-testid={testId}
          className={className}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  )
}

// A side-panel toggle, highlighted while its panel is open
function PanelToggle({
  label,
  tooltip,
  testId,
  isPanelOpen,
  onToggle,
  children
}: Readonly<{
  label: string
  tooltip: string
  testId: string
  isPanelOpen: boolean
  onToggle: () => void
  children: ReactNode
}>) {
  return (
    <RailButton
      label={label}
      tooltip={tooltip}
      testId={testId}
      variant={isPanelOpen ? 'secondary' : 'ghost'}
      className={cn(RAIL_BUTTON_CLASS, !isPanelOpen && 'text-muted-foreground')}
      onClick={onToggle}
    >
      {children}
    </RailButton>
  )
}

// One open plugin's tab, with its close button shown on hover
function PluginTab({
  plugin,
  isActive,
  isDirty,
  onSelect,
  onClose
}: Readonly<{
  plugin: PluginDefinition
  isActive: boolean
  isDirty: boolean
  onSelect: () => void
  onClose: (event: React.MouseEvent) => void
}>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group relative">
          <Button
            variant={isActive ? 'secondary' : 'ghost'}
            size="icon"
            aria-label={`${plugin.meta.name || 'Untitled'}${isDirty ? ' (unsaved changes)' : ''}`}
            data-testid="plugin-tab"
            onClick={onSelect}
            className={cn(
              'relative h-9 w-9 transition-all duration-200 hover:scale-110',
              isActive && 'shadow-[0_0_8px_hsl(var(--primary)/0.3)]'
            )}
          >
            <FileCode className="h-5 w-5" />
            {isActive && <ChevronRight className="absolute -right-1 h-3 w-3 text-primary" />}
            {/* Dirty state is tracked per open plugin so switching tabs does not hide unsaved edits. */}
            {isDirty && (
              <>
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500 animate-dot-pulse" />
                <span className="sr-only">unsaved changes</span>
              </>
            )}
          </Button>
          {/* Close button (visible on hover) */}
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${plugin.meta.name || 'Untitled'}`}
            className="absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        {plugin.meta.name || 'Untitled'}
        {isDirty && ' (unsaved)'}
      </TooltipContent>
    </Tooltip>
  )
}

// The open plugins' tabs; a tab with unsaved changes asks before it closes
function PluginTabs() {
  const openPlugins = usePluginStore((s) => s.openPlugins)
  const activePluginId = usePluginStore((s) => s.activePluginId)
  const dirtyByPluginId = usePluginStore((s) => s.dirtyByPluginId)
  const closePlugin = usePluginStore((s) => s.closePlugin)
  const setActivePlugin = usePluginStore((s) => s.setActivePlugin)

  const handleClosePlugin = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent triggering setActivePlugin

    if (isDirtyPlugin(dirtyByPluginId, id)) {
      const result = await globalThis.api.dialog.message({
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
    <div className="flex flex-col items-center gap-1 p-2">
      {openPlugins.map((plugin) => (
        <PluginTab
          key={plugin.id}
          plugin={plugin}
          isActive={activePluginId === plugin.id}
          isDirty={isDirtyPlugin(dirtyByPluginId, plugin.id)}
          onSelect={() => {
            setActivePlugin(plugin.id)
          }}
          onClose={(event) => {
            void handleClosePlugin(plugin.id, event)
          }}
        />
      ))}
    </div>
  )
}

// Open a project, or start a new plugin with the default author
function TopActions({ onOpenProject }: Readonly<{ onOpenProject: () => void }>) {
  const openPlugin = usePluginStore((s) => s.openPlugin)

  const handleNewPlugin = () => {
    const plugin = createEmptyPlugin(useSettingsStore.getState().defaultAuthor)
    openPlugin(plugin)
  }

  return (
    <div className="flex flex-col items-center gap-1 border-b border-border p-2">
      <RailButton
        label="Open Project"
        tooltip="Open Project"
        testId="open-project"
        className={RAIL_BUTTON_CLASS}
        onClick={onOpenProject}
      >
        <FolderOpen className="h-5 w-5" />
      </RailButton>
      <RailButton
        label="New Plugin"
        tooltip="New Plugin"
        testId="new-plugin"
        className={RAIL_BUTTON_CLASS}
        onClick={handleNewPlugin}
      >
        <FilePlus className="h-5 w-5" />
      </RailButton>
    </div>
  )
}

export function Sidebar({
  onOpenProject,
  onToggleProjectBrowser,
  projectBrowserOpen,
  onTogglePluginBrowser,
  pluginBrowserOpen,
  onOpenSettings,
  onOpenShortcuts
}: Readonly<SidebarProps>) {
  const project = useProjectStore((s) => s.project)

  return (
    <TooltipProvider>
      <div className="flex h-full w-14 flex-col border-r border-border bg-card">
        <TopActions onOpenProject={onOpenProject} />

        {/* Open plugins list */}
        <ScrollArea className="flex-1">
          <PluginTabs />
        </ScrollArea>

        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-1 border-t border-border p-2">
          {project && onTogglePluginBrowser && (
            <PanelToggle
              label="Plugin Browser"
              tooltip="Plugin Browser (Ctrl+Shift+E)"
              testId="plugin-browser-toggle"
              isPanelOpen={pluginBrowserOpen === true}
              onToggle={onTogglePluginBrowser}
            >
              <List className="h-5 w-5" />
            </PanelToggle>
          )}
          {project && onToggleProjectBrowser && (
            <PanelToggle
              label="Project Data Browser"
              tooltip="Project Data Browser"
              testId="project-data-toggle"
              isPanelOpen={projectBrowserOpen === true}
              onToggle={onToggleProjectBrowser}
            >
              <Database className="h-5 w-5" />
            </PanelToggle>
          )}
          <RailButton
            label="Settings"
            tooltip="Settings (Ctrl+,)"
            testId="settings-open"
            className={cn(RAIL_BUTTON_CLASS, 'text-muted-foreground')}
            onClick={onOpenSettings}
          >
            <Settings className="h-5 w-5" />
          </RailButton>
          <RailButton
            label="Keyboard Shortcuts"
            tooltip="Keyboard Shortcuts (F1)"
            className={cn(RAIL_BUTTON_CLASS, 'text-muted-foreground')}
            onClick={onOpenShortcuts}
          >
            <Keyboard className="h-5 w-5" />
          </RailButton>
        </div>
      </div>
    </TooltipProvider>
  )
}
