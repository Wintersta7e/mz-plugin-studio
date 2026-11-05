// ==== case: type-violating: wrong types {"windowName":42,"hudType":7,"positionX":"abc","positionY":"abc","width":"abc","height":"abc","opacity":"abc","showFrame":7}
// rejects: Field "Window Name" must be text | Field "HUD Type" must be text | Field "X Position" must be a number | Field "Y Position" must be a number | Field "Width" must be a number | Field "Height" must be a number | Field "Background Opacity" must be a number | Field "Show Window Frame" must be text
// throws: TypeError

// ==== case: type-violating: null {"windowName":null,"hudType":null,"positionX":null,"positionY":null,"width":null,"height":null,"opacity":null,"showFrame":null}
// rejects: Field "Window Name" is required | Field "HUD Type" is required
// throws: TypeError

// ==== case: type-violating: arrays {"windowName":["a","b"],"hudType":["a","b"],"positionX":["a","b"],"positionY":["a","b"],"width":["a","b"],"height":["a","b"],"opacity":["a","b"],"showFrame":["a","b"]}
// rejects: Field "Window Name" must be text | Field "HUD Type" must be text | Field "X Position" must be a number | Field "Y Position" must be a number | Field "Width" must be a number | Field "Height" must be a number | Field "Background Opacity" must be a number | Field "Show Window Frame" must be text
// throws: TypeError

// ==== case: type-violating: positionY=null,opacity=null {"hudType":"health","positionX":10,"positionY":null,"width":200,"height":80,"opacity":null,"showFrame":"true","windowName":"Sample"}
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

// ==== case: type-violating: positionX="abc",width=["a","b"],opacity="x" {"hudType":"health","positionX":"abc","positionY":10,"width":["a","b"],"height":80,"opacity":"x","showFrame":"true","windowName":"Sample"}
// rejects: Field "X Position" must be a number | Field "Width" must be a number | Field "Background Opacity" must be a number
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
    this.backOpacity = x;
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
    const rect = new Rectangle(abc, 10, a,b, 80);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ==== case: type-violating: hudType="status",opacity=null {"hudType":"status","positionX":10,"positionY":10,"width":200,"height":80,"opacity":null,"showFrame":"true","windowName":"Sample"}
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

// ==== case: type-violating: hudType="minimap",positionY=null {"hudType":"minimap","positionX":10,"positionY":null,"width":200,"height":80,"opacity":255,"showFrame":"true","windowName":"Sample"}
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

// ==== case: type-violating: hudType="custom",width=null {"hudType":"custom","positionX":10,"positionY":10,"width":null,"height":80,"opacity":255,"showFrame":"true","windowName":"Sample"}
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

// ==== case: type-violating: opacity=300,positionY=null {"hudType":"health","positionX":10,"positionY":null,"width":200,"height":80,"opacity":300,"showFrame":"true","windowName":"Sample"}
// rejects: Opacity must be between 0 and 255
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
    this.backOpacity = 300;
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
