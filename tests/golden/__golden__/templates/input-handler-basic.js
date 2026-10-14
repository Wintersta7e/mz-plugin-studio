// ==== case: base {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"q"}
// Input Handler: Q key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[81] = 'q';  // 81 = Q key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('q')) {
        // Your code here - runs when Q is pressed
        console.log('Q key pressed!');
    }
};

// ==== case: keyName=q {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"q"}
// Input Handler: Q key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[81] = 'q';  // 81 = Q key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('q')) {
        // Your code here - runs when Q is pressed
        console.log('Q key pressed!');
    }
};

// ==== case: keyName=w {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"w"}
// Input Handler: W key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[87] = 'w';  // 87 = W key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('w')) {
        // Your code here - runs when W is pressed
        console.log('W key pressed!');
    }
};

// ==== case: keyName=e {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"e"}
// Input Handler: E key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[69] = 'e';  // 69 = E key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('e')) {
        // Your code here - runs when E is pressed
        console.log('E key pressed!');
    }
};

// ==== case: keyName=r {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"r"}
// Input Handler: R key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[82] = 'r';  // 82 = R key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('r')) {
        // Your code here - runs when R is pressed
        console.log('R key pressed!');
    }
};

// ==== case: keyName=t {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"t"}
// Input Handler: T key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[84] = 't';  // 84 = T key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('t')) {
        // Your code here - runs when T is pressed
        console.log('T key pressed!');
    }
};

// ==== case: keyName=tab {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"tab"}
// Input Handler: Tab key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[9] = 'tab';  // 9 = Tab key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('tab')) {
        // Your code here - runs when Tab is pressed
        console.log('Tab key pressed!');
    }
};

// ==== case: keyName=shift {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"shift"}
// Input Handler: Shift key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[16] = 'shift';  // 16 = Shift key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('shift')) {
        // Your code here - runs when Shift is pressed
        console.log('Shift key pressed!');
    }
};

// ==== case: keyName=control {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"control"}
// Input Handler: Control key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[17] = 'control';  // 17 = Control key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('control')) {
        // Your code here - runs when Control is pressed
        console.log('Control key pressed!');
    }
};

// ==== case: keyName=pageup {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"pageup"}
// Input Handler: Page Up key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[33] = 'pageup';  // 33 = Page Up key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('pageup')) {
        // Your code here - runs when Page Up is pressed
        console.log('Page Up key pressed!');
    }
};

// ==== case: keyName=pagedown {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"pagedown"}
// Input Handler: Page Down key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[34] = 'pagedown';  // 34 = Page Down key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('pagedown')) {
        // Your code here - runs when Page Down is pressed
        console.log('Page Down key pressed!');
    }
};

// ==== case: triggerType=isTriggered {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"q"}
// Input Handler: Q key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[81] = 'q';  // 81 = Q key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('q')) {
        // Your code here - runs when Q is pressed
        console.log('Q key pressed!');
    }
};

// ==== case: triggerType=isPressed {"triggerType":"isPressed","activeScene":"Scene_Map","keyName":"q"}
// Input Handler: Q key on Scene_Map
// Triggers while held down

// Register the key mapping
Input.keyMapper[81] = 'q';  // 81 = Q key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isPressed('q')) {
        // Your code here - runs when Q is pressed
        console.log('Q key pressed!');
    }
};

// ==== case: triggerType=isRepeated {"triggerType":"isRepeated","activeScene":"Scene_Map","keyName":"q"}
// Input Handler: Q key on Scene_Map
// Triggers with repeat delay

// Register the key mapping
Input.keyMapper[81] = 'q';  // 81 = Q key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isRepeated('q')) {
        // Your code here - runs when Q is pressed
        console.log('Q key pressed!');
    }
};

// ==== case: activeScene=Scene_Map {"triggerType":"isTriggered","activeScene":"Scene_Map","keyName":"q"}
// Input Handler: Q key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[81] = 'q';  // 81 = Q key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('q')) {
        // Your code here - runs when Q is pressed
        console.log('Q key pressed!');
    }
};

// ==== case: activeScene=Scene_Battle {"triggerType":"isTriggered","activeScene":"Scene_Battle","keyName":"q"}
// Input Handler: Q key on Scene_Battle
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[81] = 'q';  // 81 = Q key code

const _Scene_Battle_update = Scene_Battle.prototype.update;
Scene_Battle.prototype.update = function() {
    _Scene_Battle_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Battle.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('q')) {
        // Your code here - runs when Q is pressed
        console.log('Q key pressed!');
    }
};

// ==== case: activeScene=Scene_Menu {"triggerType":"isTriggered","activeScene":"Scene_Menu","keyName":"q"}
// Input Handler: Q key on Scene_Menu
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[81] = 'q';  // 81 = Q key code

const _Scene_Menu_update = Scene_Menu.prototype.update;
Scene_Menu.prototype.update = function() {
    _Scene_Menu_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Menu.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('q')) {
        // Your code here - runs when Q is pressed
        console.log('Q key pressed!');
    }
};

// ==== case: activeScene=all {"triggerType":"isTriggered","activeScene":"all","keyName":"q"}
// Global Input Handler: Q key (all scenes)
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[81] = 'q';  // 81 = Q key code

// Hook Scene_Base.update for global key handling
const _Scene_Base_update_q = Scene_Base.prototype.update;
Scene_Base.prototype.update = function() {
    _Scene_Base_update_q.call(this);
    this.updateGlobalKeyInput_Q();
};

Scene_Base.prototype.updateGlobalKeyInput_Q = function() {
    if (Input.isTriggered('q')) {
        // Your code here - runs when Q is pressed in any scene
        console.log('Q key pressed!');
    }
};
