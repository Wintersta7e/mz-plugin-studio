/// <reference types="vite/client" />
// Cases for every code template: one base per template, one-factor variants of it, and hostile
// text in each free-text field. Each case records whether validation rejects it and what
// generate() returns today, on separate lines.
import {
  getAllTemplates,
  getTemplate,
  getTemplateDefaults,
  validateTemplateValues,
  type CodeTemplate,
  type TemplateField
} from '../../../src/renderer/src/lib/generator/templates/index'
import {
  getClassesGrouped,
  getClassMethods
} from '../../../src/renderer/src/lib/generator/class-registry'
import { ALL_PAYLOADS } from '../../helpers/hostile'
import { byCodeUnit, oneLine } from './normalise'

// Each template module registers itself when loaded.
const TEMPLATE_MODULES = import.meta.glob(
  '../../../src/renderer/src/lib/generator/templates/*.ts',
  {
    eager: true
  }
)

export interface TemplateCase {
  name: string
  values: Record<string, unknown>
  /**
  Payload name when one field holds hostile text, else null.
  */
  hostile: string | null
}

// Required values whose generic fill would not pass the template's own validation.
const HAND_VALUES: Record<string, Record<string, unknown>> = {
  'audio-bgm-control': { filename: 'Theme1' },
  'audio-crossfade': { newBgmFilename: 'Theme2' },
  'battle-damage-modifier': { modifyValue: '1.5' },
  'menu-title-mod': { commandName: 'Extra', commandSymbol: 'extra' },
  'message-custom-text-code': { replacementText: '$gameParty.gold()' },
  'sprite-picture-manipulation': { imageName: 'Pic1' }
}

const THREE_GAUGES = { gaugeCount: '3' }
const CUSTOM_BACKGROUND = { modType: 'background', bgType: 'custom' }

// Values of other fields under which a text field reaches the output. Under the base values
// these fields are left out or converted (to a number, a boolean, parsed JSON), so their
// hostile text is also tried under these values.
export const ENABLING_VALUES: Record<string, Record<string, Record<string, unknown>>> = {
  'actor-custom-property': { defaultValue: { dataType: 'string' } },
  'audio-crossfade': {
    fadeFromSilenceBgm: { crossfadeType: 'fadeFromSilence', newBgmFilename: '' }
  },
  'database-ext-notetag': { defaultValue: { valueType: 'string' } },
  'gauge-window': {
    gauge3Label: THREE_GAUGES,
    gauge3Color1: THREE_GAUGES,
    gauge3Color2: THREE_GAUGES
  },
  'menu-options-addition': {
    defaultValue: { optionType: 'volume' },
    choices: { optionType: 'select' }
  },
  'message-window-mod': { bgColor: CUSTOM_BACKGROUND },
  'save-load-basic': { defaultValue: { dataType: 'string' } },
  'sprite-custom-class': { fillColor: { useBitmap: 'filled' } },
  'sprite-frame-animation': { targetClass: { animationType: 'mixin' } }
}

// Cases that change more than one field: a field shown only for another field's value, varied
// under that value. One-factor variants of such a field never reach the code it controls.
const COMBINED_CASES: Record<string, Record<string, unknown>[]> = {
  // Text outside a select's options, as a hand-edited saved value holds: only such a value
  // reaches the template's own rejection of an unknown key, trigger or scene.
  'input-handler-basic': [
    { keyName: 'unknownKey' },
    { triggerType: 'unknownTrigger' },
    { activeScene: 'unknownScene' }
  ],
  'message-choice-handler': [
    { modType: 'behavior', wrapAround: false },
    { modType: 'behavior', rememberChoice: true }
  ],
  'message-custom-text-code': [
    { codeType: 'effect', effectType: 'size' },
    { codeType: 'effect', effectType: 'icon' },
    { codeType: 'effect', effectType: 'custom' }
  ],
  'message-window-mod': [
    { modType: 'background', bgType: 'window' },
    { modType: 'background', bgType: 'transparent' },
    CUSTOM_BACKGROUND,
    { ...CUSTOM_BACKGROUND, bgColor: '' },
    { modType: 'nameBox', nameBoxPosition: 'left' },
    { modType: 'nameBox', nameBoxPosition: 'right' }
  ],
  'method-alias-basic': [{ timing: 'replace', callOriginal: false }]
}

// A number at the edge of a comparison the template makes, or just past it: a comparison off by
// one (`>` for `>=`, `<` for `<=`) changes the output or the verdict of one of these cases.
const BOUNDARY_CASES: Record<string, Record<string, unknown>[]> = {
  'actor-custom-property': [{ minValue: '5', maxValue: '5' }],
  'map-event-spawn': [{ templateEventId: 1 }, { maxSpawnedEvents: 1 }],
  'map-parallel-process': [{ updateInterval: 2 }, { activeCondition: 'switch', conditionId: 1 }],
  'party-management': [
    { minSize: 2 },
    { maxSize: 1 },
    { featureType: 'reserveParty', maxReserve: 1 }
  ],
  'plugin-command-basic': [{ arg1Name: 'console' }, { arg1Name: 'my-arg', arg2Name: 'my-arg' }],
  'sprite-frame-animation': [
    { animationType: 'mixin', targetClass: 'Sprite_Character', columns: 1 }
  ]
}

