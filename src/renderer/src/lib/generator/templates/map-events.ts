/**
Map & Events Templates

Templates for RPG Maker MZ map and event manipulation:
- Dynamic event spawning at runtime
- Custom movement routes programmatically
- Map transfer hooks with before/after timing
- Parallel process updates on the map
*/

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'
import { definedOr, expectText, valueOr } from './values'

/**
The error for a name that is set but blank, or that is not a JavaScript identifier.
*/
function identifierErrors(value: unknown, label: string): string[] {
  const hasName = Boolean(value)
  if (!hasName) return []
  if (expectText(value).trim() === '') return [`${label} is required`]
  const isIdentifier = /^[a-z_]\w*$/i.test(String(value))
  return isIdentifier ? [] : [`${label} must be a valid JavaScript identifier`]
}

/**
The event data of a spawned event cloned from the template event.
*/
function templateEventDataLines(templateEventId: string): string[] {
  return [
    `        // Clone template event (ID: ${templateEventId})`,
    `        const templateData = $dataMap.events[${templateEventId}];`,
    '        if (!templateData) {',
    `            console.error('Template event ${templateEventId} not found');`,
    '            return null;',
    '        }',
    '',
    '        // Create new event data based on template',
    '        const eventData = JSON.parse(JSON.stringify(templateData));',
    '        eventData.id = newEventId;',
    '        eventData.x = x;',
    '        eventData.y = y;'
  ]
}

/**
The event data of a spawned event built from scratch: one page with the editor's defaults.
*/
function newEventDataLines(): string[] {
  return [
    '        // Create new event data from scratch',
    '        const eventData = {',
    '            id: newEventId,',
    '            name: options.name || "SpawnedEvent",',
    '            note: options.note || "",',
    '            pages: options.pages || [{',
    '                conditions: { actorId: 0, actorValid: false, itemId: 0, itemValid: false,',
    '                              selfSwitchCh: "A", selfSwitchValid: false,',
    '                              switch1Id: 0, switch1Valid: false,',
    '                              switch2Id: 0, switch2Valid: false,',
    '                              variableId: 0, variableValid: false, variableValue: 0 },',
    '                directionFix: false,',
    '                image: { characterIndex: 0, characterName: "", direction: 2,',
    '                         pattern: 0, tileId: 0 },',
    '                list: [{ code: 0, indent: 0, parameters: [] }],',
    '                moveFrequency: 3,',
    '                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },',
    '                moveSpeed: 3,',
    '                moveType: 0,',
    '                priorityType: 1,',
    '                stepAnime: false,',
    '                through: false,',
    '                trigger: 0,',
    '                walkAnime: true',
    '            }],',
    '            x: x,',
    '            y: y',
    '        };'
  ]
}

/**
The spawn function: a template event's clone when the template event ID is above 0, a new event
otherwise, stored for later maps when spawned events persist.
*/
function spawnFunctionLines(
  functionName: string,
  templateEventId: unknown,
  isPersistAcrossTransfer: boolean
): string[] {
  const hasTemplateEvent = Boolean(templateEventId)
  const isFromTemplate = hasTemplateEvent && Number(templateEventId) > 0
  return [
    `    // Spawn an event at the specified position`,
    `    Game_Map.prototype.${functionName} = function(x, y, options = {}) {`,
    '        // Check spawn limit',
    '        if (this._spawnedEventIds && this._spawnedEventIds.length >= MAX_SPAWNED_EVENTS) {',
    "            console.warn('Maximum spawned events reached');",
    '            return null;',
    '        }',
    '',
    '        // Find the next available event ID',
    '        let newEventId = this._events.length;',
    '        while (this._events[newEventId]) {',
    '            newEventId++;',
    '        }',
    '',
    ...(isFromTemplate ? templateEventDataLines(String(templateEventId)) : newEventDataLines()),
    '',
    '        // Apply custom options',
    '        if (options.name) eventData.name = options.name;',
    '        if (options.pages) eventData.pages = options.pages;',
    '',
    '        // Add event data to map data',
    '        $dataMap.events[newEventId] = eventData;',
    '',
    '        // Create and add the game event',
    '        const event = new Game_Event(this._mapId, newEventId);',
    '        this._events[newEventId] = event;',
    '',
    '        // Track spawned event',
    '        if (!this._spawnedEventIds) this._spawnedEventIds = [];',
    '        this._spawnedEventIds.push(newEventId);',
    '',
    ...(isPersistAcrossTransfer
      ? [
          '        // Store for persistence',
          '        _spawnedEvents.push({',
          '            mapId: this._mapId,',
          '            eventData: eventData,',
          '            eventId: newEventId',
          '        });',
          ''
        ]
      : []),
    '        // Create sprite for the event',
    '        if (SceneManager._scene && SceneManager._scene._spriteset) {',
    '            const sprite = new Sprite_Character(event);',
    '            SceneManager._scene._spriteset._characterSprites.push(sprite);',
    '            SceneManager._scene._spriteset._tilemap.addChild(sprite);',
    '        }',
    '',
    '        return event;',
    '    };',
    ''
  ]
}

