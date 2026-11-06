// The packaged app as it boots: window, log, Content Security Policy, profile location and the
// renderer's isolation. None of these exist in the unpackaged development build.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { PRODUCTION_CSP } from '../../src/main/csp'
import { DEFAULT_WINDOW_SIZE } from '../../src/main/window-size'
import { expect, field, isWithin, runRoot, test } from '../fixtures/app'

const MANIFEST = path.join(process.cwd(), 'package.json')
const manifest: unknown = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const version = String(field(manifest, 'version'))

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

/**
The text of every main.log below the profile directory
*/
function mainLogs(userDataDirectory: string): string {
  return readdirSync(userDataDirectory, { encoding: 'utf8', recursive: true })
    .filter((file) => path.basename(file) === 'main.log')
    .map((file) => readFileSync(path.join(userDataDirectory, file), 'utf8'))
    .join('\n')
}

test('boots the packaged app hardened with the production policy', async ({ twin }) => {
  const { app, page } = twin
  const { workArea, ...state } = await app.evaluate(({ app, BrowserWindow, screen }) => ({
    packaged: app.isPackaged,
    windows: BrowserWindow.getAllWindows().map((window) => window.getContentSize()),
    workArea: screen.getPrimaryDisplay().workAreaSize
  }))
  // The frameless window opens at the default size, shrunk to fit a smaller work area
  const expected = [
    Math.min(DEFAULT_WINDOW_SIZE.width, workArea.width),
    Math.min(DEFAULT_WINDOW_SIZE.height, workArea.height)
  ]
  process.stdout.write(
    `e2e window: work area ${String(workArea.width)}x${String(workArea.height)}, content ${state.windows.map((size) => size.join('x')).join(', ')}\n`
  )
  expect(state).toEqual({ packaged: true, windows: [expected] })
  await expect
    .poll(() => mainLogs(twin.userDataDir))
    .toContain(`MZ Plugin Studio v${version} starting (production)`)
  expect(twin.pageErrors).toEqual([])
  expect(twin.failedRequests).toEqual([])

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  const documentHeaders = new Promise<Record<string, string>>((resolve) =>
    cdp.on('Network.responseReceived', (event) => {
      if (event.type === 'Document') resolve(event.response.headers)
    })
  )
  await page.reload()
  const headers = Object.entries(await documentHeaders)
  expect(headers.filter(([name]) => name.toLowerCase() === 'content-security-policy')).toEqual([
    ['Content-Security-Policy', PRODUCTION_CSP]
  ])

  const { directives, ...ran } = await page.evaluate(async () => {
    const { document } = globalThis
    const seen: string[] = []
    const both = new Promise<void>((resolve) => {
      document.addEventListener('securitypolicyviolation', (event) => {
        seen.push(event.effectiveDirective)
        if (seen.length === 2) resolve()
      })
    })
    const script = document.createElement('script')
    script.textContent = 'window.e2eInlineRan = true'
    document.head.append(script)
    // Code from a string, in a task the page scheduled (the evaluated callback itself may eval):
    // the policy refuses it and the page's eval throws
    setTimeout(() => {
      try {
        globalThis.eval('window.e2eStringRan = true')
      } catch {
        // The violation event records the refusal
      }
    }, 0)
    await Promise.race([both, new Promise((resolve) => setTimeout(resolve, 5000))])
    return {
      directives: seen,
      inlineRan: 'e2eInlineRan' in globalThis,
      stringRan: 'e2eStringRan' in globalThis
    }
  })
  expect({ directives: directives.toSorted(byCodeUnit), ...ran }).toEqual({
    directives: ['script-src', 'script-src-elem'],
    inlineRan: false,
    stringRan: false
  })
})

test('keeps profile and logs under the run temp root', async ({ twin }) => {
  const paths = await twin.app.evaluate(({ app }) => ({
    userData: app.getPath('userData'),
    logs: app.getPath('logs')
  }))
  expect(isWithin(twin.userDataDir, runRoot())).toBe(true)
  expect(twin.userDataDir).not.toBe(runRoot())
  expect(isWithin(paths.userData, twin.userDataDir)).toBe(true)
  expect(isWithin(paths.logs, twin.userDataDir)).toBe(true)
  expect(mainLogs(twin.userDataDir)).not.toBe('')
})

test('keeps the window sandboxed and blocks navigation and new windows', async ({ twin }) => {
  const { app, page } = twin
  const preferences = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().map((window) => {
      // Present at runtime, absent from Electron's type declarations
      const read: unknown = Reflect.get(window.webContents, 'getLastWebPreferences')
      const last: unknown =
        typeof read === 'function' ? Reflect.apply(read, window.webContents, []) : undefined
      const values = typeof last === 'object' && last !== null ? last : {}
      const sandbox: unknown = Reflect.get(values, 'sandbox')
      const contextIsolation: unknown = Reflect.get(values, 'contextIsolation')
      const nodeIntegration: unknown = Reflect.get(values, 'nodeIntegration')
      return { sandbox, contextIsolation, nodeIntegration }
    })
  )
  expect(preferences).toEqual([{ sandbox: true, contextIsolation: true, nodeIntegration: false }])

  // Registered after the app's own listener, so it sees whether the app prevented the navigation
  await app.evaluate(({ BrowserWindow }) => {
    const prevented: boolean[] = []
    Reflect.set(globalThis, 'e2eNavigations', prevented)
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.on('will-navigate', (event) => {
        prevented.push(event.defaultPrevented)
      })
    }
  })
  const url = page.url()
  await page.evaluate(() => {
    globalThis.location.assign('https://example.invalid/')
  })
  await expect
    .poll(async () => app.evaluate((): unknown => Reflect.get(globalThis, 'e2eNavigations')))
    .toEqual([true])
  expect(page.url()).toBe(url)

  expect(await page.evaluate(() => globalThis.open('about:blank') === null)).toBe(true)
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1)
  expect(app.windows()).toHaveLength(1)
})
