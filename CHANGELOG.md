# Changelog

## [Unreleased]

## [1.6.0] - 2026-04-19

### Added
- **Plugin Browser panel** — new 288px side panel for projects with many plugins (50+). Toggled via a `List` icon in the sidebar or **Ctrl+Shift+E**. Replaces the cramped bottom icon list that became unusable past ~10 plugins. Features: filename search, filter (All / Open / Dirty / Errors), sort (file order or A–Z), per-row status glyphs (error / warning / dirty dot), hover-to-close for open plugins, active-plugin highlight, and a footer summary (`N total · X dirty · Y errors`).
- **`@type location`** support — official MZ map+coordinate picker. Added to parameter-type dropdown under "Game Data", parsed from imported plugins, and emitted with a JSON default (`{"mapId":"0","x":"0","y":"0"}`) in the IIFE body.
- **`@requiredAssets` annotation** — plugin-level meta field for assets preserved during MZ's "Exclude unused files" deployment. New MetaEditor textarea (one asset path per line); generator emits one `@requiredAssets` line per entry; parser extracts them on import.
- `tests/templates-output.test.ts` — 10 regression tests covering the six template bug fixes (save-load, input-handler, method-alias, battle-system, message-system, plugin-commands).
- 24 new generator/validation/shortcut tests covering struct-array deep-parse, number[]/boolean[]/ID[] element coercion, nullish boolean defaults, reserved-word camelCase sanitization, identifier collision detection, `@requiredAssets` round-trip, `@type location` round-trip, comment-aware command dedup, and the Ctrl+Shift+E plugin-browser shortcut.

### Fixed
- **Struct-array parser now deep-parses correctly** — MZ double-encodes `struct<X>[]` as a JSON array of JSON strings. The generator previously emitted `JSON.parse(accessor || '[]')`, leaving each element as a string (so `arr[0].x` silently returned `undefined`). Now emits `.map(s => JSON.parse(s))` for struct arrays.
- **Number/ID arrays now coerce their elements** — `number[]`, `actor[]`, `variable[]`, etc. now emit `.map(Number)` so arithmetic works; `boolean[]` emits `.map(v => v === 'true')`.
- **Boolean `@default true` no longer silently becomes `false`** — the previous `accessor === 'true'` returned `false` when the param key was absent from `params` (edge case: plugin added but never opened in Plugin Manager). Now nullish-coalesces to the declared default.
- **`camelCase()` no longer emits invalid JS identifiers** — a parameter named `class`, `default`, `return`, `123abc`, etc. previously produced `const class = ...` (strict-mode SyntaxError on plugin load). Sanitizer now suffixes `_` on reserved words and prefixes `_` on digit-start names.
- **`validatePlugin` detects post-transform identifier collisions** — two differently-named parameters that camelCase to the same identifier (e.g., `foo-bar` and `foo_bar`) now surface as a hard error rather than silently producing duplicate `const` declarations.
- **Command dedup no longer false-matches commented-out examples** — doc comments referencing `registerCommand(...)` previously suppressed generation of the real command body. A new `stripCommentsOnly()` helper masks comments while preserving string literals before the substring check.
- **save-load template warns about non-persistent storage** — `Game_Actors` and `Game_Map` are no longer silently offered as "just another option": dropdown labels mark them as non-persistent, and generated code includes a prominent WARNING comment explaining that properties set in `initialize()` will be lost on save reload / map change.
- **input-handler template no longer collides across plugins** — the global-key handler method is now key-scoped (`updateGlobalKeyInput_Q`, `updateGlobalKeyInput_Tab`, etc.) so two plugins each hooking a different key don't clobber each other's `Scene_Base.prototype.updateGlobalKeyInput`.
- **method-alias replace-without-call emits a prominent WARNING** — for predicates like `Game_Battler.canMove`, `Game_Action.canUse`, etc., silently returning `undefined` breaks MZ logic. The placeholder now includes a multiline warning + a TODO naming the specific method.
- **battle-system damage multiply is sign-preserving** — the old `Math.floor(value * m)` over-healed by 1 point for healing skills (where `value` is negative). Now emits `value >= 0 ? Math.floor(value * m) : Math.ceil(value * m)`.
- **message-system custom escape code regex has a word boundary** — the no-parameter `replace` path previously emitted `/\\X/gi`, which would match `\XY`, `\XX`, etc. Now adds `(?![A-Za-z])` so only single-character escape codes match.
- **plugin-commands async callback uses per-interpreter state** — the previous module-scope `let _XPending = false` collided when two parallel events fired the same async command concurrently. Now stores the pending flag on the invoking `Game_Interpreter` instance.

