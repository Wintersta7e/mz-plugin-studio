// ==== case: type-violating: wrong types {"dataName":42,"storageLocation":7,"dataType":7,"defaultValue":42}
// rejects: Field "Data Property Name" must be text | Field "Storage Location" must be text | Field "Data Type" must be text | Field "Default Value" must be text
// throws: TypeError

// ==== case: type-violating: null {"dataName":null,"storageLocation":null,"dataType":null,"defaultValue":null}
// Custom Save Data: null
// Storage: $gamesystem
// Type: object

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.null = null;
};

// Getter: $gamesystem.get()
Game_System.prototype.get = function() {
    return this.null;
};

// Setter: $gamesystem.set(value)
Game_System.prototype.set = function(value) {
    this.null = value;
};

// Get a property from the null object
Game_System.prototype.getValue = function(key) {
    return this.null[key];
};

// Set a property on the null object
Game_System.prototype.setValue = function(key, value) {
    this.null[key] = value;
};

// ==== case: type-violating: arrays {"dataName":["a","b"],"storageLocation":["a","b"],"dataType":["a","b"],"defaultValue":["a","b"]}
// rejects: Field "Data Property Name" must be text | Field "Storage Location" must be text | Field "Data Type" must be text | Field "Default Value" must be text
// throws: TypeError
