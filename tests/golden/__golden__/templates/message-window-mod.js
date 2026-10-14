// ==== case: base {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: modType=position {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: modType=size {"modType":"size","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Size Modification
// Changes the dimensions of the message window

Window_Message.prototype.windowWidth = function() {
    return 816;
};

Window_Message.prototype.numVisibleRows = function() {
    return 4;
};

// Update the message window rect to use new dimensions
const _Scene_Message_messageWindowRect = Scene_Message.prototype.messageWindowRect;
Scene_Message.prototype.messageWindowRect = function() {
    const rect = _Scene_Message_messageWindowRect.call(this);
    rect.width = 816;
    rect.x = (Graphics.boxWidth - rect.width) / 2;
    return rect;
};

// ==== case: modType=background {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Background Modification
// Changes the visual style of the message window background

// Override the background type for all messages
const _Window_Message_setBackgroundType = Window_Message.prototype.setBackgroundType;
Window_Message.prototype.setBackgroundType = function(type) {
    // Force background type: dim
    _Window_Message_setBackgroundType.call(this, 1);
};

// ==== case: modType=opacity {"modType":"opacity","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Opacity Modification
// Changes the transparency of the message window

const _Window_Message_initialize = Window_Message.prototype.initialize;
Window_Message.prototype.initialize = function(rect) {
    _Window_Message_initialize.call(this, rect);
    this.opacity = 255;
};

// Also apply during updates to maintain opacity
const _Window_Message_update = Window_Message.prototype.update;
Window_Message.prototype.update = function() {
    _Window_Message_update.call(this);
    this.opacity = 255;
};

// ==== case: modType=nameBox {"modType":"nameBox","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Name Box Position Modification
// Changes where the speaker name appears relative to the message window

const _Window_NameBox_updatePlacement = Window_NameBox.prototype.updatePlacement;
Window_NameBox.prototype.updatePlacement = function() {
    _Window_NameBox_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Center the name box above the message window
    this.x = messageWindow.x + (messageWindow.width - this.width) / 2;
};

