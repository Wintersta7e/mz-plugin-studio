// The user's MZ project, as the runtime test reaches it: checked, walked for links, copied, and
// compared with its own manifest when the copy is gone; every write goes to the copy. Imports no
// test library, so the unit suite calls the same functions the fixtures do.
import { cpSync, existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { isWithin, removeDirectory } from './teardown'

/**
Files every MZ project folder holds, relative to it.
*/
export const REQUIRED_FILES: readonly string[] = [
  'index.html',
  'js/main.js',
  'data/System.json',
  'package.json'
]

export interface Manifest {
  /**
  Every file by its path relative to the project, with `/` between segments.
  */
  files: Map<string, { size: number; mtimeNs: bigint }>
}

/**
Throws naming the first required file `source` lacks.
*/
export function requireProjectFiles(source: string): void {
  const missing = REQUIRED_FILES.find(
    (file) => lstatSync(path.join(source, file), { throwIfNoEntry: false })?.isFile() !== true
  )
  if (missing !== undefined) throw new Error(`not an MZ project folder: no ${missing}`)
}

/**
Every file under `source`, walked without following a link: a symbolic link or a junction
anywhere fails the walk naming it, and so does a folder that holds no file.
*/
export function takeManifest(source: string): Manifest {
  const files: Manifest['files'] = new Map()
  const walk = (relative: string): void => {
    const names = readdirSync(path.join(source, relative))
    for (const name of names) {
      const entry = relative === '' ? name : `${relative}/${name}`
      const stats = lstatSync(path.join(source, entry), { bigint: true })
      if (stats.isSymbolicLink()) throw new Error(`linked entry in the MZ project: ${entry}`)
      if (stats.isDirectory()) walk(entry)
      else files.set(entry, { size: Number(stats.size), mtimeNs: stats.mtimeNs })
    }
  }
  walk('')
  if (files.size === 0) throw new Error('the MZ project folder holds no file')
  return { files }
}

/**
Paths whose size or modification time differ between the manifests, or that only one holds.
*/
export function compareManifests(before: Manifest, after: Manifest): string[] {
  const paths = new Set([...before.files.keys(), ...after.files.keys()])
  return [...paths]
    .filter((file) => {
      const was = before.files.get(file)
      const is = after.files.get(file)
      return was?.size !== is?.size || was?.mtimeNs !== is?.mtimeNs
    })
    .toSorted((a, b) => a.localeCompare(b))
}

/**
`target` with its deepest existing ancestor resolved through any link.
*/
function resolvedTarget(target: string): string {
  let existing = path.resolve(target)
  while (!existsSync(existing) && path.dirname(existing) !== existing) {
    existing = path.dirname(existing)
  }
  return path.join(realpathSync(existing), path.relative(existing, path.resolve(target)))
}

/**
Copies `source` to `target` after the link walk; a target inside the source is refused before
anything is written.
*/
export function copyProject(source: string, target: string): void {
  if (isWithin(resolvedTarget(target), realpathSync(source))) {
    throw new Error('the copy of the MZ project would lie inside the project')
  }
  takeManifest(source)
  cpSync(source, target, { recursive: true })
}

/**
Deletes the copy without following links; on Windows a held copy names its holder.
*/
export async function removeCopy(copy: string): Promise<void> {
  await removeDirectory(copy)
}

/**
Where any of `needles` occurs in `texts` and in the files `files`, and how many of both were
scanned; a caller fails a scan of nothing.
*/
export function scanForLeaks(
  needles: readonly string[],
  texts: readonly string[],
  files: readonly string[]
): { hits: string[]; scanned: number } {
  const sought = needles.filter((needle) => needle !== '')
  const hitsIn = (text: string, where: string): string[] =>
    sought.filter((needle) => text.includes(needle)).map((needle) => `${where}: ${needle}`)
  return {
    hits: [
      ...texts.flatMap((text, index) => hitsIn(text, `text ${String(index)}`)),
      ...files.flatMap((file) => hitsIn(readFileSync(file, 'utf8'), file))
    ],
    scanned: texts.length + files.length
  }
}
