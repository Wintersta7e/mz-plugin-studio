// Inputs of the wrong type, pinned before strictness edits change how the code that reads them
// is typed: template values of another JavaScript type than the field declares, `null` and
// arrays in every field, and parameter files whose defaults are not the declared type.
import {
  getTemplate,
  type TemplateField
} from '../../../src/renderer/src/lib/generator/templates/index'
import { baseValues, type TemplateCase } from './templates'

// A value of another JavaScript type than each field type holds.
const WRONG_TYPE: Record<TemplateField['type'], unknown> = {
  text: 42,
  'class-select': 42,
  'method-select': 42,
  'key-select': 42,
  number: 'abc',
  boolean: 'yes',
  select: 7
}

// Every field of the template set by `value`.
function everyField(id: string, value: (field: TemplateField) => unknown): Record<string, unknown> {
  const fields = getTemplate(id)?.fields ?? []
  return Object.fromEntries(fields.map((field) => [field.id, value(field)]))
}

// A wrong-typed or null value in some fields, the base values in the rest. The three cases of
// every template stop at the first field read, so these reach the branches and checks after it.
const PARTIAL_CASES: Record<string, Record<string, unknown>[]> = {
  'actor-custom-property': [
    { minValue: null },
    { propertyName: 'level', maxValue: null },
    { dataType: 'boolean', defaultValue: 7 },
    { dataType: 'array', defaultValue: null }
  ],
  'actor-equipment-hook': [
    { slotFilter: 7 },
    { eventType: 'change', slotFilter: 7 },
    { eventType: 'unequip', slotFilter: 7 }
  ],
  'audio-bgm-control': [{ pan: null, functionName: 'playTheme' }],
  'audio-crossfade': [
    { crossfadeType: 'fadeFromSilence', fadeFromSilenceBgm: null },
    { crossfadeType: 'fadeFromSilence', fadeFromSilenceBgm: 7 },
    { newBgmPitch: null, functionName: 'crossfadeTheme' }
  ],
  'audio-se-player': [
    { randomizePitch: true, pitchVariation: null },
    { pan: null, functionName: 'playCursor' }
  ],
  'battle-damage-modifier': [
    { condition: null },
    { modifyType: 'custom', condition: null },
    { modifyType: 'add', modifyValue: '2;x', condition: null }
  ],
  'battle-event-hook': [{ eventType: 'start' }],
  'battle-state-hook': [{ hookType: null, stateId: '3' }],
  'custom-window-basic': [
    { width: null },
    { parentClass: 7, width: 'abc', height: null, addToScene: 'Scene_Map' },
    { parentClass: 'Window_Command', width: ['a', 'b'], addToScene: 'Scene_Menu' },
    {
      windowName: 'listWindow',
      parentClass: 'Window_Selectable',
      addToScene: 'Scene_Map',
      width: null
    }
  ],
  'gauge-window': [
    { gaugeCount: '3', dataSource: 'variable', width: null, gaugeHeight: null },
    { gaugeCount: 3, positionX: 'abc', gaugeHeight: ['a', 'b'] },
    { gaugeCount: '3', gauge3Color2: 7 },
    { dataSource: 'custom', showLabels: 'false', positionY: null }
  ],
  'hud-overlay-window': [
    { positionY: null, opacity: null },
    { positionX: 'abc', width: ['a', 'b'], opacity: 'x' },
    { hudType: 'status', opacity: null },
    { hudType: 'minimap', positionY: null },
    { hudType: 'custom', width: null },
    { opacity: 300, positionY: null }
  ],
  'database-ext-notetag': [
    { propertyName: null },
    { tagName: null, defaultValue: null },
    { tagName: 'note', tagFormat: 'boolean', propertyName: null },
    { tagFormat: 'keyValue', propertyName: 'bonus', defaultValue: null },
    { tagFormat: 'multiline', valueType: 'boolean', defaultValue: 'yes' },
    { valueType: 'array', defaultValue: '1, 2', propertyName: null },
    { tagFormat: 7 },
    { valueType: 7 },
    { valueType: 'number', defaultValue: 'abc' }
  ],
  'input-handler-basic': [
    { activeScene: 'all', triggerType: null },
    { activeScene: 'all', keyName: null }
  ],
  'map-event-spawn': [{ templateEventId: '7' }, { persistAcrossTransfer: null }],
  'map-parallel-process': [
    { updateInterval: '2' },
    { activeCondition: 'switch', conditionId: '3' },
    { activeCondition: 'variable', conditionValue: 'abc' }
  ],
  'map-transfer-hook': [{ filterMapId: '12', includeDirection: null }],
  'menu-command-addition': [
    { enableCondition: 'switch', switchId: null },
    { requiresActor: 'yes', enableCondition: 'switch', switchId: 'abc' },
    { insertPosition: 'afterItem', enableCondition: 'custom', switchId: null },
    { insertPosition: 'afterSkill', switchId: null },
    { insertPosition: 'afterEquip', switchId: null },
    { insertPosition: 'afterStatus', switchId: null },
    { insertPosition: 'beforeSave', switchId: null },
    { insertPosition: 'beforeGameEnd', switchId: null },
    { insertPosition: 'end', switchId: null }
  ],
  'menu-custom-scene': [
    { includeHelp: null },
    { windowType: 'command', includeHelp: true, includeGold: null },
    { windowType: 'base', includeHelp: null, includeGold: true }
  ],
  'menu-options-addition': [
    { persistToConfig: null },
    { optionType: 'volume', defaultValue: 42 },
    { optionType: 'volume', defaultValue: '50', persistToConfig: null },
    { optionType: 'select', defaultValue: 42, choices: null },
    { optionType: 'select', choices: 'Low, High', persistToConfig: null },
    { optionType: 'select', choices: 42 },
    { optionType: 'slider', defaultValue: null }
  ],
  'menu-title-mod': [
    { modType: 'hideCommand', hideTarget: 7 },
    { commandName: null },
    { modType: 'replaceBackground', commandName: null },
    { modType: 'hideCommand', hideTarget: 'newGame', commandName: null },
    { modType: 'hideCommand', hideTarget: 'continue', commandName: null },
    { modType: 'customCreate', commandName: null },
    { modType: 'hideCommand', hideTarget: null }
  ],
  'message-choice-handler': [
    { modType: 'columns', numColumns: null, choiceWidth: null },
    { modType: 'style', highlightColor: null, windowOpacity: null },
    { modType: 'behavior', wrapAround: null, rememberChoice: null }
  ],
  'message-custom-text-code': [
    { hasParameter: null, effectType: null },
    { codeType: null, replacementText: null },
    { codeType: 'effect', hasParameter: null, effectType: null }
  ],
  'message-window-mod': [
    { positionType: 'custom', customX: null, customY: 'abc' },
    { modType: 'size', windowWidth: null, numLines: null },
    { modType: 'background', bgType: null },
    { modType: 'background', bgType: 'custom', bgColor: null },
    { modType: 'background', bgType: 'custom', bgColor: 42 },
    { modType: 'opacity', opacityValue: null },
    { modType: 'nameBox', nameBoxPosition: null }
  ],
  'method-alias-basic': [{ timing: null }],
  'party-management': [
    { minSize: '2' },
    { maxSize: null },
    { featureType: 'addRemoveHook', hookTiming: 7 },
    { featureType: 'reserveParty', maxReserve: 'abc' },
    { featureType: 'reserveParty', maxReserve: null }
  ],
  'plugin-command-async': [
    { waitType: 'setWaitMode', pluginName: 42 },
    { waitType: 'waitCount', waitDuration: null },
    { waitType: 'waitCount', waitDuration: 'abc' },
    { waitType: 'waitCount', commandName: null }
  ],
  'plugin-command-basic': [
    { arg1Name: 'target', arg1Type: 7, arg2Name: 'value', arg2Type: ['a', 'b'] },
    { arg1Name: 'target', arg2Name: 42 },
    { commandName: ' ', pluginName: null },
    { commandName: '1st', arg1Type: null },
    { pluginName: ' ', arg2Type: null }
  ],
  'plugin-command-validated': [
    { errorHandling: 'silent', pluginName: 42 },
    { errorHandling: 'throw', pluginName: null },
    { minValue: null, maxValue: 'abc' },
    { minValue: 5, maxValue: null }
  ],
  'popup-notification-window': [
    { defaultDuration: null, height: null },
    { defaultDuration: 'abc', width: ['a', 'b'], position: 'center' },
    { height: 'abc', position: 'bottom' },
    { textColor: 7 },
    { fadeEffect: 'slide', height: null },
    { fadeEffect: 'none', width: null }
  ],
  'save-load-basic': [
    { dataName: 'save', defaultValue: null },
    { dataType: 'object', defaultValue: '[]' },
    { dataType: 'array', defaultValue: '{}' },
    { dataType: 'number', defaultValue: 'abc' },
    { dataType: 'boolean', defaultValue: 'yes' }
  ],
  'sprite-custom-class': [
    { width: null },
    { parentClass: 7, width: 'abc', height: null, useBitmap: 'empty' },
    { width: ['a', 'b'], useBitmap: 'filled', fillColor: 7 }
  ],
  'sprite-frame-animation': [
    { frameCount: null, frameWidth: null },
    { frameDelay: 'abc', frameHeight: ['a', 'b'] },
    { animationType: 'grid', columns: ['a', 'b'] },
    { animationType: 'mixin', targetClass: 7, frameCount: 'abc', columns: ['a', 'b'] },
    { animationType: 'mixin', columns: '3', frameWidth: null },
    { animationType: 'mixin', targetClass: null }
  ],
  'sprite-picture-manipulation': [
    { operation: 'move', pictureId: 'abc', x: null, duration: ['a', 'b'] },
    { operation: 'rotate', rotationSpeed: 'abc' },
    { operation: 'tint', tintRed: null, tintGray: 'abc' },
    { operation: 'erase', pictureId: null }
  ]
}

