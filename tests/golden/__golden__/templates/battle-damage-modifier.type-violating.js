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

// ==== case: type-violating: condition=null {"modifyType":"multiply","condition":null,"modifyValue":"1.5"}
// Damage Modifier: Multiply by 1.5 (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value >= 0 ? Math.floor(value * 1.5) : Math.ceil(value * 1.5);

    return value;
};

// ==== case: type-violating: modifyType="custom",condition=null {"modifyType":"custom","condition":null,"modifyValue":"1.5"}
// Damage Modifier: Custom formula (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = 1.5; // Custom formula - edit as needed

    return value;
};

// ==== case: type-violating: modifyType="add",modifyValue="2;x",condition=null {"modifyType":"add","condition":null,"modifyValue":"2;x"}
// rejects: Value must contain only numeric characters (digits, decimal point, minus sign)
// Damage Modifier: Add 2;x (always)
const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    // Apply damage modification
    value = value + 2;x;

    return value;
};
