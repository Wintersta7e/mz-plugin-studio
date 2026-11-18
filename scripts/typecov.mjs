// Runs the type coverage of every TypeScript program, from the repository root. The programs are
// the configs the root tsconfig.json references, in its order (this file owns that list; tests read
// it here); each runs through its `typecov:<program>` npm script, which fails below 100 % with
// `--at-least 100`, half the available cores at a time. Prints each program's
// `(covered / total) pct%` and `typecov programs N`; fails when a run fails, prints no summary or
// counts no identifier, or when tsconfig.json references no program. A failed run prints how it
// ended, how many bytes it printed and its last lines.
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdtemp, open, rm } from 'node:fs/promises'
import { availableParallelism, tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const OUTPUT_TAIL = 20
const SUMMARY = /\((?<covered>\d+) \/ (?<total>\d+)\) (?<pct>[\d.]+)%/v

/**
@param {string} line
*/
const print = (line) => process.stdout.write(`${line}\n`)
/**
@param {unknown} value
@param {string} key
@returns {unknown}
*/
const member = (value, key) =>
  typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
/**
@param {unknown} value
@returns {value is unknown[]}
*/
const isList = (value) => Array.isArray(value)

// `tsconfig.node.json` is the program `node`; a folder's own `tools/tsconfig.json` is `tools`.
/**
@param {string} config
*/
const nameOf = (config) => {
  const base = path.posix.basename(config)
  return base === 'tsconfig.json'
    ? path.posix.basename(path.posix.dirname(config))
    : base.replace(/^tsconfig\.(?<name>.+)\.json$/v, '$<name>')
}

/**
The TypeScript programs: each config the root tsconfig.json references, relative to `root`.
@param {string} root
@returns {{ name: string, config: string }[]}
*/
export function typeScriptPrograms(root) {
  /**
  @type {unknown}
  */
  const parsed = JSON.parse(readFileSync(path.join(root, 'tsconfig.json'), 'utf8'))
  const references = member(parsed, 'references')
  if (!isList(references)) throw new Error('tsconfig.json: no references')
  return references.map((reference) => {
    const target = member(reference, 'path')
    if (typeof target !== 'string') throw new TypeError('tsconfig.json: a reference without a path')
    const config = path.posix.normalize(target)
    return { name: nameOf(config), config }
  })
}

/**
Runs an npm script and returns what it printed on both streams, in order, and how it ended. The
child writes into a regular file, not a pipe: a process that exits right after printing (as
type-coverage does on a failure) drops the output a pipe has not taken yet, so a slow reader lost
the summary line; a file write completes before the child can exit.
@param {string} script
@returns {Promise<{ status: number | undefined, out: string, bytes: number, ending: string }>}
*/
async function npmRun(script) {
  const npm = process.env['npm_execpath']
  const [command, args] = npm === undefined ? ['npm', []] : [process.execPath, [npm]]
  const directory = await mkdtemp(path.join(tmpdir(), 'typecov-run-'))
  const file = path.join(directory, 'output')
  try {
    // Read back through the handle the child wrote to, never the path a second time
    const handle = await open(file, 'w+')
    try {
      /**
      @type {{ status: number | undefined, ending: string }}
      */
      const end = await new Promise((resolve) => {
        const child = spawn(command, [...args, 'run', '-s', script], {
          stdio: ['ignore', handle.fd, handle.fd]
        })
        child.on('error', (error) => resolve({ status: undefined, ending: error.message }))
        child.on('close', (status, signal) =>
          resolve({ status: status ?? undefined, ending: signal ?? `exit ${String(status)}` })
        )
      })
      const { size } = await handle.stat()
      const { bytesRead, buffer } = await handle.read(Buffer.alloc(size), 0, size, 0)
      return { ...end, out: buffer.toString('utf8', 0, bytesRead), bytes: bytesRead }
    } finally {
      await handle.close()
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

/**
Runs `task` on each item, at most `jobs` at a time; the results keep the items' order.
@template T, R
@param {T[]} items
@param {number} jobs
@param {(item: T) => Promise<R>} task
@returns {Promise<R[]>}
*/
async function inParallel(items, jobs, task) {
  /**
  @type {R[]}
  */
  const results = []
  const queue = items.map((item, index) => ({ item, index }))
  const worker = async () => {
    for (let entry = queue.shift(); entry !== undefined; entry = queue.shift()) {
      results[entry.index] = await task(entry.item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, worker))
  return results
}

/**
Whether a program's run passed; prints its summary, or why it failed and its last lines.
@param {string} name
@param {{ status: number | undefined, out: string, bytes: number, ending: string }} run
*/
function reportRun(name, run) {
  const label = `typecov ${name}`
  const { covered = '', total = '0', pct = '' } = SUMMARY.exec(run.out)?.groups ?? {}
  const isCounted = Number(total) > 0
  if (isCounted) print(`${label}: (${covered} / ${total}) ${pct}%`)
  if (isCounted && run.status === 0) return true
  const reason = isCounted ? 'the run failed' : 'no summary or nothing scanned'
  print(`${label}: ${reason} (${run.ending}, ${String(run.bytes)} bytes received)`)
  const lines = run.out.split('\n').filter((line) => line.trim() !== '')
  const tail = lines.slice(-OUTPUT_TAIL)
  for (const line of tail) print(`${label} | ${line}`)
  return false
}

async function runCommandLine() {
  const programs = typeScriptPrograms(process.cwd())
  const jobs = Math.max(1, Math.floor(availableParallelism() / 2))
  const runs = await inParallel(programs, jobs, async ({ name }) => ({
    name,
    run: await npmRun(`typecov:${name}`)
  }))
  const passed = runs.map(({ name, run }) => reportRun(name, run))
  print(`typecov programs ${String(programs.length)}`)
  process.exitCode = programs.length > 0 && passed.every(Boolean) ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runCommandLine()
}
