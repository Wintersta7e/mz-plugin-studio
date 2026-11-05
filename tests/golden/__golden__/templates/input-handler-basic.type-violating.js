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
