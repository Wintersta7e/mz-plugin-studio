// The packaged app as it boots: window, log, Content Security Policy, profile location and the
// renderer's isolation. None of these exist in the unpackaged development build.
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { WebContents, WebPreferences } from 'electron'
import { PRODUCTION_CSP } from '../../src/main/csp'
import { expect, isWithin, runRoot, test } from '../fixtures/app'

const { version } = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
  version: string
}

/** The text of every main.log below the profile directory */
function mainLogs(userDataDir: string): string {
  return (readdirSync(userDataDir, { recursive: true }) as string[])
    .filter((file) => basename(file) === 'main.log')
    .map((file) => readFileSync(join(userDataDir, file), 'utf8'))
    .join('\n')
}

test('boots the packaged app hardened with the production policy', async ({ twin }) => {
  const { app, page } = twin
  const state = await app.evaluate(({ app, BrowserWindow }) => ({
    packaged: app.isPackaged,
    windows: BrowserWindow.getAllWindows().map((window) => window.getContentSize())
  }))
  expect(state).toEqual({ packaged: true, windows: [[1400, 900]] })
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

  const blocked = await page.evaluate(async () => {
    const directives: string[] = []
    const both = new Promise<void>((resolve) =>
      document.addEventListener('securitypolicyviolation', (event) => {
        directives.push(event.effectiveDirective)
        if (directives.length === 2) resolve()
      })
    )
    const script = document.createElement('script')
    script.textContent = 'window.e2eInlineRan = true'
    document.head.append(script)
    setTimeout('window.e2eStringRan = true', 0)
    await Promise.race([both, new Promise((resolve) => setTimeout(resolve, 5000))])
    return {
      directives: directives.sort(),
      inlineRan: 'e2eInlineRan' in window,
      stringRan: 'e2eStringRan' in window
    }
  })
  expect(blocked).toEqual({
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
      const contents = window.webContents as WebContents & {
        getLastWebPreferences(): WebPreferences | null
      }
      const { sandbox, contextIsolation, nodeIntegration } = contents.getLastWebPreferences() ?? {}
      return { sandbox, contextIsolation, nodeIntegration }
    })
  )
  expect(preferences).toEqual([{ sandbox: true, contextIsolation: true, nodeIntegration: false }])

  // Registered after the app's own listener, so it sees whether the app prevented the navigation
  await app.evaluate(({ BrowserWindow }) => {
    const prevented: boolean[] = []
    Reflect.set(globalThis, 'e2eNavigations', prevented)
    for (const window of BrowserWindow.getAllWindows())
      window.webContents.on('will-navigate', (event) => prevented.push(event.defaultPrevented))
  })
  const url = page.url()
  await page.evaluate(() => {
    location.href = 'https://example.invalid/'
  })
  await expect
    .poll(() => app.evaluate(() => Reflect.get(globalThis, 'e2eNavigations')))
    .toEqual([true])
  expect(page.url()).toBe(url)

  expect(await page.evaluate(() => window.open('about:blank') === null)).toBe(true)
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1)
  expect(app.windows()).toHaveLength(1)
})
