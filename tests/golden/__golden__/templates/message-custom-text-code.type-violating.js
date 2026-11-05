// ==== case: type-violating: wrong types {"escapeChar":42,"hasParameter":"yes","codeType":7,"replacementText":42,"effectType":7}
// rejects: Field "Escape Character" must be text | Field "Has Parameter" must be true or false | Field "Code Type" must be text | Field "Replacement Expression" must be text | Field "Effect Type" must be text
// throws: TypeError

// ==== case: type-violating: null {"escapeChar":null,"hasParameter":null,"codeType":null,"replacementText":null,"effectType":null}
// throws: TypeError

// ==== case: type-violating: arrays {"escapeChar":["a","b"],"hasParameter":["a","b"],"codeType":["a","b"],"replacementText":["a","b"],"effectType":["a","b"]}
// rejects: Field "Escape Character" must be text | Field "Has Parameter" must be true or false | Field "Code Type" must be text | Field "Replacement Expression" must be text | Field "Effect Type" must be text
// throws: TypeError
