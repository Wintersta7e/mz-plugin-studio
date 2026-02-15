/**
 * MZ Plugin Dictionary - Analysis Script
 *
 * Reads example RPG Maker MZ plugins and extracts ecosystem patterns,
 * conventions, and popularity data. Outputs enrichment data for
 * mz-classes.json and a conventions reference for AI-assisted development.
 *
 * Usage: npx tsx tools/analyze-plugins.ts
 *
 * Input:  examples/plugins/**\/*.js (gitignored, local only)
 * Output: tools/output/enrichment.json, conventions.md, full-report.json
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Types ──────────────────────────────────────────────────────────────────

export type IIFEStyle = 'arrow' | 'function' | 'none'
export type ParamLoadingStyle = 'standard' | 'pluginmanagerex' | 'none'
export type AliasStyle = 'const' | 'var' | 'let'
export type NoteTagPattern = 'meta_bracket' | 'meta_property' | 'note_regex'
export type ClassDefStyle = 'function' | 'es6_extends'

export interface AliasInfo {
  style: AliasStyle
  className: string
  methodName: string
}

export interface MethodOverride {
  className: string
  methodName: string
}

export interface ClassDef {
  name: string
  style: ClassDefStyle
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
  newClasses: ClassDef[]
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
 * Detect the IIFE wrapper style used by the plugin.
 * Arrow: `(() => { ... })();`
 * Function: `(function() { ... })();`
 * None: no IIFE wrapper detected
 */
