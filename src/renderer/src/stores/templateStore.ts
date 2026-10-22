import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { checkArrayOf, checkString, definePersist, isRecord } from './persist'
import type { FieldCheck, MigrationStep } from './persist'

interface TemplateStoreState {
  favorites: string[] // template IDs
  recentlyUsed: { id: string; timestamp: number }[] // last 10

  toggleFavorite: (id: string) => void
  addToRecent: (id: string) => void
  isFavorite: (id: string) => boolean
  clearRecent: () => void
}

type RecentTemplate = TemplateStoreState['recentlyUsed'][number]

const checkRecent: FieldCheck<RecentTemplate> = (value) =>
  isRecord(value) && typeof value.id === 'string' && typeof value.timestamp === 'number'
    ? { id: value.id, timestamp: value.timestamp }
    : undefined

const TEMPLATE_MIGRATIONS: readonly MigrationStep[] = [(state) => state]

export const useTemplateStore = create<TemplateStoreState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recentlyUsed: [],

      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((f) => f !== id)
            : [...state.favorites, id]
        })),

      addToRecent: (id) =>
        set((state) => ({
          recentlyUsed: [
            { id, timestamp: Date.now() },
            ...state.recentlyUsed.filter((r) => r.id !== id)
          ].slice(0, 10)
        })),

      isFavorite: (id) => get().favorites.includes(id),
      clearRecent: () => set({ recentlyUsed: [] })
    }),
    definePersist<TemplateStoreState, Pick<TemplateStoreState, 'favorites' | 'recentlyUsed'>>({
      name: 'mz-plugin-studio-templates',
      area: 'Template favorites',
      migrations: TEMPLATE_MIGRATIONS,
      fields: {
        favorites: checkArrayOf(checkString),
        recentlyUsed: checkArrayOf(checkRecent)
      },
      labels: {
        favorites: { all: 'favorite templates', one: 'favorite template' },
        recentlyUsed: { all: 'recently used templates', one: 'recently used template' }
      },
      partialize: (state) => ({
        favorites: state.favorites,
        recentlyUsed: state.recentlyUsed
      })
    })
  )
)
