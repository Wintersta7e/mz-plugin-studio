// The license list generator run on throwaway projects: which source imports count as bundled packages.
import { describe, it, expect, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const SCRIPT = path.resolve(process.cwd(), 'scripts/third-party-licenses.mjs')
// The script always lists these build-time packages, so every fixture installs them
const ALWAYS = ['tailwindcss', 'tw-animate-css']
const projects: string[] = []

interface Run {
  status: number | null
  stdout: string
  stderr: string
}

function write(directory: string, file: string, text: string): void {
  mkdirSync(path.dirname(path.join(directory, file)), { recursive: true })
  writeFileSync(path.join(directory, file), text)
}

// A project whose only source file holds `source`, with `value-pkg` installed
function run(source: string): Run {
  const directory = mkdtempSync(path.join(tmpdir(), 'third-party-licenses-'))
  projects.push(directory)
  mkdirSync(path.join(directory, 'scripts'))
  const script = path.join(directory, 'scripts/third-party-licenses.mjs')
  copyFileSync(SCRIPT, script)
  const installed = [...ALWAYS, 'value-pkg']
  const lock = {
    packages: Object.fromEntries(installed.map((n) => [`node_modules/${n}`, { license: 'MIT' }]))
  }
  write(directory, 'package.json', JSON.stringify({ dependencies: {} }))
  write(directory, 'package-lock.json', JSON.stringify(lock))
  for (const name of installed) {
    write(
      directory,
      `node_modules/${name}/package.json`,
      JSON.stringify({ name, repository: `example/${name}` })
    )
  }
  write(directory, 'src/a.ts', source)
  const result = spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' })
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

const listed = (n: string): string =>
  `third-party licenses: ${n} packages, 0 license texts, ${n} without a license file\n`

describe('third-party-licenses source imports', () => {
  afterEach(() => {
    for (const directory of projects.splice(0)) rmSync(directory, { recursive: true, force: true })
  })

  it.each([
    ['a value import', "import value from 'value-pkg'\n"],
    ['a value import after two spaces', "import  value from 'value-pkg'\n"],
    ['a re-export after two spaces', "export  * from 'value-pkg'\n"]
  ])('lists the package of %s', (_name, source) => {
    expect(run(source)).toStrictEqual({ status: 0, stdout: listed('3'), stderr: '' })
  })

  it.each([
    ['a type import after two spaces', "import  type { A } from 'absent'\n"],
    ['a type re-export after two spaces', "export  type { A } from 'absent'\n"],
    ['an export with no clause', "export  from 'absent'\n"],
    ['an import with no clause', "import   from 'absent'\n"]
  ])('ignores %s', (_name, source) => {
    expect(run(source)).toStrictEqual({ status: 0, stdout: listed('2'), stderr: '' })
  })

  it('fails on a value import missing from the lockfile', () => {
    const result = run("import  value from 'absent'\n")

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('src/a.ts imports "absent", which is not in package-lock.json')
  })
})
