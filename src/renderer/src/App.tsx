import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  useRef,
  type Dispatch,
  type ReactElement,
  type RefObject,
  type SetStateAction
} from 'react'
import { TitleBar } from './components/layout/TitleBar'
import { Sidebar } from './components/layout/Sidebar'
import { StatusBar } from './components/layout/StatusBar'
import { MetaEditor } from './components/plugin/MetaEditor'
import { ParameterBuilder } from './components/plugin/ParameterBuilder'
import { CommandBuilder } from './components/plugin/CommandBuilder'
import { StructBuilder } from './components/plugin/StructBuilder'
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
import { formatRestoreReport, takeRestoreReport } from './stores/persist'
import { SettingsDialog } from './components/settings/SettingsDialog'
import { ShortcutsDialog } from './components/settings/ShortcutsDialog'
import { ToastContainer } from './components/ui/toast'
import { shortcutToHandle } from './lib/shortcuts'
import { createEmptyPlugin, type PluginDefinition } from './types/plugin'
import type { MZProject } from './types/mz'
import { saveAllPlugins, savePlugin } from './lib/save-plugin'
import { NOTICE_MS } from './stores/toastStore'
import { PREVIEW_WIDTH_MAX, PREVIEW_WIDTH_MIN } from './stores/uiStore'
import { offerReloadFromProject } from './lib/raw-mode'
import { FolderOpen, FilePlus } from 'lucide-react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { cn, refusalReason, userMessage } from './lib/utilities'
import { PROJECT_OPEN_CANCELLED } from '../../shared/ipc-types'

// The code editor loads with the first view that shows one, not at start
const CodeEditor = lazy(async () => {
  const editorModule = await import('./components/plugin/CodeEditor')
  return { default: editorModule.CodeEditor }
})
const CodePreview = lazy(async () => {
  const previewModule = await import('./components/preview/CodePreview')
  return { default: previewModule.CodePreview }
})

const pluginFade = { duration: 0.12 }
const viewFade = { duration: 0.1 }
const tabTransition = { duration: 0.1, ease: [0.25, 0.46, 0.45, 0.94] as const }
// How far one arrow key moves the divider between the editor and the code preview
const PREVIEW_RESIZE_STEP = 20

type EditorTab = ReturnType<typeof useUIStore.getState>['activeTab']

const EDITOR_TABS: readonly EditorTab[] = [
  'meta',
  'parameters',
  'commands',
  'structs',
  'code',
  'preview'
]
const TAB_SHORTCUTS = new Map<string, EditorTab>([
  ['ctrl+1', 'meta'],
  ['ctrl+2', 'parameters'],
  ['ctrl+3', 'commands'],
  ['ctrl+4', 'structs'],
  ['ctrl+5', 'code']
])

// Applies the theme to the document root
function useDocumentTheme(): void {
  const theme = useSettingsStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme
  }, [theme])
}

// Reports saved state that could not be loaded as stored, once per startup
function useRestoreReport(): void {
  useEffect(() => {
    const entries = takeRestoreReport()
    if (entries.length > 0) {
      useToastStore.getState().addToast({
        type: 'warning',
        message: formatRestoreReport(entries),
        duration: 0
      })
    }
  }, [])
}

interface PreviewResize {
  previewWidth: number
  startResize: (event: React.MouseEvent) => void
  resizeByKey: (event: React.KeyboardEvent) => void
}

// Resizes the code preview by dragging the divider or by the arrow keys on it
function usePreviewResize(): PreviewResize {
  const previewWidth = useUIStore((s) => s.previewWidth)
  const setPreviewWidth = useUIStore((s) => s.setPreviewWidth)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return
      const delta = resizeRef.current.startX - event.clientX
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

  const startResize = (event: React.MouseEvent) => {
    event.preventDefault()
    setIsResizing(true)
    resizeRef.current = { startX: event.clientX, startWidth: previewWidth }
  }

  // The preview sits right of the divider, so moving the divider left widens it
  const resizeByKey = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') setPreviewWidth(previewWidth + PREVIEW_RESIZE_STEP)
    else if (event.key === 'ArrowRight') setPreviewWidth(previewWidth - PREVIEW_RESIZE_STEP)
    else return
    event.preventDefault()
  }

  return { previewWidth, startResize, resizeByKey }
}

