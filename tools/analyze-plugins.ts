/**
MZ Plugin Dictionary - Analysis Script

Reads example RPG Maker MZ plugins and extracts ecosystem patterns,
conventions, and popularity data. Outputs enrichment data for
mz-classes.json and a conventions reference for AI-assisted development.

Usage: npx tsx tools/analyze-plugins.ts

Input:  examples/plugins/**\/*.js (gitignored, local only)
Output: tools/output/enrichment.json, conventions.md, full-report.json
*/

import * as fs from 'node:fs'
import path from 'node:path'

// ── Types ──────────────────────────────────────────────────────────────────

export type IIFEStyle = 'arrow' | 'function' | 'none'
export type ParamLoadingStyle = 'standard' | 'pluginmanagerex' | 'none'
export type AliasStyle = 'const' | 'var' | 'let'
const ALIAS_STYLES: readonly AliasStyle[] = ['const', 'var', 'let']
export type NoteTagPattern = 'meta_bracket' | 'meta_property' | 'note_regex'
export type ClassDefinitionStyle = 'function' | 'es6_extends'

export interface AliasInfo {
  style: AliasStyle
  className: string
  methodName: string
}

export interface MethodOverride {
  className: string
  methodName: string
}

export interface ClassDefinition {
  name: string
  style: ClassDefinitionStyle
}

export interface PluginAnalysis {
  fileName: string
  fileSize: number
  category: string
  iifeStyle: IIFEStyle
  useStrict: boolean
  paramLoading: ParamLoadingStyle
  aliases: AliasInfo[]
  methodOverrides: MethodOverride[]
  registerCommands: string[]
  paramTypes: string[]
  noteTagPatterns: NoteTagPattern[]
  newClasses: ClassDefinition[]
  usesStructs: boolean
  usesArrays: boolean
}

export interface AggregatedReport {
  version: string
  generatedAt: string
  corpus: {
    totalFiles: number
    analyzedFiles: number
    skippedFiles: number
    categories: Record<string, number>
  }
  patterns: {
    iifeStyle: Record<IIFEStyle, number>
    useStrict: number
    paramLoading: Record<ParamLoadingStyle, number>
    aliasStyle: Record<string, number>
    hasRegisterCommand: number
    usesStructs: number
    usesArrays: number
    definesNewClasses: number
    usesES6Extends: number
    totalAliases: number
    uniqueMethodsOverridden: number
  }
  classPopularity: Record<string, number>
  methodPopularity: Record<string, number>
  paramTypes: Record<string, number>
  noteTagPatterns: Record<NoteTagPattern, number>
}

export interface EnrichmentData {
  version: string
  generatedAt: string
  pluginCount: number
  classPopularity: Record<string, number>
  methodPopularity: Record<string, number>
}

// ── Pattern Detection Functions ────────────────────────────────────────────

