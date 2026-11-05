// Synthetic plugin files, one for each branch of the patterns the parser reads a plugin with: the
// tag lines of the header, help text and descriptions, the script name, required assets,
// parameter, command and argument blocks, tag values and the code wrapper. Each case is one line
// shape, one end a value or block can reach, or one way a pattern fails to match, so a rewrite of
// a pattern that reads any of them differently changes a golden.
// Branches no file can reach have no case: a header never holds `*/` (a block ends at its first
// one), so the `*/` ends some patterns list never match; an argument block never holds a
// `@command` line with text after it (the command's block ends there first); and a script name
// found mid-word is never the first one found, so the word-start test only saves time.

export interface ParserPatternCase {
  /**
  Golden file stem after `pattern-`: what the case shows.
  */
  name: string
  /**
  Passed to the parser; empty where the plugin name is read from the file itself.
  */
  filename: string
  source: string
}

const FILENAME = 'Fixture_Pattern.js'

const starLine = (line: string): string => ` * ${line}\n`

// A main block holding these lines, each after ` * `, closed on a line of its own.
const block = (...lines: string[]): string =>
  `/*:\n${lines.map((line) => starLine(line)).join('')} */\n`

// The header tags read once (the first that ends in a line break) or once per line, with the
// slug each case name uses and two values.
const TAG_VALUES: readonly (readonly [tag: string, slug: string, first: string, second: string])[] =
  [
    ['author', 'author', 'Example Author', 'Other Author'],
    ['target', 'target', 'MZ', 'MV'],
    ['url', 'url', 'https://example.invalid/one', 'https://example.invalid/two'],
    ['base', 'base', 'Fixture_BaseOne', 'Fixture_BaseTwo'],
    ['orderAfter', 'order-after', 'Fixture_AfterOne', 'Fixture_AfterTwo'],
    ['orderBefore', 'order-before', 'Fixture_BeforeOne', 'Fixture_BeforeTwo'],
    ['noteParam', 'note-param', 'Fixture_NoteOne', 'Fixture_NoteTwo']
  ]

type TagShape = (tag: string, first: string, second: string) => string

// Where a tag line can start, what can follow the tag, and where its value can end.
const TAG_SHAPES: readonly (readonly [shape: string, source: TagShape])[] = [
  ['star-line', (t, a) => block(`@${t} ${a}`)],
  ['star-without-space', (t, a) => `/*:\n *@${t} ${a}\n */\n`],
  ['two-stars', (t, a) => `/*:\n ** @${t} ${a}\n */\n`],
  ['bare-line', (t, a) => `/*:\n@${t} ${a}\n*/\n`],
  ['indent-tab-upper-case', (t, a) => `/*:\n\t@${t.toUpperCase()}\t${a}\t\n */\n`],
  ['on-opener-line', (t, a) => `/*:@${t} ${a}\n */\n`],
  ['after-lone-cr', (t, a) => `/*:\n * Synthetic text\r@${t} ${a}\n */\n`],
  ['glued-to-a-word', (t, a) => block(`@${t}s ${a}`)],
  ['mid-line', (t, a) => block(`see @${t} ${a}`)],
  ['no-value', (t) => block(`@${t}`)],
  ['spaces-only', (t) => block(`@${t}   `)],
  ['last-without-newline', (t, a) => `/*:\n * @${t} ${a} */\n`],
  ['last-with-newline', (t, a) => `/*:\n * @${t} ${a}\n*/\n`],
  ['twice', (t, a, b) => block(`@${t} ${a}`, `@${t} ${b}`)],
  ['second-last-without-newline', (t, a, b) => `/*:\n * @${t} ${a}\n * @${t} ${b} */\n`],
  ['cr-in-first-value', (t, a, b) => block(`@${t} ${a}\rtail`, `@${t} ${b}`)],
  ['line-separator-in-value', (t, a) => block(`@${t} ${a}\u{2028}tail`)],
  ['line-separator-before-value', (t, a) => block(`@${t}\u{2028}${a}`)]
]

const tagCases: [string, string][] = TAG_VALUES.flatMap(([tag, slug, first, second]) =>
  TAG_SHAPES.map(([shape, source]): [string, string] => [
    `tag-${slug}-${shape}`,
    source(tag, first, second)
  ])
)

