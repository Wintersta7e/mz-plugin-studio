// Persist options shared by every saved store: saved data this build cannot use is backed up and
// reported instead of silently replaced, every loaded field is type-checked, and changes are
// written by one writer once edits pause, so no edit waits on serializing and storing its store; a
// write that fails is reported and retried instead of thrown out of `set()`.
import log from 'electron-log/renderer'
import type { PersistOptions, PersistStorage } from 'zustand/middleware'
import { useToastStore } from './toast-store'

/**
@internal exported for tests
*/
export type PersistedKey =
  | 'mz-plugin-studio-project'
  | 'mz-plugin-studio-templates'
  | 'mz-plugin-studio-ui'
  | 'mz-plugin-studio-settings'
  | 'mz-plugin-studio-plugin'

const BACKUP_SUFFIX = '.backup'

// One step into a saved field: a key, an array element (with the name a check reads from it), or a
// record entry
/**
@internal exported for tests
*/
export type PathStep = { key: string } | { index: number; name?: string } | { entry: string }
export type FieldPath = PathStep[]

// undefined = wrong type → the field takes its default; drop(path) records an element-level drop
// at that path below the checked value
export type FieldCheck<T> = (value: unknown, drop: (path: FieldPath) => void) => T | undefined

// migrations[i] takes a payload from schema i to i + 1; the current schema is migrations.length
export type MigrationStep = (state: Record<string, unknown>) => Record<string, unknown>

// What the restore report calls a saved field or a key inside one: one phrase, or one for the whole
// field and one for an entry of it ('' leaves a key out of the words)
/**
@internal exported for tests
*/
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
  // pure; run by merge on the loaded state after the checks; never names a store (hydration runs
  // inside create())
  prune?: (state: S) => S
}

// kept: the backup entry holds this data; earlier-copy-kept: it holds older data, so this was not
// copied; failed: writing the copy threw
/**
@internal exported for tests
*/
export type BackupOutcome = 'kept' | 'earlier-copy-kept' | 'failed'

export interface RestoreReportEntry {
  name: PersistedKey
  area: string
  kind: 'unparseable' | 'newer-schema' | 'fields-reset' | 'entries-dropped'
  fields: FieldPath[]
  backup: BackupOutcome
}

const pendingReport: RestoreReportEntry[] = []
// Writes of each store that failed on a full quota since its last successful write
const quotaFailures = new Map<PersistedKey, number>()
// Stores whose failed write, other than on a full quota, was shown this session
const shownFailures = new Set<PersistedKey>()
// Each loaded store's user words, for its backup and its report entries
const wordsOf = new Map<string, { area: string; labels: FieldLabels }>()

const BACKUPS_PLACE = 'Settings > Data > Saved-state backups'

function report(
  name: PersistedKey,
  area: string,
  kind: RestoreReportEntry['kind'],
  backup: BackupOutcome,
  fields: FieldPath[] = []
): void {
  pendingReport.push({ name, area, kind, fields, backup })
}

/**
Everything reported since the last call, in load order.
*/
export function takeRestoreReport(): RestoreReportEntry[] {
  return pendingReport.splice(0)
}

function backupText(key: string, backup: BackupOutcome): string {
  switch (backup) {
    case 'kept': {
      return `a copy was kept as ${key}.`
    }
    case 'earlier-copy-kept': {
      return `it was not copied because ${key} already holds an earlier copy, and it will be replaced at the next save.`
    }
    case 'failed': {
      return `it could not be copied to ${key} because storage is full, and it will be replaced at the next save.`
    }
  }
}

function loadText(kind: RestoreReportEntry['kind'], fields: string[]): string {
  switch (kind) {
    case 'unparseable': {
      return 'the saved data could not be read, so defaults were loaded'
    }
    case 'newer-schema': {
      return 'saved by a newer version; the parts this version understands were kept'
    }
    case 'fields-reset': {
      return `${fields.join(', ')} had unexpected values and were reset`
    }
    case 'entries-dropped': {
      return `${fields.join(', ')} could not be read and were left out`
    }
  }
}

