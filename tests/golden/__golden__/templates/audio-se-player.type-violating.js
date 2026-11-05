// ==== case: type-violating: wrong types {"filename":42,"volume":"abc","pitch":"abc","pan":"abc","wrapInFunction":"yes","functionName":42,"randomizePitch":"yes","pitchVariation":"abc"}
// rejects: Field "SE Filename" must be text | Field "Volume" must be a number | Field "Pitch" must be a number | Field "Pan" must be a number | Field "Wrap in Function" must be true or false | Field "Function Name" must be text | Field "Randomize Pitch" must be true or false | Field "Pitch Variation" must be a number
// throws: TypeError

// ==== case: type-violating: null {"filename":null,"volume":null,"pitch":null,"pan":null,"wrapInFunction":null,"functionName":null,"randomizePitch":null,"pitchVariation":null}
// rejects: Field "SE Filename" is required | Pitch must be between 50 and 150
// throws: TypeError

// ==== case: type-violating: arrays {"filename":["a","b"],"volume":["a","b"],"pitch":["a","b"],"pan":["a","b"],"wrapInFunction":["a","b"],"functionName":["a","b"],"randomizePitch":["a","b"],"pitchVariation":["a","b"]}
// rejects: Field "SE Filename" must be text | Field "Volume" must be a number | Field "Pitch" must be a number | Field "Pan" must be a number | Field "Wrap in Function" must be true or false | Field "Function Name" must be text | Field "Randomize Pitch" must be true or false | Field "Pitch Variation" must be a number
// throws: TypeError

// ==== case: type-violating: randomizePitch=true,pitchVariation=null {"volume":90,"pitch":100,"pan":0,"wrapInFunction":true,"randomizePitch":true,"pitchVariation":null,"filename":"Sample"}
// Sound Effect Function: Sample
function playCustomSE() {
    // Play SE with randomized pitch for variation
    const basePitch = 100;
    const variation = null;
    const randomPitch = basePitch + Math.floor(Math.random() * variation * 2) - variation;
    const se = {
        name: 'Sample',
        volume: 90,
        pitch: Math.max(50, Math.min(150, randomPitch)),
        pan: 0
    };
    AudioManager.playSe(se);
}

// ==== case: type-violating: pan=null,functionName="playCursor" {"volume":90,"pitch":100,"pan":null,"wrapInFunction":true,"randomizePitch":false,"pitchVariation":10,"filename":"Sample","functionName":"playCursor"}
// Sound Effect Function: Sample
function playCursor() {
    // Play sound effect
    const se = {
        name: 'Sample',
        volume: 90,
        pitch: 100,
        pan: null
    };
    AudioManager.playSe(se);
}
