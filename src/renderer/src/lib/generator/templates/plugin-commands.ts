/**
 * Plugin Command Templates
 *
 * Templates for creating RPG Maker MZ plugin commands:
 * - Basic plugin command registration with arguments
 * - Async command with interpreter wait
 * - Command with input validation and error handling
 */

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'

/**
 * Helper to generate argument parsing code
 */
function generateArgParsing(args: Array<{ name: string; type: string }>): string[] {
  const lines: string[] = []

  for (const arg of args) {
    switch (arg.type) {
      case 'number':
        lines.push(`    const ${arg.name} = Number(args.${arg.name});`)
        break
      case 'boolean':
        lines.push(`    const ${arg.name} = args.${arg.name} === 'true';`)
        break
      case 'json':
        lines.push(`    const ${arg.name} = JSON.parse(args.${arg.name});`)
        break
      case 'string':
      default:
        lines.push(`    const ${arg.name} = String(args.${arg.name});`)
        break
    }
  }

  return lines
}

/**
 * Helper to generate argument info comment
 */
function generateArgComment(args: Array<{ name: string; type: string; desc: string }>): string[] {
  if (args.length === 0) return []

  const lines: string[] = ['// Arguments:']
  for (const arg of args) {
    lines.push(`//   ${arg.name} (${arg.type}) - ${arg.desc}`)
  }
  return lines
}

/**
 * Template 1: Basic Plugin Command
 * Simple command registration with arguments
 */