const NOTE_GROUP_CASES: [string, string][] = [
  [
    'note-param-group-tags',
    block(
      '@noteParam Fixture_NoteOne',
      '@noteType file',
      '@noteDir img/faces/',
      '@noteData actors',
      '@noteRequire 1',
      '@noteParam Fixture_NoteTwo',
      '@noteDir img/pictures/',
      '@noteData items'
    )
  ],
  [
    'note-param-require-not-one',
    block(
      '@noteParam Fixture_NoteOne',
      '@noteRequire 0',
      '@noteParam Fixture_NoteTwo',
      '@noteRequire',
      '@noteParam Fixture_NoteThree',
      '@NOTEREQUIRE\t1'
    )
  ],
  [
    'note-param-tags-before-first',
    block(
      '@noteDir img/faces/',
      '@noteParam Fixture_NoteOne',
      '@noteParam Fixture_NoteTwo',
      '@noteType animation'
    )
  ]
]

const WRAPPER_HEADER = block('@plugindesc Synthetic wrapper')

// The code after the header: a wrapper the parser unwraps, or code it keeps whole.
const WRAPPER_CODE: [string, string][] = [
  ['wrapper-arrow-semicolon', '(() => {\n  const value = 1\n  console.log(value)\n})();\n'],
  ['wrapper-function-no-semicolon', '(function () {\n  const value = 1\n})()\n'],
  ['wrapper-close-spaced', '(() => {\n  const value = 1\n} ) ( ) ;  \n\n'],
  ['wrapper-close-across-lines', '(() => {\n  const value = 1\n}\n)\n(\t)\n;\n'],
  ['wrapper-close-two-semicolons', '(() => {\n  const value = 1\n})();;\n'],
  ['wrapper-close-with-argument', '(function () {\n  const value = 1\n})(this);\n'],
  ['wrapper-code-after-close', '(() => {\n  const value = 1\n})();\nconst after = 2\n'],
  ['wrapper-close-without-open', 'const value = 1\n})();\n'],
  ['wrapper-empty-body', '(() => {})();\n'],
  ['wrapper-body-not-indented', '(() => {\nconst value = 1\n  const indented = 2\n})();\n']
]

const WRAPPER_CASES = WRAPPER_CODE.map(([name, code]): [string, string] => [
  name,
  WRAPPER_HEADER + code
])

const HELP_CASES: [string, string][] = [
  ['help-absent', block('@plugindesc Synthetic help')],
  ['help-ends-at-next-tag', block('@help', 'First line', '', 'Second line', '@param p')],
  ['help-ends-at-upper-case-tag', block('@help', 'Body', '@Text Label')],
  [
    'help-kept-past-at-without-letter',
    block('@help', 'Body', '@1 is not a tag', '@ neither', '@param p')
  ],
  ['help-kept-past-mid-line-tag', block('@help', 'See @param here', '@param p')],
  ['help-on-tag-line', block('@help Inline body', 'More', '@param p')],
  ['help-empty-before-tag', block('@help', '@param p')],
  ['help-last-in-block', '/*:\n * @help\n * Runs to the end */\n'],
  ['help-empty-last-in-block', '/*:\n * @help */\n'],
  ['help-upper-case-tag', block('@HELP', 'Body', '@param p')],
  ['help-tag-starts-a-word', block('@helper text', 'More', '@param p')],
  ['help-blank-lines-before-body', '/*:\n * @help\n\n\n * Body\n * @param p\n */\n']
]

const DESCRIPTION_CASES: [string, string][] = [
  ['description-absent', block('@target MZ')],
  ['description-one-line', block('@plugindesc Synthetic description', '@target MZ')],
  [
    'description-continued-lines',
    block('@plugindesc First part', 'second part', '  third part', '@target MZ')
  ],
  [
    'description-continued-without-star',
    '/*:\n * @plugindesc First part\n   second part\n * @target MZ\n */\n'
  ],
  [
    'description-blank-star-line',
    block('@plugindesc First part', '', 'after a blank line', '@target MZ')
  ],
  ['description-ends-at-any-at', block('@plugindesc First part', '@1 ends it', '@target MZ')],
  [
    'description-kept-past-mid-line-at',
    block('@plugindesc Mail me @ home', 'still @here', '@target MZ')
  ],
  ['description-last-in-block', '/*:\n * @plugindesc Runs to the end */\n'],
  ['description-empty', block('@plugindesc', '@target MZ')],
  ['description-tab-after-tag', block('@plugindesc\tTabbed description', '@target MZ')],
  ['description-glued-to-a-word', block('@plugindescs Not a description', '@target MZ')],
  ['description-upper-case-tag', block('@PLUGINDESC Not read', '@target MZ')],
  [
    'description-and-help-in-language-block',
    block('@plugindesc Main description', '@help', 'Main help', '@target MZ') +
      '/*:ja\n * @plugindesc Synthetic language\n * description\n * @help\n * Language help last */\n'
  ],
  ['language-block-without-main', '/*:ja\n * @plugindesc Only language\n * @param p\n */\n']
]

