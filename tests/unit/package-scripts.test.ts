// A bare tool name in a script resolves to whatever is on PATH; on a tree installed
// without bin links that is a global install of another version.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const readJson = (file: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(ROOT, file), 'utf8'))

const scripts = readJson('package.json').scripts as Record<string, string>

// Packages whose bin file a script must name exactly
const PINNED_BINS = [
  'eslint',
  'typescript',
  'prettier',
  'electron-builder',
  'electron-vite',
  'vitest'
]

const NPM_RUN = /^npm run ([\w:-]+)(?: -- .+)?$/
const NPM_TEST = /^npm test(?: -- .+)?$/
const NODE_SCRIPT = /^node (scripts\/[^\s]+)(?: .+)?$/
const NODE_MODULE = /^node node_modules\/((?:@[^/\s]+\/)?[^/\s]+)\/([^\s]+)(?: .+)?$/

const commandsOf = (script: string): string[] => script.split('&&').map((c) => c.trim())

function binPaths(pkg: string): string[] {
  const { bin } = readJson(`node_modules/${pkg}/package.json`)
  const paths = typeof bin === 'string' ? [bin] : Object.values(bin as Record<string, string>)
  return paths.map((p) => p.replace(/^\.\//, ''))
}

const isTracked = (file: string): boolean =>
  execFileSync('git', ['ls-files', '--', file], { cwd: ROOT, encoding: 'utf8' }).trim() !== ''

// Why a command is rejected, or null when it is allowed
function problem(command: string): string | null {
  const run = NPM_RUN.exec(command)
  if (run) return run[1] in scripts ? null : `runs a missing script "${run[1]}"`
  if (NPM_TEST.test(command)) return null
  const local = NODE_SCRIPT.exec(command)
  if (local) return isTracked(local[1]) ? null : `runs an untracked file ${local[1]}`
  const tool = NODE_MODULE.exec(command)
  if (tool) {
    const [, pkg, path] = tool
    if (path.startsWith('.bin/')) return 'calls a .bin shim'
    if (!existsSync(join(ROOT, 'node_modules', pkg, path))) return `calls a missing file ${path}`
    if (PINNED_BINS.includes(pkg) && !binPaths(pkg).includes(path))
      return `calls ${pkg}/${path}, not its package bin`
    return null
  }
  return 'calls a tool by bare name'
}

describe('package.json scripts', () => {
  it('every script calls its tool by its package bin path', () => {
    const names = Object.keys(scripts)
    const commands = names.flatMap((name) => commandsOf(scripts[name]).map((c) => ({ name, c })))
    console.log(`package scripts: scripts ${names.length}, commands ${commands.length}`)
    expect(commands.length).toBeGreaterThan(0)
    const failures = commands.flatMap(({ name, c }) => {
      const why = problem(c)
      return why ? [`${name}: "${c}" ${why}`] : []
    })
    expect(failures).toEqual([])
  })

  it('check runs the local gate and leaves out the toolchain check', () => {
    expect(scripts.check).toBeDefined()
    expect(commandsOf(scripts.check)).not.toContain('npm run ci:toolchain')
  })

  it('the Windows package script never publishes', () => {
    expect(scripts['package:win']).toMatch(/ --publish never(?: |$)/)
  })
})
