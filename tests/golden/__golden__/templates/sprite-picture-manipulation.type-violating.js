// ==== case: type-violating: wrong types {"operation":7,"pictureId":"abc","imageName":42,"origin":7,"x":"abc","y":"abc","scaleX":"abc","scaleY":"abc","opacity":"abc","blendMode":7,"duration":"abc","rotationSpeed":"abc","tintRed":"abc","tintGreen":"abc","tintBlue":"abc","tintGray":"abc"}
// rejects: Field "Operation" must be text | Field "Picture ID" must be a number | Field "Image Name" must be text | Field "Origin" must be text | Field "X Position" must be a number | Field "Y Position" must be a number | Field "Scale X (%)" must be a number | Field "Scale Y (%)" must be a number | Field "Opacity" must be a number | Field "Blend Mode" must be text | Field "Duration (frames)" must be a number | Field "Rotation Speed" must be a number | Field "Tint Red" must be a number | Field "Tint Green" must be a number | Field "Tint Blue" must be a number | Field "Tint Gray" must be a number
// throws: TypeError

// ==== case: type-violating: null {"operation":null,"pictureId":null,"imageName":null,"origin":null,"x":null,"y":null,"scaleX":null,"scaleY":null,"opacity":null,"blendMode":null,"duration":null,"rotationSpeed":null,"tintRed":null,"tintGreen":null,"tintBlue":null,"tintGray":null}
// rejects: Field "Operation" is required | Field "Picture ID" is required
// throws: TypeError

// ==== case: type-violating: arrays {"operation":["a","b"],"pictureId":["a","b"],"imageName":["a","b"],"origin":["a","b"],"x":["a","b"],"y":["a","b"],"scaleX":["a","b"],"scaleY":["a","b"],"opacity":["a","b"],"blendMode":["a","b"],"duration":["a","b"],"rotationSpeed":["a","b"],"tintRed":["a","b"],"tintGreen":["a","b"],"tintBlue":["a","b"],"tintGray":["a","b"]}
// rejects: Field "Operation" must be text | Field "Picture ID" must be a number | Field "Image Name" must be text | Field "Origin" must be text | Field "X Position" must be a number | Field "Y Position" must be a number | Field "Scale X (%)" must be a number | Field "Scale Y (%)" must be a number | Field "Opacity" must be a number | Field "Blend Mode" must be text | Field "Duration (frames)" must be a number | Field "Rotation Speed" must be a number | Field "Tint Red" must be a number | Field "Tint Green" must be a number | Field "Tint Blue" must be a number | Field "Tint Gray" must be a number
// throws: TypeError

// ==== case: type-violating: null where not required {"operation":"show","pictureId":1,"imageName":null,"origin":null,"x":null,"y":null,"scaleX":null,"scaleY":null,"opacity":null,"blendMode":null,"duration":null,"rotationSpeed":null,"tintRed":null,"tintGreen":null,"tintBlue":null,"tintGray":null}
// rejects: Image Name is required for Show Picture operation
// Show Picture
//
// Displays picture 1 at position (0, 0)
// $gameScreen is null while plugins load: call this function from a
// plugin command or a scene hook, e.g. customShowPicture();
function customShowPicture() {
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
}

// ==== case: type-violating: unlisted choices {"operation":"unlisted","pictureId":1,"imageName":"Pic1","origin":"unlisted","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"unlisted","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0}
// rejects: Field "Operation" must be one of its choices | Field "Origin" must be one of its choices | Field "Blend Mode" must be one of its choices


// ==== case: type-violating: empty text {"operation":"show","pictureId":1,"imageName":"","origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0}
// rejects: Image Name is required for Show Picture operation
// Show Picture
//
// Displays picture 1 at position (0, 0)
// $gameScreen is null while plugins load: call this function from a
// plugin command or a scene hook, e.g. customShowPicture();
function customShowPicture() {
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
}

// ==== case: type-violating: required fields only {"operation":"show","pictureId":1}
// rejects: Image Name is required for Show Picture operation
// Show Picture
//
// Displays picture 1 at position (0, 0)
// $gameScreen is null while plugins load: call this function from a
// plugin command or a scene hook, e.g. customShowPicture();
function customShowPicture() {
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
}

// ==== case: type-violating: operation="move",pictureId="abc",x=null,duration=["a","b"] {"operation":"move","pictureId":"abc","origin":"0","x":null,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":["a","b"],"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// rejects: Field "Picture ID" must be a number | Field "Duration (frames)" must be a number
// throws: TypeError

// ==== case: type-violating: operation="rotate",rotationSpeed="abc" {"operation":"rotate","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":"abc","tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// rejects: Field "Rotation Speed" must be a number
// throws: TypeError

// ==== case: type-violating: operation="tint",tintRed=null,tintGray="abc" {"operation":"tint","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":null,"tintGreen":0,"tintBlue":0,"tintGray":"abc","imageName":"Pic1"}
// rejects: Field "Tint Gray" must be a number
// throws: TypeError

// ==== case: type-violating: operation="erase",pictureId=null {"operation":"erase","pictureId":null,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// rejects: Field "Picture ID" is required
// throws: TypeError

// ==== case: type-violating: operation="utility",pictureId=null {"operation":"utility","pictureId":null,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// rejects: Field "Picture ID" is required
// throws: TypeError

// ==== case: type-violating: opacity=300,x=null {"operation":"show","pictureId":1,"origin":"0","x":null,"y":0,"scaleX":100,"scaleY":100,"opacity":300,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// rejects: Opacity must be between 0 and 255
// Show Picture
//
// Displays picture 1 at position (0, 0)
// $gameScreen is null while plugins load: call this function from a
// plugin command or a scene hook, e.g. customShowPicture();
function customShowPicture() {
    $gameScreen.showPicture(
        1,         // Picture ID
        'Pic1',       // Image name (from img/pictures/)
        0,            // Origin (0 = Upper Left, 1 = Center)
        0,                 // X position
        0,                 // Y position
        100,            // Scale X (%)
        100,            // Scale Y (%)
        300,           // Opacity (0-255)
        0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
    );
}

// ==== case: type-violating: operation="erase",pictureId=0 {"operation":"erase","pictureId":0,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// rejects: Picture ID must be between 1 and 100
// Erase Picture
//
// Removes picture 1 from screen
// $gameScreen is null while plugins load: call this function from a
// plugin command or a scene hook, e.g. customErasePicture();
function customErasePicture() {
    $gameScreen.erasePicture(1);
}
