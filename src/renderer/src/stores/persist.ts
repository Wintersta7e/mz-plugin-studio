// Persist options shared by every saved store: saved data this build cannot use is backed up and
// reported instead of silently replaced, every loaded field is type-checked, and a full storage
// quota is reported instead of thrown out of `set()`.
import log from 'electron-log/renderer'
import type { PersistOptions, PersistStorage, StorageValue } from 'zustand/middleware'
import { useToastStore } from './toastStore'

export type PersistedKey =
  | 'mz-plugin-studio-project'
  | 'mz-plugin-studio-templates'
  | 'mz-plugin-studio-ui'
  | 'mz-plugin-studio-settings'
  | 'mz-plugin-studio-plugin'

const BACKUP_SUFFIX = '.backup'

// undefined = wrong type → the field takes its default; drop(what) records an element-level drop
export type FieldCheck<T> = (value: unknown, drop: (what: string) => void) => T | undefined

// migrations[i] takes a payload from schema i to i + 1; the current schema is migrations.length
export type MigrationStep = (state: Record<string, unknown>) => Record<string, unknown>

// What the restore report calls a saved field or a key inside one: one phrase, or one for the whole
// field and one for an entry of it ('' leaves a key out of the words)
export type FieldLabel = string | { all: string; one: string }
export type FieldLabels = Readonly<Record<string, FieldLabel>>

export interface PersistSpec<S, P> {
  name: PersistedKey
  area: string // user-facing name of the stored data
  migrations: readonly MigrationStep[]
  fields: { [K in keyof P]-?: FieldCheck<P[K]> }
  // every field, and any key inside one whose words are not its own split at capitals
  labels: { [K in keyof P]-?: FieldLabel } & FieldLabels
  partialize: (state: S) => P
  // pure; run by merge after the checks; never names a store (hydration runs inside create())
  prune?: (persisted: P) => P
  onRehydrateStorage?: PersistOptions<S, P>['onRehydrateStorage']
}

// kept: the backup entry holds this data; earlier-copy-kept: it holds older data, so this was not
// copied; failed: writing the copy threw
export type BackupOutcome = 'kept' | 'earlier-copy-kept' | 'failed'

export interface RestoreReportEntry {
  name: PersistedKey
  area: string
  kind: 'unparseable' | 'newer-schema' | 'fields-reset' | 'entries-dropped'
  fields: string[]
  backup: BackupOutcome
}

let pendingReport: RestoreReportEntry[] = []
// Writes of each store that failed on a full quota since its last successful write
const quotaFailures = new Map<PersistedKey, number>()
// Each loaded store's user words, for its backup and its report entries
const wordsOf = new Map<PersistedKey, { area: string; labels: FieldLabels }>()

const BACKUPS_PLACE = 'Settings > Data > Saved-state backups'

function report(
  name: PersistedKey,
  area: string,
  kind: RestoreReportEntry['kind'],
  backup: BackupOutcome,
  fields: string[] = []
): void {
  pendingReport.push({ name, area, kind, fields, backup })
}

/** Everything reported since the last call, in load order. */
export function takeRestoreReport(): RestoreReportEntry[] {
  const entries = pendingReport
  pendingReport = []
  return entries
}

function backupText(key: string, backup: BackupOutcome): string {
  switch (backup) {
    case 'kept':
      return `a copy was kept as ${key}.`
    case 'earlier-copy-kept':
      return `it was not copied because ${key} already holds an earlier copy, and it will be replaced at the next save.`
    case 'failed':
      return `it could not be copied to ${key} because storage is full, and it will be replaced at the next save.`
  }
}

function loadText(kind: RestoreReportEntry['kind'], fields: string[]): string {
  switch (kind) {
    case 'unparseable':
      return 'the saved data could not be read, so defaults were loaded'
    case 'newer-schema':
      return 'saved by a newer version; the parts this version understands were kept'
    case 'fields-reset':
      return `${fields.join(', ')} had unexpected values and were reset`
    case 'entries-dropped':
      return `${fields.join(', ')} could not be read and were left out`
  }
}

// One step of a field path as the checks write it: `[index]`, `["record key"]`, `key` or `.key`
const PATH_STEP = /\[(\d+)\]|\[("(?:[^"\\]|\\.)*")\]|\.?([^.[\]]+)/g

/**
 * A field path in the store's words, innermost first: `openPlugins[0].parameters[1] (Good)` →
 * "parameter 2 of open plugin Good". The name a check adds names the outermost entry.
 */
