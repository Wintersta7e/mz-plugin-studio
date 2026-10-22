// Every renderer message dialog that offers Cancel, read from the source with the TypeScript
// compiler: Enter (defaultId) and Esc (cancelId) must both choose Cancel, so no key press
// discards work.
import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const ROOT = join(process.cwd(), 'src', 'renderer', 'src')

interface CancelDialog {
  /** Path under the renderer source, with the call's line */
  where: string
  /** Why Cancel is not provably both buttons; null when it is */
  problem: string | null
}

interface Scan {
  /** Message dialogs found */
  dialogs: number
  /** Those whose buttons hold Cancel, or cannot be read */
  cancelDialogs: CancelDialog[]
  /** `window.confirm` calls, by file */
  confirms: string[]
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : []
  })
}

const unwrap = (node: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node

/** Each array a `buttons` value can be: both branches of a conditional; null when not literal. */
function buttonArrays(node: ts.Expression): ts.ArrayLiteralExpression[] | null {
  const value = unwrap(node)
  if (ts.isArrayLiteralExpression(value)) return [value]
  if (ts.isConditionalExpression(value)) {
    const whenTrue = buttonArrays(value.whenTrue)
    const whenFalse = buttonArrays(value.whenFalse)
    return whenTrue && whenFalse ? [...whenTrue, ...whenFalse] : null
  }
  return null
}

/** Cancel's index in `buttons`: -1 when it has none, null when that cannot be read. */
function cancelIndex(buttons: ts.ArrayLiteralExpression): number | null {
  for (const [index, element] of buttons.elements.entries()) {
    if (!ts.isStringLiteralLike(element)) return null
    if (element.text === 'Cancel') return index
  }
  return -1
}

/** Why the dialog's Cancel is not its default (null when it is); undefined without Cancel. */
function cancelProblem(options: ts.Expression | undefined): string | null | undefined {
  const value = options === undefined ? undefined : unwrap(options)
  if (value === undefined || !ts.isObjectLiteralExpression(value)) {
    return 'options are not an object literal'
  }
  const props = new Map<string, ts.Expression>()
  for (const prop of value.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) {
      return 'options hold a property that is not a plain assignment'
    }
    props.set(prop.name.text, prop.initializer)
  }
  const buttons = props.get('buttons')
  if (buttons === undefined) return undefined
  const arrays = buttonArrays(buttons)
  if (arrays === null) return 'buttons are not an array literal'
  const indices = arrays.map(cancelIndex)
  if (indices.includes(null)) return 'a button before Cancel is not a string'
  const withCancel = indices.filter((i): i is number => i !== null && i >= 0)
  if (withCancel.length === 0) return undefined
  if (new Set(withCancel).size > 1) return 'Cancel moves between branches'
  const cancel = withCancel[0]
  for (const name of ['defaultId', 'cancelId']) {
    const initializer = props.get(name)
    if (initializer === undefined || !ts.isNumericLiteral(initializer)) {
      return `${name} is not a number literal`
    }
    if (Number(initializer.text) !== cancel) return `${name} is not Cancel's index ${cancel}`
  }
  return null
}

function scanRenderer(): Scan {
  const scan: Scan = { dialogs: 0, cancelDialogs: [], confirms: [] }
  for (const path of sourceFiles(ROOT)) {
    const file = relative(ROOT, path).split('\\').join('/')
    const source = ts.createSourceFile(
      path,
      readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    )
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText(source)
        if (callee === 'window.confirm' || callee === 'confirm') scan.confirms.push(file)
        if (callee.endsWith('dialog.message')) {
          scan.dialogs++
          const problem = cancelProblem(node.arguments[0])
          if (problem !== undefined) {
            const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
            scan.cancelDialogs.push({ where: `${file}:${line}`, problem })
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return scan
}

describe('renderer dialog defaults', () => {
  it('renderer dialogs with a Cancel button make Cancel the Enter and Esc button', () => {
    const { dialogs, cancelDialogs, confirms } = scanRenderer()
    const checked = cancelDialogs.filter((d) => d.problem === null).length
    console.log(`dialogs checked ${checked}/${cancelDialogs.length}`)
    console.log(
      `dialogs found ${dialogs}; with Cancel ${cancelDialogs.length}; window.confirm ${confirms.length}`
    )
    expect(cancelDialogs.length).toBeGreaterThan(0)
    expect(
      cancelDialogs.filter((d) => d.problem !== null).map((d) => `${d.where}: ${d.problem}`)
    ).toEqual([])
    expect(checked).toBe(cancelDialogs.length)
    expect(confirms).toEqual([])
  })
})
