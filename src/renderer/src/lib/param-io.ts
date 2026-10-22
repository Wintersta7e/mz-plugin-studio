import type { ParamType, PluginParameter, SelectOption } from '../types/plugin'
import { ALL_PARAM_TYPES } from '../types/plugin'
import type { FieldLabels } from '../stores/persist'

/** File format for .mzparams export */
export interface ParameterExport {
  version: 1
  source: string
  exportedAt: string
  parameters: PluginParameter[]
}

/** Serialize selected parameters for export */
export function serializeParams(params: PluginParameter[], sourceName: string): string {
  const data: ParameterExport = {
    version: 1,
    source: sourceName,
    exportedAt: new Date().toISOString(),
    parameters: params
  }
  return JSON.stringify(data, null, 2)
}

export type ParameterShape =
  | { ok: true; parameter: Omit<PluginParameter, 'id'>; dropped: string[] }
  | { ok: false; reason: 'shape' | 'type' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isParamType(value: unknown): value is ParamType {
  return typeof value === 'string' && ALL_PARAM_TYPES.has(value)
}

/** Options that are `{ value, text }` strings; other elements and keys are named in `dropped`. */
function checkOptions(elements: unknown[], dropped: string[]): SelectOption[] {
  const options: SelectOption[] = []
  elements.forEach((element, i) => {
    if (
      !isRecord(element) ||
      typeof element.value !== 'string' ||
      typeof element.text !== 'string'
    ) {
      dropped.push(`options[${i}]`)
      return
    }
    options.push({ value: element.value, text: element.text })
    for (const key of Object.keys(element)) {
      if (key !== 'value' && key !== 'text') dropped.push(`options[${i}].${key}`)
    }
  })
  return options
}

/**
 * Checks the shape of one parameter read from a file: a field of the wrong type falls back or is
 * left out, and is named in `dropped` with every unknown key. Content is not checked; the
 * generator escapes what it writes. The caller assigns `id`.
 */
function checkParameterShape(value: unknown): ParameterShape {
  if (!isRecord(value) || typeof value.name !== 'string') return { ok: false, reason: 'shape' }
  if (!isParamType(value.type)) return { ok: false, reason: 'type' }
  const dropped: string[] = []
  const name = value.name
  const take = <T>(key: string, accepted: boolean, fallback: T): T => {
    if (accepted) return value[key] as T
    dropped.push(key)
    return fallback
  }
  const parameter: Omit<PluginParameter, 'id'> = {
    name,
    text: take('text', typeof value.text === 'string', name),
    desc: take('desc', typeof value.desc === 'string', ''),
    type: value.type,
    default: take<PluginParameter['default']>(
      'default',
      ['string', 'number', 'boolean'].includes(typeof value.default),
      ''
    )
  }
  for (const [key, field] of Object.entries(value)) {
    switch (key) {
      case 'id':
      case 'name':
      case 'text':
      case 'desc':
      case 'type':
      case 'default':
        break
      case 'min':
      case 'max':
      case 'decimals':
        if (typeof field === 'number') parameter[key] = field
        else if (field !== null) dropped.push(key)
        break
      case 'structType':
      case 'dir':
      case 'parent':
      case 'rawType':
      case 'onLabel':
      case 'offLabel':
        if (typeof field === 'string') parameter[key] = field
        else if (field !== null) dropped.push(key)
        break
      case 'arrayType':
        if (isParamType(field)) parameter.arrayType = field
        else if (field !== null) dropped.push(key)
        break
      case 'require':
        if (typeof field === 'boolean') parameter.require = field
        else if (field !== null) dropped.push(key)
        break
      case 'options':
        if (Array.isArray(field)) parameter.options = checkOptions(field, dropped)
        else dropped.push(key)
        break
      default:
        dropped.push(key)
    }
  }
  return { ok: true, parameter, dropped }
}

/**
 * A parameter from saved app state through the same shape check, keeping its id (a new one if it
 * has none); each field left out is named through `drop`.
 */
export function checkSavedParameter(
  value: unknown,
  drop: (what: string) => void
): PluginParameter | undefined {
  const shape = checkParameterShape(value)
  if (!shape.ok) return undefined
  for (const field of shape.dropped) drop(`.${field}`)
  const id = isRecord(value) && typeof value.id === 'string' ? value.id : crypto.randomUUID()
  return { id, ...shape.parameter }
}

/** Words for the keys `checkSavedParameter` names, for every store that saves parameters. */
export const PARAMETER_LABELS: FieldLabels = {
  text: 'display name',
  desc: 'description',
  options: { all: 'options', one: 'option' }
}

export type ParamImportResult =
  | {
      success: true
      parameters: PluginParameter[]
      source: string
      skipped: { index: number; name: string | null; reason: 'shape' | 'type' }[]
      dropped: { param: string; field: string }[]
    }
  | { success: false; reason: 'not-json' | 'not-mzparams' | 'newer-version' }

/** Deserialize imported parameters from .mzparams content */
export function deserializeParams(content: string): ParamImportResult {
  let data: unknown
  try {
    data = JSON.parse(content)
  } catch {
    return { success: false, reason: 'not-json' }
  }
  if (!isRecord(data)) return { success: false, reason: 'not-mzparams' }
  const { version } = data
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { success: false, reason: 'not-mzparams' }
  }
  if (version > 1) return { success: false, reason: 'newer-version' }
  if (!Array.isArray(data.parameters)) return { success: false, reason: 'not-mzparams' }

  const parameters: PluginParameter[] = []
  const skipped: Extract<ParamImportResult, { success: true }>['skipped'] = []
  const dropped: Extract<ParamImportResult, { success: true }>['dropped'] = []
  data.parameters.forEach((value: unknown, index) => {
    const shape = checkParameterShape(value)
    if (!shape.ok) {
      const name = isRecord(value) && typeof value.name === 'string' ? value.name : null
      skipped.push({ index, name, reason: shape.reason })
      return
    }
    parameters.push({ ...shape.parameter, id: crypto.randomUUID() })
    for (const field of shape.dropped) dropped.push({ param: shape.parameter.name, field })
  })
  const source = typeof data.source === 'string' && data.source !== '' ? data.source : 'Unknown'
  return { success: true, parameters, source, skipped, dropped }
}

/** Duplicate parameters with new IDs and "_copy" suffix */
export function duplicateParams(params: PluginParameter[]): PluginParameter[] {
  return params.map((p) => ({
    ...p,
    id: crypto.randomUUID(),
    name: p.name.replace(/_copy\d*$/, '') + '_copy'
  }))
}
