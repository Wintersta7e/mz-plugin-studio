import type { SelectOption } from '../types/plugin'

// Select options are typed one per line, as value|label, or just label when the two are the
// same. The first "|" that is not written as "\|" ends the value; the label is the rest of the
// line as typed. Inside the value, "\|" is a "|", and an odd run of "\" before a "|" escapes it
// while each "\\" in that run is one "\". A "\" anywhere else is itself, so a line with no "\|"
// reads as it always did.

/**
`value` written so that every "|" in it reads back as part of it.
*/
const escapeValue = (value: string): string =>
  value.replaceAll(/(\\*)\|/g, (_match, run: string) => String.raw`${run}${run}\|`)

const optionLine = (o: SelectOption): string =>
  o.value === o.text
    ? escapeValue(o.text)
    : // A "\" ending the value would escape the "|" after it.
      `${escapeValue(o.value).replace(/\\+$/, (run) => run + run)}|${o.text}`

/**
Select options as the one-per-line text of their field.
*/
export const optionsText = (options: SelectOption[] | undefined): string =>
  options?.map((option) => optionLine(option)).join('\n') ?? ''

/**
A line split at its first unescaped "|": the value, then the label, or no label.
*/
function splitLine(line: string): [string, string | undefined] {
  let value = ''
  let index = 0
  while (index < line.length) {
    if (line[index] === '|') return [value, line.slice(index + 1)]
    if (line[index] !== '\\') {
      value += line.charAt(index++)
      continue
    }
    let end = index
    while (line[end] === '\\') end++
    const run = end - index
    if (line[end] !== '|') {
      value += line.slice(index, end)
    } else if (run % 2 === 0) {
      return [value + '\\'.repeat(run / 2), line.slice(end + 1)]
    } else {
      value += '\\'.repeat((run - 1) / 2) + '|'
      end++
    }
    index = end
  }
  return [value, undefined]
}

/**
The options a field's text holds; blank and whitespace-only lines hold none.
*/
export const parseOptions = (text: string): SelectOption[] =>
  text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const [raw, label = ''] = splitLine(line)
      const value = raw.trim()
      return { value, text: label.trim() || value }
    })

/**
A field's text as it reads back from the options it holds.
*/
export const normalizeOptions = (text: string): string => optionsText(parseOptions(text))
