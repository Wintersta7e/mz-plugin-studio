// ==== case: type-violating: wrong types {"databaseType":7,"tagName":42,"tagFormat":7,"valueType":7,"propertyName":42,"defaultValue":42}
// rejects: Field "Database" must be text | Field "Tag Name" must be text | Field "Tag Format" must be text | Field "Value Type" must be text | Field "Property Name" must be text | Field "Default Value" must be text
// throws: TypeError

// ==== case: type-violating: null {"databaseType":null,"tagName":null,"tagFormat":null,"valueType":null,"propertyName":null,"defaultValue":null}
// throws: TypeError

// ==== case: type-violating: arrays {"databaseType":["a","b"],"tagName":["a","b"],"tagFormat":["a","b"],"valueType":["a","b"],"propertyName":["a","b"],"defaultValue":["a","b"]}
// rejects: Field "Database" must be text | Field "Tag Name" must be text | Field "Tag Format" must be text | Field "Value Type" must be text | Field "Property Name" must be text | Field "Default Value" must be text
// throws: TypeError
