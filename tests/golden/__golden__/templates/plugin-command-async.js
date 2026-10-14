// ==== case: base {"waitType":"callback","waitDuration":60,"commandName":"Sample","pluginName":"Sample"}
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

// ==== case: waitType=setWaitMode {"waitType":"setWaitMode","waitDuration":60,"commandName":"Sample","pluginName":"Sample"}
// Async Plugin Command: Sample
// This command pauses event execution until the async operation completes

// Custom wait mode for async operation
const _Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
Game_Interpreter.prototype.updateWaitMode = function() {
    if (this._waitMode === 'Sample') {
        if (!this._SampleComplete) {
            return true; // Keep waiting
        }
        this._SampleComplete = false;
        this._waitMode = '';
        return false; // Done waiting
    }
    return _Game_Interpreter_updateWaitMode.call(this);
};

PluginManager.registerCommand('Sample', 'Sample', function(args) {
    const interpreter = this;
    interpreter.setWaitMode('Sample');

    // Your async operation here
    setTimeout(() => {
        // Simulate async work completing
        console.log('Sample async operation complete');
        interpreter._SampleComplete = true;
    }, 1000); // Example: 1 second delay
});

// ==== case: waitType=waitCount {"waitType":"waitCount","waitDuration":60,"commandName":"Sample","pluginName":"Sample"}
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

// ==== case: waitType=callback {"waitType":"callback","waitDuration":60,"commandName":"Sample","pluginName":"Sample"}
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

// ==== case: commandName=comment-space {"waitType":"callback","waitDuration":60,"commandName":"X */ globalThis.__pwn = 1; /* Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier
// Async Plugin Command: X */ globalThis.__pwn = 1; /* Y
// This command pauses event execution until the async operation completes

// Per-interpreter pending flag — keyed on the interpreter instance
const _X */ globalThis.__pwn = 1; /* YPendingKey = '_X */ globalThis.__pwn = 1; /* YPending';

// Check if the invoking interpreter should keep waiting
const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
Game_Interpreter.prototype.updateWait = function() {
    if (this[_X */ globalThis.__pwn = 1; /* YPendingKey]) {
        return true; // Keep waiting
    }
    return _Game_Interpreter_updateWait.call(this);
};

PluginManager.registerCommand('Sample', 'X */ globalThis.__pwn = 1; /* Y', function(args) {
    const interpreter = this;
    interpreter[_X */ globalThis.__pwn = 1; /* YPendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('X */ globalThis.__pwn = 1; /* Y async operation complete');
        interpreter[_X */ globalThis.__pwn = 1; /* YPendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: commandName=comment-u2028 {"waitType":"callback","waitDuration":60,"commandName":"X */\u2028globalThis.__pwn = 1; /* Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier
// Async Plugin Command: X */ globalThis.__pwn = 1; /* Y
// This command pauses event execution until the async operation completes

// Per-interpreter pending flag — keyed on the interpreter instance
const _X */ globalThis.__pwn = 1; /* YPendingKey = '_X */ globalThis.__pwn = 1; /* YPending';

// Check if the invoking interpreter should keep waiting
const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
Game_Interpreter.prototype.updateWait = function() {
    if (this[_X */ globalThis.__pwn = 1; /* YPendingKey]) {
        return true; // Keep waiting
    }
    return _Game_Interpreter_updateWait.call(this);
};

PluginManager.registerCommand('Sample', 'X */ globalThis.__pwn = 1; /* Y', function(args) {
    const interpreter = this;
    interpreter[_X */ globalThis.__pwn = 1; /* YPendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('X */ globalThis.__pwn = 1; /* Y async operation complete');
        interpreter[_X */ globalThis.__pwn = 1; /* YPendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: commandName=comment-u2029 {"waitType":"callback","waitDuration":60,"commandName":"X */\u2029globalThis.__pwn = 1; /* Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier
// Async Plugin Command: X */ globalThis.__pwn = 1; /* Y
// This command pauses event execution until the async operation completes

// Per-interpreter pending flag — keyed on the interpreter instance
const _X */ globalThis.__pwn = 1; /* YPendingKey = '_X */ globalThis.__pwn = 1; /* YPending';

// Check if the invoking interpreter should keep waiting
const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
Game_Interpreter.prototype.updateWait = function() {
    if (this[_X */ globalThis.__pwn = 1; /* YPendingKey]) {
        return true; // Keep waiting
    }
    return _Game_Interpreter_updateWait.call(this);
};

PluginManager.registerCommand('Sample', 'X */ globalThis.__pwn = 1; /* Y', function(args) {
    const interpreter = this;
    interpreter[_X */ globalThis.__pwn = 1; /* YPendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('X */ globalThis.__pwn = 1; /* Y async operation complete');
        interpreter[_X */ globalThis.__pwn = 1; /* YPendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: commandName=comment-lf {"waitType":"callback","waitDuration":60,"commandName":"X */\nglobalThis.__pwn = 1; /* Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier
// Async Plugin Command: X */
globalThis.__pwn = 1; /* Y
// This command pauses event execution until the async operation completes

// Per-interpreter pending flag — keyed on the interpreter instance
const _X */
globalThis.__pwn = 1; /* YPendingKey = '_X */
globalThis.__pwn = 1; /* YPending';

// Check if the invoking interpreter should keep waiting
const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
Game_Interpreter.prototype.updateWait = function() {
    if (this[_X */
