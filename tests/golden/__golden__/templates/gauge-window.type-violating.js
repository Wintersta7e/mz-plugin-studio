// ==== case: type-violating: wrong types {"windowName":42,"gaugeCount":7,"gauge1Label":42,"gauge1Color1":42,"gauge1Color2":42,"gauge2Label":42,"gauge2Color1":42,"gauge2Color2":42,"gauge3Label":42,"gauge3Color1":42,"gauge3Color2":42,"positionX":"abc","positionY":"abc","width":"abc","gaugeHeight":"abc","showLabels":7,"showValues":7,"dataSource":7}
// validation throws: TypeError
// throws: TypeError

// ==== case: type-violating: null {"windowName":null,"gaugeCount":null,"gauge1Label":null,"gauge1Color1":null,"gauge1Color2":null,"gauge2Label":null,"gauge2Color1":null,"gauge2Color2":null,"gauge3Label":null,"gauge3Color1":null,"gauge3Color2":null,"positionX":null,"positionY":null,"width":null,"gaugeHeight":null,"showLabels":null,"showValues":null,"dataSource":null}
// rejects: Width must be a positive number | Gauge Height must be a positive number
// throws: TypeError

// ==== case: type-violating: arrays {"windowName":["a","b"],"gaugeCount":["a","b"],"gauge1Label":["a","b"],"gauge1Color1":["a","b"],"gauge1Color2":["a","b"],"gauge2Label":["a","b"],"gauge2Color1":["a","b"],"gauge2Color2":["a","b"],"gauge3Label":["a","b"],"gauge3Color1":["a","b"],"gauge3Color2":["a","b"],"positionX":["a","b"],"positionY":["a","b"],"width":["a","b"],"gaugeHeight":["a","b"],"showLabels":["a","b"],"showValues":["a","b"],"dataSource":["a","b"]}
// validation throws: TypeError
// throws: TypeError
