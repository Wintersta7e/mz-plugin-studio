// The release executable itself, never the test twin: its fuses, the policy it serves, and a
// session through the main views with nothing that policy refuses. Each leg is its own test on
// its own launch, built from the helpers below so a later leg replaces one without the rest.
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Page } from '@playwright/test'
import { PRODUCTION_CSP } from '../src/main/csp'
import { readV160Payloads } from '../tests/helpers/persist-v160'
import {
  expect,
  field,
  isList,
  isRecord,
  newPlugin,
  projectTitle,
  readArtifacts,
  test,
  type Cdp
} from './fixtures/app'

interface TargetTree {
  page: string
  /**
  Runs `prepare` on the page's session now and on every worker session attached later
  */
  each(prepare: (session: string) => Promise<unknown>): Promise<void>
  has(session: string): boolean
  /**
  Sessions attached below the page
  */
  workers(): number
}

interface Violation {
  directive: string
  blocked: string
  policy: string
}

const VIOLATIONS = 'e2eViolations'

// Installed before any app script runs; records what the policy refused
const VIOLATION_RECORDER = `document.addEventListener('securitypolicyviolation', (event) => {
  const list = globalThis[${JSON.stringify(VIOLATIONS)}] ?? (globalThis[${JSON.stringify(VIOLATIONS)}] = [])
  list.push({ directive: event.effectiveDirective, blocked: event.blockedURI, policy: event.originalPolicy })
})`

// Request schemes that leave the computer; blob: workers and data: fonts stay inside the app
const REMOTE_SCHEMES = ['http:', 'https:', 'ws:', 'wss:']

// What the editor logs when it cannot start its workers and runs their code on the page instead
const WORKER_FALLBACK = 'Could not create web worker'

const OUTSIDE_SENTINEL = 'e2eOutsideScript'

interface ProbeTargets {
  text: string
  script: string
  sentinel: string
}

interface PolicyProbe {
  name: string
  /**
  The directive whose violation the probe raises; none when the request filter refuses it
  */
  directive?: string
  /**
  Runs in the page: gives 'blocked' when the page sees the content refused, 'sent' when only
  the policy's violation can tell
  */
  run: (targets: ProbeTargets) => string | Promise<string>
}

// Each refused by the production policy, or, for a file outside the app, by the request filter
const POLICY_PROBES: PolicyProbe[] = [
  {
    name: 'eval in a task the page scheduled',
    directive: 'script-src',
    run: async () =>
      new Promise<string>((resolve) => {
        setTimeout(() => {
          try {
            resolve(`ran ${String(globalThis.eval('1'))}`)
          } catch {
            resolve('blocked')
          }
        }, 0)
      })
  },
  {
    name: 'inline script',
    directive: 'script-src-elem',
    run: () => {
      const script = document.createElement('script')
      script.textContent = 'globalThis.e2eInlineProbe = 1'
      document.body.append(script)
      script.remove()
      return Reflect.get(globalThis, 'e2eInlineProbe') === undefined ? 'blocked' : 'ran'
    }
  },
  {
    name: 'fetch of a remote address',
    directive: 'connect-src',
    run: async () => {
      try {
        await fetch('https://example.invalid/')
        return 'read'
      } catch {
        return 'blocked'
      }
    }
  },
  {
    name: 'fetch of a file outside the app',
    directive: 'connect-src',
    run: async ({ text }) => {
      let response: Response
      try {
        response = await fetch(text)
      } catch {
        return 'blocked'
      }
      return `read ${await response.text()}`
    }
  },
  {
    name: 'base address',
    directive: 'base-uri',
    run: () => {
      const before = document.baseURI
      const base = document.createElement('base')
      base.href = 'https://example.invalid/'
      document.head.append(base)
      const after = document.baseURI
      base.remove()
      return after === before ? 'blocked' : `rebased to ${after}`
    }
  },
  {
    name: 'object',
    directive: 'object-src',
    run: async () => {
      const object = document.createElement('object')
      object.data = 'https://example.invalid/x'
      document.body.append(object)
      await new Promise((resolve) => setTimeout(resolve, 100))
      object.remove()
      return 'sent'
    }
  },
  {
    name: 'frame',
    directive: 'frame-src',
    run: async () => {
      const frame = document.createElement('iframe')
      frame.src = 'https://example.invalid/'
      document.body.append(frame)
      await new Promise((resolve) => setTimeout(resolve, 100))
      frame.remove()
      return 'sent'
    }
  },
  {
    name: 'form submission',
    directive: 'form-action',
    run: async () => {
      const form = document.createElement('form')
      form.action = 'https://example.invalid/'
      form.method = 'post'
      document.body.append(form)
      form.requestSubmit()
      await new Promise((resolve) => setTimeout(resolve, 100))
      form.remove()
      return 'sent'
    }
  },
  {
    name: 'remote image',
    directive: 'img-src',
    run: async () =>
      new Promise<string>((resolve) => {
        const image = new Image()
        image.addEventListener('load', () => {
          resolve('loaded')
        })
        image.addEventListener('error', () => {
          resolve('blocked')
        })
        image.src = 'https://example.invalid/x.png'
      })
  },
  {
    name: 'worker from a file',
    directive: 'worker-src',
    run: () => {
      const source = document.querySelector<HTMLScriptElement>('script[src]')?.src
      if (source === undefined) return 'no app script to start'
      try {
        new Worker(source).terminate()
      } catch {
        return 'blocked'
      }
      return 'sent'
    }
  },
  {
    name: 'script from a file outside the app',
    run: async ({ script, sentinel }) =>
      new Promise<string>((resolve) => {
        const element = document.createElement('script')
        element.addEventListener('load', () => {
          resolve('loaded')
        })
        element.addEventListener('error', () => {
          resolve(Reflect.get(globalThis, sentinel) === undefined ? 'blocked' : 'ran')
        })
        element.src = script
        document.head.append(element)
      })
  }
]

