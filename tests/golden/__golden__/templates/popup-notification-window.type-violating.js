// ==== case: type-violating: wrong types {"windowName":42,"defaultDuration":"abc","width":"abc","height":"abc","position":7,"fadeEffect":7,"bgColor":42,"textColor":42}
// rejects: Field "Window Name" must be text | Field "Default Duration (frames)" must be a number | Field "Width" must be a number | Field "Height" must be a number | Field "Position" must be text | Field "Fade Effect" must be text | Field "Background Color" must be text | Field "Text Color" must be text
// throws: TypeError

// ==== case: type-violating: null {"windowName":null,"defaultDuration":null,"width":null,"height":null,"position":null,"fadeEffect":null,"bgColor":null,"textColor":null}
// rejects: Duration must be a positive number
// throws: TypeError

// ==== case: type-violating: arrays {"windowName":["a","b"],"defaultDuration":["a","b"],"width":["a","b"],"height":["a","b"],"position":["a","b"],"fadeEffect":["a","b"],"bgColor":["a","b"],"textColor":["a","b"]}
// rejects: Field "Window Name" must be text | Field "Default Duration (frames)" must be a number | Field "Width" must be a number | Field "Height" must be a number | Field "Position" must be text | Field "Fade Effect" must be text | Field "Background Color" must be text | Field "Text Color" must be text
// throws: TypeError

// ==== case: type-violating: defaultDuration=null,height=null {"defaultDuration":null,"width":400,"height":null,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"Sample"}
// rejects: Duration must be a positive number
//-----------------------------------------------------------------------------
// Window_Sample
//
// A popup notification window that displays temporarily and auto-closes.
// Default duration: 120 frames (2.0 seconds)
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

// Static method for easy notification display
Window_Sample.show = function(message, duration) {
    const scene = SceneManager._scene;
    if (scene && scene._sampleWindow) {
        scene._sampleWindow.showNotification(message, duration);
    }
};

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._message = "";
    this._duration = 0;
    this._fadePhase = "none"; // "in", "out", "none"
    this._fadeCounter = 0;
    this.frameVisible = false; // Hide frame for cleaner look
    this.openness = 0; // Start hidden
    this.createCustomBackground();
};

Window_Sample.prototype.createCustomBackground = function() {
    // Create a custom colored background
    this._customBg = new Sprite(new Bitmap(this.width, this.height));
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '#000000');
    this._customBg.opacity = 200;
    this.addChildToBack(this._customBg);
};

Window_Sample.prototype.showNotification = function(message, duration) {
    this._message = message;
    this._duration = duration || 120;
    this._fadePhase = "in";
    this._fadeCounter = 0;
    this.refresh();
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.updateFade();
    this.updateDuration();
};

Window_Sample.prototype.updateFade = function() {
    const fadeSpeed = 16;
    if (this._fadePhase === "in") {
        this.openness = Math.min(255, this.openness + fadeSpeed);
        if (this.openness >= 255) this._fadePhase = "none";
    } else if (this._fadePhase === "out") {
        this.openness = Math.max(0, this.openness - fadeSpeed);
        if (this.openness <= 0) this._fadePhase = "none";
    }
};

Window_Sample.prototype.updateDuration = function() {
    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {
        this._duration--;
        if (this._duration <= 0) {
            this._fadePhase = "out";
        }
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this.contents.textColor = '#ffffff';
    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');
};

// Add notification window to Scene_Map
const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Notif.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const x = (Graphics.boxWidth - 400) / 2;
    const y = 10;
    const rect = new Rectangle(x, y, 400, 60);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Call from event script or plugin:
// Window_Sample.show("Achievement Unlocked!", 180);
// Window_Sample.show("Item Obtained", 90);
// ============================================

// ==== case: type-violating: defaultDuration="abc",width=["a","b"],position="center" {"defaultDuration":"abc","width":["a","b"],"height":60,"position":"center","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"Sample"}
// rejects: Field "Default Duration (frames)" must be a number | Field "Width" must be a number
//-----------------------------------------------------------------------------
// Window_Sample
//
// A popup notification window that displays temporarily and auto-closes.
// Default duration: abc frames (NaN seconds)
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

// Static method for easy notification display
Window_Sample.show = function(message, duration) {
    const scene = SceneManager._scene;
    if (scene && scene._sampleWindow) {
        scene._sampleWindow.showNotification(message, duration);
    }
};

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._message = "";
    this._duration = 0;
    this._fadePhase = "none"; // "in", "out", "none"
    this._fadeCounter = 0;
    this.frameVisible = false; // Hide frame for cleaner look
    this.openness = 0; // Start hidden
    this.createCustomBackground();
};

