/**
 * Battle System Templates
 *
 * Templates for modifying RPG Maker MZ battle mechanics:
 * - Damage calculation modification
 * - Battle event hooks (victory, defeat, escape, etc.)
 * - State change hooks
 * - Action execution hooks
 */

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'

/**
 * Helper to generate condition check code for damage modifiers
 */
function generateConditionCheck(condition: string, varName: string = 'value'): string {
  switch (condition) {
    case 'critical':
      return `    if (critical) {\n        ${varName} = `
    case 'skill':
      return `    if (this.isSkill()) {\n        ${varName} = `
    case 'physical':
      return `    if (this.isPhysical()) {\n        ${varName} = `
    case 'magical':
      return `    if (this.isMagical()) {\n        ${varName} = `
    case 'always':
    default:
      return `    ${varName} = `
  }
}

/**
 * Helper to close condition block if needed
 */
function closeConditionCheck(condition: string): string {
  if (condition !== 'always') {
    return '\n    }'
  }
  return ''
}

/**
 * Template 1: Damage Formula Modifier
 * Modifies damage calculation in battle with various options
 */
const damageModifierTemplate: CodeTemplate = {
  id: 'battle-damage-modifier',
  category: 'battle-system',
  name: 'Damage Modifier',
  description: 'Modify damage calculation in battle',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Game_Action.html',
  icon: 'Swords',
  fields: [
    {
      id: 'modifyType',
      label: 'Modification Type',
      type: 'select',
      options: [
        { value: 'multiply', label: 'Multiply damage (e.g., 1.5x)' },
        { value: 'add', label: 'Add flat amount' },
        { value: 'custom', label: 'Custom formula' }
      ],
      default: 'multiply',
      required: true,
      help: 'How to modify the damage value'
    },
    {
      id: 'modifyValue',
      label: 'Value',
      type: 'text',
      placeholder: 'e.g., 1.5 or 100',
      help: 'Multiplier (for multiply) or flat value (for add)',
      required: true
    },
    {
      id: 'condition',
      label: 'Condition',
      type: 'select',
      options: [
        { value: 'always', label: 'Always apply' },
        { value: 'critical', label: 'Only on critical hits' },
        { value: 'skill', label: 'Only for skills' },
        { value: 'physical', label: 'Only physical attacks' },
        { value: 'magical', label: 'Only magical attacks' }
      ],
      default: 'always',
      help: 'When to apply this damage modification'
    }
  ],
  generate: (values): string => {
    const modifyType = (values.modifyType as string) || 'multiply'
    const modifyValue = values.modifyValue as string
    const condition = (values.condition as string) || 'always'

    const lines: string[] = []

    // Header comment
    const conditionLabel =
      condition === 'always'
        ? 'always'
        : condition === 'critical'
          ? 'on critical hits'
          : condition === 'skill'
            ? 'for skills only'
            : condition === 'physical'
              ? 'for physical attacks'
              : 'for magical attacks'

    const typeLabel =
      modifyType === 'multiply'
        ? `Multiply by ${modifyValue}`
        : modifyType === 'add'
          ? `Add ${modifyValue}`
          : 'Custom formula'

    lines.push(`// Damage Modifier: ${typeLabel} (${conditionLabel})`)
    lines.push('const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;')
    lines.push('Game_Action.prototype.makeDamageValue = function(target, critical) {')
    lines.push('    let value = _Game_Action_makeDamageValue.call(this, target, critical);')
    lines.push('')
    lines.push('    // Apply damage modification')

    // Generate the modification code based on type and condition
    const conditionStart = generateConditionCheck(condition)
    let modificationCode: string

    switch (modifyType) {
      case 'multiply':
        modificationCode = `Math.floor(value * ${modifyValue});`
        break
      case 'add':
        modificationCode = `value + ${modifyValue};`
        break
      case 'custom':
      default:
        modificationCode = `${modifyValue}; // Custom formula - edit as needed`
        break
    }

    lines.push(conditionStart + modificationCode + closeConditionCheck(condition))
    lines.push('')
    lines.push('    return value;')
    lines.push('};')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.modifyValue) {
      errors.push('Value is required')
    } else {
      const modifyType = values.modifyType as string
      const modifyValue = values.modifyValue as string

      // Validate numeric input for multiply and add
      if (modifyType === 'multiply' || modifyType === 'add') {
        const num = parseFloat(modifyValue)
        if (isNaN(num)) {
          errors.push('Value must be a valid number for multiply/add operations')
        } else if (modifyType === 'multiply' && num <= 0) {
          errors.push('Multiplier should be a positive number')
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 2: Battle Event Hook
 * React to battle events (victory, defeat, escape, etc.)
 */
const battleEventTemplate: CodeTemplate = {
  id: 'battle-event-hook',
  category: 'battle-system',
  name: 'Battle Event Hook',
  description: 'React to battle events (victory, defeat, escape)',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/BattleManager.html',
  icon: 'Swords',
  fields: [
    {
      id: 'eventType',
      label: 'Event',
      type: 'select',
      options: [
        { value: 'victory', label: 'Victory - When battle is won' },
        { value: 'defeat', label: 'Defeat - When party is defeated' },
        { value: 'escape', label: 'Escape - When party escapes' },
        { value: 'start', label: 'Battle Start - When battle begins' },
        { value: 'turnStart', label: 'Turn Start - Beginning of each turn' },
        { value: 'turnEnd', label: 'Turn End - End of each turn' }
      ],
      default: 'victory',
      required: true,
      help: 'The battle event to hook into'
    }
  ],
  generate: (values): string => {
    const eventType = (values.eventType as string) || 'victory'
    const lines: string[] = []

    // Map event types to their MZ methods and appropriate timing
    interface EventMapping {
      method: string
      aliasName: string
      comment: string
      timing: 'before' | 'after'
    }

    const eventMappings: Record<string, EventMapping> = {
      victory: {
        method: 'processVictory',
        aliasName: '_BattleManager_processVictory',
        comment: 'Victory Hook',
        timing: 'before'
      },
      defeat: {
        method: 'processDefeat',
        aliasName: '_BattleManager_processDefeat',
        comment: 'Defeat Hook',
        timing: 'before'
      },
      escape: {
        method: 'processEscape',
        aliasName: '_BattleManager_processEscape',
        comment: 'Escape Hook',
        timing: 'before'
      },
      start: {
        method: 'startBattle',
        aliasName: '_BattleManager_startBattle',
        comment: 'Battle Start Hook',
        timing: 'after'
      },
      turnStart: {
        method: 'startTurn',
        aliasName: '_BattleManager_startTurn',
        comment: 'Turn Start Hook',
        timing: 'after'
      },
      turnEnd: {
        method: 'endTurn',
        aliasName: '_BattleManager_endTurn',
        comment: 'Turn End Hook',
        timing: 'after'
      }
    }

    const mapping = eventMappings[eventType]

    lines.push(`// ${mapping.comment}`)
    lines.push(`const ${mapping.aliasName} = BattleManager.${mapping.method};`)
    lines.push(`BattleManager.${mapping.method} = function() {`)

    if (mapping.timing === 'before') {
      // Code runs before original (for victory/defeat/escape where we want to intercept)
      lines.push(`    // Your code here (before ${eventType} processing)`)
      lines.push(`    console.log('Battle ${eventType}!');`)
      lines.push('')
      lines.push(`    ${mapping.aliasName}.call(this);`)
    } else {
      // Code runs after original (for start/turnStart/turnEnd)
      lines.push(`    ${mapping.aliasName}.call(this);`)
      lines.push('')
      lines.push(`    // Your code here (after ${eventType} processing)`)
      lines.push(`    console.log('${mapping.comment.replace(' Hook', '')}!');`)
    }

    lines.push('};')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.eventType) {
      errors.push('Event type is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 3: State Change Hook
 * React when states are added or removed from battlers
 */
const stateHookTemplate: CodeTemplate = {
  id: 'battle-state-hook',
  category: 'battle-system',
  name: 'State Change Hook',
  description: 'React when states are added or removed',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Game_Battler.html',
  icon: 'Swords',
  fields: [
    {
      id: 'hookType',
      label: 'Hook Type',
      type: 'select',
      options: [
        { value: 'add', label: 'State Added' },
        { value: 'remove', label: 'State Removed' },
        { value: 'both', label: 'Both Add and Remove' }
      ],
      default: 'add',
      required: true,
      help: 'Whether to hook state addition, removal, or both'
    },
    {
      id: 'stateId',
      label: 'State ID (optional)',
      type: 'text',
      placeholder: 'Leave empty for all states',
      help: 'Specific state ID to watch, or empty for all states'
    }
  ],
  generate: (values): string => {
    const hookType = (values.hookType as string) || 'add'
    const stateId = values.stateId as string
    const lines: string[] = []

    const hasStateFilter = stateId && stateId.trim() !== ''

    // Generate state add hook
    if (hookType === 'add' || hookType === 'both') {
      lines.push('// State Added Hook')
      lines.push('const _Game_Battler_addState = Game_Battler.prototype.addState;')
      lines.push('Game_Battler.prototype.addState = function(stateId) {')
      lines.push('    const hadState = this.isStateAffected(stateId);')
      lines.push('    _Game_Battler_addState.call(this, stateId);')
      lines.push('')
      lines.push('    if (!hadState && this.isStateAffected(stateId)) {')
      lines.push('        // State was newly added')

      if (hasStateFilter) {
        lines.push(`        if (stateId === ${stateId}) {`)
        lines.push('            this.onStateAdded(stateId);')
        lines.push('        }')
      } else {
        lines.push('        this.onStateAdded(stateId);')
      }

      lines.push('    }')
      lines.push('};')
      lines.push('')
      lines.push('Game_Battler.prototype.onStateAdded = function(stateId) {')
      lines.push('    // Your code here')
      lines.push("    console.log('State', stateId, 'added to', this.name());")
      lines.push('};')
    }

    // Add spacing between add and remove hooks
    if (hookType === 'both') {
      lines.push('')
    }

    // Generate state remove hook
    if (hookType === 'remove' || hookType === 'both') {
      lines.push('// State Removed Hook')
      lines.push('const _Game_Battler_removeState = Game_Battler.prototype.removeState;')
      lines.push('Game_Battler.prototype.removeState = function(stateId) {')
      lines.push('    const hadState = this.isStateAffected(stateId);')
      lines.push('    _Game_Battler_removeState.call(this, stateId);')
      lines.push('')
      lines.push('    if (hadState && !this.isStateAffected(stateId)) {')
      lines.push('        // State was removed')

      if (hasStateFilter) {
        lines.push(`        if (stateId === ${stateId}) {`)
        lines.push('            this.onStateRemoved(stateId);')
        lines.push('        }')
      } else {
        lines.push('        this.onStateRemoved(stateId);')
      }

      lines.push('    }')
      lines.push('};')
      lines.push('')
      lines.push('Game_Battler.prototype.onStateRemoved = function(stateId) {')
      lines.push('    // Your code here')
      lines.push("    console.log('State', stateId, 'removed from', this.name());")
      lines.push('};')
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const stateId = values.stateId as string

    // Validate state ID if provided
    if (stateId && stateId.trim() !== '') {
      const num = parseInt(stateId, 10)
      if (isNaN(num) || num < 1) {
        errors.push('State ID must be a positive integer')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 4: Action Execution Hook
 * React before or after battle actions execute
 */
const actionSequenceTemplate: CodeTemplate = {
  id: 'battle-action-hook',
  category: 'battle-system',
  name: 'Action Execution Hook',
  description: 'React before/after battle actions execute',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Game_Action.html',
  icon: 'Swords',
  fields: [
    {
      id: 'timing',
      label: 'Timing',
      type: 'select',
      options: [
        { value: 'before', label: 'Before action executes' },
        { value: 'after', label: 'After action executes' }
      ],
      default: 'after',
      required: true,
      help: 'When your code should run relative to the action'
    },
    {
      id: 'actionType',
      label: 'Action Type (optional)',
      type: 'select',
      options: [
        { value: 'all', label: 'All actions' },
        { value: 'skill', label: 'Skills only' },
        { value: 'item', label: 'Items only' },
        { value: 'attack', label: 'Normal attacks only' },
        { value: 'guard', label: 'Guard only' }
      ],
      default: 'all',
      help: 'Filter which action types trigger this hook'
    }
  ],
  generate: (values): string => {
    const timing = (values.timing as string) || 'after'
    const actionType = (values.actionType as string) || 'all'
    const lines: string[] = []

    // Determine action type check
    let actionCheck = ''
    let actionLabel = 'all actions'

    switch (actionType) {
      case 'skill':
        actionCheck = 'this._action.isSkill()'
        actionLabel = 'skills'
        break
      case 'item':
        actionCheck = 'this._action.isItem()'
        actionLabel = 'items'
        break
      case 'attack':
        actionCheck = 'this._action.isAttack()'
        actionLabel = 'normal attacks'
        break
      case 'guard':
        actionCheck = 'this._action.isGuard()'
        actionLabel = 'guard actions'
        break
      default:
        actionCheck = ''
        actionLabel = 'all actions'
    }

    const timingLabel = timing === 'before' ? 'Before' : 'After'
    lines.push(`// Action Execution Hook: ${timingLabel} ${actionLabel}`)
    lines.push('const _BattleManager_invokeAction = BattleManager.invokeAction;')
    lines.push('BattleManager.invokeAction = function(subject, target) {')

    if (timing === 'before') {
      // Code runs before action
      if (actionCheck) {
        lines.push(`    if (${actionCheck}) {`)
        lines.push('        // Your code here (before action executes)')
        lines.push("        console.log('About to execute action:', this._action.item().name);")
        lines.push('    }')
      } else {
        lines.push('    // Your code here (before action executes)')
        lines.push("    console.log('About to execute action');")
      }
      lines.push('')
      lines.push('    _BattleManager_invokeAction.call(this, subject, target);')
    } else {
      // Code runs after action
      lines.push('    _BattleManager_invokeAction.call(this, subject, target);')
      lines.push('')
      if (actionCheck) {
        lines.push(`    if (${actionCheck}) {`)
        lines.push('        // Your code here (after action executes)')
        lines.push("        console.log('Finished executing action:', this._action.item().name);")
        lines.push('    }')
      } else {
        lines.push('    // Your code here (after action executes)')
        lines.push("    console.log('Finished executing action');")
      }
    }

    lines.push('};')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.timing) {
      errors.push('Timing is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register all templates when this module loads
registerTemplate(damageModifierTemplate)
registerTemplate(battleEventTemplate)
registerTemplate(stateHookTemplate)
registerTemplate(actionSequenceTemplate)

export { damageModifierTemplate, battleEventTemplate, stateHookTemplate, actionSequenceTemplate }
