// Shared by every test project: electron-log's entry points load the Electron binary on
// import, so both are replaced with an inert logger. Members grow only when src/ reads more.
import { vi } from 'vitest'

const { makeLogger } = vi.hoisted(() => ({
  makeLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    initialize: vi.fn(),
    setLevel: vi.fn(),
    transports: {
      file: { level: 'info', getFile: () => ({ path: '<log-path>' }) },
      console: { level: 'info' }
    }
  })
}))

vi.mock('electron-log/main', () => ({ default: makeLogger() }))
vi.mock('electron-log/renderer', () => ({ default: makeLogger() }))
