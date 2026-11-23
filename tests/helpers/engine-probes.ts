// One syntax probe per form each ECMAScript edition added, so an engine's JavaScript level can be
// read off which probes it compiles. A probe's source is a function body: an engine compiles it
// with `new Function(source)` and never calls it.

export interface EditionForm {
  id: string
  /**
  Why the form has no probe: a function body cannot hold it.
  */
  excluded?: string
}

export interface EngineProbe {
  id: string
  year: number
  source: string
}

const MODULE_ONLY = 'module only'

/**
The syntax forms each edition added, from 2015 on.
*/
export const EDITION_FORMS: Readonly<Record<number, readonly EditionForm[]>> = {
  2015: [
    { id: 'let' },
    { id: 'const' },
    { id: 'arrow' },
    { id: 'class' },
    { id: 'template' },
    { id: 'tagged-template' },
    { id: 'destructuring' },
    { id: 'default-param' },
    { id: 'rest-param' },
    { id: 'spread' },
    { id: 'for-of' },
    { id: 'generator' },
    { id: 'computed-key' },
    { id: 'shorthand-method' },
    { id: 'shorthand-property' },
    { id: 'new-target' },
    { id: 'binary-literal' },
    { id: 'octal-literal' },
    { id: 'unicode-escape' },
    { id: 'regexp-sticky' },
    { id: 'regexp-unicode' },
    { id: 'super-property' },
    { id: 'import-export', excluded: MODULE_ONLY }
  ],
  2016: [{ id: 'exponent' }],
  2017: [{ id: 'async-function' }, { id: 'trailing-comma-params' }],
  2018: [
    { id: 'object-rest' },
    { id: 'object-spread' },
    { id: 'async-generator' },
    { id: 'for-await' },
    { id: 'regexp-named-group' },
    { id: 'regexp-lookbehind' },
    { id: 'regexp-dotall' },
    { id: 'regexp-property-escape' },
    { id: 'template-invalid-escape' }
  ],
  2019: [{ id: 'optional-catch' }, { id: 'json-superset' }],
  2020: [
    { id: 'optional-chaining' },
    { id: 'nullish' },
    { id: 'bigint' },
    { id: 'dynamic-import' },
    { id: 'import-meta', excluded: MODULE_ONLY },
    { id: 'export-star-as', excluded: MODULE_ONLY }
  ],
  2021: [{ id: 'logical-assign' }, { id: 'numeric-separator' }],
  2022: [
    { id: 'class-field' },
    { id: 'private-field' },
    { id: 'private-method' },
    { id: 'static-block' },
    { id: 'private-in' },
    { id: 'regexp-indices' },
    { id: 'top-level-await', excluded: MODULE_ONLY },
    { id: 'arbitrary-module-names', excluded: MODULE_ONLY }
  ],
  2023: [{ id: 'hashbang', excluded: 'valid only at script start' }],
  2024: [{ id: 'regexp-v-flag' }],
  2025: [
    { id: 'regexp-modifiers' },
    { id: 'regexp-duplicate-named-groups' },
    { id: 'import-attributes-dynamic' },
    { id: 'import-attributes-static', excluded: MODULE_ONLY }
  ],
  2026: [{ id: 'using' }, { id: 'await-using' }]
}

