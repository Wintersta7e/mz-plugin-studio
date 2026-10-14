// Text a user could paste into any field to break out of the generated context it lands in.
// Each payload sets the sentinel on the global object when the code it ends up in runs.

/** Global property every payload assigns; its presence after evaluation means injected code ran. */
export const SENTINEL = '__pwn'

export interface Payload {
  name: string
  text: string
}

const ASSIGN = `globalThis.${SENTINEL} = 1`

/** Close a block comment, run code, reopen one; the separator before the code varies. */
export const COMMENT_PAYLOADS: readonly Payload[] = [
  { name: 'comment-space', text: `X */ ${ASSIGN}; /* Y` },
  { name: 'comment-u2028', text: `X */\u2028${ASSIGN}; /* Y` },
  { name: 'comment-u2029', text: `X */\u2029${ASSIGN}; /* Y` },
  { name: 'comment-lf', text: `X */\n${ASSIGN}; /* Y` }
]

/** Close a string literal of each quote kind, run code between the breakers, reopen it. */
export const QUOTE_PAYLOADS: readonly Payload[] = [
  { name: 'quote-single', text: `X' + (${ASSIGN}) + 'Y` },
  { name: 'quote-double', text: `X" + (${ASSIGN}) + "Y` },
  { name: 'quote-backtick', text: 'X${' + ASSIGN + '}` + (' + ASSIGN + ') + `Y' }
]

export const ALL_PAYLOADS: readonly Payload[] = [...COMMENT_PAYLOADS, ...QUOTE_PAYLOADS]
