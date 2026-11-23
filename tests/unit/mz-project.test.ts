// The runtime test reaches the user's MZ project only through a copy: a folder that is not a
// project, or that holds a link, is refused before anything is copied, and the copy is compared
// with the project's own manifest when it is gone. Runs on synthetic folders only.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync
} from 'node:fs'
import { get } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { crc32, inflateSync } from 'node:zlib'
import { afterEach, describe, expect, it } from 'vitest'
import {
  PLACEHOLDER_PNG,
  REQUIRED_FILES,
  compareManifests,
  copyProject,
  installCase,
  launchOnce,
  nwjsCommand,
  removeCopy,
  requireProjectFiles,
  resetCopy,
  scanForLeaks,
  serveCopy,
  storedImages,
  UNLOAD_DISALLOWED,
  takeManifest
} from '../../e2e/fixtures/mz-project'
import { PluginParser } from '../../src/main/services/plugin-parser'
import type { PluginParameter } from '../../src/shared/types/plugin'

const PNG_SIGNATURE = '89504e470d0a1a0a'

/**
The chunks of a PNG file after its signature, each with whether its checksum matches and its
data in hex, the image data inflated; fails on a file without the signature.
*/
function pngChunks(file: Buffer): { type: string; isCrcRight: boolean; data: string }[] {
  if (file.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) throw new Error('not a PNG file')
  const chunks: { type: string; isCrcRight: boolean; data: string }[] = []
  let offset = 8
  while (offset < file.length) {
    const length = file.readUInt32BE(offset)
    const type = file.toString('latin1', offset + 4, offset + 8)
    const data = file.subarray(offset + 8, offset + 8 + length)
    const isCrcRight =
      file.readUInt32BE(offset + 8 + length) ===
      crc32(file.subarray(offset + 4, offset + 8 + length))
    chunks.push({
      type,
      isCrcRight,
      data: (type === 'IDAT' ? inflateSync(data) : data).toString('hex')
    })
    offset += 12 + length
  }
  return chunks
}

const folders: string[] = []

function removeFolders(): void {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true })
}

function temporaryFolder(): string {
  const folder = mkdtempSync(path.join(tmpdir(), 'mz-project-'))
  folders.push(folder)
  return folder
}

function writeFile(root: string, relative: string, text: string): void {
  mkdirSync(path.dirname(path.join(root, relative)), { recursive: true })
  writeFileSync(path.join(root, relative), text)
}

/**
A folder holding every file an MZ project needs, and one plugin.
*/
function syntheticProject(): string {
  const project = temporaryFolder()
  for (const file of REQUIRED_FILES) writeFile(project, file, `// ${file}\n`)
  writeFile(project, 'js/plugins/Example.js', '// a plugin\n')
  return project
}

const filesUnder = (folder: string): string[] =>
  existsSync(folder) ? readdirSync(folder, { recursive: true, encoding: 'utf8' }) : []

describe('the MZ project copy', () => {
  afterEach(removeFolders)

  it('refuses a folder that lacks a required file, naming it', () => {
    const project = syntheticProject()
    rmSync(path.join(project, 'data/System.json'))

    expect(() => {
      requireProjectFiles(project)
    }).toThrow('data/System.json')
    expect(() => {
      requireProjectFiles(syntheticProject())
    }).not.toThrow()
  })

  it('refuses a project holding a linked folder, naming it, before copying anything', () => {
    const project = syntheticProject()
    const outside = temporaryFolder()
    writeFile(outside, 'kept.txt', 'outside the project\n')
    mkdirSync(path.join(project, 'img'))
    symlinkSync(
      outside,
      path.join(project, 'img/linked'),
      process.platform === 'win32' ? 'junction' : 'dir'
    )
    const target = path.join(temporaryFolder(), 'copy')

    expect(() => {
      takeManifest(project)
    }).toThrow('linked entry in the MZ project: img/linked')
    expect(() => {
      copyProject(project, target)
    }).toThrow('img/linked')
    expect(filesUnder(target)).toStrictEqual([])
  })

  it('refuses a copy inside the project and creates nothing', () => {
    const project = syntheticProject()
    const target = path.join(project, 'save/copy')

    expect(() => {
      copyProject(project, target)
    }).toThrow('inside the project')
    expect(existsSync(path.join(project, 'save'))).toBe(false)
  })

  it('copies every file and names a copied file whose time changed', async () => {
    expect.hasAssertions()

    const project = syntheticProject()
    const copy = path.join(temporaryFolder(), 'copy')
    copyProject(project, copy)
    const copied = takeManifest(copy)

    expect(
      copied.files
        .keys()
        .toArray()
        .toSorted((a, b) => a.localeCompare(b))
    ).toStrictEqual(
      takeManifest(project)
        .files.keys()
        .toArray()
        .toSorted((a, b) => a.localeCompare(b))
    )
    expect(compareManifests(copied, takeManifest(copy))).toStrictEqual([])

    utimesSync(path.join(copy, 'js/main.js'), new Date(2001, 0, 1), new Date(2001, 0, 1))

    expect(compareManifests(copied, takeManifest(copy))).toStrictEqual(['js/main.js'])

    await removeCopy(copy)

    expect(existsSync(copy)).toBe(false)
  })
})

