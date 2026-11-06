/**
Database Extension Template - Notetag Parser

Generates code for parsing custom notetags from RPG Maker MZ database entries.
Notetags are custom metadata added to the note field of database items.
*/

import { registerTemplate } from './index'
import type { CodeTemplate } from './types'
import { defaultLiteralOf, expectText, toPascalCase, valueOr } from './values'

/**
Convert a string to camelCase
e.g., "CustomDamage" -> "customDamage"
*/
function toCamelCase(value: unknown): string {
  const hasValue = Boolean(value)
  if (!hasValue) return ''
  const string_ = expectText(value)
  return string_.charAt(0).toLowerCase() + string_.slice(1)
}

/**
Get the friendly name for a database type
e.g., "$dataItems" -> "Items"
*/
function getDatabaseName(databaseType: unknown): string {
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
  return names[String(databaseType)] || expectText(databaseType).replace('$data', '')
}

/**
The notetag formats the template writes a parser for.
*/
type TagFormat = 'simple' | 'boolean' | 'keyValue' | 'multiline'

/**
Generate the regex pattern based on tag format
*/
function generateRegexPattern(tagName: string, tagFormat: TagFormat): string {
  switch (tagFormat) {
    case 'simple': {
      return String.raw`/<${tagName}:\s*(.+?)>/i`
    }
    case 'boolean': {
      return `/<${tagName}>/i`
    }
    case 'keyValue': {
      return String.raw`/<${tagName}\s+(\w+):\s*(.+?)>/gi`
    }
    case 'multiline': {
      return String.raw`/<${tagName}>([\s\S]*?)<\/${tagName}>/i`
    }
  }
}

/**
Generate the value parsing code based on value type
*/
function generateValueParser(valueType: unknown, matchVariable: string): string {
  switch (valueType) {
    case 'number': {
      return `Number(${matchVariable})`
    }
    case 'string': {
      return `String(${matchVariable}).trim()`
    }
    case 'boolean': {
      return `${matchVariable}.toLowerCase() === 'true'`
    }
    case 'array': {
      return `${matchVariable}.split(',').map(s => s.trim())`
    }
    default: {
      return matchVariable
    }
  }
}

/**
Generate the notetag parsing code
*/
function generateNotetagCode(
  databaseType: unknown,
  tagName: unknown,
  tagFormat: unknown,
  valueType: unknown,
  propertyName: unknown,
  defaultValue: unknown
): string {
  const databaseName = getDatabaseName(databaseType)
  const hasPropertyName = Boolean(propertyName)
  // Only written into the code as text
  const propertyName_ = String(hasPropertyName ? propertyName : toCamelCase(tagName))
  const methodName = `process${toPascalCase(tagName)}Notetags`
  const defaultLiteral = defaultLiteralOf(valueType, defaultValue)
  const tagText = String(tagName)

  return [
    // Header comment with usage example
    `// Notetag Parser: ${tagText}`,
    `// Database: ${databaseName} (${String(databaseType)})`,
    `// Access via: item.meta.${propertyName_}`,
    '//',
    ...usageLines(tagFormat, tagText),
    '',
    // DataManager.onLoad alias
    'const _DataManager_onLoad = DataManager.onLoad;',
    'DataManager.onLoad = function(object) {',
    '    _DataManager_onLoad.call(this, object);',
    `    if (object === ${String(databaseType)}) {`,
    `        this.${methodName}(object);`,
    '    }',
    '};',
    '',
    // Generate the processing method based on tag format
    `DataManager.${methodName} = function(database) {`,
    ...processingLines(tagFormat, tagText, propertyName_, valueType, defaultLiteral),
    '};'
  ].join('\n')
}

/**
The format-specific usage examples of the header; other formats have none.
*/
function usageLines(tagFormat: unknown, tagText: string): string[] {
  switch (tagFormat) {
    case 'simple': {
      return [`// Usage: <${tagText}: value>`, `// Example: <${tagText}: 50>`]
    }
    case 'boolean': {
      return [`// Usage: <${tagText}>`, `// Presence of tag = true, absence = false`]
    }
    case 'keyValue': {
      return [
        `// Usage: <${tagText} key: value>`,
        `// Example: <${tagText} fire: 50>`,
        `// Multiple tags allowed per entry`
      ]
    }
    case 'multiline': {
      return [
        `// Usage: <${tagText}>content</${tagText}>`,
        `// Example:`,
        `// <${tagText}>`,
        `// Multi-line content here`,
        `// </${tagText}>`
      ]
    }
    default: {
      return []
    }
  }
}