// Read without a file name, so the name comes from the file itself.
const SCRIPT_NAME_CASES: [string, string][] = [
  ['script-name-after-description', block('@plugindesc Synthetic_Named.js shows its name')],
  ['script-name-glued-to-tag', block('@plugindescSynthetic_Glued.js')],
  [
    'script-name-later-in-file',
    block('@plugindesc No name here', '@help', 'Synthetic_Later.js does things')
  ],
  ['script-name-last-dotted-part', block('@plugindesc Synthetic.Part.js')],
  ['script-name-after-punctuation', block('@plugindesc see(Synthetic_Paren.js)')],
  ['script-name-inside-a-longer-word', block('@plugindesc Synthetic_Word.jsx')],
  ['script-name-absent', block('@plugindesc No file name')],
  ['script-name-tag-without-star', '/*:\n@plugindesc Synthetic_NoStar.js\n*/\n'],
  ['script-name-upper-case-tag', block('@PLUGINDESC Synthetic_Upper.js')]
]

const ASSET_CASES: [string, string][] = [
  [
    'assets-each-line',
    block(
      '@requiredAssets img/pictures/Fixture_One',
      '@requiredAssets',
      '@requiredAssets img/faces/Fixture_Two'
    )
  ],
  ['assets-last-without-newline', '/*:\n * @requiredAssets img/pictures/Fixture_Last */\n'],
  [
    'assets-end-at-lone-cr',
    block('@requiredAssets img/pictures/Fixture_One\rimg/pictures/Fixture_Two')
  ],
  ['assets-trailing-star', block('@requiredAssets img/pictures/Fixture_Star *')],
  ['assets-line-separator-in-value', block('@requiredAssets img/pictures/Fixture\u{2028}Two')],
  [
    'assets-glued-and-mid-line',
    block('@requiredAssetsX img/pictures/Fixture_One', 'see @requiredAssets img/faces/Fixture')
  ],
  ['assets-upper-case-tab', block('@REQUIREDASSETS\timg/pictures/Fixture_Upper')]
]

const PARAMETER_CASES: [string, string][] = [
  [
    'param-ends-at-next-param',
    block('@param First', '@text First label', '@param Second', '@desc Second help')
  ],
  [
    'param-ends-at-command',
    block('@param Only', '@text Only label', '@command run', '@text Run label')
  ],
  ['param-ends-at-command-without-name', block('@param Only', '@command', '@text After')],
  ['param-runs-to-end', block('@param Only', '@type number', '@default 3')],
  ['param-without-name', block('@param', '@text Separator', '@param Named')],
  ['param-name-with-spaces-and-star', block('@param Two Words *', '@type boolean')],
  ['param-glued-to-a-word', block('@params NotAParam', '@param Real')],
  ['param-bare-tag-last', '/*:\n * @param First\n * @param*/\n'],
  ['param-name-ends-at-lone-cr', block('@param First\rhidden', '@text Label')],
  ['param-mid-line-tag', block('@param First', '@desc see @param Second here')],
  ['param-lines-without-star', '/*:\n@param First\n@text Label\n@param Second\n*/\n']
]

const COMMAND_CASES: [string, string][] = [
  [
    'command-ends-at-next-command',
    block('@command first', '@text First', '@command second', '@text Second')
  ],
  ['command-runs-to-end', block('@command only', '@text Only', '@desc Runs to the end')],
  ['command-name-first-word', block('@command do it now', '@text Label')],
  [
    'command-empty-line-ends-previous',
    block('@command first', '@desc First', '@command', '@text Lost', '@command second')
  ],
  ['command-glued-to-a-word', block('@commands nope', '@command real')],
  ['command-bare-tag-last', '/*:\n * @command first\n * @command*/\n'],
  [
    'command-text-before-first-arg',
    block('@command run', '@arg target', '@text Target label', '@desc Arg help')
  ],
  [
    'arg-ends-at-next-arg',
    block('@command run', '@arg first', '@type number', '@arg second', '@type boolean')
  ],
  [
    'arg-ends-at-command',
    block('@command run', '@arg only', '@text Only', '@command next', '@text Next')
  ],
  ['arg-without-name', block('@command run', '@arg', '@text Ignored', '@arg Named Arg *')],
  ['arg-name-ends-at-lone-cr', block('@command run', '@arg first\rhidden')]
]

