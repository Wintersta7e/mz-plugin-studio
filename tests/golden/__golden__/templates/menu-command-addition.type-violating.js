// ==== case: type-violating: wrong types {"commandName":42,"commandSymbol":42,"insertPosition":7,"requiresActor":"yes","enableCondition":7,"switchId":"abc"}
// rejects: Command symbol must be a valid JavaScript identifier
// throws: TypeError

// ==== case: type-violating: null {"commandName":null,"commandSymbol":null,"insertPosition":null,"requiresActor":null,"enableCondition":null,"switchId":null}
// throws: TypeError

// ==== case: type-violating: arrays {"commandName":["a","b"],"commandSymbol":["a","b"],"insertPosition":["a","b"],"requiresActor":["a","b"],"enableCondition":["a","b"],"switchId":["a","b"]}
// rejects: Command symbol must be a valid JavaScript identifier
// throws: TypeError
