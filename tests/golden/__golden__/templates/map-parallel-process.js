// ==== case: base {"processName":"myParallelProcess","updateInterval":1,"activeCondition":"always","pauseInMenu":true,"pauseInBattle":true}
// Parallel Process: myParallelProcess
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isMyParallelProcessActive() {
        return true;
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd ||
               SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function myParallelProcess() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isMyParallelProcessActive()) return;

        myParallelProcess();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();

// ==== case: activeCondition=always {"processName":"myParallelProcess","updateInterval":1,"activeCondition":"always","pauseInMenu":true,"pauseInBattle":true}
// Parallel Process: myParallelProcess
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isMyParallelProcessActive() {
        return true;
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd ||
               SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function myParallelProcess() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isMyParallelProcessActive()) return;

        myParallelProcess();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();

// ==== case: activeCondition=switch {"processName":"myParallelProcess","updateInterval":1,"activeCondition":"switch","pauseInMenu":true,"pauseInBattle":true}
// rejects: Switch/Variable ID must be a positive integer
// Parallel Process: myParallelProcess
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isMyParallelProcessActive() {
        // Active when switch 1 is ON
        return $gameSwitches.value(1);
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd ||
               SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function myParallelProcess() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isMyParallelProcessActive()) return;

        myParallelProcess();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    window.enableMyParallelProcess = function() {
        $gameSwitches.setValue(1, true);
    };

    window.disableMyParallelProcess = function() {
        $gameSwitches.setValue(1, false);
    };

})();

// ==== case: activeCondition=variable {"processName":"myParallelProcess","updateInterval":1,"activeCondition":"variable","pauseInMenu":true,"pauseInBattle":true}
// rejects: Switch/Variable ID must be a positive integer
// Parallel Process: myParallelProcess
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isMyParallelProcessActive() {
        // Active when variable 1 >= 1
        return $gameVariables.value(1) >= 1;
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd ||
               SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function myParallelProcess() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isMyParallelProcessActive()) return;

        myParallelProcess();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    window.enableMyParallelProcess = function(value) {
        $gameVariables.setValue(1, value || 1);
    };

    window.disableMyParallelProcess = function() {
        $gameVariables.setValue(1, 0);
    };

})();

// ==== case: activeCondition=custom {"processName":"myParallelProcess","updateInterval":1,"activeCondition":"custom","pauseInMenu":true,"pauseInBattle":true}
// Parallel Process: myParallelProcess
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isMyParallelProcessActive() {
        // Custom condition - edit as needed
        return true; // Replace with your condition
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd ||
               SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function myParallelProcess() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isMyParallelProcessActive()) return;

        myParallelProcess();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();

// ==== case: pauseInMenu=false {"processName":"myParallelProcess","updateInterval":1,"activeCondition":"always","pauseInMenu":false,"pauseInBattle":true}
// Parallel Process: myParallelProcess
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isMyParallelProcessActive() {
        return true;
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function myParallelProcess() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isMyParallelProcessActive()) return;

        myParallelProcess();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();

// ==== case: pauseInBattle=false {"processName":"myParallelProcess","updateInterval":1,"activeCondition":"always","pauseInMenu":true,"pauseInBattle":false}
// Parallel Process: myParallelProcess
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isMyParallelProcessActive() {
        return true;
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd;
    }

    // Main parallel process logic - customize this!
    function myParallelProcess() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isMyParallelProcessActive()) return;

        myParallelProcess();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();

