import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, it, expect, onTestFinished } from 'vitest'
import { ProjectParser } from '../../src/main/services/projectParser'

describe('parseNoteTags', () => {
  it('parses tag with value', () => {
    expect(ProjectParser.parseNoteTags('<foo:bar>')).toEqual({ foo: 'bar' })
  })

  it('parses tag without value (defaults to true)', () => {
    expect(ProjectParser.parseNoteTags('<noValue>')).toEqual({ noValue: 'true' })
  })

  it('parses multiple tags', () => {
    const result = ProjectParser.parseNoteTags('<hp:100>\n<mp:50>\n<boss>')

    expect(result).toEqual({ hp: '100', mp: '50', boss: 'true' })
  })

  it('returns empty object for empty string', () => {
    expect(ProjectParser.parseNoteTags('')).toEqual({})
  })

  it('returns empty object for string with no tags', () => {
    expect(ProjectParser.parseNoteTags('just some text')).toEqual({})
  })

  it('handles tags with colons in value', () => {
    // The regex captures everything after the first colon until >
    expect(ProjectParser.parseNoteTags('<url:http://example.com>')).toEqual({
      url: 'http://example.com'
    })
  })

  it('handles tags on the same line', () => {
    expect(ProjectParser.parseNoteTags('<a:1><b:2>')).toEqual({ a: '1', b: '2' })
  })

  it('handles tags with spaces in value', () => {
    expect(ProjectParser.parseNoteTags('<name:Hello World>')).toEqual({
      name: 'Hello World'
    })
  })

  it('treats space-only tag names as valid (parser limitation)', () => {
    // Known limitation: the regex doesn't reject whitespace-only tag names
    expect(ProjectParser.parseNoteTags('< >')).toEqual({ ' ': 'true' })
    // No angle brackets at all — returns empty
    expect(ProjectParser.parseNoteTags('hello world')).toEqual({})
  })

  it('overwrites duplicate tags with last value', () => {
    const result = ProjectParser.parseNoteTags('<x:1>\n<x:2>')

    expect(result).toEqual({ x: '2' })
  })

  // Each way a note tag can be written, read as the pattern reads it today.
  it.each<[string, string, Record<string, string>]>([
    ['a name alone', '<a>', { a: 'true' }],
    ['a name and an empty value', '<a:>', { a: 'true' }],
    ['a name and a value', '<a:b>', { a: 'b' }],
    ['a value holding a colon', '<a:b:c>', { a: 'b:c' }],
    ['the same tag twice in a row', '<a:b><a:b>', { a: 'b' }],
    ['a tag never closed', '<a:b', {}],
    ['a value without a name', '<:b>', {}],
    ['a space as the name', '< >', { ' ': 'true' }]
  ])('reads %s', (_shape, note, tags) => {
    expect(ProjectParser.parseNoteTags(note)).toStrictEqual(tags)
  })
})

// A project folder holding the given data files as written, removed when the test ends.
async function projectWith(files: Record<string, string>): Promise<string> {
  const project = await mkdtemp(path.join(tmpdir(), 'project-parser-'))
  onTestFinished(async () => {
    await rm(project, { recursive: true, force: true })
  })
  await mkdir(path.join(project, 'data'))
  for (const [file, json] of Object.entries(files)) {
    await writeFile(path.join(project, 'data', file), json)
  }
  return project
}

// Data files whose entries hold a name that is not text: each entry keeps its id and place with
// an empty name, and a switch or variable without a text name is left out like an unnamed one.
describe('names that are not text', () => {
  it('reads an actor name that is a number as empty', async () => {
    expect.hasAssertions()

    const project = await projectWith({
      'Actors.json': '[null,{"id":1,"name":5,"note":"x"},{"id":2,"name":"Hero","note":""}]'
    })

    await expect(ProjectParser.getActors(project)).resolves.toStrictEqual([
      { id: 1, name: '', note: 'x', noteTags: {} },
      { id: 2, name: 'Hero', note: '', noteTags: {} }
    ])
  })

  it('reads an item name that is a boolean as empty', async () => {
    expect.hasAssertions()

    const project = await projectWith({ 'Items.json': '[null,{"id":1,"name":true,"note":""}]' })

    await expect(ProjectParser.getItems(project)).resolves.toStrictEqual([
      { id: 1, name: '', note: '', noteTags: {} }
    ])
  })

  it('reads a map name that is null as empty', async () => {
    expect.hasAssertions()

    const project = await projectWith({
      'MapInfos.json': '[null,{"id":1,"name":null,"parentId":0}]'
    })

    await expect(ProjectParser.getMaps(project)).resolves.toStrictEqual([
      { id: 1, name: '', parentId: 0 }
    ])
  })

  it('reads a skill name that is a list as empty', async () => {
    expect.hasAssertions()

    const project = await projectWith({ 'Skills.json': '[null,{"id":1,"name":["Fire"]}]' })

    await expect(ProjectParser.getSkills(project)).resolves.toStrictEqual([{ id: 1, name: '' }])
  })

  it('leaves out switches and variables whose name is not text', async () => {
    expect.hasAssertions()

    const project = await projectWith({
      'System.json':
        '{"gameTitle":"Fixture","switches":["",5,"Door"],"variables":["",{"a":1},"Gold"]}'
    })
    const { switches, variables } = await ProjectParser.parseProject(project)

    expect({ switches, variables }).toStrictEqual({
      switches: [{ id: 2, name: 'Door' }],
      variables: [{ id: 2, name: 'Gold' }]
    })
  })
})

