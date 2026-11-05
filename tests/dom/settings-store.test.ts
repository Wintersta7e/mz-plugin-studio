import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from '../../src/renderer/src/stores/settingsStore'
import type { PluginParameter } from '../../src/renderer/src/types/plugin'

function resetSettingsStore() {
  localStorage.clear()
  useSettingsStore.setState(useSettingsStore.getInitialState(), true)
}

function makeParam(overrides: Partial<PluginParameter> = {}): PluginParameter {
  return {
    id: 'p1',
    name: 'TestParam',
    text: 'Test Parameter',
    desc: 'A test parameter',
    type: 'string',
    default: 'hello',
    ...overrides
  }
}

function first<T>(values: readonly T[]): T {
  const value = values.at(0)
  if (value === undefined) throw new Error('expected an item')
  return value
}

function preset(name: string): PluginParameter[] {
  const value = new Map(Object.entries(useSettingsStore.getState().parameterPresets)).get(name)
  if (value === undefined) throw new Error(`missing preset: ${name}`)
  return value
}

describe('settingsStore: presets', () => {
  beforeEach(() => {
    resetSettingsStore()
  })

  describe('savePreset', () => {
    it('saves a preset with the trimmed name', () => {
      const params = [makeParam()]
      useSettingsStore.getState().savePreset('  My Preset  ', params)

      const presets = useSettingsStore.getState().parameterPresets

      expect(presets).toHaveProperty('My Preset')
      expect(presets['My Preset']).toHaveLength(1)
      expect(first(preset('My Preset')).name).toBe('TestParam')
    })

    it('no-ops when name is empty or whitespace-only', () => {
      const params = [makeParam()]
      useSettingsStore.getState().savePreset('', params)
      useSettingsStore.getState().savePreset(' '.repeat(3), params)

      expect(useSettingsStore.getState().parameterPresets).toStrictEqual({})
    })

    it('no-ops when params array is empty', () => {
      useSettingsStore.getState().savePreset('Empty Preset', [])

      expect(useSettingsStore.getState().parameterPresets).toStrictEqual({})
    })

    it('overwrites an existing preset with the same name', () => {
      useSettingsStore.getState().savePreset('Preset', [makeParam({ name: 'First' })])
      useSettingsStore.getState().savePreset('Preset', [makeParam({ name: 'Second' })])

      expect(preset('Preset')).toHaveLength(1)
      expect(first(preset('Preset')).name).toBe('Second')
    })
  })

  describe('deletePreset', () => {
    it('removes a saved preset by name', () => {
      useSettingsStore.getState().savePreset('ToDelete', [makeParam()])

      expect(useSettingsStore.getState().parameterPresets).toHaveProperty('ToDelete')

      useSettingsStore.getState().deletePreset('ToDelete')

      expect(useSettingsStore.getState().parameterPresets).not.toHaveProperty('ToDelete')
    })

    it('does not affect other presets when deleting one', () => {
      useSettingsStore.getState().savePreset('Keep', [makeParam({ name: 'Keep' })])
      useSettingsStore.getState().savePreset('Remove', [makeParam({ name: 'Remove' })])

      useSettingsStore.getState().deletePreset('Remove')

      expect(useSettingsStore.getState().parameterPresets).toHaveProperty('Keep')
      expect(useSettingsStore.getState().parameterPresets).not.toHaveProperty('Remove')
    })
  })

  describe('clearAllPresets', () => {
    it('removes all saved presets', () => {
      useSettingsStore.getState().savePreset('A', [makeParam()])
      useSettingsStore.getState().savePreset('B', [makeParam()])
      useSettingsStore.getState().savePreset('C', [makeParam()])

      useSettingsStore.getState().clearAllPresets()

      expect(useSettingsStore.getState().parameterPresets).toStrictEqual({})
    })
  })
})

