// ==== case: type-violating: wrong types {"optionName":42,"optionSymbol":42,"optionType":7,"defaultValue":42,"choices":42,"persistToConfig":"yes"}
// rejects: Field "Option Name" must be text | Field "Option Symbol" must be text | Field "Option Type" must be text | Field "Default Value" must be text | Field "Choices (comma-separated)" must be text | Field "Save to Config" must be true or false
// throws: TypeError

// ==== case: type-violating: null {"optionName":null,"optionSymbol":null,"optionType":null,"defaultValue":null,"choices":null,"persistToConfig":null}
// rejects: Field "Option Name" is required | Field "Option Symbol" is required | Field "Option Type" is required
// throws: TypeError

// ==== case: type-violating: arrays {"optionName":["a","b"],"optionSymbol":["a","b"],"optionType":["a","b"],"defaultValue":["a","b"],"choices":["a","b"],"persistToConfig":["a","b"]}
// rejects: Field "Option Name" must be text | Field "Option Symbol" must be text | Field "Option Type" must be text | Field "Default Value" must be text | Field "Choices (comma-separated)" must be text | Field "Save to Config" must be true or false
// throws: TypeError

// ==== case: type-violating: persistToConfig=null {"optionType":"boolean","persistToConfig":null,"optionName":"Sample","optionSymbol":"Sample"}
// Options Menu Addition: Sample

// Add to ConfigManager
ConfigManager.Sample = true;

// Save option to config
const _ConfigManager_makeData = ConfigManager.makeData;
ConfigManager.makeData = function() {
    const config = _ConfigManager_makeData.call(this);
    config.Sample = this.Sample;
    return config;
};

// Load option from config
const _ConfigManager_applyData = ConfigManager.applyData;
ConfigManager.applyData = function(config) {
    _ConfigManager_applyData.call(this, config);
    this.Sample = this.readFlag(config, "Sample", true);
};

// Add option to options window
const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
Window_Options.prototype.addGeneralOptions = function() {
    _Window_Options_addGeneralOptions.call(this);
    this.addCommand("Sample", "Sample");
};

// Boolean type uses default behavior - no additional code needed
// Access the value with: ConfigManager.Sample

// ==== case: type-violating: optionType="volume",defaultValue=42 {"optionType":"volume","persistToConfig":true,"optionName":"Sample","optionSymbol":"Sample","defaultValue":42}
// rejects: Field "Default Value" must be text
// Options Menu Addition: Sample

// Add to ConfigManager
ConfigManager.Sample = 42;

// Save option to config
const _ConfigManager_makeData = ConfigManager.makeData;
ConfigManager.makeData = function() {
    const config = _ConfigManager_makeData.call(this);
    config.Sample = this.Sample;
    return config;
};

// Load option from config
const _ConfigManager_applyData = ConfigManager.applyData;
ConfigManager.applyData = function(config) {
    _ConfigManager_applyData.call(this, config);
    this.Sample = this.readVolume(config, "Sample");
};

// Add option to options window
const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
Window_Options.prototype.addGeneralOptions = function() {
    _Window_Options_addGeneralOptions.call(this);
    this.addCommand("Sample", "Sample");
};

// Volume type uses default behavior - no additional code needed
// Access the value with: ConfigManager.Sample (0-100)

// Mark as volume type
const _Window_Options_isVolumeSymbol = Window_Options.prototype.isVolumeSymbol;
Window_Options.prototype.isVolumeSymbol = function(symbol) {
    if (symbol === "Sample") return true;
    return _Window_Options_isVolumeSymbol.call(this, symbol);
};

// ==== case: type-violating: optionType="volume",defaultValue="50",persistToConfig=null {"optionType":"volume","persistToConfig":null,"optionName":"Sample","optionSymbol":"Sample","defaultValue":"50"}
// Options Menu Addition: Sample

// Add to ConfigManager
ConfigManager.Sample = 50;

