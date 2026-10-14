// ==== case: base {"hudType":"health","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    // Check if HP/MP values have changed
    const actor = $gameParty.leader();
    if (!actor) return false;
    if (this._lastHp !== actor.hp || this._lastMp !== actor.mp) {
        this._lastHp = actor.hp;
        this._lastMp = actor.mp;
        return true;
    }
    return false;
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    const actor = $gameParty.leader();
    if (!actor) return;
    
    // Draw actor name
    this.drawText(actor.name(), 0, 0, this.contentsWidth());
    
    // Draw HP gauge
    const gaugeY = this.lineHeight();
    this.drawText("HP:", 0, gaugeY, 40);
    this.changeTextColor(ColorManager.hpColor(actor));
    this.drawText(actor.hp + "/" + actor.mhp, 45, gaugeY, this.contentsWidth() - 45);
    this.resetTextColor();
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_Sample = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Sample.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: hudType=health {"hudType":"health","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    // Check if HP/MP values have changed
    const actor = $gameParty.leader();
    if (!actor) return false;
    if (this._lastHp !== actor.hp || this._lastMp !== actor.mp) {
        this._lastHp = actor.hp;
        this._lastMp = actor.mp;
        return true;
    }
    return false;
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    const actor = $gameParty.leader();
    if (!actor) return;
    
    // Draw actor name
    this.drawText(actor.name(), 0, 0, this.contentsWidth());
    
    // Draw HP gauge
    const gaugeY = this.lineHeight();
    this.drawText("HP:", 0, gaugeY, 40);
    this.changeTextColor(ColorManager.hpColor(actor));
    this.drawText(actor.hp + "/" + actor.mhp, 45, gaugeY, this.contentsWidth() - 45);
    this.resetTextColor();
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_Sample = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Sample.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: hudType=status {"hudType":"status","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    // Refresh periodically for status updates
    this._refreshCounter = (this._refreshCounter || 0) + 1;
    if (this._refreshCounter >= 30) { // Every 0.5 seconds
        this._refreshCounter = 0;
        return true;
    }
    return false;
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    const actor = $gameParty.leader();
    if (!actor) return;
    
    // Draw status icons
    const icons = actor.allIcons();
    const iconWidth = ImageManager.iconWidth;
    for (let i = 0; i < icons.length && i < 8; i++) {
        this.drawIcon(icons[i], i * iconWidth, 0);
    }
    
    // Draw status text if no icons
    if (icons.length === 0) {
        this.drawText('Normal', 0, 0, this.contentsWidth(), 'center');
    }
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_Sample = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Sample.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: hudType=minimap {"hudType":"minimap","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    // Override this method to control when the HUD refreshes
    return false;
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    // Mini-map placeholder - customize with your own implementation
    const cx = this.contentsWidth() / 2;
    const cy = this.contentsHeight() / 2;
    
    // Draw border
    this.contents.strokeRect(2, 2, this.contentsWidth() - 4, this.contentsHeight() - 4, '#ffffff');
    
    // Draw player position indicator
    this.contents.fillRect(cx - 2, cy - 2, 4, 4, '#00ff00');
    
    this.drawText('Mini-Map', 0, cy - this.lineHeight()/2, this.contentsWidth(), 'center');
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_Sample = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Sample.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: hudType=custom {"hudType":"custom","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    // Override this method to control when the HUD refreshes
    return false;
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    // Custom HUD content - add your drawing code here
    this.drawText('Custom HUD', 0, 0, this.contentsWidth(), 'center');
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_Sample = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Sample.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: showFrame=true {"hudType":"health","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    // Check if HP/MP values have changed
    const actor = $gameParty.leader();
    if (!actor) return false;
    if (this._lastHp !== actor.hp || this._lastMp !== actor.mp) {
        this._lastHp = actor.hp;
        this._lastMp = actor.mp;
        return true;
    }
    return false;
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    const actor = $gameParty.leader();
    if (!actor) return;
    
    // Draw actor name
    this.drawText(actor.name(), 0, 0, this.contentsWidth());
    
    // Draw HP gauge
    const gaugeY = this.lineHeight();
    this.drawText("HP:", 0, gaugeY, 40);
    this.changeTextColor(ColorManager.hpColor(actor));
    this.drawText(actor.hp + "/" + actor.mhp, 45, gaugeY, this.contentsWidth() - 45);
    this.resetTextColor();
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_Sample = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Sample.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: showFrame=false {"hudType":"health","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"false","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    // Remove window frame for a cleaner HUD look
    this.frameVisible = false;
    this.backOpacity = 255;
    this.refresh();
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    // Check if HP/MP values have changed
    const actor = $gameParty.leader();
    if (!actor) return false;
    if (this._lastHp !== actor.hp || this._lastMp !== actor.mp) {
        this._lastHp = actor.hp;
        this._lastMp = actor.mp;
        return true;
    }
    return false;
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    const actor = $gameParty.leader();
    if (!actor) return;
    
    // Draw actor name
    this.drawText(actor.name(), 0, 0, this.contentsWidth());
    
    // Draw HP gauge
    const gaugeY = this.lineHeight();
    this.drawText("HP:", 0, gaugeY, 40);
    this.changeTextColor(ColorManager.hpColor(actor));
    this.drawText(actor.hp + "/" + actor.mhp, 45, gaugeY, this.contentsWidth() - 45);
    this.resetTextColor();
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_Sample = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Sample.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: windowName=comment-space {"hudType":"health","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.needsRefresh = function() {
    // Check if HP/MP values have changed
    const actor = $gameParty.leader();
    if (!actor) return false;
    if (this._lastHp !== actor.hp || this._lastMp !== actor.mp) {
        this._lastHp = actor.hp;
        this._lastMp = actor.mp;
        return true;
    }
    return false;
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    const actor = $gameParty.leader();
    if (!actor) return;
    
    // Draw actor name
    this.drawText(actor.name(), 0, 0, this.contentsWidth());
    
    // Draw HP gauge
    const gaugeY = this.lineHeight();
    this.drawText("HP:", 0, gaugeY, 40);
    this.changeTextColor(ColorManager.hpColor(actor));
    this.drawText(actor.hp + "/" + actor.mhp, 45, gaugeY, this.contentsWidth() - 45);
    this.resetTextColor();
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_XglobalThispwn1Y = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_XglobalThispwn1Y.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ==== case: windowName=comment-u2028 {"hudType":"health","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.needsRefresh = function() {
    // Check if HP/MP values have changed
    const actor = $gameParty.leader();
    if (!actor) return false;
    if (this._lastHp !== actor.hp || this._lastMp !== actor.mp) {
        this._lastHp = actor.hp;
        this._lastMp = actor.mp;
        return true;
    }
    return false;
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    const actor = $gameParty.leader();
    if (!actor) return;
    
    // Draw actor name
    this.drawText(actor.name(), 0, 0, this.contentsWidth());
    
    // Draw HP gauge
    const gaugeY = this.lineHeight();
    this.drawText("HP:", 0, gaugeY, 40);
    this.changeTextColor(ColorManager.hpColor(actor));
    this.drawText(actor.hp + "/" + actor.mhp, 45, gaugeY, this.contentsWidth() - 45);
    this.resetTextColor();
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_XglobalThispwn1Y = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_XglobalThispwn1Y.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ==== case: windowName=comment-u2029 {"hudType":"health","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.needsRefresh = function() {
    // Check if HP/MP values have changed
    const actor = $gameParty.leader();
    if (!actor) return false;
    if (this._lastHp !== actor.hp || this._lastMp !== actor.mp) {
        this._lastHp = actor.hp;
        this._lastMp = actor.mp;
        return true;
    }
    return false;
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    const actor = $gameParty.leader();
    if (!actor) return;
    
    // Draw actor name
    this.drawText(actor.name(), 0, 0, this.contentsWidth());
    
    // Draw HP gauge
    const gaugeY = this.lineHeight();
    this.drawText("HP:", 0, gaugeY, 40);
    this.changeTextColor(ColorManager.hpColor(actor));
    this.drawText(actor.hp + "/" + actor.mhp, 45, gaugeY, this.contentsWidth() - 45);
    this.resetTextColor();
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_XglobalThispwn1Y = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_XglobalThispwn1Y.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ==== case: windowName=comment-lf {"hudType":"health","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.needsRefresh = function() {
    // Check if HP/MP values have changed
    const actor = $gameParty.leader();
    if (!actor) return false;
    if (this._lastHp !== actor.hp || this._lastMp !== actor.mp) {
        this._lastHp = actor.hp;
        this._lastMp = actor.mp;
        return true;
    }
    return false;
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    const actor = $gameParty.leader();
    if (!actor) return;
    
    // Draw actor name
    this.drawText(actor.name(), 0, 0, this.contentsWidth());
    
    // Draw HP gauge
    const gaugeY = this.lineHeight();
    this.drawText("HP:", 0, gaugeY, 40);
    this.changeTextColor(ColorManager.hpColor(actor));
    this.drawText(actor.hp + "/" + actor.mhp, 45, gaugeY, this.contentsWidth() - 45);
    this.resetTextColor();
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_XglobalThispwn1Y = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_XglobalThispwn1Y.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ==== case: windowName=quote-single {"hudType":"health","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.needsRefresh = function() {
    // Check if HP/MP values have changed
    const actor = $gameParty.leader();
    if (!actor) return false;
    if (this._lastHp !== actor.hp || this._lastMp !== actor.mp) {
        this._lastHp = actor.hp;
        this._lastMp = actor.mp;
        return true;
    }
    return false;
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    const actor = $gameParty.leader();
    if (!actor) return;
    
    // Draw actor name
    this.drawText(actor.name(), 0, 0, this.contentsWidth());
    
    // Draw HP gauge
    const gaugeY = this.lineHeight();
    this.drawText("HP:", 0, gaugeY, 40);
    this.changeTextColor(ColorManager.hpColor(actor));
    this.drawText(actor.hp + "/" + actor.mhp, 45, gaugeY, this.contentsWidth() - 45);
    this.resetTextColor();
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_XglobalThispwn1Y = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_XglobalThispwn1Y.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ==== case: windowName=quote-double {"hudType":"health","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.needsRefresh = function() {
    // Check if HP/MP values have changed
    const actor = $gameParty.leader();
    if (!actor) return false;
    if (this._lastHp !== actor.hp || this._lastMp !== actor.mp) {
        this._lastHp = actor.hp;
        this._lastMp = actor.mp;
        return true;
    }
    return false;
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    const actor = $gameParty.leader();
    if (!actor) return;
    
    // Draw actor name
    this.drawText(actor.name(), 0, 0, this.contentsWidth());
    
    // Draw HP gauge
    const gaugeY = this.lineHeight();
    this.drawText("HP:", 0, gaugeY, 40);
    this.changeTextColor(ColorManager.hpColor(actor));
    this.drawText(actor.hp + "/" + actor.mhp, 45, gaugeY, this.contentsWidth() - 45);
    this.resetTextColor();
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_XglobalThispwn1Y = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_XglobalThispwn1Y.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ==== case: windowName=quote-backtick {"hudType":"health","positionX":10,"positionY":10,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1globalThispwn1Y
//
// HUD overlay window that displays on the map screen.
// This window automatically updates every frame to reflect current game state.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1globalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1globalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1globalThispwn1Y.prototype.constructor = Window_XglobalThispwn1globalThispwn1Y;

Window_XglobalThispwn1globalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.backOpacity = 255;
    this.refresh();
};

Window_XglobalThispwn1globalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    // Refresh HUD when data changes
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1globalThispwn1Y.prototype.needsRefresh = function() {
    // Check if HP/MP values have changed
    const actor = $gameParty.leader();
    if (!actor) return false;
    if (this._lastHp !== actor.hp || this._lastMp !== actor.mp) {
        this._lastHp = actor.hp;
        this._lastMp = actor.mp;
        return true;
    }
    return false;
};

Window_XglobalThispwn1globalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    const actor = $gameParty.leader();
    if (!actor) return;
    
    // Draw actor name
    this.drawText(actor.name(), 0, 0, this.contentsWidth());
    
    // Draw HP gauge
    const gaugeY = this.lineHeight();
    this.drawText("HP:", 0, gaugeY, 40);
    this.changeTextColor(ColorManager.hpColor(actor));
    this.drawText(actor.hp + "/" + actor.mhp, 45, gaugeY, this.contentsWidth() - 45);
    this.resetTextColor();
};

// Add HUD to Scene_Map
const _Scene_Map_createAllWindows_XglobalThispwn1globalThispwn1Y = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_XglobalThispwn1globalThispwn1Y.call(this);
    this.createXglobalThispwn1globalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1globalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 200, 80);
    this._xglobalThispwn1globalThispwn1YWindow = new Window_XglobalThispwn1globalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1globalThispwn1YWindow);
};
