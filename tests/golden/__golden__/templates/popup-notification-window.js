// ==== case: base {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"Sample"}
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

// ==== case: position=top {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"Sample"}
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

// ==== case: position=center {"defaultDuration":120,"width":400,"height":60,"position":"center","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"Sample"}
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
    const y = (Graphics.boxHeight - 60) / 2;
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

// ==== case: position=bottom {"defaultDuration":120,"width":400,"height":60,"position":"bottom","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"Sample"}
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
    const y = Graphics.boxHeight - 60 - 10;
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

// ==== case: fadeEffect=none {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"none","bgColor":"#000000","textColor":"#ffffff","windowName":"Sample"}
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

// ==== case: fadeEffect=fade {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"Sample"}
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

// ==== case: fadeEffect=slide {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"slide","bgColor":"#000000","textColor":"#ffffff","windowName":"Sample"}
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

// ==== case: bgColor=empty {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"","textColor":"#ffffff","windowName":"Sample"}
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

// ==== case: textColor=empty {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"","windowName":"Sample"}
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

// ==== case: windowName=comment-space {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// A popup notification window that displays temporarily and auto-closes.
// Default duration: 120 frames (2.0 seconds)
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

// Static method for easy notification display
Window_XglobalThispwn1Y.show = function(message, duration) {
    const scene = SceneManager._scene;
    if (scene && scene._xglobalThispwn1YWindow) {
        scene._xglobalThispwn1YWindow.showNotification(message, duration);
    }
};

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._message = "";
    this._duration = 0;
    this._fadePhase = "none"; // "in", "out", "none"
    this._fadeCounter = 0;
    this.frameVisible = false; // Hide frame for cleaner look
    this.openness = 0; // Start hidden
    this.createCustomBackground();
};

Window_XglobalThispwn1Y.prototype.createCustomBackground = function() {
    // Create a custom colored background
    this._customBg = new Sprite(new Bitmap(this.width, this.height));
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '#000000');
    this._customBg.opacity = 200;
    this.addChildToBack(this._customBg);
};

Window_XglobalThispwn1Y.prototype.showNotification = function(message, duration) {
    this._message = message;
    this._duration = duration || 120;
    this._fadePhase = "in";
    this._fadeCounter = 0;
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.updateFade();
    this.updateDuration();
};

Window_XglobalThispwn1Y.prototype.updateFade = function() {
    const fadeSpeed = 16;
    if (this._fadePhase === "in") {
        this.openness = Math.min(255, this.openness + fadeSpeed);
        if (this.openness >= 255) this._fadePhase = "none";
    } else if (this._fadePhase === "out") {
        this.openness = Math.max(0, this.openness - fadeSpeed);
        if (this.openness <= 0) this._fadePhase = "none";
    }
};

Window_XglobalThispwn1Y.prototype.updateDuration = function() {
    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {
        this._duration--;
        if (this._duration <= 0) {
            this._fadePhase = "out";
        }
    }
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this.contents.textColor = '#ffffff';
    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');
};

// Add notification window to Scene_Map
const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Notif.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const x = (Graphics.boxWidth - 400) / 2;
    const y = 10;
    const rect = new Rectangle(x, y, 400, 60);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Call from event script or plugin:
// Window_XglobalThispwn1Y.show("Achievement Unlocked!", 180);
// Window_XglobalThispwn1Y.show("Item Obtained", 90);
// ============================================

// ==== case: windowName=comment-u2028 {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// A popup notification window that displays temporarily and auto-closes.
// Default duration: 120 frames (2.0 seconds)
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

// Static method for easy notification display
Window_XglobalThispwn1Y.show = function(message, duration) {
    const scene = SceneManager._scene;
    if (scene && scene._xglobalThispwn1YWindow) {
        scene._xglobalThispwn1YWindow.showNotification(message, duration);
    }
};

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._message = "";
    this._duration = 0;
    this._fadePhase = "none"; // "in", "out", "none"
    this._fadeCounter = 0;
    this.frameVisible = false; // Hide frame for cleaner look
    this.openness = 0; // Start hidden
    this.createCustomBackground();
};

Window_XglobalThispwn1Y.prototype.createCustomBackground = function() {
    // Create a custom colored background
    this._customBg = new Sprite(new Bitmap(this.width, this.height));
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '#000000');
    this._customBg.opacity = 200;
    this.addChildToBack(this._customBg);
};

