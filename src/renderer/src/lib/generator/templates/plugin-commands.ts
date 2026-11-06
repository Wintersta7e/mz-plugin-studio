/**
Plugin Command Templates

Templates for creating RPG Maker MZ plugin commands:
- Basic plugin command registration with arguments
- Async command with interpreter wait
- Command with input validation and error handling
*/

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'
import { escapeJSString } from '../escape'
import { JS_RESERVED } from '../index'
import { definedOr, expectText, valueOr } from './values'

/**
The line that reads one argument as its type; text and any unknown type read as a string.
*/
function argParsingLine(arg: { name: string; type: unknown }): string {
  switch (arg.type) {
    case 'number': {
      return `    const ${arg.name} = Number(args.${arg.name});`
    }
    case 'boolean': {
      return `    const ${arg.name} = args.${arg.name} === 'true';`
    }
    case 'json': {
      return `    const ${arg.name} = JSON.parse(args.${arg.name});`
    }
    default: {
      return `    const ${arg.name} = String(args.${arg.name});`
    }
  }
}

/**
Helper to generate argument parsing code
*/
function generateArgParsing(args: { name: string; type: unknown }[]): string[] {
  return args.map((arg) => argParsingLine(arg))
}

/**
The command name as the code writes it. The check reads the name trimmed, so the code is written
with the same text.
*/
function commandNameText(values: Record<string, unknown>): string {
  return String(definedOr(values['commandName'], '')).trim()
}

/**
Helper to generate argument info comment
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
  } else if (hasCommandName && !/^[a-z_]\w*$/i.test(expectText(commandName).trim())) {
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
Template 1: Basic Plugin Command
Simple command registration with arguments
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
    const commandName = commandNameText(values)
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
      !/^[a-z_]\w*$/i.test(expectText(arg1Name).trim())
    ) {
      errors.push('Argument 1 name must be a valid identifier')
    }

    const hasArg2Name = Boolean(arg2Name)
    if (
      hasArg2Name &&
      expectText(arg2Name).trim() &&
      !/^[a-z_]\w*$/i.test(expectText(arg2Name).trim())
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
The async command that waits on a custom wait mode until its operation completes.
*/
function setWaitModeLines(commandName: string, pluginName: unknown): string[] {
  return [
    // setWaitMode approach - custom wait mode
    '// Custom wait mode for async operation',
    `const _Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;`,
    'Game_Interpreter.prototype.updateWaitMode = function() {',
    `    if (this._waitMode === '${escapeJSString(commandName)}') {`,
    `        if (!this._${commandName}Complete) {`,
    '            return true; // Keep waiting',
    '        }',
    `        this._${commandName}Complete = false;`,
    `        this._waitMode = '';`,
    '        return false; // Done waiting',
    '    }',
    '    return _Game_Interpreter_updateWaitMode.call(this);',
    '};',
    '',
    `PluginManager.registerCommand('${escapeJSString(expectText(pluginName))}', '${escapeJSString(commandName)}', function(args) {`,
    '    const interpreter = this;',
    `    interpreter.setWaitMode('${escapeJSString(commandName)}');`,
    '',
    '    // Your async operation here',
    '    setTimeout(() => {',
    '        // Simulate async work completing',
    `        console.log('${escapeJSString(commandName)} async operation complete');`,
    `        interpreter._${commandName}Complete = true;`,
    '    }, 1000); // Example: 1 second delay',
    '});'
  ]
}

/**
The async command that waits a number of frames.
*/
function waitCountLines(commandName: string, pluginName: unknown, waitDuration: unknown): string[] {
  return [
    // Simple frame wait
    `PluginManager.registerCommand('${escapeJSString(expectText(pluginName))}', '${escapeJSString(commandName)}', function(args) {`,
    '    const interpreter = this;',
    '',
    `    // Wait for ${String(waitDuration)} frames (${Math.round((Number(waitDuration) / 60) * 100) / 100} seconds at 60fps)`,
    `    interpreter.wait(${String(waitDuration)});`,
    '',
    '    // Your command logic here',
    '    // Note: Code here runs immediately, wait only affects event flow',
    `    console.log('${escapeJSString(commandName)} initiated ${String(waitDuration)} frame wait');`,
    '});'
  ]
}

