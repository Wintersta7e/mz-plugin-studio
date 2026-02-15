# Changelog

## [1.1.1] - 2026-02-15

### Added
- Dark/light theme toggle with full CSS variable support and Monaco editor theme sync
- All MZ database types in Project Browser (skills, weapons, armors, enemies, states, animations, tilesets, common events, classes, troops)
- Validation for unused structs, orphaned parent references, and unimplemented commands
- Auto-update checking with status bar notification (GitHub Releases integration)
- Keyboard shortcuts panel (F1) and new bindings (Ctrl+S/N/O/1-5, Ctrl+,, F5)
- Raw mode for imported plugins (metadata-only editing preserves code body verbatim)
- Diff view comparing generated output vs. saved file
- Export formats: README, plugins.json entry, .d.ts type declarations, bundle export
- Vitest testing infrastructure with 67+ tests covering parser, generator, and validation

### Changed
- Stores split into individual files for maintainability
- IPC channels use typed constants (shared between main/preload/renderer)
- Extended game data loading uses generic helper (reduced boilerplate)
- Settings dialog and shortcuts panel lifted to App-level state management

### Fixed
- (none)

## [1.1.0] - 2026-02-07

### Added
- Monaco editor for custom code with MZ-specific autocomplete (28 globals, 139 classes, 4 snippets)
- Auto-generated code skeletons for commands and parameters
- Settings panel (editor font size, word wrap, minimap, line numbers, default author)
- Template favorites and recently used tracking
- Contextual tooltips on field labels
- Doc URL links for all 36 templates

## [1.0.0] - 2026-02-07

### Added
- Initial release
- Visual plugin builder with parameter, command, and struct editors
- 36 code templates across 14 categories
- Project browser for MZ game data (switches, variables, actors, items, maps, plugins)
- Live code preview with Monaco editor
- Plugin import/export (parse existing .js plugins)
- Multi-plugin tabs with unsaved changes tracking
- Undo/redo with 50-entry history
