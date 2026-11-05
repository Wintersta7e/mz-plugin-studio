// ==== case: type-violating: wrong types {"modType":7,"commandName":42,"commandSymbol":42,"hideTarget":7}
// rejects: Field "Modification Type" must be text | Field "Command Name" must be text | Field "Command Symbol" must be text | Field "Command to Hide" must be text


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
// rejects: Field "Modification Type" must be text | Field "Command Name" must be text | Field "Command Symbol" must be text | Field "Command to Hide" must be text


// ==== case: type-violating: modType="hideCommand",hideTarget=7 {"modType":"hideCommand","commandName":"Extra","commandSymbol":"extra","hideTarget":7}
// rejects: Field "Command to Hide" must be text
// Title Screen Mod: Hide "Options" Command

// Override visibility check for Options
Window_TitleCommand.prototype.isOptionsVisible = function() {
    return false;
};

// ==== case: type-violating: commandName=null {"modType":"addCommand","commandName":null,"commandSymbol":"extra"}
// rejects: Command name is required
// Title Screen Mod: Add "Custom" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Custom", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "Custom" is selected
    console.log("Custom command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: type-violating: modType="replaceBackground",commandName=null {"modType":"replaceBackground","commandName":null,"commandSymbol":"extra"}
// Title Screen Mod: Custom Background Handler

const _Scene_Title_createBackground = Scene_Title.prototype.createBackground;
Scene_Title.prototype.createBackground = function() {
    _Scene_Title_createBackground.call(this);
    
    // Add custom background elements here
    // Example: Create an additional sprite layer
    // this._customSprite = new Sprite();
    // this._customSprite.bitmap = ImageManager.loadTitle1('CustomBackground');
    // this.addChild(this._customSprite);
};

// Optionally animate or update the background
const _Scene_Title_update = Scene_Title.prototype.update;
Scene_Title.prototype.update = function() {
    _Scene_Title_update.call(this);
    
    // Update custom background elements
    // if (this._customSprite) {
    //     this._customSprite.opacity = 128 + Math.sin(Graphics.frameCount / 30) * 127;
    // }
};

// ==== case: type-violating: modType="hideCommand",hideTarget="newGame",commandName=null {"modType":"hideCommand","commandName":null,"commandSymbol":"extra","hideTarget":"newGame"}
// Title Screen Mod: Hide "New Game" Command

// Override visibility check for New Game
Window_TitleCommand.prototype.isNewGameVisible = function() {
    return false;
};

// ==== case: type-violating: modType="hideCommand",hideTarget="continue",commandName=null {"modType":"hideCommand","commandName":null,"commandSymbol":"extra","hideTarget":"continue"}
// Title Screen Mod: Hide "Continue" Command

// Override visibility check for Continue
Window_TitleCommand.prototype.isContinueVisible = function() {
    return false;
};

// ==== case: type-violating: modType="customCreate",commandName=null {"modType":"customCreate","commandName":null,"commandSymbol":"extra"}
// Title Screen Mod: Custom Create Hook

const _Scene_Title_create = Scene_Title.prototype.create;
Scene_Title.prototype.create = function() {
    _Scene_Title_create.call(this);
    
    // Add custom elements after scene creation
    this.createCustomElements();
};

Scene_Title.prototype.createCustomElements = function() {
    // Create custom UI elements here
    
    // Example: Create a version text sprite
    this._versionSprite = new Sprite();
    this._versionSprite.bitmap = new Bitmap(200, 30);
    this._versionSprite.bitmap.drawText('v1.0.0', 0, 0, 200, 30, 'right');
    this._versionSprite.x = Graphics.width - 210;
    this._versionSprite.y = Graphics.height - 40;
    this.addChild(this._versionSprite);
};

// ==== case: type-violating: modType="hideCommand",hideTarget=null {"modType":"hideCommand","commandName":"Extra","commandSymbol":"extra","hideTarget":null}
// Title Screen Mod: Hide "Options" Command

const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    // Manually add commands, skipping Options
    this.addCommand(TextManager.newGame, 'newGame');
    this.addCommand(TextManager.continue_, 'continue', this.isContinueEnabled());
    // Options command removed
};