/**
The despawn function, which also drops the event from the stored ones when spawned events persist.
*/
function despawnFunctionLines(isPersistAcrossTransfer: boolean): string[] {
  return [
    '    // Remove a spawned event',
    '    Game_Map.prototype.despawnEvent = function(eventId) {',
    '        if (!this._spawnedEventIds || !this._spawnedEventIds.includes(eventId)) {',
    "            console.warn('Event', eventId, 'is not a spawned event');",
    '            return false;',
    '        }',
    '',
    '        // Remove sprite',
    '        if (SceneManager._scene && SceneManager._scene._spriteset) {',
    '            const sprites = SceneManager._scene._spriteset._characterSprites;',
    '            for (let i = sprites.length - 1; i >= 0; i--) {',
    '                if (sprites[i]._character === this._events[eventId]) {',
    '                    SceneManager._scene._spriteset._tilemap.removeChild(sprites[i]);',
    '                    sprites.splice(i, 1);',
    '                    break;',
    '                }',
    '            }',
    '        }',
    '',
    '        // Remove event',
    '        delete this._events[eventId];',
    '        delete $dataMap.events[eventId];',
    '',
    '        // Remove from tracking',
    '        const index = this._spawnedEventIds.indexOf(eventId);',
    '        if (index > -1) this._spawnedEventIds.splice(index, 1);',
    '',
    ...(isPersistAcrossTransfer
      ? [
          '        // Remove from persistence',
          '        const persistIndex = _spawnedEvents.findIndex(e => ',
          '            e.mapId === this._mapId && e.eventId === eventId);',
          '        if (persistIndex > -1) _spawnedEvents.splice(persistIndex, 1);',
          ''
        ]
      : []),
    '        return true;',
    '    };'
  ]
}

/**
The function that restores the stored spawned events when a map loads.
*/
function restoreSpawnedLines(): string[] {
  return [
    '',
    '    // Restore spawned events for current map',
    '    Game_Map.prototype.restoreSpawnedEvents = function() {',
    '        this._spawnedEventIds = [];',
    '        const mapEvents = _spawnedEvents.filter(e => e.mapId === this._mapId);',
    '        for (const saved of mapEvents) {',
    '            $dataMap.events[saved.eventId] = saved.eventData;',
    '            const event = new Game_Event(this._mapId, saved.eventId);',
    '            this._events[saved.eventId] = event;',
    '            this._spawnedEventIds.push(saved.eventId);',
    '        }',
    '    };'
  ]
}

