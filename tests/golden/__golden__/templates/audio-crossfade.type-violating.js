// ==== case: type-violating: wrong types {"crossfadeType":7,"newBgmFilename":42,"fadeFromSilenceBgm":42,"fadeOutDuration":"abc","fadeInDuration":"abc","newBgmVolume":"abc","newBgmPitch":"abc","wrapInFunction":"yes","functionName":42}
// rejects: Field "Crossfade Type" must be text | Field "New BGM Filename" must be text | Field "BGM Filename" must be text | Field "Fade Out Duration (seconds)" must be a number | Field "Fade In Duration (seconds)" must be a number | Field "New BGM Volume" must be a number | Field "New BGM Pitch" must be a number | Field "Wrap in Function" must be true or false | Field "Function Name" must be text
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
        // Play new BGM, then fade it in from silence
        AudioManager.playBgm(newBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}

// ==== case: type-violating: arrays {"crossfadeType":["a","b"],"newBgmFilename":["a","b"],"fadeFromSilenceBgm":["a","b"],"fadeOutDuration":["a","b"],"fadeInDuration":["a","b"],"newBgmVolume":["a","b"],"newBgmPitch":["a","b"],"wrapInFunction":["a","b"],"functionName":["a","b"]}
// rejects: Field "Crossfade Type" must be text | Field "New BGM Filename" must be text | Field "BGM Filename" must be text | Field "Fade Out Duration (seconds)" must be a number | Field "Fade In Duration (seconds)" must be a number | Field "New BGM Volume" must be a number | Field "New BGM Pitch" must be a number | Field "Wrap in Function" must be true or false | Field "Function Name" must be text
// Fade from Silence Function
function a,b() {
}

// ==== case: type-violating: crossfadeType="fadeFromSilence",fadeFromSilenceBgm=null {"crossfadeType":"fadeFromSilence","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","fadeFromSilenceBgm":null}
// rejects: BGM filename is required for fade from silence
// Fade from Silence Function
function crossfadeBgm() {
    // Fade in BGM from silence
    const fadeInDuration = 2; // seconds

    // Define the BGM settings
    const bgm = {
        name: 'BGM_NAME',
        volume: 90,
        pitch: 100,
        pan: 0
    };

    // Start playing, then fade in from silence
    AudioManager.playBgm(bgm);

    // Fade in to target volume
    AudioManager.fadeInBgm(fadeInDuration);
}

// ==== case: type-violating: crossfadeType="fadeFromSilence",fadeFromSilenceBgm=7 {"crossfadeType":"fadeFromSilence","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":100,"wrapInFunction":true,"newBgmFilename":"Theme2","fadeFromSilenceBgm":7}
// rejects: Field "BGM Filename" must be text
// throws: TypeError

// ==== case: type-violating: newBgmPitch=null,functionName="crossfadeTheme" {"crossfadeType":"crossfade","fadeOutDuration":2,"fadeInDuration":2,"newBgmVolume":90,"newBgmPitch":null,"wrapInFunction":true,"newBgmFilename":"Theme2","functionName":"crossfadeTheme"}
// rejects: Pitch must be between 50 and 150
// Crossfade Function
function crossfadeTheme() {
    // Crossfade: Fade out current BGM, then play and fade in new BGM
    const fadeOutDuration = 2; // seconds
    const fadeInDuration = 2; // seconds

    // Define the new BGM settings
    const newBgm = {
        name: 'Theme2',
        volume: 90,
        pitch: null,
        pan: 0
    };

    // Fade out current BGM
    AudioManager.fadeOutBgm(fadeOutDuration);

    // Schedule the new BGM to play after fade out completes
    setTimeout(function() {
        // Play new BGM, then fade it in from silence
        AudioManager.playBgm(newBgm);
        // Fade in to target volume
        AudioManager.fadeInBgm(fadeInDuration);
    }, fadeOutDuration * 1000);
}