describe('the MZ project manifest and leak scan', () => {
  afterEach(removeFolders)

  it('fails the manifest of a folder that holds no file', () => {
    const empty = temporaryFolder()
    mkdirSync(path.join(empty, 'data'))

    expect(() => {
      takeManifest(empty)
    }).toThrow('holds no file')
  })

  it('finds a planted needle in a text and in a file, and counts what it scanned', () => {
    const folder = temporaryFolder()
    writeFile(folder, 'out.log', 'line one\nPlanted Needle here\n')
    const file = path.join(folder, 'out.log')
    const found = scanForLeaks(['Planted Needle'], ['clean', 'has Planted Needle'], [file])

    expect(found).toStrictEqual({
      hits: ['text 1: Planted Needle', `${file}: Planted Needle`],
      scanned: 3
    })
    expect(scanForLeaks(['Planted Needle'], [], [])).toStrictEqual({ hits: [], scanned: 0 })
  })
})

const STOCK_PLUGINS = [
  '// Generated by RPG Maker.',
  '// Do not edit this file directly.',
  'var $plugins =',
  '[',
  '{"name":"StockOne","status":true,"description":"First","parameters":{"a":"1"}},',
  '{"name":"StockTwo","status":false,"description":"Second","parameters":{}}',
  '];',
  ''
].join('\n')
const STOCK_EVENTS =
  '[\nnull,\n{"id":1,"list":[{"code":0,"indent":0,"parameters":[]}],"name":"Stock","switchId":1,"trigger":0}\n]'

/**
A copy of a synthetic project with a stock plugin list of two entries and one common event.
*/
function syntheticCopy(): string {
  const copy = syntheticProject()
  writeFile(copy, 'js/plugins.js', STOCK_PLUGINS)
  writeFile(copy, 'data/CommonEvents.json', STOCK_EVENTS)
  return copy
}

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)

const readText = (copy: string, relative: string): string =>
  readFileSync(path.join(copy, relative), 'utf8')

/**
The names in the copy's plugin list, failing when a line between the brackets is not one
JSON object.
*/
function listedPlugins(copy: string): string[] {
  const lines = readText(copy, 'js/plugins.js').split('\n')
  const entries = lines.slice(lines.indexOf('[') + 1, lines.indexOf('];'))
  return entries.map((line) => {
    const entry: unknown = JSON.parse(line.replace(/,$/u, ''))
    return typeof entry === 'object' && entry !== null
      ? String(Reflect.get(entry, 'name'))
      : `not an entry: ${line}`
  })
}

/**
The status and body of a request for `rawPath`, sent as written.
*/
async function request(origin: string, rawPath: string): Promise<{ status: number; body: string }> {
  const { hostname, port } = new URL(origin)
  return new Promise((resolve, reject) => {
    get({ hostname, port, path: rawPath }, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk: string) => {
        body += chunk
      })
      response.on('end', () => {
        resolve({ status: response.statusCode ?? 0, body })
      })
    }).on('error', reject)
  })
}

