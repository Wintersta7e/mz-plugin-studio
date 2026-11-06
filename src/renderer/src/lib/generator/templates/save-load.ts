/**
Save/Load Template

Generates code for persisting custom data in RPG Maker MZ save files.
Data is automatically saved and loaded with the game's save system.
*/

import { registerTemplate } from './index'
import type { CodeTemplate } from './types'
import { defaultLiteralOf, expectText, toPascalCase, valueOr } from './values'

/**
Generate the save/load code
*/
function generateSaveLoadCode(
  name: unknown,
  storageLocation: string,
  dataType: unknown,
  defaultValue: unknown
): string {
  const pascalName = toPascalCase(name)
  // Only written into the code as text
  const dataName = String(name)
  const aliasName = `_${storageLocation}_initialize`
  const defaultLiteral = defaultLiteralOf(dataType, defaultValue)

  return [
    `// Custom Save Data: ${dataName}`,
    // Header comment
    `// Storage: $${storageLocation.replace('Game_', 'game').toLowerCase()}`,
    `// Type: ${String(dataType)}`,
    ...storageWarningLines(storageLocation),
    '',
    // Store original initialize reference
    `const ${aliasName} = ${storageLocation}.prototype.initialize;`,
    // Alias initialize to add custom property
    `${storageLocation}.prototype.initialize = function() {`,
    `    ${aliasName}.call(this);`,
    `    this.${dataName} = ${defaultLiteral};`,
    '};',
    '',
    // Generate getter method
    `// Getter: $${storageLocation.replace('Game_', 'game').toLowerCase()}.get${pascalName}()`,
    `${storageLocation}.prototype.get${pascalName} = function() {`,
    `    return this.${dataName};`,
    '};',
    '',
    // Generate setter method
    `// Setter: $${storageLocation.replace('Game_', 'game').toLowerCase()}.set${pascalName}(value)`,
    `${storageLocation}.prototype.set${pascalName} = function(value) {`,
    `    this.${dataName} = value;`,
    '};',
    // Add type-specific helper methods
    ...typeHelperLines(dataType, storageLocation, dataName, pascalName)
  ].join('\n')
}

/**
The warning for a storage location that does not keep its data across a save or a map change.
*/
function storageWarningLines(storageLocation: string): string[] {
  if (storageLocation === 'Game_Actors') {
    return [
      '//',
      '// ⚠  WARNING: Game_Actors is a CONTAINER — DataManager does not',
      '//    round-trip properties set on the container itself. Data written',
      '//    here in initialize() will be lost on save reload. Move persistent',
      '//    data to Game_System, or store per-actor data on Game_Actor objects.'
    ]
  }
  if (storageLocation === 'Game_Map') {
    return [
      '//',
      '// ⚠  WARNING: Game_Map is reinitialized on every map transfer.',
      '//    Data written here will be lost whenever the player changes maps.',
      '//    Use Game_System if you need data to survive across maps.'
    ]
  }
  return []
}

/**
The helper methods of a data type; other types have none.
*/
function typeHelperLines(
  dataType: unknown,
  storageLocation: string,
  dataName: string,
  pascalName: string
): string[] {
  switch (dataType) {
    case 'object': {
      return [
        '',
        `// Get a property from the ${dataName} object`,
        `${storageLocation}.prototype.get${pascalName}Value = function(key) {`,
        `    return this.${dataName}[key];`,
        '};',
        '',
        `// Set a property on the ${dataName} object`,
        `${storageLocation}.prototype.set${pascalName}Value = function(key, value) {`,
        `    this.${dataName}[key] = value;`,
        '};'
      ]
    }
    case 'array': {
      return [
        '',
        `// Add an item to the ${dataName} array`,
        `${storageLocation}.prototype.add${pascalName}Item = function(item) {`,
        `    this.${dataName}.push(item);`,
        '};',
        '',
        `// Remove an item from the ${dataName} array by index`,
        `${storageLocation}.prototype.remove${pascalName}Item = function(index) {`,
        `    this.${dataName}.splice(index, 1);`,
        '};',
        '',
        `// Clear all items from the ${dataName} array`,
        `${storageLocation}.prototype.clear${pascalName} = function() {`,
        `    this.${dataName} = [];`,
        '};'
      ]
    }
    case 'number': {
      return [
        '',
        `// Add to the ${dataName} value`,
        `${storageLocation}.prototype.add${pascalName} = function(amount) {`,
        `    this.${dataName} += amount;`,
        '};'
      ]
    }
    case 'boolean': {
      return [
        '',
        `// Toggle the ${dataName} value`,
        `${storageLocation}.prototype.toggle${pascalName} = function() {`,
        `    this.${dataName} = !this.${dataName};`,
        '};'
      ]
    }
    default: {
      return []
    }
  }
}

