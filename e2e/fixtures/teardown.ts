// Ends a launched app and deletes its folders. Imports no test library, so the unit suite calls
// the same functions the fixtures do; each takes the platform, the process list, the program
// runner and the retry bound as an optional last argument, defaulting to this machine's.
import { execFile, type ChildProcess } from 'node:child_process'
import {
  closeSync,
  openSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  statSync
} from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

// How long teardown lets the app close itself before it kills the process tree, and how long
// the killed tree may take to go
export const TEARDOWN_BOUND_MS = 10_000

// How long a folder Windows refused to delete is retried: above the longest hold measured on a
// Windows runner, 25 s
export const RETRY_BOUND_MS = 30_000
const RETRY_STEP_MS = 100

export interface ProcessRecord {
  pid: number
  ppid: number
  name: string
  executablePath: string | undefined
  commandLine: string | undefined
}

/**
Runs `file` with `args` and hands its standard output to `done`, with no error when it exited 0
*/
export type RunFile = (
  file: string,
  args: readonly string[],
  done: (error: Error | undefined, stdout: string) => void
) => void

export interface TeardownOptions {
  platform?: NodeJS.Platform
  execFile?: RunFile
  processes?: () => Promise<ProcessRecord[]>
  // A process started from below one of these folders is named as a holder
  appDirectories?: readonly string[]
  retryBoundMs?: number
  // Where the diagnostic lines go, one call per line
  print?: (line: string) => void
  // The rename the lock probe tries, and undoes, on every entry
  rename?: (from: string, to: string) => void
}

const printLine = (line: string): void => {
  process.stdout.write(`${line}\n`)
}

const runFile: RunFile = (file, args, done) => {
  execFile(file, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, (error, stdout) => {
    done(error ?? undefined, stdout)
  })
}

const valueOf = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined

// The code of a failed system call, undefined for any other error
const codeOf = (error: unknown): unknown => valueOf(error, 'code')

/**
True when `target` is `root` or lies below it
*/
export function isWithin(target: string, root: string): boolean {
  const fromRoot = path.relative(root, target)
  return !fromRoot.startsWith('..') && !path.isAbsolute(fromRoot)
}

/**
True until the child exited or a signal ended it
*/
export function isRunning(child: ChildProcess): boolean {
  return child.exitCode === null && child.signalCode === null
}

/**
Whether any process of the tree is left; on Linux the tree is the launch's process group
*/
function isTreeAlive(pid: number, platform: NodeJS.Platform): boolean {
  try {
    process.kill(platform === 'win32' ? pid : -pid, 0)
    return true
  } catch (error) {
    return codeOf(error) === 'EPERM'
  }
}

/**
Kills a launched app's whole process tree and waits until it is gone. On Windows `taskkill`
runs only while the child runs: once it exited, its PID may already name another process.
*/
export async function killTree(child: ChildProcess, options: TeardownOptions = {}): Promise<void> {
  const { platform = process.platform, execFile: run = runFile } = options
  const { pid } = child
  if (pid === undefined) return
  if (platform === 'win32') {
    if (isRunning(child)) {
      // taskkill exits non-zero once the tree is already gone
      await new Promise<void>((resolve) => {
        run('taskkill', ['/T', '/F', '/PID', String(pid)], () => {
          resolve()
        })
      })
    }
  } else if (isTreeAlive(pid, platform)) {
    // The app is started detached, so its pid leads its own process group
    try {
      process.kill(-pid, 'SIGKILL')
    } catch (error) {
      if (codeOf(error) !== 'ESRCH') throw error
    }
  }
  const deadline = Date.now() + TEARDOWN_BOUND_MS
  while (isTreeAlive(pid, platform)) {
    if (Date.now() > deadline)
      throw new Error(`process tree ${String(pid)} still running after kill`)
    await sleep(50)
  }
}

/**
Whether renaming `entry` and back fails, undoing the first rename when only the second failed
*/
function isRenameRefused(entry: string, rename: (from: string, to: string) => void): boolean {
  const probe = `${entry}.lock-probe`
  try {
    rename(entry, probe)
  } catch {
    return true
  }
  try {
    rename(probe, entry)
    return false
  } catch {
    return true
  }
}

/**
Whether another process holds `file` open: opening it for writing or renaming it fails
*/
function isLocked(file: string, rename: (from: string, to: string) => void): boolean {
  try {
    closeSync(openSync(file, 'r+'))
  } catch {
    return true
  }
  return isRenameRefused(file, rename)
}

/**
The entries below `directory` another process holds: files it cannot open for writing or
rename, and folders it cannot rename (a process whose working folder lies inside holds them),
the folders ending in the path separator
*/
export function lockedEntries(directory: string, options: TeardownOptions = {}): string[] {
  const { rename = renameSync } = options
  const held: string[] = []
  const entries = readdirSync(directory, { encoding: 'utf8', recursive: true })
  for (const entry of entries) {
    const full = path.join(directory, entry)
    // An entry the removal deleted meanwhile is no longer held
    const stats = statSync(full, { throwIfNoEntry: false })
    if (stats?.isDirectory() === true) {
      if (isRenameRefused(full, rename)) held.push(`${entry}${path.sep}`)
    } else if (stats?.isFile() === true && isLocked(full, rename)) {
      held.push(entry)
    }
  }
  return held
}

