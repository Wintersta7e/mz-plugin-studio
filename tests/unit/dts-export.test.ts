// The .d.ts export parsed by the TypeScript compiler: text from a description must stay inside
// its JSDoc comment, so the declarations are the ones a plain description produces.
import { describe, it, expect } from 'vitest'
import * as ts from 'typescript'
import { generateTypeDeclaration } from '../../src/renderer/src/lib/exportFormats'
import type { PluginDefinition, PluginParameter } from '../../src/shared/types/plugin'

const FILE = 'plugin.d.ts'

function parameter(name: string, desc: string): PluginParameter {
  return { id: name, name, text: name, desc, type: 'string', default: '' }
}

function definition(desc: string): PluginDefinition {
  return {
    id: 'fixture-dts',
    meta: {
      name: 'Fixture_Types',
      version: '1.0.0',
      author: '',
      description: '',
      help: '',
      url: '',
      target: 'MZ',
      dependencies: []
    },
    parameters: [parameter('speed', desc)],
    commands: [
      { id: 'move', name: 'Move', text: 'Move', desc: '', args: [parameter('distance', desc)] }
    ],
    structs: []
  }
}

/**
The names a statement declares other than a module: each variable, else its one name or ''
*/
function namesOf(s: ts.Statement, sf: ts.SourceFile): string[] {
  if (ts.isVariableStatement(s)) {
    return s.declarationList.declarations.map((d) => d.name.getText(sf))
  }
  const name = ts.isDeclarationStatement(s) ? ts.getNameOfDeclaration(s) : undefined
  return [name === undefined ? '' : name.getText(sf)]
}

function declarationsOf(statements: readonly ts.Statement[], sf: ts.SourceFile): string[] {
  return statements.flatMap((s) => {
    const kind = ts.SyntaxKind[s.kind]
    if (ts.isModuleDeclaration(s)) {
      const body = s.body !== undefined && ts.isModuleBlock(s.body) ? s.body.statements : []
      return [`${kind} ${s.name.getText(sf)}`, ...declarationsOf(body, sf)]
    }
    return namesOf(s, sf).map((name) => `${kind} ${name}`)
  })
}

/**
Syntax diagnostics and declarations of a declaration file, parsed in memory.
*/
function parse(text: string): { diagnostics: string[]; declarations: string[] } {
  const options: ts.CompilerOptions = { noLib: true, noResolve: true, types: [] }
  const sf = ts.createSourceFile(FILE, text, ts.ScriptTarget.Latest, true)
  const host = ts.createCompilerHost(options)
  host.getSourceFile = (name) => (name === FILE ? sf : undefined)
  host.fileExists = (name) => name === FILE
  host.readFile = (name) => (name === FILE ? text : undefined)
  const program = ts.createProgram([FILE], options, host)
  return {
    diagnostics: program
      .getSyntacticDiagnostics(sf)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
    declarations: declarationsOf(sf.statements, sf)
  }
}

describe(generateTypeDeclaration, () => {
  it('a description holding "*/" stays inside its JSDoc comment', () => {
    const clean = parse(generateTypeDeclaration(definition('Plain description')))

    expect(clean.diagnostics).toStrictEqual([])
    expect(clean.declarations).toStrictEqual([
      'ModuleDeclaration Fixture_Types',
      'InterfaceDeclaration Parameters',
      'InterfaceDeclaration MoveArgs'
    ])

    const hostile = parse(
      generateTypeDeclaration(definition('x */ declare const injected: 1; /* y'))
    )

    expect(hostile.diagnostics).toStrictEqual([])
    expect(hostile.declarations).toStrictEqual(clean.declarations)
  })
})
