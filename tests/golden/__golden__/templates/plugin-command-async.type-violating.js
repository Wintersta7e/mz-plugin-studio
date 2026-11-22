// ==== case: type-violating: wrong types {"commandName":42,"pluginName":42,"waitType":7,"waitDuration":"abc"}
// rejects: Field "Command Name" must be text | Field "Plugin Name" must be text | Field "Wait Implementation" must be text | Field "Wait Duration (frames)" must be a number
// throws: TypeError

// ==== case: type-violating: null {"commandName":null,"pluginName":null,"waitType":null,"waitDuration":null}
// rejects: Field "Command Name" is required | Field "Plugin Name" is required | Field "Wait Implementation" is required
// throws: TypeError

// ==== case: type-violating: arrays {"commandName":["a","b"],"pluginName":["a","b"],"waitType":["a","b"],"waitDuration":["a","b"]}
// rejects: Field "Command Name" must be text | Field "Plugin Name" must be text | Field "Wait Implementation" must be text | Field "Wait Duration (frames)" must be a number
// throws: TypeError

// ==== case: type-violating: null where not required {"commandName":"Sample","pluginName":"Sample","waitType":"callback","waitDuration":null}
// Async Plugin Command: Sample
// This command pauses event execution until the async operation completes

// Per-interpreter pending flag — keyed on the interpreter instance
const _SamplePendingKey = '_SamplePending';

// Check if the invoking interpreter should keep waiting
const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
Game_Interpreter.prototype.updateWait = function() {
    if (this[_SamplePendingKey]) {
        return true; // Keep waiting
    }
    return _Game_Interpreter_updateWait.call(this);
};

PluginManager.registerCommand('Sample', 'Sample', function(args) {
    const interpreter = this;
    interpreter[_SamplePendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('Sample async operation complete');
        interpreter[_SamplePendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: type-violating: unlisted choices {"commandName":"Sample","pluginName":"Sample","waitType":"unlisted","waitDuration":60}
// rejects: Field "Wait Implementation" must be one of its choices
// Async Plugin Command: Sample
// This command pauses event execution until the async operation completes

// Per-interpreter pending flag — keyed on the interpreter instance
const _SamplePendingKey = '_SamplePending';

// Check if the invoking interpreter should keep waiting
const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
Game_Interpreter.prototype.updateWait = function() {
    if (this[_SamplePendingKey]) {
        return true; // Keep waiting
    }
    return _Game_Interpreter_updateWait.call(this);
};

PluginManager.registerCommand('Sample', 'Sample', function(args) {
    const interpreter = this;
    interpreter[_SamplePendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('Sample async operation complete');
        interpreter[_SamplePendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: type-violating: empty text {"commandName":"","pluginName":"","waitType":"callback","waitDuration":60}
// rejects: Field "Command Name" is required | Field "Plugin Name" is required
// Async Plugin Command: 
// This command pauses event execution until the async operation completes

// Per-interpreter pending flag — keyed on the interpreter instance
const _PendingKey = '_Pending';

// Check if the invoking interpreter should keep waiting
const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
Game_Interpreter.prototype.updateWait = function() {
    if (this[_PendingKey]) {
        return true; // Keep waiting
    }
    return _Game_Interpreter_updateWait.call(this);
};

PluginManager.registerCommand('', '', function(args) {
    const interpreter = this;
    interpreter[_PendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log(' async operation complete');
        interpreter[_PendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: type-violating: required fields only {"commandName":"Sample","pluginName":"Sample","waitType":"callback"}
// Async Plugin Command: Sample
// This command pauses event execution until the async operation completes

// Per-interpreter pending flag — keyed on the interpreter instance
const _SamplePendingKey = '_SamplePending';

// Check if the invoking interpreter should keep waiting
const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
Game_Interpreter.prototype.updateWait = function() {
    if (this[_SamplePendingKey]) {
        return true; // Keep waiting
    }
    return _Game_Interpreter_updateWait.call(this);
};

PluginManager.registerCommand('Sample', 'Sample', function(args) {
    const interpreter = this;
    interpreter[_SamplePendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('Sample async operation complete');
        interpreter[_SamplePendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: type-violating: waitType="setWaitMode",pluginName=42 {"waitType":"setWaitMode","waitDuration":60,"commandName":"Sample","pluginName":42}
// rejects: Field "Plugin Name" must be text
// throws: TypeError

// ==== case: type-violating: waitType="waitCount",waitDuration=null {"waitType":"waitCount","waitDuration":null,"commandName":"Sample","pluginName":"Sample"}
// rejects: Wait duration must be at least 1 frame
// Async Plugin Command: Sample
// This command pauses event execution until the async operation completes

PluginManager.registerCommand('Sample', 'Sample', function(args) {
    const interpreter = this;

    // Wait for 60 frames (1 seconds at 60fps)
    interpreter.wait(60);

    // Your command logic here
    // Note: Code here runs immediately, wait only affects event flow
    console.log('Sample initiated 60 frame wait');
});

// ==== case: type-violating: waitType="waitCount",waitDuration="abc" {"waitType":"waitCount","waitDuration":"abc","commandName":"Sample","pluginName":"Sample"}
// rejects: Field "Wait Duration (frames)" must be a number
// Async Plugin Command: Sample
// This command pauses event execution until the async operation completes

PluginManager.registerCommand('Sample', 'Sample', function(args) {
    const interpreter = this;

    // Wait for abc frames (NaN seconds at 60fps)
    interpreter.wait(abc);

    // Your command logic here
    // Note: Code here runs immediately, wait only affects event flow
    console.log('Sample initiated abc frame wait');
});

// ==== case: type-violating: waitType="waitCount",commandName=null {"waitType":"waitCount","waitDuration":60,"commandName":null,"pluginName":"Sample"}
// rejects: Field "Command Name" is required
// Async Plugin Command: 
// This command pauses event execution until the async operation completes

PluginManager.registerCommand('Sample', '', function(args) {
    const interpreter = this;

    // Wait for 60 frames (1 seconds at 60fps)
    interpreter.wait(60);

    // Your command logic here
    // Note: Code here runs immediately, wait only affects event flow
    console.log(' initiated 60 frame wait');
});

// ==== case: type-violating: waitType="waitCount",waitDuration=0 {"waitType":"waitCount","waitDuration":0,"commandName":"Sample","pluginName":"Sample"}
// rejects: Wait duration must be at least 1 frame
// Async Plugin Command: Sample
// This command pauses event execution until the async operation completes

PluginManager.registerCommand('Sample', 'Sample', function(args) {
    const interpreter = this;

    // Wait for 60 frames (1 seconds at 60fps)
    interpreter.wait(60);

    // Your command logic here
    // Note: Code here runs immediately, wait only affects event flow
    console.log('Sample initiated 60 frame wait');
});
