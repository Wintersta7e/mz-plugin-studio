// ==== case: type-violating: wrong types {"optionName":42,"optionSymbol":42,"optionType":7,"defaultValue":42,"choices":42,"persistToConfig":"yes"}
// rejects: Option symbol must be a valid JavaScript identifier
// throws: TypeError

// ==== case: type-violating: null {"optionName":null,"optionSymbol":null,"optionType":null,"defaultValue":null,"choices":null,"persistToConfig":null}
// throws: TypeError

// ==== case: type-violating: arrays {"optionName":["a","b"],"optionSymbol":["a","b"],"optionType":["a","b"],"defaultValue":["a","b"],"choices":["a","b"],"persistToConfig":["a","b"]}
// rejects: Option symbol must be a valid JavaScript identifier
// throws: TypeError
