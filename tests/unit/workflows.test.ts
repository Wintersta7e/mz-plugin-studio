// Invariants of the CI and release workflows, read with the fixed-shape workflow reader.
import { readFileSync, readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  indexOfRun,
  readJobs as readWorkflow,
  runs,
  type Job,
  type Step
} from '../helpers/workflow-reader'

const join = (...parts: string[]): string => path.join(...parts)

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const WORKFLOWS = join(ROOT, '.github/workflows')
const readJobs = (file: string): Job[] => readWorkflow(join(WORKFLOWS, file))

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const packageData: unknown = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))
const packageScripts = isRecord(packageData) ? Reflect.get(packageData, 'scripts') : undefined
const scripts = isRecord(packageScripts) ? packageScripts : {}

function scriptOf(name: string): string {
  const script = scripts[name]
  if (typeof script !== 'string') throw new TypeError(`Missing package script: ${name}`)
  return script
}

const files = readdirSync(WORKFLOWS).toSorted((a, b) => a.localeCompare(b))
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

// A third-party action is pinned to a full commit SHA with its release in a comment. The
// workflow owns both values, so the tests check the shape and never restate them.
const PINNED_ACTION = /^([^\s@]+)@[0-9a-f]{40} # v\d+\.\d+\.\d+$/
const pinnedAction = (uses = ''): string | undefined => PINNED_ACTION.exec(uses)?.at(1)
const pinOf = (uses: string): string | undefined => uses.split('@', 2).at(1)
const codeqlUses = (job: Job | undefined): string[] =>
  (job?.steps ?? [])
    .map((step) => step.keys.get('uses') ?? '')
    .filter((uses) => uses.startsWith('github/codeql-action/'))

describe('ci workflow: inventory', () => {
  it('reads every job and step of every workflow', () => {
    const all = files.map((file) => readJobs(file))
    const jobCount = all.reduce((sum, each) => sum + each.length, 0)
    const stepCount = all.flat().reduce((sum, job) => sum + job.steps.length, 0)
    process.stdout.write(
      `workflows: files ${String(files.length)}, jobs ${String(jobCount)}, steps ${String(stepCount)}\n`
    )

    expect(files.length).toBeGreaterThan(0)
    expect(jobCount).toBeGreaterThan(0)
    expect(stepCount).toBeGreaterThan(0)
  })

  it('holds only the CI, release, mutation testing, supply-chain score and dependency review workflows', () => {
    expect(files).toStrictEqual([
      'ci.yml',
      'dependency-review.yml',
      'mutation.yml',
      'release.yml',
      'scorecard.yml'
    ])
  })

  it('the aggregate test job always runs and needs every other job', () => {
    const test = jobOf('test')

    expect(test.keys.get('if')).toBe('always()')

    const needs = /^\[(.*)\]$/.exec(test.keys.get('needs') ?? '')

    expect(needs).not.toBeNull()

    const needed = (needs?.[1] ?? '').split(',').map((id) => id.trim())
    const others = jobs.map((job) => job.id).filter((id) => id !== 'test')

    expect(needed.toSorted((a, b) => a.localeCompare(b))).toStrictEqual(
      others.toSorted((a, b) => a.localeCompare(b))
    )
  })

  it('every job has a timeout and a pinned runner image', () => {
    for (const job of jobs) {
      expect(job.keys.get('timeout-minutes')).toMatch(/^\d+$/)
      expect(['ubuntu-24.04', 'windows-2025']).toContain(job.keys.get('runs-on'))
    }
  })

  it('every install skips lifecycle scripts', () => {
    const installs = steps.flatMap((step) => step.run).filter((line) => /\bnpm ci\b/.test(line))

    expect(installs.length).toBeGreaterThan(0)

    for (const line of installs) expect(line).toBe('npm ci --ignore-scripts')
  })

  it('every setup-node reads the Node version from package.json engines', () => {
    const setups = steps.filter((step) => isSetupNode(step))

    expect(setups).toHaveLength(jobs.length)

    for (const step of setups) expect(step.nested).toContain('node-version-file: package.json')

    expect(ciText).not.toMatch(/\bnode-version:/)
    expect(ciText).not.toMatch(/\bactions\/cache\b/)
  })

  it('the static and unit jobs never fetch the Electron binary', () => {
    for (const id of ['static', 'unit']) {
      expect(runs(jobOf(id)).join('\n')).not.toMatch(/electron\/install\.js/)
    }
  })
})