Window_XglobalThispwn1Y.prototype.showNotification = function(message, duration) {
    this._message = message;
    this._duration = duration || 120;
    this._fadePhase = "in";
    this._fadeCounter = 0;
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.updateFade();
    this.updateDuration();
};

Window_XglobalThispwn1Y.prototype.updateFade = function() {
    const fadeSpeed = 16;
    if (this._fadePhase === "in") {
        this.openness = Math.min(255, this.openness + fadeSpeed);
        if (this.openness >= 255) this._fadePhase = "none";
    } else if (this._fadePhase === "out") {
        this.openness = Math.max(0, this.openness - fadeSpeed);
        if (this.openness <= 0) this._fadePhase = "none";
    }
};

Window_XglobalThispwn1Y.prototype.updateDuration = function() {
    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {
        this._duration--;
        if (this._duration <= 0) {
            this._fadePhase = "out";
        }
    }
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this.contents.textColor = '#ffffff';
    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');
};

// Add notification window to Scene_Map
const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Notif.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const x = (Graphics.boxWidth - 400) / 2;
    const y = 10;
    const rect = new Rectangle(x, y, 400, 60);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Call from event script or plugin:
// Window_XglobalThispwn1Y.show("Achievement Unlocked!", 180);
// Window_XglobalThispwn1Y.show("Item Obtained", 90);
// ============================================

// ==== case: windowName=comment-u2029 {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// A popup notification window that displays temporarily and auto-closes.
// Default duration: 120 frames (2.0 seconds)
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

// Static method for easy notification display
Window_XglobalThispwn1Y.show = function(message, duration) {
    const scene = SceneManager._scene;
    if (scene && scene._xglobalThispwn1YWindow) {
        scene._xglobalThispwn1YWindow.showNotification(message, duration);
    }
};

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._message = "";
    this._duration = 0;
    this._fadePhase = "none"; // "in", "out", "none"
    this._fadeCounter = 0;
    this.frameVisible = false; // Hide frame for cleaner look
    this.openness = 0; // Start hidden
    this.createCustomBackground();
};

Window_XglobalThispwn1Y.prototype.createCustomBackground = function() {
    // Create a custom colored background
    this._customBg = new Sprite(new Bitmap(this.width, this.height));
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '#000000');
    this._customBg.opacity = 200;
    this.addChildToBack(this._customBg);
};

Window_XglobalThispwn1Y.prototype.showNotification = function(message, duration) {
    this._message = message;
    this._duration = duration || 120;
    this._fadePhase = "in";
    this._fadeCounter = 0;
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.updateFade();
    this.updateDuration();
};

Window_XglobalThispwn1Y.prototype.updateFade = function() {
    const fadeSpeed = 16;
    if (this._fadePhase === "in") {
        this.openness = Math.min(255, this.openness + fadeSpeed);
        if (this.openness >= 255) this._fadePhase = "none";
    } else if (this._fadePhase === "out") {
        this.openness = Math.max(0, this.openness - fadeSpeed);
        if (this.openness <= 0) this._fadePhase = "none";
    }
};

Window_XglobalThispwn1Y.prototype.updateDuration = function() {
    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {
        this._duration--;
        if (this._duration <= 0) {
            this._fadePhase = "out";
        }
    }
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this.contents.textColor = '#ffffff';
    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');
};

// Add notification window to Scene_Map
const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Notif.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const x = (Graphics.boxWidth - 400) / 2;
    const y = 10;
    const rect = new Rectangle(x, y, 400, 60);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Call from event script or plugin:
// Window_XglobalThispwn1Y.show("Achievement Unlocked!", 180);
// Window_XglobalThispwn1Y.show("Item Obtained", 90);
// ============================================

// ==== case: windowName=comment-lf {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// A popup notification window that displays temporarily and auto-closes.
// Default duration: 120 frames (2.0 seconds)
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

// Static method for easy notification display
Window_XglobalThispwn1Y.show = function(message, duration) {
    const scene = SceneManager._scene;
    if (scene && scene._xglobalThispwn1YWindow) {
        scene._xglobalThispwn1YWindow.showNotification(message, duration);
    }
};

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._message = "";
    this._duration = 0;
    this._fadePhase = "none"; // "in", "out", "none"
    this._fadeCounter = 0;
    this.frameVisible = false; // Hide frame for cleaner look
    this.openness = 0; // Start hidden
    this.createCustomBackground();
};

