// ==== case: type-violating: wrong types {"operation":7,"pictureId":"abc","imageName":42,"origin":7,"x":"abc","y":"abc","scaleX":"abc","scaleY":"abc","opacity":"abc","blendMode":7,"duration":"abc","rotationSpeed":"abc","tintRed":"abc","tintGreen":"abc","tintBlue":"abc","tintGray":"abc"}
// rejects: Field "Operation" must be text | Field "Picture ID" must be a number | Field "Image Name" must be text | Field "Origin" must be text | Field "X Position" must be a number | Field "Y Position" must be a number | Field "Scale X (%)" must be a number | Field "Scale Y (%)" must be a number | Field "Opacity" must be a number | Field "Blend Mode" must be text | Field "Duration (frames)" must be a number | Field "Rotation Speed" must be a number | Field "Tint Red" must be a number | Field "Tint Green" must be a number | Field "Tint Blue" must be a number | Field "Tint Gray" must be a number


// ==== case: type-violating: null {"operation":null,"pictureId":null,"imageName":null,"origin":null,"x":null,"y":null,"scaleX":null,"scaleY":null,"opacity":null,"blendMode":null,"duration":null,"rotationSpeed":null,"tintRed":null,"tintGreen":null,"tintBlue":null,"tintGray":null}
// rejects: Picture ID must be between 1 and 100
// Show Picture
//
// Displays picture 1 at position (0, 0)

$gameScreen.showPicture(
    1,         // Picture ID
    'Picture1',       // Image name (from img/pictures/)
    0,            // Origin (0 = Upper Left, 1 = Center)
    0,                 // X position
    0,                 // Y position
    100,            // Scale X (%)
    100,            // Scale Y (%)
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: type-violating: arrays {"operation":["a","b"],"pictureId":["a","b"],"imageName":["a","b"],"origin":["a","b"],"x":["a","b"],"y":["a","b"],"scaleX":["a","b"],"scaleY":["a","b"],"opacity":["a","b"],"blendMode":["a","b"],"duration":["a","b"],"rotationSpeed":["a","b"],"tintRed":["a","b"],"tintGreen":["a","b"],"tintBlue":["a","b"],"tintGray":["a","b"]}
// rejects: Field "Operation" must be text | Field "Picture ID" must be a number | Field "Image Name" must be text | Field "Origin" must be text | Field "X Position" must be a number | Field "Y Position" must be a number | Field "Scale X (%)" must be a number | Field "Scale Y (%)" must be a number | Field "Opacity" must be a number | Field "Blend Mode" must be text | Field "Duration (frames)" must be a number | Field "Rotation Speed" must be a number | Field "Tint Red" must be a number | Field "Tint Green" must be a number | Field "Tint Blue" must be a number | Field "Tint Gray" must be a number

