// ==== case: base {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"Sample","windowName":"Sample"}
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_Sample based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_Sample.

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Selectable.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_Sample.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_Sample.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createSampleWindow();
};

Scene_Sample.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('ok', this.onItemOk.bind(this));
    this._sampleWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._sampleWindow);
};

Scene_Sample.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Sample.prototype.onItemOk = function() {
    const index = this._sampleWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._sampleWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_Sample);

// ==== case: windowType=selectable {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"Sample","windowName":"Sample"}
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_Sample based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_Sample.

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Selectable.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_Sample.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_Sample.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createSampleWindow();
};

Scene_Sample.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('ok', this.onItemOk.bind(this));
    this._sampleWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._sampleWindow);
};

Scene_Sample.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Sample.prototype.onItemOk = function() {
    const index = this._sampleWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._sampleWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_Sample);

// ==== case: windowType=base {"windowType":"base","includeHelp":false,"includeGold":false,"sceneName":"Sample","windowName":"Sample"}
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_Sample based on Window_Base

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_Sample.

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
    this.drawText('Custom Window Content', 0, 0, this.innerWidth, 'center');
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createSampleWindow();
};

Scene_Sample.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

Scene_Sample.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};


// To open this scene, use: SceneManager.push(Scene_Sample);

// ==== case: windowType=command {"windowType":"command","includeHelp":false,"includeGold":false,"sceneName":"Sample","windowName":"Sample"}
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_Sample based on Window_Command

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_Sample.

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Command.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Command.prototype.initialize.call(this, rect);
};

Window_Sample.prototype.makeCommandList = function() {
    // Add your commands here
    this.addCommand('Command 1', 'command1');
    this.addCommand('Command 2', 'command2');
    this.addCommand('Cancel', 'cancel');
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createSampleWindow();
};

Scene_Sample.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('command1', this.onCommand1.bind(this));
    this._sampleWindow.setHandler('command2', this.onCommand2.bind(this));
    this._sampleWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._sampleWindow);
};

Scene_Sample.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Sample.prototype.onCommand1 = function() {
    // Handle Command 1
    console.log('Command 1 selected');
    this._sampleWindow.activate();
};

Scene_Sample.prototype.onCommand2 = function() {
    // Handle Command 2
    console.log('Command 2 selected');
    this._sampleWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_Sample);

// ==== case: includeHelp=true {"windowType":"selectable","includeHelp":true,"includeGold":false,"sceneName":"Sample","windowName":"Sample"}
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_Sample based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_Sample.

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Selectable.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_Sample.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_Sample.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createHelpWindow();
    this.createSampleWindow();
};

Scene_Sample.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('ok', this.onItemOk.bind(this));
    this._sampleWindow.setHandler('cancel', this.popScene.bind(this));
    this._sampleWindow.setHelpWindow(this._helpWindow);
    this.addWindow(this._sampleWindow);
};

Scene_Sample.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = this.mainAreaHeight();
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Sample.prototype.onItemOk = function() {
    const index = this._sampleWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._sampleWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_Sample);

// ==== case: includeGold=true {"windowType":"selectable","includeHelp":false,"includeGold":true,"sceneName":"Sample","windowName":"Sample"}
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_Sample based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_Sample.

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Selectable.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_Sample.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_Sample.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createSampleWindow();
    this.createGoldWindow();
};

Scene_Sample.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('ok', this.onItemOk.bind(this));
    this._sampleWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._sampleWindow);
};

Scene_Sample.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Sample.prototype.onItemOk = function() {
    const index = this._sampleWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._sampleWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_Sample);

// ==== case: sceneName=comment-space {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"X */ globalThis.__pwn = 1; /* Y","windowName":"Sample"}
// rejects: Scene name must be a valid JavaScript identifier (letters, numbers, underscores, cannot start with a number)
// Custom Menu Scene: Scene_XglobalThis__pwn1Y
// A custom scene with Window_Sample based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_XglobalThis__pwn1Y.

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Selectable.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_Sample.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_Sample.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_XglobalThis__pwn1Y
//
// A custom menu scene.

