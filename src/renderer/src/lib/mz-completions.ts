/**
 * RPG Maker MZ Autocomplete Provider for Monaco Editor
 *
 * Registers completion items for MZ global objects, class names,
 * and common code patterns (snippets).
 */

import type { Monaco } from '@monaco-editor/react'
import type { IDisposable, languages } from 'monaco-editor'
import { getAllClassNames, getClassInfo } from './generator/class-registry'

// Pre-computed class data (static, built once on first use)
let cachedClassData: { name: string; detail: string; documentation: string }[] | null = null

function getClassData(): typeof cachedClassData {
  if (!cachedClassData) {
    cachedClassData = getAllClassNames().map((name) => {
      const info = getClassInfo(name)
      return {
        name,
        detail: info ? `${info.category} - ${info.file}` : 'RPG Maker MZ Class',
        documentation: info?.description ?? ''
      }
    })
  }
  return cachedClassData
}

// MZ global objects with descriptions
const MZ_GLOBALS: { name: string; description: string }[] = [
  { name: '$gameVariables', description: 'Access game variables' },
  { name: '$gameSwitches', description: 'Access game switches' },
  { name: '$gameSelfSwitches', description: 'Access self switches' },
  { name: '$gameParty', description: 'The player party' },
  { name: '$gameMap', description: 'The current game map' },
  { name: '$gamePlayer', description: 'The player character on the map' },
  { name: '$gameActors', description: 'All game actors' },
  { name: '$gameSystem', description: 'System data (save counts, play time, etc.)' },
  { name: '$gameMessage', description: 'Message window state' },
  { name: '$gameScreen', description: 'Screen effects (tone, flash, shake)' },
  { name: '$gameTimer', description: 'The game timer' },
  { name: '$gameTroop', description: 'The current enemy troop in battle' },
  { name: '$gameTemp', description: 'Temporary data not saved to file' },
  { name: '$dataActors', description: 'Database: Actors' },
  { name: '$dataClasses', description: 'Database: Classes' },
  { name: '$dataSkills', description: 'Database: Skills' },
  { name: '$dataItems', description: 'Database: Items' },
  { name: '$dataWeapons', description: 'Database: Weapons' },
  { name: '$dataArmors', description: 'Database: Armors' },
  { name: '$dataEnemies', description: 'Database: Enemies' },
  { name: '$dataStates', description: 'Database: States' },
  { name: '$dataSystem', description: 'Database: System settings' },
  { name: '$dataTilesets', description: 'Database: Tilesets' },
  { name: '$dataMapInfos', description: 'Database: Map info list' },
  { name: '$dataCommonEvents', description: 'Database: Common events' },
  { name: '$dataTroops', description: 'Database: Troops' },
  { name: '$dataAnimations', description: 'Database: Animations' },
  { name: '$dataMap', description: 'Currently loaded map data' }
]

export function registerMZCompletions(monaco: Monaco): IDisposable {
  return monaco.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn
      }

      // Check if we're typing after '$' (the word parser may not include it)
      const lineContent = model.getLineContent(position.lineNumber)
      const charBefore = lineContent[word.startColumn - 2] // -2 because columns are 1-indexed
      const includeGlobals = charBefore === '$' || word.word.startsWith('$')

      const suggestions: languages.CompletionItem[] = []

      // Global objects
      if (includeGlobals || word.word.length === 0) {
        for (const g of MZ_GLOBALS) {
          suggestions.push({
            label: g.name,
            kind: monaco.languages.CompletionItemKind.Variable,
            detail: 'RPG Maker MZ Global',
            documentation: g.description,
            insertText: g.name,
            range
          })
        }
      }

      // Class names from registry (cached)
      for (const cls of getClassData()!) {
        suggestions.push({
          label: cls.name,
          kind: monaco.languages.CompletionItemKind.Class,
          detail: cls.detail,
          documentation: cls.documentation,
          insertText: cls.name,
          range
        })
      }

      // Common snippets
      suggestions.push(
        {
          label: 'alias',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Method alias pattern',
          documentation: 'Safely extend an MZ class method using the alias pattern',
          insertText: [
            'const _${1:ClassName}_${2:methodName} = ${1:ClassName}.prototype.${2:methodName};',
            '${1:ClassName}.prototype.${2:methodName} = function(${3}) {',
            '\t_${1:ClassName}_${2:methodName}.call(this${4});',
            '\t$0',
            '};'
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        },
        {
          label: 'plugincmd',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Register plugin command',
          documentation: 'Register a new plugin command with PluginManager',
          insertText: [
            "PluginManager.registerCommand(PLUGIN_NAME, '${1:commandName}', function(args) {",
            '\t$0',
            '});'
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        },
        {
          label: 'prototype',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Prototype method definition',
          documentation: 'Define a new prototype method on an MZ class',
          insertText: [
            '${1:ClassName}.prototype.${2:methodName} = function(${3}) {',
            '\t$0',
            '};'
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        },
        {
          label: 'notetag',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Note tag parser',
          documentation: 'Parse a custom note tag from database item notes',
          insertText: [
            "const note = ${1:item}.note || '';",
            'const match = note.match(/<${2:TagName}:\\s*(.+?)>/i);',
            'if (match) {',
            '\tconst value = ${3:match[1]};',
            '\t$0',
            '}'
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        }
      )

      return { suggestions }
    }
  })
}
