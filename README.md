# MZ Plugin Studio

A desktop editor for RPG Maker MZ plugins.

You define parameters, commands and structs in forms; it writes the annotation block and the code that
parses them, and you add the plugin's behaviour in its code editor or from templates. It also loads your
MZ project, so game-data parameters pick from your actual actors, items and switches.

[![CI](https://github.com/Wintersta7e/mz-plugin-studio/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Wintersta7e/mz-plugin-studio/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Wintersta7e/mz-plugin-studio?sort=semver&label=release)](https://github.com/Wintersta7e/mz-plugin-studio/releases/latest)
![Platform](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows&logoColor=white)
![Electron](https://img.shields.io/github/package-json/dependency-version/Wintersta7e/mz-plugin-studio/dev/electron?label=Electron&logo=electron&logoColor=white&color=47848F)
![React](https://img.shields.io/github/package-json/dependency-version/Wintersta7e/mz-plugin-studio/dev/react?label=React&logo=react&logoColor=black&color=61DAFB)
![TypeScript](https://img.shields.io/github/package-json/dependency-version/Wintersta7e/mz-plugin-studio/dev/typescript?label=TypeScript&logo=typescript&logoColor=white&color=3178C6)
![Typecheck](https://img.shields.io/badge/tsc-strict-3178C6?logo=typescript&logoColor=white)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
![Status](https://img.shields.io/badge/status-personal%20tool%20%C2%B7%20maintained-brightgreen)

---

## Why

An MZ plugin describes its settings in a comment block at the top of the file — `@param`, `@type`,
`@default`, `@parent`, `@option` and the rest — and RPG Maker's Plugin Manager builds its settings
screen from that block. What reaches the plugin at runtime is all strings: numbers arrive as text, a
struct arrives as JSON, and an array of structs arrives as JSON whose elements are JSON again. Every
plugin repeats the same two chores: writing the annotation block by hand, and writing the code that
turns those strings back into values.

MZ Plugin Studio does both from one definition. The annotation block and the parsing code are
generated together, so a parameter's declared type and the code that reads it stay in step.

## Status

A personal tool, maintained. It runs on Windows as a portable executable. The current work is
upkeep — tests, CI, dependency updates and security fixes — rather than new features.

**Known limits:**

- **Raw mode** regenerates the annotation blocks of an imported plugin and keeps the rest of the file.
  It can still alter or remove parts of the plugin's code (for example after a restart), so keep a
  backup of any plugin before saving over it.
- The app does not update itself: new versions are on the
  [Releases](https://github.com/Wintersta7e/mz-plugin-studio/releases) page.

## Features

### Plugin building

- **Metadata editor** — name, version, author, description, help text, URL
- **Parameter builder** — every supported parameter type, with a grouped type dropdown, progressive
  disclosure, drag-and-drop reordering, inline validation, bulk operations and presets
- **Command builder** — plugin commands with typed arguments
- **Struct definitions** — nested data structures, with a visual editor for struct defaults
- **Multi-language** — Japanese (ja) and Chinese (zh) localization tabs

### Parameter Types

| Category      | Types                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Basic**     | string, number, boolean, select, combo, note, text, hidden                                                                             |
| **Game Data** | variable, switch, actor, class, skill, item, weapon, armor, enemy, troop, state, animation, tileset, common_event, map, location, icon |
| **Advanced**  | file, struct, array, color                                                                                                             |

Attributes: `@text`, `@desc`, `@default`, `@min` / `@max`, `@decimals`, `@dir`, `@parent`, `@on` /
`@off`, `@option` / `@value`.

### Code Template Library

Templates insert working code for common plugin patterns, grouped by category:

| Category            | Covers                               |
| ------------------- | ------------------------------------ |
| **Method Aliasing** | Extend existing MZ classes safely    |
| **Custom Windows**  | Windows, HUDs, popups, gauges        |
| **Scene Hooks**     | Hook into scene lifecycle            |
| **Notetags**        | Add note tag parsing                 |
| **Plugin Commands** | Basic, async, and validated commands |
| **Save/Load**       | Persistent data storage              |
| **Input Handler**   | Keyboard and gamepad input           |
| **Battle System**   | Actions, damage, turn hooks          |
| **Sprites**         | Custom sprites and animations        |
| **Map & Events**    | Event spawning, movement, transfers  |
| **Menu System**     | Custom scenes, title mods, options   |
| **Audio**           | BGM control, SFX, crossfades         |
| **Messages**        | Text codes, window mods, choices     |
| **Actor & Party**   | Custom properties, party management  |

### Code editor

- **Monaco editor** with JavaScript highlighting and MZ class completions
- **Live preview** — the generated plugin updates as you edit
- **Diff view** — generated output side by side with the saved file
- **Validation** — unused structs, orphaned parent references, unimplemented commands, invalid struct
  default JSON
- **Export** — `.js`, README.md, `.d.ts` type declarations, or a `plugins.json` entry

### Project integration

- **Load an MZ project** — database entries (actors, classes, skills, items, weapons, armors, enemies,
  troops, states, animations, tilesets, common events, switches, variables) fill the game-data dropdowns
- **Import existing plugins** — parse and edit `.js` plugins already in `js/plugins/`
- **Save into the project** — write straight to `js/plugins/`
- **Plugin browser** (Ctrl+Shift+E) — a searchable side panel of every plugin in `js/plugins/`, with
  Open / Dirty / Errors filters and per-row status, built for projects with many plugins
- **Conflict detection** — flags methods that two or more plugins override, ranked by how widely the
  class is used
- **Dependency analysis** — reads `@base`, `@orderAfter` and `@orderBefore` across the project and
  reports missing and circular dependencies and load-order violations

### Also

- Auto-generated help text from plugin metadata
- `@noteParam` groups for RPG Maker's deployment packager
- Dark and light themes, synced to the editor
- Keyboard shortcuts (F1 lists them)
- ARIA labels and live regions across the sidebar, status bar and toasts
- Structured logging to file, with a debug toggle in Settings

## Quick start

**Use it:** download `mz-plugin-studio-<version>-portable.exe` from the
[latest release](https://github.com/Wintersta7e/mz-plugin-studio/releases/latest) and run it — there is
no installer.

**Build it:**

```bash
git clone https://github.com/Wintersta7e/mz-plugin-studio.git && cd mz-plugin-studio
npm install            # on a WSL /mnt/ path: npm install --no-bin-links
npm run dev            # start with hot reload
```

Node.js — the version `.github/workflows/ci.yml` uses.

Then: **+** in the sidebar creates a plugin; fill in the Meta tab, add parameters and commands, insert
templates from the code editor, and save into your project's `js/plugins/` folder. The
[User Guide](./docs/USER_GUIDE.md) walks through every screen.

## Development

```bash
npm run typecheck      # tsc for main, renderer and tests
npm run lint           # ESLint
npm run format         # Prettier
npm test               # Vitest
npm run test:golden    # generated-plugin output against the golden corpus
npm run build:win      # portable Windows build into dist/
```

## Layout

```
mz-plugin-studio/
├── src/
│   ├── main/       # Electron main process: windows, file access, MZ project parsing
│   ├── preload/    # the typed bridge between main and renderer
│   ├── renderer/   # React app: editors, preview, analysis, plugin generator
│   └── shared/     # types and checks used on both sides
├── tests/          # Vitest suites and their fixtures
├── scripts/        # repository checks, run by hand or through npm scripts
├── tools/          # scripts that enrich the MZ class dictionary used by autocomplete
├── docs/           # user guide and template contribution guide
└── resources/      # app icons
```

## Stack

| Layer  | Choice                          | Notes                                                                  |
| ------ | ------------------------------- | ---------------------------------------------------------------------- |
| Shell  | Electron                        | Sandboxed, context-isolated renderer; IPC handlers validate file paths |
| UI     | React, Tailwind CSS, Radix UI   | shadcn/ui-style components                                             |
| State  | Zustand                         | Persisted stores                                                       |
| Editor | Monaco                          | MZ class completions from a bundled dictionary                         |
| Build  | electron-vite, electron-builder | Portable Windows target                                                |
| Tests  | Vitest                          | Unit, integration and golden-output suites                             |

## Documentation

- [User Guide](./docs/USER_GUIDE.md) — every screen, parameter type and template
- [Contributing templates](./docs/CONTRIBUTING_TEMPLATES.md) — how to add a code template
- [Changelog](./CHANGELOG.md)

## Security

Report security problems privately — see [SECURITY.md](./SECURITY.md). Versions before 1.6.1 could
write field text into a generated plugin as code
([advisory](https://github.com/Wintersta7e/mz-plugin-studio/security/advisories/GHSA-436j-76q4-whg2));
use the latest release.

## Contributing

Issues are welcome. For anything larger than a small fix, open an issue before a pull request. Before submitting, run `npm run lint`, `npm run typecheck` and `npm test`.

## License

[MIT](./LICENSE). Third-party dependency licenses are listed in
[THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md).

'RPG Maker' and 'RPG Maker MZ' are trademarks of their respective owners. MZ Plugin Studio is an
independent tool, not affiliated with or endorsed by them.

---

Related: `mz-interaction-builder` (dialogue trees) · `mz-scene-builder` (cutscene timelines).