/**
The async command that keeps its interpreter waiting while a pending flag is set.
*/
function callbackWaitLines(commandName: string, pluginName: unknown): string[] {
  // Per-interpreter pending flag — storing on `this` (the Game_Interpreter
  // instance) is save-safe against parallel events and nested interpreters.
  // A module-scope flag would collide when two parallel events fire the
  // same async command concurrently.
  return [
    `// Per-interpreter pending flag — keyed on the interpreter instance`,
    `const _${commandName}PendingKey = '_${commandName}Pending';`,
    '',
    '// Check if the invoking interpreter should keep waiting',
    'const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;',
    'Game_Interpreter.prototype.updateWait = function() {',
    `    if (this[_${commandName}PendingKey]) {`,
    '        return true; // Keep waiting',
    '    }',
    '    return _Game_Interpreter_updateWait.call(this);',
    '};',
    '',
    `PluginManager.registerCommand('${escapeJSString(expectText(pluginName))}', '${escapeJSString(commandName)}', function(args) {`,
    '    const interpreter = this;',
    `    interpreter[_${commandName}PendingKey] = true;`,
    '',
    '    // Your async operation here (e.g., fetch, image loading, etc.)',
    '    setTimeout(() => {',
    '        // Async work complete',
    `        console.log('${escapeJSString(commandName)} async operation complete');`,
    `        interpreter[_${commandName}PendingKey] = false;`,
    '    }, 1000); // Example: 1 second delay',
    '});'
  ]
}

/**
The async command's code for its wait type; the callback wait is the default.
*/
function asyncWaitLines(
  waitType: unknown,
  commandName: string,
  pluginName: unknown,
  waitDuration: unknown
): string[] {
  switch (waitType) {
    case 'setWaitMode': {
      return setWaitModeLines(commandName, pluginName)
    }
    case 'waitCount': {
      return waitCountLines(commandName, pluginName, waitDuration)
    }
    default: {
      return callbackWaitLines(commandName, pluginName)
    }
  }
}

/**
Template 2: Async Command with Wait
Command that uses async/await with interpreter wait
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
    const commandName = commandNameText(values)
    const pluginName = values['pluginName']
    const waitType = valueOr(values['waitType'], 'callback')
    const waitDuration = valueOr(values['waitDuration'], 60)

    return [
      `// Async Plugin Command: ${commandName}`,
      '// This command pauses event execution until the async operation completes',
      '',
      ...asyncWaitLines(waitType, commandName, pluginName, waitDuration)
    ].join('\n')
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
The validated command's error handler for its error handling mode; a warning is the default.
*/
function errorHandlerLines(
  errorHandling: unknown,
  commandName: string,
  pluginName: unknown
): string[] {
  switch (errorHandling) {
    case 'silent': {
      return [
        `function ${commandName}_handleError(message) {`,
        `    console.log('[${escapeJSString(expectText(pluginName))}] ' + message);`,
        '    return false;',
        '}'
      ]
    }
    case 'throw': {
      return [
        `function ${commandName}_handleError(message) {`,
        `    throw new Error('[${escapeJSString(expectText(pluginName))}] ' + message);`,
        '}'
      ]
    }
    default: {
      return [
        `function ${commandName}_handleError(message) {`,
        `    console.warn('[${escapeJSString(expectText(pluginName))}] ' + message);`,
        '    return false;',
        '}'
      ]
    }
  }
}

/**
The checks the validated command runs before its logic: an actor ID that exists, a number in range.
*/
interface CommandChecks {
  isValidateActorId: boolean
  isValidateNumberRange: boolean
  minValue: unknown
  maxValue: unknown
}