// Save plugin state to history on changes (debounced).
// Skips when the change came from undo/redo to avoid wiping the redo stack.
function useHistoryRecording(isUndoRedoRef: RefObject<boolean>): void {
  const plugin = usePluginStore((s) => s.plugin)
  const pushHistory = useHistoryStore((s) => s.push)
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false
      return
    }
    const timeoutId = setTimeout(() => {
      pushHistory(plugin)
    }, 500)
    return () => {
      clearTimeout(timeoutId)
    }
  }, [plugin, pushHistory, isUndoRedoRef])
}

// Holding back the unload while any tab is unsaved makes main ask before the window closes,
// however it is closed
function useUnloadGuard(): void {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      // Check ALL open plugins for unsaved changes, not just the active one
      const state = usePluginStore.getState()
      if (Object.values(state.dirtyByPluginId).some(Boolean)) event.preventDefault()
    }

    addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
}

// Shows why the folder at `path` could not be opened as a project
function notifyOpenFailure(path: string, detail: string): void {
  useToastStore.getState().addToast({
    type: 'error',
    message: `Could not open "${path}": ${detail}`,
    duration: NOTICE_MS
  })
}

// The game data a loaded project already holds, so none is read again
function gameDataOf(
  projectData: MZProject
): Parameters<ReturnType<typeof useProjectStore.getState>['setAllGameData']>[0] {
  return {
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
  }
}

interface ProjectOpening {
  openProject: () => Promise<void>
  openRecentProject: (path: string) => Promise<void>
}

// Opens a project folder, chosen in the dialog or from the recent list
function useProjectOpening(): ProjectOpening {
  const setProject = useProjectStore((s) => s.setProject)
  const addRecentProject = useProjectStore((s) => s.addRecentProject)
  const setLoading = useProjectStore((s) => s.setLoading)
  const setError = useProjectStore((s) => s.setError)
  const setAllGameData = useProjectStore((s) => s.setAllGameData)
  const scanDependencies = useProjectStore((s) => s.scanDependencies)
  const recentProjects = useProjectStore((s) => s.recentProjects)
  // Guard: prevent concurrent loadProject calls (BUG-10)
  const isLoadingRef = useRef(false)

  const loadProject = useCallback(
    async (path: string) => {
      if (isLoadingRef.current) return
      isLoadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        const validation = await globalThis.api.project.validate(path)
        if (!validation.valid) {
          const reason =
            validation.error === undefined || validation.error === ''
              ? 'Invalid project'
              : validation.error
          setError(reason)
          notifyOpenFailure(path, `not an RPG Maker MZ project (${reason}).`)
          setLoading(false)
          return
        }

        const projectData = await globalThis.api.project.load(path)
        setProject(projectData)
        addRecentProject(path)

        // Use data already loaded by parseProject — avoids 14 redundant IPC file reads
        setAllGameData(gameDataOf(projectData))

        // Scan after all game data is loaded (not via setTimeout in setProject)
        await scanDependencies()
        await offerReloadFromProject(projectData.path)
      } catch (error) {
        const refused = refusalReason(error)
        // The user chose Cancel in main's confirm: nothing went wrong
        if (refused === PROJECT_OPEN_CANCELLED) return
        setError(String(error))
        const detail = refused === null ? userMessage(error) : `${refused}.`
        notifyOpenFailure(path, detail)
      } finally {
        setLoading(false)
        isLoadingRef.current = false
      }
    },
    [setLoading, setError, setProject, addRecentProject, setAllGameData, scanDependencies]
  )

  const openProject = useCallback(async () => {
    // Opens beside the most recent project, so its siblings show
    const recent = recentProjects.at(0)
    const path = await globalThis.api.dialog.openFolder(
      recent === undefined ? {} : { defaultPath: recent }
    )
    if (path === null || path === '') return
    await loadProject(path)
  }, [loadProject, recentProjects])

  const openRecentProject = useCallback(
    async (path: string) => {
      await loadProject(path)
    },
    [loadProject]
  )

  return { openProject, openRecentProject }
}

// Puts a plugin from the history in the editor. History strips rawSource to save memory, so
// the current plugin's is kept.
function restoreFromHistory(
  snapshot: Omit<PluginDefinition, 'rawSource'> | null,
  isUndoRedoRef: RefObject<boolean>
): void {
  if (snapshot === null) return
  isUndoRedoRef.current = true
  const restored = { ...snapshot }
  const currentRawSource = currentPlugin().rawSource
  usePluginStore
    .getState()
    .setPlugin(
      currentRawSource === undefined ? restored : { ...restored, rawSource: currentRawSource },
      true
    )
}

