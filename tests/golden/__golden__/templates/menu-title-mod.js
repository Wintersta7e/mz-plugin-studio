// ==== case: base {"modType":"addCommand","commandName":"Extra","commandSymbol":"extra"}
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: modType=addCommand {"modType":"addCommand","commandName":"Extra","commandSymbol":"extra"}
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: modType=replaceBackground {"modType":"replaceBackground","commandName":"Extra","commandSymbol":"extra"}
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

// ==== case: modType=hideCommand {"modType":"hideCommand","commandName":"Extra","commandSymbol":"extra"}
// Title Screen Mod: Hide "Options" Command

const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    // Manually add commands, skipping Options
    this.addCommand(TextManager.newGame, 'newGame');
    this.addCommand(TextManager.continue_, 'continue', this.isContinueEnabled());
    // Options command removed
};

// ==== case: modType=customCreate {"modType":"customCreate","commandName":"Extra","commandSymbol":"extra"}
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

// ==== case: commandName=empty {"modType":"addCommand","commandName":"","commandSymbol":"extra"}
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

// ==== case: commandSymbol=empty {"modType":"addCommand","commandName":"Extra","commandSymbol":""}
// rejects: Command symbol is required
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "custom");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("custom", this.commandcustom.bind(this));
};

Scene_Title.prototype.commandcustom = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: hideTarget=newGame {"modType":"addCommand","commandName":"Extra","commandSymbol":"extra","hideTarget":"newGame"}
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: hideTarget=continue {"modType":"addCommand","commandName":"Extra","commandSymbol":"extra","hideTarget":"continue"}
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: hideTarget=options {"modType":"addCommand","commandName":"Extra","commandSymbol":"extra","hideTarget":"options"}
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandName=comment-space {"modType":"addCommand","commandName":"X */ globalThis.__pwn = 1; /* Y","commandSymbol":"extra"}
// Title Screen Mod: Add "X */ globalThis.__pwn = 1; /* Y" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("X */ globalThis.__pwn = 1; /* Y", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "X */ globalThis.__pwn = 1; /* Y" is selected
    console.log("X */ globalThis.__pwn = 1; /* Y command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandName=comment-u2028 {"modType":"addCommand","commandName":"X */\u2028globalThis.__pwn = 1; /* Y","commandSymbol":"extra"}
// Title Screen Mod: Add "X */ globalThis.__pwn = 1; /* Y" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("X */ globalThis.__pwn = 1; /* Y", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "X */ globalThis.__pwn = 1; /* Y" is selected
    console.log("X */ globalThis.__pwn = 1; /* Y command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandName=comment-u2029 {"modType":"addCommand","commandName":"X */\u2029globalThis.__pwn = 1; /* Y","commandSymbol":"extra"}
// Title Screen Mod: Add "X */ globalThis.__pwn = 1; /* Y" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("X */ globalThis.__pwn = 1; /* Y", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "X */ globalThis.__pwn = 1; /* Y" is selected
    console.log("X */ globalThis.__pwn = 1; /* Y command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandName=comment-lf {"modType":"addCommand","commandName":"X */\nglobalThis.__pwn = 1; /* Y","commandSymbol":"extra"}
// Title Screen Mod: Add "X */
globalThis.__pwn = 1; /* Y" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("X */\nglobalThis.__pwn = 1; /* Y", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "X */\nglobalThis.__pwn = 1; /* Y" is selected
    console.log("X */\nglobalThis.__pwn = 1; /* Y command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandName=quote-single {"modType":"addCommand","commandName":"X' + (globalThis.__pwn = 1) + 'Y","commandSymbol":"extra"}
// Title Screen Mod: Add "X' + (globalThis.__pwn = 1) + 'Y" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("X' + (globalThis.__pwn = 1) + 'Y", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "X' + (globalThis.__pwn = 1) + 'Y" is selected
    console.log("X' + (globalThis.__pwn = 1) + 'Y command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandName=quote-double {"modType":"addCommand","commandName":"X\" + (globalThis.__pwn = 1) + \"Y","commandSymbol":"extra"}
// Title Screen Mod: Add "X" + (globalThis.__pwn = 1) + "Y" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("X\" + (globalThis.__pwn = 1) + \"Y", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "X\" + (globalThis.__pwn = 1) + \"Y" is selected
    console.log("X\" + (globalThis.__pwn = 1) + \"Y command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandName=quote-backtick {"modType":"addCommand","commandName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","commandSymbol":"extra"}
// Title Screen Mod: Add "X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y", "extra");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("extra", this.commandextra.bind(this));
};

Scene_Title.prototype.commandextra = function() {
    // Your code here when "X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y" is selected
    console.log("X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandSymbol=comment-space {"modType":"addCommand","commandName":"Extra","commandSymbol":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "X */ globalThis.__pwn = 1; /* Y");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("X */ globalThis.__pwn = 1; /* Y", this.commandXglobalThis__pwn1Y.bind(this));
};

Scene_Title.prototype.commandXglobalThis__pwn1Y = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandSymbol=comment-u2028 {"modType":"addCommand","commandName":"Extra","commandSymbol":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "X */ globalThis.__pwn = 1; /* Y");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("X */ globalThis.__pwn = 1; /* Y", this.commandXglobalThis__pwn1Y.bind(this));
};

Scene_Title.prototype.commandXglobalThis__pwn1Y = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandSymbol=comment-u2029 {"modType":"addCommand","commandName":"Extra","commandSymbol":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "X */ globalThis.__pwn = 1; /* Y");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("X */ globalThis.__pwn = 1; /* Y", this.commandXglobalThis__pwn1Y.bind(this));
};

Scene_Title.prototype.commandXglobalThis__pwn1Y = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandSymbol=comment-lf {"modType":"addCommand","commandName":"Extra","commandSymbol":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "X */\nglobalThis.__pwn = 1; /* Y");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("X */\nglobalThis.__pwn = 1; /* Y", this.commandXglobalThis__pwn1Y.bind(this));
};

Scene_Title.prototype.commandXglobalThis__pwn1Y = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandSymbol=quote-single {"modType":"addCommand","commandName":"Extra","commandSymbol":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "X' + (globalThis.__pwn = 1) + 'Y");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("X' + (globalThis.__pwn = 1) + 'Y", this.commandXglobalThis__pwn1Y.bind(this));
};

Scene_Title.prototype.commandXglobalThis__pwn1Y = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandSymbol=quote-double {"modType":"addCommand","commandName":"Extra","commandSymbol":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "X\" + (globalThis.__pwn = 1) + \"Y");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("X\" + (globalThis.__pwn = 1) + \"Y", this.commandXglobalThis__pwn1Y.bind(this));
};

Scene_Title.prototype.commandXglobalThis__pwn1Y = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};

// ==== case: commandSymbol=quote-backtick {"modType":"addCommand","commandName":"Extra","commandSymbol":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Title Screen Mod: Add "Extra" Command

// Add command to title command window
const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _Window_TitleCommand_makeCommandList.call(this);
    this.addCommand("Extra", "X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y");
};

// Create handler for the new command
const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y", this.commandXglobalThis__pwn1globalThis__pwn1Y.bind(this));
};

Scene_Title.prototype.commandXglobalThis__pwn1globalThis__pwn1Y = function() {
    // Your code here when "Extra" is selected
    console.log("Extra command selected");
    this._commandWindow.activate();
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Custom);
};