describe('ci workflow: execution', () => {
  it('static then unit run every command of npm run check, in its order', () => {
    const ciRuns = [...jobOf('static').steps, ...jobOf('unit').steps]
      .flatMap((step) => step.run)
      .filter((line) => line.startsWith('npm run '))
    const checkRuns = scriptOf('check')
      .split('&&')
      .map((command) => command.trim())

    expect(checkRuns.length).toBeGreaterThan(0)

    let from = 0
    for (const command of checkRuns) {
      const at = ciRuns.indexOf(command, from)

      expect(at).toBeGreaterThanOrEqual(0)

      from = at + 1
    }

    expect(runs(jobOf('static'))).toContain('npm run ci:toolchain')
  })

  it('the unit job runs the golden project once besides the full suite, with coverage', () => {
    const golden = runs(jobOf('unit')).filter((line) => {
      const scriptName = /^npm run ([\w:-]+)$/.exec(line)?.at(1)
      return scriptName !== undefined && scriptOf(scriptName).includes('--project golden')
    })

    expect(golden).toStrictEqual(['npm run test:golden:coverage'])
  })

  it('the golden-commit rules run on every static run', () => {
    const golden = jobOf('static').steps.filter((step) =>
      step.run.some((line) => line.startsWith('node scripts/check-golden-commits.mjs'))
    )

    expect(golden).toHaveLength(1)
    expect(golden.at(0)?.keys.has('if')).toBe(false)
  })

  it('the ratchets compare the pushed range from its base, on a full clone', () => {
    const job = jobOf('static')
    const ratchets = job.steps.filter((step) => step.run.includes('npm run ratchets'))

    expect(ratchets).toHaveLength(1)
    expect(ratchets.at(0)?.nested).toStrictEqual([
      'RATCHETS_BASE: ${{ github.event.pull_request.base.sha || github.event.before }}'
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

describe('ci workflow: Windows unit job', () => {
  it('the Windows unit job runs the whole suite with no argument and a clean tree', () => {
    const job = byId.get('unit-win')
    const jobSteps = job?.steps ?? []
    const jobRuns = jobSteps.flatMap((step) => step.run)
    const suite = jobSteps.findIndex((step) => step.run.includes('npm test'))
    const clean = jobOf('unit').steps.find(
      (step) => step.keys.get('name') === 'Clean tree after tests'
    )

    expect(clean).toBeDefined()
    expect({
      runner: job?.keys.get('runs-on'),
      timeout: job?.keys.get('timeout-minutes'),
      isCheckoutWithoutCredentials:
        jobSteps.at(0)?.nested.includes('persist-credentials: false') === true,
      suiteRuns: jobRuns.filter((line) => /^npm (?:run )?test\b/.test(line)),
      stepAfterSuite: suite === -1 ? undefined : jobSteps.at(suite + 1),
      extras: jobRuns.filter((line) =>
        /electron\/install\.js|coverage|MZ_CORESCRIPT_DIR/.test(line)
      )
    }).toStrictEqual({
      runner: 'windows-2025',
      timeout: '20',
      isCheckoutWithoutCredentials: true,
      suiteRuns: ['npm test'],
      stepAfterSuite: clean,
      extras: []
    })
  })
})

// A run line that throws its command's failure away; a bare `exit 0` that ends a clean early
// return is not one
const DISCARDS_FAILURE = /\|\|\s*(?:true|:|exit 0)\s*(?:$|#)|\|\|\s*echo\b|;\s*exit 0\s*(?:$|#)/v
const doesDiscardFailure = (line: string): boolean => DISCARDS_FAILURE.test(line)
const doesContinueOnError = (keys: Map<string, string>): boolean =>
  (keys.get('continue-on-error') ?? 'false') !== 'false'

describe('workflows: a failed command fails its job', () => {
  it('no job or step continues on error and no run line discards a failure', () => {
    const all = files.flatMap((file) => readJobs(file).map((job) => ({ file, job })))
    const runLines = all.flatMap(({ file, job }) =>
      job.steps.flatMap((step) => step.run.map((line) => `${file} ${job.id}: ${line}`))
    )
    const continuing = all.flatMap(({ file, job }) => [
      ...(doesContinueOnError(job.keys) ? [`${file} ${job.id}`] : []),
      ...job.steps
        .filter((step) => doesContinueOnError(step.keys))
        .map((step) => `${file} ${job.id}: ${step.keys.get('name') ?? ''}`)
    ])
    process.stdout.write(
      `workflows: failure discarding scanned files ${String(files.length)}, run lines ${String(runLines.length)}\n`
    )

    expect(runLines.length).toBeGreaterThan(0)
    expect(runLines.filter((line) => doesDiscardFailure(line))).toStrictEqual([])
    expect(continuing).toStrictEqual([])
  })

  it('the scan catches every discarding form and passes a bare early exit', () => {
    const discarding = [
      'npm audit || true',
      'npm audit || :',
      'npm audit || exit 0',
      'npm audit; exit 0',
      'npm audit || echo "advisories found"',
      'npm audit || true # report only'
    ]
    const failing = ['exit 0', 'npm audit', 'test -n "$BASE" || exit 1', 'echo "a || b" > out.txt']

    expect(discarding.filter((line) => doesDiscardFailure(line))).toStrictEqual(discarding)
    expect(failing.filter((line) => doesDiscardFailure(line))).toStrictEqual([])
    expect(
      ['true', '${{ matrix.experimental }}', 'false'].map((value) =>
        doesContinueOnError(new Map([['continue-on-error', value]]))
      )
    ).toStrictEqual([true, true, false])
    expect(doesContinueOnError(new Map())).toBe(false)
  })
})

describe('ci workflow: changed lines coverage', () => {
  it('the unit job checks nine in ten changed source lines run under the suite', () => {
    const job = jobOf('unit')
    const coverage = indexOfRun(job, /^npm run test:coverage$/)
    const changed = job.steps.filter((step) => step.keys.get('name') === 'Changed lines coverage')
    const run = changed.at(0)?.run ?? []
    const script = run.join('\n')
    const requirements = run.filter((line) => /^[\w-]+==/.test(line))
    const vitestConfig = readFileSync(join(ROOT, 'vitest.config.ts'), 'utf8')

    expect(changed).toHaveLength(1)
    expect({
      afterSuite: coverage >= 0 && job.steps.findIndex((step) => changed.includes(step)) > coverage,
      fullClone: job.steps.at(0)?.nested.includes('fetch-depth: 0'),
      base: changed
        .at(0)
        ?.nested.includes(
          'DIFF_COVER_BASE: ${{ github.event.pull_request.base.sha || github.event.before }}'
        ),
      lcov: /reporter: \[[^\]]*'lcovonly'/.test(vitestConfig),
      pinned: requirements.some((line) => line.startsWith('diff-cover==11.0.0 ')),
      unhashed: requirements.filter(
        (line) => !/^[\w-]+==[\w.]+ --hash=sha256:[0-9a-f]{64}$/.test(line)
      ),
      hashedInstall: script.includes(
        'pip" install --quiet --require-hashes --only-binary=:all: -r '
      ),
      mergeBase: run.includes('base="$(git merge-base HEAD origin/main)"'),
      srcOnly: script.includes('git diff --name-only "$base" HEAD -- src'),
      floor: script.includes(
        'diff-cover" coverage/lcov.info --compare-branch="$base" --fail-under=90 '
      ),
      measuredLines: run.includes(
        'node scripts/ci-policy.mjs diff-coverage coverage/lcov.info "$RUNNER_TEMP/diff-cover.json"'
      )
    }).toStrictEqual({
      afterSuite: true,
      fullClone: true,
      base: true,
      lcov: true,
      pinned: true,
      unhashed: [],
      hashedInstall: true,
      mergeBase: true,
      srcOnly: true,
      floor: true,
      measuredLines: true
    })
  })
})

describe('ci workflow: CodeQL', () => {
  it('the codeql job may read the code and actions and write only security events', () => {
    const job = jobOf('codeql')

    expect({
      runner: job.keys.get('runs-on'),
      timeout: job.keys.get('timeout-minutes'),
      permissions: job.nested.get('permissions')
    }).toStrictEqual({
      runner: 'ubuntu-24.04',
      timeout: '20',
      permissions: ['actions: read', 'contents: read', 'security-events: write']
    })
  })

  it('the codeql job analyses with the extended security queries from one pinned release', () => {
    const job = jobOf('codeql')
    const codeqlSteps = job.steps.filter((step) =>
      (step.keys.get('uses') ?? '').startsWith('github/codeql-action/')
    )
    const uses = codeqlUses(job)

    expect({
      actions: uses.map((line) => pinnedAction(line)),
      oneSha: new Set(uses.map((line) => pinOf(line))).size,
      init: codeqlSteps.at(0)?.nested,
      analyze: codeqlSteps.at(1)?.nested
    }).toStrictEqual({
      actions: ['github/codeql-action/init', 'github/codeql-action/analyze'],
      oneSha: 1,
      init: [
        'languages: javascript-typescript, actions',
        'build-mode: none',
        'queries: security-extended'
      ],
      analyze: ['output: ${{ runner.temp }}/codeql']
    })
  })

  it('the codeql job fails on any result in the SARIF files it wrote', () => {
    const job = jobOf('codeql')
    const analyze = job.steps.findIndex((step) =>
      (step.keys.get('uses') ?? '').startsWith('github/codeql-action/analyze@')
    )
    const count = indexOfRun(job, /^node scripts\/ci-policy\.mjs codeql "\$RUNNER_TEMP\/codeql"$/)

    expect({ analyzeFound: analyze !== -1, countAfterAnalyze: count > analyze }).toStrictEqual({
      analyzeFound: true,
      countAfterAnalyze: true
    })
    expect(job.steps.at(count)?.keys.has('if')).toBe(false)
  })
})

describe('supply-chain score workflow', () => {
  it('scores the repository weekly and on main, keeping the result private to code scanning', () => {
    const [job, ...others] = readJobs('scorecard.yml')
    const text = readFileSync(join(WORKFLOWS, 'scorecard.yml'), 'utf8')
    const usesOf = (prefix: string): Step | undefined =>
      job?.steps.find((step) => (step.keys.get('uses') ?? '').startsWith(prefix))
    const scorecard = usesOf('ossf/scorecard-action@')
    const upload = usesOf('github/codeql-action/upload-sarif@')
    const codeqlPins = [...codeqlUses(jobOf('codeql')), ...codeqlUses(job)].map((line) =>
      pinOf(line)
    )

    expect(others).toStrictEqual([])
    expect({
      triggers:
        /^on:\n {2}push:\n {4}branches: \[main\]\n {2}schedule:\n {4}- cron: '[\d *]+'\n {2}branch_protection_rule:\n {2}workflow_dispatch:\n\n/mv.test(
          text
        ),
      readAll: /^permissions: read-all$/mv.test(text),
      jobPermissions: job?.nested.get('permissions'),
      noCredentials: job?.steps.at(0)?.nested.includes('persist-credentials: false'),
      scorecard: pinnedAction(scorecard?.keys.get('uses')),
      scorecardInputs: scorecard?.nested,
      upload: pinnedAction(upload?.keys.get('uses')),
      uploadInputs: upload?.nested,
      codeqlReleases: new Set(codeqlPins).size,
      token: /\b(?:repo_token|secrets\.)/v.test(text)
    }).toStrictEqual({
      triggers: true,
      readAll: true,
      jobPermissions: ['actions: read', 'contents: read', 'security-events: write'],
      noCredentials: true,
      scorecard: 'ossf/scorecard-action',
      scorecardInputs: [
        'results_file: results.sarif',
        'results_format: sarif',
        'publish_results: false'
      ],
      upload: 'github/codeql-action/upload-sarif',
      uploadInputs: ['sarif_file: results.sarif', 'category: scorecard'],
      codeqlReleases: 1,
      token: false
    })
  })
})

describe('dependency review workflow', () => {
  it('fails a pull request to main that adds a dependency with any known advisory', () => {
    const [job, ...others] = readJobs('dependency-review.yml')
    const text = readFileSync(join(WORKFLOWS, 'dependency-review.yml'), 'utf8')

    expect(others).toStrictEqual([])
    expect({
      triggers: /^on:\n {2}pull_request:\n {4}branches: \[main\]\n\n/mv.test(text),
      readOnly: /^permissions:\n {2}contents: read$/mv.test(text),
      jobPermissions: job?.nested.has('permissions'),
      steps: job?.steps.map((step) => step.keys.get('uses')),
      inputs: job?.steps.at(0)?.nested
    }).toStrictEqual({
      triggers: true,
      readOnly: true,
      jobPermissions: false,
      steps: ['actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294 # v5.0.0'],
      inputs: [
        'fail-on-severity: low',
        'fail-on-scopes: runtime, development, unknown',
        'comment-summary-in-pr: never'
      ]
    })
  })
})

describe('mutation testing workflow', () => {
  it('runs weekly and by hand on the changed source, apart from the CI it would slow down', () => {
    const [job, ...others] = readJobs('mutation.yml')
    const text = readFileSync(join(WORKFLOWS, 'mutation.yml'), 'utf8')
    const run = job === undefined ? [] : runs(job)

    expect(others).toStrictEqual([])
    expect({
      triggers: /^on:\n {2}schedule:\n {4}- cron: '[\d *]+'\n {2}workflow_dispatch:\n\n/mv.test(
        text
      ),
      readOnly: /^permissions:\n {2}contents: read$/mv.test(text),
      fullClone: job?.steps.at(0)?.nested.includes('fetch-depth: 0'),
      noCache: job?.steps.some((step) => step.nested.includes('package-manager-cache: false')),
      install: run.filter((line) => /\bnpm ci\b/v.test(line)),
      weekBase: run.includes('base="$(git rev-list -n 1 --before=\'7 days ago\' HEAD)"'),
      branchBase: run.includes('base="$(git merge-base HEAD origin/main)"'),
      mutation: run.includes('npm run mutation -- --since "$base"'),
      gatesCi: jobs.some((each) => runs(each).some((line) => line.includes('npm run mutation')))
    }).toStrictEqual({
      triggers: true,
      readOnly: true,
      fullClone: true,
      noCache: true,
      install: ['npm ci --ignore-scripts'],
      weekBase: true,
      branchBase: true,
      mutation: true,
      gatesCi: false
    })
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

describe('release workflow: preparation', () => {
  it('waits for CI, builds, then publishes', () => {
    expect(releaseJobs.map((job) => job.id)).toStrictEqual(['ci', 'build', 'publish'])
    expect(releaseText).toMatch(/^permissions:\n {2}contents: read$/m)

    for (const job of releaseJobs) {
      expect(job.keys.get('timeout-minutes')).toMatch(/^\d+$/)
      expect(['ubuntu-24.04', 'windows-2025']).toContain(job.keys.get('runs-on'))
    }
  })

  it("the ci job runs no project code and waits on the commit's own CI run", () => {
    const job = releaseJob('ci')

    expect({
      reusable: job.keys.has('uses'),
      actionSteps: job.steps.filter((step) => step.keys.has('uses')),
      permissions: permissionsOf(job),
      permissionComment: / # \S/.test(job.nested.get('permissions')?.at(0) ?? '')
    }).toStrictEqual({
      reusable: false,
      actionSteps: [],
      permissions: ['actions: read'],
      permissionComment: true
    })

    const run = runs(job).join('\n')

    expect(run).toContain('gh run list --workflow ci.yml --commit "$GITHUB_SHA"')
    expect(run).toContain('gh run watch "$run_id" --exit-status')
    expect(ciText).not.toMatch(/\bworkflow_call\b/)
  })

  it('the build job packages the exe and checks it with read-only rights', () => {
    const job = releaseJob('build')
    const setups = job.steps.filter((step) => isSetupNode(step))
    const installs = runs(job).filter((line) => /\bnpm ci\b/.test(line))
    const pack = indexOfRun(job, /^npm run package:win$/)
    const policy = indexOfRun(job, /^node scripts\/ci-policy\.mjs package /)
    const fuses = indexOfRun(
      job,
      /^node scripts\/ci-policy\.mjs fuses dist\/win-unpacked\/mz-plugin-studio\.exe$/
    )
    const upload = job.steps.indexOf(stepNamed(job, 'Upload release assets'))

    expect({
      needs: job.keys.get('needs'),
      runner: job.keys.get('runs-on'),
      permissions: permissionsOf(job)
    }).toStrictEqual({ needs: 'ci', runner: 'windows-2025', permissions: ['contents: read'] })
    expect({
      setupCount: setups.length,
      nodeFile: setups.at(0)?.nested.includes('node-version-file: package.json'),
      cacheDisabled: setups.at(0)?.nested.includes('package-manager-cache: false'),
      cacheLines: job.steps
        .flatMap((step) => step.nested)
        .filter((line) => line.startsWith('cache:')),
      nodeVersionInRelease: /\bnode-version:/.test(releaseText),
      installs
    }).toStrictEqual({
      setupCount: 1,
      nodeFile: true,
      cacheDisabled: true,
      cacheLines: [],
      nodeVersionInRelease: false,
      installs: ['npm ci --ignore-scripts']
    })
    expect({
      packFound: pack >= 0,
      policyAfterPack: policy > pack,
      fusesAfterPolicy: fuses > policy,
      fuseStepMatches: stepNamed(job, 'Fuse wire') === job.steps.at(fuses),
      uploadAfterFuses: upload > fuses
    }).toStrictEqual({
      packFound: true,
      policyAfterPack: true,
      fusesAfterPolicy: true,
      fuseStepMatches: true,
      uploadAfterFuses: true
    })
  })
})

describe('release workflow: publishing', () => {
  it('only the publish job can write, and only on a pushed v tag', () => {
    const job = releaseJob('publish')

    expect(job.keys.get('needs')).toBe('build')
    expect(job.keys.get('if')).toContain("github.event_name == 'push'")
    expect(job.keys.get('if')).toContain("startsWith(github.ref, 'refs/tags/v')")

    const writers = releaseJobs.filter((each) => permissionsOf(each).includes('contents: write'))

    expect(writers.map((each) => each.id)).toStrictEqual(['publish'])
    expect(job.nested.get('permissions')?.[0]).toMatch(/ # \S/)
  })

  it('the publish job runs no project code', () => {
    const lines = releaseJob('publish').steps.flatMap((step) => [
      ...step.keys.values(),
      ...step.nested
    ])

    expect(lines.length).toBeGreaterThan(0)
    expect(lines.filter((line) => /\bnpm\b|\bnpx\b|\bnode /.test(line))).toStrictEqual([])
  })

  it('an empty changelog section fails the release instead of shipping fallback notes', () => {
    const job = releaseJob('publish')
    const notes = stepNamed(job, 'Extract changelog').run

    expect(notes).toContain('exit 1')
    expect(notes.filter((line) => /^echo .*>\s*release-notes\.md/.test(line))).toStrictEqual([])
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

const attestSteps = (job: Job): Step[] =>
  job.steps.filter((step) => (step.keys.get('uses') ?? '').startsWith('actions/attest-'))

describe('release workflow: checksums and SBOM', () => {
  it('the build job hashes the exe and its SBOM and hands exactly those three files on', () => {
    const job = releaseJob('build')
    const fuses = job.steps.indexOf(stepNamed(job, 'Fuse wire'))
    const sbom = stepNamed(job, 'Software bill of materials')
    const sums = stepNamed(job, 'Checksums')
    const upload = stepNamed(job, 'Upload release assets')

    expect({
      sbom: sbom.run,
      sbomAfterFuses: job.steps.indexOf(sbom) > fuses,
      sums: sums.run,
      sumsDirectory: sums.keys.get('working-directory'),
      sumsAfterSbom: job.steps.indexOf(sums) > job.steps.indexOf(sbom),
      uploadAfterSums: job.steps.indexOf(upload) > job.steps.indexOf(sums),
      upload: upload.nested
    }).toStrictEqual({
      sbom: ['node scripts/third-party-licenses.mjs --sbom dist/sbom.cdx.json'],
      sbomAfterFuses: true,
      sums: ['sha256sum -- *-portable.exe sbom.cdx.json > SHA256SUMS', 'cat SHA256SUMS'],
      sumsDirectory: 'dist',
      sumsAfterSbom: true,
      uploadAfterSums: true,
      upload: [
        'name: release-assets',
        'path: |',
        'dist/*-portable.exe',
        'dist/sbom.cdx.json',
        'dist/SHA256SUMS',
        'if-no-files-found: error'
      ]
    })
  })

  it('the release carries the checked exe, its checksums and its SBOM, and nothing else', () => {
    const job = releaseJob('publish')
    const download = job.steps.find((step) =>
      (step.keys.get('uses') ?? '').startsWith('actions/download-artifact@')
    )
    const assets = stepNamed(job, 'Check the release assets')
    const create = stepNamed(job, 'Publish release').run.join('\n')

    expect({
      download: download?.nested,
      checkId: assets.keys.get('id'),
      verified: assets.run.includes('(cd dist && sha256sum --check --strict SHA256SUMS)'),
      output: assets.run.includes('echo "exe=${ASSET}" >> "$GITHUB_OUTPUT"'),
      assetsOfRelease: /--notes-file release-notes\.md \\\n(.*)$/v.exec(create)?.at(1),
      assetFromCheck: stepNamed(job, 'Publish release').nested.includes(
        'ASSET: ${{ steps.assets.outputs.exe }}'
      )
    }).toStrictEqual({
      download: ['name: release-assets', 'path: dist'],
      checkId: 'assets',
      verified: true,
      output: true,
      assetsOfRelease: '"$ASSET" dist/SHA256SUMS dist/sbom.cdx.json',
      assetFromCheck: true
    })
  })
})

describe('release workflow: attestations', () => {
  it('only the publish job attests, the exe and its SBOM, before the release exists', () => {
    const job = releaseJob('publish')
    const [provenance, sbom] = attestSteps(job)
    const create = job.steps.indexOf(stepNamed(job, 'Publish release'))

    expect({
      attestingJobs: releaseJobs
        .filter((each) => attestSteps(each).length > 0)
        .map((each) => each.id),
      signingJobs: releaseJobs
        .filter((each) =>
          permissionsOf(each).some((line) => /^(?:id-token|attestations): write$/v.test(line))
        )
        .map((each) => each.id),
      permissions: permissionsOf(job),
      provenance: pinnedAction(provenance?.keys.get('uses')),
      provenanceInputs: provenance?.nested,
      sbom: pinnedAction(sbom?.keys.get('uses')),
      sbomInputs: sbom?.nested,
      beforeRelease: [provenance, sbom].every(
        (step) => step !== undefined && job.steps.indexOf(step) < create
      )
    }).toStrictEqual({
      attestingJobs: ['publish'],
      signingJobs: ['publish'],
      permissions: ['contents: write', 'id-token: write', 'attestations: write'],
      provenance: 'actions/attest-build-provenance',
      provenanceInputs: ['subject-path: ${{ steps.assets.outputs.exe }}'],
      sbom: 'actions/attest-sbom',
      sbomInputs: [
        'subject-path: ${{ steps.assets.outputs.exe }}',
        'sbom-path: dist/sbom.cdx.json'
      ],
      beforeRelease: true
    })
  })
})
