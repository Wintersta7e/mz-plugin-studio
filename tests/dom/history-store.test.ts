import { beforeEach, describe, expect, it } from 'vitest'
import { useHistoryStore } from '../../src/renderer/src/stores/historyStore'
import { usePluginStore } from '../../src/renderer/src/stores/pluginStore'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'

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

/** One undo step, its result shown as the app shows it. */
function undoShown() {
  const result = useHistoryStore.getState().undo()
  if (result) usePluginStore.getState().setPlugin(result)
  return result
}

/** One redo step, its result shown as the app shows it. */
function redoShown() {
  const result = useHistoryStore.getState().redo()
  if (result) usePluginStore.getState().setPlugin(result)
  return result
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
      useHistoryStore.getState().push(pluginB)
      usePluginStore.getState().openPlugin(pluginB)
      undoShown()
      expect(useHistoryStore.getState().future).toHaveLength(1)

      // Push should clear future
      useHistoryStore.getState().push(pluginB)
      expect(useHistoryStore.getState().future).toHaveLength(0)
    })

    it('skips duplicate consecutive pushes of the same state', () => {
      const plugin = createPlugin('Alpha')
      useHistoryStore.getState().push(plugin)
      useHistoryStore.getState().push(plugin)

      expect(useHistoryStore.getState().past).toHaveLength(1)
    })

    it('allows pushes of different states', () => {
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
    it('returns the state before the one shown and moves the shown state to future', () => {
      const pluginV1 = createPlugin('Alpha')
      const pluginV2 = createPlugin('Alpha')
      pluginV2.id = pluginV1.id
      pluginV2.meta.description = 'v2'

      useHistoryStore.getState().push(pluginV1)
      useHistoryStore.getState().push(pluginV2)

      // Set pluginV2 as current in pluginStore so undo captures it
      usePluginStore.getState().openPlugin(pluginV2)

      const result = useHistoryStore.getState().undo()
      expect(result?.id).toBe(pluginV1.id)
      expect(result?.meta?.description).toBe('')
      expect(useHistoryStore.getState().past).toHaveLength(1)
      expect(useHistoryStore.getState().future).toHaveLength(1)
      expect(useHistoryStore.getState().future[0].plugin.meta.description).toBe('v2')
    })

    it('returns the newest entry when the state shown is not recorded yet', () => {
      const pluginV1 = createPlugin('Alpha')
      const pluginV2 = { ...pluginV1, meta: { ...pluginV1.meta, description: 'v2' } }

      useHistoryStore.getState().push(pluginV1)
      usePluginStore.getState().openPlugin(pluginV2)

      expect(useHistoryStore.getState().undo()?.meta.description).toBe('')
      expect(useHistoryStore.getState().past).toHaveLength(1)
      expect(useHistoryStore.getState().future[0].plugin.meta.description).toBe('v2')
    })

    it('returns null when past is empty', () => {
      const result = useHistoryStore.getState().undo()
      expect(result).toBeNull()
    })

    it('returns null and changes nothing when past holds only the state shown', () => {
      const plugin = createPlugin('Alpha')
      useHistoryStore.getState().push(plugin)
      usePluginStore.getState().openPlugin(plugin)

      expect(useHistoryStore.getState().undo()).toBeNull()
      expect(useHistoryStore.getState().past).toHaveLength(1)
      expect(useHistoryStore.getState().future).toHaveLength(0)
    })

    it('allows multiple undo operations', () => {
      const sharedId = createPlugin('Alpha').id
      const plugins = Array.from({ length: 3 }, (_, i) => {
        const p = createPlugin('Alpha')
        p.id = sharedId
        // A different description each time, so no push is skipped
        p.meta.description = 'x'.repeat(i + 1)
        return p
      })

      for (const p of plugins) {
        useHistoryStore.getState().push(p)
      }
      usePluginStore.getState().openPlugin(plugins[2])

      expect(useHistoryStore.getState().past).toHaveLength(3)

      expect(undoShown()?.meta.description).toBe('xx')
      expect(useHistoryStore.getState().past).toHaveLength(2)
      expect(useHistoryStore.getState().future).toHaveLength(1)

      expect(undoShown()?.meta.description).toBe('x')
      expect(useHistoryStore.getState().past).toHaveLength(1)
      expect(useHistoryStore.getState().future).toHaveLength(2)
    })
  })

  describe('redo', () => {
    it('returns the next plugin from future and records it as the state shown', () => {
      const pluginV1 = createPlugin('Alpha')
      const pluginV2 = createPlugin('Alpha')
      pluginV2.id = pluginV1.id
      pluginV2.meta.description = 'v2'

      useHistoryStore.getState().push(pluginV1)
      useHistoryStore.getState().push(pluginV2)
      usePluginStore.getState().openPlugin(pluginV2)

      // Undo first to populate future
      undoShown()

      // Now redo
      const result = redoShown()
      expect(result?.meta.description).toBe('v2')
      expect(useHistoryStore.getState().future).toHaveLength(0)
      expect(useHistoryStore.getState().past).toHaveLength(2)
      expect(undoShown()?.meta.description).toBe('')
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
        // A different parameter count each time, so no push is skipped
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
      const undone = undoShown()
      expect(undone?.meta.description).toBe('')

      // Redo forward
      const redone = redoShown()
      expect(redone?.meta?.description).toBe('updated')
    })
  })
})

// A push of the state recorded last is skipped; any other state is its own step
describe('duplicate pushes', () => {
  beforeEach(() => {
    resetStores()
  })

  it('two custom-code edits of the same length are two undo steps', () => {
    const states = ['', 'abc', 'xyz'].map((customCode) => ({ ...createPlugin('A'), customCode }))
    for (const state of states) state.id = states[0].id
    for (const state of states) useHistoryStore.getState().push(state)
    usePluginStore.getState().openPlugin(states[2])

    expect(useHistoryStore.getState().past).toHaveLength(3)
    expect(undoShown()?.customCode).toBe('abc')
    expect(undoShown()?.customCode).toBe('')
  })

  it('an edit to any field of a parameter or command is its own undo step', () => {
    const base = createPlugin('A')
    base.parameters = [
      { id: 'p', name: 'speed', text: 'Speed', desc: '', type: 'number', default: 1 }
    ]
    base.commands = [{ id: 'c', name: 'run', text: 'Run', desc: '', args: [] }]
    const edits = [
      { ...base, parameters: [{ ...base.parameters[0], text: 'Pace' }] },
      { ...base, parameters: [{ ...base.parameters[0], min: 0 }] },
      { ...base, commands: [{ ...base.commands[0], text: 'Go' }] }
    ]
    for (const edit of edits) {
      resetStores()
      useHistoryStore.getState().push(base)
      useHistoryStore.getState().push(edit)
      expect(useHistoryStore.getState().past).toHaveLength(2)
    }
  })

  it('rawSource is stripped from history entries (not stored)', () => {
    const plugin = createPlugin('Alpha')
    plugin.rawSource = 'large raw source string that should not be stored'

    useHistoryStore.getState().push(plugin)

    const entry = useHistoryStore.getState().past[0]
    expect(entry.plugin.rawSource).toBeUndefined()
  })
})
