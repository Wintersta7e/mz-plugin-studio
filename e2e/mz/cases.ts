// The plugins the MZ runtime test installs, and the verdict on one boot with a case installed,
// judged against the errors the same copy logs when it boots with no case at all, and against
// what the conformance expectations say the case's parameters and commands compute.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { generatePlugin } from '../../src/renderer/src/lib/generator/index'
import {
  appendTemplateCode,
  getAllTemplates
} from '../../src/renderer/src/lib/generator/templates/index'
import { saveFileName } from '../../src/renderer/src/lib/plugin-output'
import { PluginParser } from '../../src/main/services/plugin-parser'
import { createEmptyPlugin } from '../../src/shared/types/plugin'
import { runRoot } from '../fixtures/app'
import {
  caseExpectations,
  conformanceCases,
  judgeLoad,
  templateValues,
  type CaseExpectation,
  type ConformanceFinding,
  type LoadPlan
} from '../../tests/helpers/mz-conformance'
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
  /**
  The one load of the expectation this boot runs: its stored values and the commands the
  event calls.
  */
  load?: LoadPlan
}

export type VerdictPart = 'o1' | 'o2' | 'o3' | 'o4' | 'hostile'

export interface CaseVerdict {
  id: string
  /**
  What each check found wrong; a check passes with an empty list.
  */
  parts: Record<VerdictPart, string[]>
  /**
  Commands the event found registered, and values the observed code recorded.
  */
  commands: number
  values: number
}

const stemOf = (fileName: string): string => fileName.replace(/\.js$/i, '')

/**
The plugin name the event calls the case's commands by: the file the app saved it as, which
differs from the file it is installed as only when its own code reads its parameters under
another name.
*/
export function commandPluginOf(kase: MzCase): string {
  return kase.expectation === undefined ? kase.file : stemOf(kase.expectation.case.fileName)
}

/**
A plugin judged by the expectations as a generated one is: its header read from its own code,
its first load (the header's defaults).
*/
function judgedCase(kind: 'planted' | 'authored', id: string, file: string, code: string): MzCase {
  const fileName = `${file}.js`
  const expectation = caseExpectations({
    id,
    fileName,
    code,
    kind: 'generated',
    definition: PluginParser.parsePlugin(code, fileName)
  })
  return {
    id,
    kind,
    file,
    code: expectation.observedCode,
    expectation,
    ...(expectation.loads[0] !== undefined && { load: expectation.loads[0] })
  }
}

const READS_TEXT = `/*:
 * @target MZ
 * @plugindesc Reads its number parameter as text
 *
 * @param count
 * @type number
 * @default 3
 */
(() => {
  const params = PluginManager.parameters('PlantedReadsText');
  const count = String(params['count']);
})();
`

const OTHER_NAME = `/*:
 * @target MZ
 * @plugindesc Registers its command under another plugin's name
 *
 * @command ping
 */
(() => {
  PluginManager.registerCommand('AnotherPlugin', 'ping', function () {});
})();
`

/**
Plugins each check must catch, and one it must let through.
*/
export function plantedCases(): Record<
  'throwsAtLoad' | 'logsError' | 'silent' | 'readsText' | 'otherName',
  MzCase
> {
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
    silent: planted('planted-silent', 'PlantedSilent', '// Loads and logs nothing\n'),
    readsText: judgedCase('planted', 'planted-reads-text', 'PlantedReadsText', READS_TEXT),
    otherName: judgedCase('planted', 'planted-other-name', 'PlantedOtherName', OTHER_NAME)
  }
}

/**
A script holding `source` as the body of a function it never calls: it loads only in an engine
that compiles the source.
*/
export const uncalledScript = (source: string): string =>
  `// Compiled at load, never called\n(function () {\n${source}\n});\n`

/**
A plugin holding one syntax form in a function it never calls.
*/
export function engineOnlyCase(source: string): MzCase {
  return {
    id: 'planted-engine-only',
    kind: 'planted',
    file: 'PlantedEngineOnly',
    code: uncalledScript(source)
  }
}

