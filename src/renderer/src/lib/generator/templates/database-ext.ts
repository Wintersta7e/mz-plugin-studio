/**
 * Database Extension Template - Notetag Parser
 *
 * Generates code for parsing custom notetags from RPG Maker MZ database entries.
 * Notetags are custom metadata added to the note field of database items.
 */

import { registerTemplate } from './index'
import type { CodeTemplate } from './types'

/**
 * Convert a string to camelCase
 * e.g., "CustomDamage" -> "customDamage"
 */
function toCamelCase(str: string): string {
  if (!str) return ''
  return str.charAt(0).toLowerCase() + str.slice(1)
}

/**
 * Convert a string to PascalCase
 * e.g., "customDamage" -> "CustomDamage"
 */
function toPascalCase(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Get the friendly name for a database type
 * e.g., "$dataItems" -> "Items"
 */
function getDatabaseName(dbType: string): string {
  const names: Record<string, string> = {
    $dataActors: 'Actors',
    $dataClasses: 'Classes',
    $dataSkills: 'Skills',
    $dataItems: 'Items',
    $dataWeapons: 'Weapons',
    $dataArmors: 'Armors',
    $dataEnemies: 'Enemies',
    $dataStates: 'States',
    $dataTilesets: 'Tilesets',
    $dataCommonEvents: 'CommonEvents',
    $dataMapInfos: 'MapInfos'
  }
  return names[dbType] || dbType.replace('$data', '')
}

/**
 * Get the type-appropriate default value literal
 */
function getDefaultLiteral(valueType: string, customDefault?: string): string {
  if (customDefault !== undefined && customDefault !== '') {
    return customDefault
  }

  switch (valueType) {
    case 'number':
      return '0'
    case 'string':
      return '""'
    case 'boolean':
      return 'false'
    case 'array':
      return '[]'
    default:
      return 'null'
  }
}

/**
 * Generate the regex pattern based on tag format
 */
function generateRegexPattern(tagName: string, tagFormat: string): string {
  switch (tagFormat) {
    case 'simple':
      return `/<${tagName}:\\s*(.+?)>/i`
    case 'boolean':
      return `/<${tagName}>/i`
    case 'keyValue':
      return `/<${tagName}\\s+(\\w+):\\s*(.+?)>/gi`
    case 'multiline':
      return `/<${tagName}>([\\s\\S]*?)<\\/${tagName}>/i`
    default:
      return `/<${tagName}:\\s*(.+?)>/i`
  }
}

/**
 * Generate the value parsing code based on value type
 */
function generateValueParser(valueType: string, matchVar: string): string {
  switch (valueType) {
    case 'number':
      return `Number(${matchVar})`
    case 'string':
      return `String(${matchVar}).trim()`
    case 'boolean':
      return `${matchVar}.toLowerCase() === 'true'`
    case 'array':
      return `${matchVar}.split(',').map(s => s.trim())`
    default:
      return matchVar
  }
}

/**
 * Generate the notetag parsing code
 */
function generateNotetagCode(
  databaseType: string,
  tagName: string,
  tagFormat: string,
  valueType: string,
  propertyName: string,
  defaultValue?: string
): string {
  const dbName = getDatabaseName(databaseType)
  const propName = propertyName || toCamelCase(tagName)
  const methodName = `process${toPascalCase(tagName)}Notetags`
  const defaultLiteral = getDefaultLiteral(valueType, defaultValue)
  const lines: string[] = []

  // Header comment with usage example
  lines.push(`// Notetag Parser: ${tagName}`)
  lines.push(`// Database: ${dbName} (${databaseType})`)
  lines.push(`// Access via: item.meta.${propName}`)
  lines.push('//')

  // Add format-specific usage examples
  switch (tagFormat) {
    case 'simple':
      lines.push(`// Usage: <${tagName}: value>`)
      lines.push(`// Example: <${tagName}: 50>`)
      break
    case 'boolean':
      lines.push(`// Usage: <${tagName}>`)
      lines.push(`// Presence of tag = true, absence = false`)
      break
    case 'keyValue':
      lines.push(`// Usage: <${tagName} key: value>`)
      lines.push(`// Example: <${tagName} fire: 50>`)
      lines.push(`// Multiple tags allowed per entry`)
      break
    case 'multiline':
      lines.push(`// Usage: <${tagName}>content</${tagName}>`)
      lines.push(`// Example:`)
      lines.push(`// <${tagName}>`)
      lines.push(`// Multi-line content here`)
      lines.push(`// </${tagName}>`)
      break
  }
  lines.push('')

  // DataManager.onLoad alias
  lines.push('const _DataManager_onLoad = DataManager.onLoad;')
  lines.push('DataManager.onLoad = function(object) {')
  lines.push('    _DataManager_onLoad.call(this, object);')
  lines.push(`    if (object === ${databaseType}) {`)
  lines.push(`        this.${methodName}(object);`)
  lines.push('    }')
  lines.push('};')
  lines.push('')

  // Generate the processing method based on tag format
  lines.push(`DataManager.${methodName} = function(database) {`)

  switch (tagFormat) {
    case 'boolean':
      lines.push(`    const regex = ${generateRegexPattern(tagName, tagFormat)};`)
      lines.push('    for (const item of database) {')
      lines.push('        if (item) {')
      lines.push(`            item.meta.${propName} = regex.test(item.note);`)
      lines.push('        }')
      lines.push('    }')
      break

    case 'simple':
      lines.push(`    const regex = ${generateRegexPattern(tagName, tagFormat)};`)
      lines.push('    for (const item of database) {')
      lines.push('        if (item) {')
      lines.push(`            item.meta.${propName} = ${defaultLiteral};`)
      lines.push('            const match = item.note.match(regex);')
      lines.push('            if (match) {')
      lines.push(
        `                item.meta.${propName} = ${generateValueParser(valueType, 'match[1]')};`
      )
      lines.push('            }')
      lines.push('        }')
      lines.push('    }')
      break

    case 'keyValue':
      lines.push(`    const regex = ${generateRegexPattern(tagName, tagFormat)};`)
      lines.push('    for (const item of database) {')
      lines.push('        if (item) {')
      lines.push(`            item.meta.${propName} = {};`)
      lines.push('            let match;')
      lines.push('            while ((match = regex.exec(item.note)) !== null) {')
      lines.push('                const key = match[1];')
      lines.push(`                const value = ${generateValueParser(valueType, 'match[2]')};`)
      lines.push(`                item.meta.${propName}[key] = value;`)
      lines.push('            }')
      lines.push('        }')
      lines.push('    }')
      break

    case 'multiline':
      lines.push(`    const regex = ${generateRegexPattern(tagName, tagFormat)};`)
      lines.push('    for (const item of database) {')
      lines.push('        if (item) {')
      lines.push(`            item.meta.${propName} = ${defaultLiteral};`)
      lines.push('            const match = item.note.match(regex);')
      lines.push('            if (match) {')
      lines.push(`                item.meta.${propName} = match[1].trim();`)
      lines.push('            }')
      lines.push('        }')
      lines.push('    }')
      break
  }

  lines.push('};')

  return lines.join('\n')
}

const databaseExtTemplate: CodeTemplate = {
  id: 'database-ext-notetag',
  category: 'database-ext',
  name: 'Notetag Parser',
  description: 'Parse custom notetags from database entries',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/RPG.BaseItem.html',
  icon: 'Tag',
  fields: [
    {
      id: 'databaseType',
      label: 'Database',
      type: 'select',
      required: true,
      options: [
        { value: '$dataActors', label: 'Actors' },
        { value: '$dataClasses', label: 'Classes' },
        { value: '$dataSkills', label: 'Skills' },
        { value: '$dataItems', label: 'Items' },
        { value: '$dataWeapons', label: 'Weapons' },
        { value: '$dataArmors', label: 'Armors' },
        { value: '$dataEnemies', label: 'Enemies' },
        { value: '$dataStates', label: 'States' },
        { value: '$dataTilesets', label: 'Tilesets' },
        { value: '$dataCommonEvents', label: 'Common Events' },
        { value: '$dataMapInfos', label: 'Map Infos' }
      ],
      help: 'Which database to parse notetags from'
    },
    {
      id: 'tagName',
      label: 'Tag Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., CustomDamage',
      help: 'Name of your notetag (without < > brackets)'
    },
    {
      id: 'tagFormat',
      label: 'Tag Format',
      type: 'select',
      options: [
        { value: 'simple', label: '<TagName: value> - Single value' },
        { value: 'boolean', label: '<TagName> - Boolean flag (presence = true)' },
        { value: 'keyValue', label: '<TagName key: value> - Key-value pairs' },
        { value: 'multiline', label: '<TagName>...content...</TagName> - Multiline block' }
      ],
      default: 'simple',
      help: 'Format of the notetag in the database'
    },
    {
      id: 'valueType',
      label: 'Value Type',
      type: 'select',
      options: [
        { value: 'number', label: 'Number' },
        { value: 'string', label: 'String' },
        { value: 'boolean', label: 'Boolean' },
        { value: 'array', label: 'Array (comma-separated)' }
      ],
      default: 'number',
      help: 'Type to parse the value as',
      dependsOn: { field: 'tagFormat', value: 'simple' }
    },
    {
      id: 'propertyName',
      label: 'Property Name',
      type: 'text',
      placeholder: 'e.g., customDamageBonus',
      help: 'Property name to store parsed value (defaults to tag name in camelCase)'
    },
    {
      id: 'defaultValue',
      label: 'Default Value',
      type: 'text',
      placeholder: 'e.g., 0 or "" or false',
      help: 'Value when notetag is not present'
    }
  ],
  generate: (values): string => {
    const databaseType = values.databaseType as string
    const tagName = values.tagName as string
    const tagFormat = (values.tagFormat as string) || 'simple'
    const valueType = (values.valueType as string) || 'number'
    const propertyName = values.propertyName as string
    const defaultValue = values.defaultValue as string | undefined

    return generateNotetagCode(
      databaseType,
      tagName,
      tagFormat,
      valueType,
      propertyName,
      defaultValue
    )
  },
  validate: (values) => {
    const errors: string[] = []

    // Validate database type is selected
    if (!values.databaseType) {
      errors.push('Database selection is required')
    }

    // Validate tag name
    if (!values.tagName) {
      errors.push('Tag Name is required')
    } else {
      const tagName = values.tagName as string

      // Check for valid tag name (letters, numbers, underscores)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tagName)) {
        errors.push(
          'Tag Name must start with a letter or underscore and contain only letters, numbers, and underscores'
        )
      }

      // Check for reserved/common names that might conflict
      const reservedNames = ['note', 'meta', 'id', 'name', 'description', 'iconIndex', 'price']
      if (reservedNames.includes(tagName.toLowerCase())) {
        errors.push(
          `"${tagName}" may conflict with existing properties. Consider a more unique name.`
        )
      }
    }

    // Validate property name if provided
    if (values.propertyName) {
      const propertyName = values.propertyName as string
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propertyName)) {
        errors.push('Property Name must be a valid JavaScript identifier')
      }
    }

    // Validate default value format based on value type
    if (values.defaultValue && values.valueType) {
      const defaultValue = values.defaultValue as string
      const valueType = values.valueType as string

      switch (valueType) {
        case 'number':
          if (isNaN(Number(defaultValue))) {
            errors.push('Default value for number type must be a valid number')
          }
          break
        case 'boolean':
          if (!['true', 'false'].includes(defaultValue.toLowerCase())) {
            errors.push('Default value for boolean type must be true or false')
          }
          break
        case 'array':
          if (!defaultValue.trim().startsWith('[')) {
            errors.push('Default value for array type should be in JSON format starting with [')
          }
          break
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register the template when this module loads
registerTemplate(databaseExtTemplate)

export { databaseExtTemplate }
