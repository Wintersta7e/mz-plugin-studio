// ==== case: type-violating: wrong types {"modType":7,"commandName":42,"commandSymbol":42,"hideTarget":7}


// ==== case: type-violating: null {"modType":null,"commandName":null,"commandSymbol":null,"hideTarget":null}
// Title Screen Mod: Add "Custom" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Custom", "custom");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("custom", this.commandcustom.bind(this));
};

Scene_Title.prototype.commandcustom = function() {
    // Your code here when "Custom" is selected
    console.log("Custom command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: type-violating: arrays {"modType":["a","b"],"commandName":["a","b"],"commandSymbol":["a","b"],"hideTarget":["a","b"]}

