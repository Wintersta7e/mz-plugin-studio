// ==== case: type-violating: wrong types {"processName":42,"updateInterval":"abc","activeCondition":7,"conditionId":"abc","conditionValue":"abc","pauseInMenu":"yes","pauseInBattle":"yes"}
// rejects: Field "Process Name" must be text | Field "Update Interval (frames)" must be a number | Field "Active Condition" must be text | Field "Switch/Variable ID" must be a number | Field "Variable Value" must be a number | Field "Pause in Menu" must be true or false | Field "Pause in Battle" must be true or false
// throws: TypeError

// ==== case: type-violating: null {"processName":null,"updateInterval":null,"activeCondition":null,"conditionId":null,"conditionValue":null,"pauseInMenu":null,"pauseInBattle":null}
// rejects: Update interval must be at least 1 frame
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
