/**
 * Map & Events Templates
 *
 * Templates for RPG Maker MZ map and event manipulation:
 * - Dynamic event spawning at runtime
 * - Custom movement routes programmatically
 * - Map transfer hooks with before/after timing
 * - Parallel process updates on the map
 */

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'

/**
 * Template 1: Event Spawn
 * Dynamically spawn events at runtime
 */
const eventSpawnTemplate: CodeTemplate = {
  id: 'map-event-spawn',
  category: 'map-events',
  name: 'Event Spawn',
  description: 'Dynamically spawn events at runtime',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Game_Map.html',
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
    const functionName = (values.functionName as string) || 'spawnEvent'
    const templateEventId = values.templateEventId as number
    const persistAcrossTransfer = values.persistAcrossTransfer as boolean
    const maxSpawnedEvents = (values.maxSpawnedEvents as number) || 100

    const lines: string[] = []

    lines.push('// Event Spawn System')
    lines.push('// Allows dynamic spawning of events at runtime')
    lines.push('')
    lines.push('(() => {')
    lines.push('')
    lines.push('    // Store for spawned event data')
    lines.push('    const _spawnedEvents = [];')
    lines.push(`    const MAX_SPAWNED_EVENTS = ${maxSpawnedEvents};`)
    lines.push('')

    // Initialize spawned events array on map setup
    lines.push('    // Initialize spawned events when map loads')
    lines.push('    const _Game_Map_setup = Game_Map.prototype.setup;')
    lines.push('    Game_Map.prototype.setup = function(mapId) {')
    lines.push('        _Game_Map_setup.call(this, mapId);')

    if (persistAcrossTransfer) {
      lines.push('        // Restore persistent spawned events')
      lines.push('        this.restoreSpawnedEvents();')
    } else {
      lines.push('        // Clear spawned events on map change')
      lines.push('        this._spawnedEventIds = [];')
    }

    lines.push('    };')
    lines.push('')

    // Event spawn function
    lines.push(`    // Spawn an event at the specified position`)
    lines.push(`    Game_Map.prototype.${functionName} = function(x, y, options = {}) {`)
    lines.push('        // Check spawn limit')
    lines.push(
      '        if (this._spawnedEventIds && this._spawnedEventIds.length >= MAX_SPAWNED_EVENTS) {'
    )
    lines.push("            console.warn('Maximum spawned events reached');")
    lines.push('            return null;')
    lines.push('        }')
    lines.push('')
    lines.push('        // Find the next available event ID')
    lines.push('        let newEventId = this._events.length;')
    lines.push('        while (this._events[newEventId]) {')
    lines.push('            newEventId++;')
    lines.push('        }')
    lines.push('')

    if (templateEventId && templateEventId > 0) {
      lines.push(`        // Clone template event (ID: ${templateEventId})`)
      lines.push(`        const templateData = $dataMap.events[${templateEventId}];`)
      lines.push('        if (!templateData) {')
      lines.push(`            console.error('Template event ${templateEventId} not found');`)
      lines.push('            return null;')
      lines.push('        }')
      lines.push('')
      lines.push('        // Create new event data based on template')
      lines.push('        const eventData = JSON.parse(JSON.stringify(templateData));')
      lines.push('        eventData.id = newEventId;')
      lines.push('        eventData.x = x;')
      lines.push('        eventData.y = y;')
    } else {
      lines.push('        // Create new event data from scratch')
      lines.push('        const eventData = {')
      lines.push('            id: newEventId,')
      lines.push('            name: options.name || "SpawnedEvent",')
      lines.push('            note: options.note || "",')
      lines.push('            pages: options.pages || [{')
      lines.push(
        '                conditions: { actorId: 0, actorValid: false, itemId: 0, itemValid: false,'
      )
      lines.push('                              selfSwitchCh: "A", selfSwitchValid: false,')
      lines.push('                              switch1Id: 0, switch1Valid: false,')
      lines.push('                              switch2Id: 0, switch2Valid: false,')
      lines.push(
        '                              variableId: 0, variableValid: false, variableValue: 0 },'
      )
      lines.push('                directionFix: false,')
      lines.push('                image: { characterIndex: 0, characterName: "", direction: 2,')
      lines.push('                         pattern: 0, tileId: 0 },')
      lines.push('                list: [{ code: 0, indent: 0, parameters: [] }],')
      lines.push('                moveFrequency: 3,')
      lines.push(
        '                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },'
      )
      lines.push('                moveSpeed: 3,')
      lines.push('                moveType: 0,')
      lines.push('                priorityType: 1,')
      lines.push('                stepAnime: false,')
      lines.push('                through: false,')
      lines.push('                trigger: 0,')
      lines.push('                walkAnime: true')
      lines.push('            }],')
      lines.push('            x: x,')
      lines.push('            y: y')
      lines.push('        };')
    }

    lines.push('')
    lines.push('        // Apply custom options')
    lines.push('        if (options.name) eventData.name = options.name;')
    lines.push('        if (options.pages) eventData.pages = options.pages;')
    lines.push('')
    lines.push('        // Add event data to map data')
    lines.push('        $dataMap.events[newEventId] = eventData;')
    lines.push('')
    lines.push('        // Create and add the game event')
    lines.push('        const event = new Game_Event(this._mapId, newEventId);')
    lines.push('        this._events[newEventId] = event;')
    lines.push('')
    lines.push('        // Track spawned event')
    lines.push('        if (!this._spawnedEventIds) this._spawnedEventIds = [];')
    lines.push('        this._spawnedEventIds.push(newEventId);')
    lines.push('')

    if (persistAcrossTransfer) {
      lines.push('        // Store for persistence')
      lines.push('        _spawnedEvents.push({')
      lines.push('            mapId: this._mapId,')
      lines.push('            eventData: eventData,')
      lines.push('            eventId: newEventId')
      lines.push('        });')
      lines.push('')
    }

    lines.push('        // Create sprite for the event')
    lines.push('        if (SceneManager._scene && SceneManager._scene._spriteset) {')
    lines.push('            const sprite = new Sprite_Character(event);')
    lines.push('            SceneManager._scene._spriteset._characterSprites.push(sprite);')
    lines.push('            SceneManager._scene._spriteset._tilemap.addChild(sprite);')
    lines.push('        }')
    lines.push('')
    lines.push('        return event;')
    lines.push('    };')
    lines.push('')

    // Despawn function
    lines.push('    // Remove a spawned event')
    lines.push('    Game_Map.prototype.despawnEvent = function(eventId) {')
    lines.push('        if (!this._spawnedEventIds || !this._spawnedEventIds.includes(eventId)) {')
    lines.push("            console.warn('Event', eventId, 'is not a spawned event');")
    lines.push('            return false;')
    lines.push('        }')
    lines.push('')
    lines.push('        // Remove sprite')
    lines.push('        if (SceneManager._scene && SceneManager._scene._spriteset) {')
    lines.push('            const sprites = SceneManager._scene._spriteset._characterSprites;')
    lines.push('            for (let i = sprites.length - 1; i >= 0; i--) {')
    lines.push('                if (sprites[i]._character === this._events[eventId]) {')
    lines.push(
      '                    SceneManager._scene._spriteset._tilemap.removeChild(sprites[i]);'
    )
    lines.push('                    sprites.splice(i, 1);')
    lines.push('                    break;')
    lines.push('                }')
    lines.push('            }')
    lines.push('        }')
    lines.push('')
    lines.push('        // Remove event')
    lines.push('        delete this._events[eventId];')
    lines.push('        delete $dataMap.events[eventId];')
    lines.push('')
    lines.push('        // Remove from tracking')
    lines.push('        const index = this._spawnedEventIds.indexOf(eventId);')
    lines.push('        if (index > -1) this._spawnedEventIds.splice(index, 1);')
    lines.push('')

    if (persistAcrossTransfer) {
      lines.push('        // Remove from persistence')
      lines.push('        const persistIndex = _spawnedEvents.findIndex(e => ')
      lines.push('            e.mapId === this._mapId && e.eventId === eventId);')
      lines.push('        if (persistIndex > -1) _spawnedEvents.splice(persistIndex, 1);')
      lines.push('')
    }

    lines.push('        return true;')
    lines.push('    };')

    if (persistAcrossTransfer) {
      lines.push('')
      lines.push('    // Restore spawned events for current map')
      lines.push('    Game_Map.prototype.restoreSpawnedEvents = function() {')
      lines.push('        this._spawnedEventIds = [];')
      lines.push('        const mapEvents = _spawnedEvents.filter(e => e.mapId === this._mapId);')
      lines.push('        for (const saved of mapEvents) {')
      lines.push('            $dataMap.events[saved.eventId] = saved.eventData;')
      lines.push('            const event = new Game_Event(this._mapId, saved.eventId);')
      lines.push('            this._events[saved.eventId] = event;')
      lines.push('            this._spawnedEventIds.push(saved.eventId);')
      lines.push('        }')
      lines.push('    };')
    }

    lines.push('')
    lines.push('})();')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const functionName = values.functionName as string
    if (!functionName || functionName.trim() === '') {
      errors.push('Function name is required')
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
      errors.push('Function name must be a valid JavaScript identifier')
    }

    const maxSpawned = values.maxSpawnedEvents as number
    if (maxSpawned !== undefined && maxSpawned < 1) {
      errors.push('Max spawned events must be at least 1')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 2: Movement Route
 * Create custom movement routes programmatically
 */
const movementRouteTemplate: CodeTemplate = {
  id: 'map-movement-route',
  category: 'map-events',
  name: 'Movement Route',
  description: 'Create custom movement routes programmatically',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Game_Character.html',
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
    const functionName = (values.functionName as string) || 'setCustomRoute'
    const includeHelpers = values.includeHelpers as boolean
    const waitForCompletion = values.waitForCompletion as boolean

    const lines: string[] = []

    lines.push('// Custom Movement Route System')
    lines.push('// Create and apply movement routes to events programmatically')
    lines.push('')
    lines.push('(() => {')
    lines.push('')

    // Movement command constants
    lines.push('    // Movement route command codes')
    lines.push('    const ROUTE = {')
    lines.push('        END: 0,')
    lines.push('        MOVE_DOWN: 1,')
    lines.push('        MOVE_LEFT: 2,')
    lines.push('        MOVE_RIGHT: 3,')
    lines.push('        MOVE_UP: 4,')
    lines.push('        MOVE_LOWER_L: 5,')
    lines.push('        MOVE_LOWER_R: 6,')
    lines.push('        MOVE_UPPER_L: 7,')
    lines.push('        MOVE_UPPER_R: 8,')
    lines.push('        MOVE_RANDOM: 9,')
    lines.push('        MOVE_TOWARD: 10,')
    lines.push('        MOVE_AWAY: 11,')
    lines.push('        MOVE_FORWARD: 12,')
    lines.push('        MOVE_BACKWARD: 13,')
    lines.push('        JUMP: 14,           // params: [x, y]')
    lines.push('        WAIT: 15,           // params: [frames]')
    lines.push('        TURN_DOWN: 16,')
    lines.push('        TURN_LEFT: 17,')
    lines.push('        TURN_RIGHT: 18,')
    lines.push('        TURN_UP: 19,')
    lines.push('        TURN_90_RIGHT: 20,')
    lines.push('        TURN_90_LEFT: 21,')
    lines.push('        TURN_180: 22,')
    lines.push('        TURN_90_RANDOM: 23,')
    lines.push('        TURN_RANDOM: 24,')
    lines.push('        TURN_TOWARD: 25,')
    lines.push('        TURN_AWAY: 26,')
    lines.push('        SWITCH_ON: 27,      // params: [switchId]')
    lines.push('        SWITCH_OFF: 28,     // params: [switchId]')
    lines.push('        CHANGE_SPEED: 29,   // params: [speed]')
    lines.push('        CHANGE_FREQ: 30,    // params: [frequency]')
    lines.push('        WALK_ON: 31,')
    lines.push('        WALK_OFF: 32,')
    lines.push('        STEP_ON: 33,')
    lines.push('        STEP_OFF: 34,')
    lines.push('        DIR_FIX_ON: 35,')
    lines.push('        DIR_FIX_OFF: 36,')
    lines.push('        THROUGH_ON: 37,')
    lines.push('        THROUGH_OFF: 38,')
    lines.push('        TRANSPARENT_ON: 39,')
    lines.push('        TRANSPARENT_OFF: 40,')
    lines.push('        CHANGE_IMAGE: 41,   // params: [name, index]')
    lines.push('        CHANGE_OPACITY: 42, // params: [opacity]')
    lines.push('        CHANGE_BLEND: 43,   // params: [blendMode]')
    lines.push('        PLAY_SE: 44,        // params: [se]')
    lines.push('        SCRIPT: 45          // params: [script]')
    lines.push('    };')
    lines.push('')

    // Make ROUTE constants available globally
    lines.push('    // Expose ROUTE constants globally for easy access')
    lines.push('    window.ROUTE = ROUTE;')
    lines.push('')

    // Main route setting function
    lines.push(`    // Set a custom movement route for an event`)
    lines.push(`    Game_Event.prototype.${functionName} = function(commands, options = {}) {`)
    lines.push('        const route = {')
    lines.push('            list: commands.concat([{ code: ROUTE.END, parameters: [] }]),')
    lines.push('            repeat: options.repeat || false,')
    lines.push('            skippable: options.skippable || false,')
    lines.push('            wait: options.wait || false')
    lines.push('        };')
    lines.push('')
    lines.push('        this.forceMoveRoute(route);')

    if (waitForCompletion) {
      lines.push('')
      lines.push('        // Store callback if provided')
      lines.push('        if (options.onComplete) {')
      lines.push('            this._routeCompleteCallback = options.onComplete;')
      lines.push('        }')
    }

    lines.push('')
    lines.push('        return this;')
    lines.push('    };')
    lines.push('')

    // Also add to Game_Player
    lines.push(`    // Set a custom movement route for the player`)
    lines.push(`    Game_Player.prototype.${functionName} = Game_Event.prototype.${functionName};`)
    lines.push('')

    if (waitForCompletion) {
      lines.push('    // Hook route completion to trigger callbacks')
      lines.push(
        '    const _Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;'
      )
      lines.push('    Game_Character.prototype.processRouteEnd = function() {')
      lines.push('        _Game_Character_processRouteEnd.call(this);')
      lines.push('        ')
      lines.push('        if (this._routeCompleteCallback) {')
      lines.push('            const callback = this._routeCompleteCallback;')
      lines.push('            this._routeCompleteCallback = null;')
      lines.push('            callback.call(this);')
      lines.push('        }')
      lines.push('    };')
      lines.push('')
    }

    // Route command builder helper
    lines.push('    // Helper to create a route command')
    lines.push('    window.routeCommand = function(code, ...params) {')
    lines.push('        return { code: code, parameters: params };')
    lines.push('    };')
    lines.push('')

    if (includeHelpers) {
      lines.push('    // ===== Preset Route Builders =====')
      lines.push('')

      // Patrol route
      lines.push('    // Create a patrol route between waypoints')
      lines.push('    Game_Event.prototype.setPatrolRoute = function(waypoints, options = {}) {')
      lines.push('        const commands = [];')
      lines.push('        for (const wp of waypoints) {')
      lines.push('            // Move to waypoint')
      lines.push('            const dx = wp.x - this.x;')
      lines.push('            const dy = wp.y - this.y;')
      lines.push('            ')
      lines.push('            // Add horizontal movement')
      lines.push('            const hDir = dx > 0 ? ROUTE.MOVE_RIGHT : ROUTE.MOVE_LEFT;')
      lines.push('            for (let i = 0; i < Math.abs(dx); i++) {')
      lines.push('                commands.push({ code: hDir, parameters: [] });')
      lines.push('            }')
      lines.push('            ')
      lines.push('            // Add vertical movement')
      lines.push('            const vDir = dy > 0 ? ROUTE.MOVE_DOWN : ROUTE.MOVE_UP;')
      lines.push('            for (let i = 0; i < Math.abs(dy); i++) {')
      lines.push('                commands.push({ code: vDir, parameters: [] });')
      lines.push('            }')
      lines.push('            ')
      lines.push('            // Wait at waypoint if specified')
      lines.push('            if (wp.wait) {')
      lines.push('                commands.push({ code: ROUTE.WAIT, parameters: [wp.wait] });')
      lines.push('            }')
      lines.push('        }')
      lines.push('        ')
      lines.push(`        return this.${functionName}(commands, { repeat: true, ...options });`)
      lines.push('    };')
      lines.push('')

      // Chase route
      lines.push('    // Set event to chase the player')
      lines.push('    Game_Event.prototype.setChaseRoute = function(duration = 60, options = {}) {')
      lines.push('        const commands = [];')
      lines.push('        for (let i = 0; i < duration; i++) {')
      lines.push('            commands.push({ code: ROUTE.MOVE_TOWARD, parameters: [] });')
      lines.push('        }')
      lines.push(`        return this.${functionName}(commands, { repeat: true, ...options });`)
      lines.push('    };')
      lines.push('')

      // Flee route
      lines.push('    // Set event to flee from the player')
      lines.push('    Game_Event.prototype.setFleeRoute = function(duration = 60, options = {}) {')
      lines.push('        const commands = [];')
      lines.push('        for (let i = 0; i < duration; i++) {')
      lines.push('            commands.push({ code: ROUTE.MOVE_AWAY, parameters: [] });')
      lines.push('        }')
      lines.push(`        return this.${functionName}(commands, { repeat: true, ...options });`)
      lines.push('    };')
      lines.push('')

      // Wander route
      lines.push('    // Set event to wander randomly')
      lines.push('    Game_Event.prototype.setWanderRoute = function(steps = 10, options = {}) {')
      lines.push('        const commands = [];')
      lines.push('        for (let i = 0; i < steps; i++) {')
      lines.push('            commands.push({ code: ROUTE.MOVE_RANDOM, parameters: [] });')
      lines.push('            if (options.waitBetweenSteps) {')
      lines.push(
        '                commands.push({ code: ROUTE.WAIT, parameters: [options.waitBetweenSteps] });'
      )
      lines.push('            }')
      lines.push('        }')
      lines.push(`        return this.${functionName}(commands, { repeat: true, ...options });`)
      lines.push('    };')
    }

    lines.push('')
    lines.push('})();')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const functionName = values.functionName as string
    if (!functionName || functionName.trim() === '') {
      errors.push('Function name is required')
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
      errors.push('Function name must be a valid JavaScript identifier')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 3: Map Transfer Hook
 * Hook into map transfers with before/after timing
 */
const mapTransferHookTemplate: CodeTemplate = {
  id: 'map-transfer-hook',
  category: 'map-events',
  name: 'Map Transfer Hook',
  description: 'Hook into map transfers with before/after timing',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Game_Player.html',
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
    const timing = (values.timing as string) || 'after'
    const filterMapId = values.filterMapId as string
    const includeFadeInfo = values.includeFadeInfo as boolean
    const includeDirection = values.includeDirection as boolean

    const hasMapFilter = filterMapId && filterMapId.trim() !== ''

    const lines: string[] = []

    lines.push('// Map Transfer Hook')
    lines.push('// Execute custom code when transferring between maps')
    lines.push('')
    lines.push('(() => {')
    lines.push('')

    // Before transfer hook
    if (timing === 'before' || timing === 'both') {
      lines.push('    // Before Transfer Hook')
      lines.push('    const _Game_Player_performTransfer = Game_Player.prototype.performTransfer;')
      lines.push('    Game_Player.prototype.performTransfer = function() {')
      lines.push('        if (this.isTransferring()) {')
      lines.push('            const fromMapId = $gameMap.mapId();')
      lines.push('            const toMapId = this._newMapId;')
      lines.push('')

      if (hasMapFilter) {
        lines.push(`            // Filter: Only trigger for map ${filterMapId}`)
        lines.push(`            if (fromMapId === ${filterMapId} || toMapId === ${filterMapId}) {`)
        lines.push('                this.onBeforeMapTransfer(fromMapId, toMapId);')
        lines.push('            }')
      } else {
        lines.push('            this.onBeforeMapTransfer(fromMapId, toMapId);')
      }

      lines.push('        }')
      lines.push('')
      lines.push('        _Game_Player_performTransfer.call(this);')
      lines.push('    };')
      lines.push('')
      lines.push('    // Override this method to add your before-transfer logic')
      lines.push('    Game_Player.prototype.onBeforeMapTransfer = function(fromMapId, toMapId) {')
      lines.push('        // Your code here (before leaving the current map)')
      lines.push("        console.log('Leaving map', fromMapId, 'for map', toMapId);")

      if (includeFadeInfo) {
        lines.push('')
        lines.push('        // Access fade type: 0 = black, 1 = white, 2 = none')
        lines.push('        const fadeType = this._fadeType;')
        lines.push("        console.log('Fade type:', fadeType);")
      }

      if (includeDirection) {
        lines.push('')
        lines.push('        // Access the direction player will face')
        lines.push('        const direction = this._newDirection;')
        lines.push("        console.log('New direction:', direction);")
      }

      lines.push('    };')
      lines.push('')
    }

    // After transfer hook
    if (timing === 'after' || timing === 'both') {
      lines.push('    // After Transfer Hook')
      lines.push('    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;')
      lines.push('    Scene_Map.prototype.onMapLoaded = function() {')
      lines.push('        _Scene_Map_onMapLoaded.call(this);')
      lines.push('')
      lines.push('        // Check if this is a transfer (not initial load or battle return)')
      lines.push('        if ($gamePlayer._transferring) {')
      lines.push('            const mapId = $gameMap.mapId();')

      if (hasMapFilter) {
        lines.push(`            // Filter: Only trigger for map ${filterMapId}`)
        lines.push(`            if (mapId === ${filterMapId}) {`)
        lines.push('                this.onAfterMapTransfer(mapId);')
        lines.push('            }')
      } else {
        lines.push('            this.onAfterMapTransfer(mapId);')
      }

      lines.push('        }')
      lines.push('    };')
      lines.push('')
      lines.push('    // Override this method to add your after-transfer logic')
      lines.push('    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {')
      lines.push('        // Your code here (after arriving at the new map)')
      lines.push("        console.log('Arrived at map', mapId);")
      lines.push('')
      lines.push('        // Access map information')
      lines.push('        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;')
      lines.push("        console.log('Map name:', mapName);")

      if (includeDirection) {
        lines.push('')
        lines.push("        // Player's position and direction")
        lines.push('        const x = $gamePlayer.x;')
        lines.push('        const y = $gamePlayer.y;')
        lines.push('        const direction = $gamePlayer.direction();')
        lines.push("        console.log('Position:', x, y, 'Direction:', direction);")
      }

      lines.push('    };')
    }

    lines.push('')
    lines.push('})();')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const filterMapId = values.filterMapId as string

    // Validate map ID if provided
    if (filterMapId && filterMapId.trim() !== '') {
      const num = parseInt(filterMapId, 10)
      if (isNaN(num) || num < 1) {
        errors.push('Map ID must be a positive integer')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 4: Parallel Process
 * Create a parallel update process on the map
 */
const parallelProcessTemplate: CodeTemplate = {
  id: 'map-parallel-process',
  category: 'map-events',
  name: 'Parallel Process',
  description: 'Create a parallel update process on the map',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Scene_Map.html',
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
    const processName = (values.processName as string) || 'myParallelProcess'
    const updateInterval = (values.updateInterval as number) || 1
    const activeCondition = (values.activeCondition as string) || 'always'
    const conditionId = (values.conditionId as number) || 1
    const conditionValue = (values.conditionValue as number) || 1
    const pauseInMenu = values.pauseInMenu as boolean
    const pauseInBattle = values.pauseInBattle as boolean

    const lines: string[] = []

    lines.push(`// Parallel Process: ${processName}`)
    lines.push('// Runs custom logic every frame (or at specified interval) on the map')
    lines.push('')
    lines.push('(() => {')
    lines.push('')

    // Frame counter for interval
    lines.push('    // Internal state')
    lines.push(`    let _frameCount = 0;`)
    lines.push(`    const UPDATE_INTERVAL = ${updateInterval};`)
    lines.push('')

    // Active condition check
    lines.push('    // Check if the parallel process should be active')
    lines.push(
      `    function is${processName.charAt(0).toUpperCase() + processName.slice(1)}Active() {`
    )

    switch (activeCondition) {
      case 'switch':
        lines.push(`        // Active when switch ${conditionId} is ON`)
        lines.push(`        return $gameSwitches.value(${conditionId});`)
        break
      case 'variable':
        lines.push(`        // Active when variable ${conditionId} >= ${conditionValue}`)
        lines.push(`        return $gameVariables.value(${conditionId}) >= ${conditionValue};`)
        break
      case 'custom':
        lines.push('        // Custom condition - edit as needed')
        lines.push('        return true; // Replace with your condition')
        break
      case 'always':
      default:
        lines.push('        return true;')
    }

    lines.push('    }')
    lines.push('')

    // Scene check for pausing
    lines.push('    // Check if process should be paused based on current scene')
    lines.push('    function shouldPauseProcess() {')

    if (pauseInMenu || pauseInBattle) {
      const conditions: string[] = []

      if (pauseInMenu) {
        conditions.push('SceneManager._scene instanceof Scene_Menu')
        conditions.push('SceneManager._scene instanceof Scene_Item')
        conditions.push('SceneManager._scene instanceof Scene_Skill')
        conditions.push('SceneManager._scene instanceof Scene_Equip')
        conditions.push('SceneManager._scene instanceof Scene_Status')
        conditions.push('SceneManager._scene instanceof Scene_Options')
        conditions.push('SceneManager._scene instanceof Scene_Save')
        conditions.push('SceneManager._scene instanceof Scene_Load')
        conditions.push('SceneManager._scene instanceof Scene_GameEnd')
      }

      if (pauseInBattle) {
        conditions.push('SceneManager._scene instanceof Scene_Battle')
      }

      lines.push(`        return ${conditions.join(' ||\n               ')};`)
    } else {
      lines.push('        return false;')
    }

    lines.push('    }')
    lines.push('')

    // The main process function
    lines.push(`    // Main parallel process logic - customize this!`)
    lines.push(`    function ${processName}() {`)
    lines.push('        // Your parallel process code here')
    lines.push('        // This runs every frame (or at your specified interval) while active')
    lines.push('')
    lines.push('        // Example: Check player position')
    lines.push('        // const px = $gamePlayer.x;')
    lines.push('        // const py = $gamePlayer.y;')
    lines.push('')
    lines.push('        // Example: Check for nearby events')
    lines.push('        // const events = $gameMap.eventsXy(px, py);')
    lines.push('')
    lines.push('        // Example: Trigger something')
    lines.push('        // if (someCondition) {')
    lines.push('        //     $gameSwitches.setValue(1, true);')
    lines.push('        // }')
    lines.push('    }')
    lines.push('')

    // Hook into Scene_Map update
    lines.push('    // Hook into map scene update')
    lines.push('    const _Scene_Map_update = Scene_Map.prototype.update;')
    lines.push('    Scene_Map.prototype.update = function() {')
    lines.push('        _Scene_Map_update.call(this);')
    lines.push('')
    lines.push('        // Skip if paused or inactive')
    lines.push('        if (shouldPauseProcess()) return;')
    lines.push(
      `        if (!is${processName.charAt(0).toUpperCase() + processName.slice(1)}Active()) return;`
    )
    lines.push('')

    if (updateInterval > 1) {
      lines.push('        // Check interval')
      lines.push('        _frameCount++;')
      lines.push('        if (_frameCount >= UPDATE_INTERVAL) {')
      lines.push('            _frameCount = 0;')
      lines.push(`            ${processName}();`)
      lines.push('        }')
    } else {
      lines.push(`        ${processName}();`)
    }

    lines.push('    };')
    lines.push('')

    // Utility functions to control the process
    lines.push('    // ===== Utility Functions =====')
    lines.push('')
    lines.push(`    // Enable/disable the process via script call`)

    if (activeCondition === 'switch') {
      lines.push(
        `    window.enable${processName.charAt(0).toUpperCase() + processName.slice(1)} = function() {`
      )
      lines.push(`        $gameSwitches.setValue(${conditionId}, true);`)
      lines.push('    };')
      lines.push('')
      lines.push(
        `    window.disable${processName.charAt(0).toUpperCase() + processName.slice(1)} = function() {`
      )
      lines.push(`        $gameSwitches.setValue(${conditionId}, false);`)
      lines.push('    };')
    } else if (activeCondition === 'variable') {
      lines.push(
        `    window.enable${processName.charAt(0).toUpperCase() + processName.slice(1)} = function(value) {`
      )
      lines.push(`        $gameVariables.setValue(${conditionId}, value || ${conditionValue});`)
      lines.push('    };')
      lines.push('')
      lines.push(
        `    window.disable${processName.charAt(0).toUpperCase() + processName.slice(1)} = function() {`
      )
      lines.push(`        $gameVariables.setValue(${conditionId}, 0);`)
      lines.push('    };')
    } else {
      lines.push('    // For custom/always conditions, add your own control logic')
    }

    lines.push('')
    lines.push('})();')

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const processName = values.processName as string
    if (!processName || processName.trim() === '') {
      errors.push('Process name is required')
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(processName)) {
      errors.push('Process name must be a valid JavaScript identifier')
    }

    const updateInterval = values.updateInterval as number
    if (updateInterval !== undefined && updateInterval < 1) {
      errors.push('Update interval must be at least 1 frame')
    }

    const activeCondition = values.activeCondition as string
    const conditionId = values.conditionId as number

    if (
      (activeCondition === 'switch' || activeCondition === 'variable') &&
      (conditionId === undefined || conditionId < 1)
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

export {
  eventSpawnTemplate,
  movementRouteTemplate,
  mapTransferHookTemplate,
  parallelProcessTemplate
}
