/**
 * Actor & Party Templates
 *
 * Templates for modifying RPG Maker MZ actor and party systems:
 * - Custom actor properties with getter/setter
 * - Party management (add/remove members, size limits)
 * - Equipment hooks (equip/unequip events)
 */

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'

/**
 * Convert a property name to PascalCase for method names
 * e.g., "loyalty" -> "Loyalty"
 */
function toPascalCase(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Get the appropriate default value literal based on data type
 */
function getDefaultLiteral(dataType: string, customDefault?: string): string {
  if (customDefault !== undefined && customDefault !== '') {
    return customDefault
  }

  switch (dataType) {
    case 'number':
      return '0'
    case 'string':
      return '""'
    case 'boolean':
      return 'false'
    case 'object':
      return '{}'
    case 'array':
      return '[]'
    default:
      return 'null'
  }
}

/**
 * Template 1: Custom Actor Property
 * Add a new property to Game_Actor with getter/setter
 */
const customActorPropertyTemplate: CodeTemplate = {
  id: 'actor-custom-property',
  category: 'actor-party',
  name: 'Custom Actor Property',
  description: 'Add a new property to Game_Actor with getter/setter',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Game_Actor.html',
  icon: 'Users',
  fields: [
    {
      id: 'propertyName',
      label: 'Property Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., loyalty, reputation, fatigue',
      help: 'Name for the property (camelCase recommended)'
    },
    {
      id: 'dataType',
      label: 'Data Type',
      type: 'select',
      required: true,
      options: [
        { value: 'number', label: 'Number - Numeric value' },
        { value: 'string', label: 'String - Text value' },
        { value: 'boolean', label: 'Boolean - True/false flag' },
        { value: 'object', label: 'Object {} - Key-value pairs' },
        { value: 'array', label: 'Array [] - Ordered list' }
      ],
      default: 'number',
      help: 'Type of data to store for each actor'
    },
    {
      id: 'defaultValue',
      label: 'Default Value',
      type: 'text',
      placeholder: 'e.g., 100 or "none" or true',
      help: 'Initial value for new actors. Leave empty for type default.'
    },
    {
      id: 'minValue',
      label: 'Minimum Value (for numbers)',
      type: 'text',
      placeholder: 'e.g., 0',
      help: 'Optional minimum value for number properties'
    },
    {
      id: 'maxValue',
      label: 'Maximum Value (for numbers)',
      type: 'text',
      placeholder: 'e.g., 100',
      help: 'Optional maximum value for number properties'
    },
    {
      id: 'includeChange',
      label: 'Include Change Method',
      type: 'boolean',
      default: true,
      help: 'Add a method to change the value by a delta amount'
    }
  ],
  generate: (values): string => {
    const propertyName = values.propertyName as string
    const dataType = (values.dataType as string) || 'number'
    const defaultValue = values.defaultValue as string | undefined
    const minValue = values.minValue as string | undefined
    const maxValue = values.maxValue as string | undefined
    const includeChange = values.includeChange !== false

    const pascalName = toPascalCase(propertyName)
    const defaultLiteral = getDefaultLiteral(dataType, defaultValue)
    const hasMin = dataType === 'number' && minValue !== undefined && minValue !== ''
    const hasMax = dataType === 'number' && maxValue !== undefined && maxValue !== ''
    const hasClamp = hasMin || hasMax

    const lines: string[] = []

    // Header comment
    lines.push(`// Custom Actor Property: ${propertyName}`)
    lines.push(`// Type: ${dataType}, Default: ${defaultLiteral}`)
    if (hasClamp) {
      const rangeStr = `${hasMin ? minValue : '-Infinity'} to ${hasMax ? maxValue : 'Infinity'}`
      lines.push(`// Range: ${rangeStr}`)
    }
    lines.push('')

    // Initialize the property in Game_Actor.initMembers
    lines.push('// Initialize the property when actor is created')
    lines.push('const _Game_Actor_initMembers = Game_Actor.prototype.initMembers;')
    lines.push('Game_Actor.prototype.initMembers = function() {')
    lines.push('    _Game_Actor_initMembers.call(this);')
    lines.push(`    this._${propertyName} = ${defaultLiteral};`)
    lines.push('};')
    lines.push('')

    // Getter method
    lines.push(`// Getter: actor.${propertyName}()`)
    lines.push(`Game_Actor.prototype.${propertyName} = function() {`)
    lines.push(`    return this._${propertyName};`)
    lines.push('};')
    lines.push('')

    // Setter method
    lines.push(`// Setter: actor.set${pascalName}(value)`)
    lines.push(`Game_Actor.prototype.set${pascalName} = function(value) {`)
    if (hasClamp) {
      const minStr = hasMin ? minValue : '-Infinity'
      const maxStr = hasMax ? maxValue : 'Infinity'
      lines.push(`    // Clamp value to valid range`)
      lines.push(`    this._${propertyName} = Math.max(${minStr}, Math.min(${maxStr}, value));`)
    } else {
      lines.push(`    this._${propertyName} = value;`)
    }
    lines.push('};')

    // Change method for numbers
    if (includeChange && dataType === 'number') {
      lines.push('')
      lines.push(`// Change method: actor.change${pascalName}(amount)`)
      lines.push(`// Use positive values to increase, negative to decrease`)
      lines.push(`Game_Actor.prototype.change${pascalName} = function(amount) {`)
      lines.push(`    this.set${pascalName}(this._${propertyName} + amount);`)
      lines.push('};')
    }

    // Toggle method for booleans
    if (dataType === 'boolean') {
      lines.push('')
      lines.push(`// Toggle method: actor.toggle${pascalName}()`)
      lines.push(`Game_Actor.prototype.toggle${pascalName} = function() {`)
      lines.push(`    this._${propertyName} = !this._${propertyName};`)
      lines.push('};')
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.propertyName) {
      errors.push('Property Name is required')
    } else {
      const propertyName = values.propertyName as string

      // Check for valid JavaScript identifier
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propertyName)) {
        errors.push('Property Name must be a valid JavaScript identifier (letters, numbers, _, $)')
      }

      // Warn about reserved words
      const reservedWords = [
        'name',
        'level',
        'hp',
        'mp',
        'tp',
        'atk',
        'def',
        'mat',
        'mdf',
        'agi',
        'luk',
        'exp',
        'gold',
        'class',
        'equips',
        'skills',
        'states'
      ]
      if (reservedWords.includes(propertyName.toLowerCase())) {
        errors.push(
          `"${propertyName}" conflicts with existing Game_Actor properties. Use a different name.`
        )
      }
    }

    // Validate min/max for numbers
    const dataType = values.dataType as string
    if (dataType === 'number') {
      const minValue = values.minValue as string
      const maxValue = values.maxValue as string

      if (minValue && isNaN(Number(minValue))) {
        errors.push('Minimum Value must be a valid number')
      }
      if (maxValue && isNaN(Number(maxValue))) {
        errors.push('Maximum Value must be a valid number')
      }
      if (minValue && maxValue && Number(minValue) > Number(maxValue)) {
        errors.push('Minimum Value cannot be greater than Maximum Value')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 2: Party Management
 * Add/remove party members with optional size limits
 */
const partyManagementTemplate: CodeTemplate = {
  id: 'party-management',
  category: 'actor-party',
  name: 'Party Management',
  description: 'Add/remove party members, party size limits',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Game_Party.html',
  icon: 'Users',
  fields: [
    {
      id: 'featureType',
      label: 'Feature Type',
      type: 'select',
      required: true,
      options: [
        { value: 'sizeLimit', label: 'Party Size Limit - Restrict max party members' },
        { value: 'addRemoveHook', label: 'Add/Remove Hook - React when members change' },
        { value: 'reserveParty', label: 'Reserve Party - Manage reserve members separately' }
      ],
      default: 'sizeLimit',
      help: 'Select which party management feature to add'
    },
    {
      id: 'maxSize',
      label: 'Maximum Party Size',
      type: 'number',
      default: 4,
      placeholder: '4',
      help: 'Maximum number of party members allowed (for size limit feature)',
      dependsOn: { field: 'featureType', value: 'sizeLimit' }
    },
    {
      id: 'minSize',
      label: 'Minimum Party Size',
      type: 'number',
      default: 1,
      placeholder: '1',
      help: 'Minimum number of party members required',
      dependsOn: { field: 'featureType', value: 'sizeLimit' }
    },
    {
      id: 'hookTiming',
      label: 'Hook Timing',
      type: 'select',
      options: [
        { value: 'after', label: 'After Change - React after member added/removed' },
        { value: 'before', label: 'Before Change - Can prevent the change' }
      ],
      default: 'after',
      help: 'When to run your code relative to the member change',
      dependsOn: { field: 'featureType', value: 'addRemoveHook' }
    },
    {
      id: 'maxReserve',
      label: 'Maximum Reserve Size',
      type: 'number',
      default: 10,
      placeholder: '10',
      help: 'Maximum number of reserve party members',
      dependsOn: { field: 'featureType', value: 'reserveParty' }
    }
  ],
  generate: (values): string => {
    const featureType = (values.featureType as string) || 'sizeLimit'
    const lines: string[] = []

    if (featureType === 'sizeLimit') {
      const maxSize = (values.maxSize as number) || 4
      const minSize = (values.minSize as number) || 1

      lines.push(`// Party Size Limit: ${minSize} to ${maxSize} members`)
      lines.push('')
      lines.push('// Store the party size limits')
      lines.push(`Game_Party.prototype.maxBattleMembers = function() {`)
      lines.push(`    return ${maxSize};`)
      lines.push('};')
      lines.push('')
      lines.push('// Prevent adding members beyond the max size')
      lines.push('const _Game_Party_addActor = Game_Party.prototype.addActor;')
      lines.push('Game_Party.prototype.addActor = function(actorId) {')
      lines.push('    if (this._actors.length >= this.maxBattleMembers()) {')
      lines.push('        // Party is full - you can customize this behavior')
      lines.push("        console.log('Party is full! Cannot add more members.');")
      lines.push('        return;')
      lines.push('    }')
      lines.push('    _Game_Party_addActor.call(this, actorId);')
      lines.push('};')

      if (minSize > 1) {
        lines.push('')
        lines.push('// Prevent removing members below the min size')
        lines.push('const _Game_Party_removeActor = Game_Party.prototype.removeActor;')
        lines.push('Game_Party.prototype.removeActor = function(actorId) {')
        lines.push(`    if (this._actors.length <= ${minSize}) {`)
        lines.push('        // Party at minimum - you can customize this behavior')
        lines.push("        console.log('Cannot remove member - party at minimum size.');")
        lines.push('        return;')
        lines.push('    }')
        lines.push('    _Game_Party_removeActor.call(this, actorId);')
        lines.push('};')
      }

      lines.push('')
      lines.push('// Helper method to check if party can add members')
      lines.push('Game_Party.prototype.canAddMember = function() {')
      lines.push('    return this._actors.length < this.maxBattleMembers();')
      lines.push('};')
      lines.push('')
      lines.push('// Helper method to get remaining slots')
      lines.push('Game_Party.prototype.remainingSlots = function() {')
      lines.push('    return Math.max(0, this.maxBattleMembers() - this._actors.length);')
      lines.push('};')
    } else if (featureType === 'addRemoveHook') {
      const hookTiming = (values.hookTiming as string) || 'after'

      lines.push('// Party Member Change Hooks')
      lines.push('')

      if (hookTiming === 'after') {
        // After hooks
        lines.push('// Hook for when a member is added')
        lines.push('const _Game_Party_addActor = Game_Party.prototype.addActor;')
        lines.push('Game_Party.prototype.addActor = function(actorId) {')
        lines.push('    const wasInParty = this._actors.includes(actorId);')
        lines.push('    _Game_Party_addActor.call(this, actorId);')
        lines.push('')
        lines.push('    if (!wasInParty && this._actors.includes(actorId)) {')
        lines.push('        // Member was successfully added')
        lines.push('        this.onMemberAdded(actorId);')
        lines.push('    }')
        lines.push('};')
        lines.push('')
        lines.push('// Called when a member is added to the party')
        lines.push('Game_Party.prototype.onMemberAdded = function(actorId) {')
        lines.push('    const actor = $gameActors.actor(actorId);')
        lines.push("    console.log(actor.name() + ' joined the party!');")
        lines.push('    // Add your custom logic here')
        lines.push('};')
        lines.push('')
        lines.push('// Hook for when a member is removed')
        lines.push('const _Game_Party_removeActor = Game_Party.prototype.removeActor;')
        lines.push('Game_Party.prototype.removeActor = function(actorId) {')
        lines.push('    const wasInParty = this._actors.includes(actorId);')
        lines.push('    _Game_Party_removeActor.call(this, actorId);')
        lines.push('')
        lines.push('    if (wasInParty && !this._actors.includes(actorId)) {')
        lines.push('        // Member was successfully removed')
        lines.push('        this.onMemberRemoved(actorId);')
        lines.push('    }')
        lines.push('};')
        lines.push('')
        lines.push('// Called when a member is removed from the party')
        lines.push('Game_Party.prototype.onMemberRemoved = function(actorId) {')
        lines.push('    const actor = $gameActors.actor(actorId);')
        lines.push("    console.log(actor.name() + ' left the party!');")
        lines.push('    // Add your custom logic here')
        lines.push('};')
      } else {
        // Before hooks (can prevent changes)
        lines.push('// Hook for when a member is about to be added')
        lines.push('const _Game_Party_addActor = Game_Party.prototype.addActor;')
        lines.push('Game_Party.prototype.addActor = function(actorId) {')
        lines.push('    // Return false from canAddMember to prevent adding')
        lines.push('    if (!this.canAddThisMember(actorId)) {')
        lines.push("        console.log('Cannot add this member!');")
        lines.push('        return;')
        lines.push('    }')
        lines.push('    _Game_Party_addActor.call(this, actorId);')
        lines.push('};')
        lines.push('')
        lines.push('// Override to control which actors can be added')
        lines.push('Game_Party.prototype.canAddThisMember = function(actorId) {')
        lines.push('    // Add your conditions here')
        lines.push('    // Example: return actorId !== 5; // Cannot add actor 5')
        lines.push('    return true;')
        lines.push('};')
        lines.push('')
        lines.push('// Hook for when a member is about to be removed')
        lines.push('const _Game_Party_removeActor = Game_Party.prototype.removeActor;')
        lines.push('Game_Party.prototype.removeActor = function(actorId) {')
        lines.push('    // Return false from canRemoveMember to prevent removing')
        lines.push('    if (!this.canRemoveThisMember(actorId)) {')
        lines.push("        console.log('Cannot remove this member!');")
        lines.push('        return;')
        lines.push('    }')
        lines.push('    _Game_Party_removeActor.call(this, actorId);')
        lines.push('};')
        lines.push('')
        lines.push('// Override to control which actors can be removed')
        lines.push('Game_Party.prototype.canRemoveThisMember = function(actorId) {')
        lines.push('    // Add your conditions here')
        lines.push('    // Example: return actorId !== 1; // Cannot remove actor 1 (leader)')
        lines.push('    return true;')
        lines.push('};')
      }
    } else if (featureType === 'reserveParty') {
      const maxReserve = (values.maxReserve as number) || 10

      lines.push('// Reserve Party System')
      lines.push(`// Maximum reserve members: ${maxReserve}`)
      lines.push('')
      lines.push('// Initialize reserve party array')
      lines.push('const _Game_Party_initialize = Game_Party.prototype.initialize;')
      lines.push('Game_Party.prototype.initialize = function() {')
      lines.push('    _Game_Party_initialize.call(this);')
      lines.push('    this._reserveMembers = [];')
      lines.push('};')
      lines.push('')
      lines.push('// Get maximum reserve size')
      lines.push('Game_Party.prototype.maxReserveMembers = function() {')
      lines.push(`    return ${maxReserve};`)
      lines.push('};')
      lines.push('')
      lines.push('// Get all reserve members')
      lines.push('Game_Party.prototype.reserveMembers = function() {')
      lines.push('    return this._reserveMembers.map(id => $gameActors.actor(id));')
      lines.push('};')
      lines.push('')
      lines.push('// Add actor to reserve party')
      lines.push('Game_Party.prototype.addToReserve = function(actorId) {')
      lines.push('    if (this._reserveMembers.length >= this.maxReserveMembers()) {')
      lines.push("        console.log('Reserve party is full!');")
      lines.push('        return false;')
      lines.push('    }')
      lines.push('    if (!this._reserveMembers.includes(actorId)) {')
      lines.push('        this._reserveMembers.push(actorId);')
      lines.push('        return true;')
      lines.push('    }')
      lines.push('    return false;')
      lines.push('};')
      lines.push('')
      lines.push('// Remove actor from reserve party')
      lines.push('Game_Party.prototype.removeFromReserve = function(actorId) {')
      lines.push('    const index = this._reserveMembers.indexOf(actorId);')
      lines.push('    if (index >= 0) {')
      lines.push('        this._reserveMembers.splice(index, 1);')
      lines.push('        return true;')
      lines.push('    }')
      lines.push('    return false;')
      lines.push('};')
      lines.push('')
      lines.push('// Swap actor between active party and reserve')
      lines.push('Game_Party.prototype.swapWithReserve = function(activeActorId, reserveActorId) {')
      lines.push('    if (!this._actors.includes(activeActorId)) return false;')
      lines.push('    if (!this._reserveMembers.includes(reserveActorId)) return false;')
      lines.push('')
      lines.push('    // Remove from current positions')
      lines.push('    this.removeActor(activeActorId);')
      lines.push('    this.removeFromReserve(reserveActorId);')
      lines.push('')
      lines.push('    // Add to new positions')
      lines.push('    this.addActor(reserveActorId);')
      lines.push('    this.addToReserve(activeActorId);')
      lines.push('')
      lines.push('    return true;')
      lines.push('};')
      lines.push('')
      lines.push('// Check if actor is in reserve')
      lines.push('Game_Party.prototype.isInReserve = function(actorId) {')
      lines.push('    return this._reserveMembers.includes(actorId);')
      lines.push('};')
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const featureType = values.featureType as string

    if (featureType === 'sizeLimit') {
      const maxSize = values.maxSize as number
      const minSize = values.minSize as number

      if (maxSize !== undefined && maxSize < 1) {
        errors.push('Maximum Party Size must be at least 1')
      }
      if (minSize !== undefined && minSize < 1) {
        errors.push('Minimum Party Size must be at least 1')
      }
      if (maxSize !== undefined && minSize !== undefined && minSize > maxSize) {
        errors.push('Minimum Party Size cannot be greater than Maximum Party Size')
      }
    }

    if (featureType === 'reserveParty') {
      const maxReserve = values.maxReserve as number
      if (maxReserve !== undefined && maxReserve < 1) {
        errors.push('Maximum Reserve Size must be at least 1')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 3: Equipment Hook
 * Hook into equip/unequip events with before/after timing
 */
const equipmentHookTemplate: CodeTemplate = {
  id: 'actor-equipment-hook',
  category: 'actor-party',
  name: 'Equipment Hook',
  description: 'Hook into equip/unequip events with before/after timing',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Game_Actor.html',
  icon: 'Users',
  fields: [
    {
      id: 'eventType',
      label: 'Event Type',
      type: 'select',
      required: true,
      options: [
        { value: 'equip', label: 'Equip - When equipment is put on' },
        { value: 'unequip', label: 'Unequip - When equipment is removed' },
        { value: 'both', label: 'Both - React to equip and unequip' },
        { value: 'change', label: 'Change - When equipment is swapped' }
      ],
      default: 'both',
      help: 'Which equipment events to hook into'
    },
    {
      id: 'timing',
      label: 'Timing',
      type: 'select',
      required: true,
      options: [
        { value: 'after', label: 'After - Run code after equipment change' },
        { value: 'before', label: 'Before - Run code before (can prevent change)' },
        { value: 'both', label: 'Both - Before and after hooks' }
      ],
      default: 'after',
      help: 'When your code should run relative to the equipment change'
    },
    {
      id: 'slotFilter',
      label: 'Slot Filter (optional)',
      type: 'select',
      options: [
        { value: 'all', label: 'All Slots' },
        { value: '0', label: 'Slot 0 - Weapon' },
        { value: '1', label: 'Slot 1 - Shield' },
        { value: '2', label: 'Slot 2 - Head' },
        { value: '3', label: 'Slot 3 - Body' },
        { value: '4', label: 'Slot 4 - Accessory' }
      ],
      default: 'all',
      help: 'Filter to react only to specific equipment slots'
    }
  ],
  generate: (values): string => {
    const eventType = (values.eventType as string) || 'both'
    const timing = (values.timing as string) || 'after'
    const slotFilter = (values.slotFilter as string) || 'all'

    const lines: string[] = []
    const hasSlotFilter = slotFilter !== 'all'
    const slotNames: Record<string, string> = {
      '0': 'Weapon',
      '1': 'Shield',
      '2': 'Head',
      '3': 'Body',
      '4': 'Accessory'
    }

    // Header comment
    const eventLabel =
      eventType === 'both'
        ? 'Equip/Unequip'
        : eventType === 'change'
          ? 'Equipment Change'
          : toPascalCase(eventType)
    const timingLabel =
      timing === 'both' ? 'Before and After' : timing === 'before' ? 'Before' : 'After'
    const slotLabel = hasSlotFilter ? ` (${slotNames[slotFilter]} slot only)` : ''
    lines.push(`// Equipment Hook: ${eventLabel} - ${timingLabel}${slotLabel}`)
    lines.push('')

    if (eventType === 'change') {
      // Hook into changeEquip which handles both equip and unequip in one call
      lines.push('// Hook into equipment change (swap)')
      lines.push('const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;')
      lines.push('Game_Actor.prototype.changeEquip = function(slotId, item) {')

      if (hasSlotFilter) {
        lines.push(`    if (slotId !== ${slotFilter}) {`)
        lines.push('        _Game_Actor_changeEquip.call(this, slotId, item);')
        lines.push('        return;')
        lines.push('    }')
        lines.push('')
      }

      if (timing === 'before' || timing === 'both') {
        lines.push('    const oldItem = this.equips()[slotId];')
        lines.push('')
        lines.push('    // Before equipment change')
        lines.push('    if (!this.onBeforeEquipChange(slotId, oldItem, item)) {')
        lines.push('        return; // Prevent the change')
        lines.push('    }')
        lines.push('')
      }

      lines.push('    const oldEquip = this.equips()[slotId];')
      lines.push('    _Game_Actor_changeEquip.call(this, slotId, item);')

      if (timing === 'after' || timing === 'both') {
        lines.push('')
        lines.push('    // After equipment change')
        lines.push('    this.onAfterEquipChange(slotId, oldEquip, item);')
      }

      lines.push('};')
      lines.push('')

      if (timing === 'before' || timing === 'both') {
        lines.push('// Called before equipment change - return false to prevent')
        lines.push(
          'Game_Actor.prototype.onBeforeEquipChange = function(slotId, oldItem, newItem) {'
        )
        lines.push('    // Your code here')
        lines.push(
          "    console.log(this.name() + ' is about to change equipment in slot ' + slotId);"
        )
        lines.push("    console.log('Old:', oldItem ? oldItem.name : 'none');")
        lines.push("    console.log('New:', newItem ? newItem.name : 'none');")
        lines.push('    return true; // Return false to prevent the change')
        lines.push('};')
        lines.push('')
      }

      if (timing === 'after' || timing === 'both') {
        lines.push('// Called after equipment change')
        lines.push('Game_Actor.prototype.onAfterEquipChange = function(slotId, oldItem, newItem) {')
        lines.push('    // Your code here')
        lines.push("    console.log(this.name() + ' changed equipment in slot ' + slotId);")
        lines.push("    console.log('Was:', oldItem ? oldItem.name : 'none');")
        lines.push("    console.log('Now:', newItem ? newItem.name : 'none');")
        lines.push('};')
      }
    } else {
      // Equip and/or unequip hooks using forceChangeEquip for more granular control
      if (eventType === 'equip' || eventType === 'both') {
        lines.push('// Hook for equipment being put on')
        lines.push('const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;')
        lines.push('Game_Actor.prototype.changeEquip = function(slotId, item) {')

        if (hasSlotFilter) {
          lines.push(`    if (slotId !== ${slotFilter}) {`)
          lines.push('        _Game_Actor_changeEquip.call(this, slotId, item);')
          lines.push('        return;')
          lines.push('    }')
          lines.push('')
        }

        lines.push('    const oldItem = this.equips()[slotId];')
        lines.push(
          '    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);'
        )

        if (timing === 'before' || timing === 'both') {
          lines.push('')
          lines.push('    // Before equip hook')
          lines.push('    if (isEquipping) {')
          lines.push('        if (!this.onBeforeEquip(slotId, item)) {')
          lines.push('            return; // Prevent the equip')
          lines.push('        }')
          lines.push('    }')
        }

        lines.push('')
        lines.push('    _Game_Actor_changeEquip.call(this, slotId, item);')

        if (timing === 'after' || timing === 'both') {
          lines.push('')
          lines.push('    // After equip hook')
          lines.push('    if (isEquipping && this.equips()[slotId] === item) {')
          lines.push('        this.onAfterEquip(slotId, item);')
          lines.push('    }')
        }

        lines.push('};')
        lines.push('')

        if (timing === 'before' || timing === 'both') {
          lines.push('// Called before equipment is put on - return false to prevent')
          lines.push('Game_Actor.prototype.onBeforeEquip = function(slotId, item) {')
          lines.push('    // Your code here')
          lines.push("    console.log(this.name() + ' is about to equip ' + item.name);")
          lines.push('    return true; // Return false to prevent equipping')
          lines.push('};')
          lines.push('')
        }

        if (timing === 'after' || timing === 'both') {
          lines.push('// Called after equipment is put on')
          lines.push('Game_Actor.prototype.onAfterEquip = function(slotId, item) {')
          lines.push('    // Your code here')
          lines.push("    console.log(this.name() + ' equipped ' + item.name);")
          lines.push('};')
        }
      }

      if (eventType === 'both') {
        lines.push('')
      }

      if (eventType === 'unequip' || eventType === 'both') {
        if (eventType === 'unequip') {
          // Only generate the alias if we didn't already
          lines.push('// Hook for equipment being removed')
          lines.push('const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;')
          lines.push('Game_Actor.prototype.changeEquip = function(slotId, item) {')
        } else {
          lines.push('// Additional unequip handling in the existing hook')
          lines.push('// (Note: This is already handled in the changeEquip hook above)')
          lines.push('// Add this logic to the existing hook:')
          lines.push('')
          lines.push('/*')
        }

        if (eventType === 'unequip') {
          if (hasSlotFilter) {
            lines.push(`    if (slotId !== ${slotFilter}) {`)
            lines.push('        _Game_Actor_changeEquip.call(this, slotId, item);')
            lines.push('        return;')
            lines.push('    }')
            lines.push('')
          }

          lines.push('    const oldItem = this.equips()[slotId];')
          lines.push(
            '    const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);'
          )

          if (timing === 'before' || timing === 'both') {
            lines.push('')
            lines.push('    // Before unequip hook')
            lines.push('    if (isUnequipping) {')
            lines.push('        if (!this.onBeforeUnequip(slotId, oldItem)) {')
            lines.push('            return; // Prevent the unequip')
            lines.push('        }')
            lines.push('    }')
          }

          lines.push('')
          lines.push('    _Game_Actor_changeEquip.call(this, slotId, item);')

          if (timing === 'after' || timing === 'both') {
            lines.push('')
            lines.push('    // After unequip hook')
            lines.push('    if (isUnequipping) {')
            lines.push('        this.onAfterUnequip(slotId, oldItem);')
            lines.push('    }')
          }

          lines.push('};')
        } else {
          // For 'both', show as comments since we already have changeEquip hooked
          lines.push(
            'const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);'
          )
          lines.push('if (isUnequipping) {')
          lines.push('    // Call onBeforeUnequip/onAfterUnequip as needed')
          lines.push('}')
          lines.push('*/')
        }

        lines.push('')

        if (timing === 'before' || timing === 'both') {
          lines.push('// Called before equipment is removed - return false to prevent')
          lines.push('Game_Actor.prototype.onBeforeUnequip = function(slotId, item) {')
          lines.push('    // Your code here')
          lines.push("    console.log(this.name() + ' is about to unequip ' + item.name);")
          lines.push('    return true; // Return false to prevent unequipping')
          lines.push('};')
          lines.push('')
        }

        if (timing === 'after' || timing === 'both') {
          lines.push('// Called after equipment is removed')
          lines.push('Game_Actor.prototype.onAfterUnequip = function(slotId, item) {')
          lines.push('    // Your code here')
          lines.push("    console.log(this.name() + ' unequipped ' + item.name);")
          lines.push('};')
        }
      }
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.eventType) {
      errors.push('Event Type is required')
    }
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
registerTemplate(customActorPropertyTemplate)
registerTemplate(partyManagementTemplate)
registerTemplate(equipmentHookTemplate)

export { customActorPropertyTemplate, partyManagementTemplate, equipmentHookTemplate }
