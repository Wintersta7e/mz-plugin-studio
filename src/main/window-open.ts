import log from 'electron-log/main'

/**
Opens `url` in the system browser; a browser that fails to open is logged
*/
async function openLogged(
  openExternal: (url: string) => Promise<void>,
  url: string
): Promise<void> {
  try {
    await openExternal(url)
  } catch (error) {
    log.warn('[window-open] Could not open link', error)
  }
}

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
        void openLogged(openExternal, parsed.href)
      }
    } catch {
      // Ignore malformed URLs
    }
    return { action: 'deny' }
  }
}
