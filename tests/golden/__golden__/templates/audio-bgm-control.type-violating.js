// ==== case: type-violating: wrong types {"operation":7,"filename":42,"volume":"abc","pitch":"abc","pan":"abc","fadeDuration":"abc","fadeInDuration":"abc","wrapInFunction":"yes","functionName":42}
// rejects: Function name must be a valid JavaScript identifier
// BGM Control Function: 7
function 42() {
}

// ==== case: type-violating: null {"operation":null,"filename":null,"volume":null,"pitch":null,"pan":null,"fadeDuration":null,"fadeInDuration":null,"wrapInFunction":null,"functionName":null}
// rejects: Pitch must be between 50 and 150
// BGM Control Function: play
function customBgmControl() {
    // Play BGM with specified settings
    const bgm = {
        name: 'BGM_NAME',
        volume: null,
        pitch: null,
        pan: null
    };
    AudioManager.playBgm(bgm);
}

// ==== case: type-violating: arrays {"operation":["a","b"],"filename":["a","b"],"volume":["a","b"],"pitch":["a","b"],"pan":["a","b"],"fadeDuration":["a","b"],"fadeInDuration":["a","b"],"wrapInFunction":["a","b"],"functionName":["a","b"]}
// rejects: Function name must be a valid JavaScript identifier
// BGM Control Function: a,b
function a,b() {
}
