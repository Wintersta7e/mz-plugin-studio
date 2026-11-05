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

// ==== case: type-violating: minValue=null {"dataType":"number","includeChange":true,"propertyName":"Sample","minValue":null}
// Custom Actor Property: Sample
// Type: number, Default: 0

// Initialize the property when actor is created
const _Game_Actor_initMembers = Game_Actor.prototype.initMembers;
Game_Actor.prototype.initMembers = function() {
    _Game_Actor_initMembers.call(this);
    this._Sample = 0;
};

// Getter: actor.Sample()
Game_Actor.prototype.Sample = function() {
    return this._Sample;
};

// Setter: actor.setSample(value)
Game_Actor.prototype.setSample = function(value) {
    this._Sample = value;
};

// Change method: actor.changeSample(amount)
// Use positive values to increase, negative to decrease
Game_Actor.prototype.changeSample = function(amount) {
    this.setSample(this._Sample + amount);
};

// ==== case: type-violating: propertyName="level",maxValue=null {"dataType":"number","includeChange":true,"propertyName":"level","maxValue":null}
// rejects: "level" conflicts with existing Game_Actor properties. Use a different name.
// Custom Actor Property: level
// Type: number, Default: 0

// Initialize the property when actor is created
const _Game_Actor_initMembers = Game_Actor.prototype.initMembers;
Game_Actor.prototype.initMembers = function() {
    _Game_Actor_initMembers.call(this);
    this._level = 0;
};

// Getter: actor.level()
Game_Actor.prototype.level = function() {
    return this._level;
};

// Setter: actor.setLevel(value)
Game_Actor.prototype.setLevel = function(value) {
    this._level = value;
};

// Change method: actor.changeLevel(amount)
// Use positive values to increase, negative to decrease
Game_Actor.prototype.changeLevel = function(amount) {
    this.setLevel(this._level + amount);
};

// ==== case: type-violating: dataType="boolean",defaultValue=7 {"dataType":"boolean","includeChange":true,"propertyName":"Sample","defaultValue":7}
// rejects: Field "Default Value" must be text
// throws: TypeError

// ==== case: type-violating: dataType="array",defaultValue=null {"dataType":"array","includeChange":true,"propertyName":"Sample","defaultValue":null}
// Custom Actor Property: Sample
// Type: array, Default: null

// Initialize the property when actor is created
const _Game_Actor_initMembers = Game_Actor.prototype.initMembers;
Game_Actor.prototype.initMembers = function() {
    _Game_Actor_initMembers.call(this);
    this._Sample = null;
};

// Getter: actor.Sample()
Game_Actor.prototype.Sample = function() {
    return this._Sample;
};

// Setter: actor.setSample(value)
Game_Actor.prototype.setSample = function(value) {
    this._Sample = value;
};
