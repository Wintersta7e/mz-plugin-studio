# Feature Ideas Backlog

Compiled 2026-02-17 from codebase audit, community research, and MZ annotation schema analysis.

**How to use this list:** Pick items to implement, mark them `[x]` when shipped, add new ideas at the bottom. Items are grouped by category and roughly ordered by impact within each group.

---

## A. Missing MZ Annotation Support

These are features defined in the MZ plugin spec that we don't yet support.

- [x] **A1. `@combo` parameter type** — Editable dropdown with free-text fallback. _(Shipped in feature/missing-mz-annotations)_
- [x] **A2. `@require 1` flag on `file`/`animation` params** — Deployment packager inclusion flag. _(Shipped in feature/missing-mz-annotations)_
- [x] **A3. `@orderBefore` support** — Counterpart to `@orderAfter`, with reverse dependency edges in analyzer. _(Shipped in feature/missing-mz-annotations)_
- [x] **A4. `@noteParam` / `@noteType` / `@noteDir` / `@noteData` / `@noteRequire` annotation group** — MetaEditor section with repeatable groups, parser + generator. _(Shipped in feature/missing-mz-annotations)_
- [x] **A5. `icon` parameter type** — Icon index picker (numeric default). _(Shipped in feature/missing-mz-annotations)_
- [x] **A6. `map` parameter type** — Map ID picker using MapInfos.json. _(Shipped in feature/missing-mz-annotations)_
- [x] **A7. `hidden` parameter type** — Invisible parameter for internal use. _(Shipped in feature/missing-mz-annotations)_

## B. Usability & Quality of Life

- [ ] **B1. Struct default value editor** — When a param is `struct<Name>`, the default must be valid JSON. Replace raw text input with a form that renders the struct's fields and serializes to JSON. Prevents malformed defaults that crash at runtime. _Medium effort, high impact._
- [ ] **B2. Struct default JSON validation** — Real-time validation on the `@default` field for struct params. Red border + error message if JSON is invalid. Lighter alternative to B1. _Low effort._
- [ ] **B3. Parameter reorder via drag handle** — Already have drag-to-reorder, but could improve with visible grip handles and drop zone indicators. _Low effort._
- [ ] **B4. Command argument reordering** — Parameters can be reordered but command args currently cannot. Add drag-to-reorder for args within a command. _Low effort._
- [ ] **B5. Duplicate parameter detection across structs** — Warn when struct field names collide with top-level param names (causes confusion in generated code). _Low effort._
- [ ] **B6. Plugin metadata validation panel** — Like the code validation panel but for metadata: missing description, empty help text, no author, unnamed commands, etc. _Low effort._
- [ ] **B7. Recent files (standalone .js)** — Track recently opened standalone plugin files (not just project folders). Quick re-open from sidebar. _Low effort._
- [ ] **B8. Drag-and-drop file open** — Drop a `.js` file onto the app window to open/import it. _Low effort._
- [ ] **B9. Multi-language help text preview** — Show what the `@help` block looks like in each language side-by-side. _Low effort._
- [ ] **B10. Auto-save** — Periodic auto-save to a temp location (not overwriting the real file). Recover on crash. _Medium effort._
- [ ] **B11. Search within parameters** — Filter/search bar in ParameterBuilder for plugins with many parameters. _Low effort._

## C. Code Generation & Templates

- [ ] **C1. Notetag wizard template** — Guided template that generates: `DataManager.isDatabaseLoaded` alias, `processNotetags(data)` loop, `meta['tagName']` or regex variant, target object selector (actors/items/skills/etc). The #1 undocumented pattern new devs get wrong. _Medium effort, high impact._
- [ ] **C2. Save data extension template** — Complete `makeSaveContents` + `extractSaveContents` alias pair with user-specified object shape. Getting this wrong corrupts saves. _Low effort._
- [ ] **C3. Parameter accessor generation options** — Currently generates `const paramName = PluginManager.parameters()[key]`. Could offer options: typed wrapper functions, namespace object, or class-based accessor pattern. _Medium effort._
- [ ] **C4. Snippet library** — User-defined code snippets (not full templates) that can be inserted at cursor position in the code editor. Like VS Code snippets but specific to MZ patterns. _Medium effort._
- [ ] **C5. Template field validation** — Validate template field inputs before insertion (e.g., method-select requires a class to be selected first). _Low effort._
- [ ] **C6. Custom template creation** — Let users create and save their own templates with custom fields. _High effort._

