import { findAnnotationBlocks } from '../../../shared/annotation-blocks'

/**
A translated annotation block of a plugin file, with how many parameters and commands it holds
*/
interface TranslatedBlock {
  lang: string
  kind: 'language' | 'struct'
  structName: string | null
  params: number
  commands: number
}

/**
The translated blocks a save with raw mode off removes; not known when the file text is not loaded
(none, or empty, as raw mode reads it)
@internal exported for tests
*/
export type DroppedTranslatedBlocks =
  { known: false } | { known: true; blocks: readonly TranslatedBlock[] }

const PARAM_LINE = /^[\t ]*(?:\*[\t ]*)?@param\b/gm
const COMMAND_LINE = /^[\t ]*(?:\*[\t ]*)?@command\b/gm

const countOf = (text: string, line: RegExp): number => text.match(line)?.length ?? 0

/**
The translated blocks of `rawSource` that a regenerated file leaves out: it writes only the
description and help of each language, and each struct in the main block's language. So each
language block with a parameter or command, and each struct block in another language.
@internal exported for tests
*/
export function findDroppedTranslatedBlocks(
  rawSource: string | undefined
): DroppedTranslatedBlocks {
  if (rawSource === undefined || rawSource === '') return { known: false }
  const all = findAnnotationBlocks(rawSource)
  const mainLang = all.find((b) => b.kind === 'main')?.lang ?? ''
  const blocks: TranslatedBlock[] = []
  for (const block of all) {
    if (block.kind === 'main') continue
    const text = rawSource.slice(block.start, block.end)
    const params = countOf(text, PARAM_LINE)
    const commands = countOf(text, COMMAND_LINE)
    const isDropped = block.kind === 'language' ? params + commands > 0 : block.lang !== mainLang
    if (isDropped) {
      blocks.push({
        lang: block.lang,
        kind: block.kind,
        structName: block.structName,
        params,
        commands
      })
    }
  }
  return { known: true, blocks }
}

const counted = (count: number, noun: string): string =>
  `${String(count)} ${noun}${count === 1 ? '' : 's'}`

/**
A translated block as the file writes its opener, with what it holds
*/
function describeBlock(block: TranslatedBlock): string {
  const opener =
    block.structName === null ? `/*:${block.lang}` : `/*~struct~${block.structName}:${block.lang}`
  const counts: string[] = []
  if (block.params > 0) counts.push(counted(block.params, 'parameter'))
  if (block.commands > 0) counts.push(counted(block.commands, 'command'))
  return counts.length === 0 ? opener : `${opener} (${counts.join(', ')})`
}

/**
What a regenerating save's prompt adds about the file's translated blocks: the ones it removes,
or that they could not be checked when the file text is not loaded
*/
export function translatedBlocksNotice(rawSource: string | undefined): string {
  const dropped = findDroppedTranslatedBlocks(rawSource)
  if (!dropped.known) {
    return ' Its file text is not loaded, so its translated blocks could not be checked: the save may remove them too.'
  }
  if (dropped.blocks.length === 0) return ''
  const these = dropped.blocks.length === 1 ? 'this translated block' : 'these translated blocks'
  return ` It also removes ${these}: ${dropped.blocks.map((block) => describeBlock(block)).join(', ')}.`
}
