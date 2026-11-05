// ==== case: type-violating: wrong types {"operation":7,"filename":42,"volume":"abc","pitch":"abc","pan":"abc","fadeDuration":"abc","fadeInDuration":"abc","wrapInFunction":"yes","functionName":42}
// rejects: Field "Operation" must be text | Field "BGM Filename" must be text | Field "Volume" must be a number | Field "Pitch" must be a number | Field "Pan" must be a number | Field "Fade Duration (seconds)" must be a number | Field "Fade In Duration (seconds)" must be a number | Field "Wrap in Function" must be true or false | Field "Function Name" must be text
// BGM Control Function: 7
function 42() {
}

// ==== case: type-violating: null {"operation":null,"filename":null,"volume":null,"pitch":null,"pan":null,"fadeDuration":null,"fadeInDuration":null,"wrapInFunction":null,"functionName":null}
// rejects: Field "Operation" is required | Pitch must be between 50 and 150
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
// rejects: Field "Operation" must be text | Field "BGM Filename" must be text | Field "Volume" must be a number | Field "Pitch" must be a number | Field "Pan" must be a number | Field "Fade Duration (seconds)" must be a number | Field "Fade In Duration (seconds)" must be a number | Field "Wrap in Function" must be true or false | Field "Function Name" must be text
// BGM Control Function: a,b
function a,b() {
}

// ==== case: type-violating: pan=null,functionName="playTheme" {"operation":"play","volume":90,"pitch":100,"pan":null,"fadeDuration":1,"fadeInDuration":1,"wrapInFunction":true,"filename":"Theme1","functionName":"playTheme"}
// BGM Control Function: play
function playTheme() {
    // Play BGM with specified settings
    const bgm = {
        name: 'Theme1',
        volume: 90,
        pitch: 100,
        pan: null
    };
    AudioManager.playBgm(bgm);
}