// ==== case: positionType=top {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: positionType=middle {"modType":"position","positionType":"middle","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force middle position
    this.y = (Graphics.boxHeight - this.height) / 2;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: positionType=bottom {"modType":"position","positionType":"bottom","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force bottom position (default)
    this.y = Graphics.boxHeight - this.height;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: positionType=custom {"modType":"position","positionType":"custom","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

const _Window_Message_updatePlacement = Window_Message.prototype.updatePlacement;
Window_Message.prototype.updatePlacement = function() {
    _Window_Message_updatePlacement.call(this);
    this.x = 0;
    this.y = 0;
};

// ==== case: bgType=window {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"window","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: bgType=dim {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: bgType=transparent {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"transparent","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: bgType=custom {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"custom","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: bgColor=empty {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: nameBoxPosition=left {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"left"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: nameBoxPosition=center {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: nameBoxPosition=right {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"right"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: modType=background,bgType=window {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"window","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Background Modification
// Changes the visual style of the message window background

// Override the background type for all messages
const _Window_Message_setBackgroundType = Window_Message.prototype.setBackgroundType;
Window_Message.prototype.setBackgroundType = function(type) {
    // Force background type: window
    _Window_Message_setBackgroundType.call(this, 0);
};

// ==== case: modType=background,bgType=transparent {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"transparent","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Background Modification
// Changes the visual style of the message window background

// Override the background type for all messages
const _Window_Message_setBackgroundType = Window_Message.prototype.setBackgroundType;
Window_Message.prototype.setBackgroundType = function(type) {
    // Force background type: transparent
    _Window_Message_setBackgroundType.call(this, 2);
};

// ==== case: modType=background,bgType=custom {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"custom","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Background Modification
// Changes the visual style of the message window background

const _Window_Message_updateBackground = Window_Message.prototype.updateBackground;
Window_Message.prototype.updateBackground = function() {
    _Window_Message_updateBackground.call(this);
    // Apply custom background color
    if (this._dimmerSprite) {
        this._dimmerSprite.bitmap.clear();
        this._dimmerSprite.bitmap.fillRect(0, 0, this.width, this.height, 'rgba(0, 0, 0, 0.6)');
    }
};

// ==== case: modType=background,bgType=custom,bgColor=empty {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"custom","bgColor":"","opacityValue":255,"nameBoxPosition":"center"}
// rejects: Background color is required for custom background
// Message Window Background Modification
// Changes the visual style of the message window background

const _Window_Message_updateBackground = Window_Message.prototype.updateBackground;
Window_Message.prototype.updateBackground = function() {
    _Window_Message_updateBackground.call(this);
    // Apply custom background color
    if (this._dimmerSprite) {
        this._dimmerSprite.bitmap.clear();
        this._dimmerSprite.bitmap.fillRect(0, 0, this.width, this.height, 'rgba(0, 0, 0, 0.6)');
    }
};

// ==== case: modType=nameBox,nameBoxPosition=left {"modType":"nameBox","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"left"}
// Name Box Position Modification
// Changes where the speaker name appears relative to the message window

const _Window_NameBox_updatePlacement = Window_NameBox.prototype.updatePlacement;
Window_NameBox.prototype.updatePlacement = function() {
    _Window_NameBox_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Position name box on the left (default)
    this.x = messageWindow.x;
};

// ==== case: modType=nameBox,nameBoxPosition=right {"modType":"nameBox","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"right"}
// Name Box Position Modification
// Changes where the speaker name appears relative to the message window

const _Window_NameBox_updatePlacement = Window_NameBox.prototype.updatePlacement;
Window_NameBox.prototype.updatePlacement = function() {
    _Window_NameBox_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Position name box on the right
    this.x = messageWindow.x + messageWindow.width - this.width;
};

// ==== case: bgColor=comment-space {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"X */ globalThis.__pwn = 1; /* Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: bgColor=comment-u2028 {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"X */\u2028globalThis.__pwn = 1; /* Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: bgColor=comment-u2029 {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"X */\u2029globalThis.__pwn = 1; /* Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: bgColor=comment-lf {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"X */\nglobalThis.__pwn = 1; /* Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: bgColor=quote-single {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"X' + (globalThis.__pwn = 1) + 'Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: bgColor=quote-double {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"X\" + (globalThis.__pwn = 1) + \"Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: bgColor=quote-backtick {"modType":"position","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Position Modification
// Changes the default position of the message window

Window_Message.prototype.updatePlacement = function() {
    const goldWindow = this._goldWindow;
    this._positionType = $gameMessage.positionType();
    // Force top position
    this.y = 0;
    if (goldWindow) {
        goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height;
    }
};

// ==== case: modType=background,bgType=custom,bgColor=comment-space {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"custom","bgColor":"X */ globalThis.__pwn = 1; /* Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Background Modification
// Changes the visual style of the message window background

const _Window_Message_updateBackground = Window_Message.prototype.updateBackground;
Window_Message.prototype.updateBackground = function() {
    _Window_Message_updateBackground.call(this);
    // Apply custom background color
    if (this._dimmerSprite) {
        this._dimmerSprite.bitmap.clear();
        this._dimmerSprite.bitmap.fillRect(0, 0, this.width, this.height, 'X */ globalThis.__pwn = 1; /* Y');
    }
};

// ==== case: modType=background,bgType=custom,bgColor=comment-u2028 {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"custom","bgColor":"X */\u2028globalThis.__pwn = 1; /* Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Background Modification
// Changes the visual style of the message window background

const _Window_Message_updateBackground = Window_Message.prototype.updateBackground;
Window_Message.prototype.updateBackground = function() {
    _Window_Message_updateBackground.call(this);
    // Apply custom background color
    if (this._dimmerSprite) {
        this._dimmerSprite.bitmap.clear();
        this._dimmerSprite.bitmap.fillRect(0, 0, this.width, this.height, 'X */ globalThis.__pwn = 1; /* Y');
    }
};

// ==== case: modType=background,bgType=custom,bgColor=comment-u2029 {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"custom","bgColor":"X */\u2029globalThis.__pwn = 1; /* Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Background Modification
// Changes the visual style of the message window background

const _Window_Message_updateBackground = Window_Message.prototype.updateBackground;
Window_Message.prototype.updateBackground = function() {
    _Window_Message_updateBackground.call(this);
    // Apply custom background color
    if (this._dimmerSprite) {
        this._dimmerSprite.bitmap.clear();
        this._dimmerSprite.bitmap.fillRect(0, 0, this.width, this.height, 'X */ globalThis.__pwn = 1; /* Y');
    }
};

// ==== case: modType=background,bgType=custom,bgColor=comment-lf {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"custom","bgColor":"X */\nglobalThis.__pwn = 1; /* Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Background Modification
// Changes the visual style of the message window background

const _Window_Message_updateBackground = Window_Message.prototype.updateBackground;
Window_Message.prototype.updateBackground = function() {
    _Window_Message_updateBackground.call(this);
    // Apply custom background color
    if (this._dimmerSprite) {
        this._dimmerSprite.bitmap.clear();
        this._dimmerSprite.bitmap.fillRect(0, 0, this.width, this.height, 'X */\nglobalThis.__pwn = 1; /* Y');
    }
};

// ==== case: modType=background,bgType=custom,bgColor=quote-single {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"custom","bgColor":"X' + (globalThis.__pwn = 1) + 'Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Background Modification
// Changes the visual style of the message window background

const _Window_Message_updateBackground = Window_Message.prototype.updateBackground;
Window_Message.prototype.updateBackground = function() {
    _Window_Message_updateBackground.call(this);
    // Apply custom background color
    if (this._dimmerSprite) {
        this._dimmerSprite.bitmap.clear();
        this._dimmerSprite.bitmap.fillRect(0, 0, this.width, this.height, 'X\' + (globalThis.__pwn = 1) + \'Y');
    }
};

// ==== case: modType=background,bgType=custom,bgColor=quote-double {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"custom","bgColor":"X\" + (globalThis.__pwn = 1) + \"Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Background Modification
// Changes the visual style of the message window background

const _Window_Message_updateBackground = Window_Message.prototype.updateBackground;
Window_Message.prototype.updateBackground = function() {
    _Window_Message_updateBackground.call(this);
    // Apply custom background color
    if (this._dimmerSprite) {
        this._dimmerSprite.bitmap.clear();
        this._dimmerSprite.bitmap.fillRect(0, 0, this.width, this.height, 'X" + (globalThis.__pwn = 1) + "Y');
    }
};

// ==== case: modType=background,bgType=custom,bgColor=quote-backtick {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"custom","bgColor":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Background Modification
// Changes the visual style of the message window background

const _Window_Message_updateBackground = Window_Message.prototype.updateBackground;
Window_Message.prototype.updateBackground = function() {
    _Window_Message_updateBackground.call(this);
    // Apply custom background color
    if (this._dimmerSprite) {
        this._dimmerSprite.bitmap.clear();
        this._dimmerSprite.bitmap.fillRect(0, 0, this.width, this.height, 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y');
    }
};