describe('a case installed into the copy', () => {
  afterEach(removeFolders)

  it('lists the observer first and the case last, and adds one event command per command', () => {
    const copy = syntheticCopy()
    const { commonEventId } = installCase(copy, {
      observer: { file: 'Observer', source: '// observer\n' },
      plugin: { file: 'Case', source: '// case\n', parameters: { speed: '3' } },
      commands: [
        { name: 'First', args: { a: '1' } },
        { name: 'Second', args: {} }
      ]
    })
    const events: unknown = JSON.parse(readText(copy, 'data/CommonEvents.json'))
    const added: unknown = isList(events) ? events.at(commonEventId) : undefined

    expect(listedPlugins(copy)).toStrictEqual(['Observer', 'StockOne', 'StockTwo', 'Case'])
    expect(readText(copy, 'js/plugins/Case.js')).toBe('// case\n')
    expect(readText(copy, 'js/plugins/Observer.js')).toBe('// observer\n')
    expect(commonEventId).toBe(2)
    expect(added).toMatchObject({
      id: 2,
      list: [
        { code: 357, parameters: ['Case', 'First', 'First', { a: '1' }] },
        { code: 357, parameters: ['Case', 'Second', 'Second', {}] },
        { code: 0 }
      ]
    })
  })

  it('restores the stock plugin list and events byte for byte and removes the installed files', () => {
    const copy = syntheticCopy()
    installCase(copy, {
      observer: { file: 'Observer', source: '// observer\n' },
      plugin: { file: 'Case', source: '// case\n', parameters: {} },
      commands: [{ name: 'Run', args: {} }]
    })
    resetCopy(copy)

    expect(readText(copy, 'js/plugins.js')).toBe(STOCK_PLUGINS)
    expect(readText(copy, 'data/CommonEvents.json')).toBe(STOCK_EVENTS)
    expect(existsSync(path.join(copy, 'js/plugins/Case.js'))).toBe(false)
    expect(existsSync(path.join(copy, 'js/plugins/Observer.js'))).toBe(false)
  })

  it('refuses to install over a plugin file the project holds', () => {
    const copy = syntheticCopy()

    expect(() =>
      installCase(copy, {
        observer: { file: 'Example', source: '// observer\n' },
        commands: []
      })
    ).toThrow('js/plugins/Example.js')
    expect(readText(copy, 'js/plugins/Example.js')).toBe('// a plugin\n')
  })

  it('serves files of the copy by their encoded name and nothing outside it', async () => {
    expect.hasAssertions()

    const root = temporaryFolder()
    writeFile(root, 'outside', 'outside the copy\n')
    const copy = path.join(root, 'copy')
    writeFile(copy, 'js/plugins/2nd My-Plugin.js', '// spaced\n')
    const server = await serveCopy(copy)
    try {
      await expect(request(server.origin, '/js/plugins/2nd%20My-Plugin.js')).resolves.toStrictEqual(
        { status: 200, body: '// spaced\n' }
      )
      await expect(request(server.origin, '/../outside')).resolves.toMatchObject({ status: 404 })
      await expect(request(server.origin, '/%2e%2e/outside')).resolves.toMatchObject({
        status: 404
      })
      await expect(request(server.origin, '/js/%E0%A4%A')).resolves.toMatchObject({ status: 400 })
      await expect(request(server.origin, '/js/plugins/missing.js')).resolves.toMatchObject({
        status: 404
      })
    } finally {
      await server.close()
    }
  })
})

/**
A file parameter of the folder `folder`.
*/
const fileParameter = (
  name: string,
  folder: string
): Pick<PluginParameter, 'name' | 'type' | 'dir'> => ({ name, type: 'file', dir: folder })

/**
A synthetic project holding the picture `img/pictures/Kept.png`.
*/
function projectWithPicture(): string {
  const project = syntheticCopy()
  writeFile(project, 'img/pictures/Kept.png', 'a stock picture\n')
  return project
}

