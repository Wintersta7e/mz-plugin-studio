/**
 * Save/Load Template
 *
 * Generates code for persisting custom data in RPG Maker MZ save files.
 * Data is automatically saved and loaded with the game's save system.
 */

import { registerTemplate } from './index'
import type { CodeTemplate } from './types'

/**
 * Convert a property name to PascalCase for method names
 * e.g., "questProgress" -> "QuestProgress"
 */
function toPascalCase(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Get the appropriate default value literal based on data type
 */
function getDefaultLiteral(dataType: string, customDefault?: string): string {
  // If user provided a custom default, use it (with validation)
  if (customDefault !== undefined && customDefault !== '') {
    return customDefault
  }

  // Return type-appropriate defaults
  switch (dataType) {
    case 'object':
      return '{}'
    case 'array':
      return '[]'
    case 'number':
      return '0'
    case 'string':
      return '""'
    case 'boolean':
      return 'false'
    default:
      return 'null'
  }
}

/**
 * Generate the save/load code
 */
function generateSaveLoadCode(
  dataName: string,
  storageLocation: string,
  dataType: string,
  defaultValue?: string
): string {
  const pascalName = toPascalCase(dataName)
  const aliasName = `_${storageLocation}_initialize`
  const defaultLiteral = getDefaultLiteral(dataType, defaultValue)
  const lines: string[] = []

  // Header comment
  lines.push(`// Custom Save Data: ${dataName}`)
  lines.push(`// Storage: $${storageLocation.replace('Game_', 'game').toLowerCase()}`)
  lines.push(`// Type: ${dataType}`)
  lines.push('')

  // Store original initialize reference
  lines.push(`const ${aliasName} = ${storageLocation}.prototype.initialize;`)

  // Alias initialize to add custom property
  lines.push(`${storageLocation}.prototype.initialize = function() {`)
  lines.push(`    ${aliasName}.call(this);`)
  lines.push(`    this.${dataName} = ${defaultLiteral};`)
  lines.push('};')
  lines.push('')

  // Generate getter method
  lines.push(`// Getter: $${storageLocation.replace('Game_', 'game').toLowerCase()}.get${pascalName}()`)
  lines.push(`${storageLocation}.prototype.get${pascalName} = function() {`)
  lines.push(`    return this.${dataName};`)
  lines.push('};')
  lines.push('')

  // Generate setter method
  lines.push(`// Setter: $${storageLocation.replace('Game_', 'game').toLowerCase()}.set${pascalName}(value)`)
  lines.push(`${storageLocation}.prototype.set${pascalName} = function(value) {`)
  lines.push(`    this.${dataName} = value;`)
  lines.push('};')

  // Add type-specific helper methods
  if (dataType === 'object') {
    lines.push('')
    lines.push(`// Get a property from the ${dataName} object`)
    lines.push(`${storageLocation}.prototype.get${pascalName}Value = function(key) {`)
    lines.push(`    return this.${dataName}[key];`)
    lines.push('};')
    lines.push('')
    lines.push(`// Set a property on the ${dataName} object`)
    lines.push(`${storageLocation}.prototype.set${pascalName}Value = function(key, value) {`)
    lines.push(`    this.${dataName}[key] = value;`)
    lines.push('};')
  } else if (dataType === 'array') {
    lines.push('')
    lines.push(`// Add an item to the ${dataName} array`)
    lines.push(`${storageLocation}.prototype.add${pascalName}Item = function(item) {`)
    lines.push(`    this.${dataName}.push(item);`)
    lines.push('};')
    lines.push('')
    lines.push(`// Remove an item from the ${dataName} array by index`)
    lines.push(`${storageLocation}.prototype.remove${pascalName}Item = function(index) {`)
    lines.push(`    this.${dataName}.splice(index, 1);`)
    lines.push('};')
    lines.push('')
    lines.push(`// Clear all items from the ${dataName} array`)
    lines.push(`${storageLocation}.prototype.clear${pascalName} = function() {`)
    lines.push(`    this.${dataName} = [];`)
    lines.push('};')
  } else if (dataType === 'number') {
    lines.push('')
    lines.push(`// Add to the ${dataName} value`)
    lines.push(`${storageLocation}.prototype.add${pascalName} = function(amount) {`)
    lines.push(`    this.${dataName} += amount;`)
    lines.push('};')
  } else if (dataType === 'boolean') {
    lines.push('')
    lines.push(`// Toggle the ${dataName} value`)
    lines.push(`${storageLocation}.prototype.toggle${pascalName} = function() {`)
    lines.push(`    this.${dataName} = !this.${dataName};`)
    lines.push('};')
  }

  return lines.join('\n')
}

const saveLoadTemplate: CodeTemplate = {
  id: 'save-load-basic',
  category: 'save-load',
  name: 'Custom Save Data',
  description: 'Add custom data that persists in save files',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/DataManager.html',
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
        { value: 'Game_System', label: '$gameSystem - Global game state' },
        { value: 'Game_Party', label: '$gameParty - Party-wide data' },
        { value: 'Game_Player', label: '$gamePlayer - Player-specific data' },
        { value: 'Game_Map', label: '$gameMap - Current map data (resets on map change)' },
        { value: 'Game_Actors', label: '$gameActors - Actor container' }
      ],
      default: 'Game_System',
      help: 'Where to store the data. $gameSystem is recommended for most use cases.'
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
    const dataName = values.dataName as string
    const storageLocation = (values.storageLocation as string) || 'Game_System'
    const dataType = (values.dataType as string) || 'object'
    const defaultValue = values.defaultValue as string | undefined

    return generateSaveLoadCode(dataName, storageLocation, dataType, defaultValue)
  },
  validate: (values) => {
    const errors: string[] = []

    if (!values.dataName) {
      errors.push('Data Property Name is required')
    } else {
      const dataName = values.dataName as string

      // Check for valid JavaScript identifier
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(dataName)) {
        errors.push('Data Property Name must be a valid JavaScript identifier (letters, numbers, _, $)')
      }

      // Warn about reserved words
      const reservedWords = [
        'initialize',
        'update',
        'create',
        'setup',
        'clear',
        'data',
        'save',
        'load'
      ]
      if (reservedWords.includes(dataName.toLowerCase())) {
        errors.push(`"${dataName}" may conflict with existing methods. Consider a more specific name.`)
      }
    }

    // Validate default value format based on type
    if (values.defaultValue && values.dataType) {
      const defaultValue = values.defaultValue as string
      const dataType = values.dataType as string

      try {
        switch (dataType) {
          case 'object':
            if (defaultValue && !defaultValue.trim().startsWith('{')) {
              errors.push('Default value for object should be JSON format starting with {')
            }
            break
          case 'array':
            if (defaultValue && !defaultValue.trim().startsWith('[')) {
              errors.push('Default value for array should be JSON format starting with [')
            }
            break
          case 'number':
            if (defaultValue && isNaN(Number(defaultValue))) {
              errors.push('Default value for number must be a valid number')
            }
            break
          case 'boolean':
            if (defaultValue && !['true', 'false'].includes(defaultValue.toLowerCase())) {
              errors.push('Default value for boolean must be true or false')
            }
            break
        }
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

export { saveLoadTemplate }