// Entries whose note, id or parent map is not of its type: the entry is read with an empty note,
// its place in the file as its id, or no parent map, and the other entries are read as written.
describe('fields that are not of their type', () => {
  it('reads an actor note that is a number as empty and keeps the other actors', async () => {
    expect.hasAssertions()

    const project = await projectWith({
      'Actors.json': '[null,{"id":1,"name":"Ann","note":5},{"id":2,"name":"Hero","note":"<a:b>"}]'
    })

    await expect(ProjectParser.getActors(project)).resolves.toStrictEqual([
      { id: 1, name: 'Ann', note: '', noteTags: {} },
      { id: 2, name: 'Hero', note: '<a:b>', noteTags: { a: 'b' } }
    ])
  })

  it('reads an item note that is an object as empty and keeps the other items', async () => {
    expect.hasAssertions()

    const project = await projectWith({
      'Items.json':
        '[null,{"id":1,"name":"Potion","note":{"a":1}},{"id":2,"name":"Ether","note":"<c>"}]'
    })

    await expect(ProjectParser.getItems(project)).resolves.toStrictEqual([
      { id: 1, name: 'Potion', note: '', noteTags: {} },
      { id: 2, name: 'Ether', note: '<c>', noteTags: { c: 'true' } }
    ])
  })

  it('reads a parent map that is text as none', async () => {
    expect.hasAssertions()

    const project = await projectWith({
      'MapInfos.json':
        '[null,{"id":1,"name":"Town","parentId":0},{"id":2,"name":"Inn","parentId":"1"}]'
    })

    await expect(ProjectParser.getMaps(project)).resolves.toStrictEqual([
      { id: 1, name: 'Town', parentId: 0 },
      { id: 2, name: 'Inn', parentId: 0 }
    ])
  })

  it('reads an id that is not a number as the place of its entry', async () => {
    expect.hasAssertions()

    const project = await projectWith({
      'Skills.json': '[null,{"id":"1","name":"Fire"},{"name":"Ice"},{"id":3,"name":"Bolt"}]'
    })

    await expect(ProjectParser.getSkills(project)).resolves.toStrictEqual([
      { id: 1, name: 'Fire' },
      { id: 2, name: 'Ice' },
      { id: 3, name: 'Bolt' }
    ])
  })

  it('reads an entry that is not an object as one without a name', async () => {
    expect.hasAssertions()

    const project = await projectWith({
      'Actors.json': '[null,5,{"id":2,"name":"Hero","note":""}]'
    })

    await expect(ProjectParser.getActors(project)).resolves.toStrictEqual([
      { id: 1, name: '', note: '', noteTags: {} },
      { id: 2, name: 'Hero', note: '', noteTags: {} }
    ])
  })

  it('reads a data file that holds no list as no entries', async () => {
    expect.hasAssertions()

    const project = await projectWith({ 'Weapons.json': '{"id":1,"name":"Sword"}' })

    await expect(ProjectParser.getWeapons(project)).resolves.toStrictEqual([])
  })
})

// A System.json whose switch list, variable list or game title is not of its kind, or that holds
// no object at all: the project opens with no switches or variables and the title "Untitled".
describe('system data that is not of its kind', () => {
  it.each([
    ['a number', '5'],
    ['text', '"ab"'],
    ['an object', '{"1":"Door"}']
  ])('reads switches and variables that are %s as none', async (_kind, list) => {
    expect.hasAssertions()

    const project = await projectWith({
      'System.json': `{"gameTitle":"Fixture","switches":${list},"variables":${list}}`
    })
    const { gameTitle, switches, variables } = await ProjectParser.parseProject(project)

    expect({ gameTitle, switches, variables }).toStrictEqual({
      gameTitle: 'Fixture',
      switches: [],
      variables: []
    })
  })

  it.each([
    ['a number', '5'],
    ['an object', '{"a":1}'],
    ['a boolean', 'true'],
    ['empty text', '""']
  ])('reads a game title that is %s as Untitled', async (_kind, title) => {
    expect.hasAssertions()

    const project = await projectWith({
      'System.json': `{"gameTitle":${title},"switches":["","Door"],"variables":[]}`
    })
    const { gameTitle, switches } = await ProjectParser.parseProject(project)

    expect({ gameTitle, switches }).toStrictEqual({
      gameTitle: 'Untitled',
      switches: [{ id: 1, name: 'Door' }]
    })
  })

  it.each([
    ['null', 'null'],
    ['a number', '5'],
    ['a list', '[]']
  ])('opens a project whose system data is %s with defaults', async (_kind, system) => {
    expect.hasAssertions()

    const project = await projectWith({ 'System.json': system })
    const { gameTitle, switches, variables } = await ProjectParser.parseProject(project)

    expect({ gameTitle, switches, variables }).toStrictEqual({
      gameTitle: 'Untitled',
      switches: [],
      variables: []
    })
  })

  it('refuses system data that is not JSON', async () => {
    expect.hasAssertions()

    const project = await projectWith({ 'System.json': '{"gameTitle":' })

    await expect(ProjectParser.parseProject(project)).rejects.toThrow(
      'Failed to parse data/System.json'
    )
  })

  it('reports a project whose system data is not JSON as not valid', async () => {
    expect.hasAssertions()

    const project = await projectWith({ 'System.json': '{"gameTitle":', 'Actors.json': '[]' })
    await mkdir(path.join(project, 'js'))
    await writeFile(path.join(project, 'js', 'plugins.js'), 'var $plugins = []')

    const { valid, error } = await ProjectParser.validateProject(project)

    expect({ valid, error: error?.startsWith('Failed to validate project: ') }).toStrictEqual({
      valid: false,
      error: true
    })
  })
})
