import log from 'electron-log/main'

/**
The handler for links the page opens in a new window: the window is always denied, and
only http and https links go to the system browser. A browser that fails to open is
logged; it must not surface as an unhandled rejection in the main process.
*/
export function createWindowOpenHandler(
  openExternal: (url: string) => Promise<void>
): (details: { url: string }) => { action: 'deny' } {
  return (details) => {
    try {
      const parsed = new URL(details.url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        openExternal(parsed.href).catch((error: unknown) => {
          log.warn('[window-open] Could not open link', error)
        })
      }
    } catch {
      // Ignore malformed URLs
    }
    return { action: 'deny' }
  }
}