const partialCaseName = (changes: Record<string, unknown>): string =>
  Object.entries(changes)
    .map(([field, value]) => `${field}=${JSON.stringify(value)}`)
    .join(',')

// The type-violating cases of one template, pinned in a golden file of their own.
export function typeViolatingTemplateCases(id: string): TemplateCase[] {
  return [
    {
      name: 'type-violating: wrong types',
      values: everyField(id, (field) => WRONG_TYPE[field.type]),
      hostile: null
    },
    { name: 'type-violating: null', values: everyField(id, () => null), hostile: null },
    { name: 'type-violating: arrays', values: everyField(id, () => ['a', 'b']), hostile: null },
    ...(PARTIAL_CASES[id] ?? []).map((changes) => ({
      name: `type-violating: ${partialCaseName(changes)}`,
      values: { ...baseValues(id), ...changes },
      hostile: null
    }))
  ]
}

export interface TypeViolatingDefaultCase {
  // Golden stem under `generator/`.
  name: string
  // The parameter file's text, read through the import path.
  content: string
}

// One default value per case, set on a parameter of each type below.
const DEFAULTS: [string, unknown][] = [
  ['number-5', 5],
  ['number-0', 0],
  ['number-fraction', 1.5],
  ['true', true],
  ['false', false],
  ['null', null],
  ['array', ['a', 'b']],
  ['object', { k: 1 }]
]

const OPTIONS = [
  { value: 'fast', text: 'Fast' },
  { value: 'slow', text: 'Slow' }
]

const parameter = (name: string, type: string, value: unknown): Record<string, unknown> => ({
  name,
  text: name,
  desc: `A ${type} parameter.`,
  type,
  default: value,
  ...(type === 'select' && { options: OPTIONS })
})

const file = (parameters: Record<string, unknown>[]): string =>
  JSON.stringify({ version: 1, source: 'Fixture_Defaults', parameters })

export const typeViolatingDefaultCases: TypeViolatingDefaultCase[] = [
  ...DEFAULTS.map(([label, value]) => ({
    name: `type-violating-default-${label}`,
    content: file([
      parameter('Label', 'string', value),
      parameter('Count', 'number', value),
      parameter('Enabled', 'boolean', value),
      parameter('Mode', 'select', value)
    ])
  })),
  // A parameter whose type is a number: skipped by name, beside one that loads.
  {
    name: 'type-violating-param-type',
    content: file([
      { ...parameter('Broken', 'string', 'x'), type: 7 },
      parameter('Label', 'string', 'Hello')
    ])
  }
]
