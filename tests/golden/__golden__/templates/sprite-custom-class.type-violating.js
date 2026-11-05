// ==== case: type-violating: wrong types {"spriteName":42,"parentClass":7,"width":"abc","height":"abc","useBitmap":7,"fillColor":42,"includeUpdate":"yes"}
// rejects: Field "Sprite Name" must be text | Field "Parent Class" must be text | Field "Width" must be a number | Field "Height" must be a number | Field "Create Bitmap" must be text | Field "Fill Color" must be text | Field "Include Update Logic" must be true or false
// throws: TypeError

// ==== case: type-violating: null {"spriteName":null,"parentClass":null,"width":null,"height":null,"useBitmap":null,"fillColor":null,"includeUpdate":null}
// rejects: Width must be a positive number | Height must be a positive number
// throws: TypeError

// ==== case: type-violating: arrays {"spriteName":["a","b"],"parentClass":["a","b"],"width":["a","b"],"height":["a","b"],"useBitmap":["a","b"],"fillColor":["a","b"],"includeUpdate":["a","b"]}
// rejects: Field "Sprite Name" must be text | Field "Parent Class" must be text | Field "Width" must be a number | Field "Height" must be a number | Field "Create Bitmap" must be text | Field "Fill Color" must be text | Field "Include Update Logic" must be true or false
// throws: TypeError
