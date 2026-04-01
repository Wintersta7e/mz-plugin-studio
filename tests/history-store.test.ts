// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useHistoryStore } from '../src/renderer/src/stores/historyStore'
import { usePluginStore } from '../src/renderer/src/stores/pluginStore'
import { createEmptyPlugin } from '../src/renderer/src/types/plugin'

function resetStores() {
  localStorage.clear()
  useHistoryStore.setState(useHistoryStore.getInitialState(), true)
  usePluginStore.setState(usePluginStore.getInitialState(), true)
}

function createPlugin(name: string) {
  const plugin = createEmptyPlugin()
  plugin.meta.name = name
  return plugin
}

describe('historyStore', () => {
  beforeEach(() => {
    resetStores()
  })

  describe('push', () => {
    it('adds an entry to past and sets activePluginId', () => {
      const plugin = createPlugin('Alpha')
      useHistoryStore.getState().push(plugin)

      expect(useHistoryStore.getState().past).toHaveLength(1)
      expect(useHistoryStore.getState().past[0].plugin.id).toBe(plugin.id)
      expect(useHistoryStore.getState().past[0].plugin.meta.name).toBe(plugin.meta.name)
      expect(useHistoryStore.getState().activePluginId).toBe(plugin.id)
    })

    it('clears future on push', () => {
      const pluginA = createPlugin('Alpha')
      const pluginB = createPlugin('Alpha')
      pluginB.id = pluginA.id
      pluginB.meta.description = 'changed'

      // Set up a future entry via undo
      useHistoryStore.getState().push(pluginA)
      usePluginStore.getState().openPlugin(pluginA)
      useHistoryStore.getState().undo()
      expect(useHistoryStore.getState().future).toHaveLength(1)

      // Push should clear future
      useHistoryStore.getState().push(pluginB)
      expect(useHistoryStore.getState().future).toHaveLength(0)
    })

    it('skips duplicate consecutive pushes with identical fingerprints', () => {
      const plugin = createPlugin('Alpha')
      useHistoryStore.getState().push(plugin)
      useHistoryStore.getState().push(plugin)

      expect(useHistoryStore.getState().past).toHaveLength(1)
    })

    it('allows pushes with different fingerprints', () => {
      const pluginA = createPlugin('Alpha')
      const pluginB = createPlugin('Alpha')
      pluginB.id = pluginA.id
      pluginB.meta.description = 'different description'

      useHistoryStore.getState().push(pluginA)
      useHistoryStore.getState().push(pluginB)

      expect(useHistoryStore.getState().past).toHaveLength(2)
    })

    it('auto-clears history when plugin.id changes without explicit setActivePluginId', () => {
      const pluginA = createPlugin('Alpha')
      const pluginB = createPlugin('Beta')

      useHistoryStore.getState().push(pluginA)
      useHistoryStore.getState().push(pluginA) // dedup, still 1
      expect(useHistoryStore.getState().past).toHaveLength(1)

      // Push a different plugin — should clear old history and start fresh
      useHistoryStore.getState().push(pluginB)
      expect(useHistoryStore.getState().past).toHaveLength(1)
      expect(useHistoryStore.getState().past[0].plugin.id).toBe(pluginB.id)
      expect(useHistoryStore.getState().future).toHaveLength(0)
      expect(useHistoryStore.getState().activePluginId).toBe(pluginB.id)
    })
  })

  describe('undo', () => {
    it('returns the previous plugin and pushes current to future', () => {
      const pluginV1 = createPlugin('Alpha')
      const pluginV2 = createPlugin('Alpha')
      pluginV2.id = pluginV1.id
      pluginV2.meta.description = 'v2'

      useHistoryStore.getState().push(pluginV1)
      useHistoryStore.getState().push(pluginV2)

      // Set pluginV2 as current in pluginStore so undo captures it
      usePluginStore.getState().openPlugin(pluginV2)

      const result = useHistoryStore.getState().undo()
      expect(result?.id).toBe(pluginV2.id) // last entry in past (rawSource stripped)
      expect(result?.meta?.description).toBe('v2')
      expect(useHistoryStore.getState().past).toHaveLength(1)
      expect(useHistoryStore.getState().future).toHaveLength(1)
      expect(useHistoryStore.getState().future[0].plugin.id).toBe(pluginV2.id)
    })

    it('returns null when past is empty', () => {
      const result = useHistoryStore.getState().undo()
      expect(result).toBeNull()
    })

    it('allows multiple undo operations', () => {
      const sharedId = createPlugin('Alpha').id
      const plugins = Array.from({ length: 3 }, (_, i) => {
        const p = createPlugin('Alpha')
        p.id = sharedId
        // Use varying-length descriptions so fingerprints differ
        p.meta.description = 'x'.repeat(i + 1)
        return p
      })

      for (const p of plugins) {
        useHistoryStore.getState().push(p)
      }
      usePluginStore.getState().openPlugin(plugins[2])

      expect(useHistoryStore.getState().past).toHaveLength(3)

      useHistoryStore.getState().undo()
      expect(useHistoryStore.getState().past).toHaveLength(2)
      expect(useHistoryStore.getState().future).toHaveLength(1)

      useHistoryStore.getState().undo()
      expect(useHistoryStore.getState().past).toHaveLength(1)
      expect(useHistoryStore.getState().future).toHaveLength(2)
    })
  })

  describe('redo', () => {
    it('returns the next plugin from future and pushes current to past', () => {
      const pluginV1 = createPlugin('Alpha')
      const pluginV2 = createPlugin('Alpha')
      pluginV2.id = pluginV1.id
      pluginV2.meta.description = 'v2'

      useHistoryStore.getState().push(pluginV1)
      useHistoryStore.getState().push(pluginV2)
      usePluginStore.getState().openPlugin(pluginV2)

      // Undo first to populate future
      useHistoryStore.getState().undo()

      // Now redo
      const result = useHistoryStore.getState().redo()
      expect(result).not.toBeNull()
      expect(result!.id).toBe(pluginV2.id)
      expect(useHistoryStore.getState().future).toHaveLength(0)
      expect(useHistoryStore.getState().past).toHaveLength(2)
    })

    it('returns null when future is empty', () => {
      const result = useHistoryStore.getState().redo()
      expect(result).toBeNull()
    })
  })

  describe('clear', () => {
    it('empties both past and future', () => {
      const plugin = createPlugin('Alpha')
      useHistoryStore.getState().push(plugin)
      usePluginStore.getState().openPlugin(plugin)
      useHistoryStore.getState().undo()

      expect(
        useHistoryStore.getState().past.length + useHistoryStore.getState().future.length
      ).toBeGreaterThan(0)

      useHistoryStore.getState().clear()

      expect(useHistoryStore.getState().past).toHaveLength(0)
      expect(useHistoryStore.getState().future).toHaveLength(0)
    })
  })

  describe('canUndo / canRedo', () => {
    it('returns false when history is empty', () => {
      expect(useHistoryStore.getState().canUndo()).toBe(false)
      expect(useHistoryStore.getState().canRedo()).toBe(false)
    })

    it('returns true for canUndo after push', () => {
      const plugin = createPlugin('Alpha')
      useHistoryStore.getState().push(plugin)

      expect(useHistoryStore.getState().canUndo()).toBe(true)
      expect(useHistoryStore.getState().canRedo()).toBe(false)
    })

    it('returns true for canRedo after undo', () => {
      const plugin = createPlugin('Alpha')
      useHistoryStore.getState().push(plugin)
      usePluginStore.getState().openPlugin(plugin)
      useHistoryStore.getState().undo()

      expect(useHistoryStore.getState().canUndo()).toBe(false)
      expect(useHistoryStore.getState().canRedo()).toBe(true)
    })
  })

  describe('setActivePluginId', () => {
    it('clears history when switching to a different plugin id', () => {
      const pluginA = createPlugin('Alpha')
      const pluginB = createPlugin('Beta')

      useHistoryStore.getState().push(pluginA)
      usePluginStore.getState().openPlugin(pluginA)
      useHistoryStore.getState().undo()

      expect(
        useHistoryStore.getState().past.length + useHistoryStore.getState().future.length
      ).toBeGreaterThan(0)

      useHistoryStore.getState().setActivePluginId(pluginB.id)

      expect(useHistoryStore.getState().past).toHaveLength(0)
      expect(useHistoryStore.getState().future).toHaveLength(0)
      expect(useHistoryStore.getState().activePluginId).toBe(pluginB.id)
    })

    it('does not clear history when called with the same id', () => {
      const plugin = createPlugin('Alpha')

      useHistoryStore.getState().push(plugin)
      const pastBefore = useHistoryStore.getState().past.length

      useHistoryStore.getState().setActivePluginId(plugin.id)

      expect(useHistoryStore.getState().past).toHaveLength(pastBefore)
    })

    it('clears history when switching to null', () => {
      const plugin = createPlugin('Alpha')
      useHistoryStore.getState().push(plugin)

      useHistoryStore.getState().setActivePluginId(null)

      expect(useHistoryStore.getState().past).toHaveLength(0)
      expect(useHistoryStore.getState().future).toHaveLength(0)
      expect(useHistoryStore.getState().activePluginId).toBeNull()
    })
  })

  describe('history cap', () => {
    it('after 51 pushes should have exactly 50 entries', () => {
      const baseId = createPlugin('Base').id

      for (let i = 0; i < 51; i++) {
        const plugin = createPlugin(`Plugin`)
        plugin.id = baseId
        // Vary parameters length to ensure unique fingerprints
        plugin.parameters = Array.from({ length: i }, () => ({
          name: `param${i}`,
          type: 'string' as const,
          text: '',
          desc: '',
          default: '',
          id: `p-${i}`
        }))
        useHistoryStore.getState().push(plugin)
      }

      expect(useHistoryStore.getState().past).toHaveLength(50)
      // The oldest entry should have been dropped (the one with 0 params)
      expect(useHistoryStore.getState().past[0].plugin.parameters.length).toBe(1)
    })
  })

  describe('undo/redo round-trip', () => {
    it('can undo and redo back to the same state', () => {
      const pluginV1 = createPlugin('Alpha')
      const pluginV2 = createPlugin('Alpha')
      pluginV2.id = pluginV1.id
      pluginV2.meta.description = 'updated'

      useHistoryStore.getState().push(pluginV1)
      useHistoryStore.getState().push(pluginV2)
      usePluginStore.getState().openPlugin(pluginV2)

      // Undo back to v1
      const undone = useHistoryStore.getState().undo()
      expect(undone?.meta.description).toBe('updated')

      // Redo forward
      const redone = useHistoryStore.getState().redo()
      expect(redone).not.toBeNull()
      expect(redone?.meta?.description).toBe('updated')
    })
  })
})