/**
Detect the IIFE wrapper style used by the plugin.
Arrow: `(() => { ... })();`
Function: `(function() { ... })();`
None: no IIFE wrapper detected
*/
export function detectIIFEStyle(content: string): IIFEStyle {
  // Arrow IIFE: (() => {
  if (/\(\(\)\s*=>\s*\{/.test(content)) return 'arrow'
  // Function IIFE: (function() { or (function () {
  if (/\(function\s*\(\)\s*\{/.test(content)) return 'function'
  return 'none'
}

/**
Detect how the plugin loads its parameters.
*/
export function detectParamLoading(content: string): ParamLoadingStyle {
  if (content.includes('PluginManagerEx.createParameter')) return 'pluginmanagerex'
  if (/PluginManager\.parameters\s*\(/.test(content)) return 'standard'
  return 'none'
}

/**
Detect whether the plugin uses 'use strict'.
*/
export function hasUseStrict(content: string): boolean {
  return /['"]use strict['"]/.test(content)
}

/**
Extract prototype method aliases (const/var/let _Class_method = Class.prototype.method).
*/
export function extractAliases(content: string): AliasInfo[] {
  const results: AliasInfo[] = []
  // Match: const/var/let _Something = ClassName.prototype.methodName;
  const aliasRegex = /\b(const|var|let)\s+_\w+\s*=\s*([A-Z]\w+)\.prototype\.(\w+)\s*;/g
  for (const [, keyword = '', className = '', methodName = ''] of content.matchAll(aliasRegex)) {
    const style = ALIAS_STYLES.find((candidate) => candidate === keyword)
    if (style !== undefined) results.push({ style, className, methodName })
  }
  return results
}

/**
Extract all prototype method overrides (ClassName.prototype.methodName = function).
This catches both aliased and non-aliased overrides.
*/
export function extractMethodOverrides(content: string): MethodOverride[] {
  const results: MethodOverride[] = []
  const overrideRegex = /([A-Z]\w+)\.prototype\.(\w+)\s*=\s*function/g
  for (const [, className = '', methodName = ''] of content.matchAll(overrideRegex)) {
    results.push({ className, methodName })
  }
  return results
}

/**
Extract PluginManager.registerCommand call names.
*/
export function extractRegisterCommands(content: string): string[] {
  const results: string[] = []
  // PluginManager.registerCommand(pluginName, 'commandName', ...) or
  // PluginManager.registerCommand(pluginName, "commandName", ...)
  const commandRegex = /PluginManager\.registerCommand\s*\([^,]+,\s*['"](\w+)['"]/g
  // Also catch PluginManagerEx.registerCommand
  const commandRegexEx = /PluginManagerEx\.registerCommand\s*\([^,]+,\s*['"](\w+)['"]/g
  for (const [, name = ''] of content.matchAll(commandRegex)) {
    results.push(name)
  }
  for (const [, name = ''] of content.matchAll(commandRegexEx)) {
    results.push(name)
  }
  return results
}

/**
Extract @type declarations from plugin header comments.
*/
export function extractParamTypes(content: string): string[] {
  const results: string[] = []
  const typeRegex = /@type\s+(\w+)/g
  for (const [, type = ''] of content.matchAll(typeRegex)) {
    results.push(type.toLowerCase())
  }
  return results
}

/**
Detect note tag access patterns used in the plugin.
*/
export function detectNoteTagPattern(content: string): NoteTagPattern[] {
  const patterns: NoteTagPattern[] = []
  // meta['...'] or meta["..."]
  if (/\.meta\s*\[['"]/.test(content)) patterns.push('meta_bracket')
  // meta.propertyName (but not meta['...'])
  if (/\.meta\.(?!length)\w+/.test(content)) patterns.push('meta_property')
  // .note.match(...)
  if (/\.note\.match\s*\(/.test(content)) patterns.push('note_regex')
  return patterns
}

/**
Detect new class definitions (both function constructor and ES6 class extends).
*/
export function detectNewClasses(content: string): ClassDefinition[] {
  const results: ClassDefinition[] = []
  const seen = new Set<string>()

  // Function constructor style: function ClassName() { ... }
  // Look for Game_, Window_, Scene_, Sprite_ prefixed classes
  const functionRegex = /\bfunction\s+((?:Game|Window|Scene|Sprite|Spriteset)_\w+)\s*\(/g
  for (const [, name = ''] of content.matchAll(functionRegex)) {
    if (seen.has(name)) {
      continue
    }

    seen.add(name)
    results.push({ name, style: 'function' })
  }

  // ES6 class extends: class ClassName extends ParentClass
  const classRegex = /\bclass\s+(\w+)\s+extends\s+\w+/g
  for (const [, name = ''] of content.matchAll(classRegex)) {
    if (seen.has(name)) {
      continue
    }

    seen.add(name)
    results.push({ name, style: 'es6_extends' })
  }

  return results
}

// ── Aggregation ────────────────────────────────────────────────────────────

/**
Filter out single-letter class names (from minified code)
*/
function isValidClassName(name: string): boolean {
  return name.length > 1
}

function emptyReport(analyzedFiles: number): AggregatedReport {
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    corpus: {
      totalFiles: 0,
      analyzedFiles,
      skippedFiles: 0,
      categories: {}
    },
    patterns: {
      iifeStyle: { arrow: 0, function: 0, none: 0 },
      useStrict: 0,
      paramLoading: { standard: 0, pluginmanagerex: 0, none: 0 },
      aliasStyle: {},
      hasRegisterCommand: 0,
      usesStructs: 0,
      usesArrays: 0,
      definesNewClasses: 0,
      usesES6Extends: 0,
      totalAliases: 0,
      uniqueMethodsOverridden: 0
    },
    classPopularity: {},
    methodPopularity: {},
    paramTypes: {},
    noteTagPatterns: { meta_bracket: 0, meta_property: 0, note_regex: 0 }
  }
}

function countPatterns(patterns: AggregatedReport['patterns'], a: PluginAnalysis): void {
  // Structural patterns
  patterns.iifeStyle[a.iifeStyle]++
  if (a.useStrict) patterns.useStrict++
  patterns.paramLoading[a.paramLoading]++
  if (a.registerCommands.length > 0) patterns.hasRegisterCommand++
  if (a.usesStructs) patterns.usesStructs++
  if (a.usesArrays) patterns.usesArrays++

  // Aliases
  patterns.totalAliases += a.aliases.length
  for (const alias of a.aliases) {
    patterns.aliasStyle[alias.style] = (patterns.aliasStyle[alias.style] ?? 0) + 1
  }

  // New class definitions
  if (a.newClasses.length > 0) patterns.definesNewClasses++
  if (a.newClasses.some((c) => c.style === 'es6_extends')) patterns.usesES6Extends++
}

function addPlugin(pluginSets: Map<string, Set<string>>, key: string, fileName: string): void {
  const plugins = pluginSets.get(key) ?? new Set<string>()
  plugins.add(fileName)
  pluginSets.set(key, plugins)
}

function pluginCounts(pluginSets: Map<string, Set<string>>): Record<string, number> {
  return Object.fromEntries(Array.from(pluginSets, ([key, plugins]) => [key, plugins.size]))
}

function aggregateResults(analyses: PluginAnalysis[]): AggregatedReport {
  const report = emptyReport(analyses.length)

  // Per-category counts
  for (const a of analyses) {
    report.corpus.categories[a.category] = (report.corpus.categories[a.category] ?? 0) + 1
  }

  // Track unique methods (class.method) across all plugins
  const allUniqueMethodKeys = new Set<string>()

  // Class popularity: number of distinct plugins that extend this class
  const classPluginSets = new Map<string, Set<string>>()
  // Method popularity: number of unique plugins that override this method
  const methodPluginSets = new Map<string, Set<string>>()

  for (const a of analyses) {
    countPatterns(report.patterns, a)

    // Method overrides
    for (const override of a.methodOverrides) {
      if (!isValidClassName(override.className)) continue
      const key = `${override.className}.prototype.${override.methodName}`
      allUniqueMethodKeys.add(key)
      addPlugin(classPluginSets, override.className, a.fileName)
      addPlugin(methodPluginSets, key, a.fileName)
    }

    // Parameter types
    for (const t of a.paramTypes) {
      report.paramTypes[t] = (report.paramTypes[t] ?? 0) + 1
    }

    // Note tag patterns
    for (const p of a.noteTagPatterns) {
      report.noteTagPatterns[p]++
    }
  }

  report.patterns.uniqueMethodsOverridden = allUniqueMethodKeys.size

  // Sort by popularity (descending)
  report.classPopularity = sortByValue(pluginCounts(classPluginSets))
  report.methodPopularity = sortByValue(pluginCounts(methodPluginSets))
  report.paramTypes = sortByValue(report.paramTypes)

  return report
}

function sortByValue(counts: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(counts).toSorted(([, a], [, b]) => b - a))
}

// ── Output Generation ──────────────────────────────────────────────────────

function generateEnrichment(report: AggregatedReport): EnrichmentData {
  return {
    version: '1.0.0',
    generatedAt: report.generatedAt,
    pluginCount: report.corpus.analyzedFiles,
    classPopularity: report.classPopularity,
    methodPopularity: report.methodPopularity
  }
}

type Percent = (n: number) => string

function generateConventions(report: AggregatedReport): string {
  const total = report.corpus.analyzedFiles
  const pct: Percent = (n) => `${String(Math.round((n / total) * 100))}%`

  return [
    conventionsStructure(report, pct),
    conventionsAliases(report, pct),
    conventionsDeclarations(report, pct),
    conventionsClasses(report, pct)
  ].join('')
}

function conventionsStructure(r: AggregatedReport, pct: Percent): string {
  const p = r.patterns
  const total = r.corpus.analyzedFiles

  return `# RPG Maker MZ Plugin Conventions Reference
## Generated from analysis of ${String(total)} plugins (${r.generatedAt.split('T', 1).at(0) ?? ''})

> This document describes how MZ plugins are structured and written, based on
> statistical analysis of ${String(total)} real-world plugins. All code examples are
> original, generic illustrations of the patterns — not extracted from any
> specific plugin. Statistics are aggregate counts only.

---

## Plugin Structure

### IIFE Wrapper
- **Arrow IIFE** (${pct(p.iifeStyle.arrow)}): \`(() => { ... })();\` — dominant pattern
- **Function IIFE** (${pct(p.iifeStyle.function)}): \`(function() { ... })();\` — older style
- **No IIFE** (${pct(p.iifeStyle.none)}): Global scope — avoid, pollutes namespace

**Convention:** Use arrow IIFE wrapper. ${pct(p.iifeStyle.arrow)} of plugins use it.

### Strict Mode
- ${String(p.useStrict)} plugins (${pct(p.useStrict)}) include \`'use strict'\`

### File Organization
Standard order within the IIFE:
1. Parameter loading
2. Prototype aliases (save references to original methods)
3. Method overrides
4. New method definitions
5. Plugin command registration

---

## Parameter Loading

### Standard Pattern (${pct(p.paramLoading.standard)})
\`\`\`javascript
const parameters = PluginManager.parameters('PluginName');
const myParam = Number(parameters['ParamName'] || 0);
const myBool = parameters['BoolParam'] === 'true';
\`\`\`

### PluginManagerEx Pattern (${pct(p.paramLoading.pluginmanagerex)})
\`\`\`javascript
const params = PluginManagerEx.createParameter(document.currentScript);
// Auto-converts types based on @type annotations
\`\`\`

### No Parameters (${pct(p.paramLoading.none)})
${String(p.paramLoading.none)} plugins load no parameters.

---

`
}

function conventionsAliases(r: AggregatedReport, pct: Percent): string {
  const p = r.patterns
  const topClasses = Object.entries(r.classPopularity).slice(0, 20)
  const topMethods = Object.entries(r.methodPopularity).slice(0, 30)

  return `## Alias Conventions

### The Standard Pattern
\`\`\`javascript
const _ClassName_methodName = ClassName.prototype.methodName;
ClassName.prototype.methodName = function(...args) {
    _ClassName_methodName.call(this, ...args);
    // Custom logic here
};
\`\`\`

### Declaration Style
- **\`const\`** (${String(p.aliasStyle['const'] ?? 0)} aliases, ${pct(p.aliasStyle['const'] ?? 0)} of plugins): Standard — use this
- **\`var\`** (${String(p.aliasStyle['var'] ?? 0)} aliases): Older pattern — avoid in new code
- **\`let\`** (${String(p.aliasStyle['let'] ?? 0)} aliases): Rare

### Rules
1. **Always use \`const\`** for alias declarations
2. **Always call the original** via \`.call(this, ...args)\` — failing to do so breaks other plugins
3. **Naming convention:** \`_ClassName_methodName\` (underscore prefix, class and method joined by underscore)
4. Total aliases found across corpus: ${String(p.totalAliases)}

---

## Most Extended Classes (Top 20)

These are the classes most commonly modified by plugins. Higher numbers indicate
more plugins extend this class — it's a proven, safe extension point.

| Rank | Class | Plugins |
|------|-------|---------|
${topClasses.map(([cls, count], index) => `| ${String(index + 1)} | ${cls} | ${String(count)} |`).join('\n')}

---

## Most Overridden Methods (Top 30)

These methods are the primary hook points for plugin functionality. Overriding
these is well-established practice with minimal risk of conflicts.

| Rank | Method | Plugins | Use Case |
|------|--------|---------|----------|
${topMethods
  .map(([method, count], index) => {
    const desc = getMethodDescription(method)
    return `| ${String(index + 1)} | ${method} | ${String(count)} | ${desc} |`
  })
  .join('\n')}

---

`
}

function conventionsDeclarations(r: AggregatedReport, pct: Percent): string {
  const p = r.patterns
  const topParamTypes = Object.entries(r.paramTypes).slice(0, 15)

  return `## Parameter Type Distribution (${String(Object.values(r.paramTypes).reduce((a, b) => a + b, 0))} total declarations)

| Type | Count | Percentage |
|------|-------|------------|
${topParamTypes.map(([type, count]) => `| ${type} | ${String(count)} | ${pct(count)} |`).join('\n')}

### Observations
- \`number\` is the dominant parameter type
- \`struct\` used by ${String(p.usesStructs)} plugins (${pct(p.usesStructs)}) — complex data grouping
- \`array\` patterns used by ${String(p.usesArrays)} plugins (${pct(p.usesArrays)}) — list-based configuration

---

## Plugin Commands

- ${String(p.hasRegisterCommand)} plugins (${pct(p.hasRegisterCommand)}) register at least one plugin command

### Standard Registration
\`\`\`javascript
PluginManager.registerCommand('PluginName', 'CommandName', function(args) {
    const value = Number(args.paramName);
    // Command logic
});
\`\`\`

---

## Note Tag Conventions

| Pattern | Plugins | Usage |
|---------|---------|-------|
| \`meta.propertyName\` | ${String(r.noteTagPatterns.meta_property)} | Direct property access — preferred |
| \`meta['propertyName']\` | ${String(r.noteTagPatterns.meta_bracket)} | Bracket access — for dynamic keys |
| \`.note.match(regex)\` | ${String(r.noteTagPatterns.note_regex)} | Regex parsing — for complex tags |

### Standard Note Tag Access
\`\`\`javascript
// In a method that has access to a database object (actor, enemy, item, etc.)
const tagValue = obj.meta.MyTagName;
if (tagValue) {
    // Process the tag
}
\`\`\`

---

`
}

function conventionsClasses(r: AggregatedReport, pct: Percent): string {
  const p = r.patterns

  return `## New Class Definitions

- ${String(p.definesNewClasses)} plugins define new classes (${String(r.patterns.uniqueMethodsOverridden)} unique methods overridden total)
- ${String(p.usesES6Extends)} plugins (${pct(p.usesES6Extends)}) use ES6 \`class extends\` syntax

### Function Constructor Style (dominant)
\`\`\`javascript
function Window_Custom() {
    this.initialize(...arguments);
}
Window_Custom.prototype = Object.create(Window_Base.prototype);
Window_Custom.prototype.constructor = Window_Custom;

Window_Custom.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
};
\`\`\`

### ES6 Class Style (${pct(p.usesES6Extends)})
\`\`\`javascript
class Window_Custom extends Window_Base {
    initialize(rect) {
        super.initialize(rect);
    }
}
\`\`\`

---

## Common Pitfalls

1. **Not calling the original method** — Aliasing a method but never calling \`.call(this)\` breaks all other plugins that alias the same method.
2. **Using \`var\` for aliases** — The ecosystem has moved to \`const\`. Using \`var\` is a code smell.
3. **No IIFE wrapper** — ${pct(p.iifeStyle.none)} of plugins skip it, but it pollutes global scope. Always wrap.
4. **Overriding obscure methods** — Extending a method that no other plugin touches may indicate you're hooking the wrong place. Check the popularity list above.
5. **Forgetting \`'use strict'\`** — Not required but used by ${pct(p.useStrict)} of plugins. Helps catch bugs early.
6. **Single-letter class names** — Artifact of minification, not a convention. Never use in source code.

---

## Canonical Code Patterns

| Pattern | Frequency | Recommendation |
|---------|-----------|----------------|
| Arrow IIFE | ${pct(p.iifeStyle.arrow)} | Use as default wrapper |
| \`const\` alias + \`.call(this)\` | ${String(p.aliasStyle['const'] ?? 0)} aliases | Standard aliasing pattern |
| \`PluginManager.parameters()\` | ${pct(p.paramLoading.standard)} | Default parameter loading |
| \`PluginManagerEx.createParameter()\` | ${pct(p.paramLoading.pluginmanagerex)} | Auto-typed alternative |
| \`registerCommand\` | ${pct(p.hasRegisterCommand)} | Standard command registration |
| \`meta.property\` note tags | ${String(r.noteTagPatterns.meta_property)} plugins | Preferred note tag access |
| Function constructor classes | dominant | Standard new class pattern |
| ES6 class extends | ${pct(p.usesES6Extends)} | Modern alternative |

---

*This reference is auto-generated by tools/analyze-plugins.ts. Re-run the analysis to update statistics.*
`
}

/**
Brief descriptions for well-known MZ methods
*/
function getMethodDescription(method: string): string {
  const descriptions: Record<string, string> = {
    'Game_System.prototype.initialize': 'Save data initialization',
    'Scene_Base.prototype.update': 'Per-frame update (all scenes)',
    'Scene_Boot.prototype.start': 'Game startup / data loading',
    'Scene_Map.prototype.update': 'Map per-frame update',
    'Game_Map.prototype.setup': 'Map change / initialization',
    'Scene_Map.prototype.start': 'Map scene entry',
    'Game_System.prototype.onAfterLoad': 'Save data load hook',
    'Game_Interpreter.prototype.pluginCommand': 'Legacy command (MV compat)',
    'Window_Message.prototype.processEscapeCharacter': 'Custom text codes',
    'Window_Base.prototype.convertEscapeCharacters': 'Text substitution',
    'Game_CharacterBase.prototype.initMembers': 'Character data init',
    'Spriteset_Map.prototype.createCharacters': 'Map sprite creation',
    'Spriteset_Map.prototype.update': 'Map sprite per-frame',
    'Game_Interpreter.prototype.updateWaitMode': 'Custom wait conditions',
    'Game_Player.prototype.update': 'Player per-frame update',
    'Scene_Map.prototype.createDisplayObjects': 'Map display setup',
    'Game_Event.prototype.setupPage': 'Event page activation',
    'Game_Party.prototype.initialize': 'Party data init',
    'Scene_Battle.prototype.update': 'Battle per-frame update',
    'Scene_Battle.prototype.createDisplayObjects': 'Battle display setup',
    'Window_Message.prototype.updateMessage': 'Message text update',
    'Game_Screen.prototype.update': 'Screen effects update',
    'Game_Map.prototype.update': 'Map logic per-frame',
    'Scene_Title.prototype.create': 'Title screen setup',
    'Scene_Map.prototype.updateMain': 'Main map update',
    'Game_Event.prototype.initialize': 'Event initialization',
    'Game_Actor.prototype.setup': 'Actor data setup',
    'Scene_Boot.prototype.loadSystemImages': 'System image preload',
    'Sprite_Character.prototype.update': 'Character sprite update',
    'Window_Base.prototype.update': 'Window per-frame update'
  }
  return descriptions[method] ?? ''
}

// ── Console Report ─────────────────────────────────────────────────────────

function printConsoleReport(report: AggregatedReport, skippedCount: number): void {
  const r = report
  const p = r.patterns
  const total = r.corpus.analyzedFiles
  const pct = (n: number) => `${String(Math.round((n / total) * 100))}%`

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║       MZ Plugin Dictionary — Analysis Report        ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  console.log(
    `Corpus: ${String(total + skippedCount)} files total, ${String(total)} analyzed, ${String(skippedCount)} skipped\n`
  )
  console.log('Categories:')
  for (const [cat, count] of Object.entries(r.corpus.categories)) {
    console.log(`  ${cat}: ${String(count)}`)
  }

  console.log('\n── Structural Patterns ──\n')
  console.log(
    `  IIFE Style:       arrow ${String(p.iifeStyle.arrow)} (${pct(p.iifeStyle.arrow)})  |  function ${String(p.iifeStyle.function)} (${pct(p.iifeStyle.function)})  |  none ${String(p.iifeStyle.none)} (${pct(p.iifeStyle.none)})`
  )
  console.log(`  'use strict':     ${String(p.useStrict)} (${pct(p.useStrict)})`)
  console.log(
    `  Param Loading:    standard ${String(p.paramLoading.standard)} (${pct(p.paramLoading.standard)})  |  PluginManagerEx ${String(p.paramLoading.pluginmanagerex)} (${pct(p.paramLoading.pluginmanagerex)})  |  none ${String(p.paramLoading.none)} (${pct(p.paramLoading.none)})`
  )
  console.log(
    `  Alias Styles:     const ${String(p.aliasStyle['const'] ?? 0)}  |  var ${String(p.aliasStyle['var'] ?? 0)}  |  let ${String(p.aliasStyle['let'] ?? 0)}`
  )
  console.log(`  Total Aliases:    ${String(p.totalAliases)}`)
  console.log(`  registerCommand:  ${String(p.hasRegisterCommand)} (${pct(p.hasRegisterCommand)})`)
  console.log(`  Uses Structs:     ${String(p.usesStructs)} (${pct(p.usesStructs)})`)
  console.log(`  Uses Arrays:      ${String(p.usesArrays)} (${pct(p.usesArrays)})`)
  console.log(`  New Classes:      ${String(p.definesNewClasses)} plugins`)
  console.log(`  ES6 Extends:      ${String(p.usesES6Extends)} (${pct(p.usesES6Extends)})`)
  console.log(`  Unique Methods:   ${String(p.uniqueMethodsOverridden)}`)

  console.log('\n── Top 15 Extended Classes ──\n')
  for (const [index, [cls, count]] of Object.entries(r.classPopularity).slice(0, 15).entries()) {
    console.log(`  ${String(index + 1).padStart(2)}. ${cls.padEnd(25)} ${String(count)}`)
  }

  console.log('\n── Top 15 Overridden Methods ──\n')
  for (const [index, [method, count]] of Object.entries(r.methodPopularity)
    .slice(0, 15)
    .entries()) {
    console.log(`  ${String(index + 1).padStart(2)}. ${method.padEnd(55)} ${String(count)}`)
  }

  console.log('\n── Parameter Types ──\n')
  for (const [type, count] of Object.entries(r.paramTypes).slice(0, 10)) {
    console.log(`  ${type.padEnd(20)} ${String(count)}`)
  }

  console.log('\n── Note Tag Patterns ──\n')
  for (const [pattern, count] of Object.entries(r.noteTagPatterns)) {
    console.log(`  ${pattern.padEnd(20)} ${String(count)}`)
  }

  console.log('')
}

// ── Main Pipeline ──────────────────────────────────────────────────────────

function findPluginFiles(baseDirectory: string): { filePath: string; category: string }[] {
  const results: { filePath: string; category: string }[] = []

  function walk(directory: string, category: string): void {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath, category)
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        results.push({ filePath: fullPath, category })
      }
    }
  }

  const categories = fs.readdirSync(baseDirectory, { withFileTypes: true })
  for (const cat of categories) {
    if (cat.isDirectory()) {
      walk(path.join(baseDirectory, cat.name), cat.name)
    }
  }

  return results
}

function analyzeFile(filePath: string, category: string): PluginAnalysis | undefined {
  const stat = fs.statSync(filePath)
  if (stat.size < 200) return // Skip separator/placeholder files

  const content = fs.readFileSync(filePath, 'utf8')
  const fileName = path.basename(filePath)

  return {
    fileName,
    fileSize: stat.size,
    category,
    iifeStyle: detectIIFEStyle(content),
    useStrict: hasUseStrict(content),
    paramLoading: detectParamLoading(content),
    aliases: extractAliases(content),
    methodOverrides: extractMethodOverrides(content),
    registerCommands: extractRegisterCommands(content),
    paramTypes: extractParamTypes(content),
    noteTagPatterns: detectNoteTagPattern(content),
    newClasses: detectNewClasses(content),
    usesStructs: content.includes('struct<'),
    usesArrays: /\[\]\s*$/m.test(content) || /@type\s+\w+\[\]/.test(content)
  }
}

function main(): void {
  const pluginsDirectory = path.resolve(__dirname, '../examples/plugins')

  if (!fs.existsSync(pluginsDirectory)) {
    console.error(`Error: ${pluginsDirectory} not found.`)
    console.error('Place example plugins in examples/plugins/{category}/*.js')
    process.exitCode = 1
    return
  }

  // Phase A: Per-file analysis
  const files = findPluginFiles(pluginsDirectory)
  const analyses: PluginAnalysis[] = []
  let skipped = 0

  for (const { filePath, category } of files) {
    const result = analyzeFile(filePath, category)
    if (result) {
      analyses.push(result)
    } else {
      skipped++
    }
  }

  // Phase B: Aggregation
  const report = aggregateResults(analyses)
  report.corpus.totalFiles = files.length
  report.corpus.skippedFiles = skipped

  // Phase C: Output
  const outputDirectory = path.resolve(__dirname, 'output')
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true })
  }

  const enrichment = generateEnrichment(report)
  fs.writeFileSync(
    path.join(outputDirectory, 'enrichment.json'),
    JSON.stringify(enrichment, undefined, 2)
  )

  const conventions = generateConventions(report)
  fs.writeFileSync(path.join(outputDirectory, 'conventions.md'), conventions)

  fs.writeFileSync(
    path.join(outputDirectory, 'full-report.json'),
    JSON.stringify(report, undefined, 2)
  )

  printConsoleReport(report, skipped)

  console.log('Output files:')
  console.log(`  ${path.join(outputDirectory, 'enrichment.json')}`)
  console.log(`  ${path.join(outputDirectory, 'conventions.md')}`)
  console.log(`  ${path.join(outputDirectory, 'full-report.json')}`)
  console.log('\nDone.')
}

// Run if executed directly (not imported for testing)
const entryScript = process.argv.at(1) ?? ''
const isDirectRun =
  entryScript.endsWith('analyze-plugins.ts') || entryScript.endsWith('analyze-plugins.js')
if (isDirectRun) {
  main()
}
