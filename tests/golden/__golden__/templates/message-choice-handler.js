// ==== case: base {"modType":"position","choicePosition":"center","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":false}
// Choice Window Position Modification
// Changes where the choice window appears on screen

const _Window_ChoiceList_updatePlacement = Window_ChoiceList.prototype.updatePlacement;
Window_ChoiceList.prototype.updatePlacement = function() {
    _Window_ChoiceList_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Center on screen
    this.x = (Graphics.boxWidth - this.width) / 2;
    this.y = (Graphics.boxHeight - this.height) / 2;
};

// ==== case: modType=position {"modType":"position","choicePosition":"center","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":false}
// Choice Window Position Modification
// Changes where the choice window appears on screen

const _Window_ChoiceList_updatePlacement = Window_ChoiceList.prototype.updatePlacement;
Window_ChoiceList.prototype.updatePlacement = function() {
    _Window_ChoiceList_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Center on screen
    this.x = (Graphics.boxWidth - this.width) / 2;
    this.y = (Graphics.boxHeight - this.height) / 2;
};

// ==== case: modType=columns {"modType":"columns","choicePosition":"center","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":false}
// Choice Window Column Layout
// Displays choices in 2 column(s)

Window_ChoiceList.prototype.maxCols = function() {
    return 2;
};

Window_ChoiceList.prototype.windowWidth = function() {
    return 400;
};

// Adjust item width for multi-column layout
Window_ChoiceList.prototype.itemWidth = function() {
    return Math.floor((this.innerWidth - this.colSpacing() * (this.maxCols() - 1)) / this.maxCols());
};

// ==== case: modType=style {"modType":"style","choicePosition":"center","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":false}
// Choice Window Visual Style
// Customizes colors and appearance of the choice window

// Custom colors for choice items
Window_ChoiceList.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    const choiceName = this.commandName(index);
    const isEnabled = this.isCommandEnabled(index);
    const isSelected = index === this.index();

    // Determine text color based on state
    if (!isEnabled) {
        this.changeTextColor(ColorManager.textColor(8));
    } else if (isSelected) {
        this.changeTextColor(ColorManager.textColor(17));
    } else {
        this.changeTextColor(ColorManager.textColor(0));
    }

    this.drawText(choiceName, rect.x, rect.y, rect.width, 'left');
    this.resetTextColor();
};

// Redraw on selection change to update colors
const _Window_ChoiceList_select = Window_ChoiceList.prototype.select;
Window_ChoiceList.prototype.select = function(index) {
    const lastIndex = this.index();
    _Window_ChoiceList_select.call(this, index);
    if (lastIndex !== index) {
        this.refresh();
    }
};

// Set window opacity
const _Window_ChoiceList_initialize = Window_ChoiceList.prototype.initialize;
Window_ChoiceList.prototype.initialize = function() {
    _Window_ChoiceList_initialize.apply(this, arguments);
    this.opacity = 255;
};

// ==== case: modType=behavior {"modType":"behavior","choicePosition":"center","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":false}
// Choice Window Selection Behavior
// Customizes how choice selection works

// Default behavior - wrap-around enabled
// No modifications needed for default wrapping behavior

// ==== case: choicePosition=right {"modType":"position","choicePosition":"right","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":false}
// Choice Window Position Modification
// Changes where the choice window appears on screen

const _Window_ChoiceList_updatePlacement = Window_ChoiceList.prototype.updatePlacement;
Window_ChoiceList.prototype.updatePlacement = function() {
    _Window_ChoiceList_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Right side (default)
    this.x = messageWindow.x + messageWindow.width - this.width;
};

// ==== case: choicePosition=left {"modType":"position","choicePosition":"left","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":false}
// Choice Window Position Modification
// Changes where the choice window appears on screen

const _Window_ChoiceList_updatePlacement = Window_ChoiceList.prototype.updatePlacement;
Window_ChoiceList.prototype.updatePlacement = function() {
    _Window_ChoiceList_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Left side, aligned with message
    this.x = messageWindow.x;
};

// ==== case: choicePosition=center {"modType":"position","choicePosition":"center","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":false}
// Choice Window Position Modification
// Changes where the choice window appears on screen

