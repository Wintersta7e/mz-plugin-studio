// ==== case: base {"functionName":"setCustomRoute","includeHelpers":true,"waitForCompletion":true}
// Custom Movement Route System
// Create and apply movement routes to events programmatically

(() => {

    // Movement route command codes
    const ROUTE = {
        END: 0,
        MOVE_DOWN: 1,
        MOVE_LEFT: 2,
        MOVE_RIGHT: 3,
        MOVE_UP: 4,
        MOVE_LOWER_L: 5,
        MOVE_LOWER_R: 6,
        MOVE_UPPER_L: 7,
        MOVE_UPPER_R: 8,
        MOVE_RANDOM: 9,
        MOVE_TOWARD: 10,
        MOVE_AWAY: 11,
        MOVE_FORWARD: 12,
        MOVE_BACKWARD: 13,
        JUMP: 14,           // params: [x, y]
        WAIT: 15,           // params: [frames]
        TURN_DOWN: 16,
        TURN_LEFT: 17,
        TURN_RIGHT: 18,
        TURN_UP: 19,
        TURN_90_RIGHT: 20,
        TURN_90_LEFT: 21,
        TURN_180: 22,
        TURN_90_RANDOM: 23,
        TURN_RANDOM: 24,
        TURN_TOWARD: 25,
        TURN_AWAY: 26,
        SWITCH_ON: 27,      // params: [switchId]
        SWITCH_OFF: 28,     // params: [switchId]
        CHANGE_SPEED: 29,   // params: [speed]
        CHANGE_FREQ: 30,    // params: [frequency]
        WALK_ON: 31,
        WALK_OFF: 32,
        STEP_ON: 33,
        STEP_OFF: 34,
        DIR_FIX_ON: 35,
        DIR_FIX_OFF: 36,
        THROUGH_ON: 37,
        THROUGH_OFF: 38,
        TRANSPARENT_ON: 39,
        TRANSPARENT_OFF: 40,
        CHANGE_IMAGE: 41,   // params: [name, index]
        CHANGE_OPACITY: 42, // params: [opacity]
        CHANGE_BLEND: 43,   // params: [blendMode]
        PLAY_SE: 44,        // params: [se]
        SCRIPT: 45          // params: [script]
    };

    // Expose ROUTE constants globally for easy access
    window.ROUTE = ROUTE;

    // Set a custom movement route for an event
    Game_Event.prototype.setCustomRoute = function(commands, options = {}) {
        const route = {
            list: commands.concat([{ code: ROUTE.END, parameters: [] }]),
            repeat: options.repeat || false,
            skippable: options.skippable || false,
            wait: options.wait || false
        };

        this.forceMoveRoute(route);

        // Store callback if provided
        if (options.onComplete) {
            this._routeCompleteCallback = options.onComplete;
        }

        return this;
    };

    // Set a custom movement route for the player
    Game_Player.prototype.setCustomRoute = Game_Event.prototype.setCustomRoute;

    // Hook route completion to trigger callbacks
    const _Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;
    Game_Character.prototype.processRouteEnd = function() {
        _Game_Character_processRouteEnd.call(this);
        
        if (this._routeCompleteCallback) {
            const callback = this._routeCompleteCallback;
            this._routeCompleteCallback = null;
            callback.call(this);
        }
    };

    // Helper to create a route command
    window.routeCommand = function(code, ...params) {
        return { code: code, parameters: params };
    };

    // ===== Preset Route Builders =====

    // Create a patrol route between waypoints
    Game_Event.prototype.setPatrolRoute = function(waypoints, options = {}) {
        const commands = [];
        for (const wp of waypoints) {
            // Move to waypoint
            const dx = wp.x - this.x;
            const dy = wp.y - this.y;
            
            // Add horizontal movement
            const hDir = dx > 0 ? ROUTE.MOVE_RIGHT : ROUTE.MOVE_LEFT;
            for (let i = 0; i < Math.abs(dx); i++) {
                commands.push({ code: hDir, parameters: [] });
            }
            
            // Add vertical movement
            const vDir = dy > 0 ? ROUTE.MOVE_DOWN : ROUTE.MOVE_UP;
            for (let i = 0; i < Math.abs(dy); i++) {
                commands.push({ code: vDir, parameters: [] });
            }
            
            // Wait at waypoint if specified
            if (wp.wait) {
                commands.push({ code: ROUTE.WAIT, parameters: [wp.wait] });
            }
        }
        
        return this.setCustomRoute(commands, { repeat: true, ...options });
    };

    // Set event to chase the player
    Game_Event.prototype.setChaseRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_TOWARD, parameters: [] });
        }
        return this.setCustomRoute(commands, { repeat: true, ...options });
    };

    // Set event to flee from the player
    Game_Event.prototype.setFleeRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_AWAY, parameters: [] });
        }
        return this.setCustomRoute(commands, { repeat: true, ...options });
    };

    // Set event to wander randomly
    Game_Event.prototype.setWanderRoute = function(steps = 10, options = {}) {
        const commands = [];
        for (let i = 0; i < steps; i++) {
            commands.push({ code: ROUTE.MOVE_RANDOM, parameters: [] });
            if (options.waitBetweenSteps) {
                commands.push({ code: ROUTE.WAIT, parameters: [options.waitBetweenSteps] });
            }
        }
        return this.setCustomRoute(commands, { repeat: true, ...options });
    };

})();

// ==== case: includeHelpers=false {"functionName":"setCustomRoute","includeHelpers":false,"waitForCompletion":true}
// Custom Movement Route System
// Create and apply movement routes to events programmatically

