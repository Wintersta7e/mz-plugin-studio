import { useCallback, useEffect, useState, useRef } from 'react'
import { TitleBar } from './components/layout/TitleBar'
import { Sidebar } from './components/layout/Sidebar'
import { StatusBar } from './components/layout/StatusBar'
import { MetaEditor } from './components/plugin/MetaEditor'
import { ParameterBuilder } from './components/plugin/ParameterBuilder'
import { CommandBuilder } from './components/plugin/CommandBuilder'
import { StructBuilder } from './components/plugin/StructBuilder'
import { CodeEditor } from './components/plugin/CodeEditor'
import { CodePreview } from './components/preview/CodePreview'
import { AnalysisView } from './components/analysis/AnalysisView'
import { ProjectBrowser } from './components/project/ProjectBrowser'
import { PluginBrowser } from './components/plugin/PluginBrowser'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import {
  useProjectStore,
  usePluginStore,
  useUIStore,
  useHistoryStore,
  useSettingsStore,
  useToastStore
} from './stores'
import { SettingsDialog } from './components/settings/SettingsDialog'
import { ShortcutsDialog } from './components/settings/ShortcutsDialog'
import { ToastContainer } from './components/ui/toast'
import { shouldHandleShortcut } from './lib/shortcuts'
import { createEmptyPlugin } from './types/plugin'
import { generatePluginOutput } from './lib/plugin-output'
import { FolderOpen, FilePlus } from 'lucide-react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { cn } from './lib/utils'

const pluginFade = { duration: 0.12 }
const viewFade = { duration: 0.1 }
const tabTransition = { duration: 0.1, ease: [0.25, 0.46, 0.45, 0.94] as const }

