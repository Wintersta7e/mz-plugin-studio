// ==== case: type-violating: wrong types {"sceneName":42,"windowName":42,"windowType":7,"includeHelp":"yes","includeGold":"yes"}
// rejects: Field "Scene Name" must be text | Field "Main Window Name" must be text | Field "Window Type" must be text | Field "Include Help Window" must be true or false | Field "Include Gold Window" must be true or false
// throws: TypeError

// ==== case: type-violating: null {"sceneName":null,"windowName":null,"windowType":null,"includeHelp":null,"includeGold":null}
// throws: TypeError

// ==== case: type-violating: arrays {"sceneName":["a","b"],"windowName":["a","b"],"windowType":["a","b"],"includeHelp":["a","b"],"includeGold":["a","b"]}
// rejects: Field "Scene Name" must be text | Field "Main Window Name" must be text | Field "Window Type" must be text | Field "Include Help Window" must be true or false | Field "Include Gold Window" must be true or false
// throws: TypeError