(() => {

    // Movement route command codes
    const ROUTE = {
        END: 0,
        MOVE_DOWN: 1,
        MOVE_LEFT: 2,
        MOVE_RIGHT: 3,
        MOVE_UP: 4,
        MOVE_LOWER_L: 5,
        MOVE_LOWER_R: 6,
        MOVE_UPPER_L: 7,
        MOVE_UPPER_R: 8,
        MOVE_RANDOM: 9,
        MOVE_TOWARD: 10,
        MOVE_AWAY: 11,
        MOVE_FORWARD: 12,
        MOVE_BACKWARD: 13,
        JUMP: 14,           // params: [x, y]
        WAIT: 15,           // params: [frames]
        TURN_DOWN: 16,
        TURN_LEFT: 17,
        TURN_RIGHT: 18,
        TURN_UP: 19,
        TURN_90_RIGHT: 20,
        TURN_90_LEFT: 21,
        TURN_180: 22,
        TURN_90_RANDOM: 23,
        TURN_RANDOM: 24,
        TURN_TOWARD: 25,
        TURN_AWAY: 26,
        SWITCH_ON: 27,      // params: [switchId]
        SWITCH_OFF: 28,     // params: [switchId]
        CHANGE_SPEED: 29,   // params: [speed]
        CHANGE_FREQ: 30,    // params: [frequency]
        WALK_ON: 31,
        WALK_OFF: 32,
        STEP_ON: 33,
        STEP_OFF: 34,
        DIR_FIX_ON: 35,
        DIR_FIX_OFF: 36,
        THROUGH_ON: 37,
        THROUGH_OFF: 38,
        TRANSPARENT_ON: 39,
        TRANSPARENT_OFF: 40,
        CHANGE_IMAGE: 41,   // params: [name, index]
        CHANGE_OPACITY: 42, // params: [opacity]
        CHANGE_BLEND: 43,   // params: [blendMode]
        PLAY_SE: 44,        // params: [se]
        SCRIPT: 45          // params: [script]
    };

    // Expose ROUTE constants globally for easy access
    window.ROUTE = ROUTE;

    // Set a custom movement route for an event
    Game_Event.prototype.setCustomRoute = function(commands, options = {}) {
        const route = {
            list: commands.concat([{ code: ROUTE.END, parameters: [] }]),
            repeat: options.repeat || false,
            skippable: options.skippable || false,
            wait: options.wait || false
        };

        this.forceMoveRoute(route);

        // Store callback if provided
        if (options.onComplete) {
            this._routeCompleteCallback = options.onComplete;
        }

        return this;
    };

    // Set a custom movement route for the player
    Game_Player.prototype.setCustomRoute = Game_Event.prototype.setCustomRoute;

    // Hook route completion to trigger callbacks
    const _Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;
    Game_Character.prototype.processRouteEnd = function() {
        _Game_Character_processRouteEnd.call(this);
        
        if (this._routeCompleteCallback) {
            const callback = this._routeCompleteCallback;
            this._routeCompleteCallback = null;
            callback.call(this);
        }
    };

    // Helper to create a route command
    window.routeCommand = function(code, ...params) {
        return { code: code, parameters: params };
    };


})();

// ==== case: waitForCompletion=false {"functionName":"setCustomRoute","includeHelpers":true,"waitForCompletion":false}
// Custom Movement Route System
// Create and apply movement routes to events programmatically

(() => {

    // Movement route command codes
    const ROUTE = {
        END: 0,
        MOVE_DOWN: 1,
        MOVE_LEFT: 2,
        MOVE_RIGHT: 3,
        MOVE_UP: 4,
        MOVE_LOWER_L: 5,
        MOVE_LOWER_R: 6,
        MOVE_UPPER_L: 7,
        MOVE_UPPER_R: 8,
        MOVE_RANDOM: 9,
        MOVE_TOWARD: 10,
        MOVE_AWAY: 11,
        MOVE_FORWARD: 12,
        MOVE_BACKWARD: 13,
        JUMP: 14,           // params: [x, y]
        WAIT: 15,           // params: [frames]
        TURN_DOWN: 16,
        TURN_LEFT: 17,
        TURN_RIGHT: 18,
        TURN_UP: 19,
        TURN_90_RIGHT: 20,
        TURN_90_LEFT: 21,
        TURN_180: 22,
        TURN_90_RANDOM: 23,
        TURN_RANDOM: 24,
        TURN_TOWARD: 25,
        TURN_AWAY: 26,
        SWITCH_ON: 27,      // params: [switchId]
        SWITCH_OFF: 28,     // params: [switchId]
        CHANGE_SPEED: 29,   // params: [speed]
        CHANGE_FREQ: 30,    // params: [frequency]
        WALK_ON: 31,
        WALK_OFF: 32,
        STEP_ON: 33,
        STEP_OFF: 34,
        DIR_FIX_ON: 35,
        DIR_FIX_OFF: 36,
        THROUGH_ON: 37,
        THROUGH_OFF: 38,
        TRANSPARENT_ON: 39,
        TRANSPARENT_OFF: 40,
        CHANGE_IMAGE: 41,   // params: [name, index]
        CHANGE_OPACITY: 42, // params: [opacity]
        CHANGE_BLEND: 43,   // params: [blendMode]
        PLAY_SE: 44,        // params: [se]
        SCRIPT: 45          // params: [script]
    };

    // Expose ROUTE constants globally for easy access
    window.ROUTE = ROUTE;

    // Set a custom movement route for an event
    Game_Event.prototype.setCustomRoute = function(commands, options = {}) {
        const route = {
            list: commands.concat([{ code: ROUTE.END, parameters: [] }]),
            repeat: options.repeat || false,
            skippable: options.skippable || false,
            wait: options.wait || false
        };

        this.forceMoveRoute(route);

        return this;
    };

    // Set a custom movement route for the player
    Game_Player.prototype.setCustomRoute = Game_Event.prototype.setCustomRoute;

    // Helper to create a route command
    window.routeCommand = function(code, ...params) {
        return { code: code, parameters: params };
    };

    // ===== Preset Route Builders =====

    // Create a patrol route between waypoints
    Game_Event.prototype.setPatrolRoute = function(waypoints, options = {}) {
        const commands = [];
        for (const wp of waypoints) {
            // Move to waypoint
            const dx = wp.x - this.x;
            const dy = wp.y - this.y;
            
            // Add horizontal movement
            const hDir = dx > 0 ? ROUTE.MOVE_RIGHT : ROUTE.MOVE_LEFT;
            for (let i = 0; i < Math.abs(dx); i++) {
                commands.push({ code: hDir, parameters: [] });
            }
            
            // Add vertical movement
            const vDir = dy > 0 ? ROUTE.MOVE_DOWN : ROUTE.MOVE_UP;
            for (let i = 0; i < Math.abs(dy); i++) {
                commands.push({ code: vDir, parameters: [] });
            }
            
            // Wait at waypoint if specified
            if (wp.wait) {
                commands.push({ code: ROUTE.WAIT, parameters: [wp.wait] });
            }
        }
        
        return this.setCustomRoute(commands, { repeat: true, ...options });
    };

    // Set event to chase the player
    Game_Event.prototype.setChaseRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_TOWARD, parameters: [] });
        }
        return this.setCustomRoute(commands, { repeat: true, ...options });
    };

    // Set event to flee from the player
    Game_Event.prototype.setFleeRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_AWAY, parameters: [] });
        }
        return this.setCustomRoute(commands, { repeat: true, ...options });
    };

    // Set event to wander randomly
    Game_Event.prototype.setWanderRoute = function(steps = 10, options = {}) {
        const commands = [];
        for (let i = 0; i < steps; i++) {
            commands.push({ code: ROUTE.MOVE_RANDOM, parameters: [] });
            if (options.waitBetweenSteps) {
                commands.push({ code: ROUTE.WAIT, parameters: [options.waitBetweenSteps] });
            }
        }
        return this.setCustomRoute(commands, { repeat: true, ...options });
    };

})();