Window_XglobalThispwn1Y.prototype.createCustomBackground = function() {
    // Create a custom colored background
    this._customBg = new Sprite(new Bitmap(this.width, this.height));
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '#000000');
    this._customBg.opacity = 200;
    this.addChildToBack(this._customBg);
};

Window_XglobalThispwn1Y.prototype.showNotification = function(message, duration) {
    this._message = message;
    this._duration = duration || 120;
    this._fadePhase = "in";
    this._fadeCounter = 0;
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.updateFade();
    this.updateDuration();
};

Window_XglobalThispwn1Y.prototype.updateFade = function() {
    const fadeSpeed = 16;
    if (this._fadePhase === "in") {
        this.openness = Math.min(255, this.openness + fadeSpeed);
        if (this.openness >= 255) this._fadePhase = "none";
    } else if (this._fadePhase === "out") {
        this.openness = Math.max(0, this.openness - fadeSpeed);
        if (this.openness <= 0) this._fadePhase = "none";
    }
};

Window_XglobalThispwn1Y.prototype.updateDuration = function() {
    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {
        this._duration--;
        if (this._duration <= 0) {
            this._fadePhase = "out";
        }
    }
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this.contents.textColor = '#ffffff';
    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');
};

// Add notification window to Scene_Map
const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Notif.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const x = (Graphics.boxWidth - 400) / 2;
    const y = 10;
    const rect = new Rectangle(x, y, 400, 60);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Call from event script or plugin:
// Window_XglobalThispwn1Y.show("Achievement Unlocked!", 180);
// Window_XglobalThispwn1Y.show("Item Obtained", 90);
// ============================================

// ==== case: windowName=quote-single {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// A popup notification window that displays temporarily and auto-closes.
// Default duration: 120 frames (2.0 seconds)
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

// Static method for easy notification display
Window_XglobalThispwn1Y.show = function(message, duration) {
    const scene = SceneManager._scene;
    if (scene && scene._xglobalThispwn1YWindow) {
        scene._xglobalThispwn1YWindow.showNotification(message, duration);
    }
};

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._message = "";
    this._duration = 0;
    this._fadePhase = "none"; // "in", "out", "none"
    this._fadeCounter = 0;
    this.frameVisible = false; // Hide frame for cleaner look
    this.openness = 0; // Start hidden
    this.createCustomBackground();
};

Window_XglobalThispwn1Y.prototype.createCustomBackground = function() {
    // Create a custom colored background
    this._customBg = new Sprite(new Bitmap(this.width, this.height));
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '#000000');
    this._customBg.opacity = 200;
    this.addChildToBack(this._customBg);
};

Window_XglobalThispwn1Y.prototype.showNotification = function(message, duration) {
    this._message = message;
    this._duration = duration || 120;
    this._fadePhase = "in";
    this._fadeCounter = 0;
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.updateFade();
    this.updateDuration();
};

Window_XglobalThispwn1Y.prototype.updateFade = function() {
    const fadeSpeed = 16;
    if (this._fadePhase === "in") {
        this.openness = Math.min(255, this.openness + fadeSpeed);
        if (this.openness >= 255) this._fadePhase = "none";
    } else if (this._fadePhase === "out") {
        this.openness = Math.max(0, this.openness - fadeSpeed);
        if (this.openness <= 0) this._fadePhase = "none";
    }
};

Window_XglobalThispwn1Y.prototype.updateDuration = function() {
    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {
        this._duration--;
        if (this._duration <= 0) {
            this._fadePhase = "out";
        }
    }
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this.contents.textColor = '#ffffff';
    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');
};

// Add notification window to Scene_Map
const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Notif.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const x = (Graphics.boxWidth - 400) / 2;
    const y = 10;
    const rect = new Rectangle(x, y, 400, 60);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Call from event script or plugin:
// Window_XglobalThispwn1Y.show("Achievement Unlocked!", 180);
// Window_XglobalThispwn1Y.show("Item Obtained", 90);
// ============================================