function App() {
  const project = useProjectStore((s) => s.project)
  const setProject = useProjectStore((s) => s.setProject)
  const addRecentProject = useProjectStore((s) => s.addRecentProject)
  const setLoading = useProjectStore((s) => s.setLoading)
  const setError = useProjectStore((s) => s.setError)
  const setAllGameData = useProjectStore((s) => s.setAllGameData)
  const scanDependencies = useProjectStore((s) => s.scanDependencies)
  const recentProjects = useProjectStore((s) => s.recentProjects)

  const plugin = usePluginStore((s) => s.plugin)
  const setPlugin = usePluginStore((s) => s.setPlugin)
  const openPlugins = usePluginStore((s) => s.openPlugins)
  const activePluginId = usePluginStore((s) => s.activePluginId)
  const pushHistory = useHistoryStore((s) => s.push)
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)

  const activeTab = useUIStore((s) => s.activeTab)
  const setActiveTab = useUIStore((s) => s.setActiveTab)
  const previewWidth = useUIStore((s) => s.previewWidth)
  const setPreviewWidth = useUIStore((s) => s.setPreviewWidth)
  const mainView = useUIStore((s) => s.mainView)
  const setMainView = useUIStore((s) => s.setMainView)
  const previewCollapsed = useUIStore((s) => s.previewCollapsed)

  const theme = useSettingsStore((s) => s.theme)

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Guard: skip history push when the plugin change originated from undo/redo
  const isUndoRedoRef = useRef(false)
  // Guard: prevent concurrent save operations (BUG-03)
  const isSavingRef = useRef(false)
  // Guard: prevent concurrent loadProject calls (BUG-10)
  const isLoadingRef = useRef(false)

  const [projectBrowserOpen, setProjectBrowserOpen] = useState(false)
  const [pluginBrowserOpen, setPluginBrowserOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  // Handle preview panel resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return
      const delta = resizeRef.current.startX - e.clientX
      const newWidth = resizeRef.current.startWidth + delta
      setPreviewWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      resizeRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setPreviewWidth])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeRef.current = { startX: e.clientX, startWidth: previewWidth }
  }

  // Save plugin state to history on changes (debounced).
  // Skips when the change came from undo/redo to avoid wiping the redo stack.
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false
      return
    }
    const timeoutId = setTimeout(() => {
      pushHistory(plugin)
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [plugin, pushHistory])

  // Warn about unsaved changes on window close (browser refresh only)
  // Note: Window close via titlebar is handled by the close button directly
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): string | void => {
      // Check ALL open plugins for unsaved changes, not just the active one
      const state = usePluginStore.getState()
      const anyDirty = Object.values(state.dirtyByPluginId).some(Boolean)
      if (anyDirty) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const loadProject = useCallback(
    async (path: string) => {
      if (isLoadingRef.current) return
      isLoadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        const validation = await window.api.project.validate(path)
        if (!validation.valid) {
          setError(validation.error || 'Invalid project')
          setLoading(false)
          return
        }

        const projectData = await window.api.project.load(path)
        setProject(projectData)
        addRecentProject(path)

        // Use data already loaded by parseProject — avoids 14 redundant IPC file reads
        setAllGameData({
          switches: projectData.switches,
          variables: projectData.variables,
          actors: projectData.actors,
          items: projectData.items,
          skills: projectData.skills,
          weapons: projectData.weapons,
          armors: projectData.armors,
          enemies: projectData.enemies,
          states: projectData.states,
          animations: projectData.animations,
          tilesets: projectData.tilesets,
          commonEvents: projectData.commonEvents,
          classes: projectData.classes,
          troops: projectData.troops
        })

        // Scan after all game data is loaded (not via setTimeout in setProject)
        await scanDependencies()
      } catch (error) {
        setError(String(error))
      } finally {
        setLoading(false)
        isLoadingRef.current = false
      }
    },
    [setLoading, setError, setProject, addRecentProject, setAllGameData, scanDependencies]
  )

  const handleOpenProject = useCallback(async () => {
    const path = await window.api.dialog.openFolder()
    if (!path) return
    await loadProject(path)
  }, [loadProject])

  const handleOpenRecentProject = useCallback(
    async (path: string) => {
      await loadProject(path)
    },
    [loadProject]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcut = shouldHandleShortcut(e)
      if (!shortcut) return

      e.preventDefault()

      const TAB_MAP: Record<string, typeof activeTab> = {
        'ctrl+1': 'meta',
        'ctrl+2': 'parameters',
        'ctrl+3': 'commands',
        'ctrl+4': 'structs',
        'ctrl+5': 'code'
      }

      switch (shortcut.key) {
        case 'ctrl+z': {
          const prev = undo()
          if (prev) {
            isUndoRedoRef.current = true
            // Restore rawSource from current plugin since history strips it to save memory
            const currentRawSource = usePluginStore.getState().plugin.rawSource
            setPlugin(prev.rawSource ? prev : { ...prev, rawSource: currentRawSource })
          }
          break
        }
        case 'ctrl+shift+z': {
          const next = redo()
          if (next) {
            isUndoRedoRef.current = true
            const currentRawSource = usePluginStore.getState().plugin.rawSource
            setPlugin(next.rawSource ? next : { ...next, rawSource: currentRawSource })
          }
          break
        }
        case 'ctrl+s': {
          if (isSavingRef.current) break
          const ps = usePluginStore.getState()
          const rawMode = useUIStore
            .getState()
            .getRawModeForPlugin(ps.plugin.id, Boolean(ps.plugin.rawSource))
          const proj = useProjectStore.getState().project
          if (proj && ps.plugin.meta.name) {
            isSavingRef.current = true
            const code = generatePluginOutput(ps.plugin, rawMode)
            const filename = `${ps.plugin.meta.name}.js`
            window.api.plugin
              .save(proj.path, filename, code)
              .then((result) => {
                if (result.success) {
                  usePluginStore.getState().setSavedPath(result.path)
                  usePluginStore.getState().setDirty(false)
                  useToastStore.getState().addToast({ type: 'success', message: 'Plugin saved' })
                }
              })
              .catch((error: unknown) => {
                useToastStore.getState().addToast({
                  type: 'error',
                  message: `Save failed: ${error instanceof Error ? error.message : String(error)}`
                })
              })
              .finally(() => {
                isSavingRef.current = false
              })
          }
          break
        }
        case 'ctrl+shift+s': {
          if (isSavingRef.current) break
          isSavingRef.current = true
          const ps = usePluginStore.getState()
          const proj = useProjectStore.getState().project
          if (!proj) {
            isSavingRef.current = false
            break
          }
          let savedCount = 0
          let failCount = 0
          const savePromises = ps.openPlugins
            .filter((p) => ps.dirtyByPluginId[p.id] && p.meta.name)
            .map(async (p) => {
              const rawMode = useUIStore.getState().getRawModeForPlugin(p.id, Boolean(p.rawSource))
              const code = generatePluginOutput(p, rawMode)
              const filename = `${p.meta.name}.js`
              try {
                const result = await window.api.plugin.save(proj.path, filename, code)
                if (result.success) {
                  usePluginStore.setState((state) => {
                    const isActive = state.activePluginId === p.id
                    const nextDirty = { ...state.dirtyByPluginId }
                    delete nextDirty[p.id]
                    const nextPaths = { ...state.savedPathsByPluginId, [p.id]: result.path }
                    return {
                      dirtyByPluginId: nextDirty,
                      savedPathsByPluginId: nextPaths,
                      ...(isActive ? { isDirty: false, savedPath: result.path } : {})
                    }
                  })
                  savedCount++
                }
              } catch {
                failCount++
              }
            })
          void Promise.all(savePromises)
            .then(() => {
              if (savedCount > 0 || failCount > 0) {
                useToastStore.getState().addToast({
                  type: failCount > 0 ? 'warning' : 'success',
                  message:
                    failCount > 0
                      ? `Saved ${savedCount}, failed ${failCount}`
                      : `${savedCount} plugin${savedCount > 1 ? 's' : ''} saved`
                })
              }
            })
            .finally(() => {
              isSavingRef.current = false
            })
          break
        }
        case 'ctrl+b':
          useUIStore.getState().togglePreview()
          break
        case 'ctrl+shift+e':
          setPluginBrowserOpen((prev) => !prev)
          break
        case 'ctrl+n': {
          const newPlugin = createEmptyPlugin()
          usePluginStore.getState().openPlugin(newPlugin)
          break
        }
        case 'ctrl+o':
          handleOpenProject()
          break
        case 'ctrl+,':
          setSettingsOpen(true)
          break
        case 'f1':
          setShortcutsOpen(true)
          break
        case 'f5':
          setPlugin({ ...usePluginStore.getState().plugin })
          break
        default:
          if (shortcut.key in TAB_MAP) {
            setActiveTab(TAB_MAP[shortcut.key])
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, setPlugin, setActiveTab, handleOpenProject])

  return (
    <MotionConfig reducedMotion="user">
      <div className="animated-bg flex h-screen flex-col">
        <TitleBar />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            onOpenProject={handleOpenProject}
            onToggleProjectBrowser={() => setProjectBrowserOpen(!projectBrowserOpen)}
            projectBrowserOpen={projectBrowserOpen}
            onTogglePluginBrowser={() => setPluginBrowserOpen(!pluginBrowserOpen)}
            pluginBrowserOpen={pluginBrowserOpen}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenShortcuts={() => setShortcutsOpen(true)}
          />

          {pluginBrowserOpen && project && (
            <PluginBrowser onClose={() => setPluginBrowserOpen(false)} />
          )}

          <main className="flex flex-1 flex-col overflow-hidden">
            {openPlugins.length === 0 && !project ? (
              <WelcomeScreen
                onOpenProject={handleOpenProject}
                onNewPlugin={() => usePluginStore.getState().openPlugin(createEmptyPlugin())}
                recentProjects={recentProjects}
                onOpenRecentProject={handleOpenRecentProject}
              />
            ) : openPlugins.length === 0 ? (
              <NoPluginScreen />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePluginId ?? 'none'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={pluginFade}
                  className="flex flex-1 flex-col overflow-hidden"
                >
                  {/* View switch tabs — only when project is loaded */}
                  {project && (
                    <div className="flex border-b border-border px-4 pt-2">
                      <button
                        className={cn(
                          'px-3 py-1.5 text-sm font-medium transition-colors',
                          mainView === 'editor'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                        onClick={() => setMainView('editor')}
                      >
                        Editor
                      </button>
                      <button
                        className={cn(
                          'px-3 py-1.5 text-sm font-medium transition-colors',
                          mainView === 'analysis'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                        onClick={() => setMainView('analysis')}
                      >
                        Analysis
                      </button>
                    </div>
                  )}

                  <AnimatePresence mode="popLayout">
                    {mainView === 'analysis' && project ? (
                      <motion.div
                        key="analysis"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={viewFade}
                        className="flex-1 overflow-hidden"
                      >
                        <AnalysisView />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="editor"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={viewFade}
                        className="flex flex-1 overflow-hidden"
                      >
                        {/* Editor panels */}
                        <div className="flex-1 overflow-hidden border-r border-border transition-shadow duration-300 focus-within:shadow-[inset_0_0_20px_hsl(var(--primary)/0.04)]">
                          <Tabs
                            value={activeTab}
                            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
                            className="flex h-full flex-col"
                          >
                            <TabsList className="mx-4 mt-4 w-fit">
                              <TabsTrigger value="meta">Metadata</TabsTrigger>
                              <TabsTrigger value="parameters">Parameters</TabsTrigger>
                              <TabsTrigger value="commands">Commands</TabsTrigger>
                              <TabsTrigger value="structs">Structs</TabsTrigger>
                              <TabsTrigger value="code">Code</TabsTrigger>
                            </TabsList>

                            <AnimatePresence mode="popLayout">
                              <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={tabTransition}
                                className="flex-1 overflow-hidden"
                              >
                                <TabsContent value={activeTab} forceMount className="mt-0 h-full">
                                  {activeTab === 'meta' && <MetaEditor />}
                                  {activeTab === 'parameters' && <ParameterBuilder />}
                                  {activeTab === 'commands' && <CommandBuilder />}
                                  {activeTab === 'structs' && <StructBuilder />}
                                  {activeTab === 'code' && <CodeEditor />}
                                </TabsContent>
                              </motion.div>
                            </AnimatePresence>
                          </Tabs>
                        </div>

                        {/* Resize handle */}
                        {!previewCollapsed && (
                          <div
                            className="w-1.5 cursor-col-resize bg-border hover:bg-primary/50 active:bg-primary"
                            onMouseDown={handleResizeStart}
                          />
                        )}

                        {/* Code preview */}
                        {!previewCollapsed && (
                          <div
                            className="overflow-hidden transition-shadow duration-300 focus-within:shadow-[inset_0_0_20px_hsl(var(--primary)/0.04)]"
                            style={{ width: previewWidth }}
                          >
                            <CodePreview />
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            )}
          </main>

          {/* Project Data Browser */}
          {projectBrowserOpen && project && (
            <ProjectBrowser onClose={() => setProjectBrowserOpen(false)} />
          )}
        </div>

        <StatusBar />
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        <ToastContainer />
      </div>
    </MotionConfig>
  )
}

interface WelcomeScreenProps {
  onOpenProject: () => void
  onNewPlugin: () => void
  recentProjects: string[]
  onOpenRecentProject: (path: string) => void
}

const staggerChild = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
}
const staggerSpring = { type: 'spring' as const, stiffness: 300, damping: 25 }

function WelcomeScreen({
  onOpenProject,
  onNewPlugin,
  recentProjects,
  onOpenRecentProject
}: WelcomeScreenProps): React.ReactElement {
  const hasPlayed = useRef(false)

  useEffect(() => {
    hasPlayed.current = true
  }, [])

  return (
    <div className="flex flex-1 items-center justify-center">
      <motion.div
        className="flex max-w-lg flex-col items-center gap-6 text-center"
        initial={hasPlayed.current ? false : 'hidden'}
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } }
        }}
      >
        {/* MZ logo */}
        <motion.div
          variants={staggerChild}
          transition={staggerSpring}
          className="flex justify-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20">
            <span className="text-4xl font-bold text-primary">MZ</span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={staggerChild}
          transition={staggerSpring}
          className="text-2xl font-bold"
        >
          MZ Plugin Studio
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={staggerChild}
          transition={staggerSpring}
          className="text-muted-foreground"
        >
          Create RPG Maker MZ plugins without writing code
        </motion.p>

        {/* Action cards */}
        <motion.div
          variants={staggerChild}
          transition={staggerSpring}
          className="grid w-full grid-cols-2 gap-3"
        >
          <button
            onClick={onOpenProject}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm transition-colors hover:bg-accent"
          >
            <FolderOpen className="h-6 w-6 text-primary" />
            <span className="font-medium">Open Project</span>
            <span className="text-xs text-muted-foreground">Load an existing MZ project</span>
          </button>
          <button
            onClick={onNewPlugin}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm transition-colors hover:bg-accent"
          >
            <FilePlus className="h-6 w-6 text-primary" />
            <span className="font-medium">New Plugin</span>
            <span className="text-xs text-muted-foreground">Start with a blank plugin</span>
          </button>
        </motion.div>

        {/* Recent projects */}
        {recentProjects.length > 0 && (
          <motion.div variants={staggerChild} transition={staggerSpring} className="mt-2 w-full">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Recent Projects</h3>
            <div className="space-y-2">
              {recentProjects.slice(0, 5).map((path) => (
                <button
                  key={path}
                  onClick={() => onOpenRecentProject(path)}
                  className="w-full truncate rounded-md border border-border bg-card px-4 py-2 text-left text-sm hover:bg-accent"
                >
                  {path.split(/[/\\]/).pop()}
                  <span className="block truncate text-xs text-muted-foreground">{path}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

function NoPluginScreen() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center text-muted-foreground">
        <p className="mb-2">No plugin open</p>
        <p className="text-sm">Create a new plugin or load one from the sidebar</p>
      </div>
    </div>
  )
}

export default App