// ==== case: functionName=comment-space {"functionName":"X */ globalThis.__pwn = 1; /* Y","includeHelpers":true,"waitForCompletion":true}
// rejects: Function name must be a valid JavaScript identifier
// Custom Movement Route System
// Create and apply movement routes to events programmatically

(() => {

    // Movement route command codes
    const ROUTE = {
        END: 0,
        MOVE_DOWN: 1,
        MOVE_LEFT: 2,
        MOVE_RIGHT: 3,
        MOVE_UP: 4,
        MOVE_LOWER_L: 5,
        MOVE_LOWER_R: 6,
        MOVE_UPPER_L: 7,
        MOVE_UPPER_R: 8,
        MOVE_RANDOM: 9,
        MOVE_TOWARD: 10,
        MOVE_AWAY: 11,
        MOVE_FORWARD: 12,
        MOVE_BACKWARD: 13,
        JUMP: 14,           // params: [x, y]
        WAIT: 15,           // params: [frames]
        TURN_DOWN: 16,
        TURN_LEFT: 17,
        TURN_RIGHT: 18,
        TURN_UP: 19,
        TURN_90_RIGHT: 20,
        TURN_90_LEFT: 21,
        TURN_180: 22,
        TURN_90_RANDOM: 23,
        TURN_RANDOM: 24,
        TURN_TOWARD: 25,
        TURN_AWAY: 26,
        SWITCH_ON: 27,      // params: [switchId]
        SWITCH_OFF: 28,     // params: [switchId]
        CHANGE_SPEED: 29,   // params: [speed]
        CHANGE_FREQ: 30,    // params: [frequency]
        WALK_ON: 31,
        WALK_OFF: 32,
        STEP_ON: 33,
        STEP_OFF: 34,
        DIR_FIX_ON: 35,
        DIR_FIX_OFF: 36,
        THROUGH_ON: 37,
        THROUGH_OFF: 38,
        TRANSPARENT_ON: 39,
        TRANSPARENT_OFF: 40,
        CHANGE_IMAGE: 41,   // params: [name, index]
        CHANGE_OPACITY: 42, // params: [opacity]
        CHANGE_BLEND: 43,   // params: [blendMode]
        PLAY_SE: 44,        // params: [se]
        SCRIPT: 45          // params: [script]
    };

    // Expose ROUTE constants globally for easy access
    window.ROUTE = ROUTE;

    // Set a custom movement route for an event
    Game_Event.prototype.X */ globalThis.__pwn = 1; /* Y = function(commands, options = {}) {
        const route = {
            list: commands.concat([{ code: ROUTE.END, parameters: [] }]),
            repeat: options.repeat || false,
            skippable: options.skippable || false,
            wait: options.wait || false
        };

        this.forceMoveRoute(route);

        // Store callback if provided
        if (options.onComplete) {
            this._routeCompleteCallback = options.onComplete;
        }

        return this;
    };

    // Set a custom movement route for the player
    Game_Player.prototype.X */ globalThis.__pwn = 1; /* Y = Game_Event.prototype.X */ globalThis.__pwn = 1; /* Y;

    // Hook route completion to trigger callbacks
    const _Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;
    Game_Character.prototype.processRouteEnd = function() {
        _Game_Character_processRouteEnd.call(this);
        
        if (this._routeCompleteCallback) {
            const callback = this._routeCompleteCallback;
            this._routeCompleteCallback = null;
            callback.call(this);
        }
    };

    // Helper to create a route command
    window.routeCommand = function(code, ...params) {
        return { code: code, parameters: params };
    };

    // ===== Preset Route Builders =====

    // Create a patrol route between waypoints
    Game_Event.prototype.setPatrolRoute = function(waypoints, options = {}) {
        const commands = [];
        for (const wp of waypoints) {
            // Move to waypoint
            const dx = wp.x - this.x;
            const dy = wp.y - this.y;
            
            // Add horizontal movement
            const hDir = dx > 0 ? ROUTE.MOVE_RIGHT : ROUTE.MOVE_LEFT;
            for (let i = 0; i < Math.abs(dx); i++) {
                commands.push({ code: hDir, parameters: [] });
            }
            
            // Add vertical movement
            const vDir = dy > 0 ? ROUTE.MOVE_DOWN : ROUTE.MOVE_UP;
            for (let i = 0; i < Math.abs(dy); i++) {
                commands.push({ code: vDir, parameters: [] });
            }
            
            // Wait at waypoint if specified
            if (wp.wait) {
                commands.push({ code: ROUTE.WAIT, parameters: [wp.wait] });
            }
        }
        
        return this.X */ globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

    // Set event to chase the player
    Game_Event.prototype.setChaseRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_TOWARD, parameters: [] });
        }
        return this.X */ globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

    // Set event to flee from the player
    Game_Event.prototype.setFleeRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_AWAY, parameters: [] });
        }
        return this.X */ globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

    // Set event to wander randomly
    Game_Event.prototype.setWanderRoute = function(steps = 10, options = {}) {
        const commands = [];
        for (let i = 0; i < steps; i++) {
            commands.push({ code: ROUTE.MOVE_RANDOM, parameters: [] });
            if (options.waitBetweenSteps) {
                commands.push({ code: ROUTE.WAIT, parameters: [options.waitBetweenSteps] });
            }
        }
        return this.X */ globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

})();

// ==== case: functionName=comment-u2028 {"functionName":"X */\u2028globalThis.__pwn = 1; /* Y","includeHelpers":true,"waitForCompletion":true}
// rejects: Function name must be a valid JavaScript identifier
// Custom Movement Route System
// Create and apply movement routes to events programmatically

