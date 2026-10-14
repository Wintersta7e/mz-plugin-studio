// ==== case: base {"storageLocation":"Game_System","dataType":"object","dataName":"Sample"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: object

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

// Get a property from the Sample object
Game_System.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_System.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: storageLocation=Game_System {"storageLocation":"Game_System","dataType":"object","dataName":"Sample"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: object

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

// Get a property from the Sample object
Game_System.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_System.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: storageLocation=Game_Party {"storageLocation":"Game_Party","dataType":"object","dataName":"Sample"}
// Custom Save Data: Sample
// Storage: $gameparty
// Type: object

const _Game_Party_initialize = Game_Party.prototype.initialize;
Game_Party.prototype.initialize = function() {
    _Game_Party_initialize.call(this);
    this.Sample = {};
};

// Getter: $gameparty.getSample()
Game_Party.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gameparty.setSample(value)
Game_Party.prototype.setSample = function(value) {
    this.Sample = value;
};

// Get a property from the Sample object
Game_Party.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_Party.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: storageLocation=Game_Player {"storageLocation":"Game_Player","dataType":"object","dataName":"Sample"}
// Custom Save Data: Sample
// Storage: $gameplayer
// Type: object

const _Game_Player_initialize = Game_Player.prototype.initialize;
Game_Player.prototype.initialize = function() {
    _Game_Player_initialize.call(this);
    this.Sample = {};
};

// Getter: $gameplayer.getSample()
Game_Player.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gameplayer.setSample(value)
Game_Player.prototype.setSample = function(value) {
    this.Sample = value;
};

// Get a property from the Sample object
Game_Player.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_Player.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: storageLocation=Game_Map {"storageLocation":"Game_Map","dataType":"object","dataName":"Sample"}
// Custom Save Data: Sample
// Storage: $gamemap
// Type: object
//
// ⚠  WARNING: Game_Map is reinitialized on every map transfer.
//    Data written here will be lost whenever the player changes maps.
//    Use Game_System if you need data to survive across maps.

const _Game_Map_initialize = Game_Map.prototype.initialize;
Game_Map.prototype.initialize = function() {
    _Game_Map_initialize.call(this);
    this.Sample = {};
};

// Getter: $gamemap.getSample()
Game_Map.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamemap.setSample(value)
Game_Map.prototype.setSample = function(value) {
    this.Sample = value;
};

// Get a property from the Sample object
Game_Map.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_Map.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: storageLocation=Game_Actors {"storageLocation":"Game_Actors","dataType":"object","dataName":"Sample"}
// Custom Save Data: Sample
// Storage: $gameactors
// Type: object
//
// ⚠  WARNING: Game_Actors is a CONTAINER — DataManager does not
//    round-trip properties set on the container itself. Data written
//    here in initialize() will be lost on save reload. Move persistent
//    data to Game_System, or store per-actor data on Game_Actor objects.

const _Game_Actors_initialize = Game_Actors.prototype.initialize;
Game_Actors.prototype.initialize = function() {
    _Game_Actors_initialize.call(this);
    this.Sample = {};
};

// Getter: $gameactors.getSample()
Game_Actors.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gameactors.setSample(value)
Game_Actors.prototype.setSample = function(value) {
    this.Sample = value;
};

// Get a property from the Sample object
Game_Actors.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_Actors.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: dataType=object {"storageLocation":"Game_System","dataType":"object","dataName":"Sample"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: object

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

// Get a property from the Sample object
Game_System.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_System.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: dataType=array {"storageLocation":"Game_System","dataType":"array","dataName":"Sample"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: array

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

// ==== case: dataType=number {"storageLocation":"Game_System","dataType":"number","dataName":"Sample"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: number

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = 0;
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

// ==== case: dataType=string {"storageLocation":"Game_System","dataType":"string","dataName":"Sample"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: string

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = "";
};

// Getter: $gamesystem.getSample()
Game_System.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamesystem.setSample(value)
Game_System.prototype.setSample = function(value) {
    this.Sample = value;
};

// ==== case: dataType=boolean {"storageLocation":"Game_System","dataType":"boolean","dataName":"Sample"}
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

// ==== case: defaultValue=empty {"storageLocation":"Game_System","dataType":"object","dataName":"Sample","defaultValue":""}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: object

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

// Get a property from the Sample object
Game_System.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_System.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: dataName=comment-space {"storageLocation":"Game_System","dataType":"object","dataName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Data Property Name must be a valid JavaScript identifier (letters, numbers, _, $)
// Custom Save Data: X */ globalThis.__pwn = 1; /* Y
// Storage: $gamesystem
// Type: object

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.X */ globalThis.__pwn = 1; /* Y = {};
};

// Getter: $gamesystem.getX */ globalThis.__pwn = 1; /* Y()
Game_System.prototype.getX */ globalThis.__pwn = 1; /* Y = function() {
    return this.X */ globalThis.__pwn = 1; /* Y;
};

// Setter: $gamesystem.setX */ globalThis.__pwn = 1; /* Y(value)
Game_System.prototype.setX */ globalThis.__pwn = 1; /* Y = function(value) {
    this.X */ globalThis.__pwn = 1; /* Y = value;
};

// Get a property from the X */ globalThis.__pwn = 1; /* Y object
Game_System.prototype.getX */ globalThis.__pwn = 1; /* YValue = function(key) {
    return this.X */ globalThis.__pwn = 1; /* Y[key];
};

// Set a property on the X */ globalThis.__pwn = 1; /* Y object
Game_System.prototype.setX */ globalThis.__pwn = 1; /* YValue = function(key, value) {
    this.X */ globalThis.__pwn = 1; /* Y[key] = value;
};

// ==== case: dataName=comment-u2028 {"storageLocation":"Game_System","dataType":"object","dataName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Data Property Name must be a valid JavaScript identifier (letters, numbers, _, $)
// Custom Save Data: X */ globalThis.__pwn = 1; /* Y
// Storage: $gamesystem
// Type: object

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.X */ globalThis.__pwn = 1; /* Y = {};
};

// Getter: $gamesystem.getX */ globalThis.__pwn = 1; /* Y()
Game_System.prototype.getX */ globalThis.__pwn = 1; /* Y = function() {
    return this.X */ globalThis.__pwn = 1; /* Y;
};

// Setter: $gamesystem.setX */ globalThis.__pwn = 1; /* Y(value)
Game_System.prototype.setX */ globalThis.__pwn = 1; /* Y = function(value) {
    this.X */ globalThis.__pwn = 1; /* Y = value;
};

// Get a property from the X */ globalThis.__pwn = 1; /* Y object
Game_System.prototype.getX */ globalThis.__pwn = 1; /* YValue = function(key) {
    return this.X */ globalThis.__pwn = 1; /* Y[key];
};

// Set a property on the X */ globalThis.__pwn = 1; /* Y object
Game_System.prototype.setX */ globalThis.__pwn = 1; /* YValue = function(key, value) {
    this.X */ globalThis.__pwn = 1; /* Y[key] = value;
};

// ==== case: dataName=comment-u2029 {"storageLocation":"Game_System","dataType":"object","dataName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Data Property Name must be a valid JavaScript identifier (letters, numbers, _, $)
// Custom Save Data: X */ globalThis.__pwn = 1; /* Y
// Storage: $gamesystem
// Type: object

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.X */ globalThis.__pwn = 1; /* Y = {};
};

// Getter: $gamesystem.getX */ globalThis.__pwn = 1; /* Y()
Game_System.prototype.getX */ globalThis.__pwn = 1; /* Y = function() {
    return this.X */ globalThis.__pwn = 1; /* Y;
};

// Setter: $gamesystem.setX */ globalThis.__pwn = 1; /* Y(value)
Game_System.prototype.setX */ globalThis.__pwn = 1; /* Y = function(value) {
    this.X */ globalThis.__pwn = 1; /* Y = value;
};

// Get a property from the X */ globalThis.__pwn = 1; /* Y object
Game_System.prototype.getX */ globalThis.__pwn = 1; /* YValue = function(key) {
    return this.X */ globalThis.__pwn = 1; /* Y[key];
};

// Set a property on the X */ globalThis.__pwn = 1; /* Y object
Game_System.prototype.setX */ globalThis.__pwn = 1; /* YValue = function(key, value) {
    this.X */ globalThis.__pwn = 1; /* Y[key] = value;
};

// ==== case: dataName=comment-lf {"storageLocation":"Game_System","dataType":"object","dataName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Data Property Name must be a valid JavaScript identifier (letters, numbers, _, $)
// Custom Save Data: X */
globalThis.__pwn = 1; /* Y
// Storage: $gamesystem
// Type: object

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.X */
globalThis.__pwn = 1; /* Y = {};
};

// Getter: $gamesystem.getX */
globalThis.__pwn = 1; /* Y()
Game_System.prototype.getX */
globalThis.__pwn = 1; /* Y = function() {
    return this.X */
globalThis.__pwn = 1; /* Y;
};

// Setter: $gamesystem.setX */
globalThis.__pwn = 1; /* Y(value)
Game_System.prototype.setX */
globalThis.__pwn = 1; /* Y = function(value) {
    this.X */
globalThis.__pwn = 1; /* Y = value;
};

// Get a property from the X */
globalThis.__pwn = 1; /* Y object
Game_System.prototype.getX */
globalThis.__pwn = 1; /* YValue = function(key) {
    return this.X */
globalThis.__pwn = 1; /* Y[key];
};

// Set a property on the X */
globalThis.__pwn = 1; /* Y object
Game_System.prototype.setX */
globalThis.__pwn = 1; /* YValue = function(key, value) {
    this.X */
globalThis.__pwn = 1; /* Y[key] = value;
};

// ==== case: dataName=quote-single {"storageLocation":"Game_System","dataType":"object","dataName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Data Property Name must be a valid JavaScript identifier (letters, numbers, _, $)
// Custom Save Data: X' + (globalThis.__pwn = 1) + 'Y
// Storage: $gamesystem
// Type: object

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.X' + (globalThis.__pwn = 1) + 'Y = {};
};

// Getter: $gamesystem.getX' + (globalThis.__pwn = 1) + 'Y()
Game_System.prototype.getX' + (globalThis.__pwn = 1) + 'Y = function() {
    return this.X' + (globalThis.__pwn = 1) + 'Y;
};

// Setter: $gamesystem.setX' + (globalThis.__pwn = 1) + 'Y(value)
Game_System.prototype.setX' + (globalThis.__pwn = 1) + 'Y = function(value) {
    this.X' + (globalThis.__pwn = 1) + 'Y = value;
};

// Get a property from the X' + (globalThis.__pwn = 1) + 'Y object
Game_System.prototype.getX' + (globalThis.__pwn = 1) + 'YValue = function(key) {
    return this.X' + (globalThis.__pwn = 1) + 'Y[key];
};

// Set a property on the X' + (globalThis.__pwn = 1) + 'Y object
Game_System.prototype.setX' + (globalThis.__pwn = 1) + 'YValue = function(key, value) {
    this.X' + (globalThis.__pwn = 1) + 'Y[key] = value;
};

// ==== case: dataName=quote-double {"storageLocation":"Game_System","dataType":"object","dataName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Data Property Name must be a valid JavaScript identifier (letters, numbers, _, $)
// Custom Save Data: X" + (globalThis.__pwn = 1) + "Y
// Storage: $gamesystem
// Type: object

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.X" + (globalThis.__pwn = 1) + "Y = {};
};

// Getter: $gamesystem.getX" + (globalThis.__pwn = 1) + "Y()
Game_System.prototype.getX" + (globalThis.__pwn = 1) + "Y = function() {
    return this.X" + (globalThis.__pwn = 1) + "Y;
};

// Setter: $gamesystem.setX" + (globalThis.__pwn = 1) + "Y(value)
Game_System.prototype.setX" + (globalThis.__pwn = 1) + "Y = function(value) {
    this.X" + (globalThis.__pwn = 1) + "Y = value;
};

// Get a property from the X" + (globalThis.__pwn = 1) + "Y object
Game_System.prototype.getX" + (globalThis.__pwn = 1) + "YValue = function(key) {
    return this.X" + (globalThis.__pwn = 1) + "Y[key];
};

// Set a property on the X" + (globalThis.__pwn = 1) + "Y object
Game_System.prototype.setX" + (globalThis.__pwn = 1) + "YValue = function(key, value) {
    this.X" + (globalThis.__pwn = 1) + "Y[key] = value;
};

// ==== case: dataName=quote-backtick {"storageLocation":"Game_System","dataType":"object","dataName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Data Property Name must be a valid JavaScript identifier (letters, numbers, _, $)
// Custom Save Data: X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y
// Storage: $gamesystem
// Type: object

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = {};
};

// Getter: $gamesystem.getX${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y()
Game_System.prototype.getX${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = function() {
    return this.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y;
};

// Setter: $gamesystem.setX${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y(value)
Game_System.prototype.setX${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = function(value) {
    this.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = value;
};

// Get a property from the X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y object
Game_System.prototype.getX${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `YValue = function(key) {
    return this.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y[key];
};

// Set a property on the X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y object
Game_System.prototype.setX${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `YValue = function(key, value) {
    this.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y[key] = value;
};

// ==== case: defaultValue=comment-space {"storageLocation":"Game_System","dataType":"object","dataName":"Sample","defaultValue":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Default value for object should be JSON format starting with {
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: object

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

// Get a property from the Sample object
Game_System.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_System.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: defaultValue=comment-u2028 {"storageLocation":"Game_System","dataType":"object","dataName":"Sample","defaultValue":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Default value for object should be JSON format starting with {
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: object

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

// Get a property from the Sample object
Game_System.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_System.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: defaultValue=comment-u2029 {"storageLocation":"Game_System","dataType":"object","dataName":"Sample","defaultValue":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Default value for object should be JSON format starting with {
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: object

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

// Get a property from the Sample object
Game_System.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_System.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: defaultValue=comment-lf {"storageLocation":"Game_System","dataType":"object","dataName":"Sample","defaultValue":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Default value for object should be JSON format starting with {
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: object

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

// Get a property from the Sample object
Game_System.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_System.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: defaultValue=quote-single {"storageLocation":"Game_System","dataType":"object","dataName":"Sample","defaultValue":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Default value for object should be JSON format starting with {
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: object

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

// Get a property from the Sample object
Game_System.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_System.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: defaultValue=quote-double {"storageLocation":"Game_System","dataType":"object","dataName":"Sample","defaultValue":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Default value for object should be JSON format starting with {
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: object

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

// Get a property from the Sample object
Game_System.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_System.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: defaultValue=quote-backtick {"storageLocation":"Game_System","dataType":"object","dataName":"Sample","defaultValue":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Default value for object should be JSON format starting with {
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: object

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

// Get a property from the Sample object
Game_System.prototype.getSampleValue = function(key) {
    return this.Sample[key];
};

// Set a property on the Sample object
Game_System.prototype.setSampleValue = function(key, value) {
    this.Sample[key] = value;
};

// ==== case: dataType=string,defaultValue=comment-space {"storageLocation":"Game_System","dataType":"string","dataName":"Sample","defaultValue":"X */ globalThis.__pwn = 1; /* Y"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: string

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = 'X */ globalThis.__pwn = 1; /* Y';
};

// Getter: $gamesystem.getSample()
Game_System.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamesystem.setSample(value)
Game_System.prototype.setSample = function(value) {
    this.Sample = value;
};

// ==== case: dataType=string,defaultValue=comment-u2028 {"storageLocation":"Game_System","dataType":"string","dataName":"Sample","defaultValue":"X */\u2028globalThis.__pwn = 1; /* Y"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: string

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = 'X */ globalThis.__pwn = 1; /* Y';
};

// Getter: $gamesystem.getSample()
Game_System.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamesystem.setSample(value)
Game_System.prototype.setSample = function(value) {
    this.Sample = value;
};

// ==== case: dataType=string,defaultValue=comment-u2029 {"storageLocation":"Game_System","dataType":"string","dataName":"Sample","defaultValue":"X */\u2029globalThis.__pwn = 1; /* Y"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: string

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = 'X */ globalThis.__pwn = 1; /* Y';
};

// Getter: $gamesystem.getSample()
Game_System.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamesystem.setSample(value)
Game_System.prototype.setSample = function(value) {
    this.Sample = value;
};

// ==== case: dataType=string,defaultValue=comment-lf {"storageLocation":"Game_System","dataType":"string","dataName":"Sample","defaultValue":"X */\nglobalThis.__pwn = 1; /* Y"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: string

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = 'X */\nglobalThis.__pwn = 1; /* Y';
};

// Getter: $gamesystem.getSample()
Game_System.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamesystem.setSample(value)
Game_System.prototype.setSample = function(value) {
    this.Sample = value;
};

// ==== case: dataType=string,defaultValue=quote-single {"storageLocation":"Game_System","dataType":"string","dataName":"Sample","defaultValue":"X' + (globalThis.__pwn = 1) + 'Y"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: string

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = 'X\' + (globalThis.__pwn = 1) + \'Y';
};

// Getter: $gamesystem.getSample()
Game_System.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamesystem.setSample(value)
Game_System.prototype.setSample = function(value) {
    this.Sample = value;
};

// ==== case: dataType=string,defaultValue=quote-double {"storageLocation":"Game_System","dataType":"string","dataName":"Sample","defaultValue":"X\" + (globalThis.__pwn = 1) + \"Y"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: string

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = 'X" + (globalThis.__pwn = 1) + "Y';
};

// Getter: $gamesystem.getSample()
Game_System.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamesystem.setSample(value)
Game_System.prototype.setSample = function(value) {
    this.Sample = value;
};

// ==== case: dataType=string,defaultValue=quote-backtick {"storageLocation":"Game_System","dataType":"string","dataName":"Sample","defaultValue":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// Custom Save Data: Sample
// Storage: $gamesystem
// Type: string

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.Sample = 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y';
};

// Getter: $gamesystem.getSample()
Game_System.prototype.getSample = function() {
    return this.Sample;
};

// Setter: $gamesystem.setSample(value)
Game_System.prototype.setSample = function(value) {
    this.Sample = value;
};
