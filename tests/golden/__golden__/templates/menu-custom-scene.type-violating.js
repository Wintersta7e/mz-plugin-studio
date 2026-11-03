// ==== case: type-violating: wrong types {"sceneName":42,"windowName":42,"windowType":7,"includeHelp":"yes","includeGold":"yes"}
// rejects: Scene name must be a valid JavaScript identifier (letters, numbers, underscores, cannot start with a number) | Window name must be a valid JavaScript identifier
// throws: TypeError

// ==== case: type-violating: null {"sceneName":null,"windowName":null,"windowType":null,"includeHelp":null,"includeGold":null}
// throws: TypeError

// ==== case: type-violating: arrays {"sceneName":["a","b"],"windowName":["a","b"],"windowType":["a","b"],"includeHelp":["a","b"],"includeGold":["a","b"]}
// rejects: Scene name must be a valid JavaScript identifier (letters, numbers, underscores, cannot start with a number) | Window name must be a valid JavaScript identifier
// throws: TypeError
