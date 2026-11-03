// ==== case: type-violating: wrong types {"crossfadeType":7,"newBgmFilename":42,"fadeFromSilenceBgm":42,"fadeOutDuration":"abc","fadeInDuration":"abc","newBgmVolume":"abc","newBgmPitch":"abc","wrapInFunction":"yes","functionName":42}
// rejects: Function name must be a valid JavaScript identifier
// Fade from Silence Function
function 42() {
}

// ==== case: type-violating: null {"crossfadeType":null,"newBgmFilename":null,"fadeFromSilenceBgm":null,"fadeOutDuration":null,"fadeInDuration":null,"newBgmVolume":null,"newBgmPitch":null,"wrapInFunction":null,"functionName":null}
// rejects: Pitch must be between 50 and 150
// Crossfade Function
function crossfadeBgm() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = null; // seconds
    const fadeInDuration = null; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'NEW_BGM_NAME',
        volume: null,
        pitch: null,
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

// ==== case: type-violating: arrays {"crossfadeType":["a","b"],"newBgmFilename":["a","b"],"fadeFromSilenceBgm":["a","b"],"fadeOutDuration":["a","b"],"fadeInDuration":["a","b"],"newBgmVolume":["a","b"],"newBgmPitch":["a","b"],"wrapInFunction":["a","b"],"functionName":["a","b"]}
// rejects: Function name must be a valid JavaScript identifier
// Fade from Silence Function
function a,b() {
}