### Changed
- **`@require 1` emission dropped** — Kadokawa's MZ annotation reference marks `@require` as discontinued (MV-era). The UI checkbox is kept (faded) for round-tripping legacy imports, but the generator no longer emits `@require 1` on file/animation parameters or command args.
- **`@noteRequire 1` emission dropped** — not part of the official Kadokawa note-asset spec (only `@noteParam`, `@noteType`, `@noteDir`, `@noteData` are documented). Parser still reads the legacy tag for back-compat.
- **`@type text` marked as MV-legacy** in the parameter-type dropdown — the canonical MZ multi-line type is `multiline_string` (mapped to `note` internally). `text` still parses and emits for compatibility.
- **Generated command stubs drop the `console.log(...)` line** — every generated `PluginManager.registerCommand` callback previously shipped a `console.log('X called with:', { args })` stub that survived to production. Replaced with an inline comment naming the parsed args.
- **Sidebar plugin list moved to the new panel** — the cramped icon-rail `.js` file list was removed (replaced by the Plugin Browser). The sidebar rail is now just: Open Project / New Plugin / [open-plugin tabs] / Plugin Browser / Project Data Browser / Settings / Shortcuts.
- `lucide-react` 1.7.0 → 1.8.0 (safe minor; icon additions, no breaking changes).
- Release-workflow retention policy: keep latest 2 releases (was 3).
- Parameter-type count: 28 → 29 (added `location`).
- Test count: 572 → 606 (+34 tests across generator, validation, mz-annotations, templates-output, and shortcuts).

### Removed
- `uuid` and `@types/uuid` as direct dependencies — never imported in source, tests, or tools. The project uses `crypto.randomUUID()` exclusively. Eliminates dead-dep attack surface and avoids a forced Node-20+ upgrade on uuid's v14 bump (which introduced breaking changes we would have had to work around for no benefit).

## [1.5.0] - 2026-03-29

### Added
- **Grouped Parameter Type Dropdown** — 6 logical groups (Basic, Text, Lists, Game Data, Files, Structure) with inline descriptions
- **Progressive Disclosure** — advanced parameter fields collapsed by default, auto-expand when populated
- **Inline Parameter Name Validation** — real-time error feedback for empty, invalid, and duplicate names
- **Drag-and-Drop Target Indicators** — visual border + background highlight on drop target during parameter reorder
- **Actionable Welcome Screen** — "New Plugin" card on the landing page for immediate onboarding
- **Copy ID Button** — one-click ID copy on project browser items (actors, items, switches, etc.)
- **Template Category Persistence** — last-selected template category remembered across opens
- **Save All (Ctrl+Shift+S)** — save all dirty open plugins in parallel with toast summary
- **Toggle Preview (Ctrl+B)** — collapse/expand the code preview panel
- **Command Name Collision Warning** — warns when command names shadow MZ built-in commands (28 names)
- **Settings Reset to Defaults** — one-click button to restore all settings
- **Export Format Descriptions** — explanatory text for each export option
- **Accessibility** — aria-labels on sidebar, status bar, and toast notifications; aria-live regions for dynamic content
- Per-plugin dirty/saved/rawMode state tracking — switching tabs preserves unsaved indicators and raw mode toggles
- `generatePluginOutput()` facade for unified raw/generated code switching
- `MemoizedParamRow` wrapper for stable ParameterCard callback bindings
- `eslint-plugin-react-hooks` with `rules-of-hooks` (error) and `exhaustive-deps` (warn)
- `consistent-type-imports` ESLint rule (error) — enforces `import type` syntax
- 14 new tests: plugin-store (6), ui-store (3), plugin-output (3), toast-store (2) — 411 total

### Fixed
- **Security**: `assertSafeProjectPath()` added to all 16 project IPC handlers (was missing)
- **Security**: `assertSafeFilename()` now enforces `.js` extension for plugin directory writes
- **Security**: Dev CSP `ws:` restricted to `ws://localhost:*` (was open to any host)
- **Security**: `shell.openExternal` uses normalized `parsed.href` instead of raw URL
- Raw mode new-parameter detection now checks both `params['name']` and `params["name"]` (fixes duplicate declarations)
- Raw mode new-command detection now checks all 4 quote combinations including `PLUGIN_NAME` + double-quote (fixes duplicate registrations)
- History fingerprint now content-aware (parameter renames, type changes, and edits are properly captured in undo history)
- `closePlugin` history cleanup race condition — cleanup now fires before state switch
- `historyStore.clear()` now resets `activePluginId` to null
- `OptionsEditor` local state now syncs on external option changes (undo, preset apply)
- `findBlockEnd` escaped backslash handling (`\\` before quote no longer incorrectly treated as escape)
- `scanDependencies` now called explicitly after `setAllGameData` (removed fragile `setTimeout(0)` ordering)
- `setDebugLogging` guarded with `window.api` check for test environments
- `.md` and `.d.ts` added to `ALLOWED_EXTENSIONS` (README and TypeScript declaration exports were broken)
- Toast eviction timer cleanup prevents stale timer fires
- SettingsDialog ref capture in useEffect cleanup
- 6 npm audit vulnerabilities resolved (flatted, minimatch, picomatch)

