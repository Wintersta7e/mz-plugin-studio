// ==== case: base {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"Sample"}
// Sound Effect Function: Sample
function playCustomSE() {
    // Play sound effect
    const se = {
        name: 'Sample',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: wrapInFunction=false {"volume":90,"pitch":100,"pan":0,"wrapInFunction":false,"randomizePitch":false,"pitchVariation":10,"filename":"Sample"}
// Play sound effect
const se = {
    name: 'Sample',
    volume: 90,
    pitch: 100,
    pan: 0
};
AudioManager.playSe(se);

// ==== case: functionName=empty {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"Sample","functionName":""}
// Sound Effect Function: Sample
function playCustomSE() {
    // Play sound effect
    const se = {
        name: 'Sample',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: randomizePitch=true {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":true,"pitchVariation":10,"filename":"Sample"}
// Sound Effect Function: Sample
function playCustomSE() {
    // Play SE with randomized pitch for variation
    const basePitch = 100;
    const variation = 10;
    const randomPitch = basePitch + Math.floor(Math.random() * variation * 2) - variation;
    const se = {
        name: 'Sample',
        volume: 90,
        pitch: Math.max(50, Math.min(150, randomPitch)),
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: filename=comment-space {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"X */ globalThis.__pwn = 1; /* Y"}
// Sound Effect Function: X */ globalThis.__pwn = 1; /* Y
function playCustomSE() {
    // Play sound effect
    const se = {
        name: 'X */ globalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: filename=comment-u2028 {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"X */\u2028globalThis.__pwn = 1; /* Y"}
// Sound Effect Function: X */ globalThis.__pwn = 1; /* Y
function playCustomSE() {
    // Play sound effect
    const se = {
        name: 'X */ globalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: filename=comment-u2029 {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"X */\u2029globalThis.__pwn = 1; /* Y"}
// Sound Effect Function: X */ globalThis.__pwn = 1; /* Y
function playCustomSE() {
    // Play sound effect
    const se = {
        name: 'X */ globalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: filename=comment-lf {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"X */\nglobalThis.__pwn = 1; /* Y"}
// Sound Effect Function: X */
globalThis.__pwn = 1; /* Y
function playCustomSE() {
    // Play sound effect
    const se = {
        name: 'X */\nglobalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: filename=quote-single {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"X' + (globalThis.__pwn = 1) + 'Y"}
// Sound Effect Function: X' + (globalThis.__pwn = 1) + 'Y
function playCustomSE() {
    // Play sound effect
    const se = {
        name: 'X\' + (globalThis.__pwn = 1) + \'Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: filename=quote-double {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"X\" + (globalThis.__pwn = 1) + \"Y"}
// Sound Effect Function: X" + (globalThis.__pwn = 1) + "Y
function playCustomSE() {
    // Play sound effect
    const se = {
        name: 'X" + (globalThis.__pwn = 1) + "Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: filename=quote-backtick {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// Sound Effect Function: X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y
function playCustomSE() {
    // Play sound effect
    const se = {
        name: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: functionName=comment-space {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"Sample","functionName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Function name must be a valid JavaScript identifier
// Sound Effect Function: Sample
function X */ globalThis.__pwn = 1; /* Y() {
    // Play sound effect
    const se = {
        name: 'Sample',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: functionName=comment-u2028 {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"Sample","functionName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Function name must be a valid JavaScript identifier
// Sound Effect Function: Sample
function X */ globalThis.__pwn = 1; /* Y() {
    // Play sound effect
    const se = {
        name: 'Sample',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: functionName=comment-u2029 {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"Sample","functionName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Function name must be a valid JavaScript identifier
// Sound Effect Function: Sample
function X */ globalThis.__pwn = 1; /* Y() {
    // Play sound effect
    const se = {
        name: 'Sample',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: functionName=comment-lf {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"Sample","functionName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Function name must be a valid JavaScript identifier
// Sound Effect Function: Sample
function X */
globalThis.__pwn = 1; /* Y() {
    // Play sound effect
    const se = {
        name: 'Sample',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: functionName=quote-single {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"Sample","functionName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Function name must be a valid JavaScript identifier
// Sound Effect Function: Sample
function X' + (globalThis.__pwn = 1) + 'Y() {
    // Play sound effect
    const se = {
        name: 'Sample',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: functionName=quote-double {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"Sample","functionName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Function name must be a valid JavaScript identifier
// Sound Effect Function: Sample
function X" + (globalThis.__pwn = 1) + "Y() {
    // Play sound effect
    const se = {
        name: 'Sample',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: functionName=quote-backtick {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"Sample","functionName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Function name must be a valid JavaScript identifier
// Sound Effect Function: Sample
function X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y() {
    // Play sound effect
    const se = {
        name: 'Sample',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playSe(se);
}
