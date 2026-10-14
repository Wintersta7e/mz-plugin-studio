// ==== case: base {"timing":"after","includeFadeInfo":false,"includeDirection":true}
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            this.onAfterMapTransfer(mapId);
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);

        // Player's position and direction
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const direction = $gamePlayer.direction();
        console.log('Position:', x, y, 'Direction:', direction);
    };

})();

// ==== case: timing=before {"timing":"before","includeFadeInfo":false,"includeDirection":true}
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // Before Transfer Hook
    const _Game_Player_performTransfer = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function() {
        if (this.isTransferring()) {
            const fromMapId = $gameMap.mapId();
            const toMapId = this._newMapId;

            this.onBeforeMapTransfer(fromMapId, toMapId);
        }

        _Game_Player_performTransfer.call(this);
    };

    // Override this method to add your before-transfer logic
    Game_Player.prototype.onBeforeMapTransfer = function(fromMapId, toMapId) {
        // Your code here (before leaving the current map)
        console.log('Leaving map', fromMapId, 'for map', toMapId);

        // Access the direction player will face
        const direction = this._newDirection;
        console.log('New direction:', direction);
    };


})();

// ==== case: timing=after {"timing":"after","includeFadeInfo":false,"includeDirection":true}
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            this.onAfterMapTransfer(mapId);
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);

        // Player's position and direction
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const direction = $gamePlayer.direction();
        console.log('Position:', x, y, 'Direction:', direction);
    };

})();

// ==== case: timing=both {"timing":"both","includeFadeInfo":false,"includeDirection":true}
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // Before Transfer Hook
    const _Game_Player_performTransfer = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function() {
        if (this.isTransferring()) {
            const fromMapId = $gameMap.mapId();
            const toMapId = this._newMapId;

            this.onBeforeMapTransfer(fromMapId, toMapId);
        }

        _Game_Player_performTransfer.call(this);
    };

    // Override this method to add your before-transfer logic
    Game_Player.prototype.onBeforeMapTransfer = function(fromMapId, toMapId) {
        // Your code here (before leaving the current map)
        console.log('Leaving map', fromMapId, 'for map', toMapId);

        // Access the direction player will face
        const direction = this._newDirection;
        console.log('New direction:', direction);
    };

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            this.onAfterMapTransfer(mapId);
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);

        // Player's position and direction
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const direction = $gamePlayer.direction();
        console.log('Position:', x, y, 'Direction:', direction);
    };

})();

// ==== case: filterMapId=empty {"timing":"after","includeFadeInfo":false,"includeDirection":true,"filterMapId":""}
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            this.onAfterMapTransfer(mapId);
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);

        // Player's position and direction
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const direction = $gamePlayer.direction();
        console.log('Position:', x, y, 'Direction:', direction);
    };

})();

// ==== case: includeFadeInfo=true {"timing":"after","includeFadeInfo":true,"includeDirection":true}
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            this.onAfterMapTransfer(mapId);
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);

        // Player's position and direction
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const direction = $gamePlayer.direction();
        console.log('Position:', x, y, 'Direction:', direction);
    };

})();

// ==== case: includeDirection=false {"timing":"after","includeFadeInfo":false,"includeDirection":false}
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            this.onAfterMapTransfer(mapId);
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);
    };

})();

// ==== case: filterMapId=comment-space {"timing":"after","includeFadeInfo":false,"includeDirection":true,"filterMapId":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Map ID must be a positive integer
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            // Filter: Only trigger for map X */ globalThis.__pwn = 1; /* Y
            if (mapId === X */ globalThis.__pwn = 1; /* Y) {
                this.onAfterMapTransfer(mapId);
            }
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);

        // Player's position and direction
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const direction = $gamePlayer.direction();
        console.log('Position:', x, y, 'Direction:', direction);
    };

})();

// ==== case: filterMapId=comment-u2028 {"timing":"after","includeFadeInfo":false,"includeDirection":true,"filterMapId":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Map ID must be a positive integer
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            // Filter: Only trigger for map X */ globalThis.__pwn = 1; /* Y
            if (mapId === X */ globalThis.__pwn = 1; /* Y) {
                this.onAfterMapTransfer(mapId);
            }
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);

        // Player's position and direction
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const direction = $gamePlayer.direction();
        console.log('Position:', x, y, 'Direction:', direction);
    };

})();

// ==== case: filterMapId=comment-u2029 {"timing":"after","includeFadeInfo":false,"includeDirection":true,"filterMapId":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Map ID must be a positive integer
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            // Filter: Only trigger for map X */ globalThis.__pwn = 1; /* Y
            if (mapId === X */ globalThis.__pwn = 1; /* Y) {
                this.onAfterMapTransfer(mapId);
            }
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);

        // Player's position and direction
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const direction = $gamePlayer.direction();
        console.log('Position:', x, y, 'Direction:', direction);
    };

})();

// ==== case: filterMapId=comment-lf {"timing":"after","includeFadeInfo":false,"includeDirection":true,"filterMapId":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Map ID must be a positive integer
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            // Filter: Only trigger for map X */
globalThis.__pwn = 1; /* Y
            if (mapId === X */
globalThis.__pwn = 1; /* Y) {
                this.onAfterMapTransfer(mapId);
            }
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);

        // Player's position and direction
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const direction = $gamePlayer.direction();
        console.log('Position:', x, y, 'Direction:', direction);
    };

})();

// ==== case: filterMapId=quote-single {"timing":"after","includeFadeInfo":false,"includeDirection":true,"filterMapId":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Map ID must be a positive integer
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            // Filter: Only trigger for map X' + (globalThis.__pwn = 1) + 'Y
            if (mapId === X' + (globalThis.__pwn = 1) + 'Y) {
                this.onAfterMapTransfer(mapId);
            }
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);

        // Player's position and direction
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const direction = $gamePlayer.direction();
        console.log('Position:', x, y, 'Direction:', direction);
    };

})();

// ==== case: filterMapId=quote-double {"timing":"after","includeFadeInfo":false,"includeDirection":true,"filterMapId":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Map ID must be a positive integer
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            // Filter: Only trigger for map X" + (globalThis.__pwn = 1) + "Y
            if (mapId === X" + (globalThis.__pwn = 1) + "Y) {
                this.onAfterMapTransfer(mapId);
            }
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);

        // Player's position and direction
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const direction = $gamePlayer.direction();
        console.log('Position:', x, y, 'Direction:', direction);
    };

})();

// ==== case: filterMapId=quote-backtick {"timing":"after","includeFadeInfo":false,"includeDirection":true,"filterMapId":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Map ID must be a positive integer
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            // Filter: Only trigger for map X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y
            if (mapId === X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y) {
                this.onAfterMapTransfer(mapId);
            }
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);

        // Player's position and direction
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const direction = $gamePlayer.direction();
        console.log('Position:', x, y, 'Direction:', direction);
    };

})();