### Changed
- **TypeScript**: `noImplicitAny: true` enabled in both web and node tsconfigs
- **ESLint**: `no-unused-vars` upgraded from warn to error, `no-non-null-assertion` added as warn, `no-console` added as warn
- Status bar abbreviations expanded and font size bumped for readability
- Raw mode toggle relabeled with clearer on/off states
- Sidebar divider widened to 6px for easier grab targeting
- Shared types moved to `src/shared/types/` as canonical location (renderer re-exports, main/preload import directly)
- `env.d.ts` imports `API` type from preload instead of redeclaring all interfaces
- `generateParamParser`/`generateArgParser` unified into shared `generateAccessorParser`
- `parseProject` reads `System.json` once (was 3 times per call)
- Monaco `options` memoized in CodeEditor, CodePreview, and DiffView
- Store selectors narrowed: CodeEditor subscribes to `customCode` only, MetaEditor to `meta`, StatusBar to `meta.name`
- ProjectBrowser filter calls wrapped in `useMemo`
- ParameterCard wrapped in `React.memo` with stable callback bindings
- `rawSource` stripped from history entries to reduce memory retention

## [1.4.2] - 2026-02-28

### Added
- **Struct Default Value Editor** — inline form renders struct fields as type-appropriate inputs (number, boolean toggle, select, text) when editing struct parameter defaults
- **Struct Default Validation** — real-time JSON validation with green/yellow/red status indicator in the editor, plus warnings in the plugin validation panel for invalid struct defaults
- "Fill from struct defaults" button populates struct default from each field's own `@default` value
- Generator now uses the struct default as `JSON.parse()` fallback instead of empty `'{}'`
- **Structured Logging** — `electron-log` integration across main and renderer processes with file + console transports
- Debug logging toggle in Settings > Editor > Diagnostics
- "Open Log Folder" button for easy access to log files
- App lifecycle logging (startup, version, platform)
- IPC handler logging (plugin save/load, project open, header scan, dialogs)
- Auto-updater lifecycle logging
- Staggered welcome screen entrance and shimmer loading skeleton
- Ambient background gradient, sidebar hover glow, and focus panel glow
- Toast notifications, dirty pulse, save flash, and validation badge bounce
- 33 new tests (281 total across 13 test files)

### Fixed
- Dialog positioning — Settings and Keyboard Shortcuts dialogs now appear centered instead of offset to bottom-right (framer-motion inline transforms were overriding CSS centering)

### Changed
- All `console.error`/`console.warn` calls replaced with structured `log.error`/`log.warn`
- Animation architecture: Framer Motion for enter animations, CSS `data-[state=closed]` for Radix dialog exit
- `MotionConfig reducedMotion="user"` wraps app root for accessibility
- Toast progress bar uses pure CSS animation instead of React state polling
- Regenerated THIRD_PARTY_LICENSES.md (235 production dependencies)

## [1.4.1] - 2026-02-20

### Added
- App icon — puzzle-gear-braces design for window, taskbar, and build output
- Automatic cleanup of old GitHub releases (keeps latest 3)

### Changed
- Windows build switched from NSIS installer to portable exe for simpler distribution

## [1.4.0] - 2026-02-19

### Added
- **Plugin Conflict Detector** — scans project plugins for prototype method overrides and flags conflicts when 2+ plugins override the same method
- **Analysis View** — dedicated Editor/Analysis view switch with Overview (stats), Conflicts (severity-sorted with plugin chains), and Dependencies (existing report) cards
- Loading spinner during initial plugin analysis scan
- 36 new tests for conflict detection (239 total across 10 test files)
- `combo` parameter type — editable dropdown with free-text fallback
- `icon` parameter type — icon index picker (MZ shows icon sheet browser)
- `map` parameter type — map ID picker referencing MapInfos.json
- `hidden` parameter type — invisible parameter for internal use
- `@require` flag on `file` and `animation` parameters for deployment packager
- `@orderBefore` support — counterpart to `@orderAfter` for load ordering
- `@noteParam` / `@noteType` / `@noteDir` / `@noteData` / `@noteRequire` annotation group for deployment
- Note Parameters section in MetaEditor for managing `@noteParam` groups
- New parameter types available as array element types (combo, icon, map)
- 31 new tests for MZ annotations, dependency analyzer @orderBefore, and generator (203 total across 9 test files)

### Changed
- Override extraction logic moved to shared module (`src/shared/override-extractor.ts`) — eliminates regex duplication between main and renderer processes
- `camelCase()` rewritten to preserve existing camelCase in variable names (e.g., `myCombo` stays `myCombo`, not `mycombo`)
- Raw mode now injects parsing code for new parameters added via the UI
- Raw mode now injects `registerCommand` calls for new commands added via the UI
- Raw mode now adds new `/*~struct~` blocks for structs added via the UI
- `extractHeaderPreamble()` regex updated with 6 missing MZ annotations
- Dependency analyzer handles `@orderBefore` reverse edges
- IPC header scanner extracts `@orderBefore` entries

### Fixed
- `camelCase()` destroying variable names (e.g., `myCombo` → `mycombo`, `_hidden` → `Hidden`)
- Pipe character `|` being eaten in combo options textarea (round-trip parsing issue)
- Raw mode not generating code for new parameters, commands, or structs
- Load-order validation not considering `@orderBefore` reverse dependencies

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
