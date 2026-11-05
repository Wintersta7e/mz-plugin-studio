// ==== case: type-violating: wrong types {"filename":42,"volume":"abc","pitch":"abc","pan":"abc","wrapInFunction":"yes","functionName":42,"randomizePitch":"yes","pitchVariation":"abc"}
// rejects: Field "SE Filename" must be text | Field "Volume" must be a number | Field "Pitch" must be a number | Field "Pan" must be a number | Field "Wrap in Function" must be true or false | Field "Function Name" must be text | Field "Randomize Pitch" must be true or false | Field "Pitch Variation" must be a number
// throws: TypeError

// ==== case: type-violating: null {"filename":null,"volume":null,"pitch":null,"pan":null,"wrapInFunction":null,"functionName":null,"randomizePitch":null,"pitchVariation":null}
// rejects: Pitch must be between 50 and 150
// throws: TypeError

// ==== case: type-violating: arrays {"filename":["a","b"],"volume":["a","b"],"pitch":["a","b"],"pan":["a","b"],"wrapInFunction":["a","b"],"functionName":["a","b"],"randomizePitch":["a","b"],"pitchVariation":["a","b"]}
// rejects: Field "SE Filename" must be text | Field "Volume" must be a number | Field "Pitch" must be a number | Field "Pan" must be a number | Field "Wrap in Function" must be true or false | Field "Function Name" must be text | Field "Randomize Pitch" must be true or false | Field "Pitch Variation" must be a number
// throws: TypeError
