// ==== case: base {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample"}
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: insertPosition=afterItem {"insertPosition":"afterItem","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample"}
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: insertPosition=afterSkill {"insertPosition":"afterSkill","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample"}
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: insertPosition=afterEquip {"insertPosition":"afterEquip","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample"}
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: insertPosition=afterStatus {"insertPosition":"afterStatus","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample"}
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: insertPosition=beforeOptions {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample"}
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: insertPosition=beforeSave {"insertPosition":"beforeSave","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample"}
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "save" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "save");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: insertPosition=beforeGameEnd {"insertPosition":"beforeGameEnd","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample"}
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "gameEnd" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "gameEnd");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: insertPosition=end {"insertPosition":"end","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample"}
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: requiresActor=true {"insertPosition":"beforeOptions","requiresActor":true,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample"}
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // This command requires actor selection
    this._statusWindow.setFormationMode(false);
    this._statusWindow.selectLast();
    this._statusWindow.activate();
    this._statusWindow.setHandler("ok", this.onSampleOk.bind(this));
    this._statusWindow.setHandler("cancel", this.onSampleCancel.bind(this));
};

Scene_Menu.prototype.onSampleOk = function() {
    const actor = $gameParty.members()[this._statusWindow.index()];
    // Your code here with the selected actor
    console.log("Sample - selected actor:", actor.name());
    
    // Example: Push scene with actor data
    // SceneManager.push(Scene_Sample);
    this._statusWindow.activate();
};

Scene_Menu.prototype.onSampleCancel = function() {
    this._statusWindow.deselect();
    this._commandWindow.activate();
};

// ==== case: enableCondition=always {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample"}
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: enableCondition=switch {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"switch","commandName":"Sample","commandSymbol":"Sample"}
// rejects: Switch ID must be a positive number
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return $gameSwitches.value(1);
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: enableCondition=custom {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"custom","commandName":"Sample","commandSymbol":"Sample"}
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "Sample", this.isSampleEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isSampleEnabled = function() {
    // Add your custom condition here
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: commandName=comment-space {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"X */ globalThis.__pwn = 1; /* Y","commandSymbol":"Sample"}
// Menu Command Addition: X */ globalThis.__pwn = 1; /* Y

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("X */ globalThis.__pwn = 1; /* Y", "Sample", this.isSampleEnabled());
};

