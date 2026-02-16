# Changelog

## [1.3.0] - 2026-02-16

### Added
- Bulk parameter operations: multi-select toolbar with Select All, Duplicate, Delete, Export, Import, and Presets
- Parameter I/O module for `.mzparams` file format (serialize, deserialize, duplicate with shape validation)
- Parameter presets: save, apply, delete, and clear presets in Settings > Data tab
- Import picker dialog: browse project plugins and select individual parameters to import
- DropdownMenu UI component (shadcn/Radix)
- 18 new unit tests for parameter I/O (172 total across 8 test files)

### Changed
- Raw mode auto-enabled for imported plugins (was manual toggle)
- Diff view always uses raw mode output for imported plugins (shows meaningful metadata changes, not full regeneration noise)
- `generateRawMode()` rewritten to replace MZ comment blocks in-place instead of reconstructing from parts
- `ScannedPluginHeader` consolidated to single shared definition in `ipc-types.ts`

### Fixed
- Raw mode losing code body when plugin contained `*/` in code (replaced `lastIndexOf` with forward block parsing)
- Raw mode dropping header preamble (license, version history, social links) from imported plugins
- Stale `selectedIds` after individual parameter delete via per-card trash button
- `scanDependencies` could run concurrently (added `isScanning` guard)

## [1.2.0] - 2026-02-15

### Added
- Auto-generate help text for plugin documentation (sparkles button in MetaEditor)
- Plugin dependency analysis: scans `@base` and `@orderAfter` headers across project plugins
- Dependency health badge in status bar (green/yellow/red) with clickable issues dialog
- Sidebar load-order number badges, warning dots, and issue tooltips for project plugins
- Available plugin names hint toggle in MetaEditor below Dependencies/Order After fields
- Cycle detection (DFS 3-color), missing dependency, and load-order violation checks
- Plugin Dictionary: analysis pipeline studying 206 example plugins with popularity-weighted class/method sorting in template inserter
- 154 tests across 7 test files (auto-documentation, dependency analyzer, plugin analysis, parser, generator, validation)

### Changed
- IPC header scanner targets `/*:` MZ annotation block instead of first `/*...*/` comment block
- `@orderAfter` missing targets are warnings, not errors (soft hints vs hard dependencies)

### Fixed
- Header scanner skipping dependencies when plugin has a license comment before the MZ annotation block
- Sidebar tooltip newlines not rendering (multiple issues ran together into one line)
- Load-order deduplication when a dependency appears in both `@base` and `@orderAfter`
- Validation warnings panel now collapsible (was showing count but no detail list)

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
