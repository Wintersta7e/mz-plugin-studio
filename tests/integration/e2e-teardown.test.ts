// The end-to-end teardown deleting a launch folder on this machine's own file system: Windows
// refuses a folder another process holds and the failure names what holds it; elsewhere the
// folder goes and nothing is printed.
import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { lockedEntries, removeDirectory } from '../../e2e/fixtures/teardown'

const IS_WINDOWS = process.platform === 'win32'
// Short, so a folder held for the whole test is reported quickly
const RETRY_BOUND_MS = 300

const launchFolder = (): string => mkdtempSync(path.join(tmpdir(), 'mz-teardown-'))

// How long a holder may take to start and print its ready line
const READY_BOUND_MS = 20_000
const READY_LINE = /^ready\r?$/m

/**
Starts `command` and resolves once it printed its ready line, which it prints only after it holds
what it opens; rejects with what it printed when it ends first or stays silent past the bound
*/
async function holder(
  command: string,
  args: string[],
  cwd: string,
  environment: NodeJS.ProcessEnv = process.env
): Promise<ChildProcess> {
  const child = spawn(command, args, { cwd, env: environment, stdio: ['ignore', 'pipe', 'pipe'] })
  const printed = { out: '', all: '' }
  const ready = Promise.withResolvers<undefined>()
  const failed = (why: string): void => {
    ready.reject(
      new Error(`${command} ${why} before it printed ready; it printed:\n${printed.all}`)
    )
  }
  child.stdout.setEncoding('utf8').on('data', (text: string) => {
    printed.out += text
    printed.all += text
    if (READY_LINE.test(printed.out)) ready.resolve(undefined)
  })
  child.stderr.setEncoding('utf8').on('data', (text: string) => {
    printed.all += text
  })
  child.on('exit', (code) => {
    failed(`exited with code ${String(code)}`)
  })
  const timer = setTimeout(() => {
    failed(`printed nothing ready for ${String(READY_BOUND_MS)} ms`)
  }, READY_BOUND_MS)
  try {
    await ready.promise
  } catch (error) {
    child.kill()
    throw error
  } finally {
    clearTimeout(timer)
  }
  return child
}

async function stop(child: ChildProcess | undefined, folder: string): Promise<void> {
  if (child?.exitCode === null && child.signalCode === null) {
    const exited: Promise<unknown[]> = once(child, 'exit')
    child.kill()
    await exited
  }
  rmSync(folder, { recursive: true, force: true, maxRetries: 3 })
}

interface Removal {
  // "removed", "refused" for the EPERM or EBUSY Windows gives a held folder, else the error
  outcome: string
  lines: string[]
}

/**
Removes `folder` the way the teardown does and returns how it ended and the lines it printed
*/
async function removal(folder: string, appDirectories: string[] = []): Promise<Removal> {
  const lines: string[] = []
  const options = {
    appDirectories,
    retryBoundMs: RETRY_BOUND_MS,
    print: (line: string): void => {
      lines.push(line)
    }
  }
  try {
    await removeDirectory(folder, options)
    return { outcome: 'removed', lines }
  } catch (error) {
    const code: unknown = error instanceof Error ? Reflect.get(error, 'code') : undefined
    return { outcome: code === 'EPERM' || code === 'EBUSY' ? 'refused' : String(error), lines }
  }
}

const HOLD_TIME = /^e2e: (?:removable|still held) after \d+$/

/**
What a removal printed, read line by line
*/
function report({ outcome, lines }: Removal, holderPid?: number) {
  return {
    outcome,
    locked: lines.filter((line) => line.startsWith('e2e: locked after teardown ')),
    isHolderNamed: lines.some((line) => line.startsWith(`e2e: holder pid=${String(holderPid)} `)),
    hasHoldTime: lines.some((line) => HOLD_TIME.test(line))
  }
}

/**
What the removal of a held launch folder gives on this machine: on Windows the refusal and the
lines naming `held` and its holder, elsewhere a removed folder and no output
*/
const expectedHeld = (held: string): ReturnType<typeof report> =>
  IS_WINDOWS
    ? {
        outcome: 'refused',
        locked: [`e2e: locked after teardown 1: ${held}`],
        isHolderNamed: true,
        hasHoldTime: true
      }
    : { outcome: 'removed', locked: [], isHolderNamed: false, hasHoldTime: false }

