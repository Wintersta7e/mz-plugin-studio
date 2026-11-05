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

