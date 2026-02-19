/**
 * Message System Templates
 *
 * Templates for modifying RPG Maker MZ message and text systems:
 * - Custom text escape codes (like \C[n], \V[n])
 * - Message window appearance modifications
 * - Choice window handling and styling
 */

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'

/**
 * Template 1: Custom Text Code
 * Add a new escape code for message text processing
 */
const customTextCodeTemplate: CodeTemplate = {
  id: 'message-custom-text-code',
  category: 'message-system',
  name: 'Custom Text Code',
  description: 'Add a new escape code like \\C[n] or \\V[n]',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Window_Message.html',
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
    const escapeChar = (values.escapeChar as string).toUpperCase()
    const hasParameter = values.hasParameter as boolean
    const codeType = (values.codeType as string) || 'replace'
    const replacementText = (values.replacementText as string) || "''"
    const effectType = (values.effectType as string) || 'color'

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
        lines.push(`    text = text.replace(/\\\\${escapeChar}\\[(\\d+)\\]/gi, (_, param) => {`)
        lines.push('        param = parseInt(param);')
        lines.push(`        // Return the replacement text based on the parameter`)
        lines.push(`        return ${replacementText};`)
        lines.push('    });')
      } else {
        lines.push(`    // Process \\${escapeChar} codes`)
        lines.push(`    text = text.replace(/\\\\${escapeChar}/gi, () => {`)
        lines.push(`        return ${replacementText};`)
        lines.push('    });')
      }

      lines.push('')
      lines.push('    return text;')
      lines.push('};')
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
        case 'color':
          lines.push('        // Change text color')
          if (hasParameter) {
            lines.push('        this.changeTextColor(ColorManager.textColor(param));')
          } else {
            lines.push('        this.changeTextColor(ColorManager.textColor(0));')
          }
          break
        case 'size':
          lines.push('        // Change font size')
          if (hasParameter) {
            lines.push('        this.contents.fontSize = param;')
          } else {
            lines.push('        this.contents.fontSize = $gameSystem.mainFontSize();')
          }
          break
        case 'icon':
          lines.push('        // Draw an icon')
          if (hasParameter) {
            lines.push('        this.processDrawIcon(param, textState);')
          } else {
            lines.push('        this.processDrawIcon(0, textState);')
          }
          break
        case 'custom':
        default:
          lines.push('        // Custom effect - add your code here')
          if (hasParameter) {
            lines.push("        console.log('Custom code with param:', param);")
          } else {
            lines.push("        console.log('Custom code triggered');")
          }
          break
      }

      lines.push('    } else {')
      lines.push('        _Window_Message_processEscapeCharacter.call(this, code, textState);')
      lines.push('    }')
      lines.push('};')
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.escapeChar) {
      errors.push('Escape character is required')
    } else {
      const escapeChar = values.escapeChar as string
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

    const codeType = values.codeType as string
    if (codeType === 'replace' && !values.replacementText) {
      errors.push('Replacement expression is required for text replacement codes')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 2: Message Window Mod
 * Modify message window appearance (position, size, background)
 */
const messageWindowModTemplate: CodeTemplate = {
  id: 'message-window-mod',
  category: 'message-system',
  name: 'Message Window Mod',
  description: 'Modify message window appearance (position, size, background)',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Window_Message.html',
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
      id: 'windowHeight',
      label: 'Window Height',
      type: 'number',
      default: 180,
      dependsOn: { field: 'modType', value: 'size' },
      help: 'Height in pixels (default ~180)'
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
    const modType = (values.modType as string) || 'position'
    const lines: string[] = []

    switch (modType) {
      case 'position': {
        const positionType = (values.positionType as string) || 'top'
        const customX = (values.customX as number) || 0
        const customY = (values.customY as number) || 0

        lines.push('// Message Window Position Modification')
        lines.push('// Changes the default position of the message window')
        lines.push('')

        if (positionType === 'custom') {
          lines.push(
            'const _Window_Message_updatePlacement = Window_Message.prototype.updatePlacement;'
          )
          lines.push('Window_Message.prototype.updatePlacement = function() {')
          lines.push('    _Window_Message_updatePlacement.call(this);')
          lines.push(`    this.x = ${customX};`)
          lines.push(`    this.y = ${customY};`)
          lines.push('};')
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
          lines.push('};')
        }
        break
      }

      case 'size': {
        const windowWidth = (values.windowWidth as number) || 816
        const numLines = (values.numLines as number) || 4

        lines.push('// Message Window Size Modification')
        lines.push('// Changes the dimensions of the message window')
        lines.push('')
        lines.push('Window_Message.prototype.windowWidth = function() {')
        lines.push(`    return ${windowWidth};`)
        lines.push('};')
        lines.push('')
        lines.push('Window_Message.prototype.numVisibleRows = function() {')
        lines.push(`    return ${numLines};`)
        lines.push('};')
        lines.push('')
        lines.push('// Update the message window rect to use new dimensions')
        lines.push(
          'const _Scene_Message_messageWindowRect = Scene_Message.prototype.messageWindowRect;'
        )
        lines.push('Scene_Message.prototype.messageWindowRect = function() {')
        lines.push('    const rect = _Scene_Message_messageWindowRect.call(this);')
        lines.push(`    rect.width = ${windowWidth};`)
        lines.push('    rect.x = (Graphics.boxWidth - rect.width) / 2;')
        lines.push('    return rect;')
        lines.push('};')
        break
      }

      case 'background': {
        const bgType = (values.bgType as string) || 'dim'
        const bgColor = (values.bgColor as string) || 'rgba(0, 0, 0, 0.6)'

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
          lines.push('    if (this._dimmerSprite) {')
          lines.push('        this._dimmerSprite.bitmap.clear();')
          lines.push(
            `        this._dimmerSprite.bitmap.fillRect(0, 0, this.width, this.height, '${bgColor}');`
          )
          lines.push('    }')
          lines.push('};')
        } else {
          const bgValue = bgType === 'window' ? 0 : bgType === 'dim' ? 1 : 2
          lines.push('// Override the background type for all messages')
          lines.push(
            'const _Window_Message_setBackgroundType = Window_Message.prototype.setBackgroundType;'
          )
          lines.push('Window_Message.prototype.setBackgroundType = function(type) {')
          lines.push(`    // Force background type: ${bgType}`)
          lines.push(`    _Window_Message_setBackgroundType.call(this, ${bgValue});`)
          lines.push('};')
        }
        break
      }

      case 'opacity': {
        const opacityValue = (values.opacityValue as number) ?? 255

        lines.push('// Message Window Opacity Modification')
        lines.push('// Changes the transparency of the message window')
        lines.push('')
        lines.push('const _Window_Message_initialize = Window_Message.prototype.initialize;')
        lines.push('Window_Message.prototype.initialize = function(rect) {')
        lines.push('    _Window_Message_initialize.call(this, rect);')
        lines.push(`    this.opacity = ${opacityValue};`)
        lines.push('};')
        lines.push('')
        lines.push('// Also apply during updates to maintain opacity')
        lines.push('const _Window_Message_update = Window_Message.prototype.update;')
        lines.push('Window_Message.prototype.update = function() {')
        lines.push('    _Window_Message_update.call(this);')
        lines.push(`    this.opacity = ${opacityValue};`)
        lines.push('};')
        break
      }

      case 'nameBox': {
        const nameBoxPosition = (values.nameBoxPosition as string) || 'center'

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
    const modType = values.modType as string

    if (modType === 'size') {
      const windowWidth = values.windowWidth as number
      const numLines = values.numLines as number

      if (windowWidth !== undefined && windowWidth <= 0) {
        errors.push('Window width must be a positive number')
      }
      if (windowWidth !== undefined && windowWidth > 1920) {
        errors.push('Window width exceeds maximum screen width (1920)')
      }
      if (numLines !== undefined && (numLines < 1 || numLines > 10)) {
        errors.push('Visible lines must be between 1 and 10')
      }
    }

    if (modType === 'opacity') {
      const opacityValue = values.opacityValue as number
      if (opacityValue !== undefined && (opacityValue < 0 || opacityValue > 255)) {
        errors.push('Opacity must be between 0 and 255')
      }
    }

    if (modType === 'background' && values.bgType === 'custom') {
      if (!values.bgColor) {
        errors.push('Background color is required for custom background')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 3: Choice Handler
 * Custom choice window handling and styling
 */
const choiceHandlerTemplate: CodeTemplate = {
  id: 'message-choice-handler',
  category: 'message-system',
  name: 'Choice Handler',
  description: 'Custom choice window handling and styling',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Window_ChoiceList.html',
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
    const modType = (values.modType as string) || 'position'
    const lines: string[] = []

    switch (modType) {
      case 'position': {
        const choicePosition = (values.choicePosition as string) || 'center'

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
          case 'center':
            lines.push('    // Center on screen')
            lines.push('    this.x = (Graphics.boxWidth - this.width) / 2;')
            lines.push('    this.y = (Graphics.boxHeight - this.height) / 2;')
            break
          case 'left':
            lines.push('    // Left side, aligned with message')
            lines.push('    this.x = messageWindow.x;')
            break
          case 'above':
            lines.push('    // Above message window')
            lines.push('    this.x = (Graphics.boxWidth - this.width) / 2;')
            lines.push('    this.y = messageWindow.y - this.height;')
            lines.push('    if (this.y < 0) this.y = 0;')
            break
          case 'below':
            lines.push('    // Below message window')
            lines.push('    this.x = (Graphics.boxWidth - this.width) / 2;')
            lines.push('    this.y = messageWindow.y + messageWindow.height;')
            lines.push('    if (this.y + this.height > Graphics.boxHeight) {')
            lines.push('        this.y = Graphics.boxHeight - this.height;')
            lines.push('    }')
            break
          default:
            lines.push('    // Right side (default)')
            lines.push('    this.x = messageWindow.x + messageWindow.width - this.width;')
        }

        lines.push('};')
        break
      }

      case 'columns': {
        const numColumns = (values.numColumns as number) || 2
        const choiceWidth = (values.choiceWidth as number) || 400

        lines.push('// Choice Window Column Layout')
        lines.push(`// Displays choices in ${numColumns} column(s)`)
        lines.push('')
        lines.push('Window_ChoiceList.prototype.maxCols = function() {')
        lines.push(`    return ${numColumns};`)
        lines.push('};')
        lines.push('')
        lines.push('Window_ChoiceList.prototype.windowWidth = function() {')
        lines.push(`    return ${choiceWidth};`)
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
        const highlightColor = (values.highlightColor as number) ?? 17
        const normalColor = (values.normalColor as number) ?? 0
        const disabledColor = (values.disabledColor as number) ?? 8
        const windowOpacity = (values.windowOpacity as number) ?? 255

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
        lines.push(`        this.changeTextColor(ColorManager.textColor(${disabledColor}));`)
        lines.push('    } else if (isSelected) {')
        lines.push(`        this.changeTextColor(ColorManager.textColor(${highlightColor}));`)
        lines.push('    } else {')
        lines.push(`        this.changeTextColor(ColorManager.textColor(${normalColor}));`)
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
        lines.push('const _Window_ChoiceList_initialize = Window_ChoiceList.prototype.initialize;')
        lines.push('Window_ChoiceList.prototype.initialize = function() {')
        lines.push('    _Window_ChoiceList_initialize.apply(this, arguments);')
        lines.push(`    this.opacity = ${windowOpacity};`)
        lines.push('};')
        break
      }

      case 'behavior': {
        const wrapAround = values.wrapAround as boolean
        const rememberChoice = values.rememberChoice as boolean

        lines.push('// Choice Window Selection Behavior')
        lines.push('// Customizes how choice selection works')
        lines.push('')

        if (!wrapAround) {
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

        if (rememberChoice) {
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
        if (wrapAround && !rememberChoice) {
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
    const modType = values.modType as string

    if (modType === 'columns') {
      const numColumns = values.numColumns as number
      const choiceWidth = values.choiceWidth as number

      if (numColumns !== undefined && (numColumns < 1 || numColumns > 4)) {
        errors.push('Number of columns must be between 1 and 4')
      }
      if (choiceWidth !== undefined && choiceWidth <= 0) {
        errors.push('Choice window width must be a positive number')
      }
    }

    if (modType === 'style') {
      const highlightColor = values.highlightColor as number
      const normalColor = values.normalColor as number
      const disabledColor = values.disabledColor as number
      const windowOpacity = values.windowOpacity as number

      if (highlightColor !== undefined && (highlightColor < 0 || highlightColor > 31)) {
        errors.push('Highlight color index must be between 0 and 31')
      }
      if (normalColor !== undefined && (normalColor < 0 || normalColor > 31)) {
        errors.push('Normal text color index must be between 0 and 31')
      }
      if (disabledColor !== undefined && (disabledColor < 0 || disabledColor > 31)) {
        errors.push('Disabled color index must be between 0 and 31')
      }
      if (windowOpacity !== undefined && (windowOpacity < 0 || windowOpacity > 255)) {
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
registerTemplate(messageWindowModTemplate)
registerTemplate(choiceHandlerTemplate)

export { customTextCodeTemplate, messageWindowModTemplate, choiceHandlerTemplate }