/**
Template 1: Event Spawn
Dynamically spawn events at runtime
*/
const eventSpawnTemplate: CodeTemplate = {
  id: 'map-event-spawn',
  category: 'map-events',
  name: 'Event Spawn',
  description: 'Dynamically spawn events at runtime',
  icon: 'Map',
  fields: [
    {
      id: 'functionName',
      label: 'Function Name',
      type: 'text',
      placeholder: 'spawnEvent',
      default: 'spawnEvent',
      required: true,
      help: 'Name of the function to spawn events'
    },
    {
      id: 'templateEventId',
      label: 'Template Event ID',
      type: 'number',
      placeholder: '1',
      help: 'Event ID to use as template (optional, 0 = create from scratch)'
    },
    {
      id: 'persistAcrossTransfer',
      label: 'Persist Across Map Transfer',
      type: 'boolean',
      default: false,
      help: 'Whether spawned events should persist when leaving the map'
    },
    {
      id: 'maxSpawnedEvents',
      label: 'Max Spawned Events',
      type: 'number',
      placeholder: '100',
      default: 100,
      help: 'Maximum number of spawned events allowed on the map'
    }
  ],
  generate: (values): string => {
    const functionName = String(valueOr(values['functionName'], 'spawnEvent'))
    const templateEventId = values['templateEventId']
    const isPersistAcrossTransfer = Boolean(values['persistAcrossTransfer'])
    const maxSpawnedEvents = String(valueOr(values['maxSpawnedEvents'], 100))

    return [
      '// Event Spawn System',
      '// Allows dynamic spawning of events at runtime',
      '',
      '(() => {',
      '',
      '    // Store for spawned event data',
      '    const _spawnedEvents = [];',
      `    const MAX_SPAWNED_EVENTS = ${maxSpawnedEvents};`,
      '',
      '    // Initialize spawned events when map loads',
      '    const _Game_Map_setup = Game_Map.prototype.setup;',
      '    Game_Map.prototype.setup = function(mapId) {',
      '        _Game_Map_setup.call(this, mapId);',
      // Initialize spawned events array on map setup
      ...(isPersistAcrossTransfer
        ? ['        // Restore persistent spawned events', '        this.restoreSpawnedEvents();']
        : ['        // Clear spawned events on map change', '        this._spawnedEventIds = [];']),
      '    };',
      '',
      ...spawnFunctionLines(functionName, templateEventId, isPersistAcrossTransfer),
      ...despawnFunctionLines(isPersistAcrossTransfer),
      ...(isPersistAcrossTransfer ? restoreSpawnedLines() : []),
      '',
      '})();'
    ].join('\n')
  },
  validate: (values): ValidationResult => {
    const errors = identifierErrors(values['functionName'], 'Function name')

    const maxSpawned = values['maxSpawnedEvents']
    if (maxSpawned !== undefined && Number(maxSpawned) < 1) {
      errors.push('Max spawned events must be at least 1')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
The route command codes and the start of the function that applies a route to an event.
*/
function routeFunctionStartLines(functionName: string): string[] {
  return [
    '// Custom Movement Route System',
    '// Create and apply movement routes to events programmatically',
    '',
    '(() => {',
    '',
    '    // Movement route command codes',
    '    const ROUTE = {',
    '        END: 0,',
    '        MOVE_DOWN: 1,',
    '        MOVE_LEFT: 2,',
    '        MOVE_RIGHT: 3,',
    '        MOVE_UP: 4,',
    '        MOVE_LOWER_L: 5,',
    '        MOVE_LOWER_R: 6,',
    '        MOVE_UPPER_L: 7,',
    '        MOVE_UPPER_R: 8,',
    '        MOVE_RANDOM: 9,',
    '        MOVE_TOWARD: 10,',
    '        MOVE_AWAY: 11,',
    '        MOVE_FORWARD: 12,',
    '        MOVE_BACKWARD: 13,',
    '        JUMP: 14,           // params: [x, y]',
    '        WAIT: 15,           // params: [frames]',
    '        TURN_DOWN: 16,',
    '        TURN_LEFT: 17,',
    '        TURN_RIGHT: 18,',
    '        TURN_UP: 19,',
    '        TURN_90_RIGHT: 20,',
    '        TURN_90_LEFT: 21,',
    '        TURN_180: 22,',
    '        TURN_90_RANDOM: 23,',
    '        TURN_RANDOM: 24,',
    '        TURN_TOWARD: 25,',
    '        TURN_AWAY: 26,',
    '        SWITCH_ON: 27,      // params: [switchId]',
    '        SWITCH_OFF: 28,     // params: [switchId]',
    '        CHANGE_SPEED: 29,   // params: [speed]',
    '        CHANGE_FREQ: 30,    // params: [frequency]',
    '        WALK_ON: 31,',
    '        WALK_OFF: 32,',
    '        STEP_ON: 33,',
    '        STEP_OFF: 34,',
    '        DIR_FIX_ON: 35,',
    '        DIR_FIX_OFF: 36,',
    '        THROUGH_ON: 37,',
    '        THROUGH_OFF: 38,',
    '        TRANSPARENT_ON: 39,',
    '        TRANSPARENT_OFF: 40,',
    '        CHANGE_IMAGE: 41,   // params: [name, index]',
    '        CHANGE_OPACITY: 42, // params: [opacity]',
    '        CHANGE_BLEND: 43,   // params: [blendMode]',
    '        PLAY_SE: 44,        // params: [se]',
    '        SCRIPT: 45          // params: [script]',
    '    };',
    '',
    '    // Expose ROUTE constants globally for easy access',
    '    window.ROUTE = ROUTE;',
    '',
    `    // Set a custom movement route for an event`,
    `    Game_Event.prototype.${functionName} = function(commands, options = {}) {`,
    '        const route = {',
    '            list: commands.concat([{ code: ROUTE.END, parameters: [] }]),',
    '            repeat: options.repeat || false,',
    '            skippable: options.skippable || false,',
    '            wait: options.wait || false',
    '        };',
    '',
    '        this.forceMoveRoute(route);'
  ]
}

/**
The hook that calls a route's completion callback when the route ends.
*/
function routeEndHookLines(): string[] {
  return [
    '    // Hook route completion to trigger callbacks',
    '    const _Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;',
    '    Game_Character.prototype.processRouteEnd = function() {',
    '        _Game_Character_processRouteEnd.call(this);',
    ' '.repeat(8),
    '        if (this._routeCompleteCallback) {',
    '            const callback = this._routeCompleteCallback;',
    '            this._routeCompleteCallback = null;',
    '            callback.call(this);',
    '        }',
    '    };',
    ''
  ]
}

/**
The preset route builders: patrol, chase, flee and wander.
*/
function presetRouteLines(functionName: string): string[] {
  const applyRoute = `        return this.${functionName}(commands, { repeat: true, ...options });`
  return [
    '    // ===== Preset Route Builders =====',
    '',
    // Patrol route
    '    // Create a patrol route between waypoints',
    '    Game_Event.prototype.setPatrolRoute = function(waypoints, options = {}) {',
    '        const commands = [];',
    '        for (const wp of waypoints) {',
    '            // Move to waypoint',
    '            const dx = wp.x - this.x;',
    '            const dy = wp.y - this.y;',
    ' '.repeat(12),
    '            // Add horizontal movement',
    '            const hDir = dx > 0 ? ROUTE.MOVE_RIGHT : ROUTE.MOVE_LEFT;',
    '            for (let i = 0; i < Math.abs(dx); i++) {',
    '                commands.push({ code: hDir, parameters: [] });',
    '            }',
    ' '.repeat(12),
    '            // Add vertical movement',
    '            const vDir = dy > 0 ? ROUTE.MOVE_DOWN : ROUTE.MOVE_UP;',
    '            for (let i = 0; i < Math.abs(dy); i++) {',
    '                commands.push({ code: vDir, parameters: [] });',
    '            }',
    ' '.repeat(12),
    '            // Wait at waypoint if specified',
    '            if (wp.wait) {',
    '                commands.push({ code: ROUTE.WAIT, parameters: [wp.wait] });',
    '            }',
    '        }',
    ' '.repeat(8),
    applyRoute,
    '    };',
    '',
    // Chase route
    '    // Set event to chase the player',
    '    Game_Event.prototype.setChaseRoute = function(duration = 60, options = {}) {',
    '        const commands = [];',
    '        for (let i = 0; i < duration; i++) {',
    '            commands.push({ code: ROUTE.MOVE_TOWARD, parameters: [] });',
    '        }',
    applyRoute,
    '    };',
    '',
    // Flee route
    '    // Set event to flee from the player',
    '    Game_Event.prototype.setFleeRoute = function(duration = 60, options = {}) {',
    '        const commands = [];',
    '        for (let i = 0; i < duration; i++) {',
    '            commands.push({ code: ROUTE.MOVE_AWAY, parameters: [] });',
    '        }',
    applyRoute,
    '    };',
    '',
    // Wander route
    '    // Set event to wander randomly',
    '    Game_Event.prototype.setWanderRoute = function(steps = 10, options = {}) {',
    '        const commands = [];',
    '        for (let i = 0; i < steps; i++) {',
    '            commands.push({ code: ROUTE.MOVE_RANDOM, parameters: [] });',
    '            if (options.waitBetweenSteps) {',
    '                commands.push({ code: ROUTE.WAIT, parameters: [options.waitBetweenSteps] });',
    '            }',
    '        }',
    applyRoute,
    '    };'
  ]
}

/**
Template 2: Movement Route
Create custom movement routes programmatically
*/
const movementRouteTemplate: CodeTemplate = {
  id: 'map-movement-route',
  category: 'map-events',
  name: 'Movement Route',
  description: 'Create custom movement routes programmatically',
  icon: 'Map',
  fields: [
    {
      id: 'functionName',
      label: 'Function Name',
      type: 'text',
      placeholder: 'setCustomRoute',
      default: 'setCustomRoute',
      required: true,
      help: 'Name of the function to set movement routes'
    },
    {
      id: 'includeHelpers',
      label: 'Include Helper Functions',
      type: 'boolean',
      default: true,
      help: 'Include preset route builders (patrol, chase, wander, etc.)'
    },
    {
      id: 'waitForCompletion',
      label: 'Wait for Completion Support',
      type: 'boolean',
      default: true,
      help: 'Add ability to wait for route completion via callback'
    }
  ],
  generate: (values): string => {
    const functionName = String(valueOr(values['functionName'], 'setCustomRoute'))
    const isIncludeHelpers = Boolean(values['includeHelpers'])
    const isWaitForCompletion = Boolean(values['waitForCompletion'])

    return [
      ...routeFunctionStartLines(functionName),
      ...(isWaitForCompletion
        ? [
            '',
            '        // Store callback if provided',
            '        if (options.onComplete) {',
            '            this._routeCompleteCallback = options.onComplete;',
            '        }'
          ]
        : []),
      '',
      '        return this;',
      '    };',
      '',
      // Also add to Game_Player
      `    // Set a custom movement route for the player`,
      `    Game_Player.prototype.${functionName} = Game_Event.prototype.${functionName};`,
      '',
      ...(isWaitForCompletion ? routeEndHookLines() : []),
      // Route command builder helper
      '    // Helper to create a route command',
      '    window.routeCommand = function(code, ...params) {',
      '        return { code: code, parameters: params };',
      '    };',
      '',
      ...(isIncludeHelpers ? presetRouteLines(functionName) : []),
      '',
      '})();'
    ].join('\n')
  },
  validate: (values): ValidationResult => {
    const errors = identifierErrors(values['functionName'], 'Function name')

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
The hook that runs before the player leaves a map, for every map or only the filter map.
*/
function beforeTransferLines(
  filterMapId: string,
  isIncludeFadeInfo: boolean,
  isIncludeDirection: boolean
): string[] {
  const hasMapFilter = filterMapId !== ''
  const lines = [
    '    // Before Transfer Hook',
    '    const _Game_Player_performTransfer = Game_Player.prototype.performTransfer;',
    '    Game_Player.prototype.performTransfer = function() {',
    '        if (this.isTransferring()) {',
    '            const fromMapId = $gameMap.mapId();',
    '            const toMapId = this._newMapId;',
    '',
    ...(hasMapFilter
      ? [
          `            // Filter: Only trigger for map ${filterMapId}`,
          `            if (fromMapId === ${filterMapId} || toMapId === ${filterMapId}) {`,
          '                this.onBeforeMapTransfer(fromMapId, toMapId);',
          '            }'
        ]
      : ['            this.onBeforeMapTransfer(fromMapId, toMapId);']),
    '        }',
    '',
    '        _Game_Player_performTransfer.call(this);',
    '    };',
    '',
    '    // Override this method to add your before-transfer logic',
    '    Game_Player.prototype.onBeforeMapTransfer = function(fromMapId, toMapId) {',
    '        // Your code here (before leaving the current map)',
    "        console.log('Leaving map', fromMapId, 'for map', toMapId);"
  ]
  if (isIncludeFadeInfo) {
    lines.push(
      '',
      '        // Access fade type: 0 = black, 1 = white, 2 = none',
      '        const fadeType = this._fadeType;',
      "        console.log('Fade type:', fadeType);"
    )
  }
  if (isIncludeDirection) {
    lines.push(
      '',
      '        // Access the direction player will face',
      '        const direction = this._newDirection;',
      "        console.log('New direction:', direction);"
    )
  }
  lines.push('    };', '')
  return lines
}

/**
The hook that runs after the player arrives on a map, for every map or only the filter map.
*/
function afterTransferLines(filterMapId: string, isIncludeDirection: boolean): string[] {
  const hasMapFilter = filterMapId !== ''
  const lines = [
    '    // After Transfer Hook',
    '    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;',
    '    Scene_Map.prototype.onMapLoaded = function() {',
    '        _Scene_Map_onMapLoaded.call(this);',
    '',
    '        // Check if this is a transfer (not initial load or battle return)',
    '        if ($gamePlayer._transferring) {',
    '            const mapId = $gameMap.mapId();',
    ...(hasMapFilter
      ? [
          `            // Filter: Only trigger for map ${filterMapId}`,
          `            if (mapId === ${filterMapId}) {`,
          '                this.onAfterMapTransfer(mapId);',
          '            }'
        ]
      : ['            this.onAfterMapTransfer(mapId);']),
    '        }',
    '    };',
    '',
    '    // Override this method to add your after-transfer logic',
    '    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {',
    '        // Your code here (after arriving at the new map)',
    "        console.log('Arrived at map', mapId);",
    '',
    '        // Access map information',
    '        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;',
    "        console.log('Map name:', mapName);"
  ]
  if (isIncludeDirection) {
    lines.push(
      '',
      "        // Player's position and direction",
      '        const x = $gamePlayer.x;',
      '        const y = $gamePlayer.y;',
      '        const direction = $gamePlayer.direction();',
      "        console.log('Position:', x, y, 'Direction:', direction);"
    )
  }
  lines.push('    };')
  return lines
}

/**
Template 3: Map Transfer Hook
Hook into map transfers with before/after timing
*/
const mapTransferHookTemplate: CodeTemplate = {
  id: 'map-transfer-hook',
  category: 'map-events',
  name: 'Map Transfer Hook',
  description: 'Hook into map transfers with before/after timing',
  icon: 'Map',
  fields: [
    {
      id: 'timing',
      label: 'Timing',
      type: 'select',
      options: [
        { value: 'before', label: 'Before Transfer - Before leaving current map' },
        { value: 'after', label: 'After Transfer - After arriving at new map' },
        { value: 'both', label: 'Both - Hook before and after' }
      ],
      default: 'after',
      required: true,
      help: 'When your code should run relative to the map transfer'
    },
    {
      id: 'filterMapId',
      label: 'Filter by Map ID (optional)',
      type: 'text',
      placeholder: 'Leave empty for all maps',
      help: 'Only trigger for specific map ID, or empty for all maps'
    },
    {
      id: 'includeFadeInfo',
      label: 'Include Fade Information',
      type: 'boolean',
      default: false,
      help: 'Access fade type (black, white, none) in hook'
    },
    {
      id: 'includeDirection',
      label: 'Include Direction Information',
      type: 'boolean',
      default: true,
      help: 'Access the direction player will face after transfer'
    }
  ],
  generate: (values): string => {
    const timing = valueOr(values['timing'], 'after')
    const filterMapId = String(definedOr(values['filterMapId'], '')).trim()
    const isIncludeFadeInfo = Boolean(values['includeFadeInfo'])
    const isIncludeDirection = Boolean(values['includeDirection'])

    const lines = [
      '// Map Transfer Hook',
      '// Execute custom code when transferring between maps',
      '',
      '(() => {',
      ''
    ]
    if (timing === 'before' || timing === 'both') {
      lines.push(...beforeTransferLines(filterMapId, isIncludeFadeInfo, isIncludeDirection))
    }
    if (timing === 'after' || timing === 'both') {
      lines.push(...afterTransferLines(filterMapId, isIncludeDirection))
    }
    lines.push('', '})();')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const filterMapId = values['filterMapId']
    const hasFilterMapId = Boolean(filterMapId)

    // Validate map ID if provided
    // The whole text is written as code: parseInt would pass anything after the digits.
    if (
      hasFilterMapId &&
      expectText(filterMapId).trim() !== '' &&
      !/^[1-9]\d*$/.test(expectText(filterMapId).trim())
    ) {
      errors.push('Map ID must be a positive integer')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
The body of the process's active check for the active condition.
*/
function processConditionLines(
  activeCondition: unknown,
  conditionId: string,
  conditionValue: string
): string[] {
  switch (activeCondition) {
    case 'switch': {
      return [
        `        // Active when switch ${conditionId} is ON`,
        `        return $gameSwitches.value(${conditionId});`
      ]
    }
    case 'variable': {
      return [
        `        // Active when variable ${conditionId} >= ${conditionValue}`,
        `        return $gameVariables.value(${conditionId}) >= ${conditionValue};`
      ]
    }
    case 'custom': {
      return [
        '        // Custom condition - edit as needed',
        '        return true; // Replace with your condition'
      ]
    }
    default: {
      return ['        return true;']
    }
  }
}

const MENU_SCENES = [
  'Scene_Menu',
  'Scene_Item',
  'Scene_Skill',
  'Scene_Equip',
  'Scene_Status',
  'Scene_Options',
  'Scene_Save',
  'Scene_Load',
  'Scene_GameEnd'
]

/**
The return line of the pause check: true in the menu scenes and in battle as asked, else false.
*/
function pauseReturnLine(isPauseInMenu: boolean, isPauseInBattle: boolean): string {
  const scenes = [
    ...(isPauseInMenu ? MENU_SCENES : []),
    ...(isPauseInBattle ? ['Scene_Battle'] : [])
  ]
  if (scenes.length === 0) return '        return false;'
  const conditions = scenes.map((scene) => `SceneManager._scene instanceof ${scene}`)
  return `        return ${conditions.join(' ||\n               ')};`
}

/**
The process function, with example code to customize, and the map scene hook that runs it,
every frame or once per update interval.
*/
function processRunLines(
  processText: string,
  capitalName: string,
  updateInterval: unknown
): string[] {
  return [
    // The main process function
    `    // Main parallel process logic - customize this!`,
    `    function ${processText}() {`,
    '        // Your parallel process code here',
    '        // This runs every frame (or at your specified interval) while active',
    '',
    '        // Example: Check player position',
    '        // const px = $gamePlayer.x;',
    '        // const py = $gamePlayer.y;',
    '',
    '        // Example: Check for nearby events',
    '        // const events = $gameMap.eventsXy(px, py);',
    '',
    '        // Example: Trigger something',
    '        // if (someCondition) {',
    '        //     $gameSwitches.setValue(1, true);',
    '        // }',
    '    }',
    '',
    // Hook into Scene_Map update
    '    // Hook into map scene update',
    '    const _Scene_Map_update = Scene_Map.prototype.update;',
    '    Scene_Map.prototype.update = function() {',
    '        _Scene_Map_update.call(this);',
    '',
    '        // Skip if paused or inactive',
    '        if (shouldPauseProcess()) return;',
    `        if (!is${capitalName}Active()) return;`,
    '',
    ...(Number(updateInterval) > 1
      ? [
          '        // Check interval',
          '        _frameCount++;',
          '        if (_frameCount >= UPDATE_INTERVAL) {',
          '            _frameCount = 0;',
          `            ${processText}();`,
          '        }'
        ]
      : [`        ${processText}();`]),
    '    };',
    ''
  ]
}

/**
The script calls that turn the process on and off through its switch or variable; a note for the
other conditions.
*/
function processControlLines(
  activeCondition: unknown,
  capitalName: string,
  conditionId: string,
  conditionValue: string
): string[] {
  if (activeCondition === 'switch') {
    return [
      `    window.enable${capitalName} = function() {`,
      `        $gameSwitches.setValue(${conditionId}, true);`,
      '    };',
      '',
      `    window.disable${capitalName} = function() {`,
      `        $gameSwitches.setValue(${conditionId}, false);`,
      '    };'
    ]
  }
  if (activeCondition === 'variable') {
    return [
      `    window.enable${capitalName} = function(value) {`,
      `        $gameVariables.setValue(${conditionId}, value || ${conditionValue});`,
      '    };',
      '',
      `    window.disable${capitalName} = function() {`,
      `        $gameVariables.setValue(${conditionId}, 0);`,
      '    };'
    ]
  }
  return ['    // For custom/always conditions, add your own control logic']
}

/**
Template 4: Parallel Process
Create a parallel update process on the map
*/
const parallelProcessTemplate: CodeTemplate = {
  id: 'map-parallel-process',
  category: 'map-events',
  name: 'Parallel Process',
  description: 'Create a parallel update process on the map',
  icon: 'Map',
  fields: [
    {
      id: 'processName',
      label: 'Process Name',
      type: 'text',
      placeholder: 'myParallelProcess',
      default: 'myParallelProcess',
      required: true,
      help: 'Unique name for this parallel process'
    },
    {
      id: 'updateInterval',
      label: 'Update Interval (frames)',
      type: 'number',
      placeholder: '1',
      default: 1,
      help: 'How often to run (1 = every frame, 60 = once per second)'
    },
    {
      id: 'activeCondition',
      label: 'Active Condition',
      type: 'select',
      options: [
        { value: 'always', label: 'Always Active' },
        { value: 'switch', label: 'When Switch is ON' },
        { value: 'variable', label: 'When Variable meets condition' },
        { value: 'custom', label: 'Custom condition (JavaScript)' }
      ],
      default: 'always',
      help: 'When should this process be active'
    },
    {
      id: 'conditionId',
      label: 'Switch/Variable ID',
      type: 'number',
      placeholder: '1',
      help: 'The switch or variable ID to check (if applicable)',
      dependsOn: { field: 'activeCondition', value: 'switch' }
    },
    {
      id: 'conditionValue',
      label: 'Variable Value',
      type: 'number',
      placeholder: '1',
      help: 'The value the variable should be >= to (if using variable condition)',
      dependsOn: { field: 'activeCondition', value: 'variable' }
    },
    {
      id: 'pauseInMenu',
      label: 'Pause in Menu',
      type: 'boolean',
      default: true,
      help: 'Pause this process when a menu is open'
    },
    {
      id: 'pauseInBattle',
      label: 'Pause in Battle',
      type: 'boolean',
      default: true,
      help: 'Pause this process during battles'
    }
  ],
  generate: (values): string => {
    const processName = valueOr(values['processName'], 'myParallelProcess')
    const updateInterval = valueOr(values['updateInterval'], 1)
    const activeCondition = valueOr(values['activeCondition'], 'always')
    const conditionId = String(valueOr(values['conditionId'], 1))
    const conditionValue = String(valueOr(values['conditionValue'], 1))
    const isPauseInMenu = Boolean(values['pauseInMenu'])
    const isPauseInBattle = Boolean(values['pauseInBattle'])

    const processText = expectText(processName)
    const capitalName = processText.charAt(0).toUpperCase() + processText.slice(1)

    return [
      `// Parallel Process: ${processText}`,
      '// Runs custom logic every frame (or at specified interval) on the map',
      '',
      '(() => {',
      '',
      // Frame counter for interval
      '    // Internal state',
      `    let _frameCount = 0;`,
      `    const UPDATE_INTERVAL = ${String(updateInterval)};`,
      '',
      // Active condition check
      '    // Check if the parallel process should be active',
      `    function is${capitalName}Active() {`,
      ...processConditionLines(activeCondition, conditionId, conditionValue),
      '    }',
      '',
      // Scene check for pausing
      '    // Check if process should be paused based on current scene',
      '    function shouldPauseProcess() {',
      pauseReturnLine(isPauseInMenu, isPauseInBattle),
      '    }',
      '',
      ...processRunLines(processText, capitalName, updateInterval),
      // Utility functions to control the process
      '    // ===== Utility Functions =====',
      '',
      `    // Enable/disable the process via script call`,
      ...processControlLines(activeCondition, capitalName, conditionId, conditionValue),
      '',
      '})();'
    ].join('\n')
  },
  validate: (values): ValidationResult => {
    const errors = identifierErrors(values['processName'], 'Process name')

    const updateInterval = values['updateInterval']
    if (updateInterval !== undefined && Number(updateInterval) < 1) {
      errors.push('Update interval must be at least 1 frame')
    }

    const activeCondition = values['activeCondition']
    const conditionId = values['conditionId']

    if (
      (activeCondition === 'switch' || activeCondition === 'variable') &&
      (conditionId === undefined || Number(conditionId) < 1)
    ) {
      errors.push('Switch/Variable ID must be a positive integer')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register all templates when this module loads
registerTemplate(eventSpawnTemplate)
registerTemplate(movementRouteTemplate)
registerTemplate(mapTransferHookTemplate)
registerTemplate(parallelProcessTemplate)
