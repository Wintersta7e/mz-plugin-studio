// Shape checks for what a window sends over IPC. Each returns a fresh value holding only the
// fields the channel reads, so nothing unexpected reaches a handler.
import type { FileFilter, SaveGuard } from '../../shared/ipc-types'
import { isAllowedExtension } from '../../shared/path-safety'

/**
The error a request with arguments of the wrong shape rejects with
*/
export function invalidArguments(channel: string): Error {
  return new Error(`Invalid arguments: ${channel}`)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
The first `count` arguments, each required to be a string
*/
export function strings(channel: string, raw: readonly unknown[], count: number): string[] {
  const values = raw.slice(0, count)
  if (values.length < count || !values.every((v): v is string => typeof v === 'string')) {
    throw invalidArguments(channel)
  }
  return values
}

/**
`base` null or `{ path, sha256 }`, `overwriteBroken` absent or a boolean
*/
export function checkSaveGuard(channel: string, value: unknown): SaveGuard {
  if (!isRecord(value)) throw invalidArguments(channel)
  const { base, overwriteBroken } = value
  if (overwriteBroken !== undefined && typeof overwriteBroken !== 'boolean') {
    throw invalidArguments(channel)
  }
  const flag = overwriteBroken !== undefined && { overwriteBroken }
  if (base === null) return { base: null, ...flag }
  if (!isRecord(base)) throw invalidArguments(channel)
  const { path, sha256 } = base
  if (typeof path !== 'string' || (sha256 !== null && typeof sha256 !== 'string')) {
    throw invalidArguments(channel)
  }
  return { base: { path, sha256 }, ...flag }
}

const MAX_FILTERS = 4
const MAX_FILTER_NAME_LENGTH = 64
const MAX_FILTER_EXTENSIONS = 4
const FILTER_EXTENSION = /^[A-Z0-9.]{1,16}$/i

/**
Whether a filter may name the extension (without its dot): one the app may read or write
*/
export function isFilterExtension(extension: string): boolean {
  return FILTER_EXTENSION.test(extension) && isAllowedExtension(`file.${extension}`)
}

/**
The filters, when there are at most 4, each a name of at most 64 characters and 1-4 extensions
the app may read or write; otherwise undefined, and the dialog shows its own filter.
*/
export function checkFilters(value: unknown): FileFilter[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_FILTERS) return undefined
  const filters: FileFilter[] = []
  for (const entry of value) {
    if (!isRecord(entry)) return undefined
    const { name, extensions } = entry
    if (
      typeof name !== 'string' ||
      name.length > MAX_FILTER_NAME_LENGTH ||
      !Array.isArray(extensions) ||
      extensions.length === 0 ||
      extensions.length > MAX_FILTER_EXTENSIONS ||
      !extensions.every((e): e is string => typeof e === 'string' && isFilterExtension(e))
    ) {
      return undefined
    }
    filters.push({ name, extensions: [...extensions] })
  }
  return filters
}