(() => {

    // Movement route command codes
    const ROUTE = {
        END: 0,
        MOVE_DOWN: 1,
        MOVE_LEFT: 2,
        MOVE_RIGHT: 3,
        MOVE_UP: 4,
        MOVE_LOWER_L: 5,
        MOVE_LOWER_R: 6,
        MOVE_UPPER_L: 7,
        MOVE_UPPER_R: 8,
        MOVE_RANDOM: 9,
        MOVE_TOWARD: 10,
        MOVE_AWAY: 11,
        MOVE_FORWARD: 12,
        MOVE_BACKWARD: 13,
        JUMP: 14,           // params: [x, y]
        WAIT: 15,           // params: [frames]
        TURN_DOWN: 16,
        TURN_LEFT: 17,
        TURN_RIGHT: 18,
        TURN_UP: 19,
        TURN_90_RIGHT: 20,
        TURN_90_LEFT: 21,
        TURN_180: 22,
        TURN_90_RANDOM: 23,
        TURN_RANDOM: 24,
        TURN_TOWARD: 25,
        TURN_AWAY: 26,
        SWITCH_ON: 27,      // params: [switchId]
        SWITCH_OFF: 28,     // params: [switchId]
        CHANGE_SPEED: 29,   // params: [speed]
        CHANGE_FREQ: 30,    // params: [frequency]
        WALK_ON: 31,
        WALK_OFF: 32,
        STEP_ON: 33,
        STEP_OFF: 34,
        DIR_FIX_ON: 35,
        DIR_FIX_OFF: 36,
        THROUGH_ON: 37,
        THROUGH_OFF: 38,
        TRANSPARENT_ON: 39,
        TRANSPARENT_OFF: 40,
        CHANGE_IMAGE: 41,   // params: [name, index]
        CHANGE_OPACITY: 42, // params: [opacity]
        CHANGE_BLEND: 43,   // params: [blendMode]
        PLAY_SE: 44,        // params: [se]
        SCRIPT: 45          // params: [script]
    };

    // Expose ROUTE constants globally for easy access
    window.ROUTE = ROUTE;

    // Set a custom movement route for an event
    Game_Event.prototype.X */ globalThis.__pwn = 1; /* Y = function(commands, options = {}) {
        const route = {
            list: commands.concat([{ code: ROUTE.END, parameters: [] }]),
            repeat: options.repeat || false,
            skippable: options.skippable || false,
            wait: options.wait || false
        };

        this.forceMoveRoute(route);

        // Store callback if provided
        if (options.onComplete) {
            this._routeCompleteCallback = options.onComplete;
        }

        return this;
    };

    // Set a custom movement route for the player
    Game_Player.prototype.X */ globalThis.__pwn = 1; /* Y = Game_Event.prototype.X */ globalThis.__pwn = 1; /* Y;

    // Hook route completion to trigger callbacks
    const _Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;
    Game_Character.prototype.processRouteEnd = function() {
        _Game_Character_processRouteEnd.call(this);
        
        if (this._routeCompleteCallback) {
            const callback = this._routeCompleteCallback;
            this._routeCompleteCallback = null;
            callback.call(this);
        }
    };

    // Helper to create a route command
    window.routeCommand = function(code, ...params) {
        return { code: code, parameters: params };
    };

    // ===== Preset Route Builders =====

    // Create a patrol route between waypoints
    Game_Event.prototype.setPatrolRoute = function(waypoints, options = {}) {
        const commands = [];
        for (const wp of waypoints) {
            // Move to waypoint
            const dx = wp.x - this.x;
            const dy = wp.y - this.y;
            
            // Add horizontal movement
            const hDir = dx > 0 ? ROUTE.MOVE_RIGHT : ROUTE.MOVE_LEFT;
            for (let i = 0; i < Math.abs(dx); i++) {
                commands.push({ code: hDir, parameters: [] });
            }
            
            // Add vertical movement
            const vDir = dy > 0 ? ROUTE.MOVE_DOWN : ROUTE.MOVE_UP;
            for (let i = 0; i < Math.abs(dy); i++) {
                commands.push({ code: vDir, parameters: [] });
            }
            
            // Wait at waypoint if specified
            if (wp.wait) {
                commands.push({ code: ROUTE.WAIT, parameters: [wp.wait] });
            }
        }
        
        return this.X */ globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

    // Set event to chase the player
    Game_Event.prototype.setChaseRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_TOWARD, parameters: [] });
        }
        return this.X */ globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

    // Set event to flee from the player
    Game_Event.prototype.setFleeRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_AWAY, parameters: [] });
        }
        return this.X */ globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

    // Set event to wander randomly
    Game_Event.prototype.setWanderRoute = function(steps = 10, options = {}) {
        const commands = [];
        for (let i = 0; i < steps; i++) {
            commands.push({ code: ROUTE.MOVE_RANDOM, parameters: [] });
            if (options.waitBetweenSteps) {
                commands.push({ code: ROUTE.WAIT, parameters: [options.waitBetweenSteps] });
            }
        }
        return this.X */ globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

})();

// ==== case: functionName=comment-u2029 {"functionName":"X */\u2029globalThis.__pwn = 1; /* Y","includeHelpers":true,"waitForCompletion":true}
// rejects: Function name must be a valid JavaScript identifier
// Custom Movement Route System
// Create and apply movement routes to events programmatically

