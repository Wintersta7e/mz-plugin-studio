// ==== case: type-violating: wrong types {"commandName":42,"pluginName":42,"validateActorId":"yes","validateNumberRange":"yes","minValue":"abc","maxValue":"abc","errorHandling":7}
// rejects: Field "Command Name" must be text | Field "Plugin Name" must be text | Field "Validate Actor ID" must be true or false | Field "Validate Number Range" must be true or false | Field "Minimum Value" must be a number | Field "Maximum Value" must be a number | Field "Error Handling" must be text
// throws: TypeError

// ==== case: type-violating: null {"commandName":null,"pluginName":null,"validateActorId":null,"validateNumberRange":null,"minValue":null,"maxValue":null,"errorHandling":null}
// throws: TypeError

// ==== case: type-violating: arrays {"commandName":["a","b"],"pluginName":["a","b"],"validateActorId":["a","b"],"validateNumberRange":["a","b"],"minValue":["a","b"],"maxValue":["a","b"],"errorHandling":["a","b"]}
// rejects: Field "Command Name" must be text | Field "Plugin Name" must be text | Field "Validate Actor ID" must be true or false | Field "Validate Number Range" must be true or false | Field "Minimum Value" must be a number | Field "Maximum Value" must be a number | Field "Error Handling" must be text
// throws: TypeError

// ==== case: type-violating: errorHandling="silent",pluginName=42 {"validateActorId":true,"validateNumberRange":true,"minValue":0,"maxValue":9999,"errorHandling":"silent","commandName":"Sample","pluginName":42}
// rejects: Field "Plugin Name" must be text
// throws: TypeError

// ==== case: type-violating: errorHandling="throw",pluginName=null {"validateActorId":true,"validateNumberRange":true,"minValue":0,"maxValue":9999,"errorHandling":"throw","commandName":"Sample","pluginName":null}
// throws: TypeError

// ==== case: type-violating: minValue=null,maxValue="abc" {"validateActorId":true,"validateNumberRange":true,"minValue":null,"maxValue":"abc","errorHandling":"warning","commandName":"Sample","pluginName":"Sample"}
// rejects: Field "Maximum Value" must be a number
// Plugin Command with Validation: Sample
// Includes input validation and error handling

// Error handling helper
function Sample_handleError(message) {
    console.warn('[Sample] ' + message);
    return false;
}

// Validation helper
function Sample_validate(args) {
    // Validate actor ID
    const actorId = Number(args.actorId);
    if (isNaN(actorId) || actorId < 1) {
        return Sample_handleError('Invalid actor ID: ' + args.actorId);
    }
    if (!$dataActors[actorId]) {
        return Sample_handleError('Actor not found: ' + actorId);
    }

    // Validate number range
    const value = Number(args.value);
    if (isNaN(value)) {
        return Sample_handleError('Value must be a number: ' + args.value);
    }
    if (value < 0 || value > abc) {
        return Sample_handleError('Value out of range (0-abc): ' + value);
    }

    return true; // All validations passed
}

PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Run validation
    if (!Sample_validate(args)) {
        return; // Validation failed
    }

    // Parse validated arguments
    const actorId = Number(args.actorId);
    const actor = $gameActors.actor(actorId);
    const value = Number(args.value);

    // Your command logic here
    // Example: Set a stat on the actor
    console.log('Setting value', value, 'on actor', actor.name());
    // actor.setHp(value);  // Uncomment and modify as needed
});

// ==== case: type-violating: minValue=5,maxValue=null {"validateActorId":true,"validateNumberRange":true,"minValue":5,"maxValue":null,"errorHandling":"warning","commandName":"Sample","pluginName":"Sample"}
// rejects: Minimum value cannot be greater than maximum value
// Plugin Command with Validation: Sample
// Includes input validation and error handling

// Error handling helper
function Sample_handleError(message) {
    console.warn('[Sample] ' + message);
    return false;
}

// Validation helper
function Sample_validate(args) {
    // Validate actor ID
    const actorId = Number(args.actorId);
    if (isNaN(actorId) || actorId < 1) {
        return Sample_handleError('Invalid actor ID: ' + args.actorId);
    }
    if (!$dataActors[actorId]) {
        return Sample_handleError('Actor not found: ' + actorId);
    }

    // Validate number range
    const value = Number(args.value);
    if (isNaN(value)) {
        return Sample_handleError('Value must be a number: ' + args.value);
    }
    if (value < 5 || value > 9999) {
        return Sample_handleError('Value out of range (5-9999): ' + value);
    }

    return true; // All validations passed
}

PluginManager.registerCommand('Sample', 'Sample', function(args) {
    // Run validation
    if (!Sample_validate(args)) {
        return; // Validation failed
    }

    // Parse validated arguments
    const actorId = Number(args.actorId);
    const actor = $gameActors.actor(actorId);
    const value = Number(args.value);

    // Your command logic here
    // Example: Set a stat on the actor
    console.log('Setting value', value, 'on actor', actor.name());
    // actor.setHp(value);  // Uncomment and modify as needed
});
