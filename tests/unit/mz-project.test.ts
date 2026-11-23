// The runtime test reaches the user's MZ project only through a copy: a folder that is not a
// project, or that holds a link, is refused before anything is copied, and the copy is compared
// with the project's own manifest when it is gone. Runs on synthetic folders only.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  REQUIRED_FILES,
  compareManifests,
  copyProject,
  removeCopy,
  requireProjectFiles,
  scanForLeaks,
  takeManifest
} from '../../e2e/fixtures/mz-project'

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
