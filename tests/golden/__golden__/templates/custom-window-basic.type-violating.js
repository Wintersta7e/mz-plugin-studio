// ==== case: type-violating: wrong types {"windowName":42,"parentClass":7,"width":"abc","height":"abc","addToScene":7}
// rejects: Field "Window Name" must be text | Field "Parent Class" must be text | Field "Width" must be a number | Field "Height" must be a number | Field "Add to Scene" must be text
// throws: TypeError

// ==== case: type-violating: null {"windowName":null,"parentClass":null,"width":null,"height":null,"addToScene":null}
// rejects: Width must be a positive number | Height must be a positive number
// throws: TypeError

// ==== case: type-violating: arrays {"windowName":["a","b"],"parentClass":["a","b"],"width":["a","b"],"height":["a","b"],"addToScene":["a","b"]}
// rejects: Field "Window Name" must be text | Field "Parent Class" must be text | Field "Width" must be a number | Field "Height" must be a number | Field "Add to Scene" must be text
// throws: TypeError

// ==== case: type-violating: width=null {"parentClass":"Window_Base","width":null,"height":200,"addToScene":"none","windowName":"Sample"}
// rejects: Width must be a positive number
//-----------------------------------------------------------------------------
// Window_Sample
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    // Draw your content here
    this.drawText('Content', 0, 0, this.contentsWidth());
};

// ==== case: type-violating: parentClass=7,width="abc",height=null,addToScene="Scene_Map" {"parentClass":7,"width":"abc","height":null,"addToScene":"Scene_Map","windowName":"Sample"}
// rejects: Field "Parent Class" must be text | Field "Width" must be a number
//-----------------------------------------------------------------------------
// Window_Sample
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(7.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    7.prototype.initialize.call(this, rect);
    this.refresh();
};

// Add to Scene_Map
const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(0, 0, abc, 200);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: type-violating: parentClass="Window_Command",width=["a","b"],addToScene="Scene_Menu" {"parentClass":"Window_Command","width":["a","b"],"height":200,"addToScene":"Scene_Menu","windowName":"Sample"}
// rejects: Field "Width" must be a number
//-----------------------------------------------------------------------------
// Window_Sample
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Command.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Command.prototype.initialize.call(this, rect);
    // Commands are created in makeCommandList
};

Window_Sample.prototype.makeCommandList = function() {
    this.addCommand('Command 1', 'command1');
    this.addCommand('Command 2', 'command2');
    this.addCommand('Command 3', 'command3');
};
// Add to Scene_Menu
const _Scene_Menu_createAllWindows = Scene_Menu.prototype.createAllWindows;
Scene_Menu.prototype.createAllWindows = function() {
    _Scene_Menu_createAllWindows.call(this);
    this.createSampleWindow();
};

Scene_Menu.prototype.createSampleWindow = function() {
    const rect = new Rectangle(0, 0, a,b, 200);
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('command1', this.onCommand1.bind(this));
    this._sampleWindow.setHandler('command2', this.onCommand2.bind(this));
    this._sampleWindow.setHandler('command3', this.onCommand3.bind(this));
    this.addWindow(this._sampleWindow);
};

Scene_Menu.prototype.onCommand1 = function() {
    // Handle command 1
    this._sampleWindow.activate();
};

Scene_Menu.prototype.onCommand2 = function() {
    // Handle command 2
    this._sampleWindow.activate();
};

Scene_Menu.prototype.onCommand3 = function() {
    // Handle command 3
    this._sampleWindow.activate();
};
