// ==== case: type-violating: wrong types {"propertyName":42,"dataType":7,"defaultValue":42,"minValue":42,"maxValue":42,"includeChange":"yes"}
// rejects: Field "Property Name" must be text | Field "Data Type" must be text | Field "Default Value" must be text | Field "Minimum Value (for numbers)" must be text | Field "Maximum Value (for numbers)" must be text | Field "Include Change Method" must be true or false
// throws: TypeError

// ==== case: type-violating: null {"propertyName":null,"dataType":null,"defaultValue":null,"minValue":null,"maxValue":null,"includeChange":null}
// Custom Actor Property: null
// Type: number, Default: 0

// Initialize the property when actor is created
const _Game_Actor_initMembers = Game_Actor.prototype.initMembers;
Game_Actor.prototype.initMembers = function() {
    _Game_Actor_initMembers.call(this);
    this._null = 0;
};

// Getter: actor.null()
Game_Actor.prototype.null = function() {
    return this._null;
};

// Setter: actor.set(value)
Game_Actor.prototype.set = function(value) {
    this._null = value;
};

// Change method: actor.change(amount)
// Use positive values to increase, negative to decrease
Game_Actor.prototype.change = function(amount) {
    this.set(this._null + amount);
};

// ==== case: type-violating: arrays {"propertyName":["a","b"],"dataType":["a","b"],"defaultValue":["a","b"],"minValue":["a","b"],"maxValue":["a","b"],"includeChange":["a","b"]}
// rejects: Field "Property Name" must be text | Field "Data Type" must be text | Field "Default Value" must be text | Field "Minimum Value (for numbers)" must be text | Field "Maximum Value (for numbers)" must be text | Field "Include Change Method" must be true or false
// throws: TypeError
