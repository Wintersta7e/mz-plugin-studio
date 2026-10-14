// ==== case: base {"hookType":"add"}
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

// ==== case: hookType=add {"hookType":"add"}
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

// ==== case: hookType=remove {"hookType":"remove"}
// State Removed Hook
const _Game_Battler_removeState = Game_Battler.prototype.removeState;
Game_Battler.prototype.removeState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_removeState.call(this, stateId);

    if (hadState && !this.isStateAffected(stateId)) {
        // State was removed
        this.onStateRemoved(stateId);
    }
};

Game_Battler.prototype.onStateRemoved = function(stateId) {
    // Your code here
    console.log('State', stateId, 'removed from', this.name());
};

// ==== case: hookType=both {"hookType":"both"}
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

// State Removed Hook
const _Game_Battler_removeState = Game_Battler.prototype.removeState;
Game_Battler.prototype.removeState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_removeState.call(this, stateId);

    if (hadState && !this.isStateAffected(stateId)) {
        // State was removed
        this.onStateRemoved(stateId);
    }
};

Game_Battler.prototype.onStateRemoved = function(stateId) {
    // Your code here
    console.log('State', stateId, 'removed from', this.name());
};

// ==== case: stateId=empty {"hookType":"add","stateId":""}
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

// ==== case: stateId=comment-space {"hookType":"add","stateId":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: State ID must be a positive integer
// State Added Hook
const _Game_Battler_addState = Game_Battler.prototype.addState;
Game_Battler.prototype.addState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_addState.call(this, stateId);

    if (!hadState && this.isStateAffected(stateId)) {
        // State was newly added
        if (stateId === X */ globalThis.__pwn = 1; /* Y) {
            this.onStateAdded(stateId);
        }
    }
};

Game_Battler.prototype.onStateAdded = function(stateId) {
    // Your code here
    console.log('State', stateId, 'added to', this.name());
};

// ==== case: stateId=comment-u2028 {"hookType":"add","stateId":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: State ID must be a positive integer
// State Added Hook
const _Game_Battler_addState = Game_Battler.prototype.addState;
Game_Battler.prototype.addState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_addState.call(this, stateId);

    if (!hadState && this.isStateAffected(stateId)) {
        // State was newly added
        if (stateId === X */ globalThis.__pwn = 1; /* Y) {
            this.onStateAdded(stateId);
        }
    }
};

Game_Battler.prototype.onStateAdded = function(stateId) {
    // Your code here
    console.log('State', stateId, 'added to', this.name());
};

// ==== case: stateId=comment-u2029 {"hookType":"add","stateId":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: State ID must be a positive integer
// State Added Hook
const _Game_Battler_addState = Game_Battler.prototype.addState;
Game_Battler.prototype.addState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_addState.call(this, stateId);

    if (!hadState && this.isStateAffected(stateId)) {
        // State was newly added
        if (stateId === X */ globalThis.__pwn = 1; /* Y) {
            this.onStateAdded(stateId);
        }
    }
};

Game_Battler.prototype.onStateAdded = function(stateId) {
    // Your code here
    console.log('State', stateId, 'added to', this.name());
};

// ==== case: stateId=comment-lf {"hookType":"add","stateId":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: State ID must be a positive integer
// State Added Hook
const _Game_Battler_addState = Game_Battler.prototype.addState;
Game_Battler.prototype.addState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_addState.call(this, stateId);

    if (!hadState && this.isStateAffected(stateId)) {
        // State was newly added
        if (stateId === X */
globalThis.__pwn = 1; /* Y) {
            this.onStateAdded(stateId);
        }
    }
};

Game_Battler.prototype.onStateAdded = function(stateId) {
    // Your code here
    console.log('State', stateId, 'added to', this.name());
};

// ==== case: stateId=quote-single {"hookType":"add","stateId":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: State ID must be a positive integer
// State Added Hook
const _Game_Battler_addState = Game_Battler.prototype.addState;
Game_Battler.prototype.addState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_addState.call(this, stateId);

    if (!hadState && this.isStateAffected(stateId)) {
        // State was newly added
        if (stateId === X' + (globalThis.__pwn = 1) + 'Y) {
            this.onStateAdded(stateId);
        }
    }
};

Game_Battler.prototype.onStateAdded = function(stateId) {
    // Your code here
    console.log('State', stateId, 'added to', this.name());
};

// ==== case: stateId=quote-double {"hookType":"add","stateId":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: State ID must be a positive integer
// State Added Hook
const _Game_Battler_addState = Game_Battler.prototype.addState;
Game_Battler.prototype.addState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_addState.call(this, stateId);

    if (!hadState && this.isStateAffected(stateId)) {
        // State was newly added
        if (stateId === X" + (globalThis.__pwn = 1) + "Y) {
            this.onStateAdded(stateId);
        }
    }
};

Game_Battler.prototype.onStateAdded = function(stateId) {
    // Your code here
    console.log('State', stateId, 'added to', this.name());
};

// ==== case: stateId=quote-backtick {"hookType":"add","stateId":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: State ID must be a positive integer
// State Added Hook
const _Game_Battler_addState = Game_Battler.prototype.addState;
Game_Battler.prototype.addState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_addState.call(this, stateId);

    if (!hadState && this.isStateAffected(stateId)) {
        // State was newly added
        if (stateId === X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y) {
            this.onStateAdded(stateId);
        }
    }
};

Game_Battler.prototype.onStateAdded = function(stateId) {
    // Your code here
    console.log('State', stateId, 'added to', this.name());
};
