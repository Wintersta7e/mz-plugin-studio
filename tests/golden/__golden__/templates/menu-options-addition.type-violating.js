// ==== case: type-violating: wrong types {"optionName":42,"optionSymbol":42,"optionType":7,"defaultValue":42,"choices":42,"persistToConfig":"yes"}
// rejects: Field "Option Name" must be text | Field "Option Symbol" must be text | Field "Option Type" must be text | Field "Default Value" must be text | Field "Choices (comma-separated)" must be text | Field "Save to Config" must be true or false
// throws: TypeError

// ==== case: type-violating: null {"optionName":null,"optionSymbol":null,"optionType":null,"defaultValue":null,"choices":null,"persistToConfig":null}
// throws: TypeError

// ==== case: type-violating: arrays {"optionName":["a","b"],"optionSymbol":["a","b"],"optionType":["a","b"],"defaultValue":["a","b"],"choices":["a","b"],"persistToConfig":["a","b"]}
// rejects: Field "Option Name" must be text | Field "Option Symbol" must be text | Field "Option Type" must be text | Field "Default Value" must be text | Field "Choices (comma-separated)" must be text | Field "Save to Config" must be true or false
// throws: TypeError
