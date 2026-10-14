// ==== case: base {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample"}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: arg1Name=empty {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg1Name":""}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: arg1Type=string {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample"}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: arg1Type=number {"arg1Type":"number","arg2Type":"number","commandName":"Sample","pluginName":"Sample"}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: arg1Type=boolean {"arg1Type":"boolean","arg2Type":"number","commandName":"Sample","pluginName":"Sample"}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: arg1Type=json {"arg1Type":"json","arg2Type":"number","commandName":"Sample","pluginName":"Sample"}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: arg2Name=empty {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg2Name":""}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: arg2Type=string {"arg1Type":"string","arg2Type":"string","commandName":"Sample","pluginName":"Sample"}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: arg2Type=number {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample"}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: arg2Type=boolean {"arg1Type":"string","arg2Type":"boolean","commandName":"Sample","pluginName":"Sample"}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: arg2Type=json {"arg1Type":"string","arg2Type":"json","commandName":"Sample","pluginName":"Sample"}
// Plugin Command: Sample
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: commandName=comment-space {"arg1Type":"string","arg2Type":"number","commandName":"X */ globalThis.__pwn = 1; /* Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier (letters, numbers, underscores, cannot start with a number)
// Plugin Command: X */ globalThis.__pwn = 1; /* Y
PluginManager.registerCommand('Sample', 'X */ globalThis.__pwn = 1; /* Y', function(args) {
    // Your command logic here
    console.log('X */ globalThis.__pwn = 1; /* Y called');
});

// ==== case: commandName=comment-u2028 {"arg1Type":"string","arg2Type":"number","commandName":"X */\u2028globalThis.__pwn = 1; /* Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier (letters, numbers, underscores, cannot start with a number)
// Plugin Command: X */ globalThis.__pwn = 1; /* Y
PluginManager.registerCommand('Sample', 'X */\u2028globalThis.__pwn = 1; /* Y', function(args) {
    // Your command logic here
    console.log('X */\u2028globalThis.__pwn = 1; /* Y called');
});

// ==== case: commandName=comment-u2029 {"arg1Type":"string","arg2Type":"number","commandName":"X */\u2029globalThis.__pwn = 1; /* Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier (letters, numbers, underscores, cannot start with a number)
// Plugin Command: X */ globalThis.__pwn = 1; /* Y
PluginManager.registerCommand('Sample', 'X */\u2029globalThis.__pwn = 1; /* Y', function(args) {
    // Your command logic here
    console.log('X */\u2029globalThis.__pwn = 1; /* Y called');
});

// ==== case: commandName=comment-lf {"arg1Type":"string","arg2Type":"number","commandName":"X */\nglobalThis.__pwn = 1; /* Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier (letters, numbers, underscores, cannot start with a number)
// Plugin Command: X */
globalThis.__pwn = 1; /* Y
PluginManager.registerCommand('Sample', 'X */\nglobalThis.__pwn = 1; /* Y', function(args) {
    // Your command logic here
    console.log('X */\nglobalThis.__pwn = 1; /* Y called');
});

// ==== case: commandName=quote-single {"arg1Type":"string","arg2Type":"number","commandName":"X' + (globalThis.__pwn = 1) + 'Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier (letters, numbers, underscores, cannot start with a number)
// Plugin Command: X' + (globalThis.__pwn = 1) + 'Y
PluginManager.registerCommand('Sample', 'X\' + (globalThis.__pwn = 1) + \'Y', function(args) {
    // Your command logic here
    console.log('X\' + (globalThis.__pwn = 1) + \'Y called');
});

// ==== case: commandName=quote-double {"arg1Type":"string","arg2Type":"number","commandName":"X\" + (globalThis.__pwn = 1) + \"Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier (letters, numbers, underscores, cannot start with a number)
// Plugin Command: X" + (globalThis.__pwn = 1) + "Y
PluginManager.registerCommand('Sample', 'X" + (globalThis.__pwn = 1) + "Y', function(args) {
    // Your command logic here
    console.log('X" + (globalThis.__pwn = 1) + "Y called');
});

// ==== case: commandName=quote-backtick {"arg1Type":"string","arg2Type":"number","commandName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier (letters, numbers, underscores, cannot start with a number)
// Plugin Command: X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y
PluginManager.registerCommand('Sample', 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', function(args) {
    // Your command logic here
    console.log('X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y called');
});

// ==== case: pluginName=comment-space {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"X */ globalThis.__pwn = 1; /* Y"}
// Plugin Command: Sample
PluginManager.registerCommand('X */ globalThis.__pwn = 1; /* Y', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: pluginName=comment-u2028 {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// Plugin Command: Sample
PluginManager.registerCommand('X */\u2028globalThis.__pwn = 1; /* Y', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: pluginName=comment-u2029 {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// Plugin Command: Sample
PluginManager.registerCommand('X */\u2029globalThis.__pwn = 1; /* Y', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: pluginName=comment-lf {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"X */\nglobalThis.__pwn = 1; /* Y"}
// Plugin Command: Sample
PluginManager.registerCommand('X */\nglobalThis.__pwn = 1; /* Y', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: pluginName=quote-single {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"X' + (globalThis.__pwn = 1) + 'Y"}
// Plugin Command: Sample
PluginManager.registerCommand('X\' + (globalThis.__pwn = 1) + \'Y', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: pluginName=quote-double {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// Plugin Command: Sample
PluginManager.registerCommand('X" + (globalThis.__pwn = 1) + "Y', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: pluginName=quote-backtick {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// Plugin Command: Sample
PluginManager.registerCommand('X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', 'Sample', function(args) {
    // Your command logic here
    console.log('Sample called');
});

// ==== case: arg1Name=comment-space {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg1Name":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Argument 1 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X */ globalThis.__pwn = 1; /* Y (string) - First argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X */ globalThis.__pwn = 1; /* Y = String(args.X */ globalThis.__pwn = 1; /* Y);

    // Your command logic here
    console.log('Sample called with:', X */ globalThis.__pwn = 1; /* Y);
});

// ==== case: arg1Name=comment-u2028 {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg1Name":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Argument 1 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X */ globalThis.__pwn = 1; /* Y (string) - First argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X */ globalThis.__pwn = 1; /* Y = String(args.X */ globalThis.__pwn = 1; /* Y);

    // Your command logic here
    console.log('Sample called with:', X */ globalThis.__pwn = 1; /* Y);
});

// ==== case: arg1Name=comment-u2029 {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg1Name":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Argument 1 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X */ globalThis.__pwn = 1; /* Y (string) - First argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X */ globalThis.__pwn = 1; /* Y = String(args.X */ globalThis.__pwn = 1; /* Y);

    // Your command logic here
    console.log('Sample called with:', X */ globalThis.__pwn = 1; /* Y);
});

// ==== case: arg1Name=comment-lf {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg1Name":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Argument 1 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X */
globalThis.__pwn = 1; /* Y (string) - First argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X */
globalThis.__pwn = 1; /* Y = String(args.X */
globalThis.__pwn = 1; /* Y);

    // Your command logic here
    console.log('Sample called with:', X */
globalThis.__pwn = 1; /* Y);
});

// ==== case: arg1Name=quote-single {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg1Name":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Argument 1 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X' + (globalThis.__pwn = 1) + 'Y (string) - First argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X' + (globalThis.__pwn = 1) + 'Y = String(args.X' + (globalThis.__pwn = 1) + 'Y);

    // Your command logic here
    console.log('Sample called with:', X' + (globalThis.__pwn = 1) + 'Y);
});

// ==== case: arg1Name=quote-double {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg1Name":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Argument 1 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X" + (globalThis.__pwn = 1) + "Y (string) - First argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X" + (globalThis.__pwn = 1) + "Y = String(args.X" + (globalThis.__pwn = 1) + "Y);

    // Your command logic here
    console.log('Sample called with:', X" + (globalThis.__pwn = 1) + "Y);
});

// ==== case: arg1Name=quote-backtick {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg1Name":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Argument 1 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y (string) - First argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = String(args.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y);

    // Your command logic here
    console.log('Sample called with:', X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y);
});

// ==== case: arg2Name=comment-space {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg2Name":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Argument 2 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X */ globalThis.__pwn = 1; /* Y (number) - Second argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X */ globalThis.__pwn = 1; /* Y = Number(args.X */ globalThis.__pwn = 1; /* Y);

    // Your command logic here
    console.log('Sample called with:', X */ globalThis.__pwn = 1; /* Y);
});

// ==== case: arg2Name=comment-u2028 {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg2Name":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Argument 2 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X */ globalThis.__pwn = 1; /* Y (number) - Second argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X */ globalThis.__pwn = 1; /* Y = Number(args.X */ globalThis.__pwn = 1; /* Y);

    // Your command logic here
    console.log('Sample called with:', X */ globalThis.__pwn = 1; /* Y);
});

// ==== case: arg2Name=comment-u2029 {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg2Name":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Argument 2 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X */ globalThis.__pwn = 1; /* Y (number) - Second argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X */ globalThis.__pwn = 1; /* Y = Number(args.X */ globalThis.__pwn = 1; /* Y);

    // Your command logic here
    console.log('Sample called with:', X */ globalThis.__pwn = 1; /* Y);
});

// ==== case: arg2Name=comment-lf {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg2Name":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Argument 2 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X */
globalThis.__pwn = 1; /* Y (number) - Second argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X */
globalThis.__pwn = 1; /* Y = Number(args.X */
globalThis.__pwn = 1; /* Y);

    // Your command logic here
    console.log('Sample called with:', X */
globalThis.__pwn = 1; /* Y);
});

// ==== case: arg2Name=quote-single {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg2Name":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Argument 2 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X' + (globalThis.__pwn = 1) + 'Y (number) - Second argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X' + (globalThis.__pwn = 1) + 'Y = Number(args.X' + (globalThis.__pwn = 1) + 'Y);

    // Your command logic here
    console.log('Sample called with:', X' + (globalThis.__pwn = 1) + 'Y);
});

// ==== case: arg2Name=quote-double {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg2Name":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Argument 2 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X" + (globalThis.__pwn = 1) + "Y (number) - Second argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X" + (globalThis.__pwn = 1) + "Y = Number(args.X" + (globalThis.__pwn = 1) + "Y);

    // Your command logic here
    console.log('Sample called with:', X" + (globalThis.__pwn = 1) + "Y);
});

// ==== case: arg2Name=quote-backtick {"arg1Type":"string","arg2Type":"number","commandName":"Sample","pluginName":"Sample","arg2Name":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Argument 2 name must be a valid identifier
// Plugin Command: Sample
// Arguments:
//   X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y (number) - Second argument
PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Parse arguments
    const X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = Number(args.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y);

    // Your command logic here
    console.log('Sample called with:', X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y);
});
