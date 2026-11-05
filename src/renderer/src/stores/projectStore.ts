import log from 'electron-log/renderer'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { checkArrayOf, checkString, definePersist, type MigrationStep } from './persist'
import type {
  MZProject,
  MZSwitch,
  MZVariable,
  MZActor,
  MZItem,
  MZSkill,
  MZWeapon,
  MZArmor,
  MZEnemy,
  MZState,
  MZAnimation,
  MZTileset,
  MZCommonEvent,
  MZClass,
  MZTroop
} from '../types/mz'
import { validateDependencies, type DependencyReport } from '../lib/dependency-analyzer'
import { detectConflicts, type ConflictReport } from '../lib/conflict-detector'
import mzClasses from '../data/mz-classes.json'

interface ProjectState {
  project: MZProject | null
  recentProjects: string[]
  isLoading: boolean
  error: string | null
  switches: MZSwitch[]
  variables: MZVariable[]
  actors: MZActor[]
  items: MZItem[]
  skills: MZSkill[]
  weapons: MZWeapon[]
  armors: MZArmor[]
  enemies: MZEnemy[]
  states: MZState[]
  animations: MZAnimation[]
  tilesets: MZTileset[]
  commonEvents: MZCommonEvent[]
  classes: MZClass[]
  troops: MZTroop[]
  dependencyReport: DependencyReport | null
  conflictReport: ConflictReport | null
  isScanning: boolean

  setProject: (project: MZProject | null) => void
  addRecentProject: (path: string) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  setSwitches: (switches: MZSwitch[]) => void
  setVariables: (variables: MZVariable[]) => void
  setActors: (actors: MZActor[]) => void
  setItems: (items: MZItem[]) => void
  setSkills: (skills: MZSkill[]) => void
  setWeapons: (weapons: MZWeapon[]) => void
  setArmors: (armors: MZArmor[]) => void
  setEnemies: (enemies: MZEnemy[]) => void
  setStates: (states: MZState[]) => void
  setAnimations: (animations: MZAnimation[]) => void
  setTilesets: (tilesets: MZTileset[]) => void
  setCommonEvents: (commonEvents: MZCommonEvent[]) => void
  setClasses: (classes: MZClass[]) => void
  setTroops: (troops: MZTroop[]) => void
  /**
  Batch-set all game data in a single store update (avoids 14 re-renders)
  */
  setAllGameData: (data: GameData) => void
  clearProject: () => void
  scanDependencies: () => Promise<void>
  clearDependencyReport: () => void
}

type GameData = Pick<
  ProjectState,
  | 'switches'
  | 'variables'
  | 'actors'
  | 'items'
  | 'skills'
  | 'weapons'
  | 'armors'
  | 'enemies'
  | 'states'
  | 'animations'
  | 'tilesets'
  | 'commonEvents'
  | 'classes'
  | 'troops'
>

// A project's game data before one is loaded: every list empty, fresh on each call
const noGameData = (): GameData => ({
  switches: [],
  variables: [],
  actors: [],
  items: [],
  skills: [],
  weapons: [],
  armors: [],
  enemies: [],
  states: [],
  animations: [],
  tilesets: [],
  commonEvents: [],
  classes: [],
  troops: []
})

const PROJECT_MIGRATIONS: readonly MigrationStep[] = [(state) => state]

const PROJECT_PERSIST = definePersist<ProjectState, Pick<ProjectState, 'recentProjects'>>({
  name: 'mz-plugin-studio-project',
  area: 'Recent projects',
  migrations: PROJECT_MIGRATIONS,
  fields: { recentProjects: checkArrayOf(checkString) },
  labels: { recentProjects: { all: 'recent projects', one: 'recent project' } },
  partialize: (state) => ({ recentProjects: state.recentProjects })
})

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      project: null,
      recentProjects: [],
      isLoading: false,
      error: null,
      ...noGameData(),
      dependencyReport: null,
      conflictReport: null,
      isScanning: false,

      setProject: (project) => {
        set({ project, error: null })
        if (!project) {
          set({ dependencyReport: null, conflictReport: null })
        }
      },
      addRecentProject: (path) =>
        set((state) => ({
          recentProjects: [path, ...state.recentProjects.filter((p) => p !== path)].slice(0, 10)
        })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setSwitches: (switches) => set({ switches }),
      setVariables: (variables) => set({ variables }),
      setActors: (actors) => set({ actors }),
      setItems: (items) => set({ items }),
      setSkills: (skills) => set({ skills }),
      setWeapons: (weapons) => set({ weapons }),
      setArmors: (armors) => set({ armors }),
      setEnemies: (enemies) => set({ enemies }),
      setStates: (states) => set({ states }),
      setAnimations: (animations) => set({ animations }),
      setTilesets: (tilesets) => set({ tilesets }),
      setCommonEvents: (commonEvents) => set({ commonEvents }),
      setClasses: (classes) => set({ classes }),
      setTroops: (troops) => set({ troops }),
      setAllGameData: (data) => set(data),
      clearProject: () =>
        set({
          project: null,
          ...noGameData(),
          dependencyReport: null,
          conflictReport: null,
          isScanning: false,
          error: null
        }),
      scanDependencies: async () => {
        const { project, isScanning } = get()
        if (!project || isScanning) return

        set({ isScanning: true })
        try {
          const headers = await globalThis.api.plugin.scanHeaders(project.path)
          const report = validateDependencies(headers)
          const conflicts = detectConflicts(headers, mzClasses)
          set({ dependencyReport: report, conflictReport: conflicts, isScanning: false })
        } catch (error) {
          log.error('Dependency scan failed:', error)
          set({ isScanning: false })
        }
      },
      clearDependencyReport: () => set({ dependencyReport: null, conflictReport: null })
    }),
    PROJECT_PERSIST
  )
)
