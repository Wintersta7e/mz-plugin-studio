// Invariants of the CI and release workflows, read with the fixed-shape workflow reader.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { indexOfRun, readJobs as readWorkflow, runs } from '../helpers/workflow-reader'
import type { Job, Step } from '../helpers/workflow-reader'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const WORKFLOWS = join(ROOT, '.github/workflows')
const readJobs = (file: string): Job[] => readWorkflow(join(WORKFLOWS, file))

const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts as Record<
  string,
  string
>

const files = readdirSync(WORKFLOWS).sort()
const ciText = readFileSync(join(WORKFLOWS, 'ci.yml'), 'utf8')
const jobs = readJobs('ci.yml')
const byId = new Map(jobs.map((job) => [job.id, job]))
const steps = jobs.flatMap((job) => job.steps)

function jobOf(id: string): Job {
  const job = byId.get(id)
  if (!job) throw new Error(`ci.yml has no job ${id}`)
  return job
}

const isSetupNode = (step: Step): boolean =>
  (step.keys.get('uses') ?? '').startsWith('actions/setup-node@')

describe('CI workflow', () => {
  it('reads every job and step of every workflow', () => {
    const all = files.map((file) => readJobs(file))
    const jobCount = all.reduce((sum, each) => sum + each.length, 0)
    const stepCount = all.flat().reduce((sum, job) => sum + job.steps.length, 0)
    console.log(`workflows: files ${files.length}, jobs ${jobCount}, steps ${stepCount}`)

    expect(files.length).toBeGreaterThan(0)
    expect(jobCount).toBeGreaterThan(0)
    expect(stepCount).toBeGreaterThan(0)
  })

  it('holds only the CI and release workflows', () => {
    expect(files).toEqual(['ci.yml', 'release.yml'])
  })

  it('the aggregate test job always runs and needs every other job', () => {
    const test = jobOf('test')

    expect(test.keys.get('if')).toBe('always()')

    const needs = /^\[(.*)\]$/.exec(test.keys.get('needs') ?? '')

    expect(needs).not.toBeNull()

    const needed = (needs?.[1] ?? '').split(',').map((id) => id.trim())
    const others = jobs.map((job) => job.id).filter((id) => id !== 'test')

    expect([...needed].sort()).toEqual([...others].sort())
  })

  it('every job has a timeout and a pinned runner image', () => {
    for (const job of jobs) {
      expect(job.keys.get('timeout-minutes'), job.id).toMatch(/^\d+$/)
      expect(['ubuntu-24.04', 'windows-2025'], job.id).toContain(job.keys.get('runs-on'))
    }
  })

  it('every install skips lifecycle scripts', () => {
    const installs = steps.flatMap((step) => step.run).filter((line) => /\bnpm ci\b/.test(line))

    expect(installs.length).toBeGreaterThan(0)

    for (const line of installs) expect(line).toBe('npm ci --ignore-scripts')
  })

  it('every setup-node reads the Node version from package.json engines', () => {
    const setups = steps.filter(isSetupNode)

    expect(setups.length).toBe(jobs.length)

    for (const step of setups) expect(step.nested).toContain('node-version-file: package.json')

    expect(ciText).not.toMatch(/\bnode-version:/)
    expect(ciText).not.toMatch(/\bactions\/cache\b/)
  })

  it('the static and unit jobs never fetch the Electron binary', () => {
    for (const id of ['static', 'unit']) {
      expect(runs(jobOf(id)).join('\n'), id).not.toMatch(/electron\/install\.js/)
    }
  })

  it('static then unit run every command of npm run check, in its order', () => {
    const ciRuns = [...jobOf('static').steps, ...jobOf('unit').steps]
      .flatMap((step) => step.run)
      .filter((line) => line.startsWith('npm run '))
    const checkRuns = scripts.check.split('&&').map((command) => command.trim())

    expect(checkRuns.length).toBeGreaterThan(0)

    let from = 0
    for (const command of checkRuns) {
      const at = ciRuns.indexOf(command, from)

      expect(at, `${command} after ${ciRuns[from - 1] ?? 'the start'}`).toBeGreaterThanOrEqual(0)

      from = at + 1
    }

    expect(runs(jobOf('static'))).toContain('npm run ci:toolchain')
  })

  it('the unit job runs the golden project once besides the full suite, with coverage', () => {
    const golden = runs(jobOf('unit')).filter((line) =>
      (scripts[/^npm run ([\w:-]+)$/.exec(line)?.[1] ?? ''] ?? '').includes('--project golden')
    )

    expect(golden).toEqual(['npm run test:golden:coverage'])
  })

  it('the golden-commit rules run on every static run', () => {
    const golden = jobOf('static').steps.filter((step) =>
      step.run.some((line) => line.startsWith('node scripts/check-golden-commits.mjs'))
    )

    expect(golden).toHaveLength(1)
    expect(golden[0].keys.has('if')).toBe(false)
  })

  it('the strictness status measures the pushed range from its base, on a full clone', () => {
    const job = jobOf('static')
    const status = job.steps.filter((step) => step.run.includes('npm run strictness:status'))

    expect(status).toHaveLength(1)
    expect(status.at(0)?.nested).toStrictEqual([
      'STRICTNESS_BASE: ${{ github.event.pull_request.base.sha || github.event.before }}'
    ])
    expect(job.steps.at(0)?.nested).toContain('fetch-depth: 0')
  })

  it('the Windows job tests fixture bytes before Electron and checks the package it builds', () => {
    const job = jobOf('package-win')
    const fixtures = indexOfRun(job, /tests\/unit\/fixture-set\.test\.ts/)
    const install = indexOfRun(job, /^node node_modules\/electron\/install\.js$/)

    expect(fixtures).toBeGreaterThanOrEqual(0)
    expect(install).toBeGreaterThan(fixtures)

    const packaging = runs(job).filter((line) => line === 'npm run package:win')

    expect(packaging).toHaveLength(1)

    const pack = indexOfRun(job, /^npm run package:win$/)
    const policy = indexOfRun(job, /^node scripts\/ci-policy\.mjs package /)

    expect(policy).toBeGreaterThan(pack)

    const fuses = indexOfRun(
      job,
      /^node scripts\/ci-policy\.mjs fuses dist\/win-unpacked\/mz-plugin-studio\.exe$/
    )

    expect(fuses).toBeGreaterThan(policy)
  })
})

