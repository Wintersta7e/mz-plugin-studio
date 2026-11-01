// Content Security Policy and the page's file requests. The app ships everything it loads, so the
// page may load only its own files; the dev server additionally needs inline scripts and eval for
// hot reload, and its socket. Workers start from a blob so they inherit the page's policy.
import type { Session } from 'electron'
import { posix, win32 } from 'path'
import { fileURLToPath } from 'url'

export function buildCsp({ devServer }: { devServer: boolean }): string {
  return [
    "default-src 'none'",
    devServer ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    ...(devServer ? ["connect-src 'self' ws://localhost:*"] : []),
    devServer ? "worker-src 'self'" : 'worker-src blob:',
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'"
  ].join('; ')
}

export const PRODUCTION_CSP = buildCsp({ devServer: false })
export const DEV_SERVER_CSP = buildCsp({ devServer: true })

/** True when a `file:` URL names a path inside the renderer folder; any unreadable URL is not */
export function isFileRequestAllowed(
  url: string,
  rendererRoot: string,
  platform: NodeJS.Platform = process.platform
): boolean {
  try {
    const windows = platform === 'win32'
    const target = fileURLToPath(url, { windows })
    const rel = windows
      ? win32.relative(rendererRoot.toLowerCase(), target.toLowerCase())
      : posix.relative(rendererRoot, target)
    const path = windows ? win32 : posix
    return rel.split(path.sep)[0] !== '..' && !path.isAbsolute(rel)
  } catch {
    return false
  }
}

/** Cancels every `file:` request the page or its workers send outside the renderer folder */
export function installFileRequestFilter(session: Session, rendererRoot: string): void {
  session.webRequest.onBeforeRequest({ urls: ['file://*/*'] }, (details, callback) => {
    callback({ cancel: !isFileRequestAllowed(details.url, rendererRoot) })
  })
}