/**
A field path as code writes it, for logs: `openPlugins[0].parameters[1].desc`.
*/
export function pathText(path: FieldPath): string {
  return path.map((step, index) => stepText(step, index === 0)).join('')
}

function stepText(step: PathStep, isFirst: boolean): string {
  if ('key' in step) return isFirst ? step.key : `.${step.key}`
  return `[${'index' in step ? String(step.index) : JSON.stringify(step.entry)}]`
}

// A label's words for a whole field, or for one entry of it when `at` names one
function nounOf(label: FieldLabel, at: string | undefined): string {
  if (typeof label === 'string') return label
  return at === undefined ? label.all : label.one
}

/**
A field path in the store's words, innermost first: `openPlugins[0].parameters[1]` with the tab
named Good → "parameter 2 of open plugin Good".
*/
function describeField(path: FieldPath, labels: FieldLabels): string {
  const parts: { label: FieldLabel; at?: string }[] = []
  for (const step of path) {
    if ('key' in step) {
      const { key } = step
      const own = Object.hasOwn(labels, key) ? labels[key] : undefined
      parts.push({ label: own ?? key.replaceAll(/([a-z\d])([A-Z])/g, '$1 $2').toLowerCase() })
      continue
    }
    const at = 'entry' in step ? step.entry : (step.name ?? String(step.index + 1))
    const last = parts.at(-1)
    if (last !== undefined && last.at === undefined) last.at = at
    else parts.push({ label: 'entry', at })
  }
  return parts
    .map(({ label, at }) => {
      const noun = nounOf(label, at)
      return noun === '' || at === undefined ? noun : `${noun} ${at}`
    })
    .filter((words) => words !== '')
    .toReversed()
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
  return (value) => values.find((candidate) => candidate === value)
}

/**
An array whose elements are checked one by one; a rejected element is dropped and named by its
index and, when `label` reads one from it, its name.
*/
export function checkArrayOf<T>(
  element: FieldCheck<T>,
  label?: (item: unknown) => string | undefined
): FieldCheck<T[]> {
  const checkItems = checkEach(element, label)
  return (value, drop) => (Array.isArray(value) ? checkItems(value, drop) : undefined)
}

/**
`checkArrayOf` for a value already known to be an array.
*/
export function checkEach<T>(
  element: FieldCheck<T>,
  label?: (item: unknown) => string | undefined
): (items: readonly unknown[], drop: (path: FieldPath) => void) => T[] {
  return (items, drop) => {
    const kept: T[] = []
    for (const [index, item] of items.entries()) {
      const name = label?.(item)
      const step: PathStep = name === undefined ? { index: index } : { index: index, name }
      const checked = element(item, (path) => {
        drop([step, ...path])
      })
      if (checked === undefined) drop([step])
      else kept.push(checked)
    }
    return kept
  }
}

/**
A string-keyed record whose entries are checked one by one; a rejected entry is dropped and named.
*/
export function checkRecordOf<T>(entry: FieldCheck<T>): FieldCheck<Record<string, T>> {
  return (value, drop) => {
    if (!isRecord(value)) return
    const kept: Record<string, T> = {}
    for (const [key, item] of Object.entries(value)) {
      const step: PathStep = { entry: key }
      const checked = entry(item, (path) => {
        drop([step, ...path])
      })
      if (checked === undefined) drop([step])
      else kept[key] = checked
    }
    return kept
  }
}

/**
The schema a payload was written at: a non-negative integer, else 0 (written before schemas).
*/
function schemaOf(state: Record<string, unknown>): number {
  const schema = state['schemaVersion']
  return typeof schema === 'number' && isWholeNumber(schema) && schema >= 0 ? schema : 0
}

// Any whole number, safe or not: a schema too large to be exact still reads as newer than this
// build (every finite number past the safe range is whole)
function isWholeNumber(value: number): boolean {
  return (
    Number.isSafeInteger(value) ||
    (Number.isFinite(value) && Math.abs(value) > Number.MAX_SAFE_INTEGER)
  )
}

function isEnvelope(value: unknown): value is { state: Record<string, unknown>; version?: 0 } {
  return (
    isRecord(value) &&
    isRecord(value['state']) &&
    (!Object.hasOwn(value, 'version') || value['version'] === 0)
  )
}

