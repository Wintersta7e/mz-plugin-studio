// ==== case: base {"functionName":"spawnEvent","persistAcrossTransfer":false,"maxSpawnedEvents":100}
// Event Spawn System
// Allows dynamic spawning of events at runtime

(() => {

    // Store for spawned event data
    const _spawnedEvents = [];
    const MAX_SPAWNED_EVENTS = 100;

    // Initialize spawned events when map loads
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        // Clear spawned events on map change
        this._spawnedEventIds = [];
    };

    // Spawn an event at the specified position
    Game_Map.prototype.spawnEvent = function(x, y, options = {}) {
        // Check spawn limit
        if (this._spawnedEventIds && this._spawnedEventIds.length >= MAX_SPAWNED_EVENTS) {
            console.warn('Maximum spawned events reached');
            return null;
        }

        // Find the next available event ID
        let newEventId = this._events.length;
        while (this._events[newEventId]) {
            newEventId++;
        }

        // Create new event data from scratch
        const eventData = {
            id: newEventId,
            name: options.name || "SpawnedEvent",
            note: options.note || "",
            pages: options.pages || [{
                conditions: { actorId: 0, actorValid: false, itemId: 0, itemValid: false,
                              selfSwitchCh: "A", selfSwitchValid: false,
                              switch1Id: 0, switch1Valid: false,
                              switch2Id: 0, switch2Valid: false,
                              variableId: 0, variableValid: false, variableValue: 0 },
                directionFix: false,
                image: { characterIndex: 0, characterName: "", direction: 2,
                         pattern: 0, tileId: 0 },
                list: [{ code: 0, indent: 0, parameters: [] }],
                moveFrequency: 3,
                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
                moveSpeed: 3,
                moveType: 0,
                priorityType: 1,
                stepAnime: false,
                through: false,
                trigger: 0,
                walkAnime: true
            }],
            x: x,
            y: y
        };

        // Apply custom options
        if (options.name) eventData.name = options.name;
        if (options.pages) eventData.pages = options.pages;

        // Add event data to map data
        $dataMap.events[newEventId] = eventData;

        // Create and add the game event
        const event = new Game_Event(this._mapId, newEventId);
        this._events[newEventId] = event;

        // Track spawned event
        if (!this._spawnedEventIds) this._spawnedEventIds = [];
        this._spawnedEventIds.push(newEventId);

        // Create sprite for the event
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprite = new Sprite_Character(event);
            SceneManager._scene._spriteset._characterSprites.push(sprite);
            SceneManager._scene._spriteset._tilemap.addChild(sprite);
        }

        return event;
    };

    // Remove a spawned event
    Game_Map.prototype.despawnEvent = function(eventId) {
        if (!this._spawnedEventIds || !this._spawnedEventIds.includes(eventId)) {
            console.warn('Event', eventId, 'is not a spawned event');
            return false;
        }

        // Remove sprite
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprites = SceneManager._scene._spriteset._characterSprites;
            for (let i = sprites.length - 1; i >= 0; i--) {
                if (sprites[i]._character === this._events[eventId]) {
                    SceneManager._scene._spriteset._tilemap.removeChild(sprites[i]);
                    sprites.splice(i, 1);
                    break;
                }
            }
        }

        // Remove event
        delete this._events[eventId];
        delete $dataMap.events[eventId];

        // Remove from tracking
        const index = this._spawnedEventIds.indexOf(eventId);
        if (index > -1) this._spawnedEventIds.splice(index, 1);

        return true;
    };

})();

// ==== case: persistAcrossTransfer=true {"functionName":"spawnEvent","persistAcrossTransfer":true,"maxSpawnedEvents":100}
// Event Spawn System
// Allows dynamic spawning of events at runtime

