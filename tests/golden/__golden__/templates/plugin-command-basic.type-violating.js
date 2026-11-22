// ==== case: type-violating: wrong types {"commandName":42,"pluginName":42,"arg1Name":42,"arg1Type":7,"arg2Name":42,"arg2Type":7}
// rejects: Field "Command Name" must be text | Field "Plugin Name" must be text | Field "Argument 1 Name" must be text | Field "Argument 1 Type" must be text | Field "Argument 2 Name" must be text | Field "Argument 2 Type" must be text
// throws: TypeError

// ==== case: type-violating: null {"commandName":null,"pluginName":null,"arg1Name":null,"arg1Type":null,"arg2Name":null,"arg2Type":null}
// rejects: Field "Command Name" is required | Field "Plugin Name" is required
// throws: TypeError

// ==== case: type-violating: arrays {"commandName":["a","b"],"pluginName":["a","b"],"arg1Name":["a","b"],"arg1Type":["a","b"],"arg2Name":["a","b"],"arg2Type":["a","b"]}
// rejects: Field "Command Name" must be text | Field "Plugin Name" must be text | Field "Argument 1 Name" must be text | Field "Argument 1 Type" must be text | Field "Argument 2 Name" must be text | Field "Argument 2 Type" must be text
// throws: TypeError

// ==== case: type-violating: null where not required {"commandName":"Sample","pluginName":"Sample","arg1Name":null,"arg1Type":null,"arg2Name":null,"arg2Type":null}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: type-violating: unlisted choices {"commandName":"Sample","pluginName":"Sample","arg1Type":"unlisted","arg2Type":"unlisted"}
// rejects: Field "Argument 1 Type" must be one of its choices | Field "Argument 2 Type" must be one of its choices
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: type-violating: empty text {"commandName":"","pluginName":"","arg1Name":"","arg1Type":"string","arg2Name":"","arg2Type":"number"}
// rejects: Field "Command Name" is required | Field "Plugin Name" is required
// Plugin Command: 
PluginManager.registerCommand('', '', function(args) {
    // Your command logic here
    console.log(' called');
});

// ==== case: type-violating: required fields only {"commandName":"Sample","pluginName":"Sample"}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: type-violating: arg1Name="target",arg1Type=7,arg2Name="value",arg2Type=["a","b"] {"arg1Type":7,"arg2Type":["a","b"],"commandName":"Sample","pluginName":"Sample","arg1Name":"target","arg2Name":"value"}
// rejects: Field "Argument 1 Type" must be text | Field "Argument 2 Type" must be text
// Plugin Command: Sample
// Arguments:
//   target (7) - First argument
//   value (a,b) - Second argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const target = String(args.target);
    const value = String(args.value);

    // Your command logic here
    console.log('Sample called with:', target, value);
});

// ==== case: type-violating: arg1Name="target",arg2Name=42 {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg1Name":"target","arg2Name":42}
// rejects: Field "Argument 2 Name" must be text
// throws: TypeError

// ==== case: type-violating: commandName=" ",pluginName=null {"arg1Type":"string","arg2Type":"number","commandName":" ","pluginName":null}
// rejects: Field "Plugin Name" is required | Command name is required
// throws: TypeError

// ==== case: type-violating: commandName="1st",arg1Type=null {"arg1Type":null,"arg2Type":"number","commandName":"1st","pluginName":"Sample"}
// rejects: Command name must be a valid identifier (letters, numbers, underscores, cannot start with a number)
// Plugin Command: 1st
PluginManager.registerCommand('Sample', '1st', function(args) {
    // Your command logic here
    console.log('1st called');
});

// ==== case: type-violating: pluginName=" ",arg2Type=null {"arg1Type":"string","arg2Type":null,"commandName":"Sample","pluginName":" "}
// rejects: Plugin name is required
// Plugin Command: Sample
PluginManager.registerCommand(' ', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: type-violating: commandName=null,arg1Name="target",arg1Type="number",arg2Name="data",arg2Type="json" {"arg1Type":"number","arg2Type":"json","commandName":null,"pluginName":"Sample","arg1Name":"target","arg2Name":"data"}
// rejects: Field "Command Name" is required
// Plugin Command: 
// Arguments:
//   target (number) - First argument
//   data (json) - Second argument
PluginManager.registerCommand('Sample', '', function(args) {
    // Parse arguments
    const target = Number(args.target);
    const data = JSON.parse(args.data);

    // Your command logic here
    console.log(' called with:', target, data);
});

// ==== case: type-violating: commandName=42,arg1Name="flag",arg1Type="boolean" {"arg1Type":"boolean","arg2Type":"number","commandName":42,"pluginName":"Sample","arg1Name":"flag"}
// rejects: Field "Command Name" must be text
// Plugin Command: 42
// Arguments:
//   flag (boolean) - First argument
PluginManager.registerCommand('Sample', '42', function(args) {
    // Parse arguments
    const flag = args.flag === 'true';

    // Your command logic here
    console.log('42 called with:', flag);
});

// ==== case: type-violating: arg1Name="target",arg1Type="number",arg2Name="data",arg2Type="json" {"arg1Type":"number","arg2Type":"json","commandName":"Sample","pluginName":"Sample","arg1Name":"target","arg2Name":"data"}
// Plugin Command: Sample
// Arguments:
//   target (number) - First argument
//   data (json) - Second argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const target = Number(args.target);
    const data = JSON.parse(args.data);

    // Your command logic here
    console.log('Sample called with:', target, data);
});

// ==== case: type-violating: arg1Name="flag",arg1Type="boolean" {"arg1Type":"boolean","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg1Name":"flag"}
// Plugin Command: Sample
// Arguments:
//   flag (boolean) - First argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const flag = args.flag === 'true';

    // Your command logic here
    console.log('Sample called with:', flag);
});

// ==== case: type-violating: commandName=" " {"arg1Type":"string","arg2Type":"number","commandName":" ","pluginName":"Sample"}
// rejects: Command name is required
// Plugin Command: 
PluginManager.registerCommand('Sample', '', function(args) {
    // Your command logic here
    console.log(' called');
});

// ==== case: type-violating: arg1Name="",arg2Name="" {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg1Name":"","arg2Name":""}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});