const basicCommandTemplate: CodeTemplate = {
  id: 'plugin-command-basic',
  category: 'plugin-command',
  name: 'Basic Plugin Command',
  description: 'Simple command registration with arguments',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/PluginManager.html',
  icon: 'Terminal',
  fields: [
    {
      id: 'commandName',
      label: 'Command Name',
      type: 'text',
      placeholder: 'MyCommand',
      required: true,
      help: 'Internal name used in PluginManager.registerCommand'
    },
    {
      id: 'pluginName',
      label: 'Plugin Name',
      type: 'text',
      placeholder: 'MyPlugin',
      required: true,
      help: 'Must match the plugin filename (without .js extension)'
    },
    {
      id: 'arg1Name',
      label: 'Argument 1 Name',
      type: 'text',
      placeholder: 'target',
      help: 'Name of the first argument (leave empty if no arguments)'
    },
    {
      id: 'arg1Type',
      label: 'Argument 1 Type',
      type: 'select',
      options: [
        { value: 'string', label: 'String' },
        { value: 'number', label: 'Number' },
        { value: 'boolean', label: 'Boolean' },
        { value: 'json', label: 'JSON (array/object)' }
      ],
      default: 'string',
      dependsOn: { field: 'arg1Name', value: true },
      help: 'Data type for argument 1'
    },
    {
      id: 'arg2Name',
      label: 'Argument 2 Name',
      type: 'text',
      placeholder: 'value',
      help: 'Name of the second argument (optional)'
    },
    {
      id: 'arg2Type',
      label: 'Argument 2 Type',
      type: 'select',
      options: [
        { value: 'string', label: 'String' },
        { value: 'number', label: 'Number' },
        { value: 'boolean', label: 'Boolean' },
        { value: 'json', label: 'JSON (array/object)' }
      ],
      default: 'number',
      dependsOn: { field: 'arg2Name', value: true },
      help: 'Data type for argument 2'
    }
  ],
  generate: (values): string => {
    const commandName = values.commandName as string
    const pluginName = values.pluginName as string
    const arg1Name = values.arg1Name as string
    const arg1Type = (values.arg1Type as string) || 'string'
    const arg2Name = values.arg2Name as string
    const arg2Type = (values.arg2Type as string) || 'number'

    const lines: string[] = []

    // Build argument list
    const args: Array<{ name: string; type: string; desc: string }> = []
    if (arg1Name && arg1Name.trim()) {
      args.push({ name: arg1Name.trim(), type: arg1Type, desc: 'First argument' })
    }
    if (arg2Name && arg2Name.trim()) {
      args.push({ name: arg2Name.trim(), type: arg2Type, desc: 'Second argument' })
    }

    // Header comment
    lines.push(`// Plugin Command: ${commandName}`)
    if (args.length > 0) {
      lines.push(...generateArgComment(args))
    }

    // Registration
    lines.push(`PluginManager.registerCommand('${pluginName}', '${commandName}', function(args) {`)

    // Argument parsing
    if (args.length > 0) {
      lines.push('    // Parse arguments')
      lines.push(...generateArgParsing(args))
      lines.push('')
    }

    // Command body
    lines.push('    // Your command logic here')
    if (args.length > 0) {
      const argList = args.map(a => a.name).join(', ')
      lines.push(`    console.log('${commandName} called with:', ${argList});`)
    } else {
      lines.push(`    console.log('${commandName} called');`)
    }

    lines.push('});')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const commandName = values.commandName as string
    const pluginName = values.pluginName as string

    if (!commandName || !commandName.trim()) {
      errors.push('Command name is required')
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(commandName.trim())) {
      errors.push('Command name must be a valid identifier (letters, numbers, underscores, cannot start with a number)')
    }

    if (!pluginName || !pluginName.trim()) {
      errors.push('Plugin name is required')
    }

    // Validate argument names if provided
    const arg1Name = values.arg1Name as string
    const arg2Name = values.arg2Name as string

    if (arg1Name && arg1Name.trim() && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(arg1Name.trim())) {
      errors.push('Argument 1 name must be a valid identifier')
    }

    if (arg2Name && arg2Name.trim() && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(arg2Name.trim())) {
      errors.push('Argument 2 name must be a valid identifier')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 2: Async Command with Wait
 * Command that uses async/await with interpreter wait
 */
const asyncCommandTemplate: CodeTemplate = {
  id: 'plugin-command-async',
  category: 'plugin-command',
  name: 'Async Command with Wait',
  description: 'Command that pauses event execution until complete',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/PluginManager.html',
  icon: 'Terminal',
  fields: [
    {
      id: 'commandName',
      label: 'Command Name',
      type: 'text',
      placeholder: 'LoadDataAsync',
      required: true,
      help: 'Internal name used in PluginManager.registerCommand'
    },
    {
      id: 'pluginName',
      label: 'Plugin Name',
      type: 'text',
      placeholder: 'MyPlugin',
      required: true,
      help: 'Must match the plugin filename (without .js extension)'
    },
    {
      id: 'waitType',
      label: 'Wait Implementation',
      type: 'select',
      options: [
        { value: 'setWaitMode', label: 'setWaitMode - Use custom wait mode' },
        { value: 'waitCount', label: 'waitCount - Wait fixed frames' },
        { value: 'callback', label: 'Callback flag - Set flag when done' }
      ],
      default: 'callback',
      required: true,
      help: 'How to pause event execution during async operation'
    },
    {
      id: 'waitDuration',
      label: 'Wait Duration (frames)',
      type: 'number',
      placeholder: '60',
      default: 60,
      dependsOn: { field: 'waitType', value: 'waitCount' },
      help: 'Number of frames to wait (60 = 1 second at 60fps)'
    }
  ],
  generate: (values): string => {
    const commandName = values.commandName as string
    const pluginName = values.pluginName as string
    const waitType = (values.waitType as string) || 'callback'
    const waitDuration = (values.waitDuration as number) || 60

    const lines: string[] = []

    // Header comment
    lines.push(`// Async Plugin Command: ${commandName}`)
    lines.push('// This command pauses event execution until the async operation completes')
    lines.push('')

    switch (waitType) {
      case 'setWaitMode':
        // setWaitMode approach - custom wait mode
        lines.push('// Custom wait mode for async operation')
        lines.push(`const _Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;`)
        lines.push('Game_Interpreter.prototype.updateWaitMode = function() {')
        lines.push(`    if (this._waitMode === '${commandName}') {`)
        lines.push(`        if (!this._${commandName}Complete) {`)
        lines.push('            return true; // Keep waiting')
        lines.push('        }')
        lines.push(`        this._${commandName}Complete = false;`)
        lines.push(`        this._waitMode = '';`)
        lines.push('        return false; // Done waiting')
        lines.push('    }')
        lines.push('    return _Game_Interpreter_updateWaitMode.call(this);')
        lines.push('};')
        lines.push('')
        lines.push(`PluginManager.registerCommand('${pluginName}', '${commandName}', function(args) {`)
        lines.push('    const interpreter = this;')
        lines.push(`    interpreter.setWaitMode('${commandName}');`)
        lines.push('')
        lines.push('    // Your async operation here')
        lines.push('    setTimeout(() => {')
        lines.push('        // Simulate async work completing')
        lines.push(`        console.log('${commandName} async operation complete');`)
        lines.push(`        interpreter._${commandName}Complete = true;`)
        lines.push('    }, 1000); // Example: 1 second delay')
        lines.push('});')
        break

      case 'waitCount':
        // Simple frame wait
        lines.push(`PluginManager.registerCommand('${pluginName}', '${commandName}', function(args) {`)
        lines.push('    const interpreter = this;')
        lines.push('')
        lines.push(`    // Wait for ${waitDuration} frames (${Math.round(waitDuration / 60 * 100) / 100} seconds at 60fps)`)
        lines.push(`    interpreter.wait(${waitDuration});`)
        lines.push('')
        lines.push('    // Your command logic here')
        lines.push('    // Note: Code here runs immediately, wait only affects event flow')
        lines.push(`    console.log('${commandName} initiated ${waitDuration} frame wait');`)
        lines.push('});')
        break

      case 'callback':
      default:
        // Callback flag approach
        lines.push('// Completion flag for async operation')
        lines.push(`let _${commandName}Pending = false;`)
        lines.push('')
        lines.push('// Check if we should wait')
        lines.push('const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;')
        lines.push('Game_Interpreter.prototype.updateWait = function() {')
        lines.push(`    if (_${commandName}Pending) {`)
        lines.push('        return true; // Keep waiting')
        lines.push('    }')
        lines.push('    return _Game_Interpreter_updateWait.call(this);')
        lines.push('};')
        lines.push('')
        lines.push(`PluginManager.registerCommand('${pluginName}', '${commandName}', function(args) {`)
        lines.push(`    _${commandName}Pending = true;`)
        lines.push('')
        lines.push('    // Your async operation here (e.g., fetch, image loading, etc.)')
        lines.push('    setTimeout(() => {')
        lines.push('        // Async work complete')
        lines.push(`        console.log('${commandName} async operation complete');`)
        lines.push(`        _${commandName}Pending = false;`)
        lines.push('    }, 1000); // Example: 1 second delay')
        lines.push('});')
        break
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const commandName = values.commandName as string
    const pluginName = values.pluginName as string
    const waitType = values.waitType as string
    const waitDuration = values.waitDuration as number

    if (!commandName || !commandName.trim()) {
      errors.push('Command name is required')
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(commandName.trim())) {
      errors.push('Command name must be a valid identifier')
    }

    if (!pluginName || !pluginName.trim()) {
      errors.push('Plugin name is required')
    }

    if (waitType === 'waitCount') {
      if (waitDuration === undefined || waitDuration < 1) {
        errors.push('Wait duration must be at least 1 frame')
      } else if (waitDuration > 3600) {
        errors.push('Wait duration should not exceed 3600 frames (1 minute)')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 3: Command with Validation
 * Command with input validation and error handling
 */
const validatedCommandTemplate: CodeTemplate = {
  id: 'plugin-command-validated',
  category: 'plugin-command',
  name: 'Command with Validation',
  description: 'Command with input validation and error handling',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/PluginManager.html',
  icon: 'Terminal',
  fields: [
    {
      id: 'commandName',
      label: 'Command Name',
      type: 'text',
      placeholder: 'SetActorStat',
      required: true,
      help: 'Internal name used in PluginManager.registerCommand'
    },
    {
      id: 'pluginName',
      label: 'Plugin Name',
      type: 'text',
      placeholder: 'MyPlugin',
      required: true,
      help: 'Must match the plugin filename (without .js extension)'
    },
    {
      id: 'validateActorId',
      label: 'Validate Actor ID',
      type: 'boolean',
      default: true,
      help: 'Include actor ID validation (checks if actor exists)'
    },
    {
      id: 'validateNumberRange',
      label: 'Validate Number Range',
      type: 'boolean',
      default: true,
      help: 'Include number range validation example'
    },
    {
      id: 'minValue',
      label: 'Minimum Value',
      type: 'number',
      placeholder: '0',
      default: 0,
      dependsOn: { field: 'validateNumberRange', value: true },
      help: 'Minimum allowed value for the number argument'
    },
    {
      id: 'maxValue',
      label: 'Maximum Value',
      type: 'number',
      placeholder: '9999',
      default: 9999,
      dependsOn: { field: 'validateNumberRange', value: true },
      help: 'Maximum allowed value for the number argument'
    },
    {
      id: 'errorHandling',
      label: 'Error Handling',
      type: 'select',
      options: [
        { value: 'silent', label: 'Silent - Log to console only' },
        { value: 'warning', label: 'Warning - Show console warning' },
        { value: 'throw', label: 'Throw - Stop execution on error' }
      ],
      default: 'warning',
      required: true,
      help: 'How to handle validation errors'
    }
  ],
  generate: (values): string => {
    const commandName = values.commandName as string
    const pluginName = values.pluginName as string
    const validateActorId = values.validateActorId as boolean
    const validateNumberRange = values.validateNumberRange as boolean
    const minValue = (values.minValue as number) ?? 0
    const maxValue = (values.maxValue as number) ?? 9999
    const errorHandling = (values.errorHandling as string) || 'warning'

    const lines: string[] = []

    // Header comment
    lines.push(`// Plugin Command with Validation: ${commandName}`)
    lines.push('// Includes input validation and error handling')
    lines.push('')

    // Error handling helper
    lines.push('// Error handling helper')
    switch (errorHandling) {
      case 'silent':
        lines.push(`function ${commandName}_handleError(message) {`)
        lines.push(`    console.log('[${pluginName}] ' + message);`)
        lines.push('    return false;')
        lines.push('}')
        break
      case 'throw':
        lines.push(`function ${commandName}_handleError(message) {`)
        lines.push(`    throw new Error('[${pluginName}] ' + message);`)
        lines.push('}')
        break
      case 'warning':
      default:
        lines.push(`function ${commandName}_handleError(message) {`)
        lines.push(`    console.warn('[${pluginName}] ' + message);`)
        lines.push('    return false;')
        lines.push('}')
        break
    }
    lines.push('')

    // Validation helper
    lines.push('// Validation helper')
    lines.push(`function ${commandName}_validate(args) {`)

    if (validateActorId) {
      lines.push('    // Validate actor ID')
      lines.push('    const actorId = Number(args.actorId);')
      lines.push('    if (isNaN(actorId) || actorId < 1) {')
      lines.push(`        return ${commandName}_handleError('Invalid actor ID: ' + args.actorId);`)
      lines.push('    }')
      lines.push('    if (!$dataActors[actorId]) {')
      lines.push(`        return ${commandName}_handleError('Actor not found: ' + actorId);`)
      lines.push('    }')
      lines.push('')
    }

    if (validateNumberRange) {
      lines.push('    // Validate number range')
      lines.push('    const value = Number(args.value);')
      lines.push('    if (isNaN(value)) {')
      lines.push(`        return ${commandName}_handleError('Value must be a number: ' + args.value);`)
      lines.push('    }')
      lines.push(`    if (value < ${minValue} || value > ${maxValue}) {`)
      lines.push(`        return ${commandName}_handleError('Value out of range (${minValue}-${maxValue}): ' + value);`)
      lines.push('    }')
      lines.push('')
    }

    lines.push('    return true; // All validations passed')
    lines.push('}')
    lines.push('')

    // Command registration
    lines.push(`PluginManager.registerCommand('${pluginName}', '${commandName}', function(args) {`)
    lines.push('    // Run validation')
    lines.push(`    if (!${commandName}_validate(args)) {`)
    lines.push('        return; // Validation failed')
    lines.push('    }')
    lines.push('')
    lines.push('    // Parse validated arguments')

    if (validateActorId) {
      lines.push('    const actorId = Number(args.actorId);')
      lines.push('    const actor = $gameActors.actor(actorId);')
    }
    if (validateNumberRange) {
      lines.push('    const value = Number(args.value);')
    }

    lines.push('')
    lines.push('    // Your command logic here')

    if (validateActorId && validateNumberRange) {
      lines.push('    // Example: Set a stat on the actor')
      lines.push(`    console.log('Setting value', value, 'on actor', actor.name());`)
      lines.push('    // actor.setHp(value);  // Uncomment and modify as needed')
    } else if (validateActorId) {
      lines.push(`    console.log('Command executed for actor:', actor.name());`)
    } else if (validateNumberRange) {
      lines.push(`    console.log('Command executed with value:', value);`)
    } else {
      lines.push(`    console.log('${commandName} executed');`)
    }

    lines.push('});')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const commandName = values.commandName as string
    const pluginName = values.pluginName as string
    const validateNumberRange = values.validateNumberRange as boolean
    const minValue = values.minValue as number
    const maxValue = values.maxValue as number

    if (!commandName || !commandName.trim()) {
      errors.push('Command name is required')
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(commandName.trim())) {
      errors.push('Command name must be a valid identifier')
    }

    if (!pluginName || !pluginName.trim()) {
      errors.push('Plugin name is required')
    }

    if (validateNumberRange) {
      if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
        errors.push('Minimum value cannot be greater than maximum value')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register all templates when this module loads
registerTemplate(basicCommandTemplate)
registerTemplate(asyncCommandTemplate)
registerTemplate(validatedCommandTemplate)

export { basicCommandTemplate, asyncCommandTemplate, validatedCommandTemplate }
