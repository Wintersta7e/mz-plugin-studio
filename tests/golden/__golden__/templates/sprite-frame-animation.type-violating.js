// ==== case: type-violating: wrong types {"animationType":7,"spriteName":42,"frameCount":"abc","frameWidth":"abc","frameHeight":"abc","columns":"abc","frameDelay":"abc","loop":"yes","autoPlay":"yes","targetClass":42}
// rejects: Field "Animation Type" must be text | Field "Sprite Class Name" must be text | Field "Frame Count" must be a number | Field "Frame Width" must be a number | Field "Frame Height" must be a number | Field "Columns" must be a number | Field "Frame Delay" must be a number | Field "Loop Animation" must be true or false | Field "Auto Play" must be true or false | Field "Target Sprite Class" must be text
// throws: TypeError

// ==== case: type-violating: null {"animationType":null,"spriteName":null,"frameCount":null,"frameWidth":null,"frameHeight":null,"columns":null,"frameDelay":null,"loop":null,"autoPlay":null,"targetClass":null}
// rejects: Frame Count must be at least 1 | Frame Width must be a positive number | Frame Height must be a positive number | Frame Delay must be at least 1
// throws: TypeError

// ==== case: type-violating: arrays {"animationType":["a","b"],"spriteName":["a","b"],"frameCount":["a","b"],"frameWidth":["a","b"],"frameHeight":["a","b"],"columns":["a","b"],"frameDelay":["a","b"],"loop":["a","b"],"autoPlay":["a","b"],"targetClass":["a","b"]}
// rejects: Field "Animation Type" must be text | Field "Sprite Class Name" must be text | Field "Frame Count" must be a number | Field "Frame Width" must be a number | Field "Frame Height" must be a number | Field "Columns" must be a number | Field "Frame Delay" must be a number | Field "Loop Animation" must be true or false | Field "Auto Play" must be true or false | Field "Target Sprite Class" must be text
// throws: TypeError
