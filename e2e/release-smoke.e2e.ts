// The release executable itself, never the test twin: its fuses, the policy it serves, and a
// session through the main views with nothing that policy refuses. Each leg is its own test on
// its own launch, built from the helpers below so a later leg replaces one without the rest.
import { spawnSync } from 'node:child_process'
import type { Page } from '@playwright/test'
import { PRODUCTION_CSP } from '../src/main/csp'
import { readV160Payloads } from '../tests/helpers/persist-v160'
import { expect, newPlugin, projectTitle, readArtifacts, test, type Cdp } from './fixtures/app'

interface TargetTree {
  page: string
  /** Runs `prepare` on the page's session now and on every worker session attached later */
  each(prepare: (session: string) => Promise<unknown>): Promise<void>
  has(session: string): boolean
  /** Sessions attached below the page */
  workers(): number
}

interface Violation {
  directive: string
  blocked: string
}

const VIOLATIONS = 'e2eViolations'

// Installed before any app script runs; records what the policy refused
const VIOLATION_RECORDER = `document.addEventListener('securitypolicyviolation', (event) => {
  const list = globalThis[${JSON.stringify(VIOLATIONS)}] ?? (globalThis[${JSON.stringify(VIOLATIONS)}] = [])
  list.push({ directive: event.effectiveDirective, blocked: event.blockedURI })
})`

/** Step 1: the release check's own reading of the fuse wire, run on the executable */
function readReleaseFuses(executable: string): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, ['scripts/ci-policy.mjs', 'fuses', executable], {
    encoding: 'utf8'
  })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

/** Attaches to the app window's target; workers below it attach on their own once watched */
async function attachPage(cdp: Cdp): Promise<TargetTree> {
  const { targetInfos } = await cdp.send<{ targetInfos: { targetId: string; type: string }[] }>(
    'Target.getTargets'
  )
  const pages = targetInfos.filter(({ type }) => type === 'page')
  expect(pages).toHaveLength(1)
  const { sessionId: page } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', {
    targetId: pages[0]?.targetId,
    flatten: true
  })
  const sessions = new Set([page])
  const preparers: ((session: string) => Promise<unknown>)[] = []
  const autoAttach = { autoAttach: true, flatten: true, waitForDebuggerOnStart: false }
  cdp.on(({ method, params, sessionId }) => {
    if (method !== 'Target.attachedToTarget' || sessionId === undefined) return
    if (!sessions.has(sessionId)) return
    const child = params['sessionId'] as string
    sessions.add(child)
    // A worker may end before it answers; what it sent until then is counted
    for (const prepare of preparers) void prepare(child).catch(() => undefined)
    void cdp.send('Target.setAutoAttach', autoAttach, child).catch(() => undefined)
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

/** Step 3: every request the window and its workers send, counted by URL scheme */
async function attachNetworkRecorder(cdp: Cdp, targets: TargetTree) {
  const schemes = new Map<string, number>()
  const documents: { url: string; headers: Record<string, string> }[] = []
  cdp.on(({ method, params, sessionId }) => {
    if (sessionId === undefined || !targets.has(sessionId)) return
    if (method === 'Network.requestWillBeSent') {
      const { url } = params['request'] as { url: string }
      const scheme = URL.canParse(url) ? new URL(url).protocol : 'unparsed:'
      schemes.set(scheme, (schemes.get(scheme) ?? 0) + 1)
    }
    if (method === 'Network.responseReceived' && params['type'] === 'Document') {
      documents.push(params['response'] as { url: string; headers: Record<string, string> })
    }
  })
  await targets.each((session) => cdp.send('Network.enable', {}, session))
  return {
    documents,
    print(): void {
      const total = [...schemes.values()].reduce((sum, n) => sum + n, 0)
      const list = [...schemes].map(([scheme, n]) => `${scheme} ${n}`).join(', ')
      process.stdout.write(
        `release requests ${total}: ${list || 'none'}; worker targets ${targets.workers()}\n`
      )
    }
  }
}

/**
 * Policy refusals: the page's violation events, plus every console line the policy writes. The
 * engine of this Electron version words a refusal "... violates the following Content Security
 * Policy directive" as a security log entry; older ones began it `Refused to`. Both are counted,
 * from every target.
 */
async function recordViolations(cdp: Cdp, targets: TargetTree) {
  const refused: string[] = []
  const keep = (text: unknown, security = false): void => {
    if (typeof text === 'string' && (security || text.startsWith('Refused to'))) refused.push(text)
  }
  cdp.on(({ method, params, sessionId }) => {
    if (sessionId === undefined || !targets.has(sessionId)) return
    if (method === 'Log.entryAdded') {
      const { text, source } = params['entry'] as { text: string; source: string }
      keep(text, source === 'security')
    }
    if (method === 'Runtime.consoleAPICalled') {
      for (const arg of params['args'] as { value?: unknown }[]) keep(arg.value)
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
    violations: (page: Page): Promise<Violation[]> =>
      page.evaluate(
        (key) => (Reflect.get(globalThis, key) as Violation[] | undefined) ?? [],
        VIOLATIONS
      ),
    print(): void {
      process.stdout.write(`release refused messages ${refused.length}\n`)
      for (const line of refused) process.stdout.write(`  ${line}\n`)
    }
  }
}

async function reloadWindow(page: Page): Promise<void> {
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
}

/** Step 4's path: a recent project, a new plugin, code, a template, the preview, settings, analysis */
async function runScriptedSession(page: Page, projectPath: string): Promise<void> {
  const captured = readV160Payloads()['mz-plugin-studio-project']
  if (captured === undefined) throw new Error('no captured project store')
  const store = JSON.parse(captured) as { state: { recentProjects: string[] } }
  store.state.recentProjects = [projectPath]
  // A category whose first template inserts with its default values
  const ui = { state: { lastTemplateCategory: 'map-events' }, version: 0 }
  await page.evaluate(
    ([project, view]) => {
      localStorage.setItem('mz-plugin-studio-project', project)
      localStorage.setItem('mz-plugin-studio-ui', view)
    },
    [JSON.stringify(store), JSON.stringify(ui)]
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
    const script = document.createElement('script')
    script.textContent = 'globalThis.e2eInline = 1'
    document.body.append(script)
    Reflect.apply(setTimeout, globalThis, ['globalThis.e2eTimer = 1', 0])
  })
  await expect
    .poll(() => policy.violations(page))
    .toEqual([
      { directive: 'script-src-elem', blocked: 'inline' },
      { directive: 'script-src', blocked: 'eval' }
    ])
  expect(
    await page.evaluate(() => [
      Reflect.get(globalThis, 'e2eInline'),
      Reflect.get(globalThis, 'e2eTimer')
    ])
  ).toEqual([undefined, undefined])
  await expect.poll(() => policy.refused.length).toBe(2)
  policy.print()
})

test('release build runs a scripted session without policy violations', async ({ release }) => {
  const { page, cdp, pageErrors } = release
  const project = await release.fixtureProject()
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

test('release build marks a syntax error in the code editor', async ({ release }) => {
  const { page } = release
  await newPlugin(page)
  await page.getByTestId('editor-tab-code').click()
  const editor = page.getByRole('tabpanel').locator('.monaco-editor')
  await editor.click()
  await page.keyboard.type('function (')
  await expect(editor.locator('.squiggly-error').first()).toBeVisible({ timeout: 10_000 })
})