/**
The errors of a data property name that is set: it must be a JavaScript identifier, and a name the
storage classes already use is warned about.
*/
function dataNameErrors(dataName: unknown): string[] {
  const errors: string[] = []

  // Check for valid JavaScript identifier
  if (!/^[a-z_$][\w$]*$/i.test(String(dataName))) {
    errors.push('Data Property Name must be a valid JavaScript identifier (letters, numbers, _, $)')
  }

  // Warn about reserved words
  const reservedWords = ['initialize', 'update', 'create', 'setup', 'clear', 'data', 'save', 'load']
  if (reservedWords.includes(expectText(dataName).toLowerCase())) {
    errors.push(
      `"${String(dataName)}" may conflict with existing methods. Consider a more specific name.`
    )
  }

  return errors
}

/**
The errors of a default value that is set, checked against its data type. A value of another type
than text throws `TypeError` where a string method is called on it.
*/
function defaultValueErrors(dataType: unknown, defaultValue: unknown): string[] {
  switch (dataType) {
    case 'object': {
      return expectText(defaultValue).trimStart().startsWith('{')
        ? []
        : ['Default value for object should be JSON format starting with {']
    }
    case 'array': {
      return expectText(defaultValue).trimStart().startsWith('[')
        ? []
        : ['Default value for array should be JSON format starting with [']
    }
    case 'number': {
      return Number.isNaN(Number(defaultValue))
        ? ['Default value for number must be a valid number']
        : []
    }
    case 'boolean': {
      return ['true', 'false'].includes(expectText(defaultValue).toLowerCase())
        ? []
        : ['Default value for boolean must be true or false']
    }
    default: {
      return []
    }
  }
}

const saveLoadTemplate: CodeTemplate = {
  id: 'save-load-basic',
  category: 'save-load',
  name: 'Custom Save Data',
  description: 'Add custom data that persists in save files',
  icon: 'Save',
  fields: [
    {
      id: 'dataName',
      label: 'Data Property Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., questProgress',
      help: 'Name for the property (camelCase recommended)'
    },
    {
      id: 'storageLocation',
      label: 'Storage Location',
      type: 'select',
      required: true,
      options: [
        {
          value: 'Game_System',
          label: '$gameSystem — Global state (save-persistent, RECOMMENDED)'
        },
        { value: 'Game_Party', label: '$gameParty — Party-wide data (save-persistent)' },
        { value: 'Game_Player', label: '$gamePlayer — Player data (save-persistent)' },
        {
          value: 'Game_Map',
          label: '⚠ Game_Map — Reinitialized on every map change (NOT persistent)'
        },
        {
          value: 'Game_Actors',
          label: '⚠ Game_Actors — Container not round-tripped (NOT persistent)'
        }
      ],
      default: 'Game_System',
      help: 'Where to store the data. Only Game_System/Game_Party/Game_Player are reliably save-persistent. Game_Map is rebuilt on every map load, and Game_Actors is not round-tripped by DataManager — properties set in initialize() will be lost on save reload.'
    },
    {
      id: 'dataType',
      label: 'Data Type',
      type: 'select',
      required: true,
      options: [
        { value: 'object', label: 'Object {} - Key-value pairs' },
        { value: 'array', label: 'Array [] - Ordered list' },
        { value: 'number', label: 'Number - Numeric value' },
        { value: 'string', label: 'String - Text value' },
        { value: 'boolean', label: 'Boolean - True/false flag' }
      ],
      default: 'object',
      help: 'Type of data to store. Objects and arrays can hold complex nested data.'
    },
    {
      id: 'defaultValue',
      label: 'Default Value',
      type: 'text',
      placeholder: 'e.g., {} or [] or 0',
      help: 'Initial value (JSON format for objects/arrays). Leave empty for type default.'
    }
  ],
  generate: (values): string => {
    const dataName = values['dataName']
    // The code calls a string method on the location before it writes anything, so any value
    // but text fails here as it fails there
    const storageLocation = expectText(valueOr(values['storageLocation'], 'Game_System'))
    const dataType = valueOr(values['dataType'], 'object')
    const defaultValue = values['defaultValue']

    return generateSaveLoadCode(dataName, storageLocation, dataType, defaultValue)
  },
  validate: (values) => {
    const errors: string[] = []

    const dataName: unknown = values['dataName']
    const hasDataName = Boolean(dataName)
    if (hasDataName) {
      errors.push(...dataNameErrors(dataName))
    }

    // Validate default value format based on type
    const defaultValue = values['defaultValue']
    const dataType = values['dataType']
    const hasDefaultValue = Boolean(defaultValue)
    const hasDataType = Boolean(dataType)
    if (hasDefaultValue && hasDataType) {
      try {
        errors.push(...defaultValueErrors(dataType, defaultValue))
      } catch {
        errors.push('Invalid default value format')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register the template when this module loads
registerTemplate(saveLoadTemplate)
