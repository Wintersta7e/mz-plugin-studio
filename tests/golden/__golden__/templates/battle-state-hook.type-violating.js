// ==== case: type-violating: wrong types {"hookType":7,"stateId":42}
// rejects: Field "Hook Type" must be text | Field "State ID (optional)" must be text
// throws: TypeError

// ==== case: type-violating: null {"hookType":null,"stateId":null}
// rejects: Field "Hook Type" is required
// throws: TypeError

// ==== case: type-violating: arrays {"hookType":["a","b"],"stateId":["a","b"]}
// rejects: Field "Hook Type" must be text | Field "State ID (optional)" must be text
// throws: TypeError

// ==== case: type-violating: null where not required {"hookType":"add","stateId":null}
// State Added Hook
const _Game_Battler_addState = Game_Battler.prototype.addState;
Game_Battler.prototype.addState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_addState.call(this, stateId);

    if (!hadState && this.isStateAffected(stateId)) {
        // State was newly added
        this.onStateAdded(stateId);
    }
};

Game_Battler.prototype.onStateAdded = function(stateId) {
    // Your code here
    console.log('State', stateId, 'added to', this.name());
};

// ==== case: type-violating: unlisted choices {"hookType":"unlisted"}
// rejects: Field "Hook Type" must be one of its choices


// ==== case: type-violating: empty text {"hookType":"add","stateId":""}
// State Added Hook
const _Game_Battler_addState = Game_Battler.prototype.addState;
Game_Battler.prototype.addState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_addState.call(this, stateId);

    if (!hadState && this.isStateAffected(stateId)) {
        // State was newly added
        this.onStateAdded(stateId);
    }
};

Game_Battler.prototype.onStateAdded = function(stateId) {
    // Your code here
    console.log('State', stateId, 'added to', this.name());
};

// ==== case: type-violating: required fields only {"hookType":"add"}
// State Added Hook
const _Game_Battler_addState = Game_Battler.prototype.addState;
Game_Battler.prototype.addState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_addState.call(this, stateId);

    if (!hadState && this.isStateAffected(stateId)) {
        // State was newly added
        this.onStateAdded(stateId);
    }
};

Game_Battler.prototype.onStateAdded = function(stateId) {
    // Your code here
    console.log('State', stateId, 'added to', this.name());
};

// ==== case: type-violating: hookType=null,stateId="3" {"hookType":null,"stateId":"3"}
// rejects: Field "Hook Type" is required
// throws: TypeError

// ==== case: type-violating: hookType="remove",stateId="3" {"hookType":"remove","stateId":"3"}
// State Removed Hook
const _Game_Battler_removeState = Game_Battler.prototype.removeState;
Game_Battler.prototype.removeState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_removeState.call(this, stateId);

    if (hadState && !this.isStateAffected(stateId)) {
        // State was removed
        if (stateId === 3) {
            this.onStateRemoved(stateId);
        }
    }
};

Game_Battler.prototype.onStateRemoved = function(stateId) {
    // Your code here
    console.log('State', stateId, 'removed from', this.name());
};
