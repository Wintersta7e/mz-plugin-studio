// ==== case: type-violating: wrong types {"hookType":7,"stateId":42}
// rejects: Field "Hook Type" must be text | Field "State ID (optional)" must be text


// ==== case: type-violating: null {"hookType":null,"stateId":null}
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

// ==== case: type-violating: arrays {"hookType":["a","b"],"stateId":["a","b"]}
// rejects: Field "Hook Type" must be text | Field "State ID (optional)" must be text

