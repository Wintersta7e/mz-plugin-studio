// ==== case: type-violating: wrong types {"windowName":42,"defaultDuration":"abc","width":"abc","height":"abc","position":7,"fadeEffect":7,"bgColor":42,"textColor":42}
// rejects: Field "Window Name" must be text | Field "Default Duration (frames)" must be a number | Field "Width" must be a number | Field "Height" must be a number | Field "Position" must be text | Field "Fade Effect" must be text | Field "Background Color" must be text | Field "Text Color" must be text
// throws: TypeError

// ==== case: type-violating: null {"windowName":null,"defaultDuration":null,"width":null,"height":null,"position":null,"fadeEffect":null,"bgColor":null,"textColor":null}
// rejects: Duration must be a positive number
// throws: TypeError

// ==== case: type-violating: arrays {"windowName":["a","b"],"defaultDuration":["a","b"],"width":["a","b"],"height":["a","b"],"position":["a","b"],"fadeEffect":["a","b"],"bgColor":["a","b"],"textColor":["a","b"]}
// rejects: Field "Window Name" must be text | Field "Default Duration (frames)" must be a number | Field "Width" must be a number | Field "Height" must be a number | Field "Position" must be text | Field "Fade Effect" must be text | Field "Background Color" must be text | Field "Text Color" must be text
// throws: TypeError
