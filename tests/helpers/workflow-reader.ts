// Reads a GitHub workflow with a fixed-shape line reader: jobs at two spaces under `jobs:`, job
// keys at four, steps at `      - `, step keys at eight. A line of any other shape fails the
// read, so a reformatted workflow cannot pass by being misread.
import { readFileSync } from 'node:fs'
import path from 'node:path'

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
const JOB_NESTED = ' '.repeat(6)
const STEP_NESTED = ' '.repeat(10)

interface Reading {
  jobs: Job[]
  job: Job | undefined
  step: Step | undefined
  isInSteps: boolean
  lastStepKey: string
}

/**
The key and the value of a matched key line; the value is undefined when the line holds none
*/
function keyOf(match: RegExpExecArray): [string, string | undefined] {
  const key = match.at(1)
  if (key === undefined) throw new Error(`no key in ${match[0]}`)
  return [key, match.at(2)]
}

function addStepKey(
  reading: Reading,
  step: Step,
  [key, value]: [string, string | undefined]
): void {
  step.keys.set(key, value ?? '')
  reading.lastStepKey = key
  if (key === 'run' && value !== undefined && value !== '|') step.run.push(value)
}

/**
Reads one line of a job into `reading`; the reason when the line has no shape the reader knows
*/
function readJobLine(reading: Reading, job: Job, line: string): string | undefined {
  const jobKey = JOB_KEY.exec(line)
  if (jobKey !== null) {
    const [key, value = ''] = keyOf(jobKey)
    job.keys.set(key, value)
    reading.isInSteps = key === 'steps'
    reading.step = undefined
    return undefined
  }
  const stepStart = STEP.exec(line)
  if (stepStart !== null && reading.isInSteps) {
    const step: Step = { keys: new Map(), nested: [], run: [] }
    reading.step = step
    job.steps.push(step)
    addStepKey(reading, step, keyOf(stepStart))
    return undefined
  }
  const { step } = reading
  const stepKey = STEP_KEY.exec(line)
  if (step !== undefined && stepKey !== null) {
    addStepKey(reading, step, keyOf(stepKey))
  } else if (step !== undefined && line.startsWith(STEP_NESTED)) {
    step.nested.push(line.trim())
    if (reading.lastStepKey === 'run') step.run.push(line.trim())
  } else if (!reading.isInSteps && line.startsWith(JOB_NESTED)) {
    const key = job.keys.keys().toArray().at(-1) ?? ''
    job.nested.set(key, [...(job.nested.get(key) ?? []), line.trim()])
  } else {
    return 'unreadable line'
  }
  return undefined
}

/**
Reads one line under `jobs:` into `reading`; the reason when it cannot be read
*/
function readLine(reading: Reading, line: string): string | undefined {
  const jobStart = JOB.exec(line)
  if (jobStart !== null) {
    const [id] = keyOf(jobStart)
    const job: Job = { id, keys: new Map(), nested: new Map(), steps: [] }
    reading.job = job
    reading.jobs.push(job)
    reading.step = undefined
    reading.isInSteps = false
    return undefined
  }
  return reading.job === undefined
    ? 'line before the first job'
    : readJobLine(reading, reading.job, line)
}

/**
@param workflowPath the workflow file
*/
export function readJobs(workflowPath: string): Job[] {
  const file = path.basename(workflowPath)
  const lines = readFileSync(workflowPath, 'utf8').split(/\r?\n/)
  const start = lines.indexOf('jobs:')
  if (start === -1) throw new Error(`${file}: no jobs: line`)
  const reading: Reading = {
    jobs: [],
    job: undefined,
    step: undefined,
    isInSteps: false,
    lastStepKey: ''
  }
  for (const [index, line] of lines.entries()) {
    if (index <= start || line.trim() === '') continue
    if (/^\S/.test(line)) break
    const problem = readLine(reading, line)
    if (problem !== undefined) throw new Error(`${file}:${String(index + 1)}: ${problem}: ${line}`)
  }
  for (const each of reading.jobs) {
    if (each.steps.length === 0) throw new Error(`${file}: job ${each.id} has no steps`)
  }
  return reading.jobs
}

/**
The command lines of every step of `job`
*/
export const runs = (job: Job): string[] => job.steps.flatMap((step) => step.run)

/**
The index of the first step of `job` with a command line matching `pattern`, else -1
*/
export const indexOfRun = (job: Job, pattern: RegExp): number =>
  job.steps.findIndex((step) => step.run.some((line) => pattern.test(line)))
