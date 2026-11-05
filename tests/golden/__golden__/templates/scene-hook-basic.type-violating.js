// ==== case: type-violating: wrong types {"sceneName":7,"hookPoint":7}
// rejects: Field "Scene" must be text | Field "Hook Point" must be text
// Hook: 7.7
const _7_7 = 7.prototype.7;
7.prototype.7 = function() {
    _7_7.call(this);

    // Your code here - runs when 7 7s

};

// ==== case: type-violating: null {"sceneName":null,"hookPoint":null}
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
