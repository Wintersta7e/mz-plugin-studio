// ==== case: type-violating: wrong types {"eventType":7}
// rejects: Field "Event" must be text
// throws: TypeError

// ==== case: type-violating: null {"eventType":null}
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
