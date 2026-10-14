// ==== case: base {"timing":"after","actionType":"all"}
// Action Execution Hook: After all actions
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    // Your code here (after action executes)
    console.log('Finished executing action');
};

// ==== case: timing=before {"timing":"before","actionType":"all"}
// Action Execution Hook: Before all actions
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    // Your code here (before action executes)
    console.log('About to execute action');

    _BattleManager_invokeAction.call(this, subject, target);
};

// ==== case: timing=after {"timing":"after","actionType":"all"}
// Action Execution Hook: After all actions
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    // Your code here (after action executes)
    console.log('Finished executing action');
};

// ==== case: actionType=all {"timing":"after","actionType":"all"}
// Action Execution Hook: After all actions
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    // Your code here (after action executes)
    console.log('Finished executing action');
};

// ==== case: actionType=skill {"timing":"after","actionType":"skill"}
// Action Execution Hook: After skills
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    if (this._action.isSkill()) {
        // Your code here (after action executes)
        console.log('Finished executing action:', this._action.item().name);
    }
};

// ==== case: actionType=item {"timing":"after","actionType":"item"}
// Action Execution Hook: After items
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    if (this._action.isItem()) {
        // Your code here (after action executes)
        console.log('Finished executing action:', this._action.item().name);
    }
};

// ==== case: actionType=attack {"timing":"after","actionType":"attack"}
// Action Execution Hook: After normal attacks
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    if (this._action.isAttack()) {
        // Your code here (after action executes)
        console.log('Finished executing action:', this._action.item().name);
    }
};

// ==== case: actionType=guard {"timing":"after","actionType":"guard"}
// Action Execution Hook: After guard actions
const _BattleManager_invokeAction = BattleManager.invokeAction;
BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);

    if (this._action.isGuard()) {
        // Your code here (after action executes)
        console.log('Finished executing action:', this._action.item().name);
    }
};
