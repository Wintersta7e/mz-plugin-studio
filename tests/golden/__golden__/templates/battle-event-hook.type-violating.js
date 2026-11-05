// ==== case: type-violating: wrong types {"eventType":7}
// rejects: Field "Event" must be text
// throws: TypeError

// ==== case: type-violating: null {"eventType":null}
// rejects: Field "Event" is required
// Victory Hook
const _BattleManager_processVictory = BattleManager.processVictory;
BattleManager.processVictory = function() {
    // Your code here (before victory processing)
    console.log('Battle victory!');

    _BattleManager_processVictory.call(this);
};

// ==== case: type-violating: arrays {"eventType":["a","b"]}
// rejects: Field "Event" must be text
// throws: TypeError

// ==== case: type-violating: eventType="start" {"eventType":"start"}
// Battle Start Hook
const _BattleManager_startBattle = BattleManager.startBattle;
BattleManager.startBattle = function() {
    _BattleManager_startBattle.call(this);

    // Your code here (after start processing)
    console.log('Battle Start!');
};