/**
A copy of `project` with an observer installed and three stored images: the project's own
`img/pictures/Kept.png`, one it lacks in the same folder, one in a folder it lacks.
*/
function copyWithImages(project = projectWithPicture()): string {
  const copy = path.join(temporaryFolder(), 'copy')
  copyProject(project, copy)
  installCase(copy, {
    observer: { file: 'Observer', source: '// observer\n' },
    commands: [],
    images: ['img/pictures/Missing.png', 'img/pictures/Kept.png', 'img/faces/New.png']
  })
  return copy
}

describe('the scripts the observer loads itself', () => {
  afterEach(removeFolders)

  it('writes the scripts the observer loads itself unlisted, refusing one the project holds', () => {
    const copy = syntheticCopy()
    const stockList = readText(copy, 'js/plugins.js')
    installCase(copy, {
      observer: { file: 'Observer', source: '// observer\n' },
      scripts: [{ file: 'Probe_a', source: '// probe a\n' }],
      commands: []
    })

    expect(readText(copy, 'js/plugins/Probe_a.js')).toBe('// probe a\n')
    expect(readText(copy, 'js/plugins.js')).not.toContain('Probe_a')

    resetCopy(copy)

    expect([
      existsSync(path.join(copy, 'js/plugins/Probe_a.js')),
      readText(copy, 'js/plugins.js')
    ]).toStrictEqual([false, stockList])
    expect(() =>
      installCase(copy, {
        observer: { file: 'Observer', source: '// observer\n' },
        scripts: [{ file: 'Example', source: '// probe\n' }],
        commands: []
      })
    ).toThrow('js/plugins/Example.js')
  })
})

describe('the stored images placed in the copy', () => {
  afterEach(removeFolders)

  it('writes a placeholder PNG for each stored image the copy lacks, keeping a stock one', () => {
    const copy = copyWithImages()
    const placeholder = readFileSync(path.join(copy, 'img/pictures/Missing.png'))

    expect(pngChunks(placeholder)).toStrictEqual([
      { type: 'IHDR', isCrcRight: true, data: '00000001000000010806000000' },
      { type: 'IDAT', isCrcRight: true, data: '0000000000' },
      { type: 'IEND', isCrcRight: true, data: '' }
    ])
    expect(readFileSync(path.join(copy, 'img/faces/New.png'))).toStrictEqual(PLACEHOLDER_PNG)
    expect(readText(copy, 'img/pictures/Kept.png')).toBe('a stock picture\n')
  })

  it('removes the placeholders on reset, keeping the stock image and the project unchanged', () => {
    const project = projectWithPicture()
    const before = takeManifest(project)
    const copy = copyWithImages(project)
    resetCopy(copy)

    expect(existsSync(path.join(copy, 'img/pictures/Missing.png'))).toBe(false)
    expect(existsSync(path.join(copy, 'img/faces/New.png'))).toBe(false)
    expect(readText(copy, 'img/pictures/Kept.png')).toBe('a stock picture\n')
    expect(compareManifests(before, takeManifest(project))).toStrictEqual([])
  })

  it.each(['../Outside.png', 'img/pictures/Theme.ogg'])(
    'refuses the stored image %s before writing anything',
    (image) => {
      const copy = syntheticCopy()

      expect(() =>
        installCase(copy, {
          observer: { file: 'Observer', source: '// observer\n' },
          commands: [],
          images: [image]
        })
      ).toThrow(`no placeholder for the stored image ${image}`)
      expect(existsSync(path.join(copy, 'js/plugins/Observer.js'))).toBe(false)
      expect(readText(copy, 'js/plugins.js')).toBe(STOCK_PLUGINS)
    }
  )

  it('names the image a stored file value of a picture folder loads, and no other value', () => {
    const fixture = readFileSync(
      path.join(import.meta.dirname, '../fixtures/mz-project/js/plugins/Fixture_Require.js'),
      'utf8'
    )
    const { parameters } = PluginParser.parsePlugin(fixture, 'Fixture_Require.js')

    expect(storedImages(parameters, { Picture: 'FixturePicture', Caption: 'Shown' })).toStrictEqual(
      ['img/pictures/FixturePicture.png']
    )
    expect(
      storedImages(
        [
          fileParameter('Sound', 'audio/se/'),
          fileParameter('Unset', 'img/pictures/'),
          fileParameter('Climb', 'img/pictures/'),
          fileParameter('Device', 'img/pictures/'),
          fileParameter('Star', 'img/pictures/'),
          fileParameter('Face', 'img/faces')
        ],
        { Sound: 'Bell', Climb: '../Outside', Device: 'CON', Star: 'a*b', Face: '顔' }
      )
    ).toStrictEqual(['img/faces/顔.png'])
  })
})

