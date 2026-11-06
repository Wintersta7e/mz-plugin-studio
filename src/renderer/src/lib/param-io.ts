import {
  ALL_PARAM_TYPES,
  firstFreeName,
  type ParamType,
  type PluginParameter,
  type SelectOption
} from '../types/plugin'
import { pathText, type FieldLabels, type FieldPath } from '../stores/persist'

/**
File format for .mzparams export
*/
interface ParameterExport {
  version: 1
  source: string
  exportedAt: string
  parameters: PluginParameter[]
}

/**
Serialize selected parameters for export
*/
export function serializeParams(params: PluginParameter[], sourceName: string): string {
  const data: ParameterExport = {
    version: 1,
    source: sourceName,
    exportedAt: new Date().toISOString(),
    parameters: params
  }
  return JSON.stringify(data, null, 2)
}

type ParameterShape =
  | { ok: true; parameter: Omit<PluginParameter, 'id'>; dropped: FieldPath[] }
  | { ok: false; reason: 'shape' | 'type' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isParamType(value: unknown): value is ParamType {
  return typeof value === 'string' && ALL_PARAM_TYPES.has(value)
}

/**
Options that are `{ value, text }` strings; other elements and keys are named in `dropped`.
*/
function checkOptions(elements: unknown[], dropped: FieldPath[]): SelectOption[] {
  const options: SelectOption[] = []
  for (const [index, element] of elements.entries()) {
    if (
      !isRecord(element) ||
      typeof element['value'] !== 'string' ||
      typeof element['text'] !== 'string'
    ) {
      dropped.push([{ key: 'options' }, { index: index }])
      continue
    }
    options.push({ value: element['value'], text: element['text'] })
    for (const key of Object.keys(element)) {
      if (key !== 'value' && key !== 'text')
        dropped.push([{ key: 'options' }, { index: index }, { key }])
    }
  }
  return options
}

/**
Checks the shape of one parameter read from a file: a field of the wrong type falls back or is
left out, and is named in `dropped` with every unknown key. Content is not checked; the
generator escapes what it writes. The caller assigns `id`.
*/
function checkParameterShape(value: unknown): ParameterShape {
  if (!isRecord(value) || typeof value['name'] !== 'string') return { ok: false, reason: 'shape' }
  if (!isParamType(value['type'])) return { ok: false, reason: 'type' }
  const dropped: FieldPath[] = []
  const name = value['name']
  const fallback = <T>(key: string, replacement: T): T => {
    dropped.push([{ key }])
    return replacement
  }
  const { text, desc, default: defaultValue } = value
  const parameter: Omit<PluginParameter, 'id'> = {
    name,
    text: typeof text === 'string' ? text : fallback('text', name),
    desc: typeof desc === 'string' ? desc : fallback('desc', ''),
    type: value['type'],
    default: isDefaultValue(defaultValue) ? defaultValue : fallback('default', '')
  }
  checkOptionalFields(value, parameter, dropped)
  return { ok: true, parameter, dropped }
}

function isDefaultValue(value: unknown): value is PluginParameter['default'] {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

type NumberField = 'min' | 'max' | 'decimals'
type TextField = 'structType' | 'dir' | 'parent' | 'rawType' | 'onLabel' | 'offLabel'
const NUMBER_FIELDS: ReadonlySet<string> = new Set<NumberField>(['min', 'max', 'decimals'])
const TEXT_FIELDS: ReadonlySet<string> = new Set<TextField>([
  'structType',
  'dir',
  'parent',
  'rawType',
  'onLabel',
  'offLabel'
])
// Read before the optional fields
const REQUIRED_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'name',
  'text',
  'desc',
  'type',
  'default'
])
const isNumberField = (key: string): key is NumberField => NUMBER_FIELDS.has(key)
const isTextField = (key: string): key is TextField => TEXT_FIELDS.has(key)