function Scene_XglobalThis__pwn1Y() {
    this.initialize(...arguments);
}

Scene_XglobalThis__pwn1Y.prototype = Object.create(Scene_MenuBase.prototype);
Scene_XglobalThis__pwn1Y.prototype.constructor = Scene_XglobalThis__pwn1Y;

Scene_XglobalThis__pwn1Y.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_XglobalThis__pwn1Y.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createSampleWindow();
};

Scene_XglobalThis__pwn1Y.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('ok', this.onItemOk.bind(this));
    this._sampleWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._sampleWindow);
};

Scene_XglobalThis__pwn1Y.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_XglobalThis__pwn1Y.prototype.onItemOk = function() {
    const index = this._sampleWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._sampleWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_XglobalThis__pwn1Y);

// ==== case: sceneName=comment-u2028 {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"X */\u2028globalThis.__pwn = 1; /* Y","windowName":"Sample"}
// rejects: Scene name must be a valid JavaScript identifier (letters, numbers, underscores, cannot start with a number)
// Custom Menu Scene: Scene_XglobalThis__pwn1Y
// A custom scene with Window_Sample based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_XglobalThis__pwn1Y.

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Selectable.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_Sample.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_Sample.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_XglobalThis__pwn1Y
//
// A custom menu scene.

function Scene_XglobalThis__pwn1Y() {
    this.initialize(...arguments);
}

Scene_XglobalThis__pwn1Y.prototype = Object.create(Scene_MenuBase.prototype);
Scene_XglobalThis__pwn1Y.prototype.constructor = Scene_XglobalThis__pwn1Y;

Scene_XglobalThis__pwn1Y.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_XglobalThis__pwn1Y.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createSampleWindow();
};

Scene_XglobalThis__pwn1Y.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('ok', this.onItemOk.bind(this));
    this._sampleWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._sampleWindow);
};

Scene_XglobalThis__pwn1Y.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_XglobalThis__pwn1Y.prototype.onItemOk = function() {
    const index = this._sampleWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._sampleWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_XglobalThis__pwn1Y);

// ==== case: sceneName=comment-u2029 {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"X */\u2029globalThis.__pwn = 1; /* Y","windowName":"Sample"}
// rejects: Scene name must be a valid JavaScript identifier (letters, numbers, underscores, cannot start with a number)
// Custom Menu Scene: Scene_XglobalThis__pwn1Y
// A custom scene with Window_Sample based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_XglobalThis__pwn1Y.

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Selectable.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_Sample.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_Sample.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_XglobalThis__pwn1Y
//
// A custom menu scene.

function Scene_XglobalThis__pwn1Y() {
    this.initialize(...arguments);
}

Scene_XglobalThis__pwn1Y.prototype = Object.create(Scene_MenuBase.prototype);
Scene_XglobalThis__pwn1Y.prototype.constructor = Scene_XglobalThis__pwn1Y;

Scene_XglobalThis__pwn1Y.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_XglobalThis__pwn1Y.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createSampleWindow();
};

Scene_XglobalThis__pwn1Y.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('ok', this.onItemOk.bind(this));
    this._sampleWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._sampleWindow);
};

Scene_XglobalThis__pwn1Y.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_XglobalThis__pwn1Y.prototype.onItemOk = function() {
    const index = this._sampleWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._sampleWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_XglobalThis__pwn1Y);

// ==== case: sceneName=comment-lf {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"X */\nglobalThis.__pwn = 1; /* Y","windowName":"Sample"}
// rejects: Scene name must be a valid JavaScript identifier (letters, numbers, underscores, cannot start with a number)
// Custom Menu Scene: Scene_XglobalThis__pwn1Y
// A custom scene with Window_Sample based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_XglobalThis__pwn1Y.

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Selectable.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_Sample.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_Sample.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_XglobalThis__pwn1Y
//
// A custom menu scene.

