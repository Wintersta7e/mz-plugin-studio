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
import { escapeJSString } from '../escape'
import { JS_RESERVED } from '../index'
import { definedOr, expectText, valueOr } from './values'

/**
 * Helper to generate argument parsing code
 */
function generateArgParsing(args: { name: string; type: unknown }[]): string[] {
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
function generateArgComment(args: { name: string; type: unknown; desc: string }[]): string[] {
  if (args.length === 0) return []

  const lines: string[] = ['// Arguments:']
  for (const arg of args) {
    lines.push(`//   ${arg.name} (${String(arg.type)}) - ${arg.desc}`)
  }
  return lines
}

// Globals the command's own code calls on each argument (String, Number, JSON.parse,
// console.log): an argument declared as `const <name>` with one of these names hides it
const COMMAND_GLOBALS: ReadonlySet<string> = new Set(['String', 'Number', 'JSON', 'console'])

// The argument names the command cannot declare, and a name both arguments share; compared
// trimmed, as the code is written with them trimmed
function argNameErrors(values: Record<string, unknown>): string[] {
  const names = [values['arg1Name'], values['arg2Name']].map((name) =>
    typeof name === 'string' ? name.trim() : ''
  )
  const errors: string[] = []
  for (const [index, name] of names.entries()) {
    if (JS_RESERVED.has(name) || COMMAND_GLOBALS.has(name)) {
      errors.push(
        `Argument ${index + 1} name "${name}" is reserved in JavaScript or used by the command's own code`
      )
    }
  }
  if (names[0] !== '' && names[0] === names[1]) {
    errors.push('Argument 1 and argument 2 need different names')
  }
  return errors
}

// The command and plugin name checks every command template runs first; `identifierError` is the
// template's message for a command name that is not an identifier
function commandNameErrors(values: Record<string, unknown>, identifierError: string): string[] {
  const errors: string[] = []
  const commandName = values['commandName']
  const hasCommandName = Boolean(commandName)
  if (hasCommandName && !expectText(commandName).trim()) {
    errors.push('Command name is required')
  } else if (hasCommandName && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expectText(commandName).trim())) {
    errors.push(identifierError)
  }

  const pluginName = values['pluginName']
  const hasPluginName = Boolean(pluginName)
  if (hasPluginName && !expectText(pluginName).trim()) {
    errors.push('Plugin name is required')
  }
  return errors
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
    // The check reads the name trimmed, so the code is written with the same text.
    const commandName = String(values['commandName'] ?? '').trim()
    const pluginName = values['pluginName']
    const arg1Name = values['arg1Name']
    const arg1Type = valueOr(values['arg1Type'], 'string')
    const arg2Name = values['arg2Name']
    const arg2Type = valueOr(values['arg2Type'], 'number')

    const lines: string[] = []

    // Build argument list
    const args: { name: string; type: unknown; desc: string }[] = []
    const hasArg1Name = Boolean(arg1Name)
    if (hasArg1Name && expectText(arg1Name).trim()) {
      args.push({ name: expectText(arg1Name).trim(), type: arg1Type, desc: 'First argument' })
    }
    const hasArg2Name = Boolean(arg2Name)
    if (hasArg2Name && expectText(arg2Name).trim()) {
      args.push({ name: expectText(arg2Name).trim(), type: arg2Type, desc: 'Second argument' })
    }

    // Header comment
    lines.push(`// Plugin Command: ${commandName}`)
    if (args.length > 0) {
      lines.push(...generateArgComment(args))
    }

    // Registration
    lines.push(
      `PluginManager.registerCommand('${escapeJSString(expectText(pluginName))}', '${escapeJSString(commandName)}', function(args) {`
    )

    // Argument parsing
    if (args.length > 0) {
      lines.push('    // Parse arguments')
      lines.push(...generateArgParsing(args))
      lines.push('')
    }

    // Command body
    lines.push('    // Your command logic here')
    if (args.length > 0) {
      const argList = args.map((a) => a.name).join(', ')
      lines.push(`    console.log('${escapeJSString(commandName)} called with:', ${argList});`)
    } else {
      lines.push(`    console.log('${escapeJSString(commandName)} called');`)
    }

    lines.push('});')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors = commandNameErrors(
      values,
      'Command name must be a valid identifier (letters, numbers, underscores, cannot start with a number)'
    )

    // Validate argument names if provided
    const arg1Name = values['arg1Name']
    const arg2Name = values['arg2Name']

    const hasArg1Name = Boolean(arg1Name)
    if (
      hasArg1Name &&
      expectText(arg1Name).trim() &&
      !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expectText(arg1Name).trim())
    ) {
      errors.push('Argument 1 name must be a valid identifier')
    }

    const hasArg2Name = Boolean(arg2Name)
    if (
      hasArg2Name &&
      expectText(arg2Name).trim() &&
      !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expectText(arg2Name).trim())
    ) {
      errors.push('Argument 2 name must be a valid identifier')
    }

    errors.push(...argNameErrors(values))

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
    // The check reads the name trimmed, so the code is written with the same text.
    const commandName = String(values['commandName'] ?? '').trim()
    const pluginName = values['pluginName']
    const waitType = valueOr(values['waitType'], 'callback')
    const waitDuration = valueOr(values['waitDuration'], 60)

    const lines: string[] = []

    // Header comment
    lines.push(`// Async Plugin Command: ${commandName}`)
    lines.push('// This command pauses event execution until the async operation completes')
    lines.push('')

    switch (waitType) {
      case 'setWaitMode':
        // setWaitMode approach - custom wait mode
        lines.push('// Custom wait mode for async operation')
        lines.push(
          `const _Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;`
        )
        lines.push('Game_Interpreter.prototype.updateWaitMode = function() {')
        lines.push(`    if (this._waitMode === '${escapeJSString(commandName)}') {`)
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
        lines.push(
          `PluginManager.registerCommand('${escapeJSString(expectText(pluginName))}', '${escapeJSString(commandName)}', function(args) {`
        )
        lines.push('    const interpreter = this;')
        lines.push(`    interpreter.setWaitMode('${escapeJSString(commandName)}');`)
        lines.push('')
        lines.push('    // Your async operation here')
        lines.push('    setTimeout(() => {')
        lines.push('        // Simulate async work completing')
        lines.push(
          `        console.log('${escapeJSString(commandName)} async operation complete');`
        )
        lines.push(`        interpreter._${commandName}Complete = true;`)
        lines.push('    }, 1000); // Example: 1 second delay')
        lines.push('});')
        break

      case 'waitCount':
        // Simple frame wait
        lines.push(
          `PluginManager.registerCommand('${escapeJSString(expectText(pluginName))}', '${escapeJSString(commandName)}', function(args) {`
        )
        lines.push('    const interpreter = this;')
        lines.push('')
        lines.push(
          `    // Wait for ${String(waitDuration)} frames (${Math.round((Number(waitDuration) / 60) * 100) / 100} seconds at 60fps)`
        )
        lines.push(`    interpreter.wait(${String(waitDuration)});`)
        lines.push('')
        lines.push('    // Your command logic here')
        lines.push('    // Note: Code here runs immediately, wait only affects event flow')
        lines.push(
          `    console.log('${escapeJSString(commandName)} initiated ${String(waitDuration)} frame wait');`
        )
        lines.push('});')
        break

      case 'callback':
      default:
        // Per-interpreter pending flag — storing on `this` (the Game_Interpreter
        // instance) is save-safe against parallel events and nested interpreters.
        // A module-scope flag would collide when two parallel events fire the
        // same async command concurrently.
        lines.push(`// Per-interpreter pending flag — keyed on the interpreter instance`)
        lines.push(`const _${commandName}PendingKey = '_${commandName}Pending';`)
        lines.push('')
        lines.push('// Check if the invoking interpreter should keep waiting')
        lines.push('const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;')
        lines.push('Game_Interpreter.prototype.updateWait = function() {')
        lines.push(`    if (this[_${commandName}PendingKey]) {`)
        lines.push('        return true; // Keep waiting')
        lines.push('    }')
        lines.push('    return _Game_Interpreter_updateWait.call(this);')
        lines.push('};')
        lines.push('')
        lines.push(
          `PluginManager.registerCommand('${escapeJSString(expectText(pluginName))}', '${escapeJSString(commandName)}', function(args) {`
        )
        lines.push('    const interpreter = this;')
        lines.push(`    interpreter[_${commandName}PendingKey] = true;`)
        lines.push('')
        lines.push('    // Your async operation here (e.g., fetch, image loading, etc.)')
        lines.push('    setTimeout(() => {')
        lines.push('        // Async work complete')
        lines.push(
          `        console.log('${escapeJSString(commandName)} async operation complete');`
        )
        lines.push(`        interpreter[_${commandName}PendingKey] = false;`)
        lines.push('    }, 1000); // Example: 1 second delay')
        lines.push('});')
        break
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors = commandNameErrors(values, 'Command name must be a valid identifier')

    const waitType = values['waitType']
    const waitDuration = values['waitDuration']

    if (waitType === 'waitCount') {
      if (waitDuration === undefined || Number(waitDuration) < 1) {
        errors.push('Wait duration must be at least 1 frame')
      } else if (Number(waitDuration) > 3600) {
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
    // The check reads the name trimmed, so the code is written with the same text.
    const commandName = String(values['commandName'] ?? '').trim()
    const pluginName = values['pluginName']
    const validateActorId = Boolean(values['validateActorId'])
    const validateNumberRange = Boolean(values['validateNumberRange'])
    const minValue = definedOr(values['minValue'], 0)
    const maxValue = definedOr(values['maxValue'], 9999)
    const errorHandling = valueOr(values['errorHandling'], 'warning')

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
        lines.push(`    console.log('[${escapeJSString(expectText(pluginName))}] ' + message);`)
        lines.push('    return false;')
        lines.push('}')
        break
      case 'throw':
        lines.push(`function ${commandName}_handleError(message) {`)
        lines.push(`    throw new Error('[${escapeJSString(expectText(pluginName))}] ' + message);`)
        lines.push('}')
        break
      case 'warning':
      default:
        lines.push(`function ${commandName}_handleError(message) {`)
        lines.push(`    console.warn('[${escapeJSString(expectText(pluginName))}] ' + message);`)
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
      lines.push(
        `        return ${commandName}_handleError('Value must be a number: ' + args.value);`
      )
      lines.push('    }')
      lines.push(`    if (value < ${String(minValue)} || value > ${String(maxValue)}) {`)
      lines.push(
        `        return ${commandName}_handleError('Value out of range (${String(minValue)}-${String(maxValue)}): ' + value);`
      )
      lines.push('    }')
      lines.push('')
    }

    lines.push('    return true; // All validations passed')
    lines.push('}')
    lines.push('')

    // Command registration
    lines.push(
      `PluginManager.registerCommand('${escapeJSString(expectText(pluginName))}', '${escapeJSString(commandName)}', function(args) {`
    )
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
      lines.push(`    console.log('${escapeJSString(commandName)} executed');`)
    }

    lines.push('});')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors = commandNameErrors(values, 'Command name must be a valid identifier')

    const validateNumberRange = Boolean(values['validateNumberRange'])
    const minValue = values['minValue']
    const maxValue = values['maxValue']

    if (validateNumberRange) {
      if (minValue !== undefined && maxValue !== undefined && Number(minValue) > Number(maxValue)) {
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