(() => {

    // Store for spawned event data
    const _spawnedEvents = [];
    const MAX_SPAWNED_EVENTS = 100;

    // Initialize spawned events when map loads
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        // Restore persistent spawned events
        this.restoreSpawnedEvents();
    };

    // Spawn an event at the specified position
    Game_Map.prototype.spawnEvent = function(x, y, options = {}) {
        // Check spawn limit
        if (this._spawnedEventIds && this._spawnedEventIds.length >= MAX_SPAWNED_EVENTS) {
            console.warn('Maximum spawned events reached');
            return null;
        }

        // Find the next available event ID
        let newEventId = this._events.length;
        while (this._events[newEventId]) {
            newEventId++;
        }

        // Create new event data from scratch
        const eventData = {
            id: newEventId,
            name: options.name || "SpawnedEvent",
            note: options.note || "",
            pages: options.pages || [{
                conditions: { actorId: 0, actorValid: false, itemId: 0, itemValid: false,
                              selfSwitchCh: "A", selfSwitchValid: false,
                              switch1Id: 0, switch1Valid: false,
                              switch2Id: 0, switch2Valid: false,
                              variableId: 0, variableValid: false, variableValue: 0 },
                directionFix: false,
                image: { characterIndex: 0, characterName: "", direction: 2,
                         pattern: 0, tileId: 0 },
                list: [{ code: 0, indent: 0, parameters: [] }],
                moveFrequency: 3,
                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
                moveSpeed: 3,
                moveType: 0,
                priorityType: 1,
                stepAnime: false,
                through: false,
                trigger: 0,
                walkAnime: true
            }],
            x: x,
            y: y
        };

        // Apply custom options
        if (options.name) eventData.name = options.name;
        if (options.pages) eventData.pages = options.pages;

        // Add event data to map data
        $dataMap.events[newEventId] = eventData;

        // Create and add the game event
        const event = new Game_Event(this._mapId, newEventId);
        this._events[newEventId] = event;

        // Track spawned event
        if (!this._spawnedEventIds) this._spawnedEventIds = [];
        this._spawnedEventIds.push(newEventId);

        // Store for persistence
        _spawnedEvents.push({
            mapId: this._mapId,
            eventData: eventData,
            eventId: newEventId
        });

        // Create sprite for the event
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprite = new Sprite_Character(event);
            SceneManager._scene._spriteset._characterSprites.push(sprite);
            SceneManager._scene._spriteset._tilemap.addChild(sprite);
        }

        return event;
    };

    // Remove a spawned event
    Game_Map.prototype.despawnEvent = function(eventId) {
        if (!this._spawnedEventIds || !this._spawnedEventIds.includes(eventId)) {
            console.warn('Event', eventId, 'is not a spawned event');
            return false;
        }

        // Remove sprite
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprites = SceneManager._scene._spriteset._characterSprites;
            for (let i = sprites.length - 1; i >= 0; i--) {
                if (sprites[i]._character === this._events[eventId]) {
                    SceneManager._scene._spriteset._tilemap.removeChild(sprites[i]);
                    sprites.splice(i, 1);
                    break;
                }
            }
        }

        // Remove event
        delete this._events[eventId];
        delete $dataMap.events[eventId];

        // Remove from tracking
        const index = this._spawnedEventIds.indexOf(eventId);
        if (index > -1) this._spawnedEventIds.splice(index, 1);

        // Remove from persistence
        const persistIndex = _spawnedEvents.findIndex(e => 
            e.mapId === this._mapId && e.eventId === eventId);
        if (persistIndex > -1) _spawnedEvents.splice(persistIndex, 1);

        return true;
    };

    // Restore spawned events for current map
    Game_Map.prototype.restoreSpawnedEvents = function() {
        this._spawnedEventIds = [];
        const mapEvents = _spawnedEvents.filter(e => e.mapId === this._mapId);
        for (const saved of mapEvents) {
            $dataMap.events[saved.eventId] = saved.eventData;
            const event = new Game_Event(this._mapId, saved.eventId);
            this._events[saved.eventId] = event;
            this._spawnedEventIds.push(saved.eventId);
        }
    };

})();

// ==== case: functionName=comment-space {"functionName":"X */ globalThis.__pwn = 1; /* Y","persistAcrossTransfer":false,"maxSpawnedEvents":100}
// rejects: Function name must be a valid JavaScript identifier
// Event Spawn System
// Allows dynamic spawning of events at runtime