/**
Step 1: the release check's own reading of the fuse wire, run on the executable
*/
function readReleaseFuses(executable: string): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, ['scripts/ci-policy.mjs', 'fuses', executable], {
    encoding: 'utf8'
  })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

/**
Attaches to the app window's target; workers below it attach on their own once watched
*/
async function attachPage(cdp: Cdp): Promise<TargetTree> {
  const { targetInfos } = await cdp.send('Target.getTargets')
  const targets = isList(targetInfos) ? targetInfos : []
  const pages = targets.filter((target) => field(target, 'type') === 'page')
  expect(pages).toHaveLength(1)
  const { sessionId: page } = await cdp.send('Target.attachToTarget', {
    targetId: field(pages.at(0), 'targetId'),
    flatten: true
  })
  if (typeof page !== 'string') throw new TypeError('Target.attachToTarget answered no session')
  const sessions = new Set([page])
  const preparers: ((session: string) => Promise<unknown>)[] = []
  const autoAttach = { autoAttach: true, flatten: true, waitForDebuggerOnStart: false }
  cdp.on(({ method, params, sessionId }) => {
    const child = params['sessionId']
    if (
      typeof child !== 'string' ||
      method !== 'Target.attachedToTarget' ||
      sessionId === undefined ||
      !sessions.has(sessionId)
    ) {
      return
    }
    sessions.add(child)
    // A worker may end before it answers; what it sent until then is counted
    void Promise.allSettled([
      ...preparers.map(async (prepare) => prepare(child)),
      cdp.send('Target.setAutoAttach', autoAttach, child)
    ])
  })
  return {
    page,
    async each(prepare) {
      preparers.push(prepare)
      for (const session of sessions) await prepare(session)
      if (preparers.length === 1) await cdp.send('Target.setAutoAttach', autoAttach, page)
    },
    has: (session) => sessions.has(session),
    workers: () => sessions.size - 1
  }
}

