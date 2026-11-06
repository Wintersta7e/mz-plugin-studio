// Shared by every test project: electron-log's entry points load the Electron binary on
// import, so both are replaced with an inert logger. Members grow only when src/ reads more.
import { vi } from 'vitest'

type LogLine = (...params: unknown[]) => void

// What src/ reads of each entry's logger. The real modules have every member, so each mock is
// checked against these shapes rather than against all of electron-log's.
interface LoggerView {
  error: LogLine
  warn: LogLine
  info: LogLine
  debug: LogLine
}

interface MainLoggerView extends LoggerView {
  initialize: () => void
  transports: {
    file: { level: string | false; getFile: () => { path: string } }
    console: { level: string | false }
  }
}

const { makeLogger } = vi.hoisted(() => ({
  makeLogger: () => ({
    error: vi.fn<LogLine>(),
    warn: vi.fn<LogLine>(),
    info: vi.fn<LogLine>(),
    debug: vi.fn<LogLine>(),
    initialize: vi.fn<() => void>(),
    setLevel: vi.fn<(level: string) => void>(),
    transports: {
      file: { level: 'info', getFile: () => ({ path: '<log-path>' }) },
      console: { level: 'info' }
    }
  })
}))

vi.mock<{ default: MainLoggerView }>(import('electron-log/main'), () => ({ default: makeLogger() }))
vi.mock<{ default: LoggerView }>(import('electron-log/renderer'), () => ({
  default: makeLogger()
}))