/**
Keeps the first copy of saved data this build could not use.
*/
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
  // The name is the one a full quota sets; the legacy code 22 always comes with it
  return error instanceof DOMException && error.name === 'QuotaExceededError'
}

// The order Array#sort uses without a compare function: by UTF-16 code units
function byCodeUnits(a: string, b: string): number {
  if (a < b) return -1
  return a > b ? 1 : 0
}

function backupKeys(): string[] {
  return Object.keys(localStorage)
    .filter((key) => key.endsWith(BACKUP_SUFFIX))
    .toSorted(byCodeUnits)
}

export interface SavedBackup {
  key: string
  area: string // the store it was copied from, or its key when no loaded store owns it
  text: string
}

export function listBackups(): SavedBackup[] {
  return backupKeys().map((key) => {
    const name = key.slice(0, -BACKUP_SUFFIX.length)
    return { key, area: wordsOf.get(name)?.area ?? name, text: localStorage.getItem(key) ?? '' }
  })
}

export function deleteBackup(key: string): void {
  localStorage.removeItem(key)
}

/**
A change is written once no other change followed it for this long…
@internal exported for tests
*/
export const FLUSH_QUIET_MS = 500
/**
…and at most this long after the first change that is not written yet.
@internal exported for tests
*/
export const FLUSH_MAX_DELAY_MS = 2000

// One write of a flush: the text is built only when the step runs
interface WriteStep {
  key: string
  text: () => string
}

// Phases run in order; a phase runs only when every step of the phases before it was written
type WritePlan = readonly (readonly WriteStep[])[]

// The latest state of a store that is not written yet
interface PendingWrite {
  value: unknown
  firstAt: number // when the oldest change it holds was made
  timer: ReturnType<typeof setTimeout> | undefined
}

const pendingWrites = new Map<PersistedKey, PendingWrite>()

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function reportFailedWrite(name: PersistedKey, error: unknown): void {
  const area = (wordsOf.get(name)?.area ?? name).toLowerCase()
  if (!isQuotaError(error)) {
    log.error(`${name} could not be saved:`, error)
    if (shownFailures.has(name)) return
    shownFailures.add(name)
    useToastStore.getState().addToast({
      type: 'error',
      message: `Recent changes to ${area} could not be saved (${errorText(error)}); saving is tried again at the next change. Nothing was deleted.`,
      duration: 0
    })
    return
  }
  const failures = (quotaFailures.get(name) ?? 0) + 1
  quotaFailures.set(name, failures)
  // every flush retries, so only the first failure is logged; the rest are counted
  if (failures > 1) return
  log.error(`Storage is full; ${name} was not saved:`, error)
  const backups = backupKeys()
  const present =
    backups.length > 0 ? `${backups.join(', ')}; export or delete them in ${BACKUPS_PLACE}` : 'none'
  useToastStore.getState().addToast({
    type: 'error',
    message: `Storage is full: recent changes to ${area} were not saved. Backup entries present: ${present}. Nothing was deleted.`,
    duration: 0
  })
}

function didWriteStep(name: PersistedKey, step: WriteStep): boolean {
  try {
    localStorage.setItem(step.key, step.text())
  } catch (error) {
    reportFailedWrite(name, error)
    return false
  }
  const failed = quotaFailures.get(name)
  if (failed === undefined) return true
  quotaFailures.delete(name)
  if (failed > 1) {
    log.warn(`${name} could not be saved ${String(failed - 1)} more times while storage was full`)
  }
  return true
}

// Every step of a phase is attempted; true when every step of every phase was written
function didWritePlan(name: PersistedKey, plan: WritePlan): boolean {
  for (const phase of plan) {
    const results = phase.map((step) => didWriteStep(name, step))
    if (results.includes(false)) return false
  }
  return true
}

