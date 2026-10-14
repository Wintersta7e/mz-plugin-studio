// ==== case: base {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: crossfadeType=crossfade {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: crossfadeType=fadeToSilence {"crossfadeType":"fadeToSilence","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2"}
// Fade to Silence Function
function crossfadeBgm() {
    // Fade current BGM to silence
    const fadeOutDuration = 2; // seconds
    AudioManager.fadeOutBgm(fadeOutDuration);
}

// ==== case: crossfadeType=fadeFromSilence {"crossfadeType":"fadeFromSilence","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2"}
// rejects: BGM filename is required for fade from silence
// Fade from Silence Function
function crossfadeBgm() {
    // Fade in BGM from silence
    const fadeInDuration = 2; // seconds

    // Define the BGM settings
    const bgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Start playing at zero volume
    const tempBgm = Object.assign({}, bgm, { volume: 0 });
    AudioManager.playBgm(tempBgm);

    // Fade in to target volume
    AudioManager.fadeInBgm(fadeInDuration);
}

// ==== case: newBgmFilename=empty {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":""}
// rejects: New BGM filename is required for crossfade
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'NEW_BGM_NAME',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: fadeFromSilenceBgm=empty {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","fadeFromSilenceBgm":""}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: wrapInFunction=false {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":false,"newBgmFilename":"Theme2"}
// Crossfade: Fade out current BGM, then play and fade in new BGM
const fadeOutDuration = 2; // seconds
const fadeInDuration = 2; // seconds

// Define the new BGM settings
const newBgm = {
    name: 'Theme2',
    volume: 90,
    pitch: 100,
    pan: 0
};

// Fade out current BGM
AudioManager.fadeOutBgm(fadeOutDuration);

// Schedule the new BGM to play after fade out completes
setTimeout(function() {
    // Play new BGM at zero volume initially
    const tempBgm = Object.assign({}, newBgm, { volume: 0 });
    AudioManager.playBgm(tempBgm);
    // Fade in to target volume
    AudioManager.fadeInBgm(fadeInDuration);
}, fadeOutDuration * 1000);

