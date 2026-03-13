// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from '../src/renderer/src/stores/settingsStore'
import type { PluginParameter } from '../src/renderer/src/types/plugin'

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

describe('settingsStore', () => {
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
      expect(presets['My Preset'][0].name).toBe('TestParam')
    })

    it('no-ops when name is empty or whitespace-only', () => {
      const params = [makeParam()]
      useSettingsStore.getState().savePreset('', params)
      useSettingsStore.getState().savePreset('   ', params)

      expect(useSettingsStore.getState().parameterPresets).toEqual({})
    })

    it('no-ops when params array is empty', () => {
      useSettingsStore.getState().savePreset('Empty Preset', [])

      expect(useSettingsStore.getState().parameterPresets).toEqual({})
    })

    it('overwrites an existing preset with the same name', () => {
      useSettingsStore.getState().savePreset('Preset', [makeParam({ name: 'First' })])
      useSettingsStore.getState().savePreset('Preset', [makeParam({ name: 'Second' })])

      const presets = useSettingsStore.getState().parameterPresets
      expect(presets['Preset']).toHaveLength(1)
      expect(presets['Preset'][0].name).toBe('Second')
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

      expect(useSettingsStore.getState().parameterPresets).toEqual({})
    })
  })

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
      params[0].name = 'Mutated'
      params[0].default = 'after'
      params.push(makeParam({ name: 'Extra' }))

      const stored = useSettingsStore.getState().parameterPresets['Isolated']
      expect(stored).toHaveLength(1)
      expect(stored[0].name).toBe('Original')
      expect(stored[0].default).toBe('before')
    })
  })
})