// ==== case: processName=comment-space {"processName":"X */ globalThis.__pwn = 1; /* Y","updateInterval":1,"activeCondition":"always","pauseInMenu":true,"pauseInBattle":true}
// rejects: Process name must be a valid JavaScript identifier
// Parallel Process: X */ globalThis.__pwn = 1; /* Y
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isX */ globalThis.__pwn = 1; /* YActive() {
        return true;
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd ||
               SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function X */ globalThis.__pwn = 1; /* Y() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isX */ globalThis.__pwn = 1; /* YActive()) return;

        X */ globalThis.__pwn = 1; /* Y();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();

// ==== case: processName=comment-u2028 {"processName":"X */\u2028globalThis.__pwn = 1; /* Y","updateInterval":1,"activeCondition":"always","pauseInMenu":true,"pauseInBattle":true}
// rejects: Process name must be a valid JavaScript identifier
// Parallel Process: X */ globalThis.__pwn = 1; /* Y
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isX */ globalThis.__pwn = 1; /* YActive() {
        return true;
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd ||
               SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function X */ globalThis.__pwn = 1; /* Y() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isX */ globalThis.__pwn = 1; /* YActive()) return;

        X */ globalThis.__pwn = 1; /* Y();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();

// ==== case: processName=comment-u2029 {"processName":"X */\u2029globalThis.__pwn = 1; /* Y","updateInterval":1,"activeCondition":"always","pauseInMenu":true,"pauseInBattle":true}
// rejects: Process name must be a valid JavaScript identifier
// Parallel Process: X */ globalThis.__pwn = 1; /* Y
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isX */ globalThis.__pwn = 1; /* YActive() {
        return true;
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd ||
               SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function X */ globalThis.__pwn = 1; /* Y() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isX */ globalThis.__pwn = 1; /* YActive()) return;

        X */ globalThis.__pwn = 1; /* Y();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();

// ==== case: processName=comment-lf {"processName":"X */\nglobalThis.__pwn = 1; /* Y","updateInterval":1,"activeCondition":"always","pauseInMenu":true,"pauseInBattle":true}
// rejects: Process name must be a valid JavaScript identifier
// Parallel Process: X */
globalThis.__pwn = 1; /* Y
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isX */
globalThis.__pwn = 1; /* YActive() {
        return true;
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd ||
               SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function X */
globalThis.__pwn = 1; /* Y() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isX */
globalThis.__pwn = 1; /* YActive()) return;

        X */
globalThis.__pwn = 1; /* Y();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();

// ==== case: processName=quote-single {"processName":"X' + (globalThis.__pwn = 1) + 'Y","updateInterval":1,"activeCondition":"always","pauseInMenu":true,"pauseInBattle":true}
// rejects: Process name must be a valid JavaScript identifier
// Parallel Process: X' + (globalThis.__pwn = 1) + 'Y
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isX' + (globalThis.__pwn = 1) + 'YActive() {
        return true;
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd ||
               SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function X' + (globalThis.__pwn = 1) + 'Y() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isX' + (globalThis.__pwn = 1) + 'YActive()) return;

        X' + (globalThis.__pwn = 1) + 'Y();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();

// ==== case: processName=quote-double {"processName":"X\" + (globalThis.__pwn = 1) + \"Y","updateInterval":1,"activeCondition":"always","pauseInMenu":true,"pauseInBattle":true}
// rejects: Process name must be a valid JavaScript identifier
// Parallel Process: X" + (globalThis.__pwn = 1) + "Y
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isX" + (globalThis.__pwn = 1) + "YActive() {
        return true;
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd ||
               SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function X" + (globalThis.__pwn = 1) + "Y() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isX" + (globalThis.__pwn = 1) + "YActive()) return;

        X" + (globalThis.__pwn = 1) + "Y();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();

// ==== case: processName=quote-backtick {"processName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","updateInterval":1,"activeCondition":"always","pauseInMenu":true,"pauseInBattle":true}
// rejects: Process name must be a valid JavaScript identifier
// Parallel Process: X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isX${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `YActive() {
        return true;
    }

    // Check if process should be paused based on current scene
    function shouldPauseProcess() {
        return SceneManager._scene instanceof Scene_Menu ||
               SceneManager._scene instanceof Scene_Item ||
               SceneManager._scene instanceof Scene_Skill ||
               SceneManager._scene instanceof Scene_Equip ||
               SceneManager._scene instanceof Scene_Status ||
               SceneManager._scene instanceof Scene_Options ||
               SceneManager._scene instanceof Scene_Save ||
               SceneManager._scene instanceof Scene_Load ||
               SceneManager._scene instanceof Scene_GameEnd ||
               SceneManager._scene instanceof Scene_Battle;
    }

    // Main parallel process logic - customize this!
    function X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y() {
        // Your parallel process code here
        // This runs every frame (or at your specified interval) while active

        // Example: Check player position
        // const px = $gamePlayer.x;
        // const py = $gamePlayer.y;

        // Example: Check for nearby events
        // const events = $gameMap.eventsXy(px, py);

        // Example: Trigger something
        // if (someCondition) {
        //     $gameSwitches.setValue(1, true);
        // }
    }

    // Hook into map scene update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Skip if paused or inactive
        if (shouldPauseProcess()) return;
        if (!isX${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `YActive()) return;

        X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y();
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();
