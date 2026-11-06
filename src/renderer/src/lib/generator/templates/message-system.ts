/**
Message System Templates

Templates for modifying RPG Maker MZ message and text systems:
- Custom text escape codes (like \C[n], \V[n])
- Message window appearance modifications
- Choice window handling and styling
*/

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'
import { escapeJSString, isOneLineExpression } from '../escape'
import { definedOr, expectText, valueOr } from './values'

/**
Whether a value is set and, as a number, outside `min`..`max`.
*/
function isOutOfRange(value: unknown, min: number, max: number): boolean {
  return value !== undefined && (Number(value) < min || Number(value) > max)
}

/**
The replace-type text code, processed before display: the escape code is swapped for the text the
replacement expression returns.
*/
function replaceCodeLines(
  escapeChar: string,
  hasParameter: boolean,
  replacementText: unknown
): string[] {
  const matchLines = hasParameter
    ? [
        `    // Process \\${escapeChar}[n] codes`,
        String.raw`    text = text.replace(/\x1b${escapeChar}\[(\d+)\]/gi, (_, param) => {`,
        '        param = parseInt(param);',
        `        // Return the replacement text based on the parameter`
      ]
    : [
        `    // Process \\${escapeChar} codes`,
        // Negative lookahead (?![A-Za-z]) prevents \X from matching \XY, \XX, etc.
        // — MZ escape codes are case-sensitive single letters, so a longer
        // identifier should not be hijacked by a shorter prefix code.
        String.raw`    text = text.replace(/\x1b${escapeChar}(?![A-Za-z])/gi, () => {`
      ]
  return [
    '// Replaces the escape code with dynamic text during message processing',
    '',
    'const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;',
    'Window_Base.prototype.convertEscapeCharacters = function(text) {',
    '    text = _Window_Base_convertEscapeCharacters.call(this, text);',
    '',
    ...matchLines,
    `        return ${String(replacementText)};`,
    '    });',
    '',
    '    return text;'
  ]
}

/**
The effect an effect-type text code applies, with the bracket parameter or a fixed value.
*/
function effectLines(effectType: unknown, hasParameter: boolean): string[] {
  switch (effectType) {
    case 'color': {
      return [
        '        // Change text color',
        hasParameter
          ? '        this.changeTextColor(ColorManager.textColor(param));'
          : '        this.changeTextColor(ColorManager.textColor(0));'
      ]
    }
    case 'size': {
      return [
        '        // Change font size',
        hasParameter
          ? '        this.contents.fontSize = param;'
          : '        this.contents.fontSize = $gameSystem.mainFontSize();'
      ]
    }
    case 'icon': {
      return [
        '        // Draw an icon',
        hasParameter
          ? '        this.processDrawIcon(param, textState);'
          : '        this.processDrawIcon(0, textState);'
      ]
    }
    default: {
      return [
        '        // Custom effect - add your code here',
        hasParameter
          ? "        console.log('Custom code with param:', param);"
          : "        console.log('Custom code triggered');"
      ]
    }
  }
}

/**
The effect-type text code, processed during drawing.
*/
function effectCodeLines(escapeChar: string, hasParameter: boolean, effectType: unknown): string[] {
  return [
    '// Applies a visual effect during text drawing',
    '',
    'const _Window_Message_processEscapeCharacter = Window_Message.prototype.processEscapeCharacter;',
    'Window_Message.prototype.processEscapeCharacter = function(code, textState) {',
    `    if (code === '${escapeChar}') {`,
    ...(hasParameter ? ['        const param = this.obtainEscapeParam(textState);'] : []),
    ...effectLines(effectType, hasParameter),
    '    } else {',
    '        _Window_Message_processEscapeCharacter.call(this, code, textState);',
    '    }'
  ]
}