const TAG_VALUE_CASES: [string, string][] = [
  ['param-tag-absent', block('@param p')],
  ['param-tag-empty', block('@param p', '@text', '@desc')],
  ['param-tag-first-wins', block('@param p', '@desc First help', '@desc Second help')],
  ['param-tag-glued-to-a-word', block('@param p', '@textual not a text', '@text Label')],
  ['param-tag-mid-line', block('@param p', '@desc see @text inline')],
  ['param-tag-ends-at-lone-cr', block('@param p', '@desc First\rhidden')],
  ['param-tag-keeps-line-separator', block('@param p', '@desc First\u{2028}second')],
  [
    'param-tag-trailing-star',
    block('@param p', '@type file', '@desc Help *', '@dir img/pictures/ *')
  ],
  ['param-tag-upper-case-tab', block('@param p', '@TEXT\tLabel', '@DEFAULT\tTrue')]
]

// A struct block for `Fixture_Pair` in the language after the opener's colon.
const structBlock = (lang: string, label: string): string =>
  `/*~struct~Fixture_Pair:${lang}\n * @param left\n * @text ${label}\n */\n`

const STRUCT_HEADER = block('@param pair', '@type struct<Fixture_Pair>')

// Settings the parser reads past the tag lines: a one-line parameter, an option list, struct
// blocks without a bare one, a second bare header and command code without a closing parenthesis.
const SETTINGS_CASES: [string, string][] = [
  [
    'param-one-line-settings',
    block('@param Fixture_Compact @text Compact label @type number @default 3 @min 1', '@max 9')
  ],
  [
    'param-options-with-and-without-values',
    block(
      '@param choice',
      '@type select',
      '@option First',
      '@value one',
      '@option Second',
      '@option Third',
      '@value three',
      '@default one'
    )
  ],
  [
    'struct-english-block-without-bare-block',
    STRUCT_HEADER + structBlock('ja', 'Translated label') + structBlock('en', 'English label')
  ],
  [
    'struct-first-block-without-bare-or-english',
    STRUCT_HEADER + structBlock('ja', 'First label') + structBlock('fr', 'Second label')
  ],
  [
    'language-second-bare-block-ignored',
    block('@plugindesc Main description', '@target MZ') +
      block('@plugindesc Second bare description', '@help', 'Second bare help')
  ],
  [
    'command-code-block-without-closing-parenthesis',
    WRAPPER_HEADER +
      "PluginManager.registerCommand('Fixture_Pattern', 'run', () => {\n  const value = 1\n}\n" +
      'const after = 2\n'
  ]
]

// Values no case above reads: a `false` default, an array of a type other than a struct and
// command code whose function block never closes.
const VALUE_CASES: [string, string][] = [
  ['param-default-false', block('@param flag', '@type boolean', '@default false')],
  ['param-array-of-numbers', block('@param list', '@type number[]', '@default []')],
  [
    'command-code-block-without-closing-brace',
    WRAPPER_HEADER +
      "PluginManager.registerCommand('Fixture_Pattern', 'run', () => {\n  const value = 1\n"
  ]
]

const named =
  (filename: string) =>
  ([name, source]: [string, string]): ParserPatternCase => ({ name, filename, source })

export const parserPatternCases: readonly ParserPatternCase[] = [
  ...[
    ...tagCases,
    ...NOTE_GROUP_CASES,
    ...WRAPPER_CASES,
    ...HELP_CASES,
    ...DESCRIPTION_CASES,
    ...ASSET_CASES,
    ...PARAMETER_CASES,
    ...COMMAND_CASES,
    ...TAG_VALUE_CASES,
    ...SETTINGS_CASES,
    ...VALUE_CASES
  ].map(named(FILENAME)),
  ...SCRIPT_NAME_CASES.map(named(''))
]