describe('settingsStore: editor font size', () => {
  beforeEach(resetSettingsStore)

  describe('setEditorFontSize', () => {
    it('sets font size within valid range', () => {
      useSettingsStore.getState().setEditorFontSize(16)

      expect(useSettingsStore.getState().editorFontSize).toBe(16)
    })

    it('clamps font size to minimum of 10', () => {
      useSettingsStore.getState().setEditorFontSize(5)

      expect(useSettingsStore.getState().editorFontSize).toBe(10)
    })

    it('clamps font size to maximum of 24', () => {
      useSettingsStore.getState().setEditorFontSize(30)

      expect(useSettingsStore.getState().editorFontSize).toBe(24)
    })

    it('clamps NaN font size to minimum', () => {
      useSettingsStore.getState().setEditorFontSize(NaN)

      expect(useSettingsStore.getState().editorFontSize).toBe(10)
    })

    it('accepts boundary values 10 and 24', () => {
      useSettingsStore.getState().setEditorFontSize(10)

      expect(useSettingsStore.getState().editorFontSize).toBe(10)

      useSettingsStore.getState().setEditorFontSize(24)

      expect(useSettingsStore.getState().editorFontSize).toBe(24)
    })
  })

  describe('preset isolation (structuredClone)', () => {
    it('mutating original params after saving does not affect the stored preset', () => {
      const params = [makeParam({ name: 'Original', default: 'before' })]
      useSettingsStore.getState().savePreset('Isolated', params)

      // Mutate the original array and object
      first(params).name = 'Mutated'
      first(params).default = 'after'
      params.push(makeParam({ name: 'Extra' }))

      const stored = preset('Isolated')

      expect(stored).toHaveLength(1)
      expect(first(preset('Isolated')).name).toBe('Original')
      expect(first(preset('Isolated')).default).toBe('before')
    })
  })
})

// COV-19: resetEditorSettings and individual setters
describe('settingsStore - COV-19', () => {
  beforeEach(resetSettingsStore)

  describe('resetEditorSettings', () => {
    it('resets theme, fontSize, wordWrap, minimap, lineNumbers, debugLogging to defaults', () => {
      useSettingsStore.getState().setTheme('light')
      useSettingsStore.getState().setEditorFontSize(20)
      useSettingsStore.getState().setEditorWordWrap(false)
      useSettingsStore.getState().setEditorMinimap(true)
      useSettingsStore.getState().setEditorLineNumbers(false)
      useSettingsStore.setState({ debugLogging: true })

      useSettingsStore.getState().resetEditorSettings()

      const state = useSettingsStore.getState()

      expect({
        theme: state.theme,
        fontSize: state.editorFontSize,
        wordWrap: state.editorWordWrap,
        minimap: state.editorMinimap,
        lineNumbers: state.editorLineNumbers,
        debugLogging: state.debugLogging
      }).toStrictEqual({
        theme: 'dark',
        fontSize: 13,
        wordWrap: true,
        minimap: false,
        lineNumbers: true,
        debugLogging: false
      })
    })

    it('preserves parameterPresets after resetEditorSettings', () => {
      const param: PluginParameter = {
        id: 'p1',
        name: 'TestParam',
        text: 'Test Parameter',
        desc: '',
        type: 'string',
        default: 'hello'
      }
      useSettingsStore.getState().savePreset('Keeper', [param])
      useSettingsStore.getState().resetEditorSettings()

      expect(useSettingsStore.getState().parameterPresets).toHaveProperty('Keeper')
    })

    it('preserves defaultAuthor after resetEditorSettings', () => {
      useSettingsStore.getState().setDefaultAuthor('KeepMe')
      useSettingsStore.getState().resetEditorSettings()

      // resetEditorSettings does not reset defaultAuthor
      expect(useSettingsStore.getState().defaultAuthor).toBe('KeepMe')
    })
  })

  describe('individual setters', () => {
    it('setTheme toggles between dark and light', () => {
      useSettingsStore.getState().setTheme('light')

      expect(useSettingsStore.getState().theme).toBe('light')

      useSettingsStore.getState().setTheme('dark')

      expect(useSettingsStore.getState().theme).toBe('dark')
    })

    it('setEditorWordWrap sets word wrap', () => {
      useSettingsStore.getState().setEditorWordWrap(false)

      expect(useSettingsStore.getState().editorWordWrap).toBe(false)

      useSettingsStore.getState().setEditorWordWrap(true)

      expect(useSettingsStore.getState().editorWordWrap).toBe(true)
    })

    it('setEditorMinimap sets minimap visibility', () => {
      useSettingsStore.getState().setEditorMinimap(true)

      expect(useSettingsStore.getState().editorMinimap).toBe(true)

      useSettingsStore.getState().setEditorMinimap(false)

      expect(useSettingsStore.getState().editorMinimap).toBe(false)
    })

    it('setEditorLineNumbers sets line number visibility', () => {
      useSettingsStore.getState().setEditorLineNumbers(false)

      expect(useSettingsStore.getState().editorLineNumbers).toBe(false)

      useSettingsStore.getState().setEditorLineNumbers(true)

      expect(useSettingsStore.getState().editorLineNumbers).toBe(true)
    })

    it('setDefaultAuthor sets the author string', () => {
      useSettingsStore.getState().setDefaultAuthor('Plugin Dev')

      expect(useSettingsStore.getState().defaultAuthor).toBe('Plugin Dev')
    })
  })
})
