// ==== case: type-violating: wrong types {"commandName":42,"pluginName":42,"arg1Name":42,"arg1Type":7,"arg2Name":42,"arg2Type":7}
// rejects: Field "Command Name" must be text | Field "Plugin Name" must be text | Field "Argument 1 Name" must be text | Field "Argument 1 Type" must be text | Field "Argument 2 Name" must be text | Field "Argument 2 Type" must be text
// throws: TypeError

// ==== case: type-violating: null {"commandName":null,"pluginName":null,"arg1Name":null,"arg1Type":null,"arg2Name":null,"arg2Type":null}
// throws: TypeError

// ==== case: type-violating: arrays {"commandName":["a","b"],"pluginName":["a","b"],"arg1Name":["a","b"],"arg1Type":["a","b"],"arg2Name":["a","b"],"arg2Type":["a","b"]}
// rejects: Field "Command Name" must be text | Field "Plugin Name" must be text | Field "Argument 1 Name" must be text | Field "Argument 1 Type" must be text | Field "Argument 2 Name" must be text | Field "Argument 2 Type" must be text
// throws: TypeError