const releaseText = readFileSync(join(WORKFLOWS, 'release.yml'), 'utf8')
const releaseJobs = readJobs('release.yml')

function releaseJob(id: string): Job {
  const job = releaseJobs.find((each) => each.id === id)
  if (!job) throw new Error(`release.yml has no job ${id}`)
  return job
}

// Permission lines without their trailing comment
const permissionsOf = (job: Job): string[] =>
  (job.nested.get('permissions') ?? []).map((line) => line.replace(/\s+#.*$/, ''))

function stepNamed(job: Job, name: string): Step {
  const step = job.steps.find((each) => each.keys.get('name') === name)
  if (!step) throw new Error(`release.yml job ${job.id} has no step ${name}`)
  return step
}

describe('Release workflow', () => {
  it('waits for CI, builds, then publishes', () => {
    expect(releaseJobs.map((job) => job.id)).toEqual(['ci', 'build', 'publish'])
    expect(releaseText).toMatch(/^permissions:\n {2}contents: read$/m)

    for (const job of releaseJobs) {
      expect(job.keys.get('timeout-minutes'), job.id).toMatch(/^\d+$/)
      expect(['ubuntu-24.04', 'windows-2025'], job.id).toContain(job.keys.get('runs-on'))
    }
  })

  it("the ci job runs no project code and waits on the commit's own CI run", () => {
    const job = releaseJob('ci')

    expect(job.keys.has('uses')).toBe(false)
    expect(job.steps.filter((step) => step.keys.has('uses'))).toEqual([])
    expect(permissionsOf(job)).toEqual(['actions: read'])
    expect(job.nested.get('permissions')?.[0]).toMatch(/ # \S/)

    const run = runs(job).join('\n')

    expect(run).toContain('gh run list --workflow ci.yml --commit "$GITHUB_SHA"')
    expect(run).toContain('gh run watch "$run_id" --exit-status')
    expect(ciText).not.toMatch(/\bworkflow_call\b/)
  })

  it('the build job packages the exe and checks it with read-only rights', () => {
    const job = releaseJob('build')

    expect(job.keys.get('needs')).toBe('ci')
    expect(job.keys.get('runs-on')).toBe('windows-2025')
    expect(permissionsOf(job)).toEqual(['contents: read'])

    const setups = job.steps.filter(isSetupNode)

    expect(setups).toHaveLength(1)
    expect(setups[0].nested).toContain('node-version-file: package.json')
    expect(setups[0].nested).toContain('package-manager-cache: false')
    expect(job.steps.flatMap((step) => step.nested).filter((line) => /^cache:/.test(line))).toEqual(
      []
    )
    expect(releaseText).not.toMatch(/\bnode-version:/)

    const installs = runs(job).filter((line) => /\bnpm ci\b/.test(line))

    expect(installs).toEqual(['npm ci --ignore-scripts'])

    const pack = indexOfRun(job, /^npm run package:win$/)
    const policy = indexOfRun(job, /^node scripts\/ci-policy\.mjs package /)
    const fuses = indexOfRun(
      job,
      /^node scripts\/ci-policy\.mjs fuses dist\/win-unpacked\/mz-plugin-studio\.exe$/
    )
    const upload = job.steps.indexOf(stepNamed(job, 'Upload portable exe'))

    expect(pack).toBeGreaterThanOrEqual(0)
    expect(policy).toBeGreaterThan(pack)
    expect(fuses).toBeGreaterThan(policy)
    expect(stepNamed(job, 'Fuse wire')).toBe(job.steps[fuses])
    expect(upload).toBeGreaterThan(fuses)
  })

  it('only the publish job can write, and only on a pushed v tag', () => {
    const job = releaseJob('publish')

    expect(job.keys.get('needs')).toBe('build')
    expect(job.keys.get('if')).toContain("github.event_name == 'push'")
    expect(job.keys.get('if')).toContain("startsWith(github.ref, 'refs/tags/v')")

    const writers = releaseJobs.filter((each) => permissionsOf(each).includes('contents: write'))

    expect(writers.map((each) => each.id)).toEqual(['publish'])
    expect(job.nested.get('permissions')?.[0]).toMatch(/ # \S/)
  })

  it('the publish job runs no project code', () => {
    const lines = releaseJob('publish').steps.flatMap((step) => [
      ...step.keys.values(),
      ...step.nested
    ])

    expect(lines.length).toBeGreaterThan(0)
    expect(lines.filter((line) => /\bnpm\b|\bnpx\b|\bnode /.test(line))).toEqual([])
  })

  it('an empty changelog section fails the release instead of shipping fallback notes', () => {
    const job = releaseJob('publish')
    const notes = stepNamed(job, 'Extract changelog').run

    expect(notes).toContain('exit 1')
    expect(notes.filter((line) => /^echo .*>\s*release-notes\.md/.test(line))).toEqual([])
    expect(notes.join('\n')).not.toContain('for details')

    const publish = stepNamed(job, 'Publish release').run

    expect(publish.filter((line) => /^gh release create .*--verify-tag/.test(line))).toHaveLength(1)
  })

  it('publishing still keeps only the latest two releases', () => {
    const job = releaseJob('publish')
    const publish = job.steps.indexOf(stepNamed(job, 'Publish release'))
    const cleanup = stepNamed(job, 'Clean up old releases (keep latest 2)')

    expect(job.steps.indexOf(cleanup)).toBeGreaterThan(publish)
    expect(cleanup.run.join('\n')).toContain('tail -n +3')
  })
})