const BASE_CLASS = 'Scene_Map'
const BASE_METHOD = 'start'

function template(id: string): CodeTemplate {
  const found = getTemplate(id)
  if (found === undefined) throw new Error(`Unknown template ${id}`)
  return found
}

const isEmpty = (value: unknown): boolean => value === undefined || value === ''

export function templateIds(): string[] {
  if (Object.keys(TEMPLATE_MODULES).length === 0) throw new Error('no template module loaded')
  return getAllTemplates()
    .map((t) => t.id)
    .toSorted(byCodeUnit)
}

function genericValue(field: TemplateField): unknown {
  switch (field.type) {
    case 'select': {
      return field.options?.[0]?.value
    }
    case 'number': {
      return 1
    }
    case 'class-select': {
      return BASE_CLASS
    }
    case 'method-select': {
      return BASE_METHOD
    }
    case 'boolean': {
      return false
    }
    case 'key-select':
    case 'text': {
      return 'Sample'
    }
  }
}

/**
Defaults plus a value for every empty required field; the one owner of base values.
*/
export function baseValues(id: string): Record<string, unknown> {
  const values: Record<string, unknown> = { ...getTemplateDefaults(id), ...HAND_VALUES[id] }
  for (const field of template(id).fields) {
    if (field.required === true && isEmpty(values[field.id])) values[field.id] = genericValue(field)
  }
  return values
}

function variants(field: TemplateField, base: Record<string, unknown>): [string, unknown][] {
  switch (field.type) {
    case 'select': {
      return (field.options ?? []).map((o) => [o.value, o.value])
    }
    case 'boolean': {
      return [[String(base[field.id] !== true), base[field.id] !== true]]
    }
    case 'class-select': {
      return Object.values(getClassesGrouped()).flatMap((group): [string, unknown][] => {
        const first = group.at(0)
        return first === undefined ? [] : [[first.name, first.name]]
      })
    }
    case 'method-select': {
      const { className } = base
      const shown = typeof className === 'string' ? className : BASE_CLASS
      return getClassMethods(shown).map((m) => [m.name, m.name])
    }
    case 'text': {
      return field.required === true ? [] : [['empty', '']]
    }
    case 'key-select':
    case 'number': {
      // A cleared number input reads as 0 (`Number('')`), so a number field is never empty.
      return []
    }
  }
}

// `<field>=<value>` joined by commas; an empty value reads `empty`.
const caseName = (changes: Record<string, unknown>): string =>
  Object.entries(changes)
    .map(([field, value]) => `${field}=${value === '' ? 'empty' : String(value)}`)
    .join(',')

export function templateCases(id: string): TemplateCase[] {
  const base = baseValues(id)
  const cases: TemplateCase[] = [{ name: 'base', values: base, hostile: null }]
  const fields = template(id).fields
  for (const field of fields) {
    for (const [label, value] of variants(field, base)) {
      cases.push({
        name: `${field.id}=${label}`,
        values: { ...base, [field.id]: value },
        hostile: null
      })
    }
  }
  const combinedCases = COMBINED_CASES[id] ?? []
  for (const changes of combinedCases) {
    cases.push({ name: caseName(changes), values: { ...base, ...changes }, hostile: null })
  }
  const enablingFields = new Map(Object.entries(ENABLING_VALUES[id] ?? {}))
  for (const field of fields) {
    if (field.type !== 'text') continue
    const enabling = enablingFields.get(field.id)
    const contexts: Record<string, unknown>[] = enabling === undefined ? [{}] : [{}, enabling]
    for (const changes of contexts) {
      for (const payload of ALL_PAYLOADS) {
        cases.push({
          name: caseName({ ...changes, [field.id]: payload.name }),
          values: { ...base, ...changes, [field.id]: payload.text },
          hostile: payload.name
        })
      }
    }
  }
  // Last, after the hostile text, so that adding one only adds to the end of a golden file.
  const boundaryCases = BOUNDARY_CASES[id] ?? []
  for (const changes of boundaryCases) {
    cases.push({ name: caseName(changes), values: { ...base, ...changes }, hostile: null })
  }
  return cases
}

const thrown = (error: unknown): string => (error instanceof Error ? error.name : typeof error)

function renderCase(id: string, c: TemplateCase): string {
  const lines = [`// ==== case: ${c.name} ${oneLine(JSON.stringify(c.values))}`]
  // Validation rejects a value of another type than its field before the template's own check
  // reads it; a throw from validation would still be recorded here rather than end the file.
  try {
    const verdict = validateTemplateValues(id, c.values)
    if (!verdict.valid) lines.push(`// rejects: ${oneLine(verdict.errors.join(' | '))}`)
  } catch (error) {
    lines.push(`// validation throws: ${thrown(error)}`)
  }
  try {
    lines.push(template(id).generate(c.values))
  } catch (error) {
    lines.push(`// throws: ${thrown(error)}`)
  }
  return lines.join('\n')
}

// The given cases of one template as a golden file's text.
export function renderCases(id: string, cases: TemplateCase[]): string {
  return cases.map((c) => renderCase(id, c)).join('\n\n') + '\n'
}

/**
Every case of one template as the golden file's text.
*/
export function renderTemplateCases(id: string): string {
  return renderCases(id, templateCases(id))
}
