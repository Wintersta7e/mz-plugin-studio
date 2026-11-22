// The code templates check a name the generated code declares or reads by the same identifier
// rule as the generator, so a name in letters other than A-Z is accepted wherever code accepts it.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getTemplate,
  getTemplateDefaults,
  validateTemplateValues
} from '../../src/renderer/src/lib/generator/templates/index'
import { compileCheck } from '../../src/main/services/syntax-check'

const SOURCE_ROOT = path.join(import.meta.dirname, '../../src')

// The identifier checks written by hand in ASCII only, which refuse a letter of any other script
const ASCII_IDENTIFIER_RULES = [String.raw`/^[a-z_]\w*$/i`, String.raw`/^[a-z_$][\w$]*$/i`]

// Each template and the names in letters other than A-Z it is given, beside the values it needs
const NON_ASCII_NAMES: readonly {
  readonly id: string
  readonly names: Readonly<Record<string, string>>
  readonly values?: Readonly<Record<string, unknown>>
}[] = [
  {
    id: 'plugin-command-basic',
    names: { commandName: '移動', arg1Name: '対象', arg2Name: '値' },
    values: { pluginName: 'MyPlugin' }
  },
  {
    id: 'plugin-command-async',
    names: { commandName: '移動' },
    values: { pluginName: 'MyPlugin' }
  },
  {
    id: 'plugin-command-validated',
    names: { commandName: '移動' },
    values: { pluginName: 'MyPlugin' }
  },
  { id: 'menu-custom-scene', names: { sceneName: '図鑑', windowName: '一覧' } },
  { id: 'menu-title-mod', names: { commandSymbol: '続き' }, values: { commandName: 'More' } },
  {
    id: 'menu-command-addition',
    names: { commandSymbol: '図鑑' },
    values: { commandName: 'Book' }
  },
  {
    id: 'menu-options-addition',
    names: { optionSymbol: '音量' },
    values: { optionName: 'Volume' }
  },
  {
    id: 'database-ext-notetag',
    names: { tagName: '速度', propertyName: '速さ' },
    values: { databaseType: '$dataActors' }
  },
  { id: 'map-event-spawn', names: { functionName: '出現' } },
  { id: 'map-movement-route', names: { functionName: '経路' } },
  { id: 'map-parallel-process', names: { processName: '処理' } },
  { id: 'audio-bgm-control', names: { functionName: '再生' }, values: { filename: 'Theme1' } },
  { id: 'save-load-basic', names: { dataName: '記録' } },
  { id: 'actor-custom-property', names: { propertyName: '友好度' } }
]

describe('template identifier checks', () => {
  it('holds no identifier check written in ASCII letters only', () => {
    const files = readdirSync(SOURCE_ROOT, { recursive: true, encoding: 'utf8' }).filter((p) =>
      /\.tsx?$/u.test(p)
    )
    const holders = files.flatMap((p) => {
      const source = readFileSync(path.join(SOURCE_ROOT, p), 'utf8')
      const count = ASCII_IDENTIFIER_RULES.reduce(
        (sum, rule) => sum + source.split(rule).length - 1,
        0
      )
      return Array.from({ length: count }, () => p.split(path.sep).join('/'))
    })

    expect(files.length).toBeGreaterThan(0)
    expect(holders, `ascii identifier rules: ${String(holders.length)}`).toStrictEqual([])
  })

  it.each(NON_ASCII_NAMES)('$id accepts names in letters other than A-Z', (entry) => {
    const template = getTemplate(entry.id)
    const values = { ...getTemplateDefaults(entry.id), ...entry.values, ...entry.names }
    const code = template?.generate(values) ?? ''

    expect(validateTemplateValues(entry.id, values)).toStrictEqual({ valid: true, errors: [] })
    expect(Object.values(entry.names).filter((name) => !code.includes(name))).toStrictEqual([])
    expect(compileCheck(code, 'plugin.js')).toBeNull()
  })

  it('refuses a tag name with a dollar sign, which the note reader matches as the line end', () => {
    const values = {
      ...getTemplateDefaults('database-ext-notetag'),
      databaseType: '$dataActors',
      tagName: '$speed'
    }

    expect(validateTemplateValues('database-ext-notetag', values).errors).toContain(
      'Tag Name must start with a letter or underscore and contain only letters, numbers, and underscores'
    )
  })
})
