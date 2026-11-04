// Generated plugins and every export format, pinned for full-coverage, defect and hostile
// definitions before the escaping work changes them; and the plugins generated from parameter
// files whose defaults are not the declared type.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { generatePlugin, validatePlugin } from '../../src/renderer/src/lib/generator/index'
import { getAllClassNames, getClassInfo } from '../../src/renderer/src/lib/generator/class-registry'
import { getDefaultLiteral } from '../../src/renderer/src/lib/generator/escape'
import type { NoteParam, PluginParameter } from '../../src/shared/types/plugin'
import { deserializeParams } from '../../src/renderer/src/lib/param-io'
import { compileCheck } from '../../src/main/services/syntax-check'
import { COMMENT_PAYLOADS } from '../helpers/hostile'
import { GENERATOR_ENTRIES, countHostileLeaves, renderExports } from './corpus/generator'
import type { GeneratorEntry } from './corpus/generator'
import { MZPARAMS_HOST } from './corpus/mzparams'
import { freezeTime, restoreTime } from './corpus/normalise'
import { typeViolatingDefaultCases, type TypeViolatingDefaultCase } from './corpus/type-violating'

const HOSTILE_PAYLOADS = new Map([
  ...COMMENT_PAYLOADS.map((p): [string, string] => [`hostile-${p.name}`, p.text]),
  ['hostile-control', 'Safe']
])
const BENIGN = ['all-param-types', 'meta-full', 'fixture-generated', 'hostile-control']

const entry = (name: string): GeneratorEntry => {
  const found = GENERATOR_ENTRIES.find((e) => e.name === name)
  if (found === undefined) throw new Error(`No generator entry ${name}`)
  return found
}

// What the import path keeps of a parameter file, then the plugin generated from it.
function renderDefaultCase(c: TypeViolatingDefaultCase): string {
  const imported = deserializeParams(c.content)
  if (!imported.success) return `// refused: ${imported.reason}\n`
  const dropped = imported.dropped.map((d) => `${d.param}.${d.field}`).join(', ')
  const skipped = imported.skipped.map((s) => `${s.index} ${s.reason}`).join(', ')
  return (
    `// dropped: ${dropped === '' ? 'none' : dropped}\n` +
    `// skipped: ${skipped === '' ? 'none' : skipped}\n` +
    generatePlugin({ ...MZPARAMS_HOST, parameters: imported.parameters })
  )
}

describe('generator goldens', () => {
  beforeAll(freezeTime)

  afterAll(restoreTime)

  for (const e of GENERATOR_ENTRIES) {
    it(`${e.name}: generatePlugin`, async () => {
      await expect(generatePlugin(e.def)).toMatchFileSnapshot(`__golden__/generator/${e.name}.js`)
    })

    it(`${e.name}: exports`, async () => {
      await expect(renderExports(e)).toMatchFileSnapshot(
        `__golden__/generator/${e.name}.exports.txt`
      )
    })
  }

  for (const c of typeViolatingDefaultCases) {
    it(`${c.name}: imported and generated`, async () => {
      expect.hasAssertions()
      await expect(renderDefaultCase(c)).toMatchFileSnapshot(`__golden__/generator/${c.name}.js`)
    })
  }

  it('hostile entries fill every string leaf', () => {
    const leaves = [...HOSTILE_PAYLOADS].map(([name, payload]) =>
      countHostileLeaves(entry(name).def, payload)
    )
    const hostile = GENERATOR_ENTRIES.filter((e) => e.name.startsWith('hostile-')).length - 1
    console.log(
      `generator entries ${GENERATOR_ENTRIES.length} (hostile ${hostile}, ` +
        `leaves ${leaves[0].holding}/${leaves[0].total})`
    )

    expect(hostile).toBe(COMMENT_PAYLOADS.length)

    for (const count of leaves) {
      expect(count.total).toBeGreaterThan(0)
      expect(count).toEqual(leaves[0])
      expect(count.holding).toBe(count.total)
    }
  })

  it('benign entries compile', () => {
    for (const name of BENIGN) {
      expect(compileCheck(generatePlugin(entry(name).def), `${name}.js`), name).toBeNull()
    }
  })
})

