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
import { generatePlugin } from './lib/generator'
import { FolderOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './components/ui/button'
import { cn } from './lib/utils'

function App() {
  const project = useProjectStore((s) => s.project)
  const setProject = useProjectStore((s) => s.setProject)
  const addRecentProject = useProjectStore((s) => s.addRecentProject)
  const setLoading = useProjectStore((s) => s.setLoading)
  const setError = useProjectStore((s) => s.setError)
  const setSwitches = useProjectStore((s) => s.setSwitches)
  const setVariables = useProjectStore((s) => s.setVariables)
  const setActors = useProjectStore((s) => s.setActors)
  const setItems = useProjectStore((s) => s.setItems)
  const setSkills = useProjectStore((s) => s.setSkills)
  const setWeapons = useProjectStore((s) => s.setWeapons)
  const setArmors = useProjectStore((s) => s.setArmors)
  const setEnemies = useProjectStore((s) => s.setEnemies)
  const setStates = useProjectStore((s) => s.setStates)
  const setAnimations = useProjectStore((s) => s.setAnimations)
  const setTilesets = useProjectStore((s) => s.setTilesets)
  const setCommonEvents = useProjectStore((s) => s.setCommonEvents)
  const setClasses = useProjectStore((s) => s.setClasses)
  const setTroops = useProjectStore((s) => s.setTroops)
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

  const theme = useSettingsStore((s) => s.theme)

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const [projectBrowserOpen, setProjectBrowserOpen] = useState(false)
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

  // Save plugin state to history on changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      pushHistory(plugin)
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [plugin, pushHistory])

  // Warn about unsaved changes on window close (browser refresh only)
  // Note: Window close via titlebar is handled by the close button directly
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): string | void => {
      // Only warn for browser refresh, not for programmatic close
      if (usePluginStore.getState().isDirty) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const handleOpenProject = useCallback(async () => {
    const path = await window.api.dialog.openFolder()
    if (!path) return

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

      // Load additional data
      const [
        switches,
        variables,
        actors,
        items,
        skills,
        weapons,
        armors,
        enemies,
        states,
        animations,
        tilesets,
        commonEvents,
        classes,
        troops
      ] = await Promise.all([
        window.api.project.getSwitches(path),
        window.api.project.getVariables(path),
        window.api.project.getActors(path),
        window.api.project.getItems(path),
        window.api.project.getSkills(path),
        window.api.project.getWeapons(path),
        window.api.project.getArmors(path),
        window.api.project.getEnemies(path),
        window.api.project.getStates(path),
        window.api.project.getAnimations(path),
        window.api.project.getTilesets(path),
        window.api.project.getCommonEvents(path),
        window.api.project.getClasses(path),
        window.api.project.getTroops(path)
      ])

      setSwitches(switches)
      setVariables(variables)
      setActors(actors)
      setItems(items)
      setSkills(skills)
      setWeapons(weapons)
      setArmors(armors)
      setEnemies(enemies)
      setStates(states)
      setAnimations(animations)
      setTilesets(tilesets)
      setCommonEvents(commonEvents)
      setClasses(classes)
      setTroops(troops)
    } catch (error) {
      setError(String(error))
    } finally {
      setLoading(false)
    }
  }, [
    setLoading,
    setError,
    setProject,
    addRecentProject,
    setSwitches,
    setVariables,
    setActors,
    setItems,
    setSkills,
    setWeapons,
    setArmors,
    setEnemies,
    setStates,
    setAnimations,
    setTilesets,
    setCommonEvents,
    setClasses,
    setTroops
  ])

  const handleOpenRecentProject = useCallback(
    async (path: string) => {
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

        const [
          switches,
          variables,
          actors,
          items,
          skills,
          weapons,
          armors,
          enemies,
          states,
          animations,
          tilesets,
          commonEvents,
          classes,
          troops
        ] = await Promise.all([
          window.api.project.getSwitches(path),
          window.api.project.getVariables(path),
          window.api.project.getActors(path),
          window.api.project.getItems(path),
          window.api.project.getSkills(path),
          window.api.project.getWeapons(path),
          window.api.project.getArmors(path),
          window.api.project.getEnemies(path),
          window.api.project.getStates(path),
          window.api.project.getAnimations(path),
          window.api.project.getTilesets(path),
          window.api.project.getCommonEvents(path),
          window.api.project.getClasses(path),
          window.api.project.getTroops(path)
        ])

        setSwitches(switches)
        setVariables(variables)
        setActors(actors)
        setItems(items)
        setSkills(skills)
        setWeapons(weapons)
        setArmors(armors)
        setEnemies(enemies)
        setStates(states)
        setAnimations(animations)
        setTilesets(tilesets)
        setCommonEvents(commonEvents)
        setClasses(classes)
        setTroops(troops)
      } catch (error) {
        setError(String(error))
      } finally {
        setLoading(false)
      }
    },
    [
      setLoading,
      setError,
      setProject,
      addRecentProject,
      setSwitches,
      setVariables,
      setActors,
      setItems,
      setSkills,
      setWeapons,
      setArmors,
      setEnemies,
      setStates,
      setAnimations,
      setTilesets,
      setCommonEvents,
      setClasses,
      setTroops
    ]
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
          if (prev) setPlugin(prev)
          break
        }
        case 'ctrl+shift+z': {
          const next = redo()
          if (next) setPlugin(next)
          break
        }
        case 'ctrl+s': {
          const ps = usePluginStore.getState()
          const proj = useProjectStore.getState().project
          if (proj && ps.plugin.meta.name) {
            const code = generatePlugin(ps.plugin)
            const filename = `${ps.plugin.meta.name}.js`
            window.api.plugin.save(proj.path, filename, code).then((result) => {
              if (result.success) {
                usePluginStore.getState().setSavedPath(result.path)
                usePluginStore.getState().setDirty(false)
                useToastStore.getState().addToast({ type: 'success', message: 'Plugin saved' })
              }
            }).catch((error: unknown) => {
              useToastStore.getState().addToast({ type: 'error', message: `Save failed: ${error instanceof Error ? error.message : String(error)}` })
            })
          }
          break
        }
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
    <div className="flex h-screen flex-col bg-background">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onOpenProject={handleOpenProject}
          onToggleProjectBrowser={() => setProjectBrowserOpen(!projectBrowserOpen)}
          projectBrowserOpen={projectBrowserOpen}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />

        <main className="flex flex-1 flex-col overflow-hidden">
          {openPlugins.length === 0 && !project ? (
            <WelcomeScreen
              onOpenProject={handleOpenProject}
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
                transition={{ duration: 0.12 }}
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

                <AnimatePresence mode="wait">
                  {mainView === 'analysis' && project ? (
                    <motion.div
                      key="analysis"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
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
                      transition={{ duration: 0.15 }}
                      className="flex flex-1 overflow-hidden"
                    >
                      {/* Editor panels */}
                      <div className="flex-1 overflow-hidden border-r border-border">
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

                          <AnimatePresence mode="wait">
                            <motion.div
                              key={activeTab}
                              initial={{ opacity: 0, x: 8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -8 }}
                              transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
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
                      <div
                        className="w-1 cursor-col-resize bg-border hover:bg-primary/50 active:bg-primary"
                        onMouseDown={handleResizeStart}
                      />

                      {/* Code preview */}
                      <div className="overflow-hidden" style={{ width: previewWidth }}>
                        <CodePreview />
                      </div>
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
  )
}

interface WelcomeScreenProps {
  onOpenProject: () => void
  recentProjects: string[]
  onOpenRecentProject: (path: string) => void
}

function WelcomeScreen({ onOpenProject, recentProjects, onOpenRecentProject }: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20">
            <span className="text-4xl font-bold text-primary">MZ</span>
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold">MZ Plugin Studio</h1>
        <p className="mb-6 text-muted-foreground">
          Create RPG Maker MZ plugins without writing code
        </p>

        <Button size="lg" onClick={onOpenProject} className="mb-4">
          <FolderOpen className="mr-2 h-5 w-5" />
          Open MZ Project
        </Button>

        {recentProjects.length > 0 && (
          <div className="mt-8">
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
          </div>
        )}
      </div>
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