## D. Advanced Tooling

- [x] **D1. Plugin conflict detector** — Scan project plugins for prototype assignments to the same method. Flag when two plugins alias the same function. _(Shipped in feature/conflict-detector)_
- [ ] **D2. Test harness generator** — For plugins with pure logic, generate a Node.js test stub that mocks `PluginManager.parameters()` and `$dataActors` etc., allowing unit testing outside the game. First-of-its-kind for MZ. _High effort, high impact._
- [ ] **D3. Plugin diff / version comparison** — Compare two versions of the same plugin file side-by-side, highlighting metadata and code changes. _Medium effort._
- [ ] **D4. Batch plugin analysis** — Extend the existing plugin dictionary pipeline to report: most-overridden methods (conflict hotspots), unused parameters, duplicate functionality across plugins. _Medium effort._
- [ ] **D5. Dead code detection** — Warn about parameters defined in the header but never accessed in the code body. _Medium effort._
- [ ] **D6. Plugin size/complexity metrics** — Show line count, parameter count, command count, number of method overrides as a quick health dashboard. _Low effort._

## E. Editor & IDE Features

- [ ] **E1. Go-to-definition for MZ classes** — Ctrl+Click on `Game_Actor.prototype.setup` in the code editor jumps to the MZ source definition (from mz-classes.json or corescript reference). _Medium effort._
- [ ] **E2. Inline parameter reference** — Hover over a parameter name in code to see its type, default, and description from the header. _Medium effort._
- [ ] **E3. Code folding regions** — Auto-insert `// #region` markers around generated sections (parameter parsing, command registration). _Low effort._
- [ ] **E4. Linting for common MZ mistakes** — Warn about: `Boolean(params['x'])` (always true for strings), missing `JSON.parse` for struct params, `this` scope issues in aliased methods. _High effort, high impact._
- [ ] **E5. Autocomplete for plugin parameters** — When typing in the code editor, suggest parameter accessor names based on the plugin's defined parameters. _Medium effort._
- [ ] **E6. Code formatting** — Apply Prettier/standard formatting to the code body on save or on demand. _Low effort._

## F. Project Integration

- [ ] **F1. plugins.js management** — Read/write the project's `js/plugins.js` file to enable/disable plugins and set their parameter values directly from the studio. _High effort, high impact._
- [ ] **F2. Plugin install workflow** — Copy the generated `.js` file into the project's `js/plugins/` folder AND add/update the entry in `plugins.js` in one action. _Medium effort (depends on F1)._
- [ ] **F3. Project template** — Create a new RPG Maker MZ project scaffold with recommended folder structure and a starter plugin. _Medium effort._
- [ ] **F4. Asset browser** — Browse the project's img/, audio/ folders when setting `@dir` paths or `file` type defaults. _Medium effort._

## G. Export & Sharing

- [ ] **G1. Plugin bundle export** — Export a plugin + its struct definitions + README + TypeScript declarations as a `.zip` package ready for distribution. _Low effort._
- [ ] **G2. Changelog generator** — Track version history and generate a changelog section in the `@help` text. _Low effort._
- [ ] **G3. Plugin documentation site generator** — Generate a static HTML page from the plugin metadata (like JSDoc but for MZ plugins). _Medium effort._

## H. UI/UX Improvements

- [ ] **H1. Onboarding / first-run wizard** — Guide new users through: open a project, create a plugin, add a parameter, generate code. _Medium effort._
- [ ] **H2. Plugin creation wizard** — Step-by-step dialog for new plugins: name, author, description, choose a starting template, configure initial parameters. _Medium effort._
- [ ] **H3. Resizable sidebar** — Currently fixed at 56px icon rail. Allow expanding to show plugin names. _Low effort._
- [ ] **H4. Tab close confirmation** — When closing a dirty plugin tab, show a save/discard/cancel dialog. _Low effort (may already exist via TitleBar guard)._
- [ ] **H5. Minimap for parameter list** — For plugins with 50+ parameters, a scrollbar minimap showing parameter groups/sections. _Low effort._
- [ ] **H6. Dark/light theme auto-detect** — Follow OS theme preference by default. _Low effort._

---

## Ideas Added Later

_(Add new ideas here as they come up)_

