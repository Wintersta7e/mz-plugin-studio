import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  MZProject, MZSwitch, MZVariable, MZActor, MZItem,
  MZSkill, MZWeapon, MZArmor, MZEnemy, MZState,
  MZAnimation, MZTileset, MZCommonEvent, MZClass, MZTroop
} from '../types/mz'
import type { DependencyReport } from '../lib/dependency-analyzer'
import { validateDependencies } from '../lib/dependency-analyzer'
import type { ConflictReport } from '../lib/conflict-detector'
import { detectConflicts } from '../lib/conflict-detector'
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
  setLoading: (loading: boolean) => void
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
  clearProject: () => void
  scanDependencies: () => Promise<void>
  clearDependencyReport: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      project: null,
      recentProjects: [],
      isLoading: false,
      error: null,
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
      troops: [],
      dependencyReport: null,
      conflictReport: null,
      isScanning: false,

      setProject: (project) => {
        set({ project, error: null })
        // Auto-scan dependencies when project is loaded
        if (project) {
          setTimeout(() => get().scanDependencies(), 0)
        } else {
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
      clearProject: () =>
        set({
          project: null,
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
          troops: [],
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
          const headers = await window.api.plugin.scanHeaders(project.path)
          const report = validateDependencies(headers)
          const conflicts = detectConflicts(headers, mzClasses as Record<string, { popularity?: number }>)
          set({ dependencyReport: report, conflictReport: conflicts, isScanning: false })
        } catch (error) {
          console.error('Dependency scan failed:', error)
          set({ isScanning: false })
        }
      },
      clearDependencyReport: () => set({ dependencyReport: null, conflictReport: null })
    }),
    {
      name: 'mz-plugin-studio-project',
      partialize: (state) => ({ recentProjects: state.recentProjects })
    }
  )
)