function Scene_XglobalThis__pwn1Y() {
    this.initialize(...arguments);
}

Scene_XglobalThis__pwn1Y.prototype = Object.create(Scene_MenuBase.prototype);
Scene_XglobalThis__pwn1Y.prototype.constructor = Scene_XglobalThis__pwn1Y;

Scene_XglobalThis__pwn1Y.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_XglobalThis__pwn1Y.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createSampleWindow();
};

Scene_XglobalThis__pwn1Y.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('ok', this.onItemOk.bind(this));
    this._sampleWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._sampleWindow);
};

Scene_XglobalThis__pwn1Y.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_XglobalThis__pwn1Y.prototype.onItemOk = function() {
    const index = this._sampleWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._sampleWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_XglobalThis__pwn1Y);

// ==== case: sceneName=quote-single {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"X' + (globalThis.__pwn = 1) + 'Y","windowName":"Sample"}
// rejects: Scene name must be a valid JavaScript identifier (letters, numbers, underscores, cannot start with a number)
// Custom Menu Scene: Scene_XglobalThis__pwn1Y
// A custom scene with Window_Sample based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_XglobalThis__pwn1Y.

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Selectable.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_Sample.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_Sample.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_XglobalThis__pwn1Y
//
// A custom menu scene.

function Scene_XglobalThis__pwn1Y() {
    this.initialize(...arguments);
}

Scene_XglobalThis__pwn1Y.prototype = Object.create(Scene_MenuBase.prototype);
Scene_XglobalThis__pwn1Y.prototype.constructor = Scene_XglobalThis__pwn1Y;

Scene_XglobalThis__pwn1Y.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_XglobalThis__pwn1Y.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createSampleWindow();
};

Scene_XglobalThis__pwn1Y.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('ok', this.onItemOk.bind(this));
    this._sampleWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._sampleWindow);
};

Scene_XglobalThis__pwn1Y.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_XglobalThis__pwn1Y.prototype.onItemOk = function() {
    const index = this._sampleWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._sampleWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_XglobalThis__pwn1Y);

// ==== case: sceneName=quote-double {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"X\" + (globalThis.__pwn = 1) + \"Y","windowName":"Sample"}
// rejects: Scene name must be a valid JavaScript identifier (letters, numbers, underscores, cannot start with a number)
// Custom Menu Scene: Scene_XglobalThis__pwn1Y
// A custom scene with Window_Sample based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_XglobalThis__pwn1Y.

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Selectable.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_Sample.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_Sample.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_XglobalThis__pwn1Y
//
// A custom menu scene.

function Scene_XglobalThis__pwn1Y() {
    this.initialize(...arguments);
}

Scene_XglobalThis__pwn1Y.prototype = Object.create(Scene_MenuBase.prototype);
Scene_XglobalThis__pwn1Y.prototype.constructor = Scene_XglobalThis__pwn1Y;

Scene_XglobalThis__pwn1Y.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_XglobalThis__pwn1Y.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createSampleWindow();
};

Scene_XglobalThis__pwn1Y.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('ok', this.onItemOk.bind(this));
    this._sampleWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._sampleWindow);
};

Scene_XglobalThis__pwn1Y.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_XglobalThis__pwn1Y.prototype.onItemOk = function() {
    const index = this._sampleWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._sampleWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_XglobalThis__pwn1Y);

// ==== case: sceneName=quote-backtick {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","windowName":"Sample"}
// rejects: Scene name must be a valid JavaScript identifier (letters, numbers, underscores, cannot start with a number)
// Custom Menu Scene: Scene_XglobalThis__pwn1globalThis__pwn1Y
// A custom scene with Window_Sample based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_Sample
//
// The window for displaying custom content in Scene_XglobalThis__pwn1globalThis__pwn1Y.

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Selectable.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_Sample.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_Sample.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_XglobalThis__pwn1globalThis__pwn1Y
//
// A custom menu scene.

