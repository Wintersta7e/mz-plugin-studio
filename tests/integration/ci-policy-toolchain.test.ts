// Tests for `ci-policy toolchain`: Node, its type definitions and Electron's Node against engines
import { afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const SCRIPT = fileURLToPath(new URL('../../scripts/ci-policy.mjs', import.meta.url))
const MAJOR = Number(process.versions.node.split('.')[0])

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

// A project root with package.json, the @types/node manifest and, optionally, a fake electron
// package whose binary is this Node (it answers `-p process.versions.node` like Electron does).
function project(options: { engines?: string; types: string; electron?: string }): string {
  const dir = mkdtempSync(join(tmpdir(), 'ci-policy-toolchain-'))
  tempDirs.push(dir)
  const files: Record<string, string> = {
    'package.json': JSON.stringify(
      options.engines === undefined
        ? { name: 'x' }
        : { name: 'x', engines: { node: options.engines } }
    ),
    'node_modules/@types/node/package.json': JSON.stringify({ version: options.types })
  }
  if (options.electron !== undefined) {
    files['node_modules/electron/package.json'] = JSON.stringify({ main: 'index.js' })
    files['node_modules/electron/index.js'] = options.electron
  }
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), content)
  }
  return dir
}

function toolchain(cwd: string, args: string[] = []): { status: number | null; out: string } {
  const result = spawnSync(process.execPath, [SCRIPT, 'toolchain', ...args], {
    cwd,
    encoding: 'utf8'
  })
  return { status: result.status, out: result.stdout + result.stderr }
}

const FAKE_ELECTRON = 'module.exports = process.execPath\n'

describe('ci-policy toolchain', () => {
  it('passes when Node and its type definitions match the engines major', () => {
    const { status, out } = toolchain(project({ engines: `^${MAJOR}.0.0`, types: `${MAJOR}.1.0` }))
    expect(out).toContain(`ci-policy toolchain: engines.node ^${MAJOR}.0.0\n`)
    expect(out).toContain(`ci-policy toolchain: node ${process.version}\n`)
    expect(out).toContain(`ci-policy toolchain: @types/node ${MAJOR}.1.0\n`)
    expect(out).toContain('ci-policy toolchain: ok')
    expect(status).toBe(0)
  })

  it('fails without engines, as v1.6.0 shipped', () => {
    const { status, out } = toolchain(project({ types: '25.6.0' }))
    expect(out).toContain('engines.node')
    expect(out).toContain('ci-policy toolchain: FAILED')
    expect(status).toBe(1)
  })

  it('fails on an engines range that is not a caret range', () => {
    const { status } = toolchain(project({ engines: `>=${MAJOR}`, types: `${MAJOR}.1.0` }))
    expect(status).toBe(1)
  })

  it('fails when the type definitions are for another major', () => {
    const { status, out } = toolchain(
      project({ engines: `^${MAJOR}.0.0`, types: `${MAJOR + 1}.0.0` })
    )
    expect(out).toContain('@types/node')
    expect(status).toBe(1)
  })

  it('fails when the running Node is outside engines', () => {
    const { status, out } = toolchain(
      project({ engines: `^${MAJOR + 1}.0.0`, types: `${MAJOR + 1}.0.0` })
    )
    expect(out).toContain(`FAIL node ${process.version}`)
    expect(status).toBe(1)
  })

  it('with --electron, reads the Node version Electron bundles', () => {
    const dir = project({
      engines: `^${MAJOR}.0.0`,
      types: `${MAJOR}.1.0`,
      electron: FAKE_ELECTRON
    })
    const { status, out } = toolchain(dir, ['--electron'])
    expect(out).toContain(`ci-policy toolchain: electron node ${process.versions.node}\n`)
    expect(status).toBe(0)
  })

  it('with --electron, fails when the electron package cannot be loaded', () => {
    const dir = project({
      engines: `^${MAJOR}.0.0`,
      types: `${MAJOR}.1.0`,
      electron: "throw new Error('Electron failed to install correctly')\n"
    })
    const { status, out } = toolchain(dir, ['--electron'])
    expect(out).toContain('electron')
    expect(status).toBe(1)
  })

  it('with --electron, fails when no electron package is installed', () => {
    const { status } = toolchain(project({ engines: `^${MAJOR}.0.0`, types: `${MAJOR}.1.0` }), [
      '--electron'
    ])
    expect(status).toBe(1)
  })
})
