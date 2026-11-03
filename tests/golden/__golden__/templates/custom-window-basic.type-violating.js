// ==== case: type-violating: wrong types {"windowName":42,"parentClass":7,"width":"abc","height":"abc","addToScene":7}
// validation throws: TypeError
// throws: TypeError

// ==== case: type-violating: null {"windowName":null,"parentClass":null,"width":null,"height":null,"addToScene":null}
// rejects: Width must be a positive number | Height must be a positive number
// throws: TypeError

// ==== case: type-violating: arrays {"windowName":["a","b"],"parentClass":["a","b"],"width":["a","b"],"height":["a","b"],"addToScene":["a","b"]}
// validation throws: TypeError
// throws: TypeError
