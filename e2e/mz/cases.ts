// The plugins the MZ runtime test installs, and the verdict on one boot with a case installed,
// judged against the errors the same copy logs when it boots with no case at all.
import type { CaseExpectation } from '../../tests/helpers/mz-conformance'
import type { ObserverReport } from './observer'

export type MzLevel = 'browser' | 'nwjs'

export interface MzCase {
  id: string
  kind: 'template' | 'generated' | 'raw-mode' | 'authored' | 'planted'
  /**
  The plugin's file name in `js/plugins/`, without `.js`.
  */
  file: string
  code: string
  expectation?: CaseExpectation
}

export type VerdictPart = 'o1' | 'o2' | 'o3' | 'o4' | 'hostile'

export interface CaseVerdict {
  id: string
  /**
  What each check found wrong; a check passes with an empty list.
  */
  parts: Record<VerdictPart, string[]>
}

/**
Plugins each check must catch, and one it must let through.
*/
export function plantedCases(): Record<'throwsAtLoad' | 'logsError' | 'silent', MzCase> {
  const planted = (id: string, file: string, code: string): MzCase => ({
    id,
    kind: 'planted',
    file,
    code
  })
  return {
    throwsAtLoad: planted(
      'planted-throws-at-load',
      'PlantedThrowsAtLoad',
      "throw new Error('planted at load');\n"
    ),
    logsError: planted('planted-logs-error', 'PlantedLogsError', "console.error('planted');\n"),
    silent: planted('planted-silent', 'PlantedSilent', '// Loads and logs nothing\n')
  }
}

/**
The verdict on one boot: an error the baseline boot also logged is the engine's, not the case's.
*/
export function verdictOf(
  kase: MzCase,
  report: ObserverReport,
  baseline: readonly string[]
): CaseVerdict {
  const isNew = (text: string): boolean => !baseline.includes(text)
  return {
    id: kase.id,
    parts: {
      o1: [
        ...report.loadErrors.filter((text) => isNew(text)),
        ...(report.errorPrinter === '' ? [] : [`error printer: ${report.errorPrinter}`])
      ],
      o2: [
        ...(report.failure === undefined ? [] : [report.failure]),
        ...report.bootErrors.filter((text) => isNew(text))
      ],
      o3: [],
      o4: [],
      hostile: []
    }
  }
}