/**
Step 3: every request the window and its workers send, counted by URL scheme
*/
async function attachNetworkRecorder(cdp: Cdp, targets: TargetTree) {
  const schemes = new Map<string, number>()
  const documents: { url: string; headers: Record<string, unknown> }[] = []
  cdp.on(({ method, params, sessionId }) => {
    if (sessionId === undefined || !targets.has(sessionId)) return
    if (method === 'Network.requestWillBeSent') {
      const url = field(params['request'], 'url')
      const scheme =
        typeof url === 'string' && URL.canParse(url) ? new URL(url).protocol : 'unparsed:'
      schemes.set(scheme, (schemes.get(scheme) ?? 0) + 1)
      return
    }
    if (method !== 'Network.responseReceived' || params['type'] !== 'Document') return
    const url = field(params['response'], 'url')
    const headers = field(params['response'], 'headers')
    if (typeof url === 'string' && isRecord(headers)) documents.push({ url, headers })
  })
  await targets.each(async (session) => cdp.send('Network.enable', {}, session))
  return {
    documents,
    count: (scheme: string): number => schemes.get(scheme) ?? 0,
    print(): void {
      const total = schemes.values().reduce((sum, n) => sum + n, 0)
      const list = [...schemes].map(([scheme, n]) => `${scheme} ${String(n)}`).join(', ')
      process.stdout.write(
        `release requests ${String(total)}: ${list || 'none'}; worker targets ${String(targets.workers())}\n`
      )
    }
  }
}

/**
One recorded violation, read key by key
*/
function toViolation(value: unknown): Violation {
  return {
    directive: String(field(value, 'directive')),
    blocked: String(field(value, 'blocked')),
    policy: String(field(value, 'policy'))
  }
}

/**
The text a console call prints for one argument
*/
function argumentText(argument: unknown): string {
  const shown: unknown = field(argument, 'value') ?? field(argument, 'description') ?? ''
  return String(shown)
}

/**
Policy refusals: the page's violation events, plus every console line the policy writes. The
engine of this Electron version words a refusal "... violates the following Content Security
Policy directive" as a security log entry; older ones began it `Refused to`. Both are counted,
from every target.
*/
async function recordViolations(cdp: Cdp, targets: TargetTree) {
  const refused: string[] = []
  // Every console line from every target, and the ones logged as errors
  const messages: string[] = []
  const errors: string[] = []
  const keep = (text: unknown, isSecurity = false): void => {
    if (typeof text === 'string' && (isSecurity || text.startsWith('Refused to'))) {
      refused.push(text)
    }
  }
  const logEntry = (entry: unknown): void => {
    const text = field(entry, 'text')
    keep(text, field(entry, 'source') === 'security')
    if (typeof text !== 'string') return
    messages.push(text)
    if (field(entry, 'level') === 'error') errors.push(text)
  }
  const consoleCall = (params: Record<string, unknown>): void => {
    const { args } = params
    const list = isList(args) ? args : []
    for (const argument of list) keep(field(argument, 'value'))
    const text = list.map((argument) => argumentText(argument)).join(' ')
    messages.push(text)
    if (params['type'] === 'error') errors.push(text)
  }
  cdp.on(({ method, params, sessionId }) => {
    if (sessionId === undefined || !targets.has(sessionId)) return
    if (method === 'Log.entryAdded') {
      logEntry(params['entry'])
    } else if (method === 'Runtime.consoleAPICalled') {
      consoleCall(params)
    }
  })
  await cdp.send('Page.enable', {}, targets.page)
  await cdp.send(
    'Page.addScriptToEvaluateOnNewDocument',
    { source: VIOLATION_RECORDER },
    targets.page
  )
  await targets.each(async (session) => {
    await cdp.send('Log.enable', {}, session)
    await cdp.send('Runtime.enable', {}, session)
  })
  return {
    refused,
    messages,
    errors,
    violations: async (page: Page): Promise<Violation[]> => {
      const recorded = await page.evaluate(
        (key): unknown => Reflect.get(globalThis, key),
        VIOLATIONS
      )
      return isList(recorded) ? recorded.map((value) => toViolation(value)) : []
    },
    print(): void {
      process.stdout.write(`release refused messages ${String(refused.length)}\n`)
      for (const line of refused) process.stdout.write(`  ${line}\n`)
    }
  }
}

async function reloadWindow(page: Page): Promise<void> {
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
}

