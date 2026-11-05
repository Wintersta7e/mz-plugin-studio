// ==== case: type-violating: wrong types {"windowName":42,"parentClass":7,"width":"abc","height":"abc","addToScene":7}
// rejects: Field "Window Name" must be text | Field "Parent Class" must be text | Field "Width" must be a number | Field "Height" must be a number | Field "Add to Scene" must be text
// throws: TypeError

// ==== case: type-violating: null {"windowName":null,"parentClass":null,"width":null,"height":null,"addToScene":null}
// rejects: Width must be a positive number | Height must be a positive number
// throws: TypeError

// ==== case: type-violating: arrays {"windowName":["a","b"],"parentClass":["a","b"],"width":["a","b"],"height":["a","b"],"addToScene":["a","b"]}
// rejects: Field "Window Name" must be text | Field "Parent Class" must be text | Field "Width" must be a number | Field "Height" must be a number | Field "Add to Scene" must be text
// throws: TypeError