Window_Sample.prototype.createCustomBackground = function() {
    // Create a custom colored background
    this._customBg = new Sprite(new Bitmap(this.width, this.height));
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '#000000');
    this._customBg.opacity = 200;
    this.addChildToBack(this._customBg);
};

Window_Sample.prototype.showNotification = function(message, duration) {
    this._message = message;
    this._duration = duration || abc;
    this._fadePhase = "in";
    this._fadeCounter = 0;
    this.refresh();
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.updateFade();
    this.updateDuration();
};

Window_Sample.prototype.updateFade = function() {
    const fadeSpeed = 16;
    if (this._fadePhase === "in") {
        this.openness = Math.min(255, this.openness + fadeSpeed);
        if (this.openness >= 255) this._fadePhase = "none";
    } else if (this._fadePhase === "out") {
        this.openness = Math.max(0, this.openness - fadeSpeed);
        if (this.openness <= 0) this._fadePhase = "none";
    }
};

Window_Sample.prototype.updateDuration = function() {
    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {
        this._duration--;
        if (this._duration <= 0) {
            this._fadePhase = "out";
        }
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this.contents.textColor = '#ffffff';
    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');
};

// Add notification window to Scene_Map
const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Notif.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const x = (Graphics.boxWidth - a,b) / 2;
    const y = (Graphics.boxHeight - 60) / 2;
    const rect = new Rectangle(x, y, a,b, 60);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Call from event script or plugin:
// Window_Sample.show("Achievement Unlocked!", 180);
// Window_Sample.show("Item Obtained", 90);
// ============================================

// ==== case: type-violating: height="abc",position="bottom" {"defaultDuration":120,"width":400,"height":"abc","position":"bottom","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"Sample"}
// rejects: Field "Height" must be a number
//-----------------------------------------------------------------------------
// Window_Sample
//
// A popup notification window that displays temporarily and auto-closes.
// Default duration: 120 frames (2.0 seconds)
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

// Static method for easy notification display
Window_Sample.show = function(message, duration) {
    const scene = SceneManager._scene;
    if (scene && scene._sampleWindow) {
        scene._sampleWindow.showNotification(message, duration);
    }
};

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._message = "";
    this._duration = 0;
    this._fadePhase = "none"; // "in", "out", "none"
    this._fadeCounter = 0;
    this.frameVisible = false; // Hide frame for cleaner look
    this.openness = 0; // Start hidden
    this.createCustomBackground();
};

Window_Sample.prototype.createCustomBackground = function() {
    // Create a custom colored background
    this._customBg = new Sprite(new Bitmap(this.width, this.height));
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '#000000');
    this._customBg.opacity = 200;
    this.addChildToBack(this._customBg);
};

Window_Sample.prototype.showNotification = function(message, duration) {
    this._message = message;
    this._duration = duration || 120;
    this._fadePhase = "in";
    this._fadeCounter = 0;
    this.refresh();
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.updateFade();
    this.updateDuration();
};

Window_Sample.prototype.updateFade = function() {
    const fadeSpeed = 16;
    if (this._fadePhase === "in") {
        this.openness = Math.min(255, this.openness + fadeSpeed);
        if (this.openness >= 255) this._fadePhase = "none";
    } else if (this._fadePhase === "out") {
        this.openness = Math.max(0, this.openness - fadeSpeed);
        if (this.openness <= 0) this._fadePhase = "none";
    }
};

Window_Sample.prototype.updateDuration = function() {
    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {
        this._duration--;
        if (this._duration <= 0) {
            this._fadePhase = "out";
        }
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this.contents.textColor = '#ffffff';
    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');
};

// Add notification window to Scene_Map
const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Notif.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const x = (Graphics.boxWidth - 400) / 2;
    const y = Graphics.boxHeight - abc - 10;
    const rect = new Rectangle(x, y, 400, abc);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Call from event script or plugin:
// Window_Sample.show("Achievement Unlocked!", 180);
// Window_Sample.show("Item Obtained", 90);
// ============================================

// ==== case: type-violating: textColor=7 {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":7,"windowName":"Sample"}
// rejects: Field "Text Color" must be text
// throws: TypeError

// ==== case: type-violating: fadeEffect="slide",height=null {"defaultDuration":120,"width":400,"height":null,"position":"top","fadeEffect":"slide","bgColor":"#000000","textColor":"#ffffff","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A popup notification window that displays temporarily and auto-closes.
// Default duration: 120 frames (2.0 seconds)
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

// Static method for easy notification display
Window_Sample.show = function(message, duration) {
    const scene = SceneManager._scene;
    if (scene && scene._sampleWindow) {
        scene._sampleWindow.showNotification(message, duration);
    }
};

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._message = "";
    this._duration = 0;
    this._fadePhase = "none"; // "in", "out", "none"
    this._fadeCounter = 0;
    this.frameVisible = false; // Hide frame for cleaner look
    this.openness = 0; // Start hidden
    this.createCustomBackground();
};