describe('the copy served to the browser', () => {
  it('serves every file with unload listeners disallowed', async () => {
    expect.hasAssertions()

    const copy = temporaryFolder()
    writeFile(copy, 'index.html', '<html></html>\n')
    const server = await serveCopy(copy)
    try {
      const { hostname, port } = new URL(server.origin)
      const policy = await new Promise<string | string[] | undefined>((resolve, reject) => {
        get({ hostname, port, path: '/' }, (response) => {
          response.resume()
          resolve(response.headers['permissions-policy'])
        }).on('error', reject)
      })

      expect(policy).toBe(UNLOAD_DISALLOWED)
    } finally {
      await server.close()
    }
  })
})

/**
True while a process of that id runs
*/
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error instanceof Error && Reflect.get(error, 'code') === 'EPERM'
  }
}

/**
A fake engine: Node running `source` with the report file and a second file as its arguments.
*/
function fakeEngine(folder: string, source: string): [string, string[]] {
  const script = path.join(folder, 'engine.cjs')
  writeFileSync(script, source)
  return [process.execPath, [script, path.join(folder, 'report.json'), path.join(folder, 'pids')]]
}

describe('one launch of the engine', () => {
  afterEach(removeFolders)

  it('runs the copy as the editor playtests it', () => {
    expect(nwjsCommand('/engine/nw', '/run/copy')).toStrictEqual([
      '/engine/nw',
      ['/run/copy', 'test']
    ])
  })

  it('returns the report the engine wrote before it exited', async () => {
    expect.hasAssertions()

    const folder = temporaryFolder()
    const command = fakeEngine(
      folder,
      "require('node:fs').writeFileSync(process.argv[2], JSON.stringify({ kind: 'case' }))\n"
    )

    await expect(
      launchOnce(command, path.join(folder, 'report.json'), 30_000)
    ).resolves.toStrictEqual({ report: { kind: 'case' }, timedOut: false })
  })

  it('returns no report when the engine exits without one, though an earlier launch left one', async () => {
    expect.hasAssertions()

    const folder = temporaryFolder()
    writeFileSync(path.join(folder, 'report.json'), JSON.stringify({ kind: 'stale' }))
    const command = fakeEngine(folder, '// exits at once, writing nothing\n')

    await expect(
      launchOnce(command, path.join(folder, 'report.json'), 30_000)
    ).resolves.toStrictEqual({ report: undefined, timedOut: false })
  })

  // The kill waits up to 3 s for the engine, then for its tree to go; the test allows 30 s, which
  // the 5 s default never let it reach (3.2 s on a Windows CI runner)
  it(
    'kills an engine that never exits, and the process it started, at the bound',
    { timeout: 40_000 },
    async () => {
      expect.hasAssertions()

      const folder = temporaryFolder()
      const command = fakeEngine(
        folder,
        [
          "const { spawn } = require('node:child_process')",
          "const { writeFileSync } = require('node:fs')",
          "const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })",
          'writeFileSync(process.argv[3], `${process.pid} ${child.pid}`)',
          'setInterval(() => {}, 1000)',
          ''
        ].join('\n')
      )
      const started = Date.now()

      await expect(
        launchOnce(command, path.join(folder, 'report.json'), 3000)
      ).resolves.toStrictEqual({ report: undefined, timedOut: true })

      const pids = readFileSync(path.join(folder, 'pids'), 'utf8').split(' ').map(Number)

      expect(Date.now() - started).toBeLessThan(30_000)
      expect(pids).toHaveLength(2)
      expect(pids.filter((pid) => isAlive(pid))).toStrictEqual([])
    }
  )
})