/**
The text value at `key`, or undefined where the query gave none
*/
function textOf(value: unknown, key: string): string | undefined {
  const text = valueOf(value, key)
  return typeof text === 'string' ? text : undefined
}

const WIN32_QUERY =
  'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine | ConvertTo-Json -Compress'

async function win32Processes(run: RunFile): Promise<ProcessRecord[]> {
  const stdout = await new Promise<string>((resolve, reject) => {
    run('powershell', ['-NoProfile', '-Command', WIN32_QUERY], (error, text) => {
      if (error === undefined) resolve(text)
      else reject(error)
    })
  })
  const parsed: unknown = JSON.parse(stdout)
  // One process comes back as an object, more as a list
  const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
  const records: ProcessRecord[] = []
  for (const item of items) {
    const pid = valueOf(item, 'ProcessId')
    const ppid = valueOf(item, 'ParentProcessId')
    if (typeof pid === 'number' && typeof ppid === 'number') {
      records.push({
        pid,
        ppid,
        name: textOf(item, 'Name') ?? '',
        executablePath: textOf(item, 'ExecutablePath'),
        commandLine: textOf(item, 'CommandLine')
      })
    }
  }
  return records
}

/**
The contents of `file`, or undefined once the process exited or when it is not ours to read
*/
function readOrUndefined(file: string): string | undefined {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return undefined
  }
}

function executableOf(pid: string): string | undefined {
  try {
    return readlinkSync(`/proc/${pid}/exe`)
  } catch {
    return undefined
  }
}

function procProcesses(): ProcessRecord[] {
  const records: ProcessRecord[] = []
  for (const entry of readdirSync('/proc')) {
    const stat = /^\d+$/.test(entry) ? readOrUndefined(`/proc/${entry}/stat`) : undefined
    if (stat === undefined) continue
    // The name sits in parentheses and may hold any character; the state and then the parent's
    // pid follow the closing one
    const close = stat.lastIndexOf(')')
    const [, ppid] = stat.slice(close + 2).split(' ', 2)
    const commandLine = readOrUndefined(`/proc/${entry}/cmdline`)?.replaceAll('\0', ' ').trim()
    records.push({
      pid: Number(entry),
      ppid: Number(ppid),
      name: stat.slice(stat.indexOf('(') + 1, close),
      executablePath: executableOf(entry),
      commandLine: commandLine === '' ? undefined : commandLine
    })
  }
  return records
}

/**
Every running process this machine lets us read: one Windows process query, or /proc elsewhere
*/
export async function liveProcesses(options: TeardownOptions = {}): Promise<ProcessRecord[]> {
  const { platform = process.platform, execFile: run = runFile } = options
  return platform === 'win32' ? win32Processes(run) : procProcesses()
}

/**
Prints which processes started from the app folders are alive
*/
async function printHolders(
  options: TeardownOptions,
  print: (line: string) => void
): Promise<void> {
  const { appDirectories = [], processes = async () => liveProcesses(options) } = options
  const live = await processes()
  const holders = live.filter(
    ({ executablePath }) =>
      executablePath !== undefined &&
      appDirectories.some((directory) => isWithin(executablePath, directory))
  )
  print(`e2e: holders ${String(holders.length)}`)
  for (const { pid, ppid, name, commandLine = '' } of holders) {
    print(`e2e: holder pid=${String(pid)} ppid=${String(ppid)} name=${name} cmd=${commandLine}`)
  }
}

/**
Retries the removal every 100 ms within the bound and prints how long the folder stayed held
*/
async function printHoldTime(
  directory: string,
  boundMs: number,
  print: (line: string) => void
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < boundMs) {
    await sleep(RETRY_STEP_MS)
    try {
      await rm(directory, { recursive: true, force: true })
      print(`e2e: removable after ${String(Date.now() - start)}`)
      return
    } catch {
      // Still held; the next try follows
    }
  }
  print(`e2e: still held after ${String(Date.now() - start)}`)
}

/**
Deletes a launch's folder. When Windows refuses, prints the files and folders under it that are
held, the app processes still alive and how long the folder stayed held, then rethrows the
original error, so the failure names its holder
*/
export async function removeDirectory(
  directory: string,
  options: TeardownOptions = {}
): Promise<void> {
  const { platform = process.platform, retryBoundMs = RETRY_BOUND_MS, print = printLine } = options
  try {
    await rm(directory, { recursive: true, force: true, maxRetries: 3 })
  } catch (error) {
    const code = codeOf(error)
    if (platform === 'win32' && (code === 'EPERM' || code === 'EBUSY')) {
      const locked = lockedEntries(directory, options)
      print(`e2e: locked after teardown ${String(locked.length)}: ${locked.join(', ')}`)
      await printHolders(options, print)
      await printHoldTime(directory, retryBoundMs, print)
    }
    throw error
  }
}