// Save option to config
const _ConfigManager_makeData = ConfigManager.makeData;
ConfigManager.makeData = function() {
    const config = _ConfigManager_makeData.call(this);
    config.Sample = this.Sample;
    return config;
};

// Load option from config
const _ConfigManager_applyData = ConfigManager.applyData;
ConfigManager.applyData = function(config) {
    _ConfigManager_applyData.call(this, config);
    this.Sample = this.readVolume(config, "Sample");
};

// Add option to options window
const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
Window_Options.prototype.addGeneralOptions = function() {
    _Window_Options_addGeneralOptions.call(this);
    this.addCommand("Sample", "Sample");
};

// Volume type uses default behavior - no additional code needed
// Access the value with: ConfigManager.Sample (0-100)

// Mark as volume type
const _Window_Options_isVolumeSymbol = Window_Options.prototype.isVolumeSymbol;
Window_Options.prototype.isVolumeSymbol = function(symbol) {
    if (symbol === "Sample") return true;
    return _Window_Options_isVolumeSymbol.call(this, symbol);
};

// ==== case: type-violating: optionType="select",defaultValue=42,choices=null {"optionType":"select","persistToConfig":true,"optionName":"Sample","optionSymbol":"Sample","defaultValue":42,"choices":null}
// rejects: Field "Default Value" must be text
// Options Menu Addition: Sample

// Add to ConfigManager
ConfigManager.Sample = 42;

// Save option to config
const _ConfigManager_makeData = ConfigManager.makeData;
ConfigManager.makeData = function() {
    const config = _ConfigManager_makeData.call(this);
    config.Sample = this.Sample;
    return config;
};

// Load option from config
const _ConfigManager_applyData = ConfigManager.applyData;
ConfigManager.applyData = function(config) {
    _ConfigManager_applyData.call(this, config);
    this.Sample = config.Sample !== undefined ? config.Sample : 42;
};

// Add option to options window
const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
Window_Options.prototype.addGeneralOptions = function() {
    _Window_Options_addGeneralOptions.call(this);
    this.addCommand("Sample", "Sample");
};

// Status text for select option
const _Window_Options_statusText = Window_Options.prototype.statusText;
Window_Options.prototype.statusText = function(index) {
    const symbol = this.commandSymbol(index);
    if (symbol === "Sample") {
        const choices = ["Option 1", "Option 2", "Option 3"];
        return choices[this.getConfigValue(symbol)] || choices[0];
    }
    return _Window_Options_statusText.call(this, index);
};

// Process select option changes
const _Window_Options_processOk = Window_Options.prototype.processOk;
Window_Options.prototype.processOk = function() {
    const symbol = this.commandSymbol(this.index());
    if (symbol === "Sample") {
        const choices = ["Option 1", "Option 2", "Option 3"];
        let value = this.getConfigValue(symbol);
        value = (value + 1) % choices.length;
        this.changeValue(symbol, value);
        return;
    }
    _Window_Options_processOk.call(this);
};

// Handle cursor right/left for select option
const _Window_Options_cursorRight = Window_Options.prototype.cursorRight;
Window_Options.prototype.cursorRight = function() {
    const symbol = this.commandSymbol(this.index());
    if (symbol === "Sample") {
        const choices = ["Option 1", "Option 2", "Option 3"];
        let value = this.getConfigValue(symbol);
        value = Math.min(value + 1, choices.length - 1);
        this.changeValue(symbol, value);
        return;
    }
    _Window_Options_cursorRight.call(this);
};

const _Window_Options_cursorLeft = Window_Options.prototype.cursorLeft;
Window_Options.prototype.cursorLeft = function() {
    const symbol = this.commandSymbol(this.index());
    if (symbol === "Sample") {
        let value = this.getConfigValue(symbol);
        value = Math.max(value - 1, 0);
        this.changeValue(symbol, value);
        return;
    }
    _Window_Options_cursorLeft.call(this);
};

// Access the value with: ConfigManager.Sample (index 0-2)
// Choices: Option 1, Option 2, Option 3