export function detectIIFEStyle(content: string): IIFEStyle {
  // Arrow IIFE: (() => {
  if (/\(\(\)\s*=>\s*\{/.test(content)) return 'arrow'
  // Function IIFE: (function() { or (function () {
  if (/\(function\s*\(\)\s*\{/.test(content)) return 'function'
  return 'none'
}

/**
 * Detect how the plugin loads its parameters.
 */
export function detectParamLoading(content: string): ParamLoadingStyle {
  if (/PluginManagerEx\.createParameter/.test(content)) return 'pluginmanagerex'
  if (/PluginManager\.parameters\s*\(/.test(content)) return 'standard'
  return 'none'
}

/**
 * Detect whether the plugin uses 'use strict'.
 */
export function detectUseStrict(content: string): boolean {
  return /['"]use strict['"]/.test(content)
}

/**
 * Extract prototype method aliases (const/var/let _Class_method = Class.prototype.method).
 */
export function extractAliases(content: string): AliasInfo[] {
  const results: AliasInfo[] = []
  // Match: const/var/let _Something = ClassName.prototype.methodName;
  const aliasRegex = /\b(const|var|let)\s+_\w+\s*=\s*([A-Z]\w+)\.prototype\.(\w+)\s*;/g
  let match: RegExpExecArray | null
  while ((match = aliasRegex.exec(content)) !== null) {
    results.push({
      style: match[1] as AliasStyle,
      className: match[2],
      methodName: match[3],
    })
  }
  return results
}

/**
 * Extract all prototype method overrides (ClassName.prototype.methodName = function).
 * This catches both aliased and non-aliased overrides.
 */
export function extractMethodOverrides(content: string): MethodOverride[] {
  const results: MethodOverride[] = []
  const overrideRegex = /([A-Z]\w+)\.prototype\.(\w+)\s*=\s*function/g
  let match: RegExpExecArray | null
  while ((match = overrideRegex.exec(content)) !== null) {
    results.push({
      className: match[1],
      methodName: match[2],
    })
  }
  return results
}

/**
 * Extract PluginManager.registerCommand call names.
 */
export function extractRegisterCommands(content: string): string[] {
  const results: string[] = []
  // PluginManager.registerCommand(pluginName, 'commandName', ...) or
  // PluginManager.registerCommand(pluginName, "commandName", ...)
  const cmdRegex = /PluginManager\.registerCommand\s*\([^,]+,\s*['"](\w+)['"]/g
  // Also catch PluginManagerEx.registerCommand
  const cmdRegexEx = /PluginManagerEx\.registerCommand\s*\([^,]+,\s*['"](\w+)['"]/g
  let match: RegExpExecArray | null
  while ((match = cmdRegex.exec(content)) !== null) {
    results.push(match[1])
  }
  while ((match = cmdRegexEx.exec(content)) !== null) {
    results.push(match[1])
  }
  return results
}

/**
 * Extract @type declarations from plugin header comments.
 */
export function extractParamTypes(content: string): string[] {
  const results: string[] = []
  const typeRegex = /@type\s+(\w+)/g
  let match: RegExpExecArray | null
  while ((match = typeRegex.exec(content)) !== null) {
    results.push(match[1].toLowerCase())
  }
  return results
}

/**
 * Detect note tag access patterns used in the plugin.
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
 * Detect new class definitions (both function constructor and ES6 class extends).
 */
export function detectNewClasses(content: string): ClassDef[] {
  const results: ClassDef[] = []
  const seen = new Set<string>()

  // Function constructor style: function ClassName() { ... }
  // Look for Game_, Window_, Scene_, Sprite_ prefixed classes
  const funcRegex = /\bfunction\s+((?:Game|Window|Scene|Sprite|Spriteset)_\w+)\s*\(/g
  let match: RegExpExecArray | null
  while ((match = funcRegex.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1])
      results.push({ name: match[1], style: 'function' })
    }
  }

  // ES6 class extends: class ClassName extends ParentClass
  const classRegex = /\bclass\s+(\w+)\s+extends\s+(\w+)/g
  while ((match = classRegex.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1])
      results.push({ name: match[1], style: 'es6_extends' })
    }
  }

  return results
}

// ── Aggregation ────────────────────────────────────────────────────────────

/** Filter out single-letter class names (from minified code) */
function isValidClassName(name: string): boolean {
  return name.length > 1
}

function aggregateResults(analyses: PluginAnalysis[]): AggregatedReport {
  const report: AggregatedReport = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    corpus: {
      totalFiles: 0,
      analyzedFiles: analyses.length,
      skippedFiles: 0,
      categories: {},
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
      uniqueMethodsOverridden: 0,
    },
    classPopularity: {},
    methodPopularity: {},
    paramTypes: {},
    noteTagPatterns: { meta_bracket: 0, meta_property: 0, note_regex: 0 },
  }

  // Per-category counts
  for (const a of analyses) {
    report.corpus.categories[a.category] = (report.corpus.categories[a.category] || 0) + 1
  }

  // Track unique methods (class.method) across all plugins
  const allUniqueMethodKeys = new Set<string>()

  // Class popularity: number of distinct plugins that extend this class
  const classPluginSets: Record<string, Set<string>> = {}
  // Method popularity: number of unique plugins that override this method
  const methodPluginSets: Record<string, Set<string>> = {}

  for (const a of analyses) {
    // Structural patterns
    report.patterns.iifeStyle[a.iifeStyle]++
    if (a.useStrict) report.patterns.useStrict++
    report.patterns.paramLoading[a.paramLoading]++
    if (a.registerCommands.length > 0) report.patterns.hasRegisterCommand++
    if (a.usesStructs) report.patterns.usesStructs++
    if (a.usesArrays) report.patterns.usesArrays++

    // Aliases
    report.patterns.totalAliases += a.aliases.length
    for (const alias of a.aliases) {
      report.patterns.aliasStyle[alias.style] = (report.patterns.aliasStyle[alias.style] || 0) + 1
    }

    // Method overrides
    for (const override of a.methodOverrides) {
      if (!isValidClassName(override.className)) continue
      const key = `${override.className}.prototype.${override.methodName}`
      allUniqueMethodKeys.add(key)

      // Class popularity: distinct plugins per class
      if (!classPluginSets[override.className]) {
        classPluginSets[override.className] = new Set()
      }
      classPluginSets[override.className].add(a.fileName)

      // Method popularity: unique plugins per method
      if (!methodPluginSets[key]) {
        methodPluginSets[key] = new Set()
      }
      methodPluginSets[key].add(a.fileName)
    }

    // New class definitions
    if (a.newClasses.length > 0) report.patterns.definesNewClasses++
    if (a.newClasses.some(c => c.style === 'es6_extends')) report.patterns.usesES6Extends++

    // Parameter types
    for (const t of a.paramTypes) {
      report.paramTypes[t] = (report.paramTypes[t] || 0) + 1
    }

    // Note tag patterns
    for (const p of a.noteTagPatterns) {
      report.noteTagPatterns[p]++
    }
  }

  report.patterns.uniqueMethodsOverridden = allUniqueMethodKeys.size

  // Build sorted popularity maps
  for (const [cls, plugins] of Object.entries(classPluginSets)) {
    report.classPopularity[cls] = plugins.size
  }
  for (const [method, plugins] of Object.entries(methodPluginSets)) {
    report.methodPopularity[method] = plugins.size
  }

  // Sort by popularity (descending)
  report.classPopularity = sortByValue(report.classPopularity)
  report.methodPopularity = sortByValue(report.methodPopularity)
  report.paramTypes = sortByValue(report.paramTypes)

  return report
}

function sortByValue(obj: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(obj).sort(([, a], [, b]) => b - a)
  )
}

// ── Output Generation ──────────────────────────────────────────────────────

function generateEnrichment(report: AggregatedReport): EnrichmentData {
  return {
    version: '1.0.0',
    generatedAt: report.generatedAt,
    pluginCount: report.corpus.analyzedFiles,
    classPopularity: report.classPopularity,
    methodPopularity: report.methodPopularity,
  }
}

function generateConventions(report: AggregatedReport): string {
  const r = report
  const p = r.patterns
  const total = r.corpus.analyzedFiles

  const topClasses = Object.entries(r.classPopularity).slice(0, 20)
  const topMethods = Object.entries(r.methodPopularity).slice(0, 30)
  const topParamTypes = Object.entries(r.paramTypes).slice(0, 15)

  const pct = (n: number) => `${Math.round((n / total) * 100)}%`

  return `# RPG Maker MZ Plugin Conventions Reference
## Generated from analysis of ${total} plugins (${r.generatedAt.split('T')[0]})

> This document describes how MZ plugins are structured and written, based on
> statistical analysis of ${total} real-world plugins. All code examples are
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
- ${p.useStrict} plugins (${pct(p.useStrict)}) include \`'use strict'\`

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
${p.paramLoading.none} plugins load no parameters.

---

## Alias Conventions

### The Standard Pattern
\`\`\`javascript
const _ClassName_methodName = ClassName.prototype.methodName;
ClassName.prototype.methodName = function(...args) {
    _ClassName_methodName.call(this, ...args);
    // Custom logic here
};
\`\`\`

### Declaration Style
- **\`const\`** (${p.aliasStyle['const'] || 0} aliases, ${pct(p.aliasStyle['const'] || 0)} of plugins): Standard — use this
- **\`var\`** (${p.aliasStyle['var'] || 0} aliases): Older pattern — avoid in new code
- **\`let\`** (${p.aliasStyle['let'] || 0} aliases): Rare

### Rules
1. **Always use \`const\`** for alias declarations
2. **Always call the original** via \`.call(this, ...args)\` — failing to do so breaks other plugins
3. **Naming convention:** \`_ClassName_methodName\` (underscore prefix, class and method joined by underscore)
4. Total aliases found across corpus: ${p.totalAliases}

---

## Most Extended Classes (Top 20)

These are the classes most commonly modified by plugins. Higher numbers indicate
more plugins extend this class — it's a proven, safe extension point.

| Rank | Class | Plugins |
|------|-------|---------|
${topClasses.map(([cls, count], i) => `| ${i + 1} | ${cls} | ${count} |`).join('\n')}

---

## Most Overridden Methods (Top 30)

These methods are the primary hook points for plugin functionality. Overriding
these is well-established practice with minimal risk of conflicts.

| Rank | Method | Plugins | Use Case |
|------|--------|---------|----------|
${topMethods.map(([method, count], i) => {
  const desc = getMethodDescription(method)
  return `| ${i + 1} | ${method} | ${count} | ${desc} |`
}).join('\n')}

---

## Parameter Type Distribution (${Object.values(r.paramTypes).reduce((a, b) => a + b, 0)} total declarations)

| Type | Count | Percentage |
|------|-------|------------|
${topParamTypes.map(([type, count]) => `| ${type} | ${count} | ${pct(count)} |`).join('\n')}

### Observations
- \`number\` is the dominant parameter type
- \`struct\` used by ${p.usesStructs} plugins (${pct(p.usesStructs)}) — complex data grouping
- \`array\` patterns used by ${p.usesArrays} plugins (${pct(p.usesArrays)}) — list-based configuration

---

## Plugin Commands

- ${p.hasRegisterCommand} plugins (${pct(p.hasRegisterCommand)}) register at least one plugin command

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
| \`meta.propertyName\` | ${r.noteTagPatterns.meta_property} | Direct property access — preferred |
| \`meta['propertyName']\` | ${r.noteTagPatterns.meta_bracket} | Bracket access — for dynamic keys |
| \`.note.match(regex)\` | ${r.noteTagPatterns.note_regex} | Regex parsing — for complex tags |

### Standard Note Tag Access
\`\`\`javascript
// In a method that has access to a database object (actor, enemy, item, etc.)
const tagValue = obj.meta.MyTagName;
if (tagValue) {
    // Process the tag
}
\`\`\`

---

## New Class Definitions

- ${p.definesNewClasses} plugins define new classes (${r.patterns.uniqueMethodsOverridden} unique methods overridden total)
- ${p.usesES6Extends} plugins (${pct(p.usesES6Extends)}) use ES6 \`class extends\` syntax

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
| \`const\` alias + \`.call(this)\` | ${p.aliasStyle['const'] || 0} aliases | Standard aliasing pattern |
| \`PluginManager.parameters()\` | ${pct(p.paramLoading.standard)} | Default parameter loading |
| \`PluginManagerEx.createParameter()\` | ${pct(p.paramLoading.pluginmanagerex)} | Auto-typed alternative |
| \`registerCommand\` | ${pct(p.hasRegisterCommand)} | Standard command registration |
| \`meta.property\` note tags | ${r.noteTagPatterns.meta_property} plugins | Preferred note tag access |
| Function constructor classes | dominant | Standard new class pattern |
| ES6 class extends | ${pct(p.usesES6Extends)} | Modern alternative |

---

*This reference is auto-generated by tools/analyze-plugins.ts. Re-run the analysis to update statistics.*
`
}

/** Brief descriptions for well-known MZ methods */
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
    'Window_Base.prototype.update': 'Window per-frame update',
  }
  return descriptions[method] || ''
}

// ── Console Report ─────────────────────────────────────────────────────────

function printConsoleReport(report: AggregatedReport, skippedCount: number): void {
  const r = report
  const p = r.patterns
  const total = r.corpus.analyzedFiles
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║       MZ Plugin Dictionary — Analysis Report        ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  console.log(`Corpus: ${total + skippedCount} files total, ${total} analyzed, ${skippedCount} skipped\n`)
  console.log('Categories:')
  for (const [cat, count] of Object.entries(r.corpus.categories)) {
    console.log(`  ${cat}: ${count}`)
  }

  console.log('\n── Structural Patterns ──\n')
  console.log(`  IIFE Style:       arrow ${p.iifeStyle.arrow} (${pct(p.iifeStyle.arrow)})  |  function ${p.iifeStyle.function} (${pct(p.iifeStyle.function)})  |  none ${p.iifeStyle.none} (${pct(p.iifeStyle.none)})`)
  console.log(`  'use strict':     ${p.useStrict} (${pct(p.useStrict)})`)
  console.log(`  Param Loading:    standard ${p.paramLoading.standard} (${pct(p.paramLoading.standard)})  |  PluginManagerEx ${p.paramLoading.pluginmanagerex} (${pct(p.paramLoading.pluginmanagerex)})  |  none ${p.paramLoading.none} (${pct(p.paramLoading.none)})`)
  console.log(`  Alias Styles:     const ${p.aliasStyle['const'] || 0}  |  var ${p.aliasStyle['var'] || 0}  |  let ${p.aliasStyle['let'] || 0}`)
  console.log(`  Total Aliases:    ${p.totalAliases}`)
  console.log(`  registerCommand:  ${p.hasRegisterCommand} (${pct(p.hasRegisterCommand)})`)
  console.log(`  Uses Structs:     ${p.usesStructs} (${pct(p.usesStructs)})`)
  console.log(`  Uses Arrays:      ${p.usesArrays} (${pct(p.usesArrays)})`)
  console.log(`  New Classes:      ${p.definesNewClasses} plugins`)
  console.log(`  ES6 Extends:      ${p.usesES6Extends} (${pct(p.usesES6Extends)})`)
  console.log(`  Unique Methods:   ${p.uniqueMethodsOverridden}`)

  console.log('\n── Top 15 Extended Classes ──\n')
  Object.entries(r.classPopularity).slice(0, 15).forEach(([cls, count], i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${cls.padEnd(25)} ${count}`)
  })

  console.log('\n── Top 15 Overridden Methods ──\n')
  Object.entries(r.methodPopularity).slice(0, 15).forEach(([method, count], i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${method.padEnd(55)} ${count}`)
  })

  console.log('\n── Parameter Types ──\n')
  Object.entries(r.paramTypes).slice(0, 10).forEach(([type, count]) => {
    console.log(`  ${type.padEnd(20)} ${count}`)
  })

  console.log('\n── Note Tag Patterns ──\n')
  for (const [pattern, count] of Object.entries(r.noteTagPatterns)) {
    console.log(`  ${pattern.padEnd(20)} ${count}`)
  }

  console.log('')
}

// ── Main Pipeline ──────────────────────────────────────────────────────────

function findPluginFiles(baseDir: string): { filePath: string; category: string }[] {
  const results: { filePath: string; category: string }[] = []

  function walk(dir: string, category: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath, category)
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        results.push({ filePath: fullPath, category })
      }
    }
  }

  const categories = fs.readdirSync(baseDir, { withFileTypes: true })
  for (const cat of categories) {
    if (cat.isDirectory()) {
      walk(path.join(baseDir, cat.name), cat.name)
    }
  }

  return results
}