// ==== case: windowName=quote-double {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// A popup notification window that displays temporarily and auto-closes.
// Default duration: 120 frames (2.0 seconds)
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

// Static method for easy notification display
Window_XglobalThispwn1Y.show = function(message, duration) {
    const scene = SceneManager._scene;
    if (scene && scene._xglobalThispwn1YWindow) {
        scene._xglobalThispwn1YWindow.showNotification(message, duration);
    }
};

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._message = "";
    this._duration = 0;
    this._fadePhase = "none"; // "in", "out", "none"
    this._fadeCounter = 0;
    this.frameVisible = false; // Hide frame for cleaner look
    this.openness = 0; // Start hidden
    this.createCustomBackground();
};

Window_XglobalThispwn1Y.prototype.createCustomBackground = function() {
    // Create a custom colored background
    this._customBg = new Sprite(new Bitmap(this.width, this.height));
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '#000000');
    this._customBg.opacity = 200;
    this.addChildToBack(this._customBg);
};

Window_XglobalThispwn1Y.prototype.showNotification = function(message, duration) {
    this._message = message;
    this._duration = duration || 120;
    this._fadePhase = "in";
    this._fadeCounter = 0;
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.updateFade();
    this.updateDuration();
};

Window_XglobalThispwn1Y.prototype.updateFade = function() {
    const fadeSpeed = 16;
    if (this._fadePhase === "in") {
        this.openness = Math.min(255, this.openness + fadeSpeed);
        if (this.openness >= 255) this._fadePhase = "none";
    } else if (this._fadePhase === "out") {
        this.openness = Math.max(0, this.openness - fadeSpeed);
        if (this.openness <= 0) this._fadePhase = "none";
    }
};

Window_XglobalThispwn1Y.prototype.updateDuration = function() {
    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {
        this._duration--;
        if (this._duration <= 0) {
            this._fadePhase = "out";
        }
    }
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this.contents.textColor = '#ffffff';
    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');
};

// Add notification window to Scene_Map
const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Notif.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const x = (Graphics.boxWidth - 400) / 2;
    const y = 10;
    const rect = new Rectangle(x, y, 400, 60);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Call from event script or plugin:
// Window_XglobalThispwn1Y.show("Achievement Unlocked!", 180);
// Window_XglobalThispwn1Y.show("Item Obtained", 90);
// ============================================

// ==== case: windowName=quote-backtick {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"#ffffff","windowName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1globalThispwn1Y
//
// A popup notification window that displays temporarily and auto-closes.
// Default duration: 120 frames (2.0 seconds)
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1globalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1globalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1globalThispwn1Y.prototype.constructor = Window_XglobalThispwn1globalThispwn1Y;

// Static method for easy notification display
Window_XglobalThispwn1globalThispwn1Y.show = function(message, duration) {
    const scene = SceneManager._scene;
    if (scene && scene._xglobalThispwn1globalThispwn1YWindow) {
        scene._xglobalThispwn1globalThispwn1YWindow.showNotification(message, duration);
    }
};

Window_XglobalThispwn1globalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._message = "";
    this._duration = 0;
    this._fadePhase = "none"; // "in", "out", "none"
    this._fadeCounter = 0;
    this.frameVisible = false; // Hide frame for cleaner look
    this.openness = 0; // Start hidden
    this.createCustomBackground();
};

Window_XglobalThispwn1globalThispwn1Y.prototype.createCustomBackground = function() {
    // Create a custom colored background
    this._customBg = new Sprite(new Bitmap(this.width, this.height));
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '#000000');
    this._customBg.opacity = 200;
    this.addChildToBack(this._customBg);
};

Window_XglobalThispwn1globalThispwn1Y.prototype.showNotification = function(message, duration) {
    this._message = message;
    this._duration = duration || 120;
    this._fadePhase = "in";
    this._fadeCounter = 0;
    this.refresh();
};

Window_XglobalThispwn1globalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.updateFade();
    this.updateDuration();
};

Window_XglobalThispwn1globalThispwn1Y.prototype.updateFade = function() {
    const fadeSpeed = 16;
    if (this._fadePhase === "in") {
        this.openness = Math.min(255, this.openness + fadeSpeed);
        if (this.openness >= 255) this._fadePhase = "none";
    } else if (this._fadePhase === "out") {
        this.openness = Math.max(0, this.openness - fadeSpeed);
        if (this.openness <= 0) this._fadePhase = "none";
    }
};

