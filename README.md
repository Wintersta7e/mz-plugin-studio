# MZ Plugin Studio

A desktop editor for RPG Maker MZ plugins. You define parameters, commands and structs in forms; it writes the annotation block and the parameter-parsing code, and you add the plugin's behaviour in its code editor or from templates.

[![CI](https://github.com/Wintersta7e/mz-plugin-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/Wintersta7e/mz-plugin-studio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

## Overview

- **Visual Editors** - Build plugins through intuitive forms instead of writing code
- **Real-time Preview** - See generated JavaScript update as you make changes
- **Code Templates** - Ready-to-use templates covering common plugin patterns
- **Project Integration** - Load your MZ project for auto-populated dropdowns
- **Full Format Support** - The parameter types listed below, multi-language, structs, and arrays

## Features

### Plugin Building
- **Metadata Editor** - Name, version, author, description, help text, URL
- **Parameter Builder** - Every supported parameter type with grouped dropdown, progressive disclosure, drag-and-drop reordering, inline validation, bulk operations, and presets
- **Command Builder** - Plugin commands with typed arguments
- **Struct Definitions** - Complex nested data structures
- **Multi-language** - Japanese (ja) and Chinese (zh) localization tabs

### Parameter Types

The parameter types the app supports:

| Category | Types |
|----------|-------|
| **Basic** | string, number, boolean, select, combo, note, text, hidden |
| **Game Data** | variable, switch, actor, class, skill, item, weapon, armor, enemy, troop, state, animation, tileset, common_event, map, location, icon |
| **Advanced** | file, struct, array, color |

### Parameter Attributes
| Attribute | Description |
|-----------|-------------|
| `@text` | Display label |
| `@desc` | Help description |
| `@default` | Default value |
| `@min` / `@max` | Number constraints |
| `@decimals` | Decimal precision |
| `@dir` | File directory |
| `@parent` | Nested parameter groups |
| `@on` / `@off` | Boolean labels |
| `@option` / `@value` | Select options |

### Code Template Library

Templates are grouped by category:

| Category | Covers |
|----------|--------|
| **Method Aliasing** | Extend existing MZ classes safely |
| **Custom Windows** | Windows, HUDs, popups, gauges |
| **Scene Hooks** | Hook into scene lifecycle |
| **Notetags** | Add note tag parsing |
| **Plugin Commands** | Basic, async, and validated commands |
| **Save/Load** | Persistent data storage |
| **Input Handler** | Keyboard and gamepad input |
| **Battle System** | Actions, damage, turn hooks |
| **Sprites** | Custom sprites and animations |
| **Map & Events** | Event spawning, movement, transfers |
| **Menu System** | Custom scenes, title mods, options |
| **Audio** | BGM control, SFX, crossfades |
| **Messages** | Text codes, window mods, choices |
| **Actor & Party** | Custom properties, party management |

### Code Editor
- **Monaco Editor** - Same editor as VS Code
- **Syntax Highlighting** - JavaScript highlighting
- **Real-time Generation** - Code updates as you edit
- **Template Insertion** - One-click template insertion
- **Validation** - Real-time error and warning display
- **Raw Mode** - Raw mode regenerates the annotation blocks of an imported plugin and keeps the rest of the file. In this version it can still alter or remove parts of the plugin's code (for example after a restart), so keep a backup of any plugin before saving over it.
- **Diff View** - Side-by-side comparison of generated output vs saved file
- **Export Formats** - Export as .js, README.md, .d.ts type declarations, or plugins.json entry

### Project Integration
- **Load MZ Projects** - Select your project folder
- **Auto-populate Dropdowns** - Database entries (actors, classes, skills, items, weapons, armors, enemies, troops, states, animations, tilesets, common events, switches, variables)
- **Direct Export** - Save plugins to `js/plugins/` folder
- **Import Existing** - Parse and edit existing .js plugins

### Additional Features
- **Plugin Browser Panel** - Searchable, filterable side panel (Ctrl+Shift+E) listing every `.js` in `js/plugins/`. Filter by Open / Dirty / Errors, sort by file order or A–Z, per-row status glyphs, click to load into a new tab. Designed for 50+ plugin projects where an icon rail no longer scales.
- **Plugin Conflict Detection** - Scans all project plugins for prototype method overrides; flags when 2+ plugins override the same method with severity based on class popularity
- **Dependency Analysis** - Scans `@base`, `@orderAfter`, and `@orderBefore` across project plugins; detects missing deps, circular deps, and load-order violations
- **Analysis View** - Dedicated view with overview stats, conflict details, and dependency issues — switch between Editor and Analysis tabs
- **Auto-Documentation** - Generate help text from plugin metadata with one click
- **Bulk Parameter Operations** - Multi-select, duplicate, delete, export/import parameters, reusable presets
- **Note Parameters** - Declare `@noteParam` groups for RPG Maker deployment packager
- **Dark/Light Theme** - Toggle between dark and light modes with full Monaco editor theme sync
- **Keyboard Shortcuts** - Press F1 for all shortcuts
- **Accessibility** - ARIA labels and live regions across sidebar, status bar, and toasts
- **Struct Default Editor** - Visual inline form for struct parameter defaults with real-time JSON validation, "Fill from struct defaults" button, and type-appropriate inputs
- **Validation** - Warns about unused structs, orphaned parent references, unimplemented commands, and invalid struct default JSON
- **Logging** - Structured logging via electron-log with debug toggle in Settings; logs to file for troubleshooting

## Installation

### Prerequisites
- Node.js — the version `.github/workflows/ci.yml` uses
- npm

### Setup

```bash
# Clone or download the repository
cd mz-plugin-studio

# Install dependencies
npm install
```

## Development

```bash
# Start development server with hot reload
npm run dev

# Type check only
npm run typecheck

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## Building for Distribution

```bash
npm run build:win
```

Windows only. Output will be in the `dist/` folder.

## Quick Start

1. **Launch the app** - Run `npm run dev` or the built executable
2. **Create a plugin** - Click the **+** button in the sidebar
3. **Set metadata** - Fill in name, version, author in the Meta tab
4. **Add parameters** - Click "Add Parameter" and configure each one
5. **Add commands** - Define plugin commands with arguments
6. **Insert templates** - Click the template icon in the code editor
7. **Preview code** - See real-time generated JavaScript
8. **Export** - Save to your project's `js/plugins/` folder

## Project Structure

```
src/        Application code: Electron main process, preload bridge, React renderer, shared types
tests/      Vitest suites and their fixtures
tools/      Scripts that enrich the MZ class dictionary used by autocomplete
scripts/    Repository scripts run by npm scripts and CI
docs/       User guide and template contribution guide
resources/  App icons
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Electron](https://electronjs.org) | Desktop application shell |
| [React](https://react.dev) | UI framework |
| [TypeScript](https://typescriptlang.org) | Type-safe development |
| [electron-vite](https://electron-vite.org) | Build tooling |
| [Tailwind CSS](https://tailwindcss.com) | Styling |
| [shadcn/ui](https://ui.shadcn.com) | UI components |
| [Zustand](https://zustand-demo.pmnd.rs) | State management |
| [Monaco Editor](https://microsoft.github.io/monaco-editor) | Code editor |

## Documentation

- **[User Guide](./docs/USER_GUIDE.md)** - Detailed usage instructions

## Contributing

Issues are welcome. For anything larger than a small fix, open an issue before a pull request. Before submitting, run `npm run lint`, `npm run typecheck` and `npm test`.

## License

MIT License - see [LICENSE](./LICENSE) for details.

Third-party dependency licenses are listed in [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md).

## Disclaimer

'RPG Maker' and 'RPG Maker MZ' are trademarks of their respective owners. MZ Plugin Studio is an independent tool, not affiliated with or endorsed by them.

Related: `mz-interaction-builder` (dialogue trees) · `mz-scene-builder` (cutscene timelines).
