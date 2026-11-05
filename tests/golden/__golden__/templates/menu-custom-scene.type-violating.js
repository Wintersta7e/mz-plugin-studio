// ==== case: type-violating: wrong types {"sceneName":42,"windowName":42,"windowType":7,"includeHelp":"yes","includeGold":"yes"}
// rejects: Field "Scene Name" must be text | Field "Main Window Name" must be text | Field "Window Type" must be text | Field "Include Help Window" must be true or false | Field "Include Gold Window" must be true or false
// throws: TypeError

// ==== case: type-violating: null {"sceneName":null,"windowName":null,"windowType":null,"includeHelp":null,"includeGold":null}
// throws: TypeError

// ==== case: type-violating: arrays {"sceneName":["a","b"],"windowName":["a","b"],"windowType":["a","b"],"includeHelp":["a","b"],"includeGold":["a","b"]}
// rejects: Field "Scene Name" must be text | Field "Main Window Name" must be text | Field "Window Type" must be text | Field "Include Help Window" must be true or false | Field "Include Gold Window" must be true or false
// throws: TypeError

// ==== case: type-violating: includeHelp=null {"windowType":"selectable","includeHelp":null,"includeGold":false,"sceneName":"Sample","windowName":"Sample"}
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
