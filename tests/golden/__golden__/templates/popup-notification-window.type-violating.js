// ==== case: type-violating: wrong types {"windowName":42,"defaultDuration":"abc","width":"abc","height":"abc","position":7,"fadeEffect":7,"bgColor":42,"textColor":42}
// validation throws: TypeError
// throws: TypeError

// ==== case: type-violating: null {"windowName":null,"defaultDuration":null,"width":null,"height":null,"position":null,"fadeEffect":null,"bgColor":null,"textColor":null}
// rejects: Duration must be a positive number
// throws: TypeError

// ==== case: type-violating: arrays {"windowName":["a","b"],"defaultDuration":["a","b"],"width":["a","b"],"height":["a","b"],"position":["a","b"],"fadeEffect":["a","b"],"bgColor":["a","b"],"textColor":["a","b"]}
// validation throws: TypeError
// throws: TypeError