/**
Step 4's path: a recent project, a new plugin, code, a template, the preview, settings, analysis
*/
async function runScriptedSession(page: Page, projectPath: string): Promise<void> {
  const captured = readV160Payloads()['mz-plugin-studio-project']
  if (captured === undefined) throw new Error('no captured project store')
  const parsed: unknown = JSON.parse(captured)
  const captive = isRecord(parsed) ? parsed : {}
  const state = field(captive, 'state')
  const store = {
    ...captive,
    state: { ...(isRecord(state) && state), recentProjects: [projectPath] }
  }
  // A category whose first template inserts with its default values
  const ui = { state: { lastTemplateCategory: 'map-events' }, version: 0 }
  await page.evaluate(
    ({ project, view }) => {
      localStorage.setItem('mz-plugin-studio-project', project)
      localStorage.setItem('mz-plugin-studio-ui', view)
    },
    { project: JSON.stringify(store), view: JSON.stringify(ui) }
  )
  await reloadWindow(page)

  await page.getByTestId('recent-project').click()
  await expect(page.getByTestId('status-project')).toContainText(projectTitle(projectPath))
  await newPlugin(page)
  await page.getByTestId('editor-tab-code').click()
  await page.getByRole('tabpanel').locator('.monaco-editor').click()
  await page.keyboard.type('const answer = 42\n')
  await page.getByTestId('template-inserter-open').click()
  await page.getByTestId('template-card').first().click()
  await page.getByTestId('template-insert').click()
  await expect(page.getByTestId('template-insert')).toHaveCount(0)
  await expect(page.getByTestId('code-preview')).toBeVisible()
  await page.getByTestId('settings-open').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByTestId('main-view-analysis').click()
  await expect(page.getByTestId('analysis-view')).toBeVisible()
}

/**
Waits until `directive` shows among the violations recorded after the first `before`; a probe
the request filter refuses raises none to wait for
*/
async function expectNewViolation(
  read: () => Promise<Violation[]>,
  directive: string | undefined,
  before: number
): Promise<void> {
  if (directive === undefined) return
  await expect
    .poll(async () => {
      const seen = await read()
      return seen.slice(before).map((violation) => violation.directive)
    })
    .toContain(directive)
}

test('release build carries the production fuses', () => {
  const { status, output } = readReleaseFuses(readArtifacts().release)
  process.stdout.write(output)
  expect(status, output).toBe(0)
})

test('release build serves the production policy and blocks inline code', async ({ release }) => {
  const { page, cdp } = release
  const targets = await attachPage(cdp)
  const network = await attachNetworkRecorder(cdp, targets)
  const policy = await recordViolations(cdp, targets)
  await reloadWindow(page)
  network.print()

  const documents = network.documents.filter(({ url }) => url.startsWith('file:'))
  expect(documents).toHaveLength(1)
  const headers = Object.entries(documents[0]?.headers ?? {})
  const csp = headers.filter(([name]) => name.toLowerCase() === 'content-security-policy')
  expect(csp.map(([, value]) => value)).toEqual([PRODUCTION_CSP])

  await page.evaluate(() => {
    const { document } = globalThis
    const script = document.createElement('script')
    script.textContent = 'globalThis.e2eInline = 1'
    document.body.append(script)
    // Code from a string, in a task the page scheduled (the evaluated callback itself may eval):
    // the policy refuses it and the page's eval throws, which the page records
    setTimeout(() => {
      try {
        globalThis.eval('globalThis.e2eTimer = 1')
      } catch (error) {
        Reflect.set(globalThis, 'e2eEvalRefusal', {
          evalError: error instanceof EvalError,
          message: error instanceof Error ? error.message : String(error)
        })
      }
    }, 0)
  })
  await expect
    .poll(async () => {
      const seen = await policy.violations(page)
      return seen.map(({ directive, blocked }) => ({ directive, blocked }))
    })
    .toEqual([
      { directive: 'script-src-elem', blocked: 'inline' },
      { directive: 'script-src', blocked: 'eval' }
    ])
  expect(
    await page.evaluate((): unknown[] => {
      const inline: unknown = Reflect.get(globalThis, 'e2eInline')
      const timer: unknown = Reflect.get(globalThis, 'e2eTimer')
      const refusal: unknown = Reflect.get(globalThis, 'e2eEvalRefusal')
      return [inline, timer, refusal]
    })
  ).toEqual([
    undefined,
    undefined,
    // This engine words the refusal "Evaluating a string as JavaScript violates ..."; older ones
    // began it "Refused to evaluate a string as JavaScript"
    {
      evalError: true,
      message: expect.stringMatching(
        /^(?:Refused to evaluate|Evaluating) a string as JavaScript .*'unsafe-eval'/v
      )
    }
  ])
  // Only the inline script logs a refusal: the refused eval throws instead, as checked above
  await expect.poll(() => policy.refused.length).toBe(1)
  policy.print()
})

