// ==== case: type-violating: wrong types {"timing":7,"actionType":7}
// rejects: Field "Timing" must be text | Field "Action Type (optional)" must be text
// throws: TypeError

// ==== case: type-violating: null {"timing":null,"actionType":null}
// rejects: Field "Timing" is required
// throws: TypeError

// ==== case: type-violating: arrays {"timing":["a","b"],"actionType":["a","b"]}
// rejects: Field "Timing" must be text | Field "Action Type (optional)" must be text
// throws: TypeError

// ==== case: type-violating: null where not required {"timing":"after","actionType":null}
// Action Execution Hook: After all actions
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    // Your code here (after action executes)
    console.log('Finished executing action');
};

// ==== case: type-violating: unlisted choices {"timing":"unlisted","actionType":"unlisted"}
// rejects: Field "Timing" must be one of its choices | Field "Action Type (optional)" must be one of its choices
// Action Execution Hook: After all actions
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    // Your code here (after action executes)
    console.log('Finished executing action');
};

// ==== case: type-violating: empty text {"timing":"after","actionType":"all"}
// Action Execution Hook: After all actions
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    // Your code here (after action executes)
    console.log('Finished executing action');
};

// ==== case: type-violating: required fields only {"timing":"after"}
// Action Execution Hook: After all actions
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    // Your code here (after action executes)
    console.log('Finished executing action');
};

// ==== case: type-violating: timing="before",actionType="skill" {"timing":"before","actionType":"skill"}
// Action Execution Hook: Before skills
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    if (this._action.isSkill()) {
        // Your code here (before action executes)
        console.log('About to execute action:', this._action.item().name);
    }

    _BattleManager_invokeAction.call(this, subject, target);
};
