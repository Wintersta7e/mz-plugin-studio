// The software bill of materials the release ships: the same packages the license list names
import { describe, expect, it, onTestFinished } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const SCRIPT = path.join(ROOT, 'scripts', 'third-party-licenses.mjs')

interface Component {
  group?: string
  name: string
  version: string
  purl: string
  licenses: unknown[]
  hashes: { alg: string; content: string }[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isComponent = (value: unknown): value is Component =>
  isRecord(value) &&
  typeof value['name'] === 'string' &&
  typeof value['version'] === 'string' &&
  typeof value['purl'] === 'string' &&
  Array.isArray(value['licenses']) &&
  Array.isArray(value['hashes'])

const byText = (left: string, right: string): number => left.localeCompare(right)

// Runs `--sbom` in the repository, with a file to write to or without; the SBOM it wrote, if any
function sbom(hasFile: boolean): { status: number | null; out: string; bom: unknown } {
  const directory = mkdtempSync(path.join(tmpdir(), 'third-party-licenses-sbom-'))
  onTestFinished(() => {
    rmSync(directory, { recursive: true, force: true })
  })
  const file = path.join(directory, 'sbom.cdx.json')
  const args = hasFile ? [SCRIPT, '--sbom', file] : [SCRIPT, '--sbom']
  const run = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' })
  let bom: unknown
  try {
    bom = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    bom = undefined
  }
  return { status: run.status, out: run.stdout + run.stderr, bom }
}

const componentsOf = (bom: unknown): unknown[] =>
  isRecord(bom) && Array.isArray(bom['components']) ? bom['components'] : []

const fullName = (component: Component): string =>
  component.group === undefined ? component.name : `${component.group}/${component.name}`

// The package column of THIRD_PARTY_LICENSES.md
function licenseListNames(): string[] {
  const text = readFileSync(path.join(ROOT, 'THIRD_PARTY_LICENSES.md'), 'utf8')
  return text
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.startsWith('| Package |'))
    .map((line) => line.split(' | ', 1).at(0)?.slice(2) ?? '')
}

// The hex digests of a subresource-integrity value
const hexDigests = (integrity: string): string[] =>
  integrity
    .split(' ')
    .map((item) => Buffer.from(item.slice(item.indexOf('-') + 1), 'base64').toString('hex'))

// The hex digests of every lockfile entry, by `name@version`
function lockDigests(): Map<string, Set<string>> {
  const lock: unknown = JSON.parse(readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'))
  const entries = isRecord(lock) && isRecord(lock['packages']) ? lock['packages'] : {}
  const digests = new Map<string, Set<string>>()
  for (const [key, entry] of Object.entries(entries)) {
    if (!isRecord(entry) || typeof entry['integrity'] !== 'string') continue
    const name = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length)
    const id = `${name}@${String(entry['version'])}`
    digests.set(id, new Set([...(digests.get(id) ?? []), ...hexDigests(entry['integrity'])]))
  }
  return digests
}

describe('third-party-licenses --sbom', () => {
  it('lists every package of the license list as a CycloneDX component', () => {
    const { status, out, bom } = sbom(true)
    const components = componentsOf(bom)
    const valid = components.filter((each) => isComponent(each))
    const names = new Set(valid.map((each) => fullName(each)))
    const listed = licenseListNames()
    process.stdout.write(
      `sbom: components ${String(components.length)}, packages ${String(names.size)}; license list packages ${String(listed.length)}\n`
    )

    expect(listed.length).toBeGreaterThan(0)
    expect({
      status,
      printed: out.includes(`sbom components ${String(components.length)}\n`),
      format: isRecord(bom) && [bom['bomFormat'], bom['specVersion']],
      invalid: components.length - valid.length,
      names: [...names].toSorted(byText)
    }).toStrictEqual({
      status: 0,
      printed: true,
      format: ['CycloneDX', '1.6'],
      invalid: 0,
      names: listed.toSorted(byText)
    })
  })

  it('names each component by its npm package URL, license and lockfile hash', () => {
    const components = componentsOf(sbom(true).bom).filter((each) => isComponent(each))
    const digests = lockDigests()
    const problems = components.flatMap((each) => {
      const id = `${fullName(each)}@${each.version}`
      const purl = `pkg:npm/${fullName(each).replaceAll('@', '%40')}@${encodeURIComponent(each.version)}`
      const known = digests.get(id) ?? new Set()
      const isLockHash = each.hashes.every(
        (hash) => /^SHA-(?:1|256|384|512)$/v.test(hash.alg) && known.has(hash.content)
      )
      return [
        each.purl === purl ? [] : [`${each.purl}: expected ${purl}`],
        each.licenses.length > 0 ? [] : [`${id}: no license`],
        isLockHash && each.hashes.length > 0 ? [] : [`${id}: hashes are not the lockfile integrity`]
      ].flat()
    })

    expect(components.length).toBeGreaterThan(0)
    expect(problems).toStrictEqual([])
  })

  // SBOM attestation accepts a CycloneDX file only when bomFormat, serialNumber and specVersion are all set
  it('carries the serial number SBOM attestation requires, the same on every run', () => {
    const first = sbom(true).bom
    const second = sbom(true).bom
    const serial = isRecord(first) ? first['serialNumber'] : undefined

    expect(
      {
        bomFormat: isRecord(first) && first['bomFormat'],
        specVersion: isRecord(first) && first['specVersion'],
        serialNumber:
          typeof serial === 'string' &&
          /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/v.test(
            serial
          ),
        repeatable: JSON.stringify(first) === JSON.stringify(second)
      },
      'SBOM attestation rejects a CycloneDX file without bomFormat, serialNumber and specVersion'
    ).toStrictEqual({
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      serialNumber: true,
      repeatable: true
    })
  })

  it('fails without a file to write to', () => {
    const { status, out } = sbom(false)

    expect(out).toContain('--sbom needs a file')
    expect(status).toBe(1)
  })
})
