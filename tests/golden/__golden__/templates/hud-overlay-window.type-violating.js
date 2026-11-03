// ==== case: type-violating: wrong types {"windowName":42,"hudType":7,"positionX":"abc","positionY":"abc","width":"abc","height":"abc","opacity":"abc","showFrame":7}
// validation throws: TypeError
// throws: TypeError

// ==== case: type-violating: null {"windowName":null,"hudType":null,"positionX":null,"positionY":null,"width":null,"height":null,"opacity":null,"showFrame":null}
// throws: TypeError

// ==== case: type-violating: arrays {"windowName":["a","b"],"hudType":["a","b"],"positionX":["a","b"],"positionY":["a","b"],"width":["a","b"],"height":["a","b"],"opacity":["a","b"],"showFrame":["a","b"]}
// validation throws: TypeError
// throws: TypeError