Window_XglobalThispwn1globalThispwn1Y.prototype.updateDuration = function() {
    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {
        this._duration--;
        if (this._duration <= 0) {
            this._fadePhase = "out";
        }
    }
};

Window_XglobalThispwn1globalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this.contents.textColor = '#ffffff';
    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');
};

// Add notification window to Scene_Map
const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Notif.call(this);
    this.createXglobalThispwn1globalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1globalThispwn1YWindow = function() {
    const x = (Graphics.boxWidth - 400) / 2;
    const y = 10;
    const rect = new Rectangle(x, y, 400, 60);
    this._xglobalThispwn1globalThispwn1YWindow = new Window_XglobalThispwn1globalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1globalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Call from event script or plugin:
// Window_XglobalThispwn1globalThispwn1Y.show("Achievement Unlocked!", 180);
// Window_XglobalThispwn1globalThispwn1Y.show("Item Obtained", 90);
// ============================================

// ==== case: bgColor=comment-space {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"X */ globalThis.__pwn = 1; /* Y","textColor":"#ffffff","windowName":"Sample"}
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
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, 'X */ globalThis.__pwn = 1; /* Y');
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

// ==== case: bgColor=comment-u2028 {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"X */\u2028globalThis.__pwn = 1; /* Y","textColor":"#ffffff","windowName":"Sample"}
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
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, 'X */\u2028globalThis.__pwn = 1; /* Y');
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

// ==== case: bgColor=comment-u2029 {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"X */\u2029globalThis.__pwn = 1; /* Y","textColor":"#ffffff","windowName":"Sample"}
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
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, 'X */\u2029globalThis.__pwn = 1; /* Y');
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

// ==== case: bgColor=comment-lf {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"X */\nglobalThis.__pwn = 1; /* Y","textColor":"#ffffff","windowName":"Sample"}
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
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, 'X */\nglobalThis.__pwn = 1; /* Y');
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

// ==== case: bgColor=quote-single {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"X' + (globalThis.__pwn = 1) + 'Y","textColor":"#ffffff","windowName":"Sample"}
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
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, 'X\' + (globalThis.__pwn = 1) + \'Y');
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

// ==== case: bgColor=quote-double {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"X\" + (globalThis.__pwn = 1) + \"Y","textColor":"#ffffff","windowName":"Sample"}
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
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, 'X" + (globalThis.__pwn = 1) + "Y');
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

// ==== case: bgColor=quote-backtick {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","textColor":"#ffffff","windowName":"Sample"}
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
    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y');
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

// ==== case: textColor=comment-space {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"X */ globalThis.__pwn = 1; /* Y","windowName":"Sample"}
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
    this.contents.textColor = 'X */ globalThis.__pwn = 1; /* Y';
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

// ==== case: textColor=comment-u2028 {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"X */\u2028globalThis.__pwn = 1; /* Y","windowName":"Sample"}
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
    this.contents.textColor = 'X */\u2028globalThis.__pwn = 1; /* Y';
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

// ==== case: textColor=comment-u2029 {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"X */\u2029globalThis.__pwn = 1; /* Y","windowName":"Sample"}
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
    this.contents.textColor = 'X */\u2029globalThis.__pwn = 1; /* Y';
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

// ==== case: textColor=comment-lf {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"X */\nglobalThis.__pwn = 1; /* Y","windowName":"Sample"}
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
    this.contents.textColor = 'X */\nglobalThis.__pwn = 1; /* Y';
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

// ==== case: textColor=quote-single {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"X' + (globalThis.__pwn = 1) + 'Y","windowName":"Sample"}
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
    this.contents.textColor = 'X\' + (globalThis.__pwn = 1) + \'Y';
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

// ==== case: textColor=quote-double {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"X\" + (globalThis.__pwn = 1) + \"Y","windowName":"Sample"}
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
    this.contents.textColor = 'X" + (globalThis.__pwn = 1) + "Y';
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

// ==== case: textColor=quote-backtick {"defaultDuration":120,"width":400,"height":60,"position":"top","fadeEffect":"fade","bgColor":"#000000","textColor":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","windowName":"Sample"}
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
    this.contents.textColor = 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y';
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