// ==== case: type-violating: optionType="select",choices="Low, High",persistToConfig=null {"optionType":"select","persistToConfig":null,"optionName":"Sample","optionSymbol":"Sample","choices":"Low, High"}
// Options Menu Addition: Sample

// Add to ConfigManager
ConfigManager.Sample = 0;

// Save option to config
const _ConfigManager_makeData = ConfigManager.makeData;
ConfigManager.makeData = function() {
    const config = _ConfigManager_makeData.call(this);
    config.Sample = this.Sample;
    return config;
};

// Load option from config
const _ConfigManager_applyData = ConfigManager.applyData;
ConfigManager.applyData = function(config) {
    _ConfigManager_applyData.call(this, config);
    this.Sample = config.Sample !== undefined ? config.Sample : 0;
};

// Add option to options window
const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
Window_Options.prototype.addGeneralOptions = function() {
    _Window_Options_addGeneralOptions.call(this);
    this.addCommand("Sample", "Sample");
};

// Status text for select option
const _Window_Options_statusText = Window_Options.prototype.statusText;
Window_Options.prototype.statusText = function(index) {
    const symbol = this.commandSymbol(index);
    if (symbol === "Sample") {
        const choices = ["Low", "High"];
        return choices[this.getConfigValue(symbol)] || choices[0];
    }
    return _Window_Options_statusText.call(this, index);
};

// Process select option changes
const _Window_Options_processOk = Window_Options.prototype.processOk;
Window_Options.prototype.processOk = function() {
    const symbol = this.commandSymbol(this.index());
    if (symbol === "Sample") {
        const choices = ["Low", "High"];
        let value = this.getConfigValue(symbol);
        value = (value + 1) % choices.length;
        this.changeValue(symbol, value);
        return;
    }
    _Window_Options_processOk.call(this);
};

// Handle cursor right/left for select option
const _Window_Options_cursorRight = Window_Options.prototype.cursorRight;
Window_Options.prototype.cursorRight = function() {
    const symbol = this.commandSymbol(this.index());
    if (symbol === "Sample") {
        const choices = ["Low", "High"];
        let value = this.getConfigValue(symbol);
        value = Math.min(value + 1, choices.length - 1);
        this.changeValue(symbol, value);
        return;
    }
    _Window_Options_cursorRight.call(this);
};

const _Window_Options_cursorLeft = Window_Options.prototype.cursorLeft;
Window_Options.prototype.cursorLeft = function() {
    const symbol = this.commandSymbol(this.index());
    if (symbol === "Sample") {
        let value = this.getConfigValue(symbol);
        value = Math.max(value - 1, 0);
        this.changeValue(symbol, value);
        return;
    }
    _Window_Options_cursorLeft.call(this);
};

// Access the value with: ConfigManager.Sample (index 0-1)
// Choices: Low, High

// ==== case: type-violating: optionType="select",choices=42 {"optionType":"select","persistToConfig":true,"optionName":"Sample","optionSymbol":"Sample","choices":42}
// rejects: Field "Choices (comma-separated)" must be text
// throws: TypeError

// ==== case: type-violating: optionType="slider",defaultValue=null {"optionType":"slider","persistToConfig":true,"optionName":"Sample","optionSymbol":"Sample","defaultValue":null}
// rejects: Field "Option Type" must be one of its choices
// Options Menu Addition: Sample

// Add to ConfigManager
ConfigManager.Sample = true;

// Save option to config
const _ConfigManager_makeData = ConfigManager.makeData;
ConfigManager.makeData = function() {
    const config = _ConfigManager_makeData.call(this);
    config.Sample = this.Sample;
    return config;
};

// Load option from config
const _ConfigManager_applyData = ConfigManager.applyData;
ConfigManager.applyData = function(config) {
    _ConfigManager_applyData.call(this, config);
};

// Add option to options window
const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
Window_Options.prototype.addGeneralOptions = function() {
    _Window_Options_addGeneralOptions.call(this);
    this.addCommand("Sample", "Sample");
};

