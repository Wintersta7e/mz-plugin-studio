// ==== case: type-violating: wrong types {"sceneName":7,"hookPoint":7}
// rejects: Field "Scene" must be text | Field "Hook Point" must be text
// Hook: 7.7
const _7_7 = 7.prototype.7;
7.prototype.7 = function() {
    _7_7.call(this);

    // Your code here - runs when 7 7s

};

// ==== case: type-violating: null {"sceneName":null,"hookPoint":null}
// rejects: Field "Scene" is required | Field "Hook Point" is required
// Hook: null.null
const _null_null = null.prototype.null;
null.prototype.null = function() {
    _null_null.call(this);

    // Your code here - runs when null nulls

};

// ==== case: type-violating: arrays {"sceneName":["a","b"],"hookPoint":["a","b"]}
// rejects: Field "Scene" must be text | Field "Hook Point" must be text
// Hook: a,b.a,b
const _a,b_a,b = a,b.prototype.a,b;
a,b.prototype.a,b = function() {
    _a,b_a,b.call(this);

    // Your code here - runs when a,b a,bs

};

// ==== case: type-violating: null where not required {"sceneName":"Scene_Boot","hookPoint":"start"}
// Hook: Scene_Boot.start
const _Scene_Boot_start = Scene_Boot.prototype.start;
Scene_Boot.prototype.start = function() {
    _Scene_Boot_start.call(this);

    // Your code here - runs when Scene_Boot starts

};

// ==== case: type-violating: unlisted choices {"sceneName":"unlisted","hookPoint":"unlisted"}
// rejects: Field "Scene" must be one of its choices | Field "Hook Point" must be one of its choices
// Hook: unlisted.unlisted
const _unlisted_unlisted = unlisted.prototype.unlisted;
unlisted.prototype.unlisted = function() {
    _unlisted_unlisted.call(this);

    // Your code here - runs when unlisted unlisteds

};

// ==== case: type-violating: empty text {"sceneName":"Scene_Boot","hookPoint":"start"}
// Hook: Scene_Boot.start
const _Scene_Boot_start = Scene_Boot.prototype.start;
Scene_Boot.prototype.start = function() {
    _Scene_Boot_start.call(this);

    // Your code here - runs when Scene_Boot starts

};

// ==== case: type-violating: required fields only {"sceneName":"Scene_Boot","hookPoint":"start"}
// Hook: Scene_Boot.start
const _Scene_Boot_start = Scene_Boot.prototype.start;
Scene_Boot.prototype.start = function() {
    _Scene_Boot_start.call(this);

    // Your code here - runs when Scene_Boot starts

};
