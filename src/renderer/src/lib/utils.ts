import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Electron rethrows an error from a main-process handler as
// "Error invoking remote method '<channel>': <Name>Error: <message>"
const IPC_PREFIX = /^Error invoking remote method '[^']+': (\w*Error: )?/

/** The text of a thrown value to show the user: an error from main keeps only its own message */
export function userMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(IPC_PREFIX, '')
}
