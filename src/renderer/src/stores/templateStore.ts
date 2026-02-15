import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TemplateStoreState {
  favorites: string[] // template IDs
  recentlyUsed: { id: string; timestamp: number }[] // last 10

  toggleFavorite: (id: string) => void
  addToRecent: (id: string) => void
  isFavorite: (id: string) => boolean
  clearRecent: () => void
}

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
    {
      name: 'mz-plugin-studio-templates',
      partialize: (state) => ({
        favorites: state.favorites,
        recentlyUsed: state.recentlyUsed
      })
    }
  )
)