function Scene_XglobalThis__pwn1globalThis__pwn1Y() {
    this.initialize(...arguments);
}

Scene_XglobalThis__pwn1globalThis__pwn1Y.prototype = Object.create(Scene_MenuBase.prototype);
Scene_XglobalThis__pwn1globalThis__pwn1Y.prototype.constructor = Scene_XglobalThis__pwn1globalThis__pwn1Y;

Scene_XglobalThis__pwn1globalThis__pwn1Y.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_XglobalThis__pwn1globalThis__pwn1Y.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createSampleWindow();
};

Scene_XglobalThis__pwn1globalThis__pwn1Y.prototype.createSampleWindow = function() {
    const rect = this.sampleWindowRect();
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow.setHandler('ok', this.onItemOk.bind(this));
    this._sampleWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._sampleWindow);
};

Scene_XglobalThis__pwn1globalThis__pwn1Y.prototype.sampleWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_XglobalThis__pwn1globalThis__pwn1Y.prototype.onItemOk = function() {
    const index = this._sampleWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._sampleWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_XglobalThis__pwn1globalThis__pwn1Y);

// ==== case: windowName=comment-space {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"Sample","windowName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Window name must be a valid JavaScript identifier
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_XglobalThis__pwn1Y based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_XglobalThis__pwn1Y
//
// The window for displaying custom content in Scene_Sample.

function Window_XglobalThis__pwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThis__pwn1Y.prototype = Object.create(Window_Selectable.prototype);
Window_XglobalThis__pwn1Y.prototype.constructor = Window_XglobalThis__pwn1Y;

Window_XglobalThis__pwn1Y.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_XglobalThis__pwn1Y.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_XglobalThis__pwn1Y.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createXglobalThis__pwn1YWindow();
};

Scene_Sample.prototype.createXglobalThis__pwn1YWindow = function() {
    const rect = this.xglobalthis__pwn1yWindowRect();
    this._xglobalthis__pwn1yWindow = new Window_XglobalThis__pwn1Y(rect);
    this._xglobalthis__pwn1yWindow.setHandler('ok', this.onItemOk.bind(this));
    this._xglobalthis__pwn1yWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._xglobalthis__pwn1yWindow);
};

Scene_Sample.prototype.xglobalthis__pwn1yWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Sample.prototype.onItemOk = function() {
    const index = this._xglobalthis__pwn1yWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._xglobalthis__pwn1yWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_Sample);

// ==== case: windowName=comment-u2028 {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"Sample","windowName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Window name must be a valid JavaScript identifier
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_XglobalThis__pwn1Y based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_XglobalThis__pwn1Y
//
// The window for displaying custom content in Scene_Sample.

function Window_XglobalThis__pwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThis__pwn1Y.prototype = Object.create(Window_Selectable.prototype);
Window_XglobalThis__pwn1Y.prototype.constructor = Window_XglobalThis__pwn1Y;

Window_XglobalThis__pwn1Y.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_XglobalThis__pwn1Y.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_XglobalThis__pwn1Y.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createXglobalThis__pwn1YWindow();
};

Scene_Sample.prototype.createXglobalThis__pwn1YWindow = function() {
    const rect = this.xglobalthis__pwn1yWindowRect();
    this._xglobalthis__pwn1yWindow = new Window_XglobalThis__pwn1Y(rect);
    this._xglobalthis__pwn1yWindow.setHandler('ok', this.onItemOk.bind(this));
    this._xglobalthis__pwn1yWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._xglobalthis__pwn1yWindow);
};

Scene_Sample.prototype.xglobalthis__pwn1yWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Sample.prototype.onItemOk = function() {
    const index = this._xglobalthis__pwn1yWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._xglobalthis__pwn1yWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_Sample);

// ==== case: windowName=comment-u2029 {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"Sample","windowName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Window name must be a valid JavaScript identifier
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_XglobalThis__pwn1Y based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_XglobalThis__pwn1Y
//
// The window for displaying custom content in Scene_Sample.

