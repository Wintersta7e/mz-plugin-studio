// ==== case: type-violating: wrong types {"commandName":42,"pluginName":42,"waitType":7,"waitDuration":"abc"}
// rejects: Field "Command Name" must be text | Field "Plugin Name" must be text | Field "Wait Implementation" must be text | Field "Wait Duration (frames)" must be a number
// throws: TypeError

// ==== case: type-violating: null {"commandName":null,"pluginName":null,"waitType":null,"waitDuration":null}
// throws: TypeError

// ==== case: type-violating: arrays {"commandName":["a","b"],"pluginName":["a","b"],"waitType":["a","b"],"waitDuration":["a","b"]}
// rejects: Field "Command Name" must be text | Field "Plugin Name" must be text | Field "Wait Implementation" must be text | Field "Wait Duration (frames)" must be a number
// throws: TypeError
