// ==== case: type-violating: wrong types {"timing":7,"actionType":7}
// Action Execution Hook: After all actions
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    // Your code here (after action executes)
    console.log('Finished executing action');
};

// ==== case: type-violating: null {"timing":null,"actionType":null}
// Action Execution Hook: After all actions
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    // Your code here (after action executes)
    console.log('Finished executing action');
};

// ==== case: type-violating: arrays {"timing":["a","b"],"actionType":["a","b"]}
// Action Execution Hook: After all actions
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    // Your code here (after action executes)
    console.log('Finished executing action');
};
