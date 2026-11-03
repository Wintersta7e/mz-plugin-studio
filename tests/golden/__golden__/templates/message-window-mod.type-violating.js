// ==== case: type-violating: wrong types {"modType":7,"positionType":7,"customX":"abc","customY":"abc","windowWidth":"abc","windowHeight":"abc","numLines":"abc","bgType":7,"bgColor":42,"opacityValue":"abc","nameBoxPosition":7}


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