const customCodeRows = (): GeneratorEntry['def'] => structuredClone(entry('custom-code').def)

describe('generator rules no file golden reaches', () => {
  it('registers no command the custom code already registers', () => {
    const definition = customCodeRows()
    definition.customCode = "PluginManager.registerCommand(PLUGIN_NAME, 'Show', function () {})"

    expect(generatePlugin(definition).match(/registerCommand\(PLUGIN_NAME, 'Show'/g)).toStrictEqual(
      ["registerCommand(PLUGIN_NAME, 'Show'"]
    )
  })

  it('names duplicate commands, duplicate arguments and built-in command names', () => {
    const definition = customCodeRows()
    const arg: PluginParameter = {
      id: 'n',
      name: 'n',
      text: 'N',
      desc: '',
      type: 'number',
      default: 0
    }
    definition.customCode = ''
    definition.commands = [
      { id: 'a', name: 'Show', text: 'Show', desc: '', args: [arg, { ...arg, id: 'n2' }] },
      { id: 'b', name: 'Show', text: 'Show', desc: '', args: [] },
      { id: 'c', name: 'Wait', text: 'Wait', desc: '', args: [] }
    ]

    expect(validatePlugin(definition)).toStrictEqual({
      valid: false,
      errors: ['Duplicate argument name in command Show: n', 'Duplicate command name: Show'],
      warnings: ['Command "Wait" shadows a built-in RPG Maker MZ command']
    })
  })

  it('names parameters whose identifiers collide, are reserved or start with a digit', () => {
    const definition = customCodeRows()
    const param: PluginParameter = {
      id: 'p',
      name: 'p',
      text: '',
      desc: '',
      type: 'string',
      default: ''
    }
    definition.customCode = ''
    definition.commands = []
    definition.structs = []
    definition.parameters = ['foo-bar', 'Foo Bar', 'class', '1st'].map((name) => ({
      ...param,
      id: name,
      name
    }))

    expect(validatePlugin(definition)).toStrictEqual({
      valid: false,
      errors: [
        'Parameters "foo-bar" and "Foo Bar" both generate identifier "fooBar" — rename one to avoid a duplicate declaration'
      ],
      warnings: [
        'Parameter "foo-bar" is not a valid JS identifier (will still work in MZ)',
        'Parameter "Foo Bar" is not a valid JS identifier (will still work in MZ)',
        'Parameter "class" is a reserved name; the generated variable will be "class_"',
        'Parameter "1st" is not a valid JS identifier (will still work in MZ)',
        'Parameter "1st" starts with a digit; the generated variable will be "_1st"'
      ]
    })
  })

  it('lists the class registry in code-unit order', () => {
    const names = getAllClassNames()

    expect(names.length).toBeGreaterThan(1)
    expect(names.every((name, index) => index === 0 || (names.at(index - 1) ?? name) < name)).toBe(
      true
    )
  })

  it('finds a registry class by name and none for an unknown one', () => {
    expect(getClassInfo('Bitmap')?.category).toBe('core')
    expect(getClassInfo('NoSuchClass')).toBeUndefined()
  })

  it('writes a boolean default from its text, any case', () => {
    expect(getDefaultLiteral('boolean', 'TRUE')).toBe('true')
    expect(getDefaultLiteral('boolean', 'no')).toBe('false')
  })
})

// A saved note group is checked for its name and type only, so its other fields can hold any
// saved value.
describe('generator output for saved note groups', () => {
  it('leaves out note group fields that hold an empty or false value of any type', () => {
    const definition = customCodeRows()
    const portrait: NoteParam = { name: 'Portrait', type: 'file' }
    const face: NoteParam = { name: 'Face', type: 'file' }
    Object.assign(portrait, JSON.parse('{"dir":0,"data":false}') as unknown)
    Object.assign(face, JSON.parse('{"dir":null,"data":""}') as unknown)
    definition.meta.noteParams = [portrait, face]

    expect(generatePlugin(definition)).toContain(
      ' * @noteParam Portrait\n * @noteType file\n * @noteParam Face\n * @noteType file\n'
    )
  })
})
