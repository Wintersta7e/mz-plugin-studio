/**
 * Method Alias Template
 *
 * Generates code for safely extending existing RPG Maker MZ class methods
 * while preserving original behavior through aliasing.
 */

import { registerTemplate } from './index'
import type { CodeTemplate } from './types'
import { getMethodInfo } from '../class-registry'

/**
 * Generates the alias variable name from class and method names
 * Example: Game_Actor.changeHp -> _Game_Actor_changeHp
 */
function getAliasName(className: string, methodName: string): string {
  return `_${className}_${methodName}`
}

/**
 * Generates the method alias code based on timing option
 */
function generateAliasCode(
  className: string,
  methodName: string,
  timing: string,
  callOriginal: boolean,
  params: string[]
): string {
  const aliasName = getAliasName(className, methodName)
  const paramsStr = params.join(', ')
  const lines: string[] = []

  // Header comment
  lines.push(`// Alias: ${className}.${methodName}`)

  // Store original reference
  lines.push(`const ${aliasName} = ${className}.prototype.${methodName};`)

  // Open method definition
  lines.push(`${className}.prototype.${methodName} = function(${paramsStr}) {`)

  // Generate body based on timing
  switch (timing) {
    case 'before':
      lines.push('    // Your code here (before original)')
      lines.push('    ')
      lines.push(`    return ${aliasName}.apply(this, arguments);`)
      break

    case 'after':
      lines.push(`    const result = ${aliasName}.apply(this, arguments);`)
      lines.push('    ')
      lines.push('    // Your code here (after original)')
      lines.push('    ')
      lines.push('    return result;')
      break

    case 'wrap':
      lines.push('    // Your code here (before original)')
      lines.push('    ')
      lines.push(`    const result = ${aliasName}.apply(this, arguments);`)
      lines.push('    ')
      lines.push('    // Your code here (after original)')
      lines.push('    ')
      lines.push('    return result;')
      break

    case 'replace':
      if (callOriginal) {
        lines.push('    // Your code here (replacing original, but still calling it)')
        lines.push('    ')
        lines.push(`    const result = ${aliasName}.apply(this, arguments);`)
        lines.push('    ')
        lines.push('    // More of your code here')
        lines.push('    ')
        lines.push('    return result;')
      } else {
        lines.push('    // Your code here (completely replacing original)')
        lines.push('    ')
        lines.push('    // Return appropriate value for this method')
        lines.push('    return undefined;')
      }
      break

    default:
      // Default to 'after' behavior
      lines.push(`    const result = ${aliasName}.apply(this, arguments);`)
      lines.push('    ')
      lines.push('    // Your code here')
      lines.push('    ')
      lines.push('    return result;')
  }

  // Close method definition
  lines.push('};')

  return lines.join('\n')
}

const methodAliasTemplate: CodeTemplate = {
  id: 'method-alias-basic',
  category: 'method-alias',
  name: 'Alias Method',
  description: 'Safely extend an existing class method while preserving original behavior',
  icon: 'GitBranch',
  fields: [
    {
      id: 'className',
      label: 'Class',
      type: 'class-select',
      required: true,
      placeholder: 'Select a class...',
      help: 'The MZ class to extend'
    },
    {
      id: 'methodName',
      label: 'Method',
      type: 'method-select',
      required: true,
      placeholder: 'Select a method...',
      help: 'The method to alias',
      dependsOn: { field: 'className', value: undefined } // Only show when className has value
    },
    {
      id: 'timing',
      label: 'When to run your code',
      type: 'select',
      options: [
        { value: 'after', label: 'After original (recommended)' },
        { value: 'before', label: 'Before original' },
        { value: 'wrap', label: 'Both before and after' },
        { value: 'replace', label: 'Replace completely' }
      ],
      default: 'after',
      help: 'When your custom code runs relative to the original method'
    },
    {
      id: 'callOriginal',
      label: 'Call original method',
      type: 'boolean',
      default: true,
      help: 'Whether to call the original method implementation',
      dependsOn: { field: 'timing', value: 'replace' } // Only show for replace
    }
  ],
  generate: (values): string => {
    const className = values.className as string
    const methodName = values.methodName as string
    const timing = (values.timing as string) || 'after'
    const callOriginal = values.callOriginal !== false // Default to true

    // Get method info for accurate parameter names
    const methodInfo = getMethodInfo(className, methodName)
    const params = methodInfo?.params ?? []

    return generateAliasCode(className, methodName, timing, callOriginal, params)
  },
  validate: (values) => {
    const errors: string[] = []

    if (!values.className) {
      errors.push('Class is required')
    }

    if (!values.methodName) {
      errors.push('Method is required')
    }

    // Verify the method exists on the class
    if (values.className && values.methodName) {
      const methodInfo = getMethodInfo(values.className as string, values.methodName as string)
      if (!methodInfo) {
        errors.push(`Method "${values.methodName}" not found on class "${values.className}"`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register the template when this module loads
registerTemplate(methodAliasTemplate)

export { methodAliasTemplate }
