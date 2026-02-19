/**
 * Menu System Templates
 *
 * Templates for RPG Maker MZ menu and scene customization:
 * - Custom menu scenes (Scene_MenuBase subclass)
 * - Title screen modifications
 * - Menu command additions
 * - Options menu additions
 */

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'

/**
 * Helper to convert a name to a valid JavaScript identifier
 */
function toValidIdentifier(name: string): string {
  // Remove special characters and replace spaces with nothing
  return name.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&')
}

/**
 * Template 1: Custom Menu Scene
 * Create a new Scene_MenuBase subclass with custom windows
 */
const customMenuSceneTemplate: CodeTemplate = {
  id: 'menu-custom-scene',
  category: 'menu-system',
  name: 'Custom Menu Scene',
  description: 'Create a new Scene_MenuBase subclass with custom windows',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Scene_MenuBase.html',
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
    const sceneName = toValidIdentifier(values.sceneName as string)
    const windowName = toValidIdentifier(values.windowName as string)
    const windowType = (values.windowType as string) || 'selectable'
    const includeHelp = values.includeHelp as boolean
    const includeGold = values.includeGold as boolean

    const sceneClass = `Scene_${sceneName}`
    const windowClass = `Window_${windowName}`

    // Determine window parent class
    let windowParent: string
    switch (windowType) {
      case 'command':
        windowParent = 'Window_Command'
        break
      case 'base':
        windowParent = 'Window_Base'
        break
      case 'selectable':
      default:
        windowParent = 'Window_Selectable'
    }

    const lines: string[] = []

    // Header comment
    lines.push(`// Custom Menu Scene: ${sceneClass}`)
    lines.push(`// A custom scene with ${windowClass} based on ${windowParent}`)
    lines.push('')

    // Window class definition
    lines.push('//-----------------------------------------------------------------------------')
    lines.push(`// ${windowClass}`)
    lines.push('//')
    lines.push(`// The window for displaying custom content in ${sceneClass}.`)
    lines.push('')
    lines.push(`function ${windowClass}() {`)
    lines.push('    this.initialize(...arguments);')
    lines.push('}')
    lines.push('')
    lines.push(`${windowClass}.prototype = Object.create(${windowParent}.prototype);`)
    lines.push(`${windowClass}.prototype.constructor = ${windowClass};`)
    lines.push('')
    lines.push(`${windowClass}.prototype.initialize = function(rect) {`)
    lines.push(`    ${windowParent}.prototype.initialize.call(this, rect);`)

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
      lines.push('};')
      lines.push('')
    } else if (windowType === 'selectable') {
      lines.push(`${windowClass}.prototype.maxItems = function() {`)
      lines.push('    // Return the number of items in your list')
      lines.push('    return 10;')
      lines.push('};')
      lines.push('')
      lines.push(`${windowClass}.prototype.drawItem = function(index) {`)
      lines.push('    const rect = this.itemLineRect(index);')
      lines.push("    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);")
      lines.push('};')
      lines.push('')
    } else {
      // Base window
      lines.push(`${windowClass}.prototype.refresh = function() {`)
      lines.push('    this.contents.clear();')
      lines.push('    // Draw your content here')
      lines.push("    this.drawText('Custom Window Content', 0, 0, this.innerWidth, 'center');")
      lines.push('};')
      lines.push('')
    }

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

    if (includeHelp) {
      lines.push('    this.createHelpWindow();')
    }

    lines.push(`    this.create${windowName}Window();`)

    if (includeGold) {
      lines.push('    this.createGoldWindow();')
    }

    lines.push('};')
    lines.push('')

    // Window creation methods
    lines.push(`${sceneClass}.prototype.create${windowName}Window = function() {`)
    lines.push(`    const rect = this.${windowName.toLowerCase()}WindowRect();`)
    lines.push(`    this._${windowName.toLowerCase()}Window = new ${windowClass}(rect);`)

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

    if (includeHelp && windowType !== 'base') {
      lines.push(`    this._${windowName.toLowerCase()}Window.setHelpWindow(this._helpWindow);`)
    }

    lines.push(`    this.addWindow(this._${windowName.toLowerCase()}Window);`)
    lines.push('};')
    lines.push('')

    // Window rect method
    lines.push(`${sceneClass}.prototype.${windowName.toLowerCase()}WindowRect = function() {`)

    if (includeHelp) {
      lines.push('    const wx = 0;')
      lines.push('    const wy = this.mainAreaTop();')
      lines.push('    const ww = Graphics.boxWidth;')
      lines.push('    const wh = this.mainAreaHeight();')
    } else {
      lines.push('    const wx = 0;')
      lines.push('    const wy = this.mainAreaTop();')
      lines.push('    const ww = Graphics.boxWidth;')
      lines.push('    const wh = Graphics.boxHeight - wy;')
    }

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

    lines.push('')
    lines.push(`// To open this scene, use: SceneManager.push(${sceneClass});`)

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.sceneName) {
      errors.push('Scene name is required')
    } else {
      const sceneName = values.sceneName as string
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sceneName)) {
        errors.push(
          'Scene name must be a valid JavaScript identifier (letters, numbers, underscores, cannot start with a number)'
        )
      }
    }

    if (!values.windowName) {
      errors.push('Window name is required')
    } else {
      const windowName = values.windowName as string
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(windowName)) {
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
 * Template 2: Title Screen Mod
 * Add commands or modify the title screen
 */
const titleScreenModTemplate: CodeTemplate = {
  id: 'menu-title-mod',
  category: 'menu-system',
  name: 'Title Screen Mod',
  description: 'Add commands or modify the title screen',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Scene_Title.html',
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
    const modType = (values.modType as string) || 'addCommand'
    const lines: string[] = []

    switch (modType) {
      case 'addCommand': {
        const commandName = (values.commandName as string) || 'Custom'
        const commandSymbol = (values.commandSymbol as string) || 'custom'

        lines.push(`// Title Screen Mod: Add "${commandName}" Command`)
        lines.push('')
        lines.push('// Add command to title command window')
        lines.push(
          'const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;'
        )
        lines.push('Window_TitleCommand.prototype.makeCommandList = function() {')
        lines.push('    _Window_TitleCommand_makeCommandList.call(this);')
        lines.push(`    this.addCommand("${commandName}", "${commandSymbol}");`)
        lines.push('};')
        lines.push('')
        lines.push('// Create handler for the new command')
        lines.push(
          'const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;'
        )
        lines.push('Scene_Title.prototype.createCommandWindow = function() {')
        lines.push('    _Scene_Title_createCommandWindow.call(this);')
        lines.push(
          `    this._commandWindow.setHandler("${commandSymbol}", this.command${toValidIdentifier(commandSymbol)}.bind(this));`
        )
        lines.push('};')
        lines.push('')
        lines.push(
          `Scene_Title.prototype.command${toValidIdentifier(commandSymbol)} = function() {`
        )
        lines.push(`    // Your code here when "${commandName}" is selected`)
        lines.push(`    console.log("${commandName} command selected");`)
        lines.push('    this._commandWindow.activate();')
        lines.push('    ')
        lines.push('    // Example: Push a custom scene')
        lines.push('    // SceneManager.push(Scene_Custom);')
        lines.push('};')
        break
      }

      case 'replaceBackground': {
        lines.push('// Title Screen Mod: Custom Background Handler')
        lines.push('')
        lines.push('const _Scene_Title_createBackground = Scene_Title.prototype.createBackground;')
        lines.push('Scene_Title.prototype.createBackground = function() {')
        lines.push('    _Scene_Title_createBackground.call(this);')
        lines.push('    ')
        lines.push('    // Add custom background elements here')
        lines.push('    // Example: Create an additional sprite layer')
        lines.push('    // this._customSprite = new Sprite();')
        lines.push(
          "    // this._customSprite.bitmap = ImageManager.loadTitle1('CustomBackground');"
        )
        lines.push('    // this.addChild(this._customSprite);')
        lines.push('};')
        lines.push('')
        lines.push('// Optionally animate or update the background')
        lines.push('const _Scene_Title_update = Scene_Title.prototype.update;')
        lines.push('Scene_Title.prototype.update = function() {')
        lines.push('    _Scene_Title_update.call(this);')
        lines.push('    ')
        lines.push('    // Update custom background elements')
        lines.push('    // if (this._customSprite) {')
        lines.push(
          '    //     this._customSprite.opacity = 128 + Math.sin(Graphics.frameCount / 30) * 127;'
        )
        lines.push('    // }')
        lines.push('};')
        break
      }

      case 'hideCommand': {
        const hideTarget = (values.hideTarget as string) || 'options'

        let methodName: string
        let description: string
        switch (hideTarget) {
          case 'newGame':
            methodName = 'isNewGameVisible'
            description = 'New Game'
            break
          case 'continue':
            methodName = 'isContinueVisible'
            description = 'Continue'
            break
          case 'options':
          default:
            methodName = 'isOptionsVisible'
            description = 'Options'
        }

        lines.push(`// Title Screen Mod: Hide "${description}" Command`)
        lines.push('')

        if (hideTarget === 'options') {
          // Options doesn't have a visibility check by default, need different approach
          lines.push(
            'const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;'
          )
          lines.push('Window_TitleCommand.prototype.makeCommandList = function() {')
          lines.push('    // Manually add commands, skipping Options')
          lines.push("    this.addCommand(TextManager.newGame, 'newGame');")
          lines.push(
            "    this.addCommand(TextManager.continue_, 'continue', this.isContinueEnabled());"
          )
          lines.push('    // Options command removed')
          lines.push('};')
        } else {
          lines.push(`// Override visibility check for ${description}`)
          lines.push(`Window_TitleCommand.prototype.${methodName} = function() {`)
          lines.push('    return false;')
          lines.push('};')
        }
        break
      }

      case 'customCreate': {
        lines.push('// Title Screen Mod: Custom Create Hook')
        lines.push('')
        lines.push('const _Scene_Title_create = Scene_Title.prototype.create;')
        lines.push('Scene_Title.prototype.create = function() {')
        lines.push('    _Scene_Title_create.call(this);')
        lines.push('    ')
        lines.push('    // Add custom elements after scene creation')
        lines.push('    this.createCustomElements();')
        lines.push('};')
        lines.push('')
        lines.push('Scene_Title.prototype.createCustomElements = function() {')
        lines.push('    // Create custom UI elements here')
        lines.push('    ')
        lines.push('    // Example: Create a version text sprite')
        lines.push('    this._versionSprite = new Sprite();')
        lines.push('    this._versionSprite.bitmap = new Bitmap(200, 30);')
        lines.push("    this._versionSprite.bitmap.drawText('v1.0.0', 0, 0, 200, 30, 'right');")
        lines.push('    this._versionSprite.x = Graphics.width - 210;')
        lines.push('    this._versionSprite.y = Graphics.height - 40;')
        lines.push('    this.addChild(this._versionSprite);')
        lines.push('};')
        break
      }
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const modType = values.modType as string

    if (modType === 'addCommand') {
      if (!values.commandName) {
        errors.push('Command name is required')
      }
      if (!values.commandSymbol) {
        errors.push('Command symbol is required')
      } else {
        const symbol = values.commandSymbol as string
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(symbol)) {
          errors.push('Command symbol must be a valid JavaScript identifier')
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 3: Menu Command Addition
 * Add new commands to the main menu (Scene_Menu)
 */
const menuCommandAdditionTemplate: CodeTemplate = {
  id: 'menu-command-addition',
  category: 'menu-system',
  name: 'Menu Command Addition',
  description: 'Add new commands to the main menu (Scene_Menu)',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Window_MenuCommand.html',
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
    const commandName = values.commandName as string
    const commandSymbol = values.commandSymbol as string
    const insertPosition = (values.insertPosition as string) || 'beforeOptions'
    const requiresActor = values.requiresActor as boolean
    const enableCondition = (values.enableCondition as string) || 'always'
    const switchId = (values.switchId as number) || 1

    const symbolId = toValidIdentifier(commandSymbol)
    const lines: string[] = []

    lines.push(`// Menu Command Addition: ${commandName}`)
    lines.push('')

    // Determine insertion logic
    let insertCode: string
    switch (insertPosition) {
      case 'afterItem':
        insertCode = 'item'
        break
      case 'afterSkill':
        insertCode = 'skill'
        break
      case 'afterEquip':
        insertCode = 'equip'
        break
      case 'afterStatus':
        insertCode = 'status'
        break
      case 'beforeOptions':
        insertCode = 'options'
        break
      case 'beforeSave':
        insertCode = 'save'
        break
      case 'beforeGameEnd':
        insertCode = 'gameEnd'
        break
      case 'end':
      default:
        insertCode = ''
    }

    // Add command to menu
    lines.push('// Add command to main menu')
    lines.push(
      'const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;'
    )
    lines.push('Window_MenuCommand.prototype.addOriginalCommands = function() {')
    lines.push('    _Window_MenuCommand_addOriginalCommands.call(this);')
    lines.push(
      `    this.addCommand("${commandName}", "${commandSymbol}", this.is${symbolId}Enabled());`
    )
    lines.push('};')
    lines.push('')

    // Enable check method
    lines.push(`// Enable condition for ${commandName}`)
    lines.push(`Window_MenuCommand.prototype.is${symbolId}Enabled = function() {`)

    switch (enableCondition) {
      case 'switch':
        lines.push(`    return $gameSwitches.value(${switchId});`)
        break
      case 'custom':
        lines.push('    // Add your custom condition here')
        lines.push('    return true;')
        break
      case 'always':
      default:
        lines.push('    return true;')
    }

    lines.push('};')
    lines.push('')

    // If we need to control insertion position precisely, we override makeCommandList
    if (insertCode && insertPosition.startsWith('before')) {
      lines.push('// Override makeCommandList to control command position')
      lines.push(
        'const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;'
      )
      lines.push('Window_MenuCommand.prototype.makeCommandList = function() {')
      lines.push('    _Window_MenuCommand_makeCommandList.call(this);')
      lines.push('    ')
      lines.push(`    // Find index of "${insertCode}" and insert before it`)
      lines.push(`    const index = this._list.findIndex(cmd => cmd.symbol === "${insertCode}");`)
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
      `    this._commandWindow.setHandler("${commandSymbol}", this.command${symbolId}.bind(this));`
    )
    lines.push('};')
    lines.push('')

    // Command handler
    lines.push(`Scene_Menu.prototype.command${symbolId} = function() {`)

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
      lines.push(`    // Your code here when "${commandName}" is selected`)
      lines.push(`    console.log("${commandName} command selected");`)
      lines.push('    ')
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
      lines.push(`    console.log("${commandName} - selected actor:", actor.name());`)
      lines.push('    ')
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

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.commandName) {
      errors.push('Command name is required')
    }

    if (!values.commandSymbol) {
      errors.push('Command symbol is required')
    } else {
      const symbol = values.commandSymbol as string
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(symbol)) {
        errors.push('Command symbol must be a valid JavaScript identifier')
      }
    }

    const enableCondition = values.enableCondition as string
    if (enableCondition === 'switch') {
      const switchId = values.switchId as number
      if (!switchId || switchId < 1) {
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
 * Template 4: Options Menu Addition
 * Add custom options to the options menu
 */
const optionsMenuAdditionTemplate: CodeTemplate = {
  id: 'menu-options-addition',
  category: 'menu-system',
  name: 'Options Menu Addition',
  description: 'Add custom options to the options menu',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Window_Options.html',
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
    const optionName = values.optionName as string
    const optionSymbol = values.optionSymbol as string
    const optionType = (values.optionType as string) || 'boolean'
    const defaultValue = values.defaultValue as string
    const choices = values.choices as string
    const persistToConfig = values.persistToConfig !== false

    const lines: string[] = []

    lines.push(`// Options Menu Addition: ${optionName}`)
    lines.push('')

    // Determine default value
    let defaultCode: string
    switch (optionType) {
      case 'boolean':
        defaultCode = defaultValue === 'false' ? 'false' : 'true'
        break
      case 'volume':
        defaultCode = defaultValue || '100'
        break
      case 'select':
        defaultCode = defaultValue || '0'
        break
      default:
        defaultCode = 'true'
    }

    // Add ConfigManager property
    lines.push('// Add to ConfigManager')
    lines.push(`ConfigManager.${optionSymbol} = ${defaultCode};`)
    lines.push('')

    if (persistToConfig) {
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

      switch (optionType) {
        case 'boolean':
          lines.push(
            `    this.${optionSymbol} = this.readFlag(config, "${optionSymbol}", ${defaultCode});`
          )
          break
        case 'volume':
          lines.push(`    this.${optionSymbol} = this.readVolume(config, "${optionSymbol}");`)
          break
        case 'select':
          lines.push(
            `    this.${optionSymbol} = config.${optionSymbol} !== undefined ? config.${optionSymbol} : ${defaultCode};`
          )
          break
      }

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
    lines.push(`    this.addCommand("${optionName}", "${optionSymbol}");`)
    lines.push('};')
    lines.push('')

    // Type-specific methods
    switch (optionType) {
      case 'boolean':
        lines.push('// Boolean type uses default behavior - no additional code needed')
        lines.push(`// Access the value with: ConfigManager.${optionSymbol}`)
        break

      case 'volume':
        lines.push('// Volume type uses default behavior - no additional code needed')
        lines.push(`// Access the value with: ConfigManager.${optionSymbol} (0-100)`)
        lines.push('')
        lines.push('// Mark as volume type')
        lines.push(
          'const _Window_Options_isVolumeSymbol = Window_Options.prototype.isVolumeSymbol;'
        )
        lines.push('Window_Options.prototype.isVolumeSymbol = function(symbol) {')
        lines.push(`    if (symbol === "${optionSymbol}") return true;`)
        lines.push('    return _Window_Options_isVolumeSymbol.call(this, symbol);')
        lines.push('};')
        break

      case 'select': {
        const choiceList = choices
          ? choices.split(',').map((c) => c.trim())
          : ['Option 1', 'Option 2', 'Option 3']

        lines.push('// Status text for select option')
        lines.push('const _Window_Options_statusText = Window_Options.prototype.statusText;')
        lines.push('Window_Options.prototype.statusText = function(index) {')
        lines.push('    const symbol = this.commandSymbol(index);')
        lines.push(`    if (symbol === "${optionSymbol}") {`)
        lines.push(`        const choices = [${choiceList.map((c) => `"${c}"`).join(', ')}];`)
        lines.push(`        return choices[this.getConfigValue(symbol)] || choices[0];`)
        lines.push('    }')
        lines.push('    return _Window_Options_statusText.call(this, index);')
        lines.push('};')
        lines.push('')

        lines.push('// Process select option changes')
        lines.push('const _Window_Options_processOk = Window_Options.prototype.processOk;')
        lines.push('Window_Options.prototype.processOk = function() {')
        lines.push('    const symbol = this.commandSymbol(this.index());')
        lines.push(`    if (symbol === "${optionSymbol}") {`)
        lines.push(`        const choices = [${choiceList.map((c) => `"${c}"`).join(', ')}];`)
        lines.push('        let value = this.getConfigValue(symbol);')
        lines.push('        value = (value + 1) % choices.length;')
        lines.push('        this.changeValue(symbol, value);')
        lines.push('        return;')
        lines.push('    }')
        lines.push('    _Window_Options_processOk.call(this);')
        lines.push('};')
        lines.push('')

        lines.push('// Handle cursor right/left for select option')
        lines.push('const _Window_Options_cursorRight = Window_Options.prototype.cursorRight;')
        lines.push('Window_Options.prototype.cursorRight = function() {')
        lines.push('    const symbol = this.commandSymbol(this.index());')
        lines.push(`    if (symbol === "${optionSymbol}") {`)
        lines.push(`        const choices = [${choiceList.map((c) => `"${c}"`).join(', ')}];`)
        lines.push('        let value = this.getConfigValue(symbol);')
        lines.push('        value = Math.min(value + 1, choices.length - 1);')
        lines.push('        this.changeValue(symbol, value);')
        lines.push('        return;')
        lines.push('    }')
        lines.push('    _Window_Options_cursorRight.call(this);')
        lines.push('};')
        lines.push('')

        lines.push('const _Window_Options_cursorLeft = Window_Options.prototype.cursorLeft;')
        lines.push('Window_Options.prototype.cursorLeft = function() {')
        lines.push('    const symbol = this.commandSymbol(this.index());')
        lines.push(`    if (symbol === "${optionSymbol}") {`)
        lines.push('        let value = this.getConfigValue(symbol);')
        lines.push('        value = Math.max(value - 1, 0);')
        lines.push('        this.changeValue(symbol, value);')
        lines.push('        return;')
        lines.push('    }')
        lines.push('    _Window_Options_cursorLeft.call(this);')
        lines.push('};')
        lines.push('')

        lines.push(
          `// Access the value with: ConfigManager.${optionSymbol} (index 0-${choiceList.length - 1})`
        )
        lines.push(`// Choices: ${choiceList.join(', ')}`)
        break
      }
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.optionName) {
      errors.push('Option name is required')
    }

    if (!values.optionSymbol) {
      errors.push('Option symbol is required')
    } else {
      const symbol = values.optionSymbol as string
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(symbol)) {
        errors.push('Option symbol must be a valid JavaScript identifier')
      }
    }

    const optionType = values.optionType as string
    if (optionType === 'select' && !values.choices) {
      errors.push('Choices are required for select-type options')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register all templates when this module loads
registerTemplate(customMenuSceneTemplate)
registerTemplate(titleScreenModTemplate)
registerTemplate(menuCommandAdditionTemplate)
registerTemplate(optionsMenuAdditionTemplate)

export {
  customMenuSceneTemplate,
  titleScreenModTemplate,
  menuCommandAdditionTemplate,
  optionsMenuAdditionTemplate
}