globalThis.__pwn = 1; /* YPendingKey]) {
        return true; // Keep waiting
    }
    return _Game_Interpreter_updateWait.call(this);
};

PluginManager.registerCommand('Sample', 'X */\nglobalThis.__pwn = 1; /* Y', function(args) {
    const interpreter = this;
    interpreter[_X */
globalThis.__pwn = 1; /* YPendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('X */\nglobalThis.__pwn = 1; /* Y async operation complete');
        interpreter[_X */
globalThis.__pwn = 1; /* YPendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: commandName=quote-single {"waitType":"callback","waitDuration":60,"commandName":"X' + (globalThis.__pwn = 1) + 'Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier
// Async Plugin Command: X' + (globalThis.__pwn = 1) + 'Y
// This command pauses event execution until the async operation completes

// Per-interpreter pending flag — keyed on the interpreter instance
const _X' + (globalThis.__pwn = 1) + 'YPendingKey = '_X' + (globalThis.__pwn = 1) + 'YPending';

// Check if the invoking interpreter should keep waiting
const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
Game_Interpreter.prototype.updateWait = function() {
    if (this[_X' + (globalThis.__pwn = 1) + 'YPendingKey]) {
        return true; // Keep waiting
    }
    return _Game_Interpreter_updateWait.call(this);
};

PluginManager.registerCommand('Sample', 'X\' + (globalThis.__pwn = 1) + \'Y', function(args) {
    const interpreter = this;
    interpreter[_X' + (globalThis.__pwn = 1) + 'YPendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('X\' + (globalThis.__pwn = 1) + \'Y async operation complete');
        interpreter[_X' + (globalThis.__pwn = 1) + 'YPendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: commandName=quote-double {"waitType":"callback","waitDuration":60,"commandName":"X\" + (globalThis.__pwn = 1) + \"Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier
// Async Plugin Command: X" + (globalThis.__pwn = 1) + "Y
// This command pauses event execution until the async operation completes

// Per-interpreter pending flag — keyed on the interpreter instance
const _X" + (globalThis.__pwn = 1) + "YPendingKey = '_X" + (globalThis.__pwn = 1) + "YPending';

// Check if the invoking interpreter should keep waiting
const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
Game_Interpreter.prototype.updateWait = function() {
    if (this[_X" + (globalThis.__pwn = 1) + "YPendingKey]) {
        return true; // Keep waiting
    }
    return _Game_Interpreter_updateWait.call(this);
};

PluginManager.registerCommand('Sample', 'X" + (globalThis.__pwn = 1) + "Y', function(args) {
    const interpreter = this;
    interpreter[_X" + (globalThis.__pwn = 1) + "YPendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('X" + (globalThis.__pwn = 1) + "Y async operation complete');
        interpreter[_X" + (globalThis.__pwn = 1) + "YPendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: commandName=quote-backtick {"waitType":"callback","waitDuration":60,"commandName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","pluginName":"Sample"}
// rejects: Command name must be a valid identifier
// Async Plugin Command: X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y
// This command pauses event execution until the async operation completes

// Per-interpreter pending flag — keyed on the interpreter instance
const _X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `YPendingKey = '_X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `YPending';

// Check if the invoking interpreter should keep waiting
const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
Game_Interpreter.prototype.updateWait = function() {
    if (this[_X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `YPendingKey]) {
        return true; // Keep waiting
    }
    return _Game_Interpreter_updateWait.call(this);
};

PluginManager.registerCommand('Sample', 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', function(args) {
    const interpreter = this;
    interpreter[_X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `YPendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y async operation complete');
        interpreter[_X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `YPendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: pluginName=comment-space {"waitType":"callback","waitDuration":60,"commandName":"Sample","pluginName":"X */ globalThis.__pwn = 1; /* Y"}
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

PluginManager.registerCommand('X */ globalThis.__pwn = 1; /* Y', 'Sample', function(args) {
    const interpreter = this;
    interpreter[_SamplePendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('Sample async operation complete');
        interpreter[_SamplePendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: pluginName=comment-u2028 {"waitType":"callback","waitDuration":60,"commandName":"Sample","pluginName":"X */\u2028globalThis.__pwn = 1; /* Y"}
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

PluginManager.registerCommand('X */ globalThis.__pwn = 1; /* Y', 'Sample', function(args) {
    const interpreter = this;
    interpreter[_SamplePendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('Sample async operation complete');
        interpreter[_SamplePendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: pluginName=comment-u2029 {"waitType":"callback","waitDuration":60,"commandName":"Sample","pluginName":"X */\u2029globalThis.__pwn = 1; /* Y"}
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

PluginManager.registerCommand('X */ globalThis.__pwn = 1; /* Y', 'Sample', function(args) {
    const interpreter = this;
    interpreter[_SamplePendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('Sample async operation complete');
        interpreter[_SamplePendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: pluginName=comment-lf {"waitType":"callback","waitDuration":60,"commandName":"Sample","pluginName":"X */\nglobalThis.__pwn = 1; /* Y"}
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

PluginManager.registerCommand('X */\nglobalThis.__pwn = 1; /* Y', 'Sample', function(args) {
    const interpreter = this;
    interpreter[_SamplePendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('Sample async operation complete');
        interpreter[_SamplePendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: pluginName=quote-single {"waitType":"callback","waitDuration":60,"commandName":"Sample","pluginName":"X' + (globalThis.__pwn = 1) + 'Y"}
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

PluginManager.registerCommand('X\' + (globalThis.__pwn = 1) + \'Y', 'Sample', function(args) {
    const interpreter = this;
    interpreter[_SamplePendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('Sample async operation complete');
        interpreter[_SamplePendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: pluginName=quote-double {"waitType":"callback","waitDuration":60,"commandName":"Sample","pluginName":"X\" + (globalThis.__pwn = 1) + \"Y"}
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

PluginManager.registerCommand('X" + (globalThis.__pwn = 1) + "Y', 'Sample', function(args) {
    const interpreter = this;
    interpreter[_SamplePendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('Sample async operation complete');
        interpreter[_SamplePendingKey] = false;
    }, 1000); // Example: 1 second delay
});

// ==== case: pluginName=quote-backtick {"waitType":"callback","waitDuration":60,"commandName":"Sample","pluginName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
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

PluginManager.registerCommand('X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', 'Sample', function(args) {
    const interpreter = this;
    interpreter[_SamplePendingKey] = true;

    // Your async operation here (e.g., fetch, image loading, etc.)
    setTimeout(() => {
        // Async work complete
        console.log('Sample async operation complete');
        interpreter[_SamplePendingKey] = false;
    }, 1000); // Example: 1 second delay
});
