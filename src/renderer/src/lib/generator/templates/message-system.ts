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

    const lines: string[] = []

    if (codeType === 'replace') {
      // Text replacement escape code (processed before display)
      lines.push(`// Custom Text Code: \\${escapeChar}${hasParameter ? '[n]' : ''}`)
      lines.push('// Replaces the escape code with dynamic text during message processing')
      lines.push('')
      lines.push(
        'const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;'
      )
      lines.push('Window_Base.prototype.convertEscapeCharacters = function(text) {')
      lines.push('    text = _Window_Base_convertEscapeCharacters.call(this, text);')
      lines.push('')

      if (hasParameter) {
        lines.push(`    // Process \\${escapeChar}[n] codes`)
        lines.push(
          String.raw`    text = text.replace(/\x1b${escapeChar}\[(\d+)\]/gi, (_, param) => {`
        )
        lines.push('        param = parseInt(param);')
        lines.push(`        // Return the replacement text based on the parameter`)
      } else {
        lines.push(`    // Process \\${escapeChar} codes`)
        // Negative lookahead (?![A-Za-z]) prevents \X from matching \XY, \XX, etc.
        // — MZ escape codes are case-sensitive single letters, so a longer
        // identifier should not be hijacked by a shorter prefix code.
        lines.push(String.raw`    text = text.replace(/\x1b${escapeChar}(?![A-Za-z])/gi, () => {`)
      }
      lines.push(`        return ${String(replacementText)};`)
      lines.push('    });')

      lines.push('')
      lines.push('    return text;')
    } else {
      // Effect-type escape code (processed during drawing)
      lines.push(`// Custom Text Code: \\${escapeChar}${hasParameter ? '[n]' : ''}`)
      lines.push('// Applies a visual effect during text drawing')
      lines.push('')
      lines.push(
        'const _Window_Message_processEscapeCharacter = Window_Message.prototype.processEscapeCharacter;'
      )
      lines.push('Window_Message.prototype.processEscapeCharacter = function(code, textState) {')

      if (hasParameter) {
        lines.push(`    if (code === '${escapeChar}') {`)
        lines.push('        const param = this.obtainEscapeParam(textState);')
      } else {
        lines.push(`    if (code === '${escapeChar}') {`)
      }

      // Generate effect code based on type
      switch (effectType) {
        case 'color': {
          lines.push('        // Change text color')
          if (hasParameter) {
            lines.push('        this.changeTextColor(ColorManager.textColor(param));')
          } else {
            lines.push('        this.changeTextColor(ColorManager.textColor(0));')
          }
          break
        }
        case 'size': {
          lines.push('        // Change font size')
          if (hasParameter) {
            lines.push('        this.contents.fontSize = param;')
          } else {
            lines.push('        this.contents.fontSize = $gameSystem.mainFontSize();')
          }
          break
        }
        case 'icon': {
          lines.push('        // Draw an icon')
          if (hasParameter) {
            lines.push('        this.processDrawIcon(param, textState);')
          } else {
            lines.push('        this.processDrawIcon(0, textState);')
          }
          break
        }
        case 'custom':
        default: {
          lines.push('        // Custom effect - add your code here')
          if (hasParameter) {
            lines.push("        console.log('Custom code with param:', param);")
          } else {
            lines.push("        console.log('Custom code triggered');")
          }
          break
        }
      }

      lines.push('    } else {')
      lines.push('        _Window_Message_processEscapeCharacter.call(this, code, textState);')
      lines.push('    }')
    }
    lines.push('};')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (values['escapeChar']) {
      const escapeChar = expectText(values['escapeChar'])
      // Validate escape character format
      if (!/^[A-Za-z]+$/.test(escapeChar)) {
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
    if (codeType === 'replace' && !replacementText) {
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
  generate: (values): string => {
    const moduleType = valueOr(values['modType'], 'position')
    const lines: string[] = []

    switch (moduleType) {
      case 'position': {
        const positionType = valueOr(values['positionType'], 'top')
        const customX = valueOr(values['customX'], 0)
        const customY = valueOr(values['customY'], 0)

        lines.push('// Message Window Position Modification')
        lines.push('// Changes the default position of the message window')
        lines.push('')

        if (positionType === 'custom') {
          lines.push(
            'const _Window_Message_updatePlacement = Window_Message.prototype.updatePlacement;'
          )
          lines.push('Window_Message.prototype.updatePlacement = function() {')
          lines.push('    _Window_Message_updatePlacement.call(this);')
          lines.push(`    this.x = ${String(customX)};`)
          lines.push(`    this.y = ${String(customY)};`)
        } else {
          lines.push('Window_Message.prototype.updatePlacement = function() {')
          lines.push('    const goldWindow = this._goldWindow;')
          lines.push('    this._positionType = $gameMessage.positionType();')

          if (positionType === 'top') {
            lines.push('    // Force top position')
            lines.push('    this.y = 0;')
          } else if (positionType === 'middle') {
            lines.push('    // Force middle position')
            lines.push('    this.y = (Graphics.boxHeight - this.height) / 2;')
          } else {
            lines.push('    // Force bottom position (default)')
            lines.push('    this.y = Graphics.boxHeight - this.height;')
          }

          lines.push('    if (goldWindow) {')
          lines.push(
            '        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;'
          )
          lines.push('    }')
        }
        lines.push('};')
        break
      }

      case 'size': {
        const windowWidth = valueOr(values['windowWidth'], 816)
        const numberLines = valueOr(values['numLines'], 4)

        lines.push('// Message Window Size Modification')
        lines.push('// Changes the dimensions of the message window')
        lines.push('')
        lines.push('// Update the message window rect to use new dimensions')
        lines.push(
          'const _Scene_Message_messageWindowRect = Scene_Message.prototype.messageWindowRect;'
        )
        lines.push('Scene_Message.prototype.messageWindowRect = function() {')
        lines.push('    const rect = _Scene_Message_messageWindowRect.call(this);')
        lines.push(`    rect.width = ${String(windowWidth)};`)
        lines.push(`    rect.height = this.calcWindowHeight(${String(numberLines)}, false) + 8;`)
        lines.push('    rect.x = (Graphics.boxWidth - rect.width) / 2;')
        lines.push('    return rect;')
        lines.push('};')
        break
      }

      case 'background': {
        const bgType = valueOr(values['bgType'], 'dim')
        const bgColor = valueOr(values['bgColor'], 'rgba(0, 0, 0, 0.6)')

        lines.push('// Message Window Background Modification')
        lines.push('// Changes the visual style of the message window background')
        lines.push('')

        if (bgType === 'custom') {
          lines.push(
            'const _Window_Message_updateBackground = Window_Message.prototype.updateBackground;'
          )
          lines.push('Window_Message.prototype.updateBackground = function() {')
          lines.push('    _Window_Message_updateBackground.call(this);')
          lines.push('    // Apply custom background color')
          lines.push('    this.opacity = 0;')
          lines.push('    this.showBackgroundDimmer();')
          lines.push('    if (this._dimmerSprite) {')
          lines.push('        this._dimmerSprite.bitmap.clear();')
          lines.push(
            `        this._dimmerSprite.bitmap.fillRect(0, 0, this._dimmerSprite.bitmap.width, this._dimmerSprite.bitmap.height, '${escapeJSString(expectText(bgColor))}');`
          )
          lines.push('    }')
        } else {
          const bgValue = bgType === 'window' ? 0 : bgType === 'dim' ? 1 : 2
          lines.push('// Override the background type for all messages')
          lines.push(
            'const _Window_Message_setBackgroundType = Window_Message.prototype.setBackgroundType;'
          )
          lines.push('Window_Message.prototype.setBackgroundType = function(type) {')
          lines.push(`    // Force background type: ${String(bgType)}`)
          lines.push(`    _Window_Message_setBackgroundType.call(this, ${bgValue});`)
        }
        lines.push('};')
        break
      }

      case 'opacity': {
        const opacityValue = definedOr(values['opacityValue'], 255)

        lines.push('// Message Window Opacity Modification')
        lines.push('// Changes the transparency of the message window')
        lines.push('')
        lines.push('const _Window_Message_initialize = Window_Message.prototype.initialize;')
        lines.push('Window_Message.prototype.initialize = function(rect) {')
        lines.push('    _Window_Message_initialize.call(this, rect);')
        lines.push(`    this.opacity = ${String(opacityValue)};`)
        lines.push('};')
        lines.push('')
        lines.push('// Also apply during updates to maintain opacity')
        lines.push('const _Window_Message_update = Window_Message.prototype.update;')
        lines.push('Window_Message.prototype.update = function() {')
        lines.push('    _Window_Message_update.call(this);')
        lines.push(`    this.opacity = ${String(opacityValue)};`)
        lines.push('};')
        break
      }

      case 'nameBox': {
        const nameBoxPosition = valueOr(values['nameBoxPosition'], 'center')

        lines.push('// Name Box Position Modification')
        lines.push('// Changes where the speaker name appears relative to the message window')
        lines.push('')
        lines.push(
          'const _Window_NameBox_updatePlacement = Window_NameBox.prototype.updatePlacement;'
        )
        lines.push('Window_NameBox.prototype.updatePlacement = function() {')
        lines.push('    _Window_NameBox_updatePlacement.call(this);')
        lines.push('    const messageWindow = this._messageWindow;')
        lines.push('')

        if (nameBoxPosition === 'center') {
          lines.push('    // Center the name box above the message window')
          lines.push('    this.x = messageWindow.x + (messageWindow.width - this.width) / 2;')
        } else if (nameBoxPosition === 'right') {
          lines.push('    // Position name box on the right')
          lines.push('    this.x = messageWindow.x + messageWindow.width - this.width;')
        } else {
          lines.push('    // Position name box on the left (default)')
          lines.push('    this.x = messageWindow.x;')
        }

        lines.push('};')
        break
      }
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const moduleType = values['modType']

    if (moduleType === 'size') {
      const windowWidth = values['windowWidth']
      const numberLines = values['numLines']

      if (windowWidth !== undefined && Number(windowWidth) <= 0) {
        errors.push('Window width must be a positive number')
      }
      if (windowWidth !== undefined && Number(windowWidth) > 1920) {
        errors.push('Window width exceeds maximum screen width (1920)')
      }
      if (numberLines !== undefined && (Number(numberLines) < 1 || Number(numberLines) > 10)) {
        errors.push('Visible lines must be between 1 and 10')
      }
    }

    if (moduleType === 'opacity') {
      const opacityValue = values['opacityValue']
      if (opacityValue !== undefined && (Number(opacityValue) < 0 || Number(opacityValue) > 255)) {
        errors.push('Opacity must be between 0 and 255')
      }
    }

    if (moduleType === 'background' && values['bgType'] === 'custom' && !values['bgColor']) {
      errors.push('Background color is required for custom background')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
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
  generate: (values): string => {
    const moduleType = valueOr(values['modType'], 'position')
    const lines: string[] = []

    switch (moduleType) {
      case 'position': {
        const choicePosition = valueOr(values['choicePosition'], 'center')

        lines.push('// Choice Window Position Modification')
        lines.push('// Changes where the choice window appears on screen')
        lines.push('')
        lines.push(
          'const _Window_ChoiceList_updatePlacement = Window_ChoiceList.prototype.updatePlacement;'
        )
        lines.push('Window_ChoiceList.prototype.updatePlacement = function() {')
        lines.push('    _Window_ChoiceList_updatePlacement.call(this);')
        lines.push('    const messageWindow = this._messageWindow;')
        lines.push('')

        switch (choicePosition) {
          case 'center': {
            lines.push('    // Center on screen')
            lines.push('    this.x = (Graphics.boxWidth - this.width) / 2;')
            lines.push('    this.y = (Graphics.boxHeight - this.height) / 2;')
            break
          }
          case 'left': {
            lines.push('    // Left side, aligned with message')
            lines.push('    this.x = messageWindow.x;')
            break
          }
          case 'above': {
            lines.push('    // Above message window')
            lines.push('    this.x = (Graphics.boxWidth - this.width) / 2;')
            lines.push('    this.y = messageWindow.y - this.height;')
            lines.push('    if (this.y < 0) this.y = 0;')
            break
          }
          case 'below': {
            lines.push('    // Below message window')
            lines.push('    this.x = (Graphics.boxWidth - this.width) / 2;')
            lines.push('    this.y = messageWindow.y + messageWindow.height;')
            lines.push('    if (this.y + this.height > Graphics.boxHeight) {')
            lines.push('        this.y = Graphics.boxHeight - this.height;')
            lines.push('    }')
            break
          }
          default: {
            lines.push('    // Right side (default)')
            lines.push('    this.x = messageWindow.x + messageWindow.width - this.width;')
          }
        }

        lines.push('};')
        break
      }

      case 'columns': {
        const numberColumns = valueOr(values['numColumns'], 2)
        const choiceWidth = valueOr(values['choiceWidth'], 400)

        lines.push('// Choice Window Column Layout')
        lines.push(`// Displays choices in ${String(numberColumns)} column(s)`)
        lines.push('')
        lines.push('Window_ChoiceList.prototype.maxCols = function() {')
        lines.push(`    return ${String(numberColumns)};`)
        lines.push('};')
        lines.push('')
        lines.push('Window_ChoiceList.prototype.windowWidth = function() {')
        lines.push(`    return ${String(choiceWidth)};`)
        lines.push('};')
        lines.push('')
        lines.push('// Adjust item width for multi-column layout')
        lines.push('Window_ChoiceList.prototype.itemWidth = function() {')
        lines.push(
          '    return Math.floor((this.innerWidth - this.colSpacing() * (this.maxCols() - 1)) / this.maxCols());'
        )
        lines.push('};')
        break
      }

      case 'style': {
        const highlightColor = definedOr(values['highlightColor'], 17)
        const normalColor = definedOr(values['normalColor'], 0)
        const disabledColor = definedOr(values['disabledColor'], 8)
        const windowOpacity = definedOr(values['windowOpacity'], 255)

        lines.push('// Choice Window Visual Style')
        lines.push('// Customizes colors and appearance of the choice window')
        lines.push('')
        lines.push('// Custom colors for choice items')
        lines.push('Window_ChoiceList.prototype.drawItem = function(index) {')
        lines.push('    const rect = this.itemLineRect(index);')
        lines.push('    const choiceName = this.commandName(index);')
        lines.push('    const isEnabled = this.isCommandEnabled(index);')
        lines.push('    const isSelected = index === this.index();')
        lines.push('')
        lines.push('    // Determine text color based on state')
        lines.push('    if (!isEnabled) {')
        lines.push(
          `        this.changeTextColor(ColorManager.textColor(${String(disabledColor)}));`
        )
        lines.push('    } else if (isSelected) {')
        lines.push(
          `        this.changeTextColor(ColorManager.textColor(${String(highlightColor)}));`
        )
        lines.push('    } else {')
        lines.push(`        this.changeTextColor(ColorManager.textColor(${String(normalColor)}));`)
        lines.push('    }')
        lines.push('')
        lines.push("    this.drawText(choiceName, rect.x, rect.y, rect.width, 'left');")
        lines.push('    this.resetTextColor();')
        lines.push('};')
        lines.push('')
        lines.push('// Redraw on selection change to update colors')
        lines.push('const _Window_ChoiceList_select = Window_ChoiceList.prototype.select;')
        lines.push('Window_ChoiceList.prototype.select = function(index) {')
        lines.push('    const lastIndex = this.index();')
        lines.push('    _Window_ChoiceList_select.call(this, index);')
        lines.push('    if (lastIndex !== index) {')
        lines.push('        this.refresh();')
        lines.push('    }')
        lines.push('};')
        lines.push('')
        lines.push('// Set window opacity')
        lines.push(
          'const _Window_ChoiceList_updateBackground = Window_ChoiceList.prototype.updateBackground;'
        )
        lines.push('Window_ChoiceList.prototype.updateBackground = function() {')
        lines.push('    _Window_ChoiceList_updateBackground.call(this);')
        lines.push(`    this.opacity = ${String(windowOpacity)};`)
        lines.push('};')
        break
      }

      case 'behavior': {
        const isWrapAround = Boolean(values['wrapAround'])
        const isRememberChoice = Boolean(values['rememberChoice'])

        lines.push('// Choice Window Selection Behavior')
        lines.push('// Customizes how choice selection works')
        lines.push('')

        if (!isWrapAround) {
          lines.push('// Disable wrap-around selection')
          lines.push('Window_ChoiceList.prototype.cursorDown = function(wrap) {')
          lines.push('    const index = this.index();')
          lines.push('    const maxItems = this.maxItems();')
          lines.push('    const maxCols = this.maxCols();')
          lines.push('    if (index < maxItems - maxCols) {')
          lines.push('        this.smoothSelect(index + maxCols);')
          lines.push('    }')
          lines.push('};')
          lines.push('')
          lines.push('Window_ChoiceList.prototype.cursorUp = function(wrap) {')
          lines.push('    const index = this.index();')
          lines.push('    const maxCols = this.maxCols();')
          lines.push('    if (index >= maxCols) {')
          lines.push('        this.smoothSelect(index - maxCols);')
          lines.push('    }')
          lines.push('};')
          lines.push('')
        }

        if (isRememberChoice) {
          lines.push('// Remember last selected choice')
          lines.push('(function() {')
          lines.push('    let _lastChoiceIndex = 0;')
          lines.push('')
          lines.push('    const _Window_ChoiceList_start = Window_ChoiceList.prototype.start;')
          lines.push('    Window_ChoiceList.prototype.start = function() {')
          lines.push('        _Window_ChoiceList_start.call(this);')
          lines.push('        // Restore last choice if valid')
          lines.push('        if (_lastChoiceIndex < this.maxItems()) {')
          lines.push('            this.select(_lastChoiceIndex);')
          lines.push('        }')
          lines.push('    };')
          lines.push('')
          lines.push(
            '    const _Window_ChoiceList_callOkHandler = Window_ChoiceList.prototype.callOkHandler;'
          )
          lines.push('    Window_ChoiceList.prototype.callOkHandler = function() {')
          lines.push('        _lastChoiceIndex = this.index();')
          lines.push('        _Window_ChoiceList_callOkHandler.call(this);')
          lines.push('    };')
          lines.push('})();')
        }

        // If neither option is selected, generate a placeholder
        if (isWrapAround && !isRememberChoice) {
          lines.push('// Default behavior - wrap-around enabled')
          lines.push('// No modifications needed for default wrapping behavior')
        }

        break
      }
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const moduleType = values['modType']

    if (moduleType === 'columns') {
      const numberColumns = values['numColumns']
      const choiceWidth = values['choiceWidth']

      if (numberColumns !== undefined && (Number(numberColumns) < 1 || Number(numberColumns) > 4)) {
        errors.push('Number of columns must be between 1 and 4')
      }
      if (choiceWidth !== undefined && Number(choiceWidth) <= 0) {
        errors.push('Choice window width must be a positive number')
      }
    }

    if (moduleType === 'style') {
      const highlightColor = values['highlightColor']
      const normalColor = values['normalColor']
      const disabledColor = values['disabledColor']
      const windowOpacity = values['windowOpacity']

      if (
        highlightColor !== undefined &&
        (Number(highlightColor) < 0 || Number(highlightColor) > 31)
      ) {
        errors.push('Highlight color index must be between 0 and 31')
      }
      if (normalColor !== undefined && (Number(normalColor) < 0 || Number(normalColor) > 31)) {
        errors.push('Normal text color index must be between 0 and 31')
      }
      if (
        disabledColor !== undefined &&
        (Number(disabledColor) < 0 || Number(disabledColor) > 31)
      ) {
        errors.push('Disabled color index must be between 0 and 31')
      }
      if (
        windowOpacity !== undefined &&
        (Number(windowOpacity) < 0 || Number(windowOpacity) > 255)
      ) {
        errors.push('Window opacity must be between 0 and 255')
      }
    }

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

export {
  customTextCodeTemplate,
  messageWindowModuleTemplate as messageWindowModTemplate,
  choiceHandlerTemplate
}