// ==== case: functionName=empty {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","functionName":""}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: newBgmFilename=comment-space {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"X */ globalThis.__pwn = 1; /* Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'X */ globalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: newBgmFilename=comment-u2028 {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"X */\u2028globalThis.__pwn = 1; /* Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'X */\u2028globalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: newBgmFilename=comment-u2029 {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"X */\u2029globalThis.__pwn = 1; /* Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'X */\u2029globalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: newBgmFilename=comment-lf {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"X */\nglobalThis.__pwn = 1; /* Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'X */\nglobalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: newBgmFilename=quote-single {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"X' + (globalThis.__pwn = 1) + 'Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'X\' + (globalThis.__pwn = 1) + \'Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: newBgmFilename=quote-double {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"X\" + (globalThis.__pwn = 1) + \"Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'X" + (globalThis.__pwn = 1) + "Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: newBgmFilename=quote-backtick {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: fadeFromSilenceBgm=comment-space {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","fadeFromSilenceBgm":"X */ globalThis.__pwn = 1; /* Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: fadeFromSilenceBgm=comment-u2028 {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","fadeFromSilenceBgm":"X */\u2028globalThis.__pwn = 1; /* Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: fadeFromSilenceBgm=comment-u2029 {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","fadeFromSilenceBgm":"X */\u2029globalThis.__pwn = 1; /* Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: fadeFromSilenceBgm=comment-lf {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","fadeFromSilenceBgm":"X */\nglobalThis.__pwn = 1; /* Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: fadeFromSilenceBgm=quote-single {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","fadeFromSilenceBgm":"X' + (globalThis.__pwn = 1) + 'Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: fadeFromSilenceBgm=quote-double {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","fadeFromSilenceBgm":"X\" + (globalThis.__pwn = 1) + \"Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: fadeFromSilenceBgm=quote-backtick {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","fadeFromSilenceBgm":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: crossfadeType=fadeFromSilence,newBgmFilename=empty,fadeFromSilenceBgm=comment-space {"crossfadeType":"fadeFromSilence","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"","fadeFromSilenceBgm":"X */ globalThis.__pwn = 1; /* Y"}
// Fade from Silence Function
function crossfadeBgm() {
    // Fade in BGM from silence
    const fadeInDuration = 2; // seconds

    // Define the BGM settings
    const bgm = {
        name: 'X */ globalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Start playing at zero volume
    const tempBgm = Object.assign({}, bgm, { volume: 0 });
    AudioManager.playBgm(tempBgm);

    // Fade in to target volume
    AudioManager.fadeInBgm(fadeInDuration);
}

// ==== case: crossfadeType=fadeFromSilence,newBgmFilename=empty,fadeFromSilenceBgm=comment-u2028 {"crossfadeType":"fadeFromSilence","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"","fadeFromSilenceBgm":"X */\u2028globalThis.__pwn = 1; /* Y"}
// Fade from Silence Function
function crossfadeBgm() {
    // Fade in BGM from silence
    const fadeInDuration = 2; // seconds

    // Define the BGM settings
    const bgm = {
        name: 'X */\u2028globalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Start playing at zero volume
    const tempBgm = Object.assign({}, bgm, { volume: 0 });
    AudioManager.playBgm(tempBgm);

    // Fade in to target volume
    AudioManager.fadeInBgm(fadeInDuration);
}

// ==== case: crossfadeType=fadeFromSilence,newBgmFilename=empty,fadeFromSilenceBgm=comment-u2029 {"crossfadeType":"fadeFromSilence","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"","fadeFromSilenceBgm":"X */\u2029globalThis.__pwn = 1; /* Y"}
// Fade from Silence Function
function crossfadeBgm() {
    // Fade in BGM from silence
    const fadeInDuration = 2; // seconds

    // Define the BGM settings
    const bgm = {
        name: 'X */\u2029globalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Start playing at zero volume
    const tempBgm = Object.assign({}, bgm, { volume: 0 });
    AudioManager.playBgm(tempBgm);

    // Fade in to target volume
    AudioManager.fadeInBgm(fadeInDuration);
}

// ==== case: crossfadeType=fadeFromSilence,newBgmFilename=empty,fadeFromSilenceBgm=comment-lf {"crossfadeType":"fadeFromSilence","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"","fadeFromSilenceBgm":"X */\nglobalThis.__pwn = 1; /* Y"}
// Fade from Silence Function
function crossfadeBgm() {
    // Fade in BGM from silence
    const fadeInDuration = 2; // seconds

    // Define the BGM settings
    const bgm = {
        name: 'X */\nglobalThis.__pwn = 1; /* Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Start playing at zero volume
    const tempBgm = Object.assign({}, bgm, { volume: 0 });
    AudioManager.playBgm(tempBgm);

    // Fade in to target volume
    AudioManager.fadeInBgm(fadeInDuration);
}

// ==== case: crossfadeType=fadeFromSilence,newBgmFilename=empty,fadeFromSilenceBgm=quote-single {"crossfadeType":"fadeFromSilence","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"","fadeFromSilenceBgm":"X' + (globalThis.__pwn = 1) + 'Y"}
// Fade from Silence Function
function crossfadeBgm() {
    // Fade in BGM from silence
    const fadeInDuration = 2; // seconds

    // Define the BGM settings
    const bgm = {
        name: 'X\' + (globalThis.__pwn = 1) + \'Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Start playing at zero volume
    const tempBgm = Object.assign({}, bgm, { volume: 0 });
    AudioManager.playBgm(tempBgm);

    // Fade in to target volume
    AudioManager.fadeInBgm(fadeInDuration);
}

// ==== case: crossfadeType=fadeFromSilence,newBgmFilename=empty,fadeFromSilenceBgm=quote-double {"crossfadeType":"fadeFromSilence","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"","fadeFromSilenceBgm":"X\" + (globalThis.__pwn = 1) + \"Y"}
// Fade from Silence Function
function crossfadeBgm() {
    // Fade in BGM from silence
    const fadeInDuration = 2; // seconds

    // Define the BGM settings
    const bgm = {
        name: 'X" + (globalThis.__pwn = 1) + "Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Start playing at zero volume
    const tempBgm = Object.assign({}, bgm, { volume: 0 });
    AudioManager.playBgm(tempBgm);

    // Fade in to target volume
    AudioManager.fadeInBgm(fadeInDuration);
}

// ==== case: crossfadeType=fadeFromSilence,newBgmFilename=empty,fadeFromSilenceBgm=quote-backtick {"crossfadeType":"fadeFromSilence","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"","fadeFromSilenceBgm":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// Fade from Silence Function
function crossfadeBgm() {
    // Fade in BGM from silence
    const fadeInDuration = 2; // seconds

    // Define the BGM settings
    const bgm = {
        name: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Start playing at zero volume
    const tempBgm = Object.assign({}, bgm, { volume: 0 });
    AudioManager.playBgm(tempBgm);

    // Fade in to target volume
    AudioManager.fadeInBgm(fadeInDuration);
}

// ==== case: functionName=comment-space {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","functionName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Function name must be a valid JavaScript identifier
// Crossfade Function
function X */ globalThis.__pwn = 1; /* Y() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: functionName=comment-u2028 {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","functionName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Function name must be a valid JavaScript identifier
// Crossfade Function
function X */ globalThis.__pwn = 1; /* Y() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: functionName=comment-u2029 {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","functionName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Function name must be a valid JavaScript identifier
// Crossfade Function
function X */ globalThis.__pwn = 1; /* Y() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: functionName=comment-lf {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","functionName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Function name must be a valid JavaScript identifier
// Crossfade Function
function X */
globalThis.__pwn = 1; /* Y() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: functionName=quote-single {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","functionName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Function name must be a valid JavaScript identifier
// Crossfade Function
function X' + (globalThis.__pwn = 1) + 'Y() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: functionName=quote-double {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","functionName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Function name must be a valid JavaScript identifier
// Crossfade Function
function X" + (globalThis.__pwn = 1) + "Y() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: functionName=quote-backtick {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","functionName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Function name must be a valid JavaScript identifier
// Crossfade Function
function X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM at zero volume initially
        const tempBgm = Object.assign({}, newBgm, { volume: 0 });
        AudioManager.playBgm(tempBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}
