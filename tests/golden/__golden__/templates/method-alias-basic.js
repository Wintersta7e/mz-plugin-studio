// ==== case: base {"timing":"after","callOriginal":true,"className":"Scene_Map","methodName":"start"}
// Alias: Scene_Map.start
const _Scene_Map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
    const result = _Scene_Map_start.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: className=Bitmap {"timing":"after","callOriginal":true,"className":"Bitmap","methodName":"start"}
// rejects: Method "start" not found on class "Bitmap"
// Alias: Bitmap.start
const _Bitmap_start = Bitmap.prototype.start;
Bitmap.prototype.start = function() {
    const result = _Bitmap_start.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: className=DataManager {"timing":"after","callOriginal":true,"className":"DataManager","methodName":"start"}
// rejects: Method "start" not found on class "DataManager"
// Alias: DataManager.start
const _DataManager_start = DataManager.prototype.start;
DataManager.prototype.start = function() {
    const result = _DataManager_start.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: className=Game_Temp {"timing":"after","callOriginal":true,"className":"Game_Temp","methodName":"start"}
// rejects: Method "start" not found on class "Game_Temp"
// Alias: Game_Temp.start
const _Game_Temp_start = Game_Temp.prototype.start;
Game_Temp.prototype.start = function() {
    const result = _Game_Temp_start.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: className=Scene_Base {"timing":"after","callOriginal":true,"className":"Scene_Base","methodName":"start"}
// Alias: Scene_Base.start
const _Scene_Base_start = Scene_Base.prototype.start;
Scene_Base.prototype.start = function() {
    const result = _Scene_Base_start.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: className=Sprite_Clickable {"timing":"after","callOriginal":true,"className":"Sprite_Clickable","methodName":"start"}
// rejects: Method "start" not found on class "Sprite_Clickable"
// Alias: Sprite_Clickable.start
const _Sprite_Clickable_start = Sprite_Clickable.prototype.start;
Sprite_Clickable.prototype.start = function() {
    const result = _Sprite_Clickable_start.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: className=Window_Base {"timing":"after","callOriginal":true,"className":"Window_Base","methodName":"start"}
// rejects: Method "start" not found on class "Window_Base"
// Alias: Window_Base.start
const _Window_Base_start = Window_Base.prototype.start;
Window_Base.prototype.start = function() {
    const result = _Window_Base_start.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: methodName=initialize {"timing":"after","callOriginal":true,"className":"Scene_Map","methodName":"initialize"}
// Alias: Scene_Map.initialize
const _Scene_Map_initialize = Scene_Map.prototype.initialize;
Scene_Map.prototype.initialize = function() {
    const result = _Scene_Map_initialize.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: methodName=create {"timing":"after","callOriginal":true,"className":"Scene_Map","methodName":"create"}
// Alias: Scene_Map.create
const _Scene_Map_create = Scene_Map.prototype.create;
Scene_Map.prototype.create = function() {
    const result = _Scene_Map_create.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: methodName=start {"timing":"after","callOriginal":true,"className":"Scene_Map","methodName":"start"}
// Alias: Scene_Map.start
const _Scene_Map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
    const result = _Scene_Map_start.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: methodName=update {"timing":"after","callOriginal":true,"className":"Scene_Map","methodName":"update"}
// Alias: Scene_Map.update
const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    const result = _Scene_Map_update.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: methodName=updateMain {"timing":"after","callOriginal":true,"className":"Scene_Map","methodName":"updateMain"}
// Alias: Scene_Map.updateMain
const _Scene_Map_updateMain = Scene_Map.prototype.updateMain;
Scene_Map.prototype.updateMain = function() {
    const result = _Scene_Map_updateMain.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: methodName=createDisplayObjects {"timing":"after","callOriginal":true,"className":"Scene_Map","methodName":"createDisplayObjects"}
// Alias: Scene_Map.createDisplayObjects
const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
Scene_Map.prototype.createDisplayObjects = function() {
    const result = _Scene_Map_createDisplayObjects.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: methodName=callMenu {"timing":"after","callOriginal":true,"className":"Scene_Map","methodName":"callMenu"}
// Alias: Scene_Map.callMenu
const _Scene_Map_callMenu = Scene_Map.prototype.callMenu;
Scene_Map.prototype.callMenu = function() {
    const result = _Scene_Map_callMenu.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: timing=after {"timing":"after","callOriginal":true,"className":"Scene_Map","methodName":"start"}
// Alias: Scene_Map.start
const _Scene_Map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
    const result = _Scene_Map_start.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: timing=before {"timing":"before","callOriginal":true,"className":"Scene_Map","methodName":"start"}
// Alias: Scene_Map.start
const _Scene_Map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
    // Your code here (before original)
    
    return _Scene_Map_start.apply(this, arguments);
};

// ==== case: timing=wrap {"timing":"wrap","callOriginal":true,"className":"Scene_Map","methodName":"start"}
// Alias: Scene_Map.start
const _Scene_Map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
    // Your code here (before original)
    
    const result = _Scene_Map_start.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: timing=replace {"timing":"replace","callOriginal":true,"className":"Scene_Map","methodName":"start"}
// Alias: Scene_Map.start
const _Scene_Map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
    // Your code here (replacing original, but still calling it)
    
    const result = _Scene_Map_start.apply(this, arguments);
    
    // More of your code here
    
    return result;
};

// ==== case: callOriginal=false {"timing":"after","callOriginal":false,"className":"Scene_Map","methodName":"start"}
// Alias: Scene_Map.start
const _Scene_Map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
    const result = _Scene_Map_start.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: timing=replace,callOriginal=false {"timing":"replace","callOriginal":false,"className":"Scene_Map","methodName":"start"}
// Alias: Scene_Map.start
const _Scene_Map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
    // ⚠  WARNING: This replacement does NOT call the original.
    //    Methods like canMove(), isValid(), canUse() expect a boolean — returning
    //    `undefined` is falsy and can silently disable MZ behavior (e.g., a battler
    //    that can never move). Replace the return value below before shipping.
    
    // Your code here (completely replacing original)
    
    // TODO: return an appropriate value for Scene_Map.prototype.start
    return undefined;
};
