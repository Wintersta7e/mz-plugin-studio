// ==== case: base {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"none","windowName":"Sample"}
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

// ==== case: parentClass=Window_Base {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"none","windowName":"Sample"}
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

// ==== case: parentClass=Window_Selectable {"parentClass":"Window_Selectable","width":300,"height":200,"addToScene":"none","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Selectable.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this._data = [];
    this.refresh();
    this.select(0);
};

Window_Sample.prototype.maxItems = function() {
    return this._data ? this._data.length : 0;
};

Window_Sample.prototype.item = function() {
    return this.itemAt(this.index());
};

Window_Sample.prototype.itemAt = function(index) {
    return this._data && index >= 0 ? this._data[index] : null;
};

Window_Sample.prototype.makeItemList = function() {
    // Populate this._data with your items
    this._data = ['Item 1', 'Item 2', 'Item 3'];
};

Window_Sample.prototype.refresh = function() {
    this.makeItemList();
    Window_Selectable.prototype.refresh.call(this);
};

Window_Sample.prototype.drawItem = function(index) {
    const item = this.itemAt(index);
    if (item) {
        const rect = this.itemLineRect(index);
        this.drawText(item, rect.x, rect.y, rect.width);
    }
};

// ==== case: parentClass=Window_Command {"parentClass":"Window_Command","width":300,"height":200,"addToScene":"none","windowName":"Sample"}
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

// ==== case: addToScene=none {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"none","windowName":"Sample"}
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

// ==== case: addToScene=Scene_Map {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"Scene_Map","windowName":"Sample"}
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
// Add to Scene_Map
const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(0, 0, 300, 200);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: addToScene=Scene_Menu {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"Scene_Menu","windowName":"Sample"}
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
// Add to Scene_Menu
const _Scene_Menu_createAllWindows = Scene_Menu.prototype.createAllWindows;
Scene_Menu.prototype.createAllWindows = function() {
    _Scene_Menu_createAllWindows.call(this);
    this.createSampleWindow();
};

Scene_Menu.prototype.createSampleWindow = function() {
    const rect = new Rectangle(0, 0, 300, 200);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: addToScene=Scene_Battle {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"Scene_Battle","windowName":"Sample"}
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
// Add to Scene_Battle
const _Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
Scene_Battle.prototype.createAllWindows = function() {
    _Scene_Battle_createAllWindows.call(this);
    this.createSampleWindow();
};

Scene_Battle.prototype.createSampleWindow = function() {
    const rect = new Rectangle(0, 0, 300, 200);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: addToScene=Scene_Title {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"Scene_Title","windowName":"Sample"}
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
// Add to Scene_Title
const _Scene_Title_createAllWindows = Scene_Title.prototype.createAllWindows;
Scene_Title.prototype.createAllWindows = function() {
    _Scene_Title_createAllWindows.call(this);
    this.createSampleWindow();
};

Scene_Title.prototype.createSampleWindow = function() {
    const rect = new Rectangle(0, 0, 300, 200);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: windowName=comment-space {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"none","windowName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    // Draw your content here
    this.drawText('Content', 0, 0, this.contentsWidth());
};

// ==== case: windowName=comment-u2028 {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"none","windowName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    // Draw your content here
    this.drawText('Content', 0, 0, this.contentsWidth());
};

// ==== case: windowName=comment-u2029 {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"none","windowName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    // Draw your content here
    this.drawText('Content', 0, 0, this.contentsWidth());
};

// ==== case: windowName=comment-lf {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"none","windowName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    // Draw your content here
    this.drawText('Content', 0, 0, this.contentsWidth());
};

// ==== case: windowName=quote-single {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"none","windowName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    // Draw your content here
    this.drawText('Content', 0, 0, this.contentsWidth());
};

// ==== case: windowName=quote-double {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"none","windowName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    // Draw your content here
    this.drawText('Content', 0, 0, this.contentsWidth());
};

// ==== case: windowName=quote-backtick {"parentClass":"Window_Base","width":300,"height":200,"addToScene":"none","windowName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1globalThispwn1Y
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1globalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1globalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1globalThispwn1Y.prototype.constructor = Window_XglobalThispwn1globalThispwn1Y;

Window_XglobalThispwn1globalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
};

Window_XglobalThispwn1globalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    // Draw your content here
    this.drawText('Content', 0, 0, this.contentsWidth());
};