function analyzeFile(filePath: string, category: string): PluginAnalysis | null {
  const stat = fs.statSync(filePath)
  if (stat.size < 200) return null // Skip separator/placeholder files

  const content = fs.readFileSync(filePath, 'utf-8')
  const fileName = path.basename(filePath)

  return {
    fileName,
    fileSize: stat.size,
    category,
    iifeStyle: detectIIFEStyle(content),
    useStrict: detectUseStrict(content),
    paramLoading: detectParamLoading(content),
    aliases: extractAliases(content),
    methodOverrides: extractMethodOverrides(content),
    registerCommands: extractRegisterCommands(content),
    paramTypes: extractParamTypes(content),
    noteTagPatterns: detectNoteTagPattern(content),
    newClasses: detectNewClasses(content),
    usesStructs: /struct</.test(content),
    usesArrays: /\[\]\s*$/m.test(content) || /@type\s+\w+\[\]/.test(content),
  }
}

function main(): void {
  const pluginsDir = path.resolve(__dirname, '../examples/plugins')

  if (!fs.existsSync(pluginsDir)) {
    console.error(`Error: ${pluginsDir} not found.`)
    console.error('Place example plugins in examples/plugins/{category}/*.js')
    process.exit(1)
  }

  // Phase A: Per-file analysis
  const files = findPluginFiles(pluginsDir)
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
  const outputDir = path.resolve(__dirname, 'output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const enrichment = generateEnrichment(report)
  fs.writeFileSync(
    path.join(outputDir, 'enrichment.json'),
    JSON.stringify(enrichment, null, 2)
  )

  const conventions = generateConventions(report)
  fs.writeFileSync(path.join(outputDir, 'conventions.md'), conventions)

  fs.writeFileSync(
    path.join(outputDir, 'full-report.json'),
    JSON.stringify(report, null, 2)
  )

  printConsoleReport(report, skipped)

  console.log('Output files:')
  console.log(`  ${path.join(outputDir, 'enrichment.json')}`)
  console.log(`  ${path.join(outputDir, 'conventions.md')}`)
  console.log(`  ${path.join(outputDir, 'full-report.json')}`)
  console.log('\nDone.')
}

// Run if executed directly (not imported for testing)
const isDirectRun = process.argv[1] &&
  (process.argv[1].endsWith('analyze-plugins.ts') || process.argv[1].endsWith('analyze-plugins.js'))
if (isDirectRun) {
  main()
}