(() => {

    // Movement route command codes
    const ROUTE = {
        END: 0,
        MOVE_DOWN: 1,
        MOVE_LEFT: 2,
        MOVE_RIGHT: 3,
        MOVE_UP: 4,
        MOVE_LOWER_L: 5,
        MOVE_LOWER_R: 6,
        MOVE_UPPER_L: 7,
        MOVE_UPPER_R: 8,
        MOVE_RANDOM: 9,
        MOVE_TOWARD: 10,
        MOVE_AWAY: 11,
        MOVE_FORWARD: 12,
        MOVE_BACKWARD: 13,
        JUMP: 14,           // params: [x, y]
        WAIT: 15,           // params: [frames]
        TURN_DOWN: 16,
        TURN_LEFT: 17,
        TURN_RIGHT: 18,
        TURN_UP: 19,
        TURN_90_RIGHT: 20,
        TURN_90_LEFT: 21,
        TURN_180: 22,
        TURN_90_RANDOM: 23,
        TURN_RANDOM: 24,
        TURN_TOWARD: 25,
        TURN_AWAY: 26,
        SWITCH_ON: 27,      // params: [switchId]
        SWITCH_OFF: 28,     // params: [switchId]
        CHANGE_SPEED: 29,   // params: [speed]
        CHANGE_FREQ: 30,    // params: [frequency]
        WALK_ON: 31,
        WALK_OFF: 32,
        STEP_ON: 33,
        STEP_OFF: 34,
        DIR_FIX_ON: 35,
        DIR_FIX_OFF: 36,
        THROUGH_ON: 37,
        THROUGH_OFF: 38,
        TRANSPARENT_ON: 39,
        TRANSPARENT_OFF: 40,
        CHANGE_IMAGE: 41,   // params: [name, index]
        CHANGE_OPACITY: 42, // params: [opacity]
        CHANGE_BLEND: 43,   // params: [blendMode]
        PLAY_SE: 44,        // params: [se]
        SCRIPT: 45          // params: [script]
    };

    // Expose ROUTE constants globally for easy access
    window.ROUTE = ROUTE;

    // Set a custom movement route for an event
    Game_Event.prototype.X */ globalThis.__pwn = 1; /* Y = function(commands, options = {}) {
        const route = {
            list: commands.concat([{ code: ROUTE.END, parameters: [] }]),
            repeat: options.repeat || false,
            skippable: options.skippable || false,
            wait: options.wait || false
        };

        this.forceMoveRoute(route);

        // Store callback if provided
        if (options.onComplete) {
            this._routeCompleteCallback = options.onComplete;
        }

        return this;
    };

    // Set a custom movement route for the player
    Game_Player.prototype.X */ globalThis.__pwn = 1; /* Y = Game_Event.prototype.X */ globalThis.__pwn = 1; /* Y;

    // Hook route completion to trigger callbacks
    const _Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;
    Game_Character.prototype.processRouteEnd = function() {
        _Game_Character_processRouteEnd.call(this);
        
        if (this._routeCompleteCallback) {
            const callback = this._routeCompleteCallback;
            this._routeCompleteCallback = null;
            callback.call(this);
        }
    };

    // Helper to create a route command
    window.routeCommand = function(code, ...params) {
        return { code: code, parameters: params };
    };

    // ===== Preset Route Builders =====

    // Create a patrol route between waypoints
    Game_Event.prototype.setPatrolRoute = function(waypoints, options = {}) {
        const commands = [];
        for (const wp of waypoints) {
            // Move to waypoint
            const dx = wp.x - this.x;
            const dy = wp.y - this.y;
            
            // Add horizontal movement
            const hDir = dx > 0 ? ROUTE.MOVE_RIGHT : ROUTE.MOVE_LEFT;
            for (let i = 0; i < Math.abs(dx); i++) {
                commands.push({ code: hDir, parameters: [] });
            }
            
            // Add vertical movement
            const vDir = dy > 0 ? ROUTE.MOVE_DOWN : ROUTE.MOVE_UP;
            for (let i = 0; i < Math.abs(dy); i++) {
                commands.push({ code: vDir, parameters: [] });
            }
            
            // Wait at waypoint if specified
            if (wp.wait) {
                commands.push({ code: ROUTE.WAIT, parameters: [wp.wait] });
            }
        }
        
        return this.X */ globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

    // Set event to chase the player
    Game_Event.prototype.setChaseRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_TOWARD, parameters: [] });
        }
        return this.X */ globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

    // Set event to flee from the player
    Game_Event.prototype.setFleeRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_AWAY, parameters: [] });
        }
        return this.X */ globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

    // Set event to wander randomly
    Game_Event.prototype.setWanderRoute = function(steps = 10, options = {}) {
        const commands = [];
        for (let i = 0; i < steps; i++) {
            commands.push({ code: ROUTE.MOVE_RANDOM, parameters: [] });
            if (options.waitBetweenSteps) {
                commands.push({ code: ROUTE.WAIT, parameters: [options.waitBetweenSteps] });
            }
        }
        return this.X */ globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

})();

// ==== case: functionName=comment-lf {"functionName":"X */\nglobalThis.__pwn = 1; /* Y","includeHelpers":true,"waitForCompletion":true}
// rejects: Function name must be a valid JavaScript identifier
// Custom Movement Route System
// Create and apply movement routes to events programmatically

(() => {

    // Movement route command codes
    const ROUTE = {
        END: 0,
        MOVE_DOWN: 1,
        MOVE_LEFT: 2,
        MOVE_RIGHT: 3,
        MOVE_UP: 4,
        MOVE_LOWER_L: 5,
        MOVE_LOWER_R: 6,
        MOVE_UPPER_L: 7,
        MOVE_UPPER_R: 8,
        MOVE_RANDOM: 9,
        MOVE_TOWARD: 10,
        MOVE_AWAY: 11,
        MOVE_FORWARD: 12,
        MOVE_BACKWARD: 13,
        JUMP: 14,           // params: [x, y]
        WAIT: 15,           // params: [frames]
        TURN_DOWN: 16,
        TURN_LEFT: 17,
        TURN_RIGHT: 18,
        TURN_UP: 19,
        TURN_90_RIGHT: 20,
        TURN_90_LEFT: 21,
        TURN_180: 22,
        TURN_90_RANDOM: 23,
        TURN_RANDOM: 24,
        TURN_TOWARD: 25,
        TURN_AWAY: 26,
        SWITCH_ON: 27,      // params: [switchId]
        SWITCH_OFF: 28,     // params: [switchId]
        CHANGE_SPEED: 29,   // params: [speed]
        CHANGE_FREQ: 30,    // params: [frequency]
        WALK_ON: 31,
        WALK_OFF: 32,
        STEP_ON: 33,
        STEP_OFF: 34,
        DIR_FIX_ON: 35,
        DIR_FIX_OFF: 36,
        THROUGH_ON: 37,
        THROUGH_OFF: 38,
        TRANSPARENT_ON: 39,
        TRANSPARENT_OFF: 40,
        CHANGE_IMAGE: 41,   // params: [name, index]
        CHANGE_OPACITY: 42, // params: [opacity]
        CHANGE_BLEND: 43,   // params: [blendMode]
        PLAY_SE: 44,        // params: [se]
        SCRIPT: 45          // params: [script]
    };

    // Expose ROUTE constants globally for easy access
    window.ROUTE = ROUTE;

    // Set a custom movement route for an event
    Game_Event.prototype.X */
globalThis.__pwn = 1; /* Y = function(commands, options = {}) {
        const route = {
            list: commands.concat([{ code: ROUTE.END, parameters: [] }]),
            repeat: options.repeat || false,
            skippable: options.skippable || false,
            wait: options.wait || false
        };

        this.forceMoveRoute(route);

        // Store callback if provided
        if (options.onComplete) {
            this._routeCompleteCallback = options.onComplete;
        }

        return this;
    };

    // Set a custom movement route for the player
    Game_Player.prototype.X */
globalThis.__pwn = 1; /* Y = Game_Event.prototype.X */
globalThis.__pwn = 1; /* Y;

    // Hook route completion to trigger callbacks
    const _Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;
    Game_Character.prototype.processRouteEnd = function() {
        _Game_Character_processRouteEnd.call(this);
        
        if (this._routeCompleteCallback) {
            const callback = this._routeCompleteCallback;
            this._routeCompleteCallback = null;
            callback.call(this);
        }
    };

    // Helper to create a route command
    window.routeCommand = function(code, ...params) {
        return { code: code, parameters: params };
    };

    // ===== Preset Route Builders =====

    // Create a patrol route between waypoints
    Game_Event.prototype.setPatrolRoute = function(waypoints, options = {}) {
        const commands = [];
        for (const wp of waypoints) {
            // Move to waypoint
            const dx = wp.x - this.x;
            const dy = wp.y - this.y;
            
            // Add horizontal movement
            const hDir = dx > 0 ? ROUTE.MOVE_RIGHT : ROUTE.MOVE_LEFT;
            for (let i = 0; i < Math.abs(dx); i++) {
                commands.push({ code: hDir, parameters: [] });
            }
            
            // Add vertical movement
            const vDir = dy > 0 ? ROUTE.MOVE_DOWN : ROUTE.MOVE_UP;
            for (let i = 0; i < Math.abs(dy); i++) {
                commands.push({ code: vDir, parameters: [] });
            }
            
            // Wait at waypoint if specified
            if (wp.wait) {
                commands.push({ code: ROUTE.WAIT, parameters: [wp.wait] });
            }
        }
        
        return this.X */
globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

    // Set event to chase the player
    Game_Event.prototype.setChaseRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_TOWARD, parameters: [] });
        }
        return this.X */
globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

    // Set event to flee from the player
    Game_Event.prototype.setFleeRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_AWAY, parameters: [] });
        }
        return this.X */
globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

    // Set event to wander randomly
    Game_Event.prototype.setWanderRoute = function(steps = 10, options = {}) {
        const commands = [];
        for (let i = 0; i < steps; i++) {
            commands.push({ code: ROUTE.MOVE_RANDOM, parameters: [] });
            if (options.waitBetweenSteps) {
                commands.push({ code: ROUTE.WAIT, parameters: [options.waitBetweenSteps] });
            }
        }
        return this.X */
globalThis.__pwn = 1; /* Y(commands, { repeat: true, ...options });
    };

})();

// ==== case: functionName=quote-single {"functionName":"X' + (globalThis.__pwn = 1) + 'Y","includeHelpers":true,"waitForCompletion":true}
// rejects: Function name must be a valid JavaScript identifier
// Custom Movement Route System
// Create and apply movement routes to events programmatically

(() => {

    // Movement route command codes
    const ROUTE = {
        END: 0,
        MOVE_DOWN: 1,
        MOVE_LEFT: 2,
        MOVE_RIGHT: 3,
        MOVE_UP: 4,
        MOVE_LOWER_L: 5,
        MOVE_LOWER_R: 6,
        MOVE_UPPER_L: 7,
        MOVE_UPPER_R: 8,
        MOVE_RANDOM: 9,
        MOVE_TOWARD: 10,
        MOVE_AWAY: 11,
        MOVE_FORWARD: 12,
        MOVE_BACKWARD: 13,
        JUMP: 14,           // params: [x, y]
        WAIT: 15,           // params: [frames]
        TURN_DOWN: 16,
        TURN_LEFT: 17,
        TURN_RIGHT: 18,
        TURN_UP: 19,
        TURN_90_RIGHT: 20,
        TURN_90_LEFT: 21,
        TURN_180: 22,
        TURN_90_RANDOM: 23,
        TURN_RANDOM: 24,
        TURN_TOWARD: 25,
        TURN_AWAY: 26,
        SWITCH_ON: 27,      // params: [switchId]
        SWITCH_OFF: 28,     // params: [switchId]
        CHANGE_SPEED: 29,   // params: [speed]
        CHANGE_FREQ: 30,    // params: [frequency]
        WALK_ON: 31,
        WALK_OFF: 32,
        STEP_ON: 33,
        STEP_OFF: 34,
        DIR_FIX_ON: 35,
        DIR_FIX_OFF: 36,
        THROUGH_ON: 37,
        THROUGH_OFF: 38,
        TRANSPARENT_ON: 39,
        TRANSPARENT_OFF: 40,
        CHANGE_IMAGE: 41,   // params: [name, index]
        CHANGE_OPACITY: 42, // params: [opacity]
        CHANGE_BLEND: 43,   // params: [blendMode]
        PLAY_SE: 44,        // params: [se]
        SCRIPT: 45          // params: [script]
    };

    // Expose ROUTE constants globally for easy access
    window.ROUTE = ROUTE;

    // Set a custom movement route for an event
    Game_Event.prototype.X' + (globalThis.__pwn = 1) + 'Y = function(commands, options = {}) {
        const route = {
            list: commands.concat([{ code: ROUTE.END, parameters: [] }]),
            repeat: options.repeat || false,
            skippable: options.skippable || false,
            wait: options.wait || false
        };

        this.forceMoveRoute(route);

        // Store callback if provided
        if (options.onComplete) {
            this._routeCompleteCallback = options.onComplete;
        }

        return this;
    };

    // Set a custom movement route for the player
    Game_Player.prototype.X' + (globalThis.__pwn = 1) + 'Y = Game_Event.prototype.X' + (globalThis.__pwn = 1) + 'Y;

    // Hook route completion to trigger callbacks
    const _Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;
    Game_Character.prototype.processRouteEnd = function() {
        _Game_Character_processRouteEnd.call(this);
        
        if (this._routeCompleteCallback) {
            const callback = this._routeCompleteCallback;
            this._routeCompleteCallback = null;
            callback.call(this);
        }
    };

    // Helper to create a route command
    window.routeCommand = function(code, ...params) {
        return { code: code, parameters: params };
    };

    // ===== Preset Route Builders =====

    // Create a patrol route between waypoints
    Game_Event.prototype.setPatrolRoute = function(waypoints, options = {}) {
        const commands = [];
        for (const wp of waypoints) {
            // Move to waypoint
            const dx = wp.x - this.x;
            const dy = wp.y - this.y;
            
            // Add horizontal movement
            const hDir = dx > 0 ? ROUTE.MOVE_RIGHT : ROUTE.MOVE_LEFT;
            for (let i = 0; i < Math.abs(dx); i++) {
                commands.push({ code: hDir, parameters: [] });
            }
            
            // Add vertical movement
            const vDir = dy > 0 ? ROUTE.MOVE_DOWN : ROUTE.MOVE_UP;
            for (let i = 0; i < Math.abs(dy); i++) {
                commands.push({ code: vDir, parameters: [] });
            }
            
            // Wait at waypoint if specified
            if (wp.wait) {
                commands.push({ code: ROUTE.WAIT, parameters: [wp.wait] });
            }
        }
        
        return this.X' + (globalThis.__pwn = 1) + 'Y(commands, { repeat: true, ...options });
    };

    // Set event to chase the player
    Game_Event.prototype.setChaseRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_TOWARD, parameters: [] });
        }
        return this.X' + (globalThis.__pwn = 1) + 'Y(commands, { repeat: true, ...options });
    };

    // Set event to flee from the player
    Game_Event.prototype.setFleeRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_AWAY, parameters: [] });
        }
        return this.X' + (globalThis.__pwn = 1) + 'Y(commands, { repeat: true, ...options });
    };

    // Set event to wander randomly
    Game_Event.prototype.setWanderRoute = function(steps = 10, options = {}) {
        const commands = [];
        for (let i = 0; i < steps; i++) {
            commands.push({ code: ROUTE.MOVE_RANDOM, parameters: [] });
            if (options.waitBetweenSteps) {
                commands.push({ code: ROUTE.WAIT, parameters: [options.waitBetweenSteps] });
            }
        }
        return this.X' + (globalThis.__pwn = 1) + 'Y(commands, { repeat: true, ...options });
    };

})();

// ==== case: functionName=quote-double {"functionName":"X\" + (globalThis.__pwn = 1) + \"Y","includeHelpers":true,"waitForCompletion":true}
// rejects: Function name must be a valid JavaScript identifier
// Custom Movement Route System
// Create and apply movement routes to events programmatically

(() => {

    // Movement route command codes
    const ROUTE = {
        END: 0,
        MOVE_DOWN: 1,
        MOVE_LEFT: 2,
        MOVE_RIGHT: 3,
        MOVE_UP: 4,
        MOVE_LOWER_L: 5,
        MOVE_LOWER_R: 6,
        MOVE_UPPER_L: 7,
        MOVE_UPPER_R: 8,
        MOVE_RANDOM: 9,
        MOVE_TOWARD: 10,
        MOVE_AWAY: 11,
        MOVE_FORWARD: 12,
        MOVE_BACKWARD: 13,
        JUMP: 14,           // params: [x, y]
        WAIT: 15,           // params: [frames]
        TURN_DOWN: 16,
        TURN_LEFT: 17,
        TURN_RIGHT: 18,
        TURN_UP: 19,
        TURN_90_RIGHT: 20,
        TURN_90_LEFT: 21,
        TURN_180: 22,
        TURN_90_RANDOM: 23,
        TURN_RANDOM: 24,
        TURN_TOWARD: 25,
        TURN_AWAY: 26,
        SWITCH_ON: 27,      // params: [switchId]
        SWITCH_OFF: 28,     // params: [switchId]
        CHANGE_SPEED: 29,   // params: [speed]
        CHANGE_FREQ: 30,    // params: [frequency]
        WALK_ON: 31,
        WALK_OFF: 32,
        STEP_ON: 33,
        STEP_OFF: 34,
        DIR_FIX_ON: 35,
        DIR_FIX_OFF: 36,
        THROUGH_ON: 37,
        THROUGH_OFF: 38,
        TRANSPARENT_ON: 39,
        TRANSPARENT_OFF: 40,
        CHANGE_IMAGE: 41,   // params: [name, index]
        CHANGE_OPACITY: 42, // params: [opacity]
        CHANGE_BLEND: 43,   // params: [blendMode]
        PLAY_SE: 44,        // params: [se]
        SCRIPT: 45          // params: [script]
    };

    // Expose ROUTE constants globally for easy access
    window.ROUTE = ROUTE;

    // Set a custom movement route for an event
    Game_Event.prototype.X" + (globalThis.__pwn = 1) + "Y = function(commands, options = {}) {
        const route = {
            list: commands.concat([{ code: ROUTE.END, parameters: [] }]),
            repeat: options.repeat || false,
            skippable: options.skippable || false,
            wait: options.wait || false
        };

        this.forceMoveRoute(route);

        // Store callback if provided
        if (options.onComplete) {
            this._routeCompleteCallback = options.onComplete;
        }

        return this;
    };

    // Set a custom movement route for the player
    Game_Player.prototype.X" + (globalThis.__pwn = 1) + "Y = Game_Event.prototype.X" + (globalThis.__pwn = 1) + "Y;

    // Hook route completion to trigger callbacks
    const _Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;
    Game_Character.prototype.processRouteEnd = function() {
        _Game_Character_processRouteEnd.call(this);
        
        if (this._routeCompleteCallback) {
            const callback = this._routeCompleteCallback;
            this._routeCompleteCallback = null;
            callback.call(this);
        }
    };

    // Helper to create a route command
    window.routeCommand = function(code, ...params) {
        return { code: code, parameters: params };
    };

    // ===== Preset Route Builders =====

    // Create a patrol route between waypoints
    Game_Event.prototype.setPatrolRoute = function(waypoints, options = {}) {
        const commands = [];
        for (const wp of waypoints) {
            // Move to waypoint
            const dx = wp.x - this.x;
            const dy = wp.y - this.y;
            
            // Add horizontal movement
            const hDir = dx > 0 ? ROUTE.MOVE_RIGHT : ROUTE.MOVE_LEFT;
            for (let i = 0; i < Math.abs(dx); i++) {
                commands.push({ code: hDir, parameters: [] });
            }
            
            // Add vertical movement
            const vDir = dy > 0 ? ROUTE.MOVE_DOWN : ROUTE.MOVE_UP;
            for (let i = 0; i < Math.abs(dy); i++) {
                commands.push({ code: vDir, parameters: [] });
            }
            
            // Wait at waypoint if specified
            if (wp.wait) {
                commands.push({ code: ROUTE.WAIT, parameters: [wp.wait] });
            }
        }
        
        return this.X" + (globalThis.__pwn = 1) + "Y(commands, { repeat: true, ...options });
    };

    // Set event to chase the player
    Game_Event.prototype.setChaseRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_TOWARD, parameters: [] });
        }
        return this.X" + (globalThis.__pwn = 1) + "Y(commands, { repeat: true, ...options });
    };

    // Set event to flee from the player
    Game_Event.prototype.setFleeRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_AWAY, parameters: [] });
        }
        return this.X" + (globalThis.__pwn = 1) + "Y(commands, { repeat: true, ...options });
    };

    // Set event to wander randomly
    Game_Event.prototype.setWanderRoute = function(steps = 10, options = {}) {
        const commands = [];
        for (let i = 0; i < steps; i++) {
            commands.push({ code: ROUTE.MOVE_RANDOM, parameters: [] });
            if (options.waitBetweenSteps) {
                commands.push({ code: ROUTE.WAIT, parameters: [options.waitBetweenSteps] });
            }
        }
        return this.X" + (globalThis.__pwn = 1) + "Y(commands, { repeat: true, ...options });
    };

})();

// ==== case: functionName=quote-backtick {"functionName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","includeHelpers":true,"waitForCompletion":true}
// rejects: Function name must be a valid JavaScript identifier
// Custom Movement Route System
// Create and apply movement routes to events programmatically

(() => {

    // Movement route command codes
    const ROUTE = {
        END: 0,
        MOVE_DOWN: 1,
        MOVE_LEFT: 2,
        MOVE_RIGHT: 3,
        MOVE_UP: 4,
        MOVE_LOWER_L: 5,
        MOVE_LOWER_R: 6,
        MOVE_UPPER_L: 7,
        MOVE_UPPER_R: 8,
        MOVE_RANDOM: 9,
        MOVE_TOWARD: 10,
        MOVE_AWAY: 11,
        MOVE_FORWARD: 12,
        MOVE_BACKWARD: 13,
        JUMP: 14,           // params: [x, y]
        WAIT: 15,           // params: [frames]
        TURN_DOWN: 16,
        TURN_LEFT: 17,
        TURN_RIGHT: 18,
        TURN_UP: 19,
        TURN_90_RIGHT: 20,
        TURN_90_LEFT: 21,
        TURN_180: 22,
        TURN_90_RANDOM: 23,
        TURN_RANDOM: 24,
        TURN_TOWARD: 25,
        TURN_AWAY: 26,
        SWITCH_ON: 27,      // params: [switchId]
        SWITCH_OFF: 28,     // params: [switchId]
        CHANGE_SPEED: 29,   // params: [speed]
        CHANGE_FREQ: 30,    // params: [frequency]
        WALK_ON: 31,
        WALK_OFF: 32,
        STEP_ON: 33,
        STEP_OFF: 34,
        DIR_FIX_ON: 35,
        DIR_FIX_OFF: 36,
        THROUGH_ON: 37,
        THROUGH_OFF: 38,
        TRANSPARENT_ON: 39,
        TRANSPARENT_OFF: 40,
        CHANGE_IMAGE: 41,   // params: [name, index]
        CHANGE_OPACITY: 42, // params: [opacity]
        CHANGE_BLEND: 43,   // params: [blendMode]
        PLAY_SE: 44,        // params: [se]
        SCRIPT: 45          // params: [script]
    };

    // Expose ROUTE constants globally for easy access
    window.ROUTE = ROUTE;

    // Set a custom movement route for an event
    Game_Event.prototype.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = function(commands, options = {}) {
        const route = {
            list: commands.concat([{ code: ROUTE.END, parameters: [] }]),
            repeat: options.repeat || false,
            skippable: options.skippable || false,
            wait: options.wait || false
        };

        this.forceMoveRoute(route);

        // Store callback if provided
        if (options.onComplete) {
            this._routeCompleteCallback = options.onComplete;
        }

        return this;
    };

    // Set a custom movement route for the player
    Game_Player.prototype.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = Game_Event.prototype.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y;

    // Hook route completion to trigger callbacks
    const _Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;
    Game_Character.prototype.processRouteEnd = function() {
        _Game_Character_processRouteEnd.call(this);
        
        if (this._routeCompleteCallback) {
            const callback = this._routeCompleteCallback;
            this._routeCompleteCallback = null;
            callback.call(this);
        }
    };

    // Helper to create a route command
    window.routeCommand = function(code, ...params) {
        return { code: code, parameters: params };
    };

    // ===== Preset Route Builders =====

    // Create a patrol route between waypoints
    Game_Event.prototype.setPatrolRoute = function(waypoints, options = {}) {
        const commands = [];
        for (const wp of waypoints) {
            // Move to waypoint
            const dx = wp.x - this.x;
            const dy = wp.y - this.y;
            
            // Add horizontal movement
            const hDir = dx > 0 ? ROUTE.MOVE_RIGHT : ROUTE.MOVE_LEFT;
            for (let i = 0; i < Math.abs(dx); i++) {
                commands.push({ code: hDir, parameters: [] });
            }
            
            // Add vertical movement
            const vDir = dy > 0 ? ROUTE.MOVE_DOWN : ROUTE.MOVE_UP;
            for (let i = 0; i < Math.abs(dy); i++) {
                commands.push({ code: vDir, parameters: [] });
            }
            
            // Wait at waypoint if specified
            if (wp.wait) {
                commands.push({ code: ROUTE.WAIT, parameters: [wp.wait] });
            }
        }
        
        return this.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y(commands, { repeat: true, ...options });
    };

    // Set event to chase the player
    Game_Event.prototype.setChaseRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_TOWARD, parameters: [] });
        }
        return this.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y(commands, { repeat: true, ...options });
    };

    // Set event to flee from the player
    Game_Event.prototype.setFleeRoute = function(duration = 60, options = {}) {
        const commands = [];
        for (let i = 0; i < duration; i++) {
            commands.push({ code: ROUTE.MOVE_AWAY, parameters: [] });
        }
        return this.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y(commands, { repeat: true, ...options });
    };

    // Set event to wander randomly
    Game_Event.prototype.setWanderRoute = function(steps = 10, options = {}) {
        const commands = [];
        for (let i = 0; i < steps; i++) {
            commands.push({ code: ROUTE.MOVE_RANDOM, parameters: [] });
            if (options.waitBetweenSteps) {
                commands.push({ code: ROUTE.WAIT, parameters: [options.waitBetweenSteps] });
            }
        }
        return this.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y(commands, { repeat: true, ...options });
    };

})();
