// ==== case: base {"modifyType":"multiply","condition":"always","modifyValue":"1.5"}
// Damage Modifier: Multiply by 1.5 (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * 1.5) : Math.ceil(value * 1.5);

    return value;
};

// ==== case: modifyType=multiply {"modifyType":"multiply","condition":"always","modifyValue":"1.5"}
// Damage Modifier: Multiply by 1.5 (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * 1.5) : Math.ceil(value * 1.5);

    return value;
};

// ==== case: modifyType=add {"modifyType":"add","condition":"always","modifyValue":"1.5"}
// Damage Modifier: Add 1.5 (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value + 1.5;

    return value;
};

// ==== case: modifyType=custom {"modifyType":"custom","condition":"always","modifyValue":"1.5"}
// Damage Modifier: Custom formula (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = 1.5; // Custom formula - edit as needed

    return value;
};

// ==== case: condition=always {"modifyType":"multiply","condition":"always","modifyValue":"1.5"}
// Damage Modifier: Multiply by 1.5 (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * 1.5) : Math.ceil(value * 1.5);

    return value;
};

// ==== case: condition=critical {"modifyType":"multiply","condition":"critical","modifyValue":"1.5"}
// Damage Modifier: Multiply by 1.5 (on critical hits)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    if (critical) {
        value = value >= 0 ? Math.floor(value * 1.5) : Math.ceil(value * 1.5);
    }

    return value;
};

// ==== case: condition=skill {"modifyType":"multiply","condition":"skill","modifyValue":"1.5"}
// Damage Modifier: Multiply by 1.5 (for skills only)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    if (this.isSkill()) {
        value = value >= 0 ? Math.floor(value * 1.5) : Math.ceil(value * 1.5);
    }

    return value;
};

// ==== case: condition=physical {"modifyType":"multiply","condition":"physical","modifyValue":"1.5"}
// Damage Modifier: Multiply by 1.5 (for physical attacks)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    if (this.isPhysical()) {
        value = value >= 0 ? Math.floor(value * 1.5) : Math.ceil(value * 1.5);
    }

    return value;
};

// ==== case: condition=magical {"modifyType":"multiply","condition":"magical","modifyValue":"1.5"}
// Damage Modifier: Multiply by 1.5 (for magical attacks)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    if (this.isMagical()) {
        value = value >= 0 ? Math.floor(value * 1.5) : Math.ceil(value * 1.5);
    }

    return value;
};

// ==== case: modifyValue=comment-space {"modifyType":"multiply","condition":"always","modifyValue":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Value must be a valid number for multiply/add operations
// Damage Modifier: Multiply by X */ globalThis.__pwn = 1; /* Y (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * X */ globalThis.__pwn = 1; /* Y) : Math.ceil(value * X */ globalThis.__pwn = 1; /* Y);

    return value;
};

// ==== case: modifyValue=comment-u2028 {"modifyType":"multiply","condition":"always","modifyValue":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Value must be a valid number for multiply/add operations
// Damage Modifier: Multiply by X */ globalThis.__pwn = 1; /* Y (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * X */ globalThis.__pwn = 1; /* Y) : Math.ceil(value * X */ globalThis.__pwn = 1; /* Y);

    return value;
};

// ==== case: modifyValue=comment-u2029 {"modifyType":"multiply","condition":"always","modifyValue":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Value must be a valid number for multiply/add operations
// Damage Modifier: Multiply by X */ globalThis.__pwn = 1; /* Y (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * X */ globalThis.__pwn = 1; /* Y) : Math.ceil(value * X */ globalThis.__pwn = 1; /* Y);

    return value;
};

// ==== case: modifyValue=comment-lf {"modifyType":"multiply","condition":"always","modifyValue":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Value must be a valid number for multiply/add operations
// Damage Modifier: Multiply by X */
globalThis.__pwn = 1; /* Y (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * X */
globalThis.__pwn = 1; /* Y) : Math.ceil(value * X */
globalThis.__pwn = 1; /* Y);

    return value;
};

// ==== case: modifyValue=quote-single {"modifyType":"multiply","condition":"always","modifyValue":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Value must be a valid number for multiply/add operations
// Damage Modifier: Multiply by X' + (globalThis.__pwn = 1) + 'Y (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * X' + (globalThis.__pwn = 1) + 'Y) : Math.ceil(value * X' + (globalThis.__pwn = 1) + 'Y);

    return value;
};

// ==== case: modifyValue=quote-double {"modifyType":"multiply","condition":"always","modifyValue":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Value must be a valid number for multiply/add operations
// Damage Modifier: Multiply by X" + (globalThis.__pwn = 1) + "Y (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * X" + (globalThis.__pwn = 1) + "Y) : Math.ceil(value * X" + (globalThis.__pwn = 1) + "Y);

    return value;
};

// ==== case: modifyValue=quote-backtick {"modifyType":"multiply","condition":"always","modifyValue":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Value must be a valid number for multiply/add operations
// Damage Modifier: Multiply by X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y) : Math.ceil(value * X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y);

    return value;
};
