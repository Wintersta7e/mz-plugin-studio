import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MZProject, MZSwitch, MZVariable, MZActor, MZItem } from '../types/mz'

interface ProjectState {
  project: MZProject | null
  recentProjects: string[]
  isLoading: boolean
  error: string | null
  switches: MZSwitch[]
  variables: MZVariable[]
  actors: MZActor[]
  items: MZItem[]

  setProject: (project: MZProject | null) => void
  addRecentProject: (path: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSwitches: (switches: MZSwitch[]) => void
  setVariables: (variables: MZVariable[]) => void
  setActors: (actors: MZActor[]) => void
  setItems: (items: MZItem[]) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      project: null,
      recentProjects: [],
      isLoading: false,
      error: null,
      switches: [],
      variables: [],
      actors: [],
      items: [],

      setProject: (project) => set({ project, error: null }),
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
      clearProject: () =>
        set({
          project: null,
          switches: [],
          variables: [],
          actors: [],
          items: [],
          error: null
        })
    }),
    {
      name: 'mz-plugin-studio-project',
      partialize: (state) => ({ recentProjects: state.recentProjects })
    }
  )
)