function describeField(path: string, labels: FieldLabels): string {
  const named = / \((.*)\)$/.exec(path)
  const parts: { label: FieldLabel; at?: string }[] = []
  for (const [, index, entry, key] of (named ? path.slice(0, named.index) : path).matchAll(
    PATH_STEP
  )) {
    if (key !== undefined) {
      parts.push({ label: labels[key] ?? key.replace(/([a-z\d])([A-Z])/g, '$1 $2').toLowerCase() })
      continue
    }
    const at = index !== undefined ? String(Number(index) + 1) : (JSON.parse(entry) as string)
    const last = parts.at(-1)
    if (last !== undefined && last.at === undefined) last.at = at
    else parts.push({ label: 'entry', at })
  }
  const outermost = parts.find((part) => part.at !== undefined)
  if (named && outermost) outermost.at = named[1]
  return parts
    .map(({ label, at }) => {
      const noun = typeof label === 'string' ? label : at === undefined ? label.all : label.one
      return noun === '' || at === undefined ? noun : `${noun} ${at}`
    })
    .filter((words) => words !== '')
    .reverse()
    .join(' of ')
}

export function formatRestoreReport(entries: RestoreReportEntry[]): string {
  const lines = entries.map(({ name, area, kind, fields, backup }) => {
    const labels = wordsOf.get(name)?.labels ?? {}
    const described = fields.map((field) => describeField(field, labels))
    return `${area}: ${loadText(kind, described)}; ${backupText(name + BACKUP_SUFFIX, backup)}`
  })
  return [...lines, `Backups can be exported or deleted in ${BACKUPS_PLACE}.`].join(' ')
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const checkString: FieldCheck<string> = (value) =>
  typeof value === 'string' ? value : undefined

export const checkBoolean: FieldCheck<boolean> = (value) =>
  typeof value === 'boolean' ? value : undefined

export const checkFiniteNumber: FieldCheck<number> = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

export const checkStringOrNull: FieldCheck<string | null> = (value) =>
  value === null || typeof value === 'string' ? value : undefined

export function checkOneOf<T extends string>(values: readonly T[]): FieldCheck<T> {
  return (value) => (values.includes(value as T) ? (value as T) : undefined)
}

/**
 * An array whose elements are checked one by one; a rejected element is dropped and named by its
 * index and, when `label` reads one from it, its name.
 */
export function checkArrayOf<T>(
  element: FieldCheck<T>,
  label?: (item: unknown) => string | undefined
): FieldCheck<T[]> {
  return (value, drop) => {
    if (!Array.isArray(value)) return undefined
    const kept: T[] = []
    value.forEach((item, i) => {
      const name = label?.(item)
      const at = (what: string) => `[${i}]${what}${name === undefined ? '' : ` (${name})`}`
      const checked = element(item, (what) => drop(at(what)))
      if (checked === undefined) drop(at(''))
      else kept.push(checked)
    })
    return kept
  }
}

/** A string-keyed record whose entries are checked one by one; a rejected entry is dropped and named. */
export function checkRecordOf<T>(entry: FieldCheck<T>): FieldCheck<Record<string, T>> {
  return (value, drop) => {
    if (!isRecord(value)) return undefined
    const kept: Record<string, T> = {}
    for (const [key, item] of Object.entries(value)) {
      const at = `[${JSON.stringify(key)}]`
      const checked = entry(item, (what) => drop(at + what))
      if (checked === undefined) drop(at)
      else kept[key] = checked
    }
    return kept
  }
}

/** The schema a payload was written at: a non-negative integer, else 0 (written before schemas). */
function schemaOf(state: Record<string, unknown>): number {
  const schema = state.schemaVersion
  return typeof schema === 'number' && Number.isInteger(schema) && schema >= 0 ? schema : 0
}

function isEnvelope(value: unknown): value is { state: Record<string, unknown>; version?: 0 } {
  return (
    isRecord(value) &&
    isRecord(value.state) &&
    (!Object.hasOwn(value, 'version') || value.version === 0)
  )
}

/** Keeps the first copy of saved data this build could not use. */
function backUp(name: PersistedKey, raw: string): BackupOutcome {
  const key = name + BACKUP_SUFFIX
  const existing = localStorage.getItem(key)
  if (existing === raw) return 'kept'
  if (existing !== null) return 'earlier-copy-kept'
  try {
    localStorage.setItem(key, raw)
    return 'kept'
  } catch (error) {
    log.error(`Could not back up ${name}:`, error)
    return 'failed'
  }
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)
}

function backupKeys(): string[] {
  return Object.keys(localStorage)
    .filter((key) => key.endsWith(BACKUP_SUFFIX))
    .sort()
}

