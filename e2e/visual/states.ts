// The one list of visual snapshots: every app state in every theme, named `<state>-<theme>.png`.
export const STATES = [
  'welcome',
  'metadata',
  'parameters',
  'commands',
  'code',
  'project-data',
  'plugin-browser',
  'analysis'
] as const

export const THEMES = ['dark', 'light'] as const

export type State = (typeof STATES)[number]
export type Theme = (typeof THEMES)[number]

export const snapshotName = (state: State, theme: Theme): string => `${state}-${theme}.png`

export const SNAPSHOTS: readonly string[] = STATES.flatMap((state) =>
  THEMES.map((theme) => snapshotName(state, theme))
)