// Writes the store's pending state; a write that fails keeps it pending until the next change or
// the final flush
function flushKey(name: PersistedKey): void {
  const write = pendingWrites.get(name)
  if (write === undefined) return
  clearTimeout(write.timer)
  const plan: WritePlan = [[{ key: name, text: () => JSON.stringify(write.value) }]]
  // a change made while the plan ran is newer than what it wrote, so it stays pending
  if (didWritePlan(name, plan) && pendingWrites.get(name) === write) pendingWrites.delete(name)
}

/**
Writes every pending change now.
@internal exported for tests
*/
export function flushPersistedState(): void {
  for (const name of pendingWrites.keys()) flushKey(name)
}

function flushWhenHidden(): void {
  if (document.visibilityState === 'hidden') flushPersistedState()
}

const unload: { isListening: boolean } = { isListening: false }

// Registered at the first change rather than on import, so a module that only reads the stores
// (outside a page) adds nothing to the page
function listenForUnload(): void {
  if (unload.isListening) return
  unload.isListening = true
  addEventListener('beforeunload', flushPersistedState)
  addEventListener('pagehide', flushPersistedState)
  document.addEventListener('visibilitychange', flushWhenHidden)
}

/**
Removes the page listeners; the next change adds them again.
@internal exported for tests
*/
export function stopUnloadListeners(): void {
  unload.isListening = false
  removeEventListener('beforeunload', flushPersistedState)
  removeEventListener('pagehide', flushPersistedState)
  document.removeEventListener('visibilitychange', flushWhenHidden)
}

function schedule(name: PersistedKey, value: unknown): void {
  const now = Date.now()
  const earlier = pendingWrites.get(name)
  clearTimeout(earlier?.timer)
  const firstAt = earlier?.firstAt ?? now
  const due = Math.min(now + FLUSH_QUIET_MS, firstAt + FLUSH_MAX_DELAY_MS)
  const write: PendingWrite = { value, firstAt, timer: undefined }
  pendingWrites.set(name, write)
  write.timer = setTimeout(
    () => {
      flushKey(name)
    },
    Math.max(0, due - now)
  )
  listenForUnload()
}

// The state read is checked field by field by merge, so the storage claims no type for it
function guardedStorage(
  name: PersistedKey,
  area: string,
  currentSchema: number
): PersistStorage<unknown> {
  return {
    getItem: (key) => {
      // storage never answers with older state than memory holds
      flushKey(name)
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
      return value
    },
    setItem: (_key, value) => {
      schedule(name, value)
    },
    removeItem: (key) => {
      clearTimeout(pendingWrites.get(name)?.timer)
      pendingWrites.delete(name)
      localStorage.removeItem(key)
    }
  }
}

export function definePersist<S, P extends object>(
  spec: PersistSpec<S, P>
): PersistOptions<S, unknown> {
  const currentSchema = spec.migrations.length
  wordsOf.set(spec.name, { area: spec.area, labels: spec.labels })
  // The envelope keeps the middleware's default version 0, which v1.6.0 also writes and reads;
  // schema changes are tracked by schemaVersion inside the state instead.
  return {
    name: spec.name,
    storage: guardedStorage(spec.name, spec.area, currentSchema),
    partialize: (state) => ({ ...spec.partialize(state), schemaVersion: currentSchema }),
    merge: (persisted, current) => {
      if (!isRecord(persisted)) return current
      let state = persisted
      const steps = spec.migrations.slice(schemaOf(persisted))
      for (const step of steps) state = step(state)
      // A field missing or reset keeps the store's default: it is left out of `checked`
      const checked: Record<string, unknown> = {}
      const reset: FieldPath[] = []
      const dropped: FieldPath[] = []
      for (const [field, check] of Object.entries<FieldCheck<unknown>>(spec.fields)) {
        if (!Object.hasOwn(state, field)) continue
        const value = check(state[field], (path) => {
          const full = [{ key: field }, ...path]
          log.warn(`Saved ${spec.name}: dropped ${pathText(full)}`)
          dropped.push(full)
        })
        if (value === undefined) {
          log.warn(`Saved ${spec.name}: ${field} had an unexpected value and was reset`)
          reset.push([{ key: field }])
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
      const merged = { ...current, ...checked }
      return spec.prune ? spec.prune(merged) : merged
    }
  }
}
