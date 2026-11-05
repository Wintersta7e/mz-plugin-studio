// ==== case: type-violating: wrong types {"className":42,"methodName":42,"timing":7,"callOriginal":"yes"}
// rejects: Field "Class" must be text | Field "Method" must be text | Field "When to run your code" must be text | Field "Call original method" must be true or false
// Alias: 42.42
const _42_42 = 42.prototype.42;
42.prototype.42 = function() {
    const result = _42_42.apply(this, arguments);
    
    // Your code here
    
    return result;
};

// ==== case: type-violating: null {"className":null,"methodName":null,"timing":null,"callOriginal":null}
// rejects: Field "Class" is required | Field "Method" is required
// Alias: null.null
const _null_null = null.prototype.null;
null.prototype.null = function() {
    const result = _null_null.apply(this, arguments);
    
    // Your code here (after original)
    
    return result;
};

// ==== case: type-violating: arrays {"className":["a","b"],"methodName":["a","b"],"timing":["a","b"],"callOriginal":["a","b"]}
// rejects: Field "Class" must be text | Field "Method" must be text | Field "When to run your code" must be text | Field "Call original method" must be true or false
// Alias: a,b.a,b
const _a,b_a,b = a,b.prototype.a,b;
a,b.prototype.a,b = function() {
    const result = _a,b_a,b.apply(this, arguments);
    
    // Your code here
    
    return result;
};