// Enable condition for X */ globalThis.__pwn = 1; /* Y
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "X */ globalThis.__pwn = 1; /* Y" is selected
    console.log("X */ globalThis.__pwn = 1; /* Y command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: commandName=comment-u2028 {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"X */\u2028globalThis.__pwn = 1; /* Y","commandSymbol":"Sample"}
// Menu Command Addition: X */ globalThis.__pwn = 1; /* Y

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("X */\u2028globalThis.__pwn = 1; /* Y", "Sample", this.isSampleEnabled());
};

// Enable condition for X */ globalThis.__pwn = 1; /* Y
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "X */\u2028globalThis.__pwn = 1; /* Y" is selected
    console.log("X */\u2028globalThis.__pwn = 1; /* Y command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: commandName=comment-u2029 {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"X */\u2029globalThis.__pwn = 1; /* Y","commandSymbol":"Sample"}
// Menu Command Addition: X */ globalThis.__pwn = 1; /* Y

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("X */\u2029globalThis.__pwn = 1; /* Y", "Sample", this.isSampleEnabled());
};

// Enable condition for X */ globalThis.__pwn = 1; /* Y
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "X */\u2029globalThis.__pwn = 1; /* Y" is selected
    console.log("X */\u2029globalThis.__pwn = 1; /* Y command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: commandName=comment-lf {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"X */\nglobalThis.__pwn = 1; /* Y","commandSymbol":"Sample"}
// Menu Command Addition: X */
globalThis.__pwn = 1; /* Y

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("X */\nglobalThis.__pwn = 1; /* Y", "Sample", this.isSampleEnabled());
};

// Enable condition for X */
globalThis.__pwn = 1; /* Y
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "X */\nglobalThis.__pwn = 1; /* Y" is selected
    console.log("X */\nglobalThis.__pwn = 1; /* Y command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: commandName=quote-single {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"X' + (globalThis.__pwn = 1) + 'Y","commandSymbol":"Sample"}
// Menu Command Addition: X' + (globalThis.__pwn = 1) + 'Y

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("X' + (globalThis.__pwn = 1) + 'Y", "Sample", this.isSampleEnabled());
};

// Enable condition for X' + (globalThis.__pwn = 1) + 'Y
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "X' + (globalThis.__pwn = 1) + 'Y" is selected
    console.log("X' + (globalThis.__pwn = 1) + 'Y command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: commandName=quote-double {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"X\" + (globalThis.__pwn = 1) + \"Y","commandSymbol":"Sample"}
// Menu Command Addition: X" + (globalThis.__pwn = 1) + "Y

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("X\" + (globalThis.__pwn = 1) + \"Y", "Sample", this.isSampleEnabled());
};

// Enable condition for X" + (globalThis.__pwn = 1) + "Y
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "X\" + (globalThis.__pwn = 1) + \"Y" is selected
    console.log("X\" + (globalThis.__pwn = 1) + \"Y command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: commandName=quote-backtick {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","commandSymbol":"Sample"}
// Menu Command Addition: X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y", "Sample", this.isSampleEnabled());
};

// Enable condition for X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y
Window_MenuCommand.prototype.isSampleEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("Sample", this.commandSample.bind(this));
};

Scene_Menu.prototype.commandSample = function() {
    // Your code here when "X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y" is selected
    console.log("X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_Sample);
    this._commandWindow.activate();
};

// ==== case: commandSymbol=comment-space {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "X */ globalThis.__pwn = 1; /* Y", this.isXglobalThis__pwn1YEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isXglobalThis__pwn1YEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("X */ globalThis.__pwn = 1; /* Y", this.commandXglobalThis__pwn1Y.bind(this));
};

Scene_Menu.prototype.commandXglobalThis__pwn1Y = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_XglobalThis__pwn1Y);
    this._commandWindow.activate();
};

// ==== case: commandSymbol=comment-u2028 {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "X */\u2028globalThis.__pwn = 1; /* Y", this.isXglobalThis__pwn1YEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isXglobalThis__pwn1YEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("X */\u2028globalThis.__pwn = 1; /* Y", this.commandXglobalThis__pwn1Y.bind(this));
};

Scene_Menu.prototype.commandXglobalThis__pwn1Y = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_XglobalThis__pwn1Y);
    this._commandWindow.activate();
};

// ==== case: commandSymbol=comment-u2029 {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "X */\u2029globalThis.__pwn = 1; /* Y", this.isXglobalThis__pwn1YEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isXglobalThis__pwn1YEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("X */\u2029globalThis.__pwn = 1; /* Y", this.commandXglobalThis__pwn1Y.bind(this));
};

Scene_Menu.prototype.commandXglobalThis__pwn1Y = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_XglobalThis__pwn1Y);
    this._commandWindow.activate();
};

// ==== case: commandSymbol=comment-lf {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "X */\nglobalThis.__pwn = 1; /* Y", this.isXglobalThis__pwn1YEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isXglobalThis__pwn1YEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("X */\nglobalThis.__pwn = 1; /* Y", this.commandXglobalThis__pwn1Y.bind(this));
};

Scene_Menu.prototype.commandXglobalThis__pwn1Y = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_XglobalThis__pwn1Y);
    this._commandWindow.activate();
};

// ==== case: commandSymbol=quote-single {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "X' + (globalThis.__pwn = 1) + 'Y", this.isXglobalThis__pwn1YEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isXglobalThis__pwn1YEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("X' + (globalThis.__pwn = 1) + 'Y", this.commandXglobalThis__pwn1Y.bind(this));
};

Scene_Menu.prototype.commandXglobalThis__pwn1Y = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_XglobalThis__pwn1Y);
    this._commandWindow.activate();
};

// ==== case: commandSymbol=quote-double {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "X\" + (globalThis.__pwn = 1) + \"Y", this.isXglobalThis__pwn1YEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isXglobalThis__pwn1YEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("X\" + (globalThis.__pwn = 1) + \"Y", this.commandXglobalThis__pwn1Y.bind(this));
};

Scene_Menu.prototype.commandXglobalThis__pwn1Y = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_XglobalThis__pwn1Y);
    this._commandWindow.activate();
};

// ==== case: commandSymbol=quote-backtick {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Command symbol must be a valid JavaScript identifier
// Menu Command Addition: Sample

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("Sample", "X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y", this.isXglobalThis__pwn1globalThis__pwn1YEnabled());
};

// Enable condition for Sample
Window_MenuCommand.prototype.isXglobalThis__pwn1globalThis__pwn1YEnabled = function() {
    return true;
};

// Override makeCommandList to control command position
const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
Window_MenuCommand.prototype.makeCommandList = function() {
    _Window_MenuCommand_makeCommandList.call(this);
    
    // Find index of "options" and insert before it
    const index = this._list.findIndex(cmd => cmd.symbol === "options");
    if (index >= 0) {
        const cmd = this._list.pop(); // Remove the command we just added
        this._list.splice(index, 0, cmd); // Insert at correct position
    }
};

// Create handler for the command
const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler("X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y", this.commandXglobalThis__pwn1globalThis__pwn1Y.bind(this));
};

Scene_Menu.prototype.commandXglobalThis__pwn1globalThis__pwn1Y = function() {
    // Your code here when "Sample" is selected
    console.log("Sample command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_XglobalThis__pwn1globalThis__pwn1Y);
    this._commandWindow.activate();
};
