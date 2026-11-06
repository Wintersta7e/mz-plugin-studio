import { useState } from 'react'

/**
The text of a field that stores a parsed form of what is typed, such as one entry per line.
Showing the stored value written back as text would drop an Enter or "|" typed at the end
before the next character arrives, so the field shows the text as typed while it still
parses to the stored value, and the stored value once that changes from elsewhere (undo,
another plugin). `normalize` parses a text and writes it back the way `stored` is written.
*/
export function useTypedText(
  stored: string,
  normalize: (text: string) => string
): [string, (text: string) => void] {
  const [typed, setTyped] = useState(stored)
  return [normalize(typed) === stored ? typed : stored, setTyped]
}

/**
The non-blank lines of a one-entry-per-line field, as stored.
*/
export const nonBlankLines = (text: string): string[] => text.split('\n').filter((s) => s.trim())

/**
A one-entry-per-line text as it reads back from its stored lines.
*/
export const normalizeLines = (text: string): string => nonBlankLines(text).join('\n')
