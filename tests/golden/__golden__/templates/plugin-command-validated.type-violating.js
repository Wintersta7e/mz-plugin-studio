// ==== case: type-violating: wrong types {"commandName":42,"pluginName":42,"validateActorId":"yes","validateNumberRange":"yes","minValue":"abc","maxValue":"abc","errorHandling":7}
// rejects: Field "Command Name" must be text | Field "Plugin Name" must be text | Field "Validate Actor ID" must be true or false | Field "Validate Number Range" must be true or false | Field "Minimum Value" must be a number | Field "Maximum Value" must be a number | Field "Error Handling" must be text
// throws: TypeError

// ==== case: type-violating: null {"commandName":null,"pluginName":null,"validateActorId":null,"validateNumberRange":null,"minValue":null,"maxValue":null,"errorHandling":null}
// throws: TypeError

// ==== case: type-violating: arrays {"commandName":["a","b"],"pluginName":["a","b"],"validateActorId":["a","b"],"validateNumberRange":["a","b"],"minValue":["a","b"],"maxValue":["a","b"],"errorHandling":["a","b"]}
// rejects: Field "Command Name" must be text | Field "Plugin Name" must be text | Field "Validate Actor ID" must be true or false | Field "Validate Number Range" must be true or false | Field "Minimum Value" must be a number | Field "Maximum Value" must be a number | Field "Error Handling" must be text
// throws: TypeError
