// ==== case: type-violating: wrong types {"commandName":42,"pluginName":42,"validateActorId":"yes","validateNumberRange":"yes","minValue":"abc","maxValue":"abc","errorHandling":7}
// validation throws: TypeError
// throws: TypeError

// ==== case: type-violating: null {"commandName":null,"pluginName":null,"validateActorId":null,"validateNumberRange":null,"minValue":null,"maxValue":null,"errorHandling":null}
// throws: TypeError

// ==== case: type-violating: arrays {"commandName":["a","b"],"pluginName":["a","b"],"validateActorId":["a","b"],"validateNumberRange":["a","b"],"minValue":["a","b"],"maxValue":["a","b"],"errorHandling":["a","b"]}
// validation throws: TypeError
// throws: TypeError