/**
The validated command's validation helper, with the checks it is set to run.
*/
function validationHelperLines(commandName: string, checks: CommandChecks): string[] {
  const lines = ['// Validation helper', `function ${commandName}_validate(args) {`]

  if (checks.isValidateActorId) {
    lines.push(
      '    // Validate actor ID',
      '    const actorId = Number(args.actorId);',
      '    if (isNaN(actorId) || actorId < 1) {',
      `        return ${commandName}_handleError('Invalid actor ID: ' + args.actorId);`,
      '    }',
      '    if (!$dataActors[actorId]) {',
      `        return ${commandName}_handleError('Actor not found: ' + actorId);`,
      '    }',
      ''
    )
  }

  if (checks.isValidateNumberRange) {
    const minValue = String(checks.minValue)
    const maxValue = String(checks.maxValue)
    lines.push(
      '    // Validate number range',
      '    const value = Number(args.value);',
      '    if (isNaN(value)) {',
      `        return ${commandName}_handleError('Value must be a number: ' + args.value);`,
      '    }',
      `    if (value < ${minValue} || value > ${maxValue}) {`,
      `        return ${commandName}_handleError('Value out of range (${minValue}-${maxValue}): ' + value);`,
      '    }',
      ''
    )
  }

  lines.push('    return true; // All validations passed', '}', '')
  return lines
}

/**
The validated command's own logic: an example that uses the arguments its checks read.
*/
function commandLogicLines(commandName: string, checks: CommandChecks): string[] {
  if (checks.isValidateActorId && checks.isValidateNumberRange) {
    return [
      '    // Example: Set a stat on the actor',
      `    console.log('Setting value', value, 'on actor', actor.name());`,
      '    // actor.setHp(value);  // Uncomment and modify as needed'
    ]
  }
  if (checks.isValidateActorId) {
    return [`    console.log('Command executed for actor:', actor.name());`]
  }
  if (checks.isValidateNumberRange) {
    return [`    console.log('Command executed with value:', value);`]
  }
  return [`    console.log('${escapeJSString(commandName)} executed');`]
}

/**
Template 3: Command with Validation
Command with input validation and error handling
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
    const commandName = commandNameText(values)
    const pluginName = values['pluginName']
    const checks: CommandChecks = {
      isValidateActorId: Boolean(values['validateActorId']),
      isValidateNumberRange: Boolean(values['validateNumberRange']),
      minValue: definedOr(values['minValue'], 0),
      maxValue: definedOr(values['maxValue'], 9999)
    }
    const errorHandling = valueOr(values['errorHandling'], 'warning')

    const lines: string[] = [
      `// Plugin Command with Validation: ${commandName}`,
      '// Includes input validation and error handling',
      '',
      '// Error handling helper',
      ...errorHandlerLines(errorHandling, commandName, pluginName),
      '',
      ...validationHelperLines(commandName, checks),
      // Command registration
      `PluginManager.registerCommand('${escapeJSString(expectText(pluginName))}', '${escapeJSString(commandName)}', function(args) {`,
      '    // Run validation',
      `    if (!${commandName}_validate(args)) {`,
      '        return; // Validation failed',
      '    }',
      '',
      '    // Parse validated arguments'
    ]

    if (checks.isValidateActorId) {
      lines.push(
        '    const actorId = Number(args.actorId);',
        '    const actor = $gameActors.actor(actorId);'
      )
    }
    if (checks.isValidateNumberRange) {
      lines.push('    const value = Number(args.value);')
    }

    lines.push(
      '',
      '    // Your command logic here',
      ...commandLogicLines(commandName, checks),
      '});'
    )

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors = commandNameErrors(values, 'Command name must be a valid identifier')

    const isValidateNumberRange = Boolean(values['validateNumberRange'])
    const minValue = values['minValue']
    const maxValue = values['maxValue']

    if (
      isValidateNumberRange &&
      minValue !== undefined &&
      maxValue !== undefined &&
      Number(minValue) > Number(maxValue)
    ) {
      errors.push('Minimum value cannot be greater than maximum value')
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