/**
One probe per form not excluded, each valid at its edition and at no earlier one.
*/
export const ENGINE_PROBES: readonly EngineProbe[] = [
  { id: 'let', year: 2015, source: 'let a = 1; return a' },
  { id: 'const', year: 2015, source: 'const a = 1; return a' },
  { id: 'arrow', year: 2015, source: 'return (a) => a' },
  { id: 'class', year: 2015, source: 'class A {} return A' },
  { id: 'template', year: 2015, source: 'return `a${1}`' },
  { id: 'tagged-template', year: 2015, source: 'return String.raw`a`' },
  {
    id: 'destructuring',
    year: 2015,
    source: 'const [a] = [1]; const {b} = {b: 2}; return a + b'
  },
  { id: 'default-param', year: 2015, source: 'function f(a = 1) { return a } return f' },
  { id: 'rest-param', year: 2015, source: 'function f(...a) { return a } return f' },
  { id: 'spread', year: 2015, source: 'return [...[1]]' },
  { id: 'for-of', year: 2015, source: 'for (const a of []) { return a }' },
  { id: 'generator', year: 2015, source: 'function* g() { yield 1 } return g' },
  { id: 'computed-key', year: 2015, source: 'return { ["a"]: 1 }' },
  { id: 'shorthand-method', year: 2015, source: 'return { m() { return 1 } }' },
  { id: 'shorthand-property', year: 2015, source: 'const a = 1; return { a }' },
  { id: 'new-target', year: 2015, source: 'function F() { return new.target } return F' },
  { id: 'binary-literal', year: 2015, source: 'return 0b1' },
  { id: 'octal-literal', year: 2015, source: 'return 0o7' },
  { id: 'unicode-escape', year: 2015, source: 'return "\\u{61}"' },
  { id: 'regexp-sticky', year: 2015, source: 'return /a/y' },
  { id: 'regexp-unicode', year: 2015, source: 'return /a/u' },
  { id: 'super-property', year: 2015, source: 'return { m() { return super.toString } }' },
  { id: 'exponent', year: 2016, source: 'return 2 ** 3' },
  { id: 'async-function', year: 2017, source: 'async function f() { await 1 } return f' },
  { id: 'trailing-comma-params', year: 2017, source: 'function f(a,) { return a } return f' },
  { id: 'object-rest', year: 2018, source: 'const { a, ...r } = { a: 1 }; return r' },
  { id: 'object-spread', year: 2018, source: 'return { ...{ a: 1 } }' },
  { id: 'async-generator', year: 2018, source: 'async function* g() { yield 1 } return g' },
  {
    id: 'for-await',
    year: 2018,
    source: 'async function f() { for await (const a of []) { return a } } return f'
  },
  { id: 'regexp-named-group', year: 2018, source: 'return /(?<a>x)/' },
  { id: 'regexp-lookbehind', year: 2018, source: 'return /(?<=a)b/' },
  { id: 'regexp-dotall', year: 2018, source: 'return /a/s' },
  { id: 'regexp-property-escape', year: 2018, source: 'return /\\p{L}/u' },
  { id: 'template-invalid-escape', year: 2018, source: 'return String.raw`\\unicode`' },
  { id: 'optional-catch', year: 2019, source: 'try { return 1 } catch { return 2 }' },
  // A line separator inside a string literal
  { id: 'json-superset', year: 2019, source: 'return "\u{2028}"' },
  { id: 'optional-chaining', year: 2020, source: 'return globalThis?.a' },
  { id: 'nullish', year: 2020, source: 'return null ?? 1' },
  { id: 'bigint', year: 2020, source: 'return 1n' },
  { id: 'dynamic-import', year: 2020, source: 'return () => import("a")' },
  {
    id: 'logical-assign',
    year: 2021,
    source: 'let a = null; a ??= 1; a ||= 2; a &&= 3; return a'
  },
  { id: 'numeric-separator', year: 2021, source: 'return 1_000' },
  { id: 'class-field', year: 2022, source: 'class A { a = 1; static b = 2 } return A' },
  {
    id: 'private-field',
    year: 2022,
    source: 'class A { #a = 1; m() { return this.#a } } return A'
  },
  { id: 'private-method', year: 2022, source: 'class A { #m() { return 1 } } return A' },
  { id: 'static-block', year: 2022, source: 'class A { static { this.a = 1 } } return A' },
  {
    id: 'private-in',
    year: 2022,
    source: 'class A { #a; static has(o) { return #a in o } } return A'
  },
  { id: 'regexp-indices', year: 2022, source: 'return /a/d' },
  { id: 'regexp-v-flag', year: 2024, source: 'return /[\\p{L}--[a-z]]/v' },
  { id: 'regexp-modifiers', year: 2025, source: 'return /(?i:a)b/' },
  { id: 'regexp-duplicate-named-groups', year: 2025, source: 'return /(?<a>x)|(?<a>y)/' },
  {
    id: 'import-attributes-dynamic',
    year: 2025,
    source: 'return () => import("a", { with: { type: "json" } })'
  },
  { id: 'using', year: 2026, source: '{ using a = null } return 1' },
  {
    id: 'await-using',
    year: 2026,
    source: 'async function f() { await using a = null } return f'
  }
]
