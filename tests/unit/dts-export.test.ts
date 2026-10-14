// The .d.ts export parsed by the TypeScript compiler: text from a description must stay inside
// its JSDoc comment, so the declarations are the ones a plain description produces.
import { describe, it, expect } from 'vitest'
import ts from 'typescript'
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

function declarationsOf(statements: readonly ts.Statement[], sf: ts.SourceFile): string[] {
  return statements.flatMap((s) => {
    const kind = ts.SyntaxKind[s.kind]
    if (ts.isModuleDeclaration(s)) {
      const body = s.body !== undefined && ts.isModuleBlock(s.body) ? s.body.statements : []
      return [`${kind} ${s.name.getText(sf)}`, ...declarationsOf(body, sf)]
    }
    if (ts.isVariableStatement(s)) {
      return s.declarationList.declarations.map((d) => `${kind} ${d.name.getText(sf)}`)
    }
    const name = ts.getNameOfDeclaration(s as ts.DeclarationStatement)
    return [`${kind} ${name === undefined ? '' : name.getText(sf)}`]
  })
}

/** Syntax diagnostics and declarations of a declaration file, parsed in memory. */
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

describe('generateTypeDeclaration', () => {
  it('a description holding "*/" stays inside its JSDoc comment', () => {
    const clean = parse(generateTypeDeclaration(definition('Plain description')))
    expect(clean.diagnostics).toEqual([])
    expect(clean.declarations).toEqual([
      'ModuleDeclaration Fixture_Types',
      'InterfaceDeclaration Parameters',
      'InterfaceDeclaration MoveArgs'
    ])
    const hostile = parse(
      generateTypeDeclaration(definition('x */ declare const injected: 1; /* y'))
    )
    expect(hostile.diagnostics).toEqual([])
    expect(hostile.declarations).toEqual(clean.declarations)
  })
})
