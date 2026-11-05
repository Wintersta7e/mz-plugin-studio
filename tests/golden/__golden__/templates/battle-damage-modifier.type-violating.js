// ==== case: type-violating: wrong types {"modifyType":7,"modifyValue":42,"condition":7}
// rejects: Field "Modification Type" must be text | Field "Value" must be text | Field "Condition" must be text
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
// rejects: Field "Modification Type" is required | Field "Value" is required
// Damage Modifier: Multiply by  (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * ) : Math.ceil(value * );

    return value;
};

// ==== case: type-violating: arrays {"modifyType":["a","b"],"modifyValue":["a","b"],"condition":["a","b"]}
// rejects: Field "Modification Type" must be text | Field "Value" must be text | Field "Condition" must be text
// Damage Modifier: Custom formula (for magical attacks)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = a,b; // Custom formula - edit as needed
    }

    return value;
};
