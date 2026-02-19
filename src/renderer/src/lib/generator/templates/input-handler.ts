/**
 * Input Handler Template
 *
 * Generates code for handling keyboard and gamepad input in RPG Maker MZ.
 * Supports key mapping registration, scene-specific handlers, and multiple trigger types.
 */

import { registerTemplate } from './index'
import type { CodeTemplate } from './types'

/**
 * Key code mappings for common keys
 * Used to register new key mappings with Input.keyMapper
 */
const KEY_CODES: Record<string, number> = {
  q: 81,
  w: 87,
  e: 69,
  r: 82,
  t: 84,
  tab: 9,
  shift: 16,
  control: 17,
  pageup: 33,
  pagedown: 34
}

/**
 * Display names for keys (for comments)
 */
const KEY_DISPLAY_NAMES: Record<string, string> = {
  q: 'Q',
  w: 'W',
  e: 'E',
  r: 'R',
  t: 'T',
  tab: 'Tab',
  shift: 'Shift',
  control: 'Control',
  pageup: 'Page Up',
  pagedown: 'Page Down'
}

/**
 * Trigger type descriptions for comments
 */
const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  isTriggered: 'once when pressed',
  isPressed: 'while held down',
  isRepeated: 'with repeat delay'
}

/**
 * Generates input handler code for a specific scene
 */
function generateSceneHandler(keyName: string, triggerType: string, sceneName: string): string {
  const keyCode = KEY_CODES[keyName]
  const keyDisplayName = KEY_DISPLAY_NAMES[keyName]
  const triggerDesc = TRIGGER_DESCRIPTIONS[triggerType]
  const lines: string[] = []

  // Header comment
  lines.push(`// Input Handler: ${keyDisplayName} key on ${sceneName}`)
  lines.push(`// Triggers ${triggerDesc}`)
  lines.push('')

  // Register key mapping
  lines.push('// Register the key mapping')
  lines.push(
    `Input.keyMapper[${keyCode}] = '${keyName}';  // ${keyCode} = ${keyDisplayName} key code`
  )
  lines.push('')

  // Alias the scene's update method
  const aliasName = `_${sceneName}_update`
  lines.push(`const ${aliasName} = ${sceneName}.prototype.update;`)
  lines.push(`${sceneName}.prototype.update = function() {`)
  lines.push(`    ${aliasName}.call(this);`)
  lines.push('    this.updateCustomKeyInput();')
  lines.push('};')
  lines.push('')

  // Add the custom input handler method
  lines.push(`${sceneName}.prototype.updateCustomKeyInput = function() {`)
  lines.push(`    if (Input.${triggerType}('${keyName}')) {`)
  lines.push(`        // Your code here - runs when ${keyDisplayName} is pressed`)
  lines.push(`        console.log('${keyDisplayName} key pressed!');`)
  lines.push('    }')
  lines.push('};')

  return lines.join('\n')
}

/**
 * Generates a global input handler that works across all scenes
 */
function generateGlobalHandler(keyName: string, triggerType: string): string {
  const keyCode = KEY_CODES[keyName]
  const keyDisplayName = KEY_DISPLAY_NAMES[keyName]
  const triggerDesc = TRIGGER_DESCRIPTIONS[triggerType]
  const lines: string[] = []

  // Header comment
  lines.push(`// Global Input Handler: ${keyDisplayName} key (all scenes)`)
  lines.push(`// Triggers ${triggerDesc}`)
  lines.push('')

  // Register key mapping
  lines.push('// Register the key mapping')
  lines.push(
    `Input.keyMapper[${keyCode}] = '${keyName}';  // ${keyCode} = ${keyDisplayName} key code`
  )
  lines.push('')

  // Alias Scene_Base.update for global handling
  lines.push('// Hook Scene_Base.update for global key handling')
  lines.push('const _Scene_Base_update = Scene_Base.prototype.update;')
  lines.push('Scene_Base.prototype.update = function() {')
  lines.push('    _Scene_Base_update.call(this);')
  lines.push('    this.updateGlobalKeyInput();')
  lines.push('};')
  lines.push('')

  // Add the global input handler method
  lines.push('Scene_Base.prototype.updateGlobalKeyInput = function() {')
  lines.push(`    if (Input.${triggerType}('${keyName}')) {`)
  lines.push(`        // Your code here - runs when ${keyDisplayName} is pressed in any scene`)
  lines.push(`        console.log('${keyDisplayName} key pressed!');`)
  lines.push('    }')
  lines.push('};')

  return lines.join('\n')
}

const inputHandlerTemplate: CodeTemplate = {
  id: 'input-handler-basic',
  category: 'input-handler',
  name: 'Key Input Handler',
  description: 'React to keyboard or gamepad input',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Input.html',
  icon: 'Keyboard',
  fields: [
    {
      id: 'keyName',
      label: 'Key',
      type: 'select',
      required: true,
      options: [
        { value: 'q', label: 'Q' },
        { value: 'w', label: 'W' },
        { value: 'e', label: 'E' },
        { value: 'r', label: 'R' },
        { value: 't', label: 'T' },
        { value: 'tab', label: 'Tab' },
        { value: 'shift', label: 'Shift' },
        { value: 'control', label: 'Control' },
        { value: 'pageup', label: 'Page Up' },
        { value: 'pagedown', label: 'Page Down' }
      ],
      help: 'Key to listen for'
    },
    {
      id: 'triggerType',
      label: 'Trigger Type',
      type: 'select',
      options: [
        { value: 'isTriggered', label: 'Triggered - Once on press' },
        { value: 'isPressed', label: 'Pressed - While held down' },
        { value: 'isRepeated', label: 'Repeated - With repeat delay' }
      ],
      default: 'isTriggered',
      help: 'How to detect the key'
    },
    {
      id: 'activeScene',
      label: 'Active Scene',
      type: 'select',
      options: [
        { value: 'Scene_Map', label: 'Scene_Map - During map gameplay' },
        { value: 'Scene_Battle', label: 'Scene_Battle - During battle' },
        { value: 'Scene_Menu', label: 'Scene_Menu - In menus' },
        { value: 'all', label: 'All Scenes - Global handler' }
      ],
      default: 'Scene_Map',
      help: 'Which scene(s) to listen in'
    }
  ],
  generate: (values): string => {
    const keyName = values.keyName as string
    const triggerType = (values.triggerType as string) || 'isTriggered'
    const activeScene = (values.activeScene as string) || 'Scene_Map'

    if (activeScene === 'all') {
      return generateGlobalHandler(keyName, triggerType)
    } else {
      return generateSceneHandler(keyName, triggerType, activeScene)
    }
  },
  validate: (values) => {
    const errors: string[] = []

    if (!values.keyName) {
      errors.push('Key is required')
    } else if (!KEY_CODES[values.keyName as string]) {
      errors.push(`Unknown key: ${values.keyName}`)
    }

    const validTriggers = ['isTriggered', 'isPressed', 'isRepeated']
    if (values.triggerType && !validTriggers.includes(values.triggerType as string)) {
      errors.push(`Invalid trigger type: ${values.triggerType}`)
    }

    const validScenes = ['Scene_Map', 'Scene_Battle', 'Scene_Menu', 'all']
    if (values.activeScene && !validScenes.includes(values.activeScene as string)) {
      errors.push(`Invalid scene: ${values.activeScene}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register the template when this module loads
registerTemplate(inputHandlerTemplate)

export { inputHandlerTemplate }
