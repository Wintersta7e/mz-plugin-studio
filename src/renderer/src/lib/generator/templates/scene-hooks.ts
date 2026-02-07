/**
 * Scene Hooks Template
 * Provides templates for hooking into RPG Maker MZ scene lifecycle methods
 */

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'

const sceneHooksTemplate: CodeTemplate = {
  id: 'scene-hook-basic',
  category: 'scene-hooks',
  name: 'Scene Lifecycle Hook',
  description: "Execute code at specific points in a scene's lifecycle",
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Scene_Base.html',
  icon: 'Play',
  fields: [
    {
      id: 'sceneName',
      label: 'Scene',
      type: 'select',
      required: true,
      options: [
        { value: 'Scene_Boot', label: 'Scene_Boot - Game startup' },
        { value: 'Scene_Title', label: 'Scene_Title - Title screen' },
        { value: 'Scene_Map', label: 'Scene_Map - Map gameplay' },
        { value: 'Scene_Menu', label: 'Scene_Menu - Main menu' },
        { value: 'Scene_Item', label: 'Scene_Item - Item menu' },
        { value: 'Scene_Skill', label: 'Scene_Skill - Skill menu' },
        { value: 'Scene_Equip', label: 'Scene_Equip - Equipment menu' },
        { value: 'Scene_Status', label: 'Scene_Status - Status menu' },
        { value: 'Scene_Options', label: 'Scene_Options - Options menu' },
        { value: 'Scene_Save', label: 'Scene_Save - Save menu' },
        { value: 'Scene_Load', label: 'Scene_Load - Load menu' },
        { value: 'Scene_Battle', label: 'Scene_Battle - Battle scene' },
        { value: 'Scene_Shop', label: 'Scene_Shop - Shop menu' },
        { value: 'Scene_Name', label: 'Scene_Name - Name input' },
        { value: 'Scene_Gameover', label: 'Scene_Gameover - Game over screen' }
      ],
      help: 'The scene to hook into'
    },
    {
      id: 'hookPoint',
      label: 'Hook Point',
      type: 'select',
      required: true,
      options: [
        { value: 'create', label: 'create() - When scene is created' },
        { value: 'start', label: 'start() - When scene starts (recommended)' },
        { value: 'update', label: 'update() - Every frame (use carefully)' },
        { value: 'terminate', label: 'terminate() - When scene ends' }
      ],
      default: 'start',
      help: 'When in the scene lifecycle to execute your code'
    }
  ],
  generate: (values) => {
    const sceneName = values.sceneName as string
    const hookPoint = values.hookPoint as string

    return `// Hook: ${sceneName}.${hookPoint}
const _${sceneName}_${hookPoint} = ${sceneName}.prototype.${hookPoint};
${sceneName}.prototype.${hookPoint} = function() {
    _${sceneName}_${hookPoint}.call(this);

    // Your code here - runs when ${sceneName} ${hookPoint}s

};`
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.sceneName) {
      errors.push('Scene is required')
    }

    if (!values.hookPoint) {
      errors.push('Hook Point is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

registerTemplate(sceneHooksTemplate)

export { sceneHooksTemplate }
