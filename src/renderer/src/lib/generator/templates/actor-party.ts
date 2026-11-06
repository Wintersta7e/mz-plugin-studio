/**
Actor & Party Templates

Templates for modifying RPG Maker MZ actor and party systems:
- Custom actor properties with getter/setter
- Party management (add/remove members, size limits)
- Equipment hooks (equip/unequip events)
*/

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'
import { defaultLiteralOf, definedOr, expectText, valueOr } from './values'

/**
Convert a property name to PascalCase for method names
e.g., "loyalty" -> "Loyalty"
*/
function toPascalCase(value: unknown): string {
  const hasText = Boolean(value)
  if (!hasText) return ''
  const text = expectText(value)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
Template 1: Custom Actor Property
Add a new property to Game_Actor with getter/setter
*/
const customActorPropertyTemplate: CodeTemplate = {
  id: 'actor-custom-property',
  category: 'actor-party',
  name: 'Custom Actor Property',
  description: 'Add a new property to Game_Actor with getter/setter',
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
    const propertyName = String(values['propertyName'])
    const dataType = valueOr(values['dataType'], 'number')
    // Number() in the check ignores surrounding whitespace; the code gets the trimmed text.
    const minValue = String(definedOr(values['minValue'], '')).trim()
    const maxValue = String(definedOr(values['maxValue'], '')).trim()
    const isIncludeChange = values['includeChange'] !== false

    const pascalName = toPascalCase(values['propertyName'])
    const defaultLiteral = defaultLiteralOf(dataType, values['defaultValue'])
    const isNumber = dataType === 'number'
    const hasMin = isNumber && minValue !== ''
    const hasMax = isNumber && maxValue !== ''
    const hasClamp = hasMin || hasMax
    const minString = hasMin ? minValue : '-Infinity'
    const maxString = hasMax ? maxValue : 'Infinity'

    const lines = [
      `// Custom Actor Property: ${propertyName}`,
      // Header comment
      `// Type: ${String(dataType)}, Default: ${defaultLiteral}`,
      ...(hasClamp ? [`// Range: ${minString} to ${maxString}`] : []),
      '',
      // Initialize the property in Game_Actor.initMembers
      '// Initialize the property when actor is created',
      'const _Game_Actor_initMembers = Game_Actor.prototype.initMembers;',
      'Game_Actor.prototype.initMembers = function() {',
      '    _Game_Actor_initMembers.call(this);',
      `    this._${propertyName} = ${defaultLiteral};`,
      '};',
      '',
      // Getter method
      `// Getter: actor.${propertyName}()`,
      `Game_Actor.prototype.${propertyName} = function() {`,
      `    return this._${propertyName};`,
      '};',
      '',
      // Setter method
      `// Setter: actor.set${pascalName}(value)`,
      `Game_Actor.prototype.set${pascalName} = function(value) {`,
      ...(hasClamp
        ? [
            `    // Clamp value to valid range`,
            `    this._${propertyName} = Math.max(${minString}, Math.min(${maxString}, value));`
          ]
        : [`    this._${propertyName} = value;`]),
      '};'
    ]

    // Change method for numbers
    if (isIncludeChange && isNumber) {
      lines.push(
        '',
        `// Change method: actor.change${pascalName}(amount)`,
        `// Use positive values to increase, negative to decrease`,
        `Game_Actor.prototype.change${pascalName} = function(amount) {`,
        `    this.set${pascalName}(this._${propertyName} + amount);`,
        '};'
      )
    }

    // Toggle method for booleans
    if (dataType === 'boolean') {
      lines.push(
        '',
        `// Toggle method: actor.toggle${pascalName}()`,
        `Game_Actor.prototype.toggle${pascalName} = function() {`,
        `    this._${propertyName} = !this._${propertyName};`,
        '};'
      )
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const propertyName = values['propertyName']
    const hasPropertyName = Boolean(propertyName)
    if (hasPropertyName) {
      // Check for valid JavaScript identifier
      if (!/^[a-z_$][\w$]*$/i.test(String(propertyName))) {
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
      const propertyText = expectText(propertyName)
      if (reservedWords.includes(propertyText.toLowerCase())) {
        errors.push(
          `"${propertyText}" conflicts with existing Game_Actor properties. Use a different name.`
        )
      }
    }

    // Validate min/max for numbers
    const dataType = values['dataType']
    if (dataType === 'number') {
      const minValue = values['minValue']
      const maxValue = values['maxValue']
      const hasMin = Boolean(minValue)
      const hasMax = Boolean(maxValue)

      if (hasMin && Number.isNaN(Number(minValue))) {
        errors.push('Minimum Value must be a valid number')
      }
      if (hasMax && Number.isNaN(Number(maxValue))) {
        errors.push('Maximum Value must be a valid number')
      }
      if (hasMin && hasMax && Number(minValue) > Number(maxValue)) {
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
The size limit hooks: a full party refuses a new member, and a party at a minimum size above 1
refuses to lose one.
*/
function sizeLimitLines(maxSize: string, minSize: unknown): string[] {
  return [
    `// Party Size Limit: ${String(minSize)} to ${maxSize} members`,
    '',
    '// Store the party size limits',
    `Game_Party.prototype.maxBattleMembers = function() {`,
    `    return ${maxSize};`,
    '};',
    '',
    '// Prevent adding members beyond the max size',
    'const _Game_Party_addActor = Game_Party.prototype.addActor;',
    'Game_Party.prototype.addActor = function(actorId) {',
    '    if (this._actors.length >= this.maxBattleMembers()) {',
    '        // Party is full - you can customize this behavior',
    "        console.log('Party is full! Cannot add more members.');",
    '        return;',
    '    }',
    '    _Game_Party_addActor.call(this, actorId);',
    '};',
    ...(Number(minSize) > 1
      ? [
          '',
          '// Prevent removing members below the min size',
          'const _Game_Party_removeActor = Game_Party.prototype.removeActor;',
          'Game_Party.prototype.removeActor = function(actorId) {',
          `    if (this._actors.length <= ${String(minSize)}) {`,
          '        // Party at minimum - you can customize this behavior',
          "        console.log('Cannot remove member - party at minimum size.');",
          '        return;',
          '    }',
          '    _Game_Party_removeActor.call(this, actorId);',
          '};'
        ]
      : []),
    '',
    '// Helper method to check if party can add members',
    'Game_Party.prototype.canAddMember = function() {',
    '    return this._actors.length < this.maxBattleMembers();',
    '};',
    '',
    '// Helper method to get remaining slots',
    'Game_Party.prototype.remainingSlots = function() {',
    '    return Math.max(0, this.maxBattleMembers() - this._actors.length);',
    '};'
  ]
}

/**
Hooks that report a member who joined or left the party, after the change.
*/
function memberAfterHookLines(): string[] {
  return [
    // After hooks
    '// Hook for when a member is added',
    'const _Game_Party_addActor = Game_Party.prototype.addActor;',
    'Game_Party.prototype.addActor = function(actorId) {',
    '    const wasInParty = this._actors.includes(actorId);',
    '    _Game_Party_addActor.call(this, actorId);',
    '',
    '    if (!wasInParty && this._actors.includes(actorId)) {',
    '        // Member was successfully added',
    '        this.onMemberAdded(actorId);',
    '    }',
    '};',
    '',
    '// Called when a member is added to the party',
    'Game_Party.prototype.onMemberAdded = function(actorId) {',
    '    const actor = $gameActors.actor(actorId);',
    "    console.log(actor.name() + ' joined the party!');",
    '    // Add your custom logic here',
    '};',
    '',
    '// Hook for when a member is removed',
    'const _Game_Party_removeActor = Game_Party.prototype.removeActor;',
    'Game_Party.prototype.removeActor = function(actorId) {',
    '    const wasInParty = this._actors.includes(actorId);',
    '    _Game_Party_removeActor.call(this, actorId);',
    '',
    '    if (wasInParty && !this._actors.includes(actorId)) {',
    '        // Member was successfully removed',
    '        this.onMemberRemoved(actorId);',
    '    }',
    '};',
    '',
    '// Called when a member is removed from the party',
    'Game_Party.prototype.onMemberRemoved = function(actorId) {',
    '    const actor = $gameActors.actor(actorId);',
    "    console.log(actor.name() + ' left the party!');",
    '    // Add your custom logic here'
  ]
}

/**
Hooks that ask before a member joins or leaves the party, and can refuse the change.
*/
function memberBeforeHookLines(): string[] {
  return [
    // Before hooks (can prevent changes)
    '// Hook for when a member is about to be added',
    'const _Game_Party_addActor = Game_Party.prototype.addActor;',
    'Game_Party.prototype.addActor = function(actorId) {',
    '    // Return false from canAddMember to prevent adding',
    '    if (!this.canAddThisMember(actorId)) {',
    "        console.log('Cannot add this member!');",
    '        return;',
    '    }',
    '    _Game_Party_addActor.call(this, actorId);',
    '};',
    '',
    '// Override to control which actors can be added',
    'Game_Party.prototype.canAddThisMember = function(actorId) {',
    '    // Add your conditions here',
    '    // Example: return actorId !== 5; // Cannot add actor 5',
    '    return true;',
    '};',
    '',
    '// Hook for when a member is about to be removed',
    'const _Game_Party_removeActor = Game_Party.prototype.removeActor;',
    'Game_Party.prototype.removeActor = function(actorId) {',
    '    // Return false from canRemoveMember to prevent removing',
    '    if (!this.canRemoveThisMember(actorId)) {',
    "        console.log('Cannot remove this member!');",
    '        return;',
    '    }',
    '    _Game_Party_removeActor.call(this, actorId);',
    '};',
    '',
    '// Override to control which actors can be removed',
    'Game_Party.prototype.canRemoveThisMember = function(actorId) {',
    '    // Add your conditions here',
    '    // Example: return actorId !== 1; // Cannot remove actor 1 (leader)',
    '    return true;'
  ]
}

/**
The reserve party: members kept outside the active party, up to a maximum.
*/
function reservePartyLines(maxReserve: string): string[] {
  return [
    '// Reserve Party System',
    `// Maximum reserve members: ${maxReserve}`,
    '',
    '// Initialize reserve party array',
    'const _Game_Party_initialize = Game_Party.prototype.initialize;',
    'Game_Party.prototype.initialize = function() {',
    '    _Game_Party_initialize.call(this);',
    '    this._reserveMembers = [];',
    '};',
    '',
    '// Get maximum reserve size',
    'Game_Party.prototype.maxReserveMembers = function() {',
    `    return ${maxReserve};`,
    '};',
    '',
    '// Get all reserve members',
    'Game_Party.prototype.reserveMembers = function() {',
    '    return this._reserveMembers.map(id => $gameActors.actor(id));',
    '};',
    '',
    '// Add actor to reserve party',
    'Game_Party.prototype.addToReserve = function(actorId) {',
    '    if (this._reserveMembers.length >= this.maxReserveMembers()) {',
    "        console.log('Reserve party is full!');",
    '        return false;',
    '    }',
    '    if (!this._reserveMembers.includes(actorId)) {',
    '        this._reserveMembers.push(actorId);',
    '        return true;',
    '    }',
    '    return false;',
    '};',
    '',
    '// Remove actor from reserve party',
    'Game_Party.prototype.removeFromReserve = function(actorId) {',
    '    const index = this._reserveMembers.indexOf(actorId);',
    '    if (index >= 0) {',
    '        this._reserveMembers.splice(index, 1);',
    '        return true;',
    '    }',
    '    return false;',
    '};',
    '',
    '// Swap actor between active party and reserve',
    'Game_Party.prototype.swapWithReserve = function(activeActorId, reserveActorId) {',
    '    if (!this._actors.includes(activeActorId)) return false;',
    '    if (!this._reserveMembers.includes(reserveActorId)) return false;',
    '',
    '    // Remove from current positions',
    '    this.removeActor(activeActorId);',
    '    this.removeFromReserve(reserveActorId);',
    '',
    '    // Add to new positions',
    '    this.addActor(reserveActorId);',
    '    this.addToReserve(activeActorId);',
    '',
    '    return true;',
    '};',
    '',
    '// Check if actor is in reserve',
    'Game_Party.prototype.isInReserve = function(actorId) {',
    '    return this._reserveMembers.includes(actorId);',
    '};'
  ]
}

/**
Template 2: Party Management
Add/remove party members with optional size limits
*/
const partyManagementTemplate: CodeTemplate = {
  id: 'party-management',
  category: 'actor-party',
  name: 'Party Management',
  description: 'Add/remove party members, party size limits',
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
    const featureType = valueOr(values['featureType'], 'sizeLimit')

    switch (featureType) {
      case 'sizeLimit': {
        const maxSize = String(valueOr(values['maxSize'], 4))
        const minSize = valueOr(values['minSize'], 1)
        return sizeLimitLines(maxSize, minSize).join('\n')
      }
      case 'addRemoveHook': {
        const hookTiming = valueOr(values['hookTiming'], 'after')
        return [
          '// Party Member Change Hooks',
          '',
          ...(hookTiming === 'after' ? memberAfterHookLines() : memberBeforeHookLines()),
          '};'
        ].join('\n')
      }
      case 'reserveParty': {
        const maxReserve = String(valueOr(values['maxReserve'], 10))
        return reservePartyLines(maxReserve).join('\n')
      }
      default: {
        return ''
      }
    }
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const featureType = values['featureType']

    if (featureType === 'sizeLimit') {
      const maxSize = values['maxSize']
      const minSize = values['minSize']

      if (maxSize !== undefined && Number(maxSize) < 1) {
        errors.push('Maximum Party Size must be at least 1')
      }
      if (minSize !== undefined && Number(minSize) < 1) {
        errors.push('Minimum Party Size must be at least 1')
      }
      if (maxSize !== undefined && minSize !== undefined && Number(minSize) > Number(maxSize)) {
        errors.push('Minimum Party Size cannot be greater than Maximum Party Size')
      }
    } else if (featureType === 'reserveParty') {
      const maxReserve = values['maxReserve']
      if (maxReserve !== undefined && Number(maxReserve) < 1) {
        errors.push('Maximum Reserve Size must be at least 1')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

const SLOT_NAMES: Record<string, string> = {
  '0': 'Weapon',
  '1': 'Shield',
  '2': 'Head',
  '3': 'Body',
  '4': 'Accessory'
}

/**
The equipment hook's slot filter and timing, as the hooks use them.
*/
interface EquipHook {
  slotText: string
  hasSlotFilter: boolean
  isBefore: boolean
  isAfter: boolean
}

/**
The event part of the header: both, a swap, or the one event named.
*/
function equipEventLabel(eventType: unknown): string {
  if (eventType === 'both') return 'Equip/Unequip'
  if (eventType === 'change') return 'Equipment Change'
  return toPascalCase(eventType)
}

/**
The timing part of the header.
*/
function equipTimingLabel(timing: unknown): string {
  if (timing === 'both') return 'Before and After'
  return timing === 'before' ? 'Before' : 'After'
}

/**
The start of a changeEquip hook that passes other slots through unchanged when a slot is filtered.
*/
function slotFilterLines(hook: EquipHook): string[] {
  if (!hook.hasSlotFilter) return []
  return [
    `    if (slotId !== ${hook.slotText}) {`,
    '        _Game_Actor_changeEquip.call(this, slotId, item);',
    '        return;',
    '    }',
    ''
  ]
}

/**
A changeEquip hook for a swap, with its before and after callbacks.
*/
function equipChangeLines(hook: EquipHook): string[] {
  return [
    // Hook into changeEquip which handles both equip and unequip in one call
    '// Hook into equipment change (swap)',
    'const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;',
    'Game_Actor.prototype.changeEquip = function(slotId, item) {',
    ...slotFilterLines(hook),
    ...(hook.isBefore
      ? [
          '    const oldItem = this.equips()[slotId];',
          '',
          '    // Before equipment change',
          '    if (!this.onBeforeEquipChange(slotId, oldItem, item)) {',
          '        return; // Prevent the change',
          '    }',
          ''
        ]
      : []),
    '    const oldEquip = this.equips()[slotId];',
    '    _Game_Actor_changeEquip.call(this, slotId, item);',
    ...(hook.isAfter
      ? [
          '',
          '    // After equipment change',
          '    this.onAfterEquipChange(slotId, oldEquip, item);'
        ]
      : []),
    '};',
    '',
    ...(hook.isBefore
      ? [
          '// Called before equipment change - return false to prevent',
          'Game_Actor.prototype.onBeforeEquipChange = function(slotId, oldItem, newItem) {',
          '    // Your code here',
          "    console.log(this.name() + ' is about to change equipment in slot ' + slotId);",
          "    console.log('Old:', oldItem ? oldItem.name : 'none');",
          "    console.log('New:', newItem ? newItem.name : 'none');",
          '    return true; // Return false to prevent the change',
          '};',
          ''
        ]
      : []),
    ...(hook.isAfter
      ? [
          '// Called after equipment change',
          'Game_Actor.prototype.onAfterEquipChange = function(slotId, oldItem, newItem) {',
          '    // Your code here',
          "    console.log(this.name() + ' changed equipment in slot ' + slotId);",
          "    console.log('Was:', oldItem ? oldItem.name : 'none');",
          "    console.log('Now:', newItem ? newItem.name : 'none');",
          '};'
        ]
      : [])
  ]
}

/**
A changeEquip hook for equipment being put on, with its before and after callbacks.
*/
function equipOnLines(hook: EquipHook): string[] {
  return [
    '// Hook for equipment being put on',
    'const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;',
    'Game_Actor.prototype.changeEquip = function(slotId, item) {',
    ...slotFilterLines(hook),
    '    const oldItem = this.equips()[slotId];',
    '    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);',
    ...(hook.isBefore
      ? [
          '',
          '    // Before equip hook',
          '    if (isEquipping) {',
          '        if (!this.onBeforeEquip(slotId, item)) {',
          '            return; // Prevent the equip',
          '        }',
          '    }'
        ]
      : []),
    '',
    '    _Game_Actor_changeEquip.call(this, slotId, item);',
    ...(hook.isAfter
      ? [
          '',
          '    // After equip hook',
          '    if (isEquipping && this.equips()[slotId] === item) {',
          '        this.onAfterEquip(slotId, item);',
          '    }'
        ]
      : []),
    '};',
    '',
    ...(hook.isBefore
      ? [
          '// Called before equipment is put on - return false to prevent',
          'Game_Actor.prototype.onBeforeEquip = function(slotId, item) {',
          '    // Your code here',
          "    console.log(this.name() + ' is about to equip ' + item.name);",
          '    return true; // Return false to prevent equipping',
          '};',
          ''
        ]
      : []),
    ...(hook.isAfter
      ? [
          '// Called after equipment is put on',
          'Game_Actor.prototype.onAfterEquip = function(slotId, item) {',
          '    // Your code here',
          "    console.log(this.name() + ' equipped ' + item.name);",
          '};'
        ]
      : [])
  ]
}

/**
A changeEquip hook of its own for equipment being removed, when only unequip is hooked.
*/
function unequipHookLines(hook: EquipHook): string[] {
  return [
    // Only generate the alias if we didn't already
    '// Hook for equipment being removed',
    'const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;',
    'Game_Actor.prototype.changeEquip = function(slotId, item) {',
    ...slotFilterLines(hook),
    '    const oldItem = this.equips()[slotId];',
    '    const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);',
    ...(hook.isBefore
      ? [
          '',
          '    // Before unequip hook',
          '    if (isUnequipping) {',
          '        if (!this.onBeforeUnequip(slotId, oldItem)) {',
          '            return; // Prevent the unequip',
          '        }',
          '    }'
        ]
      : []),
    '',
    '    _Game_Actor_changeEquip.call(this, slotId, item);',
    ...(hook.isAfter
      ? [
          '',
          '    // After unequip hook',
          '    if (isUnequipping) {',
          '        this.onAfterUnequip(slotId, oldItem);',
          '    }'
        ]
      : []),
    '};'
  ]
}

/**
The unequip handling as a comment for the hook above, when equip and unequip are both hooked.
*/
function unequipNoteLines(): string[] {
  return [
    '// Additional unequip handling in the existing hook',
    '// (Note: This is already handled in the changeEquip hook above)',
    '// Add this logic to the existing hook:',
    '',
    '/*',
    // For 'both', show as comments since we already have changeEquip hooked
    'const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);',
    'if (isUnequipping) {',
    '    // Call onBeforeUnequip/onAfterUnequip as needed',
    '}',
    '*/'
  ]
}

/**
The unequip hook, or its note when equip is hooked too, and the unequip callbacks.
*/
function unequipLines(hook: EquipHook, isUnequipOnly: boolean): string[] {
  return [
    ...(isUnequipOnly ? unequipHookLines(hook) : unequipNoteLines()),
    '',
    ...(hook.isBefore
      ? [
          '// Called before equipment is removed - return false to prevent',
          'Game_Actor.prototype.onBeforeUnequip = function(slotId, item) {',
          '    // Your code here',
          "    console.log(this.name() + ' is about to unequip ' + item.name);",
          '    return true; // Return false to prevent unequipping',
          '};',
          ''
        ]
      : []),
    ...(hook.isAfter
      ? [
          '// Called after equipment is removed',
          'Game_Actor.prototype.onAfterUnequip = function(slotId, item) {',
          '    // Your code here',
          "    console.log(this.name() + ' unequipped ' + item.name);",
          '};'
        ]
      : [])
  ]
}

/**
Template 3: Equipment Hook
Hook into equip/unequip events with before/after timing
*/
const equipmentHookTemplate: CodeTemplate = {
  id: 'actor-equipment-hook',
  category: 'actor-party',
  name: 'Equipment Hook',
  description: 'Hook into equip/unequip events with before/after timing',
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
    const eventType = valueOr(values['eventType'], 'both')
    const timing = valueOr(values['timing'], 'after')
    const slotFilter = valueOr(values['slotFilter'], 'all')
    const slotText = String(slotFilter)
    const hook: EquipHook = {
      slotText,
      hasSlotFilter: slotFilter !== 'all',
      isBefore: timing === 'before' || timing === 'both',
      isAfter: timing === 'after' || timing === 'both'
    }

    // Header comment
    const eventLabel = equipEventLabel(eventType)
    const timingLabel = equipTimingLabel(timing)
    const slotLabel = hook.hasSlotFilter ? ` (${String(SLOT_NAMES[slotText])} slot only)` : ''
    const lines = [`// Equipment Hook: ${eventLabel} - ${timingLabel}${slotLabel}`, '']

    // Equip and/or unequip hooks using forceChangeEquip for more granular control
    const isBoth = eventType === 'both'
    if (eventType === 'change') lines.push(...equipChangeLines(hook))
    if (eventType === 'equip' || isBoth) lines.push(...equipOnLines(hook))
    if (isBoth) lines.push('')
    if (eventType === 'unequip' || isBoth) {
      lines.push(...unequipLines(hook, eventType === 'unequip'))
    }

    return lines.join('\n')
  }
}

// Register all templates when this module loads
registerTemplate(customActorPropertyTemplate)
registerTemplate(partyManagementTemplate)
registerTemplate(equipmentHookTemplate)