// The plugin open in the editor
function currentPlugin(): PluginDefinition {
  return usePluginStore.getState().plugin
}

// Runs one save at a time: a save asked for while one runs is dropped
function runSave(isSavingRef: RefObject<boolean>, save: () => Promise<void>): void {
  if (isSavingRef.current) return
  isSavingRef.current = true
  void save().finally(() => {
    isSavingRef.current = false
  })
}

interface ShortcutHandlers {
  isUndoRedoRef: RefObject<boolean>
  isSavingRef: RefObject<boolean>
  openProject: () => Promise<void>
  setPluginBrowserOpen: Dispatch<SetStateAction<boolean>>
  setSettingsOpen: Dispatch<SetStateAction<boolean>>
  setShortcutsOpen: Dispatch<SetStateAction<boolean>>
}

// What each keyboard shortcut does
function shortcutActions(handlers: ShortcutHandlers): Map<string, () => void> {
  const { isUndoRedoRef, isSavingRef } = handlers
  const actions = new Map<string, () => void>([
    [
      'ctrl+z',
      () => {
        restoreFromHistory(useHistoryStore.getState().undo(currentPlugin()), isUndoRedoRef)
      }
    ],
    [
      'ctrl+shift+z',
      () => {
        restoreFromHistory(useHistoryStore.getState().redo(currentPlugin()), isUndoRedoRef)
      }
    ],
    [
      'ctrl+s',
      () => {
        runSave(isSavingRef, async () => {
          await savePlugin(currentPlugin().id, 'save')
        })
      }
    ],
    [
      'ctrl+shift+s',
      () => {
        runSave(isSavingRef, saveAllPlugins)
      }
    ],
    [
      'ctrl+b',
      () => {
        useUIStore.getState().togglePreview()
      }
    ],
    [
      'ctrl+shift+e',
      () => {
        handlers.setPluginBrowserOpen((isOpen) => !isOpen)
      }
    ],
    [
      'ctrl+n',
      () => {
        const newPlugin = createEmptyPlugin(useSettingsStore.getState().defaultAuthor)
        usePluginStore.getState().openPlugin(newPlugin)
      }
    ],
    [
      'ctrl+o',
      () => {
        void handlers.openProject()
      }
    ],
    [
      'ctrl+,',
      () => {
        handlers.setSettingsOpen(true)
      }
    ],
    [
      'f1',
      () => {
        handlers.setShortcutsOpen(true)
      }
    ],
    [
      'f5',
      () => {
        usePluginStore.getState().setPlugin({ ...currentPlugin() })
      }
    ]
  ])
  for (const [key, tab] of TAB_SHORTCUTS) {
    actions.set(key, () => {
      useUIStore.getState().setActiveTab(tab)
    })
  }
  return actions
}

// Keyboard shortcuts
function useShortcuts(handlers: ShortcutHandlers): void {
  const {
    isUndoRedoRef,
    isSavingRef,
    openProject,
    setPluginBrowserOpen,
    setSettingsOpen,
    setShortcutsOpen
  } = handlers
  useEffect(() => {
    const actions = shortcutActions({
      isUndoRedoRef,
      isSavingRef,
      openProject,
      setPluginBrowserOpen,
      setSettingsOpen,
      setShortcutsOpen
    })
    const handleKeyDown = (event: KeyboardEvent): void => {
      const shortcut = shortcutToHandle(event)
      if (!shortcut) return

      event.preventDefault()
      actions.get(shortcut.key)?.()
    }

    addEventListener('keydown', handleKeyDown)
    return () => {
      removeEventListener('keydown', handleKeyDown)
    }
  }, [
    isUndoRedoRef,
    isSavingRef,
    openProject,
    setPluginBrowserOpen,
    setSettingsOpen,
    setShortcutsOpen
  ])
}

