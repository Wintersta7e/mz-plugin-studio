// ==== case: base {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1"}
// BGM Control Function: play
function customBgmControl() {
    // Play BGM with specified settings
    const bgm = {
        name: 'Theme1',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: operation=play {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1"}
// BGM Control Function: play
function customBgmControl() {
    // Play BGM with specified settings
    const bgm = {
        name: 'Theme1',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: operation=stop {"operation":"stop","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1"}
// BGM Control Function: stop
function customBgmControl() {
    // Stop currently playing BGM
    AudioManager.stopBgm();
}

// ==== case: operation=fadeOut {"operation":"fadeOut","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1"}
// BGM Control Function: fadeOut
function customBgmControl() {
    // Fade out BGM over specified duration
    const fadeOutDuration = 1; // seconds
    AudioManager.fadeOutBgm(fadeOutDuration);
}

// ==== case: operation=fadeIn {"operation":"fadeIn","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1"}
// BGM Control Function: fadeIn
function customBgmControl() {
    // Fade in BGM over specified duration
    const fadeInDuration = 1; // seconds
    AudioManager.fadeInBgm(fadeInDuration);
}

// ==== case: operation=save {"operation":"save","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1"}
// BGM Control Function: save
function customBgmControl() {
    // Save current BGM for later restoration
    // The saved BGM can be restored with AudioManager.replayBgm()
    AudioManager.saveBgm();
}

// ==== case: operation=restore {"operation":"restore","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1"}
// BGM Control Function: restore
function customBgmControl() {
    // Restore previously saved BGM
    // Make sure to call AudioManager.saveBgm() first
    AudioManager.replayBgm();
}

// ==== case: filename=empty {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":""}
// rejects: BGM filename is required for Play operation
// BGM Control Function: play
function customBgmControl() {
    // Play BGM with specified settings
    const bgm = {
        name: 'BGM_NAME',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: wrapInFunction=false {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":false,"filename":"Theme1"}
// Play BGM with specified settings
const bgm = {
    name: 'Theme1',
    volume: 90,
    pitch: 100,
    pan: 0
};
AudioManager.playBgm(bgm);

// ==== case: functionName=empty {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1","functionName":""}
// BGM Control Function: play
function customBgmControl() {
    // Play BGM with specified settings
    const bgm = {
        name: 'Theme1',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: filename=comment-space {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"X */ globalThis.__pwn = 1; /* Y"}
// BGM Control Function: play
function customBgmControl() {
    // Play BGM with specified settings
    const bgm = {
        name: 'X */ globalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: filename=comment-u2028 {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"X */\u2028globalThis.__pwn = 1; /* Y"}
// BGM Control Function: play
function customBgmControl() {
    // Play BGM with specified settings
    const bgm = {
        name: 'X */\u2028globalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: filename=comment-u2029 {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"X */\u2029globalThis.__pwn = 1; /* Y"}
// BGM Control Function: play
function customBgmControl() {
    // Play BGM with specified settings
    const bgm = {
        name: 'X */\u2029globalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: filename=comment-lf {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"X */\nglobalThis.__pwn = 1; /* Y"}
// BGM Control Function: play
function customBgmControl() {
    // Play BGM with specified settings
    const bgm = {
        name: 'X */\nglobalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: filename=quote-single {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"X' + (globalThis.__pwn = 1) + 'Y"}
// BGM Control Function: play
function customBgmControl() {
    // Play BGM with specified settings
    const bgm = {
        name: 'X\' + (globalThis.__pwn = 1) + \'Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: filename=quote-double {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"X\" + (globalThis.__pwn = 1) + \"Y"}
// BGM Control Function: play
function customBgmControl() {
    // Play BGM with specified settings
    const bgm = {
        name: 'X" + (globalThis.__pwn = 1) + "Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: filename=quote-backtick {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// BGM Control Function: play
function customBgmControl() {
    // Play BGM with specified settings
    const bgm = {
        name: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: functionName=comment-space {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1","functionName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Function name must be a valid JavaScript identifier
// BGM Control Function: play
function X */ globalThis.__pwn = 1; /* Y() {
    // Play BGM with specified settings
    const bgm = {
        name: 'Theme1',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: functionName=comment-u2028 {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1","functionName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Function name must be a valid JavaScript identifier
// BGM Control Function: play
function X */ globalThis.__pwn = 1; /* Y() {
    // Play BGM with specified settings
    const bgm = {
        name: 'Theme1',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: functionName=comment-u2029 {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1","functionName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Function name must be a valid JavaScript identifier
// BGM Control Function: play
function X */ globalThis.__pwn = 1; /* Y() {
    // Play BGM with specified settings
    const bgm = {
        name: 'Theme1',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: functionName=comment-lf {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1","functionName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Function name must be a valid JavaScript identifier
// BGM Control Function: play
function X */
globalThis.__pwn = 1; /* Y() {
    // Play BGM with specified settings
    const bgm = {
        name: 'Theme1',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: functionName=quote-single {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1","functionName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Function name must be a valid JavaScript identifier
// BGM Control Function: play
function X' + (globalThis.__pwn = 1) + 'Y() {
    // Play BGM with specified settings
    const bgm = {
        name: 'Theme1',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: functionName=quote-double {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1","functionName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Function name must be a valid JavaScript identifier
// BGM Control Function: play
function X" + (globalThis.__pwn = 1) + "Y() {
    // Play BGM with specified settings
    const bgm = {
        name: 'Theme1',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}

// ==== case: functionName=quote-backtick {"operation":"play","volume":90,"pitch":100,"pan":0,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1","functionName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Function name must be a valid JavaScript identifier
// BGM Control Function: play
function X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y() {
    // Play BGM with specified settings
    const bgm = {
        name: 'Theme1',
        volume: 90,
        pitch: 100,
        pan: 0
    };
    AudioManager.playBgm(bgm);
}
