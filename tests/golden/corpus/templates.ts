/// <reference types="vite/client" />
// Cases for every code template: one base per template, one-factor variants of it, and hostile
// text in each free-text field. Each case records whether validation rejects it and what
// generate() returns today, on separate lines.
import {
  getAllTemplates,
  getTemplate,
  getTemplateDefaults,
  validateTemplateValues
} from '../../../src/renderer/src/lib/generator/templates/index'
import type {
  CodeTemplate,
  TemplateField
} from '../../../src/renderer/src/lib/generator/templates/index'
import {
  getClassesGrouped,
  getClassMethods
} from '../../../src/renderer/src/lib/generator/class-registry'
import { ALL_PAYLOADS } from '../../helpers/hostile'

// Each template module registers itself when loaded.
import.meta.glob('../../../src/renderer/src/lib/generator/templates/*.ts', { eager: true })

export interface TemplateCase {
  name: string
  values: Record<string, unknown>
  /** Payload name when one field holds hostile text, else null. */
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
  'message-window-mod': { bgColor: { modType: 'background', bgType: 'custom' } },
  'save-load-basic': { defaultValue: { dataType: 'string' } },
  'sprite-custom-class': { fillColor: { useBitmap: 'filled' } },
  'sprite-frame-animation': { targetClass: { animationType: 'mixin' } }
}

// Cases that change more than one field: a field shown only for another field's value, varied
// under that value. One-factor variants of such a field never reach the code it controls.
const COMBINED_CASES: Record<string, Record<string, unknown>[]> = {
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
    ENABLING_VALUES['message-window-mod'].bgColor,
    { ...ENABLING_VALUES['message-window-mod'].bgColor, bgColor: '' },
    { modType: 'nameBox', nameBoxPosition: 'left' },
    { modType: 'nameBox', nameBoxPosition: 'right' }
  ],
  'method-alias-basic': [{ timing: 'replace', callOriginal: false }]
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
  return getAllTemplates()
    .map((t) => t.id)
    .sort()
}

function genericValue(field: TemplateField): unknown {
  switch (field.type) {
    case 'select':
      return field.options?.[0]?.value
    case 'number':
      return 1
    case 'class-select':
      return BASE_CLASS
    case 'method-select':
      return BASE_METHOD
    case 'boolean':
      return false
    default:
      return 'Sample'
  }
}

/** Defaults plus a value for every empty required field; the one owner of base values. */
export function baseValues(id: string): Record<string, unknown> {
  const values: Record<string, unknown> = { ...getTemplateDefaults(id), ...HAND_VALUES[id] }
  for (const field of template(id).fields) {
    if (field.required && isEmpty(values[field.id])) values[field.id] = genericValue(field)
  }
  return values
}

function variants(field: TemplateField, base: Record<string, unknown>): [string, unknown][] {
  switch (field.type) {
    case 'select':
      return (field.options ?? []).map((o) => [o.value, o.value])
    case 'boolean':
      return [[String(base[field.id] !== true), base[field.id] !== true]]
    case 'class-select':
      return Object.values(getClassesGrouped())
        .filter((group) => group.length > 0)
        .map((group) => [group[0].name, group[0].name])
    case 'method-select':
      return getClassMethods(String(base.className ?? BASE_CLASS)).map((m) => [m.name, m.name])
    case 'text':
      return field.required ? [] : [['empty', '']]
    default:
      // A cleared number input reads as 0 (`Number('')`), so a number field is never empty.
      return []
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
  for (const changes of COMBINED_CASES[id] ?? []) {
    cases.push({ name: caseName(changes), values: { ...base, ...changes }, hostile: null })
  }
  for (const field of fields.filter((f) => f.type === 'text')) {
    const enabling = ENABLING_VALUES[id]?.[field.id]
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
  return cases
}

// Keeps a header or verdict on one line: JSON escapes LF but not the two Unicode separators.
const oneLine = (text: string): string =>
  text
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

function renderCase(id: string, c: TemplateCase): string {
  const lines = [`// ==== case: ${c.name} ${oneLine(JSON.stringify(c.values))}`]
  const verdict = validateTemplateValues(id, c.values)
  if (!verdict.valid) lines.push(`// rejects: ${oneLine(verdict.errors.join(' | '))}`)
  try {
    lines.push(template(id).generate(c.values))
  } catch (error) {
    lines.push(`// throws: ${error instanceof Error ? error.name : typeof error}`)
  }
  return lines.join('\n')
}

/** Every case of one template as the golden file's text. */
export function renderTemplateCases(id: string): string {
  return (
    templateCases(id)
      .map((c) => renderCase(id, c))
      .join('\n\n') + '\n'
  )
}