Window_Sample.prototype.createCustomBackground = function() {
    // Create a custom colored background
    this._customBg = new Sprite(new Bitmap(this.width, this.height));
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '#000000');
    this._customBg.opacity = 200;
    this.addChildToBack(this._customBg);
};

Window_Sample.prototype.showNotification = function(message, duration) {
    this._message = message;
    this._duration = duration || 120;
    this._fadePhase = "in";
    this._fadeCounter = 0;
    this.refresh();
    this.openness = 255;
    this._slideOffset = -this.height;
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.updateFade();
    this.updateDuration();
};

Window_Sample.prototype.updateFade = function() {
    const fadeSpeed = 16;
    if (this._fadePhase === "in") {
        this._slideOffset = Math.min(0, (this._slideOffset || -this.height) + 8);
        this.y = this._baseY + this._slideOffset;
        if (this._slideOffset >= 0) this._fadePhase = "none";
    } else if (this._fadePhase === "out") {
        this._slideOffset = Math.max(-this.height, (this._slideOffset || 0) - 8);
        this.y = this._baseY + this._slideOffset;
        if (this._slideOffset <= -this.height) {
            this._fadePhase = "none";
            this.openness = 0;
        }
    }
};

Window_Sample.prototype.updateDuration = function() {
    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {
        this._duration--;
        if (this._duration <= 0) {
            this._fadePhase = "out";
        }
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this.contents.textColor = '#ffffff';
    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');
};

// Add notification window to Scene_Map
const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Notif.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const x = (Graphics.boxWidth - 400) / 2;
    const y = 10;
    const rect = new Rectangle(x, y, 400, 60);
    this._sampleWindow = new Window_Sample(rect);
    this._sampleWindow._baseY = y;
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Call from event script or plugin:
// Window_Sample.show("Achievement Unlocked!", 180);
// Window_Sample.show("Item Obtained", 90);
// ============================================

// ==== case: type-violating: fadeEffect="none",width=null {"defaultDuration":120,"width":null,"height":60,"position":"top","fadeEffect":"none","bgColor":"#000000","textColor":"#ffffff","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A popup notification window that displays temporarily and auto-closes.
// Default duration: 120 frames (2.0 seconds)
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

// Static method for easy notification display
Window_Sample.show = function(message, duration) {
    const scene = SceneManager._scene;
    if (scene && scene._sampleWindow) {
        scene._sampleWindow.showNotification(message, duration);
    }
};

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._message = "";
    this._duration = 0;
    this._fadePhase = "none"; // "in", "out", "none"
    this._fadeCounter = 0;
    this.frameVisible = false; // Hide frame for cleaner look
    this.openness = 0; // Start hidden
    this.createCustomBackground();
};

Window_Sample.prototype.createCustomBackground = function() {
    // Create a custom colored background
    this._customBg = new Sprite(new Bitmap(this.width, this.height));
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '#000000');
    this._customBg.opacity = 200;
    this.addChildToBack(this._customBg);
};

Window_Sample.prototype.showNotification = function(message, duration) {
    this._message = message;
    this._duration = duration || 120;
    this._fadePhase = "in";
    this._fadeCounter = 0;
    this.refresh();
    this.openness = 255;
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.updateFade();
    this.updateDuration();
};

Window_Sample.prototype.updateFade = function() {
    const fadeSpeed = 16;
    // No fade effect
    if (this._fadePhase === "in") this._fadePhase = "none";
    if (this._fadePhase === "out") {
        this.openness = 0;
        this._fadePhase = "none";
    }
};

Window_Sample.prototype.updateDuration = function() {
    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {
        this._duration--;
        if (this._duration <= 0) {
            this._fadePhase = "out";
        }
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this.contents.textColor = '#ffffff';
    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');
};

// Add notification window to Scene_Map
const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Notif.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const x = (Graphics.boxWidth - 400) / 2;
    const y = 10;
    const rect = new Rectangle(x, y, 400, 60);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Call from event script or plugin:
// Window_Sample.show("Achievement Unlocked!", 180);
// Window_Sample.show("Item Obtained", 90);
// ============================================