const NODE_HOLD = "process.stdout.write('ready'); setInterval(() => {}, 1000)"
// A holder whose open fails: it prints, but never its ready line
const FAILED_OPEN =
  "process.stdout.write('opening\\n'); process.stderr.write('cannot open held.log\\n'); process.exit(1)"
// Opens the file named by MZ_HELD_FILE with no sharing, so no other process may open, rename or
// delete it, and prints ready only once it holds it: `-Command` passes no `$args`, and a failed
// open stops the script before the ready line
const POWERSHELL_HOLD = `$ErrorActionPreference = 'Stop'; $f = [IO.File]::Open($env:MZ_HELD_FILE, 'Open', 'Read', 'None'); 'ready'; Start-Sleep 60`

/**
On Windows a PowerShell process holding `file` open with no sharing; elsewhere nothing holds it,
since an open file never stops its removal there
*/
async function fileHolder(file: string, folder: string): Promise<ChildProcess | undefined> {
  return IS_WINDOWS
    ? holder('powershell', ['-NoProfile', '-Command', POWERSHELL_HOLD], folder, {
        ...process.env,
        MZ_HELD_FILE: file
      })
    : undefined
}

/**
What the removal of a launch folder holding an open file gives on this machine
*/
const expectedHeldFile = (entry: string): ReturnType<typeof report> & { isGone: boolean } =>
  IS_WINDOWS
    ? {
        outcome: 'refused',
        locked: [`e2e: locked after teardown 1: ${entry}`],
        isHolderNamed: false,
        hasHoldTime: true,
        isGone: false
      }
    : { outcome: 'removed', locked: [], isHolderNamed: false, hasHoldTime: false, isGone: true }

describe('e2e teardown', () => {
  it('teardown names a held folder, its holder and how long it stayed held', async () => {
    expect.hasAssertions()

    const folder = launchFolder()
    const held = path.join(folder, 'held')
    mkdirSync(held)
    const child = await holder(process.execPath, ['-e', NODE_HOLD], held)
    try {
      const result = await removal(folder, [path.dirname(process.execPath)])
      process.stdout.write(`e2e teardown held folder: ${String(result.lines.length)} lines\n`)

      expect(report(result, child.pid)).toStrictEqual(expectedHeld(`held${path.sep}`))
    } finally {
      await stop(child, folder)
    }
  })

  it('teardown names a file another process holds open', async () => {
    expect.hasAssertions()

    const folder = launchFolder()
    const file = path.join(folder, 'held.log')
    writeFileSync(file, 'held\n')
    const child = await fileHolder(file, folder)
    try {
      const result = await removal(folder)
      process.stdout.write(`e2e teardown held file: ${String(result.lines.length)} lines\n`)

      expect({ ...report(result), isGone: !existsSync(folder) }).toStrictEqual(
        expectedHeldFile('held.log')
      )
    } finally {
      await stop(child, folder)
    }
  })

  it('lists a folder whose rename is refused, with the path separator', () => {
    const folder = launchFolder()
    try {
      mkdirSync(path.join(folder, 'held'))
      mkdirSync(path.join(folder, 'free'))
      writeFileSync(path.join(folder, 'free', 'note.txt'), 'free\n')
      const refused = path.join(folder, 'held')
      const rename = (from: string, to: string): void => {
        if (from === refused) throw new Error(`${from} is held`)
        renameSync(from, to)
      }
      const locked = lockedEntries(folder, { rename })
      process.stdout.write(`e2e teardown locked entries: ${String(locked.length)}\n`)

      expect(locked).toStrictEqual([`held${path.sep}`])
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })

  it('a holder that ends before it says it is ready fails with what it printed', async () => {
    expect.hasAssertions()

    const folder = launchFolder()
    try {
      await expect(holder(process.execPath, ['-e', FAILED_OPEN], folder)).rejects.toThrow(
        /exited with code 1 before it printed ready[\s\S]*opening[\s\S]*cannot open held\.log/
      )
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