function App(): ReactElement {
  const project = useProjectStore((s) => s.project)

  useDocumentTheme()
  useRestoreReport()

  // Guard: skip history push when the plugin change originated from undo/redo
  const isUndoRedoRef = useRef(false)
  // Guard: prevent concurrent save operations (BUG-03)
  const isSavingRef = useRef(false)

  const [projectBrowserOpen, setProjectBrowserOpen] = useState(false)
  const [pluginBrowserOpen, setPluginBrowserOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const resize = usePreviewResize()

  useHistoryRecording(isUndoRedoRef)
  useUnloadGuard()
  const { openProject, openRecentProject } = useProjectOpening()
  useShortcuts({
    isUndoRedoRef,
    isSavingRef,
    openProject,
    setPluginBrowserOpen,
    setSettingsOpen,
    setShortcutsOpen
  })
  const openProjectFromUi = () => {
    void openProject()
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="animated-bg flex h-screen flex-col">
        <TitleBar />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            onOpenProject={openProjectFromUi}
            onToggleProjectBrowser={() => {
              setProjectBrowserOpen(!projectBrowserOpen)
            }}
            projectBrowserOpen={projectBrowserOpen}
            onTogglePluginBrowser={() => {
              setPluginBrowserOpen(!pluginBrowserOpen)
            }}
            pluginBrowserOpen={pluginBrowserOpen}
            onOpenSettings={() => {
              setSettingsOpen(true)
            }}
            onOpenShortcuts={() => {
              setShortcutsOpen(true)
            }}
          />

          {pluginBrowserOpen && project && (
            <PluginBrowser
              onClose={() => {
                setPluginBrowserOpen(false)
              }}
            />
          )}

          <main className="flex flex-1 flex-col overflow-hidden">
            <MainContent
              onOpenProject={openProjectFromUi}
              onOpenRecentProject={(path) => {
                void openRecentProject(path)
              }}
              resize={resize}
            />
          </main>

          {/* Project Data Browser */}
          {projectBrowserOpen && project && (
            <ProjectBrowser
              onClose={() => {
                setProjectBrowserOpen(false)
              }}
            />
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

interface MainContentProps {
  readonly onOpenProject: () => void
  readonly onOpenRecentProject: (path: string) => void
  readonly resize: PreviewResize
}

// The welcome screen with nothing open, a hint with a project but no plugin, else the editor
function MainContent({
  onOpenProject,
  onOpenRecentProject,
  resize
}: MainContentProps): ReactElement {
  const project = useProjectStore((s) => s.project)
  const recentProjects = useProjectStore((s) => s.recentProjects)
  const openPlugins = usePluginStore((s) => s.openPlugins)

  if (!project && openPlugins.length === 0) {
    return (
      <WelcomeScreen
        onOpenProject={onOpenProject}
        onNewPlugin={() => {
          usePluginStore
            .getState()
            .openPlugin(createEmptyPlugin(useSettingsStore.getState().defaultAuthor))
        }}
        recentProjects={recentProjects}
        onOpenRecentProject={onOpenRecentProject}
      />
    )
  }
  if (openPlugins.length === 0) return <NoPluginScreen />
  return <PluginWorkspace resize={resize} />
}

// The open plugin: the editor and code preview, or the analysis view
function PluginWorkspace({ resize }: { readonly resize: PreviewResize }): ReactElement {
  const project = useProjectStore((s) => s.project)
  const activePluginId = usePluginStore((s) => s.activePluginId)
  const mainView = useUIStore((s) => s.mainView)
  const isPreviewCollapsed = useUIStore((s) => s.previewCollapsed)

  return (
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
        {project && <ViewSwitch />}

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
              <EditorTabs />
              {!isPreviewCollapsed && <PreviewPanel resize={resize} />}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}

// Switches between the editor and the analysis view
function ViewSwitch(): ReactElement {
  const mainView = useUIStore((s) => s.mainView)
  const setMainView = useUIStore((s) => s.setMainView)

  return (
    <div className="flex border-b border-border px-4 pt-2">
      <button
        type="button"
        className={cn(
          'px-3 py-1.5 text-sm font-medium transition-colors',
          mainView === 'editor'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={() => {
          setMainView('editor')
        }}
      >
        Editor
      </button>
      <button
        type="button"
        className={cn(
          'px-3 py-1.5 text-sm font-medium transition-colors',
          mainView === 'analysis'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={() => {
          setMainView('analysis')
        }}
        data-testid="main-view-analysis"
      >
        Analysis
      </button>
    </div>
  )
}

// Editor panels
function EditorTabs(): ReactElement {
  const activeTab = useUIStore((s) => s.activeTab)
  const setActiveTab = useUIStore((s) => s.setActiveTab)

  return (
    <div className="flex-1 overflow-hidden border-r border-border transition-shadow duration-300 focus-within:shadow-[inset_0_0_20px_hsl(var(--primary)/0.04)]">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const chosen = EDITOR_TABS.find((tab) => tab === value)
          if (chosen !== undefined) setActiveTab(chosen)
        }}
        className="flex h-full flex-col"
      >
        <TabsList className="mx-4 mt-4 w-fit">
          <TabsTrigger value="meta" data-testid="editor-tab-meta">
            Metadata
          </TabsTrigger>
          <TabsTrigger value="parameters" data-testid="editor-tab-parameters">
            Parameters
          </TabsTrigger>
          <TabsTrigger value="commands" data-testid="editor-tab-commands">
            Commands
          </TabsTrigger>
          <TabsTrigger value="structs">Structs</TabsTrigger>
          <TabsTrigger value="code" data-testid="editor-tab-code">
            Code
          </TabsTrigger>
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
              {activeTab === 'code' && (
                <Suspense fallback={null}>
                  <CodeEditor />
                </Suspense>
              )}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  )
}

// The resize handle and the code preview
function PreviewPanel({ resize }: { readonly resize: PreviewResize }): ReactElement {
  const { previewWidth, startResize, resizeByKey } = resize

  return (
    <>
      {/* Resize handle: its value is how far the divider sits right of its
          leftmost position, so the arrow keys move it the way they point */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Divider between editor and code preview"
        aria-orientation="horizontal"
        aria-valuenow={PREVIEW_WIDTH_MAX - previewWidth}
        aria-valuemin={0}
        aria-valuemax={PREVIEW_WIDTH_MAX - PREVIEW_WIDTH_MIN}
        aria-valuetext={`Code preview ${String(previewWidth)} pixels wide`}
        className="w-1.5 cursor-col-resize bg-border hover:bg-primary/50 focus-visible:bg-primary focus-visible:outline-none active:bg-primary"
        onMouseDown={startResize}
        onKeyDown={resizeByKey}
      />

      {/* Code preview */}
      <div
        className="overflow-hidden transition-shadow duration-300 focus-within:shadow-[inset_0_0_20px_hsl(var(--primary)/0.04)]"
        style={{ width: previewWidth }}
      >
        <Suspense fallback={null}>
          <CodePreview />
        </Suspense>
      </div>
    </>
  )
}

interface WelcomeScreenProps {
  readonly onOpenProject: () => void
  readonly onNewPlugin: () => void
  readonly recentProjects: string[]
  readonly onOpenRecentProject: (path: string) => void
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
}: WelcomeScreenProps): ReactElement {
  return (
    <div className="flex flex-1 items-center justify-center">
      <motion.div
        className="flex max-w-lg flex-col items-center gap-6 text-center"
        initial="hidden"
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

        <WelcomeActions onOpenProject={onOpenProject} onNewPlugin={onNewPlugin} />

        {recentProjects.length > 0 && (
          <RecentProjects
            recentProjects={recentProjects}
            onOpenRecentProject={onOpenRecentProject}
          />
        )}
      </motion.div>
    </div>
  )
}

// Action cards
function WelcomeActions({
  onOpenProject,
  onNewPlugin
}: Pick<WelcomeScreenProps, 'onOpenProject' | 'onNewPlugin'>): ReactElement {
  return (
    <motion.div
      variants={staggerChild}
      transition={staggerSpring}
      className="grid w-full grid-cols-2 gap-3"
    >
      <button
        type="button"
        onClick={onOpenProject}
        className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm transition-colors hover:bg-accent"
      >
        <FolderOpen className="h-6 w-6 text-primary" />
        <span className="font-medium">Open Project</span>
        <span className="text-xs text-muted-foreground">Load an existing MZ project</span>
      </button>
      <button
        type="button"
        onClick={onNewPlugin}
        className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm transition-colors hover:bg-accent"
      >
        <FilePlus className="h-6 w-6 text-primary" />
        <span className="font-medium">New Plugin</span>
        <span className="text-xs text-muted-foreground">Start with a blank plugin</span>
      </button>
    </motion.div>
  )
}

// Recent projects
function RecentProjects({
  recentProjects,
  onOpenRecentProject
}: Pick<WelcomeScreenProps, 'recentProjects' | 'onOpenRecentProject'>): ReactElement {
  return (
    <motion.div variants={staggerChild} transition={staggerSpring} className="mt-2 w-full">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">Recent Projects</h3>
      <div className="space-y-2">
        {recentProjects.slice(0, 5).map((path) => (
          <button
            type="button"
            key={path}
            onClick={() => {
              onOpenRecentProject(path)
            }}
            data-testid="recent-project"
            className="w-full truncate rounded-md border border-border bg-card px-4 py-2 text-left text-sm hover:bg-accent"
          >
            {path.split(/[/\\]/).pop()}
            <span className="block truncate text-xs text-muted-foreground">{path}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function NoPluginScreen(): ReactElement {
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
