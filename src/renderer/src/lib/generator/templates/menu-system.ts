/**
Menu System Templates

Templates for RPG Maker MZ menu and scene customization:
- Custom menu scenes (Scene_MenuBase subclass)
- Title screen modifications
- Menu command additions
- Options menu additions
*/

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'
import { escapeJSDoubleQuote, escapeLineComment } from '../escape'
import { expectText } from './values'

/**
Helper to convert a name to a valid JavaScript identifier
*/
function toValidIdentifier(name: string): string {
  // Remove special characters and replace spaces with nothing
  return name.replaceAll(/\W/g, '').replace(/^\d/, '_$&')
}

/**
The parent class of the custom scene's window for its window type.
*/
function menuWindowParentOf(windowType: unknown): string {
  switch (windowType) {
    case 'command': {
      return 'Window_Command'
    }
    case 'base': {
      return 'Window_Base'
    }
    default: {
      return 'Window_Selectable'
    }
  }
}

/**
The custom scene's window class: header, initialize, and the methods of its window type.
*/
function menuWindowClassLines(
  sceneClass: string,
  windowClass: string,
  windowParent: string,
  windowType: unknown
): string[] {
  const lines: string[] = [
    // Header comment
    `// Custom Menu Scene: ${sceneClass}`,
    `// A custom scene with ${windowClass} based on ${windowParent}`,
    '',
    // Window class definition
    '//-----------------------------------------------------------------------------',
    `// ${windowClass}`,
    '//',
    `// The window for displaying custom content in ${sceneClass}.`,
    '',
    `function ${windowClass}() {`,
    '    this.initialize(...arguments);',
    '}',
    '',
    `${windowClass}.prototype = Object.create(${windowParent}.prototype);`,
    `${windowClass}.prototype.constructor = ${windowClass};`,
    '',
    `${windowClass}.prototype.initialize = function(rect) {`,
    `    ${windowParent}.prototype.initialize.call(this, rect);`
  ]

  if (windowType === 'base') {
    lines.push('    this.refresh();')
  } else if (windowType === 'selectable') {
    lines.push('    this.refresh();')
    lines.push('    this.select(0);')
    lines.push('    this.activate();')
  }

  lines.push('};')
  lines.push('')

  // Add type-specific methods
  if (windowType === 'command') {
    lines.push(`${windowClass}.prototype.makeCommandList = function() {`)
    lines.push('    // Add your commands here')
    lines.push("    this.addCommand('Command 1', 'command1');")
    lines.push("    this.addCommand('Command 2', 'command2');")
    lines.push("    this.addCommand('Cancel', 'cancel');")
  } else if (windowType === 'selectable') {
    lines.push(`${windowClass}.prototype.maxItems = function() {`)
    lines.push('    // Return the number of items in your list')
    lines.push('    return 10;')
    lines.push('};')
    lines.push('')
    lines.push(`${windowClass}.prototype.drawItem = function(index) {`)
    lines.push('    const rect = this.itemLineRect(index);')
    lines.push("    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);")
  } else {
    // Base window
    lines.push(`${windowClass}.prototype.refresh = function() {`)
    lines.push('    this.contents.clear();')
    lines.push('    // Draw your content here')
    lines.push("    this.drawText('Custom Window Content', 0, 0, this.innerWidth, 'center');")
  }
  lines.push('};')
  lines.push('')
  return lines
}

/**
The custom scene's methods that create its window, place it, and handle its commands.
*/
function menuSceneWindowLines(
  sceneClass: string,
  windowClass: string,
  windowName: string,
  windowType: unknown,
  isIncludeHelp: boolean
): string[] {
  // Window creation methods
  const lines = [
    `${sceneClass}.prototype.create${windowName}Window = function() {`,
    `    const rect = this.${windowName.toLowerCase()}WindowRect();`,
    `    this._${windowName.toLowerCase()}Window = new ${windowClass}(rect);`
  ]

  if (windowType === 'command') {
    lines.push(
      `    this._${windowName.toLowerCase()}Window.setHandler('command1', this.onCommand1.bind(this));`
    )
    lines.push(
      `    this._${windowName.toLowerCase()}Window.setHandler('command2', this.onCommand2.bind(this));`
    )
    lines.push(
      `    this._${windowName.toLowerCase()}Window.setHandler('cancel', this.popScene.bind(this));`
    )
  } else if (windowType === 'selectable') {
    lines.push(
      `    this._${windowName.toLowerCase()}Window.setHandler('ok', this.onItemOk.bind(this));`
    )
    lines.push(
      `    this._${windowName.toLowerCase()}Window.setHandler('cancel', this.popScene.bind(this));`
    )
  }

  if (isIncludeHelp && windowType !== 'base') {
    lines.push(`    this._${windowName.toLowerCase()}Window.setHelpWindow(this._helpWindow);`)
  }

  lines.push(`    this.addWindow(this._${windowName.toLowerCase()}Window);`)
  lines.push('};')
  lines.push('')

  // Window rect method
  lines.push(`${sceneClass}.prototype.${windowName.toLowerCase()}WindowRect = function() {`)

  lines.push('    const wx = 0;')
  lines.push('    const wy = this.mainAreaTop();')
  lines.push('    const ww = Graphics.boxWidth;')
  lines.push(
    isIncludeHelp
      ? '    const wh = this.mainAreaHeight();'
      : '    const wh = Graphics.boxHeight - wy;'
  )

  lines.push('    return new Rectangle(wx, wy, ww, wh);')
  lines.push('};')
  lines.push('')

  // Handler methods
  if (windowType === 'command') {
    lines.push(`${sceneClass}.prototype.onCommand1 = function() {`)
    lines.push('    // Handle Command 1')
    lines.push("    console.log('Command 1 selected');")
    lines.push(`    this._${windowName.toLowerCase()}Window.activate();`)
    lines.push('};')
    lines.push('')
    lines.push(`${sceneClass}.prototype.onCommand2 = function() {`)
    lines.push('    // Handle Command 2')
    lines.push("    console.log('Command 2 selected');")
    lines.push(`    this._${windowName.toLowerCase()}Window.activate();`)
    lines.push('};')
  } else if (windowType === 'selectable') {
    lines.push(`${sceneClass}.prototype.onItemOk = function() {`)
    lines.push(`    const index = this._${windowName.toLowerCase()}Window.index();`)
    lines.push('    // Handle item selection')
    lines.push("    console.log('Selected item at index:', index);")
    lines.push(`    this._${windowName.toLowerCase()}Window.activate();`)
    lines.push('};')
  }
  return lines
}

