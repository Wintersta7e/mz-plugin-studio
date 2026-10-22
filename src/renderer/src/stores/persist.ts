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

export const BACKUP_SUFFIX = '.backup'

// undefined = wrong type → the field takes its default; drop(what) records an element-level drop
export type FieldCheck<T> = (value: unknown, drop: (what: string) => void) => T | undefined

// migrations[i] takes a payload from schema i to i + 1; the current schema is migrations.length
export type MigrationStep = (state: Record<string, unknown>) => Record<string, unknown>

export interface PersistSpec<S, P> {
  name: PersistedKey
  area: string // user-facing name of the stored data
  migrations: readonly MigrationStep[]
  fields: { [K in keyof P]-?: FieldCheck<P[K]> }
  partialize: (state: S) => P
  // pure; run by merge after the checks; never names a store (hydration runs inside create())
  prune?: (persisted: P) => P
  onRehydrateStorage?: PersistOptions<S, P>['onRehydrateStorage']
}

export interface RestoreReportEntry {
  name: PersistedKey
  area: string
  kind: 'unparseable' | 'newer-schema' | 'fields-reset' | 'not-backed-up'
  fields: string[]
}

let pendingReport: RestoreReportEntry[] = []
let quotaReported = false

function report(
  name: PersistedKey,
  area: string,
  kind: RestoreReportEntry['kind'],
  fields: string[] = []
): void {
  pendingReport.push({ name, area, kind, fields })
}

/** Everything reported since the last call, in load order. */
export function takeRestoreReport(): RestoreReportEntry[] {
  const entries = pendingReport
  pendingReport = []
  return entries
}

export function formatRestoreReport(entries: RestoreReportEntry[]): string {
  return entries
    .map(({ name, area, kind, fields }) => {
      const backup = name + BACKUP_SUFFIX
      switch (kind) {
        case 'unparseable':
          return `${area}: the saved data could not be read, so defaults were loaded; a copy was kept as ${backup}.`
        case 'newer-schema':
          return `${area}: saved by a newer version; the parts this version understands were kept and a copy was kept as ${backup}.`
        case 'fields-reset':
          return `${area}: ${fields.join(', ')} had unexpected values and were reset.`
        case 'not-backed-up':
          return `${area}: the saved data could not be copied because ${backup} already holds an earlier copy; it will be replaced at the next save.`
      }
    })
    .join(' ')
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

/** An array whose elements are checked one by one; a rejected element is dropped and named. */
export function checkArrayOf<T>(element: FieldCheck<T>): FieldCheck<T[]> {
  return (value, drop) => {
    if (!Array.isArray(value)) return undefined
    const kept: T[] = []
    value.forEach((item, i) => {
      const checked = element(item, (what) => drop(`[${i}]${what}`))
      if (checked === undefined) drop(`[${i}]`)
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
      const checked = entry(item, (what) => drop(`.${key}${what}`))
      if (checked === undefined) drop(`.${key}`)
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

/** Keeps the first copy of saved data this build could not use; false when no copy of it exists. */
function backUp(name: PersistedKey, area: string, raw: string): boolean {
  const key = name + BACKUP_SUFFIX
  const existing = localStorage.getItem(key)
  if (existing === raw) return true
  if (existing === null) {
    try {
      localStorage.setItem(key, raw)
      return true
    } catch (error) {
      log.error(`Could not back up ${name}:`, error)
    }
  }
  report(name, area, 'not-backed-up')
  return false
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)
}

function backupKeys(): string[] {
  return Object.keys(localStorage).filter((key) => key.endsWith(BACKUP_SUFFIX))
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
        if (backUp(name, area, raw)) report(name, area, 'unparseable')
        return null
      }
      if (schemaOf(value.state) > currentSchema) {
        log.warn(`Saved ${name} was written by a newer version`)
        if (backUp(name, area, raw)) report(name, area, 'newer-schema')
      }
      return value as StorageValue<P>
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        if (!isQuotaError(error)) throw error
        log.error(`Storage is full; ${name} was not saved:`, error)
        if (quotaReported) return
        quotaReported = true
        const backups = backupKeys()
        useToastStore.getState().addToast({
          type: 'error',
          message: `Storage is full: recent changes to ${area.toLowerCase()} were not saved. Backup entries present: ${backups.length > 0 ? backups.join(', ') : 'none'}. Nothing was deleted.`,
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
      for (const [field, check] of Object.entries(spec.fields) as [string, FieldCheck<unknown>][]) {
        if (!Object.hasOwn(state, field)) {
          checked[field] = defaults[field]
          continue
        }
        const value = check(state[field], (what) =>
          log.warn(`Saved ${spec.name}: dropped ${field}${what}`)
        )
        if (value === undefined) {
          log.warn(`Saved ${spec.name}: ${field} had an unexpected value and was reset`)
          reset.push(field)
          checked[field] = defaults[field]
        } else {
          checked[field] = value
        }
      }
      if (reset.length > 0) report(spec.name, spec.area, 'fields-reset', reset)
      const pruned = spec.prune ? spec.prune(checked as P) : checked
      return { ...current, ...pruned }
    },
    onRehydrateStorage: spec.onRehydrateStorage
  }
}