// COV-21: pluginFingerprint - fingerprint dedup behavior
describe('pluginFingerprint dedup behavior', () => {
  beforeEach(() => {
    resetStores()
  })

  it('two plugins with same meta/params/commands but different customCode LENGTH share same fingerprint', () => {
    // The fingerprint uses code LENGTH (customCode?.length), not content.
    // Two plugins with different code content but same length → same fingerprint → dedup fires.
    const baseId = createPlugin('A').id
    const pluginA = createPlugin('A')
    pluginA.id = baseId
    pluginA.customCode = 'abc' // length 3

    const pluginB = createPlugin('A')
    pluginB.id = baseId
    pluginB.customCode = 'xyz' // length 3, same as abc — same fingerprint!

    useHistoryStore.getState().push(pluginA)
    useHistoryStore.getState().push(pluginB)

    // Same fingerprint → deduplication fires → only one entry
    expect(useHistoryStore.getState().past).toHaveLength(1)
  })

  it('two plugins with different customCode length have different fingerprints and both are pushed', () => {
    const baseId = createPlugin('A').id
    const pluginA = createPlugin('A')
    pluginA.id = baseId
    pluginA.customCode = 'ab' // length 2

    const pluginB = createPlugin('A')
    pluginB.id = baseId
    pluginB.customCode = 'abc' // length 3 — different fingerprint!

    useHistoryStore.getState().push(pluginA)
    useHistoryStore.getState().push(pluginB)

    expect(useHistoryStore.getState().past).toHaveLength(2)
  })

  it('rawSource is stripped from history entries (not stored)', () => {
    const plugin = createPlugin('Alpha')
    plugin.rawSource = 'large raw source string that should not be stored'

    useHistoryStore.getState().push(plugin)

    const entry = useHistoryStore.getState().past[0]
    expect(entry.plugin.rawSource).toBeUndefined()
  })
})