/**
Template 1: Custom Menu Scene
Create a new Scene_MenuBase subclass with custom windows
*/
const customMenuSceneTemplate: CodeTemplate = {
  id: 'menu-custom-scene',
  category: 'menu-system',
  name: 'Custom Menu Scene',
  description: 'Create a new Scene_MenuBase subclass with custom windows',
  icon: 'Menu',
  fields: [
    {
      id: 'sceneName',
      label: 'Scene Name',
      type: 'text',
      placeholder: 'e.g., MyCustomMenu',
      required: true,
      help: 'Name for your custom scene class (will be prefixed with Scene_)'
    },
    {
      id: 'windowName',
      label: 'Main Window Name',
      type: 'text',
      placeholder: 'e.g., CustomInfo',
      required: true,
      help: 'Name for the main window in your scene (will be prefixed with Window_)'
    },
    {
      id: 'windowType',
      label: 'Window Type',
      type: 'select',
      options: [
        { value: 'selectable', label: 'Selectable Window (with cursor)' },
        { value: 'base', label: 'Base Window (text display only)' },
        { value: 'command', label: 'Command Window (menu options)' }
      ],
      default: 'selectable',
      required: true,
      help: 'The type of window to create'
    },
    {
      id: 'includeHelp',
      label: 'Include Help Window',
      type: 'boolean',
      default: false,
      help: 'Add a help window at the top of the scene'
    },
    {
      id: 'includeGold',
      label: 'Include Gold Window',
      type: 'boolean',
      default: false,
      help: 'Add a gold display window'
    }
  ],
  generate: (values): string => {
    const sceneName = toValidIdentifier(expectText(values['sceneName']))
    const windowName = toValidIdentifier(expectText(values['windowName']))
    const hasWindowType = Boolean(values['windowType'])
    const windowType = hasWindowType ? values['windowType'] : 'selectable'
    const isIncludeHelp = Boolean(values['includeHelp'])
    const isIncludeGold = Boolean(values['includeGold'])

    const sceneClass = `Scene_${sceneName}`
    const windowClass = `Window_${windowName}`

    // Determine window parent class
    const windowParent = menuWindowParentOf(windowType)
    const lines = menuWindowClassLines(sceneClass, windowClass, windowParent, windowType)

    // Scene class definition
    lines.push('//-----------------------------------------------------------------------------')
    lines.push(`// ${sceneClass}`)
    lines.push('//')
    lines.push('// A custom menu scene.')
    lines.push('')
    lines.push(`function ${sceneClass}() {`)
    lines.push('    this.initialize(...arguments);')
    lines.push('}')
    lines.push('')
    lines.push(`${sceneClass}.prototype = Object.create(Scene_MenuBase.prototype);`)
    lines.push(`${sceneClass}.prototype.constructor = ${sceneClass};`)
    lines.push('')
    lines.push(`${sceneClass}.prototype.initialize = function() {`)
    lines.push('    Scene_MenuBase.prototype.initialize.call(this);')
    lines.push('};')
    lines.push('')

    // Create method
    lines.push(`${sceneClass}.prototype.create = function() {`)
    lines.push('    Scene_MenuBase.prototype.create.call(this);')

    if (isIncludeHelp) {
      lines.push('    this.createHelpWindow();')
    }

    lines.push(`    this.create${windowName}Window();`)

    if (isIncludeGold) {
      lines.push('    this.createGoldWindow();')
    }

    lines.push('};')
    lines.push('')

    lines.push(
      ...menuSceneWindowLines(sceneClass, windowClass, windowName, windowType, isIncludeHelp)
    )

    lines.push('')
    lines.push(`// To open this scene, use: SceneManager.push(${sceneClass});`)

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const sceneName = values['sceneName']
    const hasSceneName = Boolean(sceneName)
    if (hasSceneName) {
      const text = String(sceneName)
      if (!/^[a-z_]\w*$/i.test(text)) {
        errors.push(
          'Scene name must be a valid JavaScript identifier (letters, numbers, underscores, cannot start with a number)'
        )
      }
    }

    const windowName = values['windowName']
    const hasWindowName = Boolean(windowName)
    if (hasWindowName) {
      const text = String(windowName)
      if (!/^[a-z_]\w*$/i.test(text)) {
        errors.push('Window name must be a valid JavaScript identifier')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
A title screen command of the player's own: the command, its handler, and the method it calls.
*/
function titleAddCommandLines(commandNameValue: unknown, commandSymbolValue: unknown): string[] {
  const hasCommandName = Boolean(commandNameValue)
  const commandName = hasCommandName ? commandNameValue : 'Custom'
  const hasCommandSymbol = Boolean(commandSymbolValue)
  const commandSymbol = hasCommandSymbol ? commandSymbolValue : 'custom'

  return [
    `// Title Screen Mod: Add "${escapeLineComment(expectText(commandName))}" Command`,
    '',
    '// Add command to title command window',
    'const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;',
    'Window_TitleCommand.prototype.makeCommandList = function() {',
    '    _Window_TitleCommand_makeCommandList.call(this);',
    `    this.addCommand("${escapeJSDoubleQuote(expectText(commandName))}", "${escapeJSDoubleQuote(expectText(commandSymbol))}");`,
    '};',
    '',
    '// Create handler for the new command',
    'const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;',
    'Scene_Title.prototype.createCommandWindow = function() {',
    '    _Scene_Title_createCommandWindow.call(this);',
    `    this._commandWindow.setHandler("${escapeJSDoubleQuote(expectText(commandSymbol))}", this.command${toValidIdentifier(expectText(commandSymbol))}.bind(this));`,
    '};',
    '',
    `Scene_Title.prototype.command${toValidIdentifier(expectText(commandSymbol))} = function() {`,
    `    // Your code here when "${escapeJSDoubleQuote(expectText(commandName))}" is selected`,
    `    console.log("${escapeJSDoubleQuote(expectText(commandName))} command selected");`,
    '    this._commandWindow.activate();',
    ' '.repeat(4),
    '    // Example: Push a custom scene',
    '    // SceneManager.push(Scene_Custom);',
    '};'
  ]
}

/**
A title screen background hook with an example sprite layer.
*/
function titleBackgroundLines(): string[] {
  return [
    '// Title Screen Mod: Custom Background Handler',
    '',
    'const _Scene_Title_createBackground = Scene_Title.prototype.createBackground;',
    'Scene_Title.prototype.createBackground = function() {',
    '    _Scene_Title_createBackground.call(this);',
    ' '.repeat(4),
    '    // Add custom background elements here',
    '    // Example: Create an additional sprite layer',
    '    // this._customSprite = new Sprite();',
    "    // this._customSprite.bitmap = ImageManager.loadTitle1('CustomBackground');",
    '    // this.addChild(this._customSprite);',
    '};',
    '',
    '// Optionally animate or update the background',
    'const _Scene_Title_update = Scene_Title.prototype.update;',
    'Scene_Title.prototype.update = function() {',
    '    _Scene_Title_update.call(this);',
    ' '.repeat(4),
    '    // Update custom background elements',
    '    // if (this._customSprite) {',
    '    //     this._customSprite.opacity = 128 + Math.sin(Graphics.frameCount / 30) * 127;',
    '    // }',
    '};'
  ]
}

/**
A title screen with one of its default commands hidden.
*/
function titleHideCommandLines(hideTargetValue: unknown): string[] {
  const hasHideTarget = Boolean(hideTargetValue)
  const hideTarget = hasHideTarget ? hideTargetValue : 'options'

  let methodName: string
  let description: string
  switch (hideTarget) {
    case 'newGame': {
      methodName = 'isNewGameVisible'
      description = 'New Game'
      break
    }
    case 'continue': {
      methodName = 'isContinueVisible'
      description = 'Continue'
      break
    }
    default: {
      methodName = 'isOptionsVisible'
      description = 'Options'
    }
  }

  const lines = [`// Title Screen Mod: Hide "${description}" Command`, '']

  if (hideTarget === 'options') {
    // Options doesn't have a visibility check by default, need different approach
    lines.push(
      'const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;'
    )
    lines.push('Window_TitleCommand.prototype.makeCommandList = function() {')
    lines.push('    // Manually add commands, skipping Options')
    lines.push("    this.addCommand(TextManager.newGame, 'newGame');")
    lines.push("    this.addCommand(TextManager.continue_, 'continue', this.isContinueEnabled());")
    lines.push('    // Options command removed')
  } else {
    lines.push(`// Override visibility check for ${description}`)
    lines.push(`Window_TitleCommand.prototype.${methodName} = function() {`)
    lines.push('    return false;')
  }
  lines.push('};')
  return lines
}

/**
A title screen create hook with an example version text.
*/
function titleCreateHookLines(): string[] {
  return [
    '// Title Screen Mod: Custom Create Hook',
    '',
    'const _Scene_Title_create = Scene_Title.prototype.create;',
    'Scene_Title.prototype.create = function() {',
    '    _Scene_Title_create.call(this);',
    ' '.repeat(4),
    '    // Add custom elements after scene creation',
    '    this.createCustomElements();',
    '};',
    '',
    'Scene_Title.prototype.createCustomElements = function() {',
    '    // Create custom UI elements here',
    ' '.repeat(4),
    '    // Example: Create a version text sprite',
    '    this._versionSprite = new Sprite();',
    '    this._versionSprite.bitmap = new Bitmap(200, 30);',
    "    this._versionSprite.bitmap.drawText('v1.0.0', 0, 0, 200, 30, 'right');",
    '    this._versionSprite.x = Graphics.width - 210;',
    '    this._versionSprite.y = Graphics.height - 40;',
    '    this.addChild(this._versionSprite);',
    '};'
  ]
}

/**
Template 2: Title Screen Mod
Add commands or modify the title screen
*/
const titleScreenModuleTemplate: CodeTemplate = {
  id: 'menu-title-mod',
  category: 'menu-system',
  name: 'Title Screen Mod',
  description: 'Add commands or modify the title screen',
  icon: 'Menu',
  fields: [
    {
      id: 'modType',
      label: 'Modification Type',
      type: 'select',
      options: [
        { value: 'addCommand', label: 'Add New Command' },
        { value: 'replaceBackground', label: 'Custom Background Handler' },
        { value: 'hideCommand', label: 'Hide a Default Command' },
        { value: 'customCreate', label: 'Custom Create Hook' }
      ],
      default: 'addCommand',
      required: true,
      help: 'What modification to make to the title screen'
    },
    {
      id: 'commandName',
      label: 'Command Name',
      type: 'text',
      placeholder: 'e.g., Credits',
      dependsOn: { field: 'modType', value: 'addCommand' },
      help: 'Display name for the new command'
    },
    {
      id: 'commandSymbol',
      label: 'Command Symbol',
      type: 'text',
      placeholder: 'e.g., credits',
      dependsOn: { field: 'modType', value: 'addCommand' },
      help: 'Internal symbol for the command handler'
    },
    {
      id: 'hideTarget',
      label: 'Command to Hide',
      type: 'select',
      options: [
        { value: 'newGame', label: 'New Game' },
        { value: 'continue', label: 'Continue' },
        { value: 'options', label: 'Options' }
      ],
      dependsOn: { field: 'modType', value: 'hideCommand' },
      help: 'Which default command to hide'
    }
  ],
  generate: (values): string => {
    const hasChosenType = Boolean(values['modType'])
    const moduleType = hasChosenType ? values['modType'] : 'addCommand'

    switch (moduleType) {
      case 'addCommand': {
        return titleAddCommandLines(values['commandName'], values['commandSymbol']).join('\n')
      }
      case 'replaceBackground': {
        return titleBackgroundLines().join('\n')
      }
      case 'hideCommand': {
        return titleHideCommandLines(values['hideTarget']).join('\n')
      }
      case 'customCreate': {
        return titleCreateHookLines().join('\n')
      }
      default: {
        return ''
      }
    }
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const moduleType = values['modType']

    if (moduleType === 'addCommand') {
      const hasCommandName = Boolean(values['commandName'])
      if (!hasCommandName) {
        errors.push('Command name is required')
      }
      const commandSymbol = values['commandSymbol']
      const hasCommandSymbol = Boolean(commandSymbol)
      if (hasCommandSymbol) {
        const symbol = String(commandSymbol)
        if (!/^[a-z_]\w*$/i.test(symbol)) {
          errors.push('Command symbol must be a valid JavaScript identifier')
        }
      } else {
        errors.push('Command symbol is required')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
The symbol of the main menu command the new command goes next to, for its insert position;
empty at the end of the menu.
*/
function menuInsertSymbolOf(insertPosition: unknown): string {
  switch (insertPosition) {
    case 'afterItem': {
      return 'item'
    }
    case 'afterSkill': {
      return 'skill'
    }
    case 'afterEquip': {
      return 'equip'
    }
    case 'afterStatus': {
      return 'status'
    }
    case 'beforeOptions': {
      return 'options'
    }
    case 'beforeSave': {
      return 'save'
    }
    case 'beforeGameEnd': {
      return 'gameEnd'
    }
    default: {
      return ''
    }
  }
}

/**
The body of the new command's enable check for its enable condition.
*/
function menuEnableLines(enableCondition: unknown, switchId: unknown): string[] {
  switch (enableCondition) {
    case 'switch': {
      return [`    return $gameSwitches.value(${String(switchId)});`]
    }
    case 'custom': {
      return ['    // Add your custom condition here', '    return true;']
    }
    default: {
      return ['    return true;']
    }
  }
}

/**
The main menu's handler for the new command, and the actor selection handlers when it needs an
actor.
*/
function menuCommandHandlerLines(
  symbolId: string,
  commandName: unknown,
  requiresActor: boolean
): string[] {
  // Command handler
  const lines = [`Scene_Menu.prototype.command${symbolId} = function() {`]

  if (requiresActor) {
    lines.push('    // This command requires actor selection')
    lines.push('    this._statusWindow.setFormationMode(false);')
    lines.push('    this._statusWindow.selectLast();')
    lines.push('    this._statusWindow.activate();')
    lines.push('    this._statusWindow.setHandler("ok", this.on' + symbolId + 'Ok.bind(this));')
    lines.push(
      '    this._statusWindow.setHandler("cancel", this.on' + symbolId + 'Cancel.bind(this));'
    )
  } else {
    lines.push(
      `    // Your code here when "${escapeJSDoubleQuote(expectText(commandName))}" is selected`
    )
    lines.push(
      `    console.log("${escapeJSDoubleQuote(expectText(commandName))} command selected");`
    )
    lines.push(' '.repeat(4))
    lines.push('    // Example: Push a custom scene')
    lines.push(`    // SceneManager.push(Scene_${symbolId});`)
    lines.push('    this._commandWindow.activate();')
  }

  lines.push('};')

  if (requiresActor) {
    lines.push('')
    lines.push(`Scene_Menu.prototype.on${symbolId}Ok = function() {`)
    lines.push('    const actor = $gameParty.members()[this._statusWindow.index()];')
    lines.push(`    // Your code here with the selected actor`)
    lines.push(
      `    console.log("${escapeJSDoubleQuote(expectText(commandName))} - selected actor:", actor.name());`
    )
    lines.push(' '.repeat(4))
    lines.push('    // Example: Push scene with actor data')
    lines.push(`    // SceneManager.push(Scene_${symbolId});`)
    lines.push('    this._statusWindow.activate();')
    lines.push('};')
    lines.push('')
    lines.push(`Scene_Menu.prototype.on${symbolId}Cancel = function() {`)
    lines.push('    this._statusWindow.deselect();')
    lines.push('    this._commandWindow.activate();')
    lines.push('};')
  }
  return lines
}

/**
Template 3: Menu Command Addition
Add new commands to the main menu (Scene_Menu)
*/
const menuCommandAdditionTemplate: CodeTemplate = {
  id: 'menu-command-addition',
  category: 'menu-system',
  name: 'Menu Command Addition',
  description: 'Add new commands to the main menu (Scene_Menu)',
  icon: 'Menu',
  fields: [
    {
      id: 'commandName',
      label: 'Command Name',
      type: 'text',
      placeholder: 'e.g., Achievements',
      required: true,
      help: 'Display name for the menu command'
    },
    {
      id: 'commandSymbol',
      label: 'Command Symbol',
      type: 'text',
      placeholder: 'e.g., achievements',
      required: true,
      help: 'Internal symbol for handler binding'
    },
    {
      id: 'insertPosition',
      label: 'Insert Position',
      type: 'select',
      options: [
        { value: 'afterItem', label: 'After Item' },
        { value: 'afterSkill', label: 'After Skill' },
        { value: 'afterEquip', label: 'After Equip' },
        { value: 'afterStatus', label: 'After Status' },
        { value: 'beforeOptions', label: 'Before Options' },
        { value: 'beforeSave', label: 'Before Save' },
        { value: 'beforeGameEnd', label: 'Before Game End' },
        { value: 'end', label: 'At End (after all commands)' }
      ],
      default: 'beforeOptions',
      help: 'Where to insert the new command in the menu'
    },
    {
      id: 'requiresActor',
      label: 'Requires Actor Selection',
      type: 'boolean',
      default: false,
      help: 'If true, player selects an actor after choosing this command'
    },
    {
      id: 'enableCondition',
      label: 'Enable Condition',
      type: 'select',
      options: [
        { value: 'always', label: 'Always enabled' },
        { value: 'switch', label: 'Enabled by game switch' },
        { value: 'custom', label: 'Custom condition' }
      ],
      default: 'always',
      help: 'When the command should be enabled'
    },
    {
      id: 'switchId',
      label: 'Switch ID',
      type: 'number',
      placeholder: 'e.g., 1',
      dependsOn: { field: 'enableCondition', value: 'switch' },
      help: 'Game switch that enables this command'
    }
  ],
  generate: (values): string => {
    const commandName = values['commandName']
    const commandSymbol = values['commandSymbol']
    const hasInsertPosition = Boolean(values['insertPosition'])
    const insertPosition = hasInsertPosition ? values['insertPosition'] : 'beforeOptions'
    const requiresActor = Boolean(values['requiresActor'])
    const hasEnableCondition = Boolean(values['enableCondition'])
    const enableCondition = hasEnableCondition ? values['enableCondition'] : 'always'
    const hasSwitchId = Boolean(values['switchId'])
    const switchId = hasSwitchId ? values['switchId'] : 1

    const symbolId = toValidIdentifier(expectText(commandSymbol))
    const lines = [`// Menu Command Addition: ${escapeLineComment(expectText(commandName))}`, '']

    // Determine insertion logic
    const insertCode = menuInsertSymbolOf(insertPosition)

    // Add command to menu
    lines.push('// Add command to main menu')
    lines.push(
      'const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;'
    )
    lines.push('Window_MenuCommand.prototype.addOriginalCommands = function() {')
    lines.push('    _Window_MenuCommand_addOriginalCommands.call(this);')
    lines.push(
      `    this.addCommand("${escapeJSDoubleQuote(expectText(commandName))}", "${escapeJSDoubleQuote(expectText(commandSymbol))}", this.is${symbolId}Enabled());`
    )
    lines.push('};')
    lines.push('')

    // Enable check method
    lines.push(`// Enable condition for ${escapeLineComment(expectText(commandName))}`)
    lines.push(`Window_MenuCommand.prototype.is${symbolId}Enabled = function() {`)

    lines.push(...menuEnableLines(enableCondition, switchId))

    lines.push('};')
    lines.push('')

    // If we need to control insertion position precisely, we override makeCommandList
    if (insertCode && expectText(insertPosition).startsWith('before')) {
      lines.push('// Override makeCommandList to control command position')
      lines.push(
        'const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;'
      )
      lines.push('Window_MenuCommand.prototype.makeCommandList = function() {')
      lines.push('    _Window_MenuCommand_makeCommandList.call(this);')
      lines.push(' '.repeat(4))
      lines.push(`    // Find index of "${escapeJSDoubleQuote(insertCode)}" and insert before it`)
      lines.push(
        `    const index = this._list.findIndex(cmd => cmd.symbol === "${escapeJSDoubleQuote(insertCode)}");`
      )
      lines.push('    if (index >= 0) {')
      lines.push(`        const cmd = this._list.pop(); // Remove the command we just added`)
      lines.push('        this._list.splice(index, 0, cmd); // Insert at correct position')
      lines.push('    }')
      lines.push('};')
      lines.push('')
    }

    // Create handler in Scene_Menu
    lines.push('// Create handler for the command')
    lines.push('const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;')
    lines.push('Scene_Menu.prototype.createCommandWindow = function() {')
    lines.push('    _Scene_Menu_createCommandWindow.call(this);')
    lines.push(
      `    this._commandWindow.setHandler("${escapeJSDoubleQuote(expectText(commandSymbol))}", this.command${symbolId}.bind(this));`
    )
    lines.push('};')
    lines.push('')

    lines.push(...menuCommandHandlerLines(symbolId, commandName, requiresActor))

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const commandSymbol = values['commandSymbol']
    const hasCommandSymbol = Boolean(commandSymbol)
    if (hasCommandSymbol) {
      const symbol = String(commandSymbol)
      if (!/^[a-z_]\w*$/i.test(symbol)) {
        errors.push('Command symbol must be a valid JavaScript identifier')
      }
    }

    const enableCondition = values['enableCondition']
    if (enableCondition === 'switch') {
      const switchId = values['switchId']
      const hasSwitchId = Boolean(switchId)
      if (!hasSwitchId || Number(switchId) < 1) {
        errors.push('Switch ID must be a positive number')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
The option's default value as code for its type.
*/
function optionDefaultCodeOf(
  optionType: unknown,
  defaultValue: unknown,
  hasDefaultValue: boolean
): string {
  switch (optionType) {
    case 'boolean': {
      return defaultValue === 'false' ? 'false' : 'true'
    }
    case 'volume': {
      return hasDefaultValue ? String(defaultValue) : '100'
    }
    case 'select': {
      return hasDefaultValue ? String(defaultValue) : '0'
    }
    default: {
      return 'true'
    }
  }
}

/**
The line of `ConfigManager.applyData` that loads the option, for its type.
*/
function optionApplyLines(
  optionType: unknown,
  optionSymbol: string,
  optionSymbolValue: unknown,
  defaultCode: string
): string[] {
  switch (optionType) {
    case 'boolean': {
      return [
        `    this.${optionSymbol} = this.readFlag(config, "${escapeJSDoubleQuote(expectText(optionSymbolValue))}", ${defaultCode});`
      ]
    }
    case 'volume': {
      return [
        `    this.${optionSymbol} = this.readVolume(config, "${escapeJSDoubleQuote(expectText(optionSymbolValue))}");`
      ]
    }
    case 'select': {
      return [
        `    this.${optionSymbol} = config.${optionSymbol} !== undefined ? config.${optionSymbol} : ${defaultCode};`
      ]
    }
    default: {
      return []
    }
  }
}

/**
A choice written as a double-quoted string literal.
*/
function quotedChoice(choice: string): string {
  return `"${escapeJSDoubleQuote(choice)}"`
}

/**
The window methods that show and step through a select option's choices.
*/
function optionSelectLines(
  optionSymbol: string,
  optionSymbolValue: unknown,
  choices: unknown,
  hasChoices: boolean
): string[] {
  const choiceList = hasChoices
    ? expectText(choices)
        .split(',')
        .map((c) => c.trim())
    : ['Option 1', 'Option 2', 'Option 3']
  const choicesCode = choiceList.map((choice) => quotedChoice(choice)).join(', ')

  return [
    '// Status text for select option',
    'const _Window_Options_statusText = Window_Options.prototype.statusText;',
    'Window_Options.prototype.statusText = function(index) {',
    '    const symbol = this.commandSymbol(index);',
    `    if (symbol === "${escapeJSDoubleQuote(expectText(optionSymbolValue))}") {`,
    `        const choices = [${choicesCode}];`,
    `        return choices[this.getConfigValue(symbol)] || choices[0];`,
    '    }',
    '    return _Window_Options_statusText.call(this, index);',
    '};',
    '',
    '// Process select option changes',
    'const _Window_Options_processOk = Window_Options.prototype.processOk;',
    'Window_Options.prototype.processOk = function() {',
    '    const symbol = this.commandSymbol(this.index());',
    `    if (symbol === "${escapeJSDoubleQuote(expectText(optionSymbolValue))}") {`,
    `        const choices = [${choicesCode}];`,
    '        let value = this.getConfigValue(symbol);',
    '        value = (value + 1) % choices.length;',
    '        this.changeValue(symbol, value);',
    '        return;',
    '    }',
    '    _Window_Options_processOk.call(this);',
    '};',
    '',
    '// Handle cursor right/left for select option',
    'const _Window_Options_cursorRight = Window_Options.prototype.cursorRight;',
    'Window_Options.prototype.cursorRight = function() {',
    '    const symbol = this.commandSymbol(this.index());',
    `    if (symbol === "${escapeJSDoubleQuote(expectText(optionSymbolValue))}") {`,
    `        const choices = [${choicesCode}];`,
    '        let value = this.getConfigValue(symbol);',
    '        value = Math.min(value + 1, choices.length - 1);',
    '        this.changeValue(symbol, value);',
    '        return;',
    '    }',
    '    _Window_Options_cursorRight.call(this);',
    '};',
    '',
    'const _Window_Options_cursorLeft = Window_Options.prototype.cursorLeft;',
    'Window_Options.prototype.cursorLeft = function() {',
    '    const symbol = this.commandSymbol(this.index());',
    `    if (symbol === "${escapeJSDoubleQuote(expectText(optionSymbolValue))}") {`,
    '        let value = this.getConfigValue(symbol);',
    '        value = Math.max(value - 1, 0);',
    '        this.changeValue(symbol, value);',
    '        return;',
    '    }',
    '    _Window_Options_cursorLeft.call(this);',
    '};',
    '',
    `// Access the value with: ConfigManager.${optionSymbol} (index 0-${choiceList.length - 1})`,
    `// Choices: ${escapeLineComment(choiceList.join(', '))}`
  ]
}

/**
The code an option of each type adds after its command: notes, the volume marker, or the
choice handling of a select option.
*/
function optionTypeLines(
  optionType: unknown,
  optionSymbol: string,
  optionSymbolValue: unknown,
  choices: unknown,
  hasChoices: boolean
): string[] {
  switch (optionType) {
    case 'boolean': {
      return [
        '// Boolean type uses default behavior - no additional code needed',
        `// Access the value with: ConfigManager.${optionSymbol}`
      ]
    }
    case 'volume': {
      return [
        '// Volume type uses default behavior - no additional code needed',
        `// Access the value with: ConfigManager.${optionSymbol} (0-100)`,
        '',
        '// Mark as volume type',
        'const _Window_Options_isVolumeSymbol = Window_Options.prototype.isVolumeSymbol;',
        'Window_Options.prototype.isVolumeSymbol = function(symbol) {',
        `    if (symbol === "${escapeJSDoubleQuote(expectText(optionSymbolValue))}") return true;`,
        '    return _Window_Options_isVolumeSymbol.call(this, symbol);',
        '};'
      ]
    }
    case 'select': {
      return optionSelectLines(optionSymbol, optionSymbolValue, choices, hasChoices)
    }
    default: {
      return []
    }
  }
}

/**
Template 4: Options Menu Addition
Add custom options to the options menu
*/
const optionsMenuAdditionTemplate: CodeTemplate = {
  id: 'menu-options-addition',
  category: 'menu-system',
  name: 'Options Menu Addition',
  description: 'Add custom options to the options menu',
  icon: 'Menu',
  fields: [
    {
      id: 'optionName',
      label: 'Option Name',
      type: 'text',
      placeholder: 'e.g., Difficulty',
      required: true,
      help: 'Display name for the option'
    },
    {
      id: 'optionSymbol',
      label: 'Option Symbol',
      type: 'text',
      placeholder: 'e.g., difficulty',
      required: true,
      help: 'Internal symbol for the option'
    },
    {
      id: 'optionType',
      label: 'Option Type',
      type: 'select',
      options: [
        { value: 'boolean', label: 'Toggle (ON/OFF)' },
        { value: 'volume', label: 'Volume slider (0-100)' },
        { value: 'select', label: 'Select from choices' }
      ],
      default: 'boolean',
      required: true,
      help: 'The type of option control'
    },
    {
      id: 'defaultValue',
      label: 'Default Value',
      type: 'text',
      placeholder: 'e.g., true, 100, or 0',
      help: 'Default value when game starts'
    },
    {
      id: 'choices',
      label: 'Choices (comma-separated)',
      type: 'text',
      placeholder: 'e.g., Easy,Normal,Hard',
      dependsOn: { field: 'optionType', value: 'select' },
      help: 'List of choices for select-type options'
    },
    {
      id: 'persistToConfig',
      label: 'Save to Config',
      type: 'boolean',
      default: true,
      help: 'Save this option to config file (persists between sessions)'
    }
  ],
  generate: (values): string => {
    const optionName = values['optionName']
    const optionSymbolValue = values['optionSymbol']
    // The symbol as written into code; the escapes below take the value itself
    const optionSymbol = String(optionSymbolValue)
    const hasOptionType = Boolean(values['optionType'])
    const optionType = hasOptionType ? values['optionType'] : 'boolean'
    const defaultValue = values['defaultValue']
    const hasDefaultValue = Boolean(defaultValue)
    const choices = values['choices']
    const hasChoices = Boolean(choices)
    const isPersistToConfig = values['persistToConfig'] !== false

    const lines = [`// Options Menu Addition: ${escapeLineComment(expectText(optionName))}`, '']

    // Determine default value
    const defaultCode = optionDefaultCodeOf(optionType, defaultValue, hasDefaultValue)

    // Add ConfigManager property
    lines.push('// Add to ConfigManager')
    lines.push(`ConfigManager.${optionSymbol} = ${defaultCode};`)
    lines.push('')

    if (isPersistToConfig) {
      // makeData - save
      lines.push('// Save option to config')
      lines.push('const _ConfigManager_makeData = ConfigManager.makeData;')
      lines.push('ConfigManager.makeData = function() {')
      lines.push('    const config = _ConfigManager_makeData.call(this);')
      lines.push(`    config.${optionSymbol} = this.${optionSymbol};`)
      lines.push('    return config;')
      lines.push('};')
      lines.push('')

      // applyData - load
      lines.push('// Load option from config')
      lines.push('const _ConfigManager_applyData = ConfigManager.applyData;')
      lines.push('ConfigManager.applyData = function(config) {')
      lines.push('    _ConfigManager_applyData.call(this, config);')

      lines.push(...optionApplyLines(optionType, optionSymbol, optionSymbolValue, defaultCode))

      lines.push('};')
      lines.push('')
    }

    // Add command to options window
    lines.push('// Add option to options window')
    lines.push(
      'const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;'
    )
    lines.push('Window_Options.prototype.addGeneralOptions = function() {')
    lines.push('    _Window_Options_addGeneralOptions.call(this);')
    lines.push(
      `    this.addCommand("${escapeJSDoubleQuote(expectText(optionName))}", "${escapeJSDoubleQuote(expectText(optionSymbolValue))}");`
    )
    lines.push('};')
    lines.push('')

    // Type-specific methods
    lines.push(...optionTypeLines(optionType, optionSymbol, optionSymbolValue, choices, hasChoices))

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const optionSymbol = values['optionSymbol']
    const hasOptionSymbol = Boolean(optionSymbol)
    if (hasOptionSymbol) {
      const symbol = String(optionSymbol)
      if (!/^[a-z_]\w*$/i.test(symbol)) {
        errors.push('Option symbol must be a valid JavaScript identifier')
      }
    }

    const optionType = values['optionType']
    const hasChoices = Boolean(values['choices'])
    if (optionType === 'select' && !hasChoices) {
      errors.push('Choices are required for select-type options')
    }

    // Written as code for these two types: a volume, or the index of the chosen choice.
    const defaultValue = values['defaultValue']
    const hasDefaultValue = Boolean(defaultValue)
    if (
      hasDefaultValue &&
      (optionType === 'volume' || optionType === 'select') &&
      !/^\d+$/.test(String(defaultValue))
    ) {
      errors.push(`Default Value must be a whole number for a ${optionType} option`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register all templates when this module loads
registerTemplate(customMenuSceneTemplate)
registerTemplate(titleScreenModuleTemplate)
registerTemplate(menuCommandAdditionTemplate)
registerTemplate(optionsMenuAdditionTemplate)
