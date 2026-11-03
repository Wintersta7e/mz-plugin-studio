// ==== case: type-violating: wrong types {"modifyType":7,"modifyValue":42,"condition":7}
// Damage Modifier: Custom formula (for magical attacks)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = 42; // Custom formula - edit as needed
    }

    return value;
};

// ==== case: type-violating: null {"modifyType":null,"modifyValue":null,"condition":null}
// Damage Modifier: Multiply by  (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * ) : Math.ceil(value * );

    return value;
};

// ==== case: type-violating: arrays {"modifyType":["a","b"],"modifyValue":["a","b"],"condition":["a","b"]}
// Damage Modifier: Custom formula (for magical attacks)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = a,b; // Custom formula - edit as needed
    }

    return value;
};
