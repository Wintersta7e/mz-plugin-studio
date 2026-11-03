// ==== case: type-violating: wrong types {"spriteName":42,"parentClass":7,"width":"abc","height":"abc","useBitmap":7,"fillColor":42,"includeUpdate":"yes"}
// validation throws: TypeError
// throws: TypeError

// ==== case: type-violating: null {"spriteName":null,"parentClass":null,"width":null,"height":null,"useBitmap":null,"fillColor":null,"includeUpdate":null}
// rejects: Width must be a positive number | Height must be a positive number
// throws: TypeError

// ==== case: type-violating: arrays {"spriteName":["a","b"],"parentClass":["a","b"],"width":["a","b"],"height":["a","b"],"useBitmap":["a","b"],"fillColor":["a","b"],"includeUpdate":["a","b"]}
// validation throws: TypeError
// throws: TypeError