/**
The body of the processing method for a tag format; other formats have an empty body.
*/
function processingLines(
  tagFormat: unknown,
  tagText: string,
  propertyName: string,
  valueType: unknown,
  defaultLiteral: string
): string[] {
  switch (tagFormat) {
    case 'boolean': {
      return [
        `    const regex = ${generateRegexPattern(tagText, 'boolean')};`,
        '    for (const item of database) {',
        '        if (item) {',
        `            item.meta.${propertyName} = regex.test(item.note);`,
        '        }',
        '    }'
      ]
    }

    case 'simple': {
      return [
        `    const regex = ${generateRegexPattern(tagText, 'simple')};`,
        '    for (const item of database) {',
        '        if (item) {',
        `            item.meta.${propertyName} = ${defaultLiteral};`,
        '            const match = item.note.match(regex);',
        '            if (match) {',
        `                item.meta.${propertyName} = ${generateValueParser(valueType, 'match[1]')};`,
        '            }',
        '        }',
        '    }'
      ]
    }

    case 'keyValue': {
      return [
        `    const regex = ${generateRegexPattern(tagText, 'keyValue')};`,
        '    for (const item of database) {',
        '        if (item) {',
        `            item.meta.${propertyName} = {};`,
        '            let match;',
        '            while ((match = regex.exec(item.note)) !== null) {',
        '                const key = match[1];',
        `                const value = ${generateValueParser(valueType, 'match[2]')};`,
        `                item.meta.${propertyName}[key] = value;`,
        '            }',
        '        }',
        '    }'
      ]
    }

    case 'multiline': {
      return [
        `    const regex = ${generateRegexPattern(tagText, 'multiline')};`,
        '    for (const item of database) {',
        '        if (item) {',
        `            item.meta.${propertyName} = ${defaultLiteral};`,
        '            const match = item.note.match(regex);',
        '            if (match) {',
        `                item.meta.${propertyName} = match[1].trim();`,
        '            }',
        '        }',
        '    }'
      ]
    }

    default: {
      return []
    }
  }
}

/**
The errors of a tag name that is set: letters, digits and underscores, not starting with a digit,
and a name the database entries already use is warned about.
*/
function tagNameErrors(tagName: unknown): string[] {
  const errors: string[] = []

  // Check for valid tag name (letters, numbers, underscores)
  if (!/^[a-z_]\w*$/i.test(String(tagName))) {
    errors.push(
      'Tag Name must start with a letter or underscore and contain only letters, numbers, and underscores'
    )
  }

  // Check for reserved/common names that might conflict
  const reservedNames = ['note', 'meta', 'id', 'name', 'description', 'iconIndex', 'price']
  if (reservedNames.includes(expectText(tagName).toLowerCase())) {
    errors.push(
      `"${String(tagName)}" may conflict with existing properties. Consider a more unique name.`
    )
  }

  return errors
}

/**
The errors of a default value that is set, checked against its value type. A value of another type
than text throws `TypeError` where a string method is called on it.
*/
function defaultValueErrors(valueType: unknown, defaultValue: unknown): string[] {
  switch (valueType) {
    case 'number': {
      return Number.isNaN(Number(defaultValue))
        ? ['Default value for number type must be a valid number']
        : []
    }
    case 'boolean': {
      return ['true', 'false'].includes(expectText(defaultValue).toLowerCase())
        ? []
        : ['Default value for boolean type must be true or false']
    }
    case 'array': {
      return expectText(defaultValue).trimStart().startsWith('[')
        ? []
        : ['Default value for array type should be in JSON format starting with [']
    }
    default: {
      return []
    }
  }
}

const databaseExtensionTemplate: CodeTemplate = {
  id: 'database-ext-notetag',
  category: 'database-ext',
  name: 'Notetag Parser',
  description: 'Parse custom notetags from database entries',
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
    const databaseType = values['databaseType']
    const tagName = values['tagName']
    const tagFormat = valueOr(values['tagFormat'], 'simple')
    const valueType = valueOr(values['valueType'], 'number')
    const propertyName = values['propertyName']
    const defaultValue = values['defaultValue']

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

    // Validate tag name
    const tagName: unknown = values['tagName']
    const hasTagName = Boolean(tagName)
    if (hasTagName) {
      errors.push(...tagNameErrors(tagName))
    }

    // Validate property name if provided
    const propertyName: unknown = values['propertyName']
    const hasPropertyName = Boolean(propertyName)
    if (hasPropertyName && !/^[a-z_$][\w$]*$/i.test(String(propertyName))) {
      errors.push('Property Name must be a valid JavaScript identifier')
    }

    // Validate default value format based on value type
    const defaultValue = values['defaultValue']
    const valueType = values['valueType']
    const hasDefaultValue = Boolean(defaultValue)
    const hasValueType = Boolean(valueType)
    if (hasDefaultValue && hasValueType) {
      errors.push(...defaultValueErrors(valueType, defaultValue))
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register the template when this module loads
registerTemplate(databaseExtensionTemplate)
