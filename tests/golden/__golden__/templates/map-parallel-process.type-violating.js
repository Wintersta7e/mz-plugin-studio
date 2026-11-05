// ==== case: type-violating: wrong types {"processName":42,"updateInterval":"abc","activeCondition":7,"conditionId":"abc","conditionValue":"abc","pauseInMenu":"yes","pauseInBattle":"yes"}
// rejects: Field "Process Name" must be text | Field "Update Interval (frames)" must be a number | Field "Active Condition" must be text | Field "Switch/Variable ID" must be a number | Field "Variable Value" must be a number | Field "Pause in Menu" must be true or false | Field "Pause in Battle" must be true or false
// throws: TypeError

// ==== case: type-violating: null {"processName":null,"updateInterval":null,"activeCondition":null,"conditionId":null,"conditionValue":null,"pauseInMenu":null,"pauseInBattle":null}
// rejects: Field "Process Name" is required | Update interval must be at least 1 frame
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
        return false;
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

// ==== case: type-violating: arrays {"processName":["a","b"],"updateInterval":["a","b"],"activeCondition":["a","b"],"conditionId":["a","b"],"conditionValue":["a","b"],"pauseInMenu":["a","b"],"pauseInBattle":["a","b"]}
// rejects: Field "Process Name" must be text | Field "Update Interval (frames)" must be a number | Field "Active Condition" must be text | Field "Switch/Variable ID" must be a number | Field "Variable Value" must be a number | Field "Pause in Menu" must be true or false | Field "Pause in Battle" must be true or false
// throws: TypeError

// ==== case: type-violating: updateInterval="2" {"processName":"myParallelProcess","updateInterval":"2","activeCondition":"always","pauseInMenu":true,"pauseInBattle":true}
// rejects: Field "Update Interval (frames)" must be a number
// Parallel Process: myParallelProcess
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 2;

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

        // Check interval
        _frameCount++;
        if (_frameCount >= UPDATE_INTERVAL) {
            _frameCount = 0;
            myParallelProcess();
        }
    };

    // ===== Utility Functions =====

    // Enable/disable the process via script call
    // For custom/always conditions, add your own control logic

})();

// ==== case: type-violating: activeCondition="switch",conditionId="3" {"processName":"myParallelProcess","updateInterval":1,"activeCondition":"switch","pauseInMenu":true,"pauseInBattle":true,"conditionId":"3"}
// rejects: Field "Switch/Variable ID" must be a number
// Parallel Process: myParallelProcess
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isMyParallelProcessActive() {
        // Active when switch 3 is ON
        return $gameSwitches.value(3);
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
        $gameSwitches.setValue(3, true);
    };

    window.disableMyParallelProcess = function() {
        $gameSwitches.setValue(3, false);
    };

})();

// ==== case: type-violating: activeCondition="variable",conditionValue="abc" {"processName":"myParallelProcess","updateInterval":1,"activeCondition":"variable","pauseInMenu":true,"pauseInBattle":true,"conditionValue":"abc"}
// rejects: Field "Variable Value" must be a number
// Parallel Process: myParallelProcess
// Runs custom logic every frame (or at specified interval) on the map

(() => {

    // Internal state
    let _frameCount = 0;
    const UPDATE_INTERVAL = 1;

    // Check if the parallel process should be active
    function isMyParallelProcessActive() {
        // Active when variable 1 >= abc
        return $gameVariables.value(1) >= abc;
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
        $gameVariables.setValue(1, value || abc);
    };

    window.disableMyParallelProcess = function() {
        $gameVariables.setValue(1, 0);
    };

})();

// ==== case: type-violating: activeCondition="custom",conditionId=null {"processName":"myParallelProcess","updateInterval":1,"activeCondition":"custom","pauseInMenu":true,"pauseInBattle":true,"conditionId":null}
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
