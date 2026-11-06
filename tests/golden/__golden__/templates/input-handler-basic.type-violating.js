// ==== case: type-violating: wrong types {"keyName":7,"triggerType":7,"activeScene":7}
// rejects: Field "Key" must be text | Field "Trigger Type" must be text | Field "Active Scene" must be text
// Input Handler: undefined key on 7
// Triggers undefined

// Register the key mapping
Input.keyMapper[undefined] = '7';  // undefined = undefined key code

const _7_update = 7.prototype.update;
7.prototype.update = function() {
    _7_update.call(this);
    this.updateCustomKeyInput();
};

7.prototype.updateCustomKeyInput = function() {
    if (Input.7('7')) {
        // Your code here - runs when undefined is pressed
        console.log('undefined key pressed!');
    }
};

// ==== case: type-violating: null {"keyName":null,"triggerType":null,"activeScene":null}
// rejects: Field "Key" is required
// Input Handler: undefined key on Scene_Map
// Triggers once when pressed

// Register the key mapping
Input.keyMapper[undefined] = 'null';  // undefined = undefined key code

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Map.prototype.updateCustomKeyInput = function() {
    if (Input.isTriggered('null')) {
        // Your code here - runs when undefined is pressed
        console.log('undefined key pressed!');
    }
};

// ==== case: type-violating: arrays {"keyName":["a","b"],"triggerType":["a","b"],"activeScene":["a","b"]}
// rejects: Field "Key" must be text | Field "Trigger Type" must be text | Field "Active Scene" must be text
// Input Handler: undefined key on a,b
// Triggers undefined

// Register the key mapping
Input.keyMapper[undefined] = 'a,b';  // undefined = undefined key code

const _a,b_update = a,b.prototype.update;
a,b.prototype.update = function() {
    _a,b_update.call(this);
    this.updateCustomKeyInput();
};

a,b.prototype.updateCustomKeyInput = function() {
    if (Input.a,b('a,b')) {
        // Your code here - runs when undefined is pressed
        console.log('undefined key pressed!');
    }
};

// ==== case: type-violating: activeScene="all",triggerType=null {"triggerType":null,"activeScene":"all","keyName":"q"}
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

// ==== case: type-violating: activeScene="all",keyName=null {"triggerType":"isTriggered","activeScene":"all","keyName":null}
// rejects: Field "Key" is required
// throws: TypeError

// ==== case: type-violating: keyName="zz",triggerType="isHeld",activeScene="Scene_Title" {"triggerType":"isHeld","activeScene":"Scene_Title","keyName":"zz"}
// rejects: Field "Key" must be one of its choices | Field "Trigger Type" must be one of its choices | Field "Active Scene" must be one of its choices | Unknown key: zz | Invalid trigger type: isHeld | Invalid scene: Scene_Title
// Input Handler: undefined key on Scene_Title
// Triggers undefined

// Register the key mapping
Input.keyMapper[undefined] = 'zz';  // undefined = undefined key code

const _Scene_Title_update = Scene_Title.prototype.update;
Scene_Title.prototype.update = function() {
    _Scene_Title_update.call(this);
    this.updateCustomKeyInput();
};

Scene_Title.prototype.updateCustomKeyInput = function() {
    if (Input.isHeld('zz')) {
        // Your code here - runs when undefined is pressed
        console.log('undefined key pressed!');
    }
};