export interface SavedBackup {
  key: string
  area: string // the store it was copied from, or its key when no loaded store owns it
  text: string
}

export function listBackups(): SavedBackup[] {
  return backupKeys().map((key) => {
    const name = key.slice(0, -BACKUP_SUFFIX.length) as PersistedKey
    return { key, area: wordsOf.get(name)?.area ?? name, text: localStorage.getItem(key) ?? '' }
  })
}

export function deleteBackup(key: string): void {
  localStorage.removeItem(key)
}

function guardedStorage<P>(
  name: PersistedKey,
  area: string,
  currentSchema: number
): PersistStorage<P> {
  return {
    getItem: (key) => {
      const raw = localStorage.getItem(key)
      if (raw === null) return null
      let value: unknown
      try {
        value = JSON.parse(raw)
      } catch {
        value = undefined
      }
      if (!isEnvelope(value)) {
        log.error(`Saved ${name} could not be read; defaults loaded`)
        report(name, area, 'unparseable', backUp(name, raw))
        return null
      }
      if (schemaOf(value.state) > currentSchema) {
        log.warn(`Saved ${name} was written by a newer version`)
        report(name, area, 'newer-schema', backUp(name, raw))
      }
      return value as StorageValue<P>
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
        const failed = quotaFailures.get(name)
        if (failed === undefined) return
        quotaFailures.delete(name)
        if (failed > 1) {
          log.warn(`${name} could not be saved ${failed - 1} more times while storage was full`)
        }
      } catch (error) {
        if (!isQuotaError(error)) throw error
        const failures = (quotaFailures.get(name) ?? 0) + 1
        quotaFailures.set(name, failures)
        // every change writes, so only the first failure is logged; the rest are counted
        if (failures > 1) return
        log.error(`Storage is full; ${name} was not saved:`, error)
        const backups = backupKeys()
        useToastStore.getState().addToast({
          type: 'error',
          message: `Storage is full: recent changes to ${area.toLowerCase()} were not saved. Backup entries present: ${backups.length > 0 ? `${backups.join(', ')}; export or delete them in ${BACKUPS_PLACE}` : 'none'}. Nothing was deleted.`,
          duration: 0
        })
      }
    },
    removeItem: (key) => localStorage.removeItem(key)
  }
}

export function definePersist<S, P extends object>(
  spec: PersistSpec<S, P>
): PersistOptions<S, P & { schemaVersion: number }> {
  const currentSchema = spec.migrations.length
  wordsOf.set(spec.name, { area: spec.area, labels: spec.labels })
  // The envelope keeps the middleware's default version 0, which v1.6.0 also writes and reads;
  // schema changes are tracked by schemaVersion inside the state instead.
  return {
    name: spec.name,
    storage: guardedStorage<P & { schemaVersion: number }>(spec.name, spec.area, currentSchema),
    partialize: (state) => ({ ...spec.partialize(state), schemaVersion: currentSchema }),
    merge: (persisted, current) => {
      if (!isRecord(persisted)) return current
      let state = persisted
      for (const step of spec.migrations.slice(schemaOf(persisted))) state = step(state)
      const defaults = current as Record<string, unknown>
      const checked: Record<string, unknown> = {}
      const reset: string[] = []
      const dropped: string[] = []
      for (const [field, check] of Object.entries(spec.fields) as [string, FieldCheck<unknown>][]) {
        if (!Object.hasOwn(state, field)) {
          checked[field] = defaults[field]
          continue
        }
        const value = check(state[field], (what) => {
          log.warn(`Saved ${spec.name}: dropped ${field}${what}`)
          dropped.push(field + what)
        })
        if (value === undefined) {
          log.warn(`Saved ${spec.name}: ${field} had an unexpected value and was reset`)
          reset.push(field)
          checked[field] = defaults[field]
        } else {
          checked[field] = value
        }
      }
      // merge runs on what the storage's getItem just read, so the key still holds that text
      const raw = localStorage.getItem(spec.name)
      if (raw !== null && (reset.length > 0 || dropped.length > 0)) {
        const backup = backUp(spec.name, raw)
        if (reset.length > 0) report(spec.name, spec.area, 'fields-reset', backup, reset)
        if (dropped.length > 0) report(spec.name, spec.area, 'entries-dropped', backup, dropped)
      }
      const pruned = spec.prune ? spec.prune(checked as P) : checked
      return { ...current, ...pruned }
    },
    onRehydrateStorage: spec.onRehydrateStorage
  }
}