/**
Every template the app registers, each inserted into a plugin of its own with the values the
corpus inserts it with: its defaults, and a value for each required field left empty.
*/
export function templateCases(): MzCase[] {
  return getAllTemplates().map((template): MzCase => {
    const empty = createEmptyPlugin()
    const definition = {
      ...empty,
      meta: { ...empty.meta, name: `Template_${template.id.replaceAll('-', '_')}` },
      customCode: appendTemplateCode('', template.generate(templateValues(template.id)))
    }
    return {
      id: `template:${template.id}`,
      kind: 'template',
      file: stemOf(saveFileName(definition)),
      code: generatePlugin(definition)
    }
  })
}

/**
The folder the app's saved plugins are kept in, outside the copy: each install resets the copy,
and a file the copy already holds is refused as the project's own.
*/
export const authoredDirectory = (): string => path.join(runRoot(), 'mz-authored')

/**
A plugin the app saved, judged as a generated one is, under the name it was saved by.
*/
function authoredCase(file: string): MzCase {
  const stem = stemOf(path.basename(file))
  return judgedCase('authored', `authored:${stem}`, stem, readFileSync(file, 'utf8'))
}

/**
Every plugin the authoring test saved through the app this run, by file name; none before it ran.
*/
export function authoredCases(): MzCase[] {
  const directory = authoredDirectory()
  return existsSync(directory)
    ? readdirSync(directory)
        .filter((name) => name.endsWith('.js'))
        .toSorted((left, right) => left.localeCompare(right))
        .map((name) => authoredCase(path.join(directory, name)))
    : []
}

// A case whose code does not parse loads nothing, and is judged once on nothing
const UNLOADED: LoadPlan = { set: 'defaults', stored: {}, commands: [] }

/**
Every conformance case, one boot per value set: the observed code under the name it is loaded
by, that set's stored values, and the commands an event calls with that set's args.
*/
export function corpusCases(): MzCase[] {
  return conformanceCases().flatMap((c) => {
    const expectation = caseExpectations(c)
    const loads = expectation.loads.length === 0 ? [UNLOADED] : expectation.loads
    return loads.map((load): MzCase => ({
      id: `${c.id}@${load.set}`,
      kind: c.kind,
      file: expectation.loadName,
      code: expectation.observedCode,
      expectation,
      load
    }))
  })
}

/**
The check a finding fails: a value or a mismatch is a command's when it concerns an argument
or a registered name, else the parameters'.
*/
function partOf(finding: ConformanceFinding): VerdictPart {
  if (finding.kind === 'load-error') return 'o1'
  if (finding.kind === 'command-keys' || finding.kind === 'callback-this') return 'o4'
  return /argument of |^code registers |^header declares /.test(finding.detail) ? 'o4' : 'o3'
}

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)

const constantsIn = (json: string): number => {
  const parsed: unknown = JSON.parse(json)
  return isList(parsed) ? parsed.length : 0
}

/**
The verdict on one boot: an error the baseline boot also logged is the engine's, not the case's;
what the observed code recorded is judged by the expectations, when the case has them.
*/
export function verdictOf(
  kase: MzCase,
  report: ObserverReport,
  baseline: readonly string[]
): CaseVerdict {
  const isNew = (text: string): boolean => !baseline.includes(text)
  const findings =
    kase.expectation === undefined
      ? []
      : judgeLoad(kase.expectation, kase.load ?? UNLOADED, {
          // Load errors are the load check's, judged against the baseline
          errors: [],
          calls: report.records,
          ran: report.ran
        })
  const judged = (part: VerdictPart): string[] =>
    findings
      .filter((finding) => partOf(finding) === part)
      .map((finding) => `${finding.kind}: ${finding.detail}`)
  return {
    id: kase.id,
    parts: {
      o1: [
        ...report.loadErrors.filter((text) => isNew(text)),
        ...(report.errorPrinter === '' ? [] : [`error printer: ${report.errorPrinter}`]),
        ...judged('o1')
      ],
      o2: [
        ...(report.failure === undefined ? [] : [report.failure]),
        ...report.bootErrors.filter((text) => isNew(text))
      ],
      o3: judged('o3'),
      o4: judged('o4'),
      hostile: report.isSentinelSet ? ['the hostile sentinel is set'] : []
    },
    commands: report.ran.length,
    values: report.records.reduce((sum, record) => sum + constantsIn(record[3]), 0)
  }
}