/**
Template 1: Custom Text Code
Add a new escape code for message text processing
*/
const customTextCodeTemplate: CodeTemplate = {
  id: 'message-custom-text-code',
  category: 'message-system',
  name: 'Custom Text Code',
  description: 'Add a new escape code like \\C[n] or \\V[n]',
  icon: 'MessageSquare',
  fields: [
    {
      id: 'escapeChar',
      label: 'Escape Character',
      type: 'text',
      placeholder: 'e.g., X or GOLD',
      required: true,
      help: 'The letter(s) after the backslash (e.g., X for \\X[n])'
    },
    {
      id: 'hasParameter',
      label: 'Has Parameter',
      type: 'boolean',
      default: true,
      help: 'Whether the code takes a parameter in brackets (e.g., \\X[5])'
    },
    {
      id: 'codeType',
      label: 'Code Type',
      type: 'select',
      options: [
        { value: 'replace', label: 'Replace with text - Substitutes the code with dynamic text' },
        { value: 'effect', label: 'Apply effect - Changes text appearance/behavior' }
      ],
      default: 'replace',
      required: true,
      help: 'Whether this code replaces itself with text or applies an effect'
    },
    {
      id: 'replacementText',
      label: 'Replacement Expression',
      type: 'text',
      placeholder: "e.g., $gameParty.gold() or 'Hello'",
      dependsOn: { field: 'codeType', value: 'replace' },
      help: 'JavaScript expression that returns the replacement text (use "param" for the bracket value)'
    },
    {
      id: 'effectType',
      label: 'Effect Type',
      type: 'select',
      options: [
        { value: 'color', label: 'Change text color' },
        { value: 'size', label: 'Change font size' },
        { value: 'icon', label: 'Draw an icon' },
        { value: 'custom', label: 'Custom effect code' }
      ],
      default: 'color',
      dependsOn: { field: 'codeType', value: 'effect' },
      help: 'Type of visual effect to apply'
    }
  ],
  generate: (values): string => {
    const escapeChar = expectText(values['escapeChar']).toUpperCase()
    const hasParameter = Boolean(values['hasParameter'])
    const codeType = valueOr(values['codeType'], 'replace')
    const replacementText = valueOr(values['replacementText'], "''")
    const effectType = valueOr(values['effectType'], 'color')

    return [
      `// Custom Text Code: \\${escapeChar}${hasParameter ? '[n]' : ''}`,
      ...(codeType === 'replace'
        ? replaceCodeLines(escapeChar, hasParameter, replacementText)
        : effectCodeLines(escapeChar, hasParameter, effectType)),
      '};'
    ].join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const hasEscapeChar = Boolean(values['escapeChar'])
    if (hasEscapeChar) {
      const escapeChar = expectText(values['escapeChar'])
      // Validate escape character format
      if (!/^[A-Z]+$/i.test(escapeChar)) {
        errors.push('Escape character must contain only letters (A-Z)')
      }
      // Check for reserved codes
      const reserved = ['C', 'I', 'V', 'N', 'P', 'G', 'FS', 'PX', 'PY']
      if (reserved.includes(escapeChar.toUpperCase())) {
        errors.push(
          `"${escapeChar.toUpperCase()}" is a reserved RPG Maker escape code. Choose a different character.`
        )
      }
    }

    const codeType = values['codeType']
    const replacementText = values['replacementText']
    const hasReplacementText = Boolean(replacementText)
    if (codeType === 'replace' && !hasReplacementText) {
      errors.push('Replacement expression is required for text replacement codes')
    } else if (
      codeType === 'replace' &&
      // Only text reaches here: an empty or unset value is caught above, a value of another type
      // before this check runs. Such a value passes, as the expression check passes a number.
      typeof replacementText === 'string' &&
      !isOneLineExpression(replacementText)
    ) {
      errors.push('Replacement Expression must be one expression on one line (no ";" or comments)')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
The line that moves the message window to the top, the middle or (by default) the bottom.
*/
function forcedPositionLines(positionType: unknown): string[] {
  if (positionType === 'top') {
    return ['    // Force top position', '    this.y = 0;']
  }
  if (positionType === 'middle') {
    return ['    // Force middle position', '    this.y = (Graphics.boxHeight - this.height) / 2;']
  }
  return [
    '    // Force bottom position (default)',
    '    this.y = Graphics.boxHeight - this.height;'
  ]
}

/**
The position mode: the message window at a custom position, or forced to one edge or the middle.
*/
function windowPositionLines(values: Record<string, unknown>): string[] {
  const positionType = valueOr(values['positionType'], 'top')
  const customX = valueOr(values['customX'], 0)
  const customY = valueOr(values['customY'], 0)
  const header = [
    '// Message Window Position Modification',
    '// Changes the default position of the message window',
    ''
  ]

  if (positionType === 'custom') {
    return [
      ...header,
      'const _Window_Message_updatePlacement = Window_Message.prototype.updatePlacement;',
      'Window_Message.prototype.updatePlacement = function() {',
      '    _Window_Message_updatePlacement.call(this);',
      `    this.x = ${String(customX)};`,
      `    this.y = ${String(customY)};`,
      '};'
    ]
  }
  return [
    ...header,
    'Window_Message.prototype.updatePlacement = function() {',
    '    const goldWindow = this._goldWindow;',
    '    this._positionType = $gameMessage.positionType();',
    ...forcedPositionLines(positionType),
    '    if (goldWindow) {',
    '        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;',
    '    }',
    '};'
  ]
}

/**
The size mode: the message window's width and the number of text lines its height fits.
*/
function windowSizeLines(values: Record<string, unknown>): string[] {
  const windowWidth = valueOr(values['windowWidth'], 816)
  const numberLines = valueOr(values['numLines'], 4)

  return [
    '// Message Window Size Modification',
    '// Changes the dimensions of the message window',
    '',
    '// Update the message window rect to use new dimensions',
    'const _Scene_Message_messageWindowRect = Scene_Message.prototype.messageWindowRect;',
    'Scene_Message.prototype.messageWindowRect = function() {',
    '    const rect = _Scene_Message_messageWindowRect.call(this);',
    `    rect.width = ${String(windowWidth)};`,
    `    rect.height = this.calcWindowHeight(${String(numberLines)}, false) + 8;`,
    '    rect.x = (Graphics.boxWidth - rect.width) / 2;',
    '    return rect;',
    '};'
  ]
}

/**
The message background type number a background style forces: window 0, dim 1, transparent 2.
*/
function backgroundTypeValue(bgType: unknown): number {
  if (bgType === 'window') return 0
  return bgType === 'dim' ? 1 : 2
}

/**
The background mode: a custom fill colour, or one of the message background types for every
message.
*/
function windowBackgroundLines(values: Record<string, unknown>): string[] {
  const bgType = valueOr(values['bgType'], 'dim')
  const bgColor = valueOr(values['bgColor'], 'rgba(0, 0, 0, 0.6)')
  const header = [
    '// Message Window Background Modification',
    '// Changes the visual style of the message window background',
    ''
  ]

  if (bgType === 'custom') {
    return [
      ...header,
      'const _Window_Message_updateBackground = Window_Message.prototype.updateBackground;',
      'Window_Message.prototype.updateBackground = function() {',
      '    _Window_Message_updateBackground.call(this);',
      '    // Apply custom background color',
      '    this.opacity = 0;',
      '    this.showBackgroundDimmer();',
      '    if (this._dimmerSprite) {',
      '        this._dimmerSprite.bitmap.clear();',
      `        this._dimmerSprite.bitmap.fillRect(0, 0, this._dimmerSprite.bitmap.width, this._dimmerSprite.bitmap.height, '${escapeJSString(expectText(bgColor))}');`,
      '    }',
      '};'
    ]
  }
  return [
    ...header,
    '// Override the background type for all messages',
    'const _Window_Message_setBackgroundType = Window_Message.prototype.setBackgroundType;',
    'Window_Message.prototype.setBackgroundType = function(type) {',
    `    // Force background type: ${String(bgType)}`,
    `    _Window_Message_setBackgroundType.call(this, ${backgroundTypeValue(bgType)});`,
    '};'
  ]
}

/**
The opacity mode: the message window's opacity, set when it is made and kept on every update.
*/
function windowOpacityLines(values: Record<string, unknown>): string[] {
  const opacityValue = definedOr(values['opacityValue'], 255)

  return [
    '// Message Window Opacity Modification',
    '// Changes the transparency of the message window',
    '',
    'const _Window_Message_initialize = Window_Message.prototype.initialize;',
    'Window_Message.prototype.initialize = function(rect) {',
    '    _Window_Message_initialize.call(this, rect);',
    `    this.opacity = ${String(opacityValue)};`,
    '};',
    '',
    '// Also apply during updates to maintain opacity',
    'const _Window_Message_update = Window_Message.prototype.update;',
    'Window_Message.prototype.update = function() {',
    '    _Window_Message_update.call(this);',
    `    this.opacity = ${String(opacityValue)};`,
    '};'
  ]
}

/**
The line that places the name box: centred, right, or (by default) left of the message window.
*/
function nameBoxPlacementLines(nameBoxPosition: unknown): string[] {
  if (nameBoxPosition === 'center') {
    return [
      '    // Center the name box above the message window',
      '    this.x = messageWindow.x + (messageWindow.width - this.width) / 2;'
    ]
  }
  if (nameBoxPosition === 'right') {
    return [
      '    // Position name box on the right',
      '    this.x = messageWindow.x + messageWindow.width - this.width;'
    ]
  }
  return ['    // Position name box on the left (default)', '    this.x = messageWindow.x;']
}

/**
The name box mode: where the speaker name sits relative to the message window.
*/
function windowNameBoxLines(values: Record<string, unknown>): string[] {
  const nameBoxPosition = valueOr(values['nameBoxPosition'], 'center')

  return [
    '// Name Box Position Modification',
    '// Changes where the speaker name appears relative to the message window',
    '',
    'const _Window_NameBox_updatePlacement = Window_NameBox.prototype.updatePlacement;',
    'Window_NameBox.prototype.updatePlacement = function() {',
    '    _Window_NameBox_updatePlacement.call(this);',
    '    const messageWindow = this._messageWindow;',
    '',
    ...nameBoxPlacementLines(nameBoxPosition),
    '};'
  ]
}

/**
The message window code for its modification type; an unknown type writes nothing.
*/
function windowModificationLines(values: Record<string, unknown>): string[] {
  switch (valueOr(values['modType'], 'position')) {
    case 'position': {
      return windowPositionLines(values)
    }
    case 'size': {
      return windowSizeLines(values)
    }
    case 'background': {
      return windowBackgroundLines(values)
    }
    case 'opacity': {
      return windowOpacityLines(values)
    }
    case 'nameBox': {
      return windowNameBoxLines(values)
    }
    default: {
      return []
    }
  }
}

/**
The errors for the size mode's width and visible lines, in that order.
*/
function windowSizeErrors(values: Record<string, unknown>): string[] {
  const windowWidth = values['windowWidth']
  const errors: string[] = []

  if (windowWidth !== undefined && Number(windowWidth) <= 0) {
    errors.push('Window width must be a positive number')
  }
  if (windowWidth !== undefined && Number(windowWidth) > 1920) {
    errors.push('Window width exceeds maximum screen width (1920)')
  }
  if (isOutOfRange(values['numLines'], 1, 10)) {
    errors.push('Visible lines must be between 1 and 10')
  }
  return errors
}

/**
The errors for the setting the modification type reads.
*/
function windowModificationErrors(values: Record<string, unknown>): string[] {
  const moduleType = values['modType']
  const hasBgColor = Boolean(values['bgColor'])

  if (moduleType === 'size') {
    return windowSizeErrors(values)
  }
  if (moduleType === 'opacity') {
    return isOutOfRange(values['opacityValue'], 0, 255) ? ['Opacity must be between 0 and 255'] : []
  }
  if (!hasBgColor && moduleType === 'background' && values['bgType'] === 'custom') {
    return ['Background color is required for custom background']
  }
  return []
}

/**
Template 2: Message Window Mod
Modify message window appearance (position, size, background)
*/
const messageWindowModuleTemplate: CodeTemplate = {
  id: 'message-window-mod',
  category: 'message-system',
  name: 'Message Window Mod',
  description: 'Modify message window appearance (position, size, background)',
  icon: 'MessageSquare',
  fields: [
    {
      id: 'modType',
      label: 'Modification Type',
      type: 'select',
      options: [
        { value: 'position', label: 'Window Position - Change default position' },
        { value: 'size', label: 'Window Size - Modify dimensions' },
        { value: 'background', label: 'Background Style - Custom background appearance' },
        { value: 'opacity', label: 'Opacity - Window transparency' },
        { value: 'nameBox', label: 'Name Box - Modify speaker name display' }
      ],
      default: 'position',
      required: true,
      help: 'Which aspect of the message window to modify'
    },
    {
      id: 'positionType',
      label: 'Position',
      type: 'select',
      options: [
        { value: 'top', label: 'Top of screen' },
        { value: 'middle', label: 'Middle of screen' },
        { value: 'bottom', label: 'Bottom of screen (default)' },
        { value: 'custom', label: 'Custom position' }
      ],
      default: 'top',
      dependsOn: { field: 'modType', value: 'position' },
      help: 'Where to position the message window'
    },
    {
      id: 'customX',
      label: 'X Position',
      type: 'number',
      default: 0,
      dependsOn: { field: 'positionType', value: 'custom' },
      help: 'Custom X coordinate (pixels from left)'
    },
    {
      id: 'customY',
      label: 'Y Position',
      type: 'number',
      default: 0,
      dependsOn: { field: 'positionType', value: 'custom' },
      help: 'Custom Y coordinate (pixels from top)'
    },
    {
      id: 'windowWidth',
      label: 'Window Width',
      type: 'number',
      default: 816,
      dependsOn: { field: 'modType', value: 'size' },
      help: 'Width in pixels (default 816 for MZ)'
    },
    {
      id: 'numLines',
      label: 'Visible Lines',
      type: 'number',
      default: 4,
      dependsOn: { field: 'modType', value: 'size' },
      help: 'Number of text lines to display (default 4)'
    },
    {
      id: 'bgType',
      label: 'Background Type',
      type: 'select',
      options: [
        { value: 'window', label: 'Window (default frame)' },
        { value: 'dim', label: 'Dim (darkened overlay)' },
        { value: 'transparent', label: 'Transparent (no background)' },
        { value: 'custom', label: 'Custom color' }
      ],
      default: 'dim',
      dependsOn: { field: 'modType', value: 'background' },
      help: 'Visual style of the window background'
    },
    {
      id: 'bgColor',
      label: 'Background Color',
      type: 'text',
      default: 'rgba(0, 0, 0, 0.6)',
      placeholder: 'rgba(0, 0, 0, 0.6)',
      dependsOn: { field: 'bgType', value: 'custom' },
      help: 'CSS color value for custom background'
    },
    {
      id: 'opacityValue',
      label: 'Opacity (0-255)',
      type: 'number',
      default: 255,
      dependsOn: { field: 'modType', value: 'opacity' },
      help: 'Window opacity (0 = invisible, 255 = fully opaque)'
    },
    {
      id: 'nameBoxPosition',
      label: 'Name Box Position',
      type: 'select',
      options: [
        { value: 'left', label: 'Left side (default)' },
        { value: 'center', label: 'Centered above window' },
        { value: 'right', label: 'Right side' }
      ],
      default: 'center',
      dependsOn: { field: 'modType', value: 'nameBox' },
      help: 'Position of the speaker name box'
    }
  ],
  generate: (values): string => windowModificationLines(values).join('\n'),
  validate: (values): ValidationResult => {
    const errors = windowModificationErrors(values)

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
The lines that place the choice window: centred, left, above, below or (by default) right of the
message window.
*/
function choicePlacementLines(choicePosition: unknown): string[] {
  switch (choicePosition) {
    case 'center': {
      return [
        '    // Center on screen',
        '    this.x = (Graphics.boxWidth - this.width) / 2;',
        '    this.y = (Graphics.boxHeight - this.height) / 2;'
      ]
    }
    case 'left': {
      return ['    // Left side, aligned with message', '    this.x = messageWindow.x;']
    }
    case 'above': {
      return [
        '    // Above message window',
        '    this.x = (Graphics.boxWidth - this.width) / 2;',
        '    this.y = messageWindow.y - this.height;',
        '    if (this.y < 0) this.y = 0;'
      ]
    }
    case 'below': {
      return [
        '    // Below message window',
        '    this.x = (Graphics.boxWidth - this.width) / 2;',
        '    this.y = messageWindow.y + messageWindow.height;',
        '    if (this.y + this.height > Graphics.boxHeight) {',
        '        this.y = Graphics.boxHeight - this.height;',
        '    }'
      ]
    }
    default: {
      return [
        '    // Right side (default)',
        '    this.x = messageWindow.x + messageWindow.width - this.width;'
      ]
    }
  }
}

/**
The position mode: where the choice window appears on screen.
*/
function choicePositionLines(values: Record<string, unknown>): string[] {
  const choicePosition = valueOr(values['choicePosition'], 'center')

  return [
    '// Choice Window Position Modification',
    '// Changes where the choice window appears on screen',
    '',
    'const _Window_ChoiceList_updatePlacement = Window_ChoiceList.prototype.updatePlacement;',
    'Window_ChoiceList.prototype.updatePlacement = function() {',
    '    _Window_ChoiceList_updatePlacement.call(this);',
    '    const messageWindow = this._messageWindow;',
    '',
    ...choicePlacementLines(choicePosition),
    '};'
  ]
}

/**
The column mode: the choice window's column count and width.
*/
function choiceColumnLines(values: Record<string, unknown>): string[] {
  const numberColumns = valueOr(values['numColumns'], 2)
  const choiceWidth = valueOr(values['choiceWidth'], 400)

  return [
    '// Choice Window Column Layout',
    `// Displays choices in ${String(numberColumns)} column(s)`,
    '',
    'Window_ChoiceList.prototype.maxCols = function() {',
    `    return ${String(numberColumns)};`,
    '};',
    '',
    'Window_ChoiceList.prototype.windowWidth = function() {',
    `    return ${String(choiceWidth)};`,
    '};',
    '',
    '// Adjust item width for multi-column layout',
    'Window_ChoiceList.prototype.itemWidth = function() {',
    '    return Math.floor((this.innerWidth - this.colSpacing() * (this.maxCols() - 1)) / this.maxCols());',
    '};'
  ]
}

/**
The style mode: the text colours of selected, normal and disabled choices, and the window opacity.
*/
function choiceStyleLines(values: Record<string, unknown>): string[] {
  const highlightColor = definedOr(values['highlightColor'], 17)
  const normalColor = definedOr(values['normalColor'], 0)
  const disabledColor = definedOr(values['disabledColor'], 8)
  const windowOpacity = definedOr(values['windowOpacity'], 255)

  return [
    '// Choice Window Visual Style',
    '// Customizes colors and appearance of the choice window',
    '',
    '// Custom colors for choice items',
    'Window_ChoiceList.prototype.drawItem = function(index) {',
    '    const rect = this.itemLineRect(index);',
    '    const choiceName = this.commandName(index);',
    '    const isEnabled = this.isCommandEnabled(index);',
    '    const isSelected = index === this.index();',
    '',
    '    // Determine text color based on state',
    '    if (!isEnabled) {',
    `        this.changeTextColor(ColorManager.textColor(${String(disabledColor)}));`,
    '    } else if (isSelected) {',
    `        this.changeTextColor(ColorManager.textColor(${String(highlightColor)}));`,
    '    } else {',
    `        this.changeTextColor(ColorManager.textColor(${String(normalColor)}));`,
    '    }',
    '',
    "    this.drawText(choiceName, rect.x, rect.y, rect.width, 'left');",
    '    this.resetTextColor();',
    '};',
    '',
    '// Redraw on selection change to update colors',
    'const _Window_ChoiceList_select = Window_ChoiceList.prototype.select;',
    'Window_ChoiceList.prototype.select = function(index) {',
    '    const lastIndex = this.index();',
    '    _Window_ChoiceList_select.call(this, index);',
    '    if (lastIndex !== index) {',
    '        this.refresh();',
    '    }',
    '};',
    '',
    '// Set window opacity',
    'const _Window_ChoiceList_updateBackground = Window_ChoiceList.prototype.updateBackground;',
    'Window_ChoiceList.prototype.updateBackground = function() {',
    '    _Window_ChoiceList_updateBackground.call(this);',
    `    this.opacity = ${String(windowOpacity)};`,
    '};'
  ]
}

// The cursor moves that stop at the first and last choice instead of wrapping
const NO_WRAP_LINES: readonly string[] = [
  '// Disable wrap-around selection',
  'Window_ChoiceList.prototype.cursorDown = function(wrap) {',
  '    const index = this.index();',
  '    const maxItems = this.maxItems();',
  '    const maxCols = this.maxCols();',
  '    if (index < maxItems - maxCols) {',
  '        this.smoothSelect(index + maxCols);',
  '    }',
  '};',
  '',
  'Window_ChoiceList.prototype.cursorUp = function(wrap) {',
  '    const index = this.index();',
  '    const maxCols = this.maxCols();',
  '    if (index >= maxCols) {',
  '        this.smoothSelect(index - maxCols);',
  '    }',
  '};',
  ''
]

// The choice list that reopens on the choice picked last time
const REMEMBER_CHOICE_LINES: readonly string[] = [
  '// Remember last selected choice',
  '(function() {',
  '    let _lastChoiceIndex = 0;',
  '',
  '    const _Window_ChoiceList_start = Window_ChoiceList.prototype.start;',
  '    Window_ChoiceList.prototype.start = function() {',
  '        _Window_ChoiceList_start.call(this);',
  '        // Restore last choice if valid',
  '        if (_lastChoiceIndex < this.maxItems()) {',
  '            this.select(_lastChoiceIndex);',
  '        }',
  '    };',
  '',
  '    const _Window_ChoiceList_callOkHandler = Window_ChoiceList.prototype.callOkHandler;',
  '    Window_ChoiceList.prototype.callOkHandler = function() {',
  '        _lastChoiceIndex = this.index();',
  '        _Window_ChoiceList_callOkHandler.call(this);',
  '    };',
  '})();'
]

/**
The behavior mode: selection without wrap-around, a remembered last choice, or a note that the
default wrapping needs no change.
*/
function choiceBehaviorLines(values: Record<string, unknown>): string[] {
  const isWrapAround = Boolean(values['wrapAround'])
  const isRememberChoice = Boolean(values['rememberChoice'])

  return [
    '// Choice Window Selection Behavior',
    '// Customizes how choice selection works',
    '',
    ...(isWrapAround ? [] : NO_WRAP_LINES),
    ...(isRememberChoice ? REMEMBER_CHOICE_LINES : []),
    // If neither option is selected, generate a placeholder
    ...(isWrapAround && !isRememberChoice
      ? [
          '// Default behavior - wrap-around enabled',
          '// No modifications needed for default wrapping behavior'
        ]
      : [])
  ]
}

/**
The choice window code for its modification type; an unknown type writes nothing.
*/
function choiceModificationLines(values: Record<string, unknown>): string[] {
  switch (valueOr(values['modType'], 'position')) {
    case 'position': {
      return choicePositionLines(values)
    }
    case 'columns': {
      return choiceColumnLines(values)
    }
    case 'style': {
      return choiceStyleLines(values)
    }
    case 'behavior': {
      return choiceBehaviorLines(values)
    }
    default: {
      return []
    }
  }
}

/**
The errors for the column mode's column count and width, in that order.
*/
function choiceColumnErrors(values: Record<string, unknown>): string[] {
  const choiceWidth = values['choiceWidth']
  const errors: string[] = []

  if (isOutOfRange(values['numColumns'], 1, 4)) {
    errors.push('Number of columns must be between 1 and 4')
  }
  if (choiceWidth !== undefined && Number(choiceWidth) <= 0) {
    errors.push('Choice window width must be a positive number')
  }
  return errors
}

/**
The errors for the style mode's three colour indexes and window opacity, in that order.
*/
function choiceStyleErrors(values: Record<string, unknown>): string[] {
  const errors: string[] = []

  if (isOutOfRange(values['highlightColor'], 0, 31)) {
    errors.push('Highlight color index must be between 0 and 31')
  }
  if (isOutOfRange(values['normalColor'], 0, 31)) {
    errors.push('Normal text color index must be between 0 and 31')
  }
  if (isOutOfRange(values['disabledColor'], 0, 31)) {
    errors.push('Disabled color index must be between 0 and 31')
  }
  if (isOutOfRange(values['windowOpacity'], 0, 255)) {
    errors.push('Window opacity must be between 0 and 255')
  }
  return errors
}

/**
The errors for the settings the modification type reads.
*/
function choiceModificationErrors(values: Record<string, unknown>): string[] {
  const moduleType = values['modType']

  if (moduleType === 'columns') {
    return choiceColumnErrors(values)
  }
  if (moduleType === 'style') {
    return choiceStyleErrors(values)
  }
  return []
}

/**
Template 3: Choice Handler
Custom choice window handling and styling
*/
const choiceHandlerTemplate: CodeTemplate = {
  id: 'message-choice-handler',
  category: 'message-system',
  name: 'Choice Handler',
  description: 'Custom choice window handling and styling',
  icon: 'MessageSquare',
  fields: [
    {
      id: 'modType',
      label: 'Modification Type',
      type: 'select',
      options: [
        { value: 'position', label: 'Choice Position - Where choices appear' },
        { value: 'columns', label: 'Column Layout - Multi-column choices' },
        { value: 'style', label: 'Visual Style - Colors and appearance' },
        { value: 'behavior', label: 'Selection Behavior - Input handling' }
      ],
      default: 'position',
      required: true,
      help: 'Which aspect of the choice window to modify'
    },
    {
      id: 'choicePosition',
      label: 'Choice Position',
      type: 'select',
      options: [
        { value: 'right', label: 'Right of message (default)' },
        { value: 'left', label: 'Left of message' },
        { value: 'center', label: 'Center of screen' },
        { value: 'above', label: 'Above message window' },
        { value: 'below', label: 'Below message window' }
      ],
      default: 'center',
      dependsOn: { field: 'modType', value: 'position' },
      help: 'Where to display the choice window'
    },
    {
      id: 'numColumns',
      label: 'Number of Columns',
      type: 'number',
      default: 2,
      dependsOn: { field: 'modType', value: 'columns' },
      help: 'Number of columns for choice layout (1-4)'
    },
    {
      id: 'choiceWidth',
      label: 'Choice Window Width',
      type: 'number',
      default: 400,
      dependsOn: { field: 'modType', value: 'columns' },
      help: 'Width of the choice window in pixels'
    },
    {
      id: 'highlightColor',
      label: 'Highlight Color Index',
      type: 'number',
      default: 17,
      dependsOn: { field: 'modType', value: 'style' },
      help: 'Color index (0-31) for selected choice highlight'
    },
    {
      id: 'normalColor',
      label: 'Normal Text Color Index',
      type: 'number',
      default: 0,
      dependsOn: { field: 'modType', value: 'style' },
      help: 'Color index (0-31) for unselected choices'
    },
    {
      id: 'disabledColor',
      label: 'Disabled Color Index',
      type: 'number',
      default: 8,
      dependsOn: { field: 'modType', value: 'style' },
      help: 'Color index (0-31) for disabled choices'
    },
    {
      id: 'windowOpacity',
      label: 'Window Opacity',
      type: 'number',
      default: 255,
      dependsOn: { field: 'modType', value: 'style' },
      help: 'Choice window opacity (0-255)'
    },
    {
      id: 'wrapAround',
      label: 'Wrap Around Selection',
      type: 'boolean',
      default: true,
      dependsOn: { field: 'modType', value: 'behavior' },
      help: 'Whether selection wraps from last to first choice'
    },
    {
      id: 'rememberChoice',
      label: 'Remember Last Choice',
      type: 'boolean',
      default: false,
      dependsOn: { field: 'modType', value: 'behavior' },
      help: 'Remember and restore the last selected choice index'
    }
  ],
  generate: (values): string => choiceModificationLines(values).join('\n'),
  validate: (values): ValidationResult => {
    const errors = choiceModificationErrors(values)

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register all templates when this module loads
registerTemplate(customTextCodeTemplate)
registerTemplate(messageWindowModuleTemplate)
registerTemplate(choiceHandlerTemplate)