function Window_XglobalThis__pwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThis__pwn1Y.prototype = Object.create(Window_Selectable.prototype);
Window_XglobalThis__pwn1Y.prototype.constructor = Window_XglobalThis__pwn1Y;

Window_XglobalThis__pwn1Y.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_XglobalThis__pwn1Y.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_XglobalThis__pwn1Y.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createXglobalThis__pwn1YWindow();
};

Scene_Sample.prototype.createXglobalThis__pwn1YWindow = function() {
    const rect = this.xglobalthis__pwn1yWindowRect();
    this._xglobalthis__pwn1yWindow = new Window_XglobalThis__pwn1Y(rect);
    this._xglobalthis__pwn1yWindow.setHandler('ok', this.onItemOk.bind(this));
    this._xglobalthis__pwn1yWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._xglobalthis__pwn1yWindow);
};

Scene_Sample.prototype.xglobalthis__pwn1yWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Sample.prototype.onItemOk = function() {
    const index = this._xglobalthis__pwn1yWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._xglobalthis__pwn1yWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_Sample);

// ==== case: windowName=comment-lf {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"Sample","windowName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Window name must be a valid JavaScript identifier
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_XglobalThis__pwn1Y based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_XglobalThis__pwn1Y
//
// The window for displaying custom content in Scene_Sample.

function Window_XglobalThis__pwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThis__pwn1Y.prototype = Object.create(Window_Selectable.prototype);
Window_XglobalThis__pwn1Y.prototype.constructor = Window_XglobalThis__pwn1Y;

Window_XglobalThis__pwn1Y.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_XglobalThis__pwn1Y.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_XglobalThis__pwn1Y.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createXglobalThis__pwn1YWindow();
};

Scene_Sample.prototype.createXglobalThis__pwn1YWindow = function() {
    const rect = this.xglobalthis__pwn1yWindowRect();
    this._xglobalthis__pwn1yWindow = new Window_XglobalThis__pwn1Y(rect);
    this._xglobalthis__pwn1yWindow.setHandler('ok', this.onItemOk.bind(this));
    this._xglobalthis__pwn1yWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._xglobalthis__pwn1yWindow);
};

Scene_Sample.prototype.xglobalthis__pwn1yWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Sample.prototype.onItemOk = function() {
    const index = this._xglobalthis__pwn1yWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._xglobalthis__pwn1yWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_Sample);

// ==== case: windowName=quote-single {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"Sample","windowName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Window name must be a valid JavaScript identifier
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_XglobalThis__pwn1Y based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_XglobalThis__pwn1Y
//
// The window for displaying custom content in Scene_Sample.

function Window_XglobalThis__pwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThis__pwn1Y.prototype = Object.create(Window_Selectable.prototype);
Window_XglobalThis__pwn1Y.prototype.constructor = Window_XglobalThis__pwn1Y;

Window_XglobalThis__pwn1Y.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_XglobalThis__pwn1Y.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_XglobalThis__pwn1Y.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createXglobalThis__pwn1YWindow();
};

Scene_Sample.prototype.createXglobalThis__pwn1YWindow = function() {
    const rect = this.xglobalthis__pwn1yWindowRect();
    this._xglobalthis__pwn1yWindow = new Window_XglobalThis__pwn1Y(rect);
    this._xglobalthis__pwn1yWindow.setHandler('ok', this.onItemOk.bind(this));
    this._xglobalthis__pwn1yWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._xglobalthis__pwn1yWindow);
};

Scene_Sample.prototype.xglobalthis__pwn1yWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Sample.prototype.onItemOk = function() {
    const index = this._xglobalthis__pwn1yWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._xglobalthis__pwn1yWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_Sample);

// ==== case: windowName=quote-double {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"Sample","windowName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Window name must be a valid JavaScript identifier
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_XglobalThis__pwn1Y based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_XglobalThis__pwn1Y
//
// The window for displaying custom content in Scene_Sample.

