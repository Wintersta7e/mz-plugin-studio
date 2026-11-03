// ==== case: type-violating: wrong types {"filename":42,"volume":"abc","pitch":"abc","pan":"abc","wrapInFunction":"yes","functionName":42,"randomizePitch":"yes","pitchVariation":"abc"}
// rejects: Function name must be a valid JavaScript identifier
// throws: TypeError

// ==== case: type-violating: null {"filename":null,"volume":null,"pitch":null,"pan":null,"wrapInFunction":null,"functionName":null,"randomizePitch":null,"pitchVariation":null}
// rejects: Pitch must be between 50 and 150
// throws: TypeError

// ==== case: type-violating: arrays {"filename":["a","b"],"volume":["a","b"],"pitch":["a","b"],"pan":["a","b"],"wrapInFunction":["a","b"],"functionName":["a","b"],"randomizePitch":["a","b"],"pitchVariation":["a","b"]}
// rejects: Function name must be a valid JavaScript identifier
// throws: TypeError
