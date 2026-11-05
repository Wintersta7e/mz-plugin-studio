// ==== case: type-violating: wrong types {"modType":7,"choicePosition":7,"numColumns":"abc","choiceWidth":"abc","highlightColor":"abc","normalColor":"abc","disabledColor":"abc","windowOpacity":"abc","wrapAround":"yes","rememberChoice":"yes"}
// rejects: Field "Modification Type" must be text | Field "Choice Position" must be text | Field "Number of Columns" must be a number | Field "Choice Window Width" must be a number | Field "Highlight Color Index" must be a number | Field "Normal Text Color Index" must be a number | Field "Disabled Color Index" must be a number | Field "Window Opacity" must be a number | Field "Wrap Around Selection" must be true or false | Field "Remember Last Choice" must be true or false


// ==== case: type-violating: null {"modType":null,"choicePosition":null,"numColumns":null,"choiceWidth":null,"highlightColor":null,"normalColor":null,"disabledColor":null,"windowOpacity":null,"wrapAround":null,"rememberChoice":null}
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

// ==== case: type-violating: arrays {"modType":["a","b"],"choicePosition":["a","b"],"numColumns":["a","b"],"choiceWidth":["a","b"],"highlightColor":["a","b"],"normalColor":["a","b"],"disabledColor":["a","b"],"windowOpacity":["a","b"],"wrapAround":["a","b"],"rememberChoice":["a","b"]}
// rejects: Field "Modification Type" must be text | Field "Choice Position" must be text | Field "Number of Columns" must be a number | Field "Choice Window Width" must be a number | Field "Highlight Color Index" must be a number | Field "Normal Text Color Index" must be a number | Field "Disabled Color Index" must be a number | Field "Window Opacity" must be a number | Field "Wrap Around Selection" must be true or false | Field "Remember Last Choice" must be true or false


// ==== case: type-violating: modType="columns",numColumns=null,choiceWidth=null {"modType":"columns","choicePosition":"center","numColumns":null,"choiceWidth":null,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":true,"rememberChoice":false}
// rejects: Number of columns must be between 1 and 4 | Choice window width must be a positive number
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

// ==== case: type-violating: modType="style",highlightColor=null,windowOpacity=null {"modType":"style","choicePosition":"center","numColumns":2,"choiceWidth":400,"highlightColor":null,"normalColor":0,"disabledColor":8,"windowOpacity":null,"wrapAround":true,"rememberChoice":false}
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
const _Window_ChoiceList_updateBackground = Window_ChoiceList.prototype.updateBackground;
Window_ChoiceList.prototype.updateBackground = function() {
    _Window_ChoiceList_updateBackground.call(this);
    this.opacity = 255;
};

// ==== case: type-violating: modType="behavior",wrapAround=null,rememberChoice=null {"modType":"behavior","choicePosition":"center","numColumns":2,"choiceWidth":400,"highlightColor":17,"normalColor":0,"disabledColor":8,"windowOpacity":255,"wrapAround":null,"rememberChoice":null}
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