(() => {

    // Store for spawned event data
    const _spawnedEvents = [];
    const MAX_SPAWNED_EVENTS = 100;

    // Initialize spawned events when map loads
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        // Clear spawned events on map change
        this._spawnedEventIds = [];
    };

    // Spawn an event at the specified position
    Game_Map.prototype.X */ globalThis.__pwn = 1; /* Y = function(x, y, options = {}) {
        // Check spawn limit
        if (this._spawnedEventIds && this._spawnedEventIds.length >= MAX_SPAWNED_EVENTS) {
            console.warn('Maximum spawned events reached');
            return null;
        }

        // Find the next available event ID
        let newEventId = this._events.length;
        while (this._events[newEventId]) {
            newEventId++;
        }

        // Create new event data from scratch
        const eventData = {
            id: newEventId,
            name: options.name || "SpawnedEvent",
            note: options.note || "",
            pages: options.pages || [{
                conditions: { actorId: 0, actorValid: false, itemId: 0, itemValid: false,
                              selfSwitchCh: "A", selfSwitchValid: false,
                              switch1Id: 0, switch1Valid: false,
                              switch2Id: 0, switch2Valid: false,
                              variableId: 0, variableValid: false, variableValue: 0 },
                directionFix: false,
                image: { characterIndex: 0, characterName: "", direction: 2,
                         pattern: 0, tileId: 0 },
                list: [{ code: 0, indent: 0, parameters: [] }],
                moveFrequency: 3,
                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
                moveSpeed: 3,
                moveType: 0,
                priorityType: 1,
                stepAnime: false,
                through: false,
                trigger: 0,
                walkAnime: true
            }],
            x: x,
            y: y
        };

        // Apply custom options
        if (options.name) eventData.name = options.name;
        if (options.pages) eventData.pages = options.pages;

        // Add event data to map data
        $dataMap.events[newEventId] = eventData;

        // Create and add the game event
        const event = new Game_Event(this._mapId, newEventId);
        this._events[newEventId] = event;

        // Track spawned event
        if (!this._spawnedEventIds) this._spawnedEventIds = [];
        this._spawnedEventIds.push(newEventId);

        // Create sprite for the event
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprite = new Sprite_Character(event);
            SceneManager._scene._spriteset._characterSprites.push(sprite);
            SceneManager._scene._spriteset._tilemap.addChild(sprite);
        }

        return event;
    };

    // Remove a spawned event
    Game_Map.prototype.despawnEvent = function(eventId) {
        if (!this._spawnedEventIds || !this._spawnedEventIds.includes(eventId)) {
            console.warn('Event', eventId, 'is not a spawned event');
            return false;
        }

        // Remove sprite
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprites = SceneManager._scene._spriteset._characterSprites;
            for (let i = sprites.length - 1; i >= 0; i--) {
                if (sprites[i]._character === this._events[eventId]) {
                    SceneManager._scene._spriteset._tilemap.removeChild(sprites[i]);
                    sprites.splice(i, 1);
                    break;
                }
            }
        }

        // Remove event
        delete this._events[eventId];
        delete $dataMap.events[eventId];

        // Remove from tracking
        const index = this._spawnedEventIds.indexOf(eventId);
        if (index > -1) this._spawnedEventIds.splice(index, 1);

        return true;
    };

})();

// ==== case: functionName=comment-u2028 {"functionName":"X */\u2028globalThis.__pwn = 1; /* Y","persistAcrossTransfer":false,"maxSpawnedEvents":100}
// rejects: Function name must be a valid JavaScript identifier
// Event Spawn System
// Allows dynamic spawning of events at runtime

(() => {

    // Store for spawned event data
    const _spawnedEvents = [];
    const MAX_SPAWNED_EVENTS = 100;

    // Initialize spawned events when map loads
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        // Clear spawned events on map change
        this._spawnedEventIds = [];
    };

    // Spawn an event at the specified position
    Game_Map.prototype.X */ globalThis.__pwn = 1; /* Y = function(x, y, options = {}) {
        // Check spawn limit
        if (this._spawnedEventIds && this._spawnedEventIds.length >= MAX_SPAWNED_EVENTS) {
            console.warn('Maximum spawned events reached');
            return null;
        }

        // Find the next available event ID
        let newEventId = this._events.length;
        while (this._events[newEventId]) {
            newEventId++;
        }

        // Create new event data from scratch
        const eventData = {
            id: newEventId,
            name: options.name || "SpawnedEvent",
            note: options.note || "",
            pages: options.pages || [{
                conditions: { actorId: 0, actorValid: false, itemId: 0, itemValid: false,
                              selfSwitchCh: "A", selfSwitchValid: false,
                              switch1Id: 0, switch1Valid: false,
                              switch2Id: 0, switch2Valid: false,
                              variableId: 0, variableValid: false, variableValue: 0 },
                directionFix: false,
                image: { characterIndex: 0, characterName: "", direction: 2,
                         pattern: 0, tileId: 0 },
                list: [{ code: 0, indent: 0, parameters: [] }],
                moveFrequency: 3,
                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
                moveSpeed: 3,
                moveType: 0,
                priorityType: 1,
                stepAnime: false,
                through: false,
                trigger: 0,
                walkAnime: true
            }],
            x: x,
            y: y
        };

        // Apply custom options
        if (options.name) eventData.name = options.name;
        if (options.pages) eventData.pages = options.pages;

        // Add event data to map data
        $dataMap.events[newEventId] = eventData;

        // Create and add the game event
        const event = new Game_Event(this._mapId, newEventId);
        this._events[newEventId] = event;

        // Track spawned event
        if (!this._spawnedEventIds) this._spawnedEventIds = [];
        this._spawnedEventIds.push(newEventId);

        // Create sprite for the event
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprite = new Sprite_Character(event);
            SceneManager._scene._spriteset._characterSprites.push(sprite);
            SceneManager._scene._spriteset._tilemap.addChild(sprite);
        }

        return event;
    };

    // Remove a spawned event
    Game_Map.prototype.despawnEvent = function(eventId) {
        if (!this._spawnedEventIds || !this._spawnedEventIds.includes(eventId)) {
            console.warn('Event', eventId, 'is not a spawned event');
            return false;
        }

        // Remove sprite
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprites = SceneManager._scene._spriteset._characterSprites;
            for (let i = sprites.length - 1; i >= 0; i--) {
                if (sprites[i]._character === this._events[eventId]) {
                    SceneManager._scene._spriteset._tilemap.removeChild(sprites[i]);
                    sprites.splice(i, 1);
                    break;
                }
            }
        }

        // Remove event
        delete this._events[eventId];
        delete $dataMap.events[eventId];

        // Remove from tracking
        const index = this._spawnedEventIds.indexOf(eventId);
        if (index > -1) this._spawnedEventIds.splice(index, 1);

        return true;
    };

})();

// ==== case: functionName=comment-u2029 {"functionName":"X */\u2029globalThis.__pwn = 1; /* Y","persistAcrossTransfer":false,"maxSpawnedEvents":100}
// rejects: Function name must be a valid JavaScript identifier
// Event Spawn System
// Allows dynamic spawning of events at runtime

(() => {

    // Store for spawned event data
    const _spawnedEvents = [];
    const MAX_SPAWNED_EVENTS = 100;

    // Initialize spawned events when map loads
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        // Clear spawned events on map change
        this._spawnedEventIds = [];
    };

    // Spawn an event at the specified position
    Game_Map.prototype.X */ globalThis.__pwn = 1; /* Y = function(x, y, options = {}) {
        // Check spawn limit
        if (this._spawnedEventIds && this._spawnedEventIds.length >= MAX_SPAWNED_EVENTS) {
            console.warn('Maximum spawned events reached');
            return null;
        }

        // Find the next available event ID
        let newEventId = this._events.length;
        while (this._events[newEventId]) {
            newEventId++;
        }

        // Create new event data from scratch
        const eventData = {
            id: newEventId,
            name: options.name || "SpawnedEvent",
            note: options.note || "",
            pages: options.pages || [{
                conditions: { actorId: 0, actorValid: false, itemId: 0, itemValid: false,
                              selfSwitchCh: "A", selfSwitchValid: false,
                              switch1Id: 0, switch1Valid: false,
                              switch2Id: 0, switch2Valid: false,
                              variableId: 0, variableValid: false, variableValue: 0 },
                directionFix: false,
                image: { characterIndex: 0, characterName: "", direction: 2,
                         pattern: 0, tileId: 0 },
                list: [{ code: 0, indent: 0, parameters: [] }],
                moveFrequency: 3,
                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
                moveSpeed: 3,
                moveType: 0,
                priorityType: 1,
                stepAnime: false,
                through: false,
                trigger: 0,
                walkAnime: true
            }],
            x: x,
            y: y
        };

        // Apply custom options
        if (options.name) eventData.name = options.name;
        if (options.pages) eventData.pages = options.pages;

        // Add event data to map data
        $dataMap.events[newEventId] = eventData;

        // Create and add the game event
        const event = new Game_Event(this._mapId, newEventId);
        this._events[newEventId] = event;

        // Track spawned event
        if (!this._spawnedEventIds) this._spawnedEventIds = [];
        this._spawnedEventIds.push(newEventId);

        // Create sprite for the event
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprite = new Sprite_Character(event);
            SceneManager._scene._spriteset._characterSprites.push(sprite);
            SceneManager._scene._spriteset._tilemap.addChild(sprite);
        }

        return event;
    };

    // Remove a spawned event
    Game_Map.prototype.despawnEvent = function(eventId) {
        if (!this._spawnedEventIds || !this._spawnedEventIds.includes(eventId)) {
            console.warn('Event', eventId, 'is not a spawned event');
            return false;
        }

        // Remove sprite
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprites = SceneManager._scene._spriteset._characterSprites;
            for (let i = sprites.length - 1; i >= 0; i--) {
                if (sprites[i]._character === this._events[eventId]) {
                    SceneManager._scene._spriteset._tilemap.removeChild(sprites[i]);
                    sprites.splice(i, 1);
                    break;
                }
            }
        }

        // Remove event
        delete this._events[eventId];
        delete $dataMap.events[eventId];

        // Remove from tracking
        const index = this._spawnedEventIds.indexOf(eventId);
        if (index > -1) this._spawnedEventIds.splice(index, 1);

        return true;
    };

})();

// ==== case: functionName=comment-lf {"functionName":"X */\nglobalThis.__pwn = 1; /* Y","persistAcrossTransfer":false,"maxSpawnedEvents":100}
// rejects: Function name must be a valid JavaScript identifier
// Event Spawn System
// Allows dynamic spawning of events at runtime

(() => {

    // Store for spawned event data
    const _spawnedEvents = [];
    const MAX_SPAWNED_EVENTS = 100;

    // Initialize spawned events when map loads
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        // Clear spawned events on map change
        this._spawnedEventIds = [];
    };

    // Spawn an event at the specified position
    Game_Map.prototype.X */
globalThis.__pwn = 1; /* Y = function(x, y, options = {}) {
        // Check spawn limit
        if (this._spawnedEventIds && this._spawnedEventIds.length >= MAX_SPAWNED_EVENTS) {
            console.warn('Maximum spawned events reached');
            return null;
        }

        // Find the next available event ID
        let newEventId = this._events.length;
        while (this._events[newEventId]) {
            newEventId++;
        }

        // Create new event data from scratch
        const eventData = {
            id: newEventId,
            name: options.name || "SpawnedEvent",
            note: options.note || "",
            pages: options.pages || [{
                conditions: { actorId: 0, actorValid: false, itemId: 0, itemValid: false,
                              selfSwitchCh: "A", selfSwitchValid: false,
                              switch1Id: 0, switch1Valid: false,
                              switch2Id: 0, switch2Valid: false,
                              variableId: 0, variableValid: false, variableValue: 0 },
                directionFix: false,
                image: { characterIndex: 0, characterName: "", direction: 2,
                         pattern: 0, tileId: 0 },
                list: [{ code: 0, indent: 0, parameters: [] }],
                moveFrequency: 3,
                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
                moveSpeed: 3,
                moveType: 0,
                priorityType: 1,
                stepAnime: false,
                through: false,
                trigger: 0,
                walkAnime: true
            }],
            x: x,
            y: y
        };

        // Apply custom options
        if (options.name) eventData.name = options.name;
        if (options.pages) eventData.pages = options.pages;

        // Add event data to map data
        $dataMap.events[newEventId] = eventData;

        // Create and add the game event
        const event = new Game_Event(this._mapId, newEventId);
        this._events[newEventId] = event;

        // Track spawned event
        if (!this._spawnedEventIds) this._spawnedEventIds = [];
        this._spawnedEventIds.push(newEventId);

        // Create sprite for the event
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprite = new Sprite_Character(event);
            SceneManager._scene._spriteset._characterSprites.push(sprite);
            SceneManager._scene._spriteset._tilemap.addChild(sprite);
        }

        return event;
    };

    // Remove a spawned event
    Game_Map.prototype.despawnEvent = function(eventId) {
        if (!this._spawnedEventIds || !this._spawnedEventIds.includes(eventId)) {
            console.warn('Event', eventId, 'is not a spawned event');
            return false;
        }

        // Remove sprite
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprites = SceneManager._scene._spriteset._characterSprites;
            for (let i = sprites.length - 1; i >= 0; i--) {
                if (sprites[i]._character === this._events[eventId]) {
                    SceneManager._scene._spriteset._tilemap.removeChild(sprites[i]);
                    sprites.splice(i, 1);
                    break;
                }
            }
        }

        // Remove event
        delete this._events[eventId];
        delete $dataMap.events[eventId];

        // Remove from tracking
        const index = this._spawnedEventIds.indexOf(eventId);
        if (index > -1) this._spawnedEventIds.splice(index, 1);

        return true;
    };

})();

// ==== case: functionName=quote-single {"functionName":"X' + (globalThis.__pwn = 1) + 'Y","persistAcrossTransfer":false,"maxSpawnedEvents":100}
// rejects: Function name must be a valid JavaScript identifier
// Event Spawn System
// Allows dynamic spawning of events at runtime

(() => {

    // Store for spawned event data
    const _spawnedEvents = [];
    const MAX_SPAWNED_EVENTS = 100;

    // Initialize spawned events when map loads
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        // Clear spawned events on map change
        this._spawnedEventIds = [];
    };

    // Spawn an event at the specified position
    Game_Map.prototype.X' + (globalThis.__pwn = 1) + 'Y = function(x, y, options = {}) {
        // Check spawn limit
        if (this._spawnedEventIds && this._spawnedEventIds.length >= MAX_SPAWNED_EVENTS) {
            console.warn('Maximum spawned events reached');
            return null;
        }

        // Find the next available event ID
        let newEventId = this._events.length;
        while (this._events[newEventId]) {
            newEventId++;
        }

        // Create new event data from scratch
        const eventData = {
            id: newEventId,
            name: options.name || "SpawnedEvent",
            note: options.note || "",
            pages: options.pages || [{
                conditions: { actorId: 0, actorValid: false, itemId: 0, itemValid: false,
                              selfSwitchCh: "A", selfSwitchValid: false,
                              switch1Id: 0, switch1Valid: false,
                              switch2Id: 0, switch2Valid: false,
                              variableId: 0, variableValid: false, variableValue: 0 },
                directionFix: false,
                image: { characterIndex: 0, characterName: "", direction: 2,
                         pattern: 0, tileId: 0 },
                list: [{ code: 0, indent: 0, parameters: [] }],
                moveFrequency: 3,
                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
                moveSpeed: 3,
                moveType: 0,
                priorityType: 1,
                stepAnime: false,
                through: false,
                trigger: 0,
                walkAnime: true
            }],
            x: x,
            y: y
        };

        // Apply custom options
        if (options.name) eventData.name = options.name;
        if (options.pages) eventData.pages = options.pages;

        // Add event data to map data
        $dataMap.events[newEventId] = eventData;

        // Create and add the game event
        const event = new Game_Event(this._mapId, newEventId);
        this._events[newEventId] = event;

        // Track spawned event
        if (!this._spawnedEventIds) this._spawnedEventIds = [];
        this._spawnedEventIds.push(newEventId);

        // Create sprite for the event
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprite = new Sprite_Character(event);
            SceneManager._scene._spriteset._characterSprites.push(sprite);
            SceneManager._scene._spriteset._tilemap.addChild(sprite);
        }

        return event;
    };

    // Remove a spawned event
    Game_Map.prototype.despawnEvent = function(eventId) {
        if (!this._spawnedEventIds || !this._spawnedEventIds.includes(eventId)) {
            console.warn('Event', eventId, 'is not a spawned event');
            return false;
        }

        // Remove sprite
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprites = SceneManager._scene._spriteset._characterSprites;
            for (let i = sprites.length - 1; i >= 0; i--) {
                if (sprites[i]._character === this._events[eventId]) {
                    SceneManager._scene._spriteset._tilemap.removeChild(sprites[i]);
                    sprites.splice(i, 1);
                    break;
                }
            }
        }

        // Remove event
        delete this._events[eventId];
        delete $dataMap.events[eventId];

        // Remove from tracking
        const index = this._spawnedEventIds.indexOf(eventId);
        if (index > -1) this._spawnedEventIds.splice(index, 1);

        return true;
    };

})();

// ==== case: functionName=quote-double {"functionName":"X\" + (globalThis.__pwn = 1) + \"Y","persistAcrossTransfer":false,"maxSpawnedEvents":100}
// rejects: Function name must be a valid JavaScript identifier
// Event Spawn System
// Allows dynamic spawning of events at runtime

(() => {

    // Store for spawned event data
    const _spawnedEvents = [];
    const MAX_SPAWNED_EVENTS = 100;

    // Initialize spawned events when map loads
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        // Clear spawned events on map change
        this._spawnedEventIds = [];
    };

    // Spawn an event at the specified position
    Game_Map.prototype.X" + (globalThis.__pwn = 1) + "Y = function(x, y, options = {}) {
        // Check spawn limit
        if (this._spawnedEventIds && this._spawnedEventIds.length >= MAX_SPAWNED_EVENTS) {
            console.warn('Maximum spawned events reached');
            return null;
        }

        // Find the next available event ID
        let newEventId = this._events.length;
        while (this._events[newEventId]) {
            newEventId++;
        }

        // Create new event data from scratch
        const eventData = {
            id: newEventId,
            name: options.name || "SpawnedEvent",
            note: options.note || "",
            pages: options.pages || [{
                conditions: { actorId: 0, actorValid: false, itemId: 0, itemValid: false,
                              selfSwitchCh: "A", selfSwitchValid: false,
                              switch1Id: 0, switch1Valid: false,
                              switch2Id: 0, switch2Valid: false,
                              variableId: 0, variableValid: false, variableValue: 0 },
                directionFix: false,
                image: { characterIndex: 0, characterName: "", direction: 2,
                         pattern: 0, tileId: 0 },
                list: [{ code: 0, indent: 0, parameters: [] }],
                moveFrequency: 3,
                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
                moveSpeed: 3,
                moveType: 0,
                priorityType: 1,
                stepAnime: false,
                through: false,
                trigger: 0,
                walkAnime: true
            }],
            x: x,
            y: y
        };

        // Apply custom options
        if (options.name) eventData.name = options.name;
        if (options.pages) eventData.pages = options.pages;

        // Add event data to map data
        $dataMap.events[newEventId] = eventData;

        // Create and add the game event
        const event = new Game_Event(this._mapId, newEventId);
        this._events[newEventId] = event;

        // Track spawned event
        if (!this._spawnedEventIds) this._spawnedEventIds = [];
        this._spawnedEventIds.push(newEventId);

        // Create sprite for the event
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprite = new Sprite_Character(event);
            SceneManager._scene._spriteset._characterSprites.push(sprite);
            SceneManager._scene._spriteset._tilemap.addChild(sprite);
        }

        return event;
    };

    // Remove a spawned event
    Game_Map.prototype.despawnEvent = function(eventId) {
        if (!this._spawnedEventIds || !this._spawnedEventIds.includes(eventId)) {
            console.warn('Event', eventId, 'is not a spawned event');
            return false;
        }

        // Remove sprite
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprites = SceneManager._scene._spriteset._characterSprites;
            for (let i = sprites.length - 1; i >= 0; i--) {
                if (sprites[i]._character === this._events[eventId]) {
                    SceneManager._scene._spriteset._tilemap.removeChild(sprites[i]);
                    sprites.splice(i, 1);
                    break;
                }
            }
        }

        // Remove event
        delete this._events[eventId];
        delete $dataMap.events[eventId];

        // Remove from tracking
        const index = this._spawnedEventIds.indexOf(eventId);
        if (index > -1) this._spawnedEventIds.splice(index, 1);

        return true;
    };

})();

// ==== case: functionName=quote-backtick {"functionName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","persistAcrossTransfer":false,"maxSpawnedEvents":100}
// rejects: Function name must be a valid JavaScript identifier
// Event Spawn System
// Allows dynamic spawning of events at runtime

(() => {

    // Store for spawned event data
    const _spawnedEvents = [];
    const MAX_SPAWNED_EVENTS = 100;

    // Initialize spawned events when map loads
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        // Clear spawned events on map change
        this._spawnedEventIds = [];
    };

    // Spawn an event at the specified position
    Game_Map.prototype.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = function(x, y, options = {}) {
        // Check spawn limit
        if (this._spawnedEventIds && this._spawnedEventIds.length >= MAX_SPAWNED_EVENTS) {
            console.warn('Maximum spawned events reached');
            return null;
        }

        // Find the next available event ID
        let newEventId = this._events.length;
        while (this._events[newEventId]) {
            newEventId++;
        }

        // Create new event data from scratch
        const eventData = {
            id: newEventId,
            name: options.name || "SpawnedEvent",
            note: options.note || "",
            pages: options.pages || [{
                conditions: { actorId: 0, actorValid: false, itemId: 0, itemValid: false,
                              selfSwitchCh: "A", selfSwitchValid: false,
                              switch1Id: 0, switch1Valid: false,
                              switch2Id: 0, switch2Valid: false,
                              variableId: 0, variableValid: false, variableValue: 0 },
                directionFix: false,
                image: { characterIndex: 0, characterName: "", direction: 2,
                         pattern: 0, tileId: 0 },
                list: [{ code: 0, indent: 0, parameters: [] }],
                moveFrequency: 3,
                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
                moveSpeed: 3,
                moveType: 0,
                priorityType: 1,
                stepAnime: false,
                through: false,
                trigger: 0,
                walkAnime: true
            }],
            x: x,
            y: y
        };

        // Apply custom options
        if (options.name) eventData.name = options.name;
        if (options.pages) eventData.pages = options.pages;

        // Add event data to map data
        $dataMap.events[newEventId] = eventData;

        // Create and add the game event
        const event = new Game_Event(this._mapId, newEventId);
        this._events[newEventId] = event;

        // Track spawned event
        if (!this._spawnedEventIds) this._spawnedEventIds = [];
        this._spawnedEventIds.push(newEventId);

        // Create sprite for the event
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprite = new Sprite_Character(event);
            SceneManager._scene._spriteset._characterSprites.push(sprite);
            SceneManager._scene._spriteset._tilemap.addChild(sprite);
        }

        return event;
    };

    // Remove a spawned event
    Game_Map.prototype.despawnEvent = function(eventId) {
        if (!this._spawnedEventIds || !this._spawnedEventIds.includes(eventId)) {
            console.warn('Event', eventId, 'is not a spawned event');
            return false;
        }

        // Remove sprite
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprites = SceneManager._scene._spriteset._characterSprites;
            for (let i = sprites.length - 1; i >= 0; i--) {
                if (sprites[i]._character === this._events[eventId]) {
                    SceneManager._scene._spriteset._tilemap.removeChild(sprites[i]);
                    sprites.splice(i, 1);
                    break;
                }
            }
        }

        // Remove event
        delete this._events[eventId];
        delete $dataMap.events[eventId];

        // Remove from tracking
        const index = this._spawnedEventIds.indexOf(eventId);
        if (index > -1) this._spawnedEventIds.splice(index, 1);

        return true;
    };

})();