function Window_XglobalThis__pwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThis__pwn1Y.prototype = Object.create(Window_Selectable.prototype);
Window_XglobalThis__pwn1Y.prototype.constructor = Window_XglobalThis__pwn1Y;

Window_XglobalThis__pwn1Y.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_XglobalThis__pwn1Y.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_XglobalThis__pwn1Y.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createXglobalThis__pwn1YWindow();
};

Scene_Sample.prototype.createXglobalThis__pwn1YWindow = function() {
    const rect = this.xglobalthis__pwn1yWindowRect();
    this._xglobalthis__pwn1yWindow = new Window_XglobalThis__pwn1Y(rect);
    this._xglobalthis__pwn1yWindow.setHandler('ok', this.onItemOk.bind(this));
    this._xglobalthis__pwn1yWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._xglobalthis__pwn1yWindow);
};

Scene_Sample.prototype.xglobalthis__pwn1yWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Sample.prototype.onItemOk = function() {
    const index = this._xglobalthis__pwn1yWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._xglobalthis__pwn1yWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_Sample);

// ==== case: windowName=quote-backtick {"windowType":"selectable","includeHelp":false,"includeGold":false,"sceneName":"Sample","windowName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Window name must be a valid JavaScript identifier
// Custom Menu Scene: Scene_Sample
// A custom scene with Window_XglobalThis__pwn1globalThis__pwn1Y based on Window_Selectable

//-----------------------------------------------------------------------------
// Window_XglobalThis__pwn1globalThis__pwn1Y
//
// The window for displaying custom content in Scene_Sample.

function Window_XglobalThis__pwn1globalThis__pwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThis__pwn1globalThis__pwn1Y.prototype = Object.create(Window_Selectable.prototype);
Window_XglobalThis__pwn1globalThis__pwn1Y.prototype.constructor = Window_XglobalThis__pwn1globalThis__pwn1Y;

Window_XglobalThis__pwn1globalThis__pwn1Y.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this.refresh();
    this.select(0);
    this.activate();
};

Window_XglobalThis__pwn1globalThis__pwn1Y.prototype.maxItems = function() {
    // Return the number of items in your list
    return 10;
};

Window_XglobalThis__pwn1globalThis__pwn1Y.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.drawText('Item ' + (index + 1), rect.x, rect.y, rect.width);
};

//-----------------------------------------------------------------------------
// Scene_Sample
//
// A custom menu scene.

function Scene_Sample() {
    this.initialize(...arguments);
}

Scene_Sample.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Sample.prototype.constructor = Scene_Sample;

Scene_Sample.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Sample.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createXglobalThis__pwn1globalThis__pwn1YWindow();
};

Scene_Sample.prototype.createXglobalThis__pwn1globalThis__pwn1YWindow = function() {
    const rect = this.xglobalthis__pwn1globalthis__pwn1yWindowRect();
    this._xglobalthis__pwn1globalthis__pwn1yWindow = new Window_XglobalThis__pwn1globalThis__pwn1Y(rect);
    this._xglobalthis__pwn1globalthis__pwn1yWindow.setHandler('ok', this.onItemOk.bind(this));
    this._xglobalthis__pwn1globalthis__pwn1yWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._xglobalthis__pwn1globalthis__pwn1yWindow);
};

Scene_Sample.prototype.xglobalthis__pwn1globalthis__pwn1yWindowRect = function() {
    const wx = 0;
    const wy = this.mainAreaTop();
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight - wy;
    return new Rectangle(wx, wy, ww, wh);
};

Scene_Sample.prototype.onItemOk = function() {
    const index = this._xglobalthis__pwn1globalthis__pwn1yWindow.index();
    // Handle item selection
    console.log('Selected item at index:', index);
    this._xglobalthis__pwn1globalthis__pwn1yWindow.activate();
};

// To open this scene, use: SceneManager.push(Scene_Sample);
