// ==== case: type-violating: wrong types {"dataName":42,"storageLocation":7,"dataType":7,"defaultValue":42}
// rejects: Field "Data Property Name" must be text | Field "Storage Location" must be text | Field "Data Type" must be text | Field "Default Value" must be text
// throws: TypeError

// ==== case: type-violating: null {"dataName":null,"storageLocation":null,"dataType":null,"defaultValue":null}
// rejects: Field "Data Property Name" is required | Field "Storage Location" is required | Field "Data Type" is required
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

// ==== case: type-violating: dataName="save",defaultValue=null {"storageLocation":"Game_System","dataType":"object","dataName":"save","defaultValue":null}
// rejects: "save" may conflict with existing methods. Consider a more specific name.
// Custom Save Data: save
// Storage: $gamesystem
// Type: object

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.save = null;
};

// Getter: $gamesystem.getSave()
Game_System.prototype.getSave = function() {
    return this.save;
};

// Setter: $gamesystem.setSave(value)
Game_System.prototype.setSave = function(value) {
    this.save = value;
};

// Get a property from the save object
Game_System.prototype.getSaveValue = function(key) {
    return this.save[key];
};

// Set a property on the save object
Game_System.prototype.setSaveValue = function(key, value) {
    this.save[key] = value;
};

// ==== case: type-violating: dataType="object",defaultValue="[]" {"storageLocation":"Game_System","dataType":"object","dataName":"Sample","defaultValue":"[]"}
// rejects: Default value for object should be JSON format starting with {
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: object

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = [];
};

// Getter: $gamesystem.getSample()
Game_System.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamesystem.setSample(value)
Game_System.prototype.setSample = function(value) {
    this.Sample = value;
};

// Get a property from the Sample object
Game_System.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_System.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: type-violating: dataType="array",defaultValue="{}" {"storageLocation":"Game_System","dataType":"array","dataName":"Sample","defaultValue":"{}"}
// rejects: Default value for array should be JSON format starting with [
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: array

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = {};
};

// Getter: $gamesystem.getSample()
Game_System.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamesystem.setSample(value)
Game_System.prototype.setSample = function(value) {
    this.Sample = value;
};

// Add an item to the Sample array
Game_System.prototype.addSampleItem = function(item) {
    this.Sample.push(item);
};

// Remove an item from the Sample array by index
Game_System.prototype.removeSampleItem = function(index) {
    this.Sample.splice(index, 1);
};

// Clear all items from the Sample array
Game_System.prototype.clearSample = function() {
    this.Sample = [];
};

// ==== case: type-violating: dataType="number",defaultValue="abc" {"storageLocation":"Game_System","dataType":"number","dataName":"Sample","defaultValue":"abc"}
// rejects: Default value for number must be a valid number
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: number

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = NaN;
};

// Getter: $gamesystem.getSample()
Game_System.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamesystem.setSample(value)
Game_System.prototype.setSample = function(value) {
    this.Sample = value;
};

// Add to the Sample value
Game_System.prototype.addSample = function(amount) {
    this.Sample += amount;
};

// ==== case: type-violating: dataType="boolean",defaultValue="yes" {"storageLocation":"Game_System","dataType":"boolean","dataName":"Sample","defaultValue":"yes"}
// rejects: Default value for boolean must be true or false
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: boolean

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = false;
};

// Getter: $gamesystem.getSample()
Game_System.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamesystem.setSample(value)
Game_System.prototype.setSample = function(value) {
    this.Sample = value;
};

// Toggle the Sample value
Game_System.prototype.toggleSample = function() {
    this.Sample = !this.Sample;
};
