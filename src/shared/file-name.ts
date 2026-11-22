// The rule for a plugin's file name, without `node:path`, so the main process's save check and
// the renderer's validator read one rule

/**
A name Windows opens as a device in any folder: CON, PRN, AUX, NUL, CONIN$, CONOUT$, COM1-9,
LPT1-9 and COM or LPT with a superscript 1-3, in any case, also with spaces after it or an
extension (`NUL.js`, `aux .js`). COM0 and LPT0 are not on Node's own list for `path.win32`.
*/
export const WIN32_DEVICE_NAME =
  /^(?:con|prn|aux|nul|conin\$|conout\$|(?:com|lpt)[1-9\u{B9}\u{B2}\u{B3}]) *(?:\..*)?$/iu

/**
Why a filename is not a simple `.js` name (a path separator, NUL, ':', traversal or a Windows
device name, or another extension), or undefined when it is one. It is checked for both platforms
at once.
*/
export function unsafeFileNameReason(filename: string): string | undefined {
  // ':' would open an alternate data stream on NTFS (x.js:ads.js)
  if (typeof filename !== 'string' || filename.includes('\0') || filename.includes(':')) {
    return `Invalid filename: ${JSON.stringify(filename)}`
  }
  if (filename === '.' || filename === '..' || /[\\/]/.test(filename)) {
    return 'Invalid filename: must not contain path separators or traversal'
  }
  if (WIN32_DEVICE_NAME.test(filename)) {
    return `Invalid filename: ${JSON.stringify(filename)} is a device name on Windows`
  }
  if (!filename.endsWith('.js')) {
    return 'Invalid filename: must have .js extension'
  }
  return undefined
}