const _Window_ChoiceList_updatePlacement = Window_ChoiceList.prototype.updatePlacement;
Window_ChoiceList.prototype.updatePlacement = function() {
    _Window_ChoiceList_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Center on screen
    this.x = (Graphics.boxWidth - this.width) / 2;
    this.y = (Graphics.boxHeight - this.height) / 2;
};

// ==== case: choicePosition=above {"modType":"position","choicePosition":"above","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":false}
// Choice Window Position Modification
// Changes where the choice window appears on screen

const _Window_ChoiceList_updatePlacement = Window_ChoiceList.prototype.updatePlacement;
Window_ChoiceList.prototype.updatePlacement = function() {
    _Window_ChoiceList_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Above message window
    this.x = (Graphics.boxWidth - this.width) / 2;
    this.y = messageWindow.y - this.height;
    if (this.y < 0) this.y = 0;
};

// ==== case: choicePosition=below {"modType":"position","choicePosition":"below","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":false}
// Choice Window Position Modification
// Changes where the choice window appears on screen

const _Window_ChoiceList_updatePlacement = Window_ChoiceList.prototype.updatePlacement;
Window_ChoiceList.prototype.updatePlacement = function() {
    _Window_ChoiceList_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Below message window
    this.x = (Graphics.boxWidth - this.width) / 2;
    this.y = messageWindow.y + messageWindow.height;
    if (this.y + this.height > Graphics.boxHeight) {
        this.y = Graphics.boxHeight - this.height;
    }
};

// ==== case: wrapAround=false {"modType":"position","choicePosition":"center","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":false,"rememberChoice":false}
// Choice Window Position Modification
// Changes where the choice window appears on screen

const _Window_ChoiceList_updatePlacement = Window_ChoiceList.prototype.updatePlacement;
Window_ChoiceList.prototype.updatePlacement = function() {
    _Window_ChoiceList_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Center on screen
    this.x = (Graphics.boxWidth - this.width) / 2;
    this.y = (Graphics.boxHeight - this.height) / 2;
};

// ==== case: rememberChoice=true {"modType":"position","choicePosition":"center","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":true}
// Choice Window Position Modification
// Changes where the choice window appears on screen

const _Window_ChoiceList_updatePlacement = Window_ChoiceList.prototype.updatePlacement;
Window_ChoiceList.prototype.updatePlacement = function() {
    _Window_ChoiceList_updatePlacement.call(this);
    const messageWindow = this._messageWindow;

    // Center on screen
    this.x = (Graphics.boxWidth - this.width) / 2;
    this.y = (Graphics.boxHeight - this.height) / 2;
};

// ==== case: modType=behavior,wrapAround=false {"modType":"behavior","choicePosition":"center","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":false,"rememberChoice":false}
// Choice Window Selection Behavior
// Customizes how choice selection works

// Disable wrap-around selection
Window_ChoiceList.prototype.cursorDown = function(wrap) {
    const index = this.index();
    const maxItems = this.maxItems();
    const maxCols = this.maxCols();
    if (index < maxItems - maxCols) {
        this.smoothSelect(index + maxCols);
    }
};

Window_ChoiceList.prototype.cursorUp = function(wrap) {
    const index = this.index();
    const maxCols = this.maxCols();
    if (index >= maxCols) {
        this.smoothSelect(index - maxCols);
    }
};


// ==== case: modType=behavior,rememberChoice=true {"modType":"behavior","choicePosition":"center","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":true}
// Choice Window Selection Behavior
// Customizes how choice selection works

// Remember last selected choice
(function() {
    let _lastChoiceIndex = 0;

    const _Window_ChoiceList_start = Window_ChoiceList.prototype.start;
    Window_ChoiceList.prototype.start = function() {
        _Window_ChoiceList_start.call(this);
        // Restore last choice if valid
        if (_lastChoiceIndex < this.maxItems()) {
            this.select(_lastChoiceIndex);
        }
    };

    const _Window_ChoiceList_callOkHandler = Window_ChoiceList.prototype.callOkHandler;
    Window_ChoiceList.prototype.callOkHandler = function() {
        _lastChoiceIndex = this.index();
        _Window_ChoiceList_callOkHandler.call(this);
    };
})();
