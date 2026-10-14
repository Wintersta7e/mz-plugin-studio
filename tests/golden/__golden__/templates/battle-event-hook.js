// ==== case: base {"eventType":"victory"}
// Victory Hook
const _BattleManager_processVictory = BattleManager.processVictory;
BattleManager.processVictory = function() {
    // Your code here (before victory processing)
    console.log('Battle victory!');

    _BattleManager_processVictory.call(this);
};

// ==== case: eventType=victory {"eventType":"victory"}
// Victory Hook
const _BattleManager_processVictory = BattleManager.processVictory;
BattleManager.processVictory = function() {
    // Your code here (before victory processing)
    console.log('Battle victory!');

    _BattleManager_processVictory.call(this);
};

// ==== case: eventType=defeat {"eventType":"defeat"}
// Defeat Hook
const _BattleManager_processDefeat = BattleManager.processDefeat;
BattleManager.processDefeat = function() {
    // Your code here (before defeat processing)
    console.log('Battle defeat!');

    _BattleManager_processDefeat.call(this);
};

// ==== case: eventType=escape {"eventType":"escape"}
// Escape Hook
const _BattleManager_processEscape = BattleManager.processEscape;
BattleManager.processEscape = function() {
    // Your code here (before escape processing)
    console.log('Battle escape!');

    _BattleManager_processEscape.call(this);
};

// ==== case: eventType=start {"eventType":"start"}
// Battle Start Hook
const _BattleManager_startBattle = BattleManager.startBattle;
BattleManager.startBattle = function() {
    _BattleManager_startBattle.call(this);

    // Your code here (after start processing)
    console.log('Battle Start!');
};

// ==== case: eventType=turnStart {"eventType":"turnStart"}
// Turn Start Hook
const _BattleManager_startTurn = BattleManager.startTurn;
BattleManager.startTurn = function() {
    _BattleManager_startTurn.call(this);

    // Your code here (after turnStart processing)
    console.log('Turn Start!');
};

// ==== case: eventType=turnEnd {"eventType":"turnEnd"}
// Turn End Hook
const _BattleManager_endTurn = BattleManager.endTurn;
BattleManager.endTurn = function() {
    _BattleManager_endTurn.call(this);

    // Your code here (after turnEnd processing)
    console.log('Turn End!');
};