/**
Copies `field` into `parameter` when its type fits optional field `key`: `fits`, `wrong-type`, or
`unknown` for a key no parameter has
*/
function setOptionalField(
  parameter: Omit<PluginParameter, 'id'>,
  key: string,
  field: unknown
): 'fits' | 'wrong-type' | 'unknown' {
  if (isNumberField(key)) {
    if (typeof field !== 'number') return 'wrong-type'
    parameter[key] = field
  } else if (isTextField(key)) {
    if (typeof field !== 'string') return 'wrong-type'
    parameter[key] = field
  } else if (key === 'arrayType') {
    if (!isParamType(field)) return 'wrong-type'
    parameter.arrayType = field
  } else if (key === 'require') {
    if (typeof field !== 'boolean') return 'wrong-type'
    parameter.require = field
  } else {
    return 'unknown'
  }
  return 'fits'
}

/**
The optional fields of `value` copied into `parameter`; an unknown key, and a field of the wrong
type other than `null`, is named in `dropped`
*/
function checkOptionalFields(
  value: Record<string, unknown>,
  parameter: Omit<PluginParameter, 'id'>,
  dropped: FieldPath[]
): void {
  for (const [key, field] of Object.entries(value)) {
    if (REQUIRED_FIELDS.has(key)) continue
    if (key === 'options') {
      if (Array.isArray(field)) parameter.options = checkOptions(field, dropped)
      else dropped.push([{ key }])
      continue
    }
    const result = setOptionalField(parameter, key, field)
    if (result === 'unknown' || (result === 'wrong-type' && field !== null)) {
      dropped.push([{ key }])
    }
  }
}

/**
A parameter from saved app state through the same shape check, keeping its id (a new one if it
has none); each field left out is named through `drop`.
*/
export function checkSavedParameter(
  value: unknown,
  drop: (path: FieldPath) => void
): PluginParameter | undefined {
  const shape = checkParameterShape(value)
  if (!shape.ok) return undefined
  for (const path of shape.dropped) drop(path)
  const id = isRecord(value) && typeof value['id'] === 'string' ? value['id'] : crypto.randomUUID()
  return { id, ...shape.parameter }
}

/**
Words for the keys `checkSavedParameter` names, for every store that saves parameters.
*/
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

/**
Deserialize imported parameters from .mzparams content
*/
export function deserializeParams(content: string): ParamImportResult {
  let data: unknown
  try {
    data = JSON.parse(content)
  } catch {
    return { success: false, reason: 'not-json' }
  }
  if (!isRecord(data)) return { success: false, reason: 'not-mzparams' }
  const { version } = data
  // A whole number, past the safe integer range too, is a version; NaN and Infinity leave a
  // remainder of NaN
  if (typeof version !== 'number' || version % 1 !== 0 || version < 1) {
    return { success: false, reason: 'not-mzparams' }
  }
  if (version > 1) return { success: false, reason: 'newer-version' }
  if (!Array.isArray(data['parameters'])) return { success: false, reason: 'not-mzparams' }
  const { parameters, skipped, dropped } = readParameters(data['parameters'])
  const source =
    typeof data['source'] === 'string' && data['source'] !== '' ? data['source'] : 'Unknown'
  return { success: true, parameters, source, skipped, dropped }
}

type ReadParameters = Pick<
  Extract<ParamImportResult, { success: true }>,
  'parameters' | 'skipped' | 'dropped'
>

/**
The parameters of a file that pass the shape check, each with a new id; the others are `skipped`
*/
function readParameters(values: unknown[]): ReadParameters {
  const read: ReadParameters = { parameters: [], skipped: [], dropped: [] }
  for (const [index, value] of values.entries()) {
    const shape = checkParameterShape(value)
    if (!shape.ok) {
      const name = isRecord(value) && typeof value['name'] === 'string' ? value['name'] : null
      read.skipped.push({ index, name, reason: shape.reason })
      continue
    }
    read.parameters.push({ ...shape.parameter, id: crypto.randomUUID() })
    for (const path of shape.dropped) {
      read.dropped.push({ param: shape.parameter.name, field: pathText(path) })
    }
  }
  return read
}

/**
Copies of `params` with new IDs, each named `<name>_copy`, `<name>_copy2`…: the first name
neither `existing` nor an earlier copy holds. A copy of a copy keeps one suffix.
*/
export function duplicateParams(
  params: readonly PluginParameter[],
  existing: readonly string[]
): PluginParameter[] {
  const taken = new Set(existing)
  return params.map((param) => {
    const name = firstFreeName(`${param.name.replace(/_copy\d*$/, '')}_copy`, taken)
    taken.add(name)
    return { ...param, id: crypto.randomUUID(), name }
  })
}