test('release build runs a scripted session without policy violations', async ({ release }) => {
  const { page, cdp, pageErrors } = release
  const project = await release.fixtureProject()
  // Opened in an earlier session, so reopening it from the recent projects does not ask first
  writeFileSync(
    path.join(release.userDataDir, 'project-roots.json'),
    JSON.stringify({ roots: [project] })
  )
  const targets = await attachPage(cdp)
  const network = await attachNetworkRecorder(cdp, targets)
  const policy = await recordViolations(cdp, targets)
  await runScriptedSession(page, project)
  network.print()
  policy.print()
  expect(await policy.violations(page)).toEqual([])
  expect(policy.refused).toEqual([])
  expect(pageErrors).toEqual([])
})

test('release build checks code offline in the bundled editor', async ({ release }) => {
  const { page, cdp, pageErrors } = release
  const targets = await attachPage(cdp)
  const network = await attachNetworkRecorder(cdp, targets)
  const policy = await recordViolations(cdp, targets)
  await reloadWindow(page)
  await newPlugin(page)
  await page.getByTestId('editor-tab-code').click()
  const editor = page.getByRole('tabpanel').locator('.monaco-editor')
  await editor.click()
  await page.keyboard.type('const x = {;')
  // Every leg is read, so one failing run shows them all
  await expect.soft(editor.locator('.squiggly-error').first()).toBeVisible({ timeout: 10_000 })
  await expect.soft.poll(() => page.workers().length).toBe(2)
  network.print()
  policy.print()
  for (const scheme of REMOTE_SCHEMES) expect.soft(network.count(scheme), scheme).toBe(0)
  expect.soft(network.count('file:')).toBeGreaterThan(0)
  expect.soft(policy.messages.filter((text) => text.includes(WORKER_FALLBACK))).toEqual([])
  expect.soft(policy.errors).toEqual([])
  expect.soft(pageErrors).toEqual([])
  expect.soft(await policy.violations(page)).toEqual([])
})

test('release build blocks every probe of its content policy', async ({ release }) => {
  const { page, cdp } = release
  // Files outside the app: one the page reads, one it runs
  const outsideText = path.join(release.userDataDir, 'outside.txt')
  const outsideScript = path.join(release.userDataDir, 'outside.js')
  writeFileSync(outsideText, 'outside the app')
  writeFileSync(outsideScript, `globalThis.${OUTSIDE_SENTINEL} = 1`)
  const targets = await attachPage(cdp)
  const policy = await recordViolations(cdp, targets)
  await reloadWindow(page)

  let blocked = 0
  for (const probe of POLICY_PROBES) {
    const earlier = await policy.violations(page)
    const outcome = await page.evaluate(probe.run, {
      text: pathToFileURL(outsideText).href,
      script: pathToFileURL(outsideScript).href,
      sentinel: OUTSIDE_SENTINEL
    })
    expect(probe.directive === undefined ? ['blocked'] : ['blocked', 'sent'], probe.name).toContain(
      outcome
    )
    await expectNewViolation(async () => policy.violations(page), probe.directive, earlier.length)
    blocked++
  }
  const violations = await policy.violations(page)
  process.stdout.write(
    `csp probes: run ${String(POLICY_PROBES.length)}, blocked ${String(blocked)}; violations ${String(violations.length)}\n`
  )
  expect(POLICY_PROBES.length).toBeGreaterThan(0)
  expect(blocked).toBe(POLICY_PROBES.length)
  expect(violations.length).toBeGreaterThan(0)
  for (const { policy: original } of violations) expect(original).toBe(PRODUCTION_CSP)
})
