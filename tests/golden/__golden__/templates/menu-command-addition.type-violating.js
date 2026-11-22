// ==== case: type-violating: wrong types {"commandName":42,"commandSymbol":42,"insertPosition":7,"requiresActor":"yes","enableCondition":7,"switchId":"abc"}
// rejects: Field "Command Name" must be text | Field "Command Symbol" must be text | Field "Insert Position" must be text | Field "Requires Actor Selection" must be true or false | Field "Enable Condition" must be text | Field "Switch ID" must be a number
// throws: TypeError

// ==== case: type-violating: null {"commandName":null,"commandSymbol":null,"insertPosition":null,"requiresActor":null,"enableCondition":null,"switchId":null}
// rejects: Field "Command Name" is required | Field "Command Symbol" is required
// throws: TypeError

// ==== case: type-violating: arrays {"commandName":["a","b"],"commandSymbol":["a","b"],"insertPosition":["a","b"],"requiresActor":["a","b"],"enableCondition":["a","b"],"switchId":["a","b"]}
// rejects: Field "Command Name" must be text | Field "Command Symbol" must be text | Field "Insert Position" must be text | Field "Requires Actor Selection" must be true or false | Field "Enable Condition" must be text | Field "Switch ID" must be a number
// throws: TypeError

// ==== case: type-violating: null where not required {"commandName":"Sample","commandSymbol":"Sample","insertPosition":null,"requiresActor":null,"enableCondition":null,"switchId":null}
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

// ==== case: type-violating: unlisted choices {"commandName":"Sample","commandSymbol":"Sample","insertPosition":"unlisted","requiresActor":false,"enableCondition":"unlisted"}
// rejects: Field "Insert Position" must be one of its choices | Field "Enable Condition" must be one of its choices
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

// ==== case: type-violating: empty text {"commandName":"","commandSymbol":"","insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"always"}
// rejects: Field "Command Name" is required | Field "Command Symbol" is required
// Menu Command Addition: 

// Add command to main menu
const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand("", "", this.isEnabled());
};

// Enable condition for 
Window_MenuCommand.prototype.isEnabled = function() {
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
    this._commandWindow.setHandler("", this.command.bind(this));
};

Scene_Menu.prototype.command = function() {
    // Your code here when "" is selected
    console.log(" command selected");
    
    // Example: Push a custom scene
    // SceneManager.push(Scene_);
    this._commandWindow.activate();
};

// ==== case: type-violating: required fields only {"commandName":"Sample","commandSymbol":"Sample"}
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

// ==== case: type-violating: enableCondition="switch",switchId=null {"insertPosition":"beforeOptions","requiresActor":false,"enableCondition":"switch","commandName":"Sample","commandSymbol":"Sample","switchId":null}
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

// ==== case: type-violating: requiresActor="yes",enableCondition="switch",switchId="abc" {"insertPosition":"beforeOptions","requiresActor":"yes","enableCondition":"switch","commandName":"Sample","commandSymbol":"Sample","switchId":"abc"}
// rejects: Field "Requires Actor Selection" must be true or false | Field "Switch ID" must be a number
// throws: TypeError

// ==== case: type-violating: insertPosition="afterItem",enableCondition="custom",switchId=null {"insertPosition":"afterItem","requiresActor":false,"enableCondition":"custom","commandName":"Sample","commandSymbol":"Sample","switchId":null}
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

// ==== case: type-violating: insertPosition="afterSkill",switchId=null {"insertPosition":"afterSkill","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample","switchId":null}
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

// ==== case: type-violating: insertPosition="afterEquip",switchId=null {"insertPosition":"afterEquip","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample","switchId":null}
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

// ==== case: type-violating: insertPosition="afterStatus",switchId=null {"insertPosition":"afterStatus","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample","switchId":null}
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

// ==== case: type-violating: insertPosition="beforeSave",switchId=null {"insertPosition":"beforeSave","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample","switchId":null}
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

// ==== case: type-violating: insertPosition="beforeGameEnd",switchId=null {"insertPosition":"beforeGameEnd","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample","switchId":null}
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

// ==== case: type-violating: insertPosition="end",switchId=null {"insertPosition":"end","requiresActor":false,"enableCondition":"always","commandName":"Sample","commandSymbol":"Sample","switchId":null}
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
