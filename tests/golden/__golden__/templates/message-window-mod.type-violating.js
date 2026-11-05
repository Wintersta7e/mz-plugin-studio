// ==== case: type-violating: wrong types {"modType":7,"positionType":7,"customX":"abc","customY":"abc","windowWidth":"abc","windowHeight":"abc","numLines":"abc","bgType":7,"bgColor":42,"opacityValue":"abc","nameBoxPosition":7}
// rejects: Field "Modification Type" must be text | Field "Position" must be text | Field "X Position" must be a number | Field "Y Position" must be a number | Field "Window Width" must be a number | Field "Window Height" must be a number | Field "Visible Lines" must be a number | Field "Background Type" must be text | Field "Background Color" must be text | Field "Opacity (0-255)" must be a number | Field "Name Box Position" must be text


// ==== case: type-violating: null {"modType":null,"positionType":null,"customX":null,"customY":null,"windowWidth":null,"windowHeight":null,"numLines":null,"bgType":null,"bgColor":null,"opacityValue":null,"nameBoxPosition":null}
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

// ==== case: type-violating: arrays {"modType":["a","b"],"positionType":["a","b"],"customX":["a","b"],"customY":["a","b"],"windowWidth":["a","b"],"windowHeight":["a","b"],"numLines":["a","b"],"bgType":["a","b"],"bgColor":["a","b"],"opacityValue":["a","b"],"nameBoxPosition":["a","b"]}
// rejects: Field "Modification Type" must be text | Field "Position" must be text | Field "X Position" must be a number | Field "Y Position" must be a number | Field "Window Width" must be a number | Field "Window Height" must be a number | Field "Visible Lines" must be a number | Field "Background Type" must be text | Field "Background Color" must be text | Field "Opacity (0-255)" must be a number | Field "Name Box Position" must be text


// ==== case: type-violating: positionType="custom",customX=null,customY="abc" {"modType":"position","positionType":"custom","customX":null,"customY":"abc","windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// rejects: Field "Y Position" must be a number
// Message Window Position Modification
// Changes the default position of the message window

const _Window_Message_updatePlacement = Window_Message.prototype.updatePlacement;
Window_Message.prototype.updatePlacement = function() {
    _Window_Message_updatePlacement.call(this);
    this.x = 0;
    this.y = abc;
};

// ==== case: type-violating: modType="size",windowWidth=null,numLines=null {"modType":"size","positionType":"top","customX":0,"customY":0,"windowWidth":null,"windowHeight":180,"numLines":null,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// rejects: Window width must be a positive number | Visible lines must be between 1 and 10
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
    rect.height = 180;
    rect.x = (Graphics.boxWidth - rect.width) / 2;
    return rect;
};

// ==== case: type-violating: modType="background",bgType=null {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":null,"bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":"center"}
// Message Window Background Modification
// Changes the visual style of the message window background

// Override the background type for all messages
const _Window_Message_setBackgroundType = Window_Message.prototype.setBackgroundType;
Window_Message.prototype.setBackgroundType = function(type) {
    // Force background type: dim
    _Window_Message_setBackgroundType.call(this, 1);
};

// ==== case: type-violating: modType="background",bgType="custom",bgColor=null {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"custom","bgColor":null,"opacityValue":255,"nameBoxPosition":"center"}
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

// ==== case: type-violating: modType="background",bgType="custom",bgColor=42 {"modType":"background","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"custom","bgColor":42,"opacityValue":255,"nameBoxPosition":"center"}
// rejects: Field "Background Color" must be text
// throws: TypeError

// ==== case: type-violating: modType="opacity",opacityValue=null {"modType":"opacity","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":null,"nameBoxPosition":"center"}
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

// ==== case: type-violating: modType="nameBox",nameBoxPosition=null {"modType":"nameBox","positionType":"top","customX":0,"customY":0,"windowWidth":816,"windowHeight":180,"numLines":4,"bgType":"dim","bgColor":"rgba(0, 0, 0, 0.6)","opacityValue":255,"nameBoxPosition":null}
// Name Box Position Modification
// Changes where the speaker name appears relative to the message window

const _Window_NameBox_updatePlacement = Window_NameBox.prototype.updatePlacement;
Window_NameBox.prototype.updatePlacement = function() {
    _Window_NameBox_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Center the name box above the message window
    this.x = messageWindow.x + (messageWindow.width - this.width) / 2;
};
