// ==== case: type-violating: wrong types {"commandName":42,"commandSymbol":42,"insertPosition":7,"requiresActor":"yes","enableCondition":7,"switchId":"abc"}
// rejects: Field "Command Name" must be text | Field "Command Symbol" must be text | Field "Insert Position" must be text | Field "Requires Actor Selection" must be true or false | Field "Enable Condition" must be text | Field "Switch ID" must be a number
// throws: TypeError

// ==== case: type-violating: null {"commandName":null,"commandSymbol":null,"insertPosition":null,"requiresActor":null,"enableCondition":null,"switchId":null}
// throws: TypeError

// ==== case: type-violating: arrays {"commandName":["a","b"],"commandSymbol":["a","b"],"insertPosition":["a","b"],"requiresActor":["a","b"],"enableCondition":["a","b"],"switchId":["a","b"]}
// rejects: Field "Command Name" must be text | Field "Command Symbol" must be text | Field "Insert Position" must be text | Field "Requires Actor Selection" must be true or false | Field "Enable Condition" must be text | Field "Switch ID" must be a number
// throws: TypeError
