// Reads a GitHub workflow with a fixed-shape line reader: jobs at two spaces under `jobs:`, job
// keys at four, steps at `      - `, step keys at eight. A line of any other shape fails the
// read, so a reformatted workflow cannot pass by being misread.
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

export interface Step {
  keys: Map<string, string>
  // Trimmed lines nested under the step's keys (with:, env:, a `run: |` block)
  nested: string[]
  // The command lines of `run:`, one for a single-line run
  run: string[]
}

export interface Job {
  id: string
  keys: Map<string, string>
  // Trimmed lines nested under each job key other than steps: (permissions:, container:)
  nested: Map<string, string[]>
  steps: Step[]
}

const JOB = /^ {2}([\w-]+):$/
const JOB_KEY = /^ {4}([\w-]+):(?: (.*))?$/
const STEP = /^ {6}- ([\w-]+):(?: (.*))?$/
const STEP_KEY = /^ {8}([\w-]+):(?: (.*))?$/

/** @param path the workflow file */
export function readJobs(path: string): Job[] {
  const file = basename(path)
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  const start = lines.indexOf('jobs:')
  if (start === -1) throw new Error(`${file}: no jobs: line`)
  const jobs: Job[] = []
  let job: Job | undefined
  let step: Step | undefined
  let isInSteps = false
  let lastStepKey = ''
  const fail = (n: number, why: string): never => {
    throw new Error(`${file}:${n + 1}: ${why}: ${lines[n]}`)
  }
  const addStepKey = (key: string, value: string | undefined): void => {
    if (!step) return
    step.keys.set(key, value ?? '')
    lastStepKey = key
    if (key === 'run' && value !== undefined && value !== '|') step.run.push(value)
  }

  for (let n = start + 1; n < lines.length; n++) {
    const line = lines[n]
    if (line.trim() === '') continue
    if (/^\S/.test(line)) break
    let match: RegExpExecArray | null
    if ((match = JOB.exec(line))) {
      job = { id: match[1], keys: new Map(), nested: new Map(), steps: [] }
      jobs.push(job)
      step = undefined
      isInSteps = false
    } else if (!job) {
      fail(n, 'line before the first job')
    } else if ((match = JOB_KEY.exec(line))) {
      job.keys.set(match[1], match[2] ?? '')
      isInSteps = match[1] === 'steps'
      step = undefined
    } else if (isInSteps && (match = STEP.exec(line))) {
      step = { keys: new Map(), nested: [], run: [] }
      job.steps.push(step)
      addStepKey(match[1], match[2])
    } else if (step && (match = STEP_KEY.exec(line))) {
      addStepKey(match[1], match[2])
    } else if (step && /^ {10}/.test(line)) {
      step.nested.push(line.trim())
      if (lastStepKey === 'run') step.run.push(line.trim())
    } else if (!isInSteps && /^ {6}/.test(line)) {
      const key = [...job.keys.keys()].at(-1) ?? ''
      job.nested.set(key, [...(job.nested.get(key) ?? []), line.trim()])
    } else {
      fail(n, 'unreadable line')
    }
  }
  for (const each of jobs) {
    if (each.steps.length === 0) throw new Error(`${file}: job ${each.id} has no steps`)
  }
  return jobs
}

/** The command lines of every step of `job` */
export const runs = (job: Job): string[] => job.steps.flatMap((step) => step.run)

/** The index of the first step of `job` with a command line matching `pattern`, else -1 */
export const indexOfRun = (job: Job, pattern: RegExp): number =>
  job.steps.findIndex((step) => step.run.some((line) => pattern.test(line)))
