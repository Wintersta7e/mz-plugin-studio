// The saved values captured from tagged builds, one directory of exact strings per release.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export type PersistedKey =
  | 'mz-plugin-studio-project'
  | 'mz-plugin-studio-templates'
  | 'mz-plugin-studio-ui'
  | 'mz-plugin-studio-settings'
  | 'mz-plugin-studio-plugin'

export const PERSISTED_KEYS: readonly PersistedKey[] = [
  'mz-plugin-studio-project',
  'mz-plugin-studio-templates',
  'mz-plugin-studio-ui',
  'mz-plugin-studio-settings',
  'mz-plugin-studio-plugin'
]

/**
The values the given release wrote, found on disk, by key (exact strings).
*/
export function readPayloads(version: 'v1.6.0' | 'v1.9.0'): Partial<Record<PersistedKey, string>> {
  const directory = path.join(process.cwd(), 'tests/fixtures/persisted', version)
  const payloads: Partial<Record<PersistedKey, string>> = {}
  for (const file of readdirSync(directory)) {
    const name = file.replace(/\.json$/, '')
    const key = PERSISTED_KEYS.find((known) => known === name)
    if (key !== undefined) payloads[key] = readFileSync(path.join(directory, file), 'utf8')
  }
  return payloads
}
