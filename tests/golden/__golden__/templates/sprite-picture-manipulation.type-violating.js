// ==== case: type-violating: wrong types {"operation":7,"pictureId":"abc","imageName":42,"origin":7,"x":"abc","y":"abc","scaleX":"abc","scaleY":"abc","opacity":"abc","blendMode":7,"duration":"abc","rotationSpeed":"abc","tintRed":"abc","tintGreen":"abc","tintBlue":"abc","tintGray":"abc"}
// rejects: Field "Operation" must be text | Field "Picture ID" must be a number | Field "Image Name" must be text | Field "Origin" must be text | Field "X Position" must be a number | Field "Y Position" must be a number | Field "Scale X (%)" must be a number | Field "Scale Y (%)" must be a number | Field "Opacity" must be a number | Field "Blend Mode" must be text | Field "Duration (frames)" must be a number | Field "Rotation Speed" must be a number | Field "Tint Red" must be a number | Field "Tint Green" must be a number | Field "Tint Blue" must be a number | Field "Tint Gray" must be a number


// ==== case: type-violating: null {"operation":null,"pictureId":null,"imageName":null,"origin":null,"x":null,"y":null,"scaleX":null,"scaleY":null,"opacity":null,"blendMode":null,"duration":null,"rotationSpeed":null,"tintRed":null,"tintGreen":null,"tintBlue":null,"tintGray":null}
// rejects: Field "Operation" is required | Field "Picture ID" is required | Picture ID must be between 1 and 100
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


// ==== case: type-violating: operation="move",pictureId="abc",x=null,duration=["a","b"] {"operation":"move","pictureId":"abc","origin":"0","x":null,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":["a","b"],"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// rejects: Field "Picture ID" must be a number | Field "Duration (frames)" must be a number
// Move Picture
//
// Moves picture abc to (0, 0) over a,b frames

$gameScreen.movePicture(
    abc,         // Picture ID
    0,            // Origin (0 = Upper Left, 1 = Center)
    0,                 // Target X position
    0,                 // Target Y position
    100,            // Target Scale X (%)
    100,            // Target Scale Y (%)
    255,           // Target Opacity (0-255)
    0,         // Target Blend mode
    a,b,          // Duration (frames)
    0                     // Easing type (0 = constant speed)
);

// ==== case: type-violating: operation="rotate",rotationSpeed="abc" {"operation":"rotate","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":"abc","tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// rejects: Field "Rotation Speed" must be a number
// Rotate Picture
//
// Rotates picture 1 at abc degrees per frame

$gameScreen.rotatePicture(1, abc);

// Note: Positive values rotate clockwise, negative counter-clockwise
// To stop rotation, set speed to 0:
// $gameScreen.rotatePicture(1, 0);

// ==== case: type-violating: operation="tint",tintRed=null,tintGray="abc" {"operation":"tint","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":null,"tintGreen":0,"tintBlue":0,"tintGray":"abc","imageName":"Pic1"}
// rejects: Field "Tint Gray" must be a number
// Tint Picture
//
// Applies color tint to picture 1

$gameScreen.tintPicture(
    1,                                   // Picture ID
    [0, 0, 0, abc],  // [Red, Green, Blue, Gray]
    60                                     // Duration (frames)
);

// Tint values: Red/Green/Blue = -255 to 255, Gray = 0 to 255
// To remove tint: [0, 0, 0, 0]

// ==== case: type-violating: operation="erase",pictureId=null {"operation":"erase","pictureId":null,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// rejects: Field "Picture ID" is required | Picture ID must be between 1 and 100
// Erase Picture
//
// Removes picture 1 from screen

$gameScreen.erasePicture(1);

// ==== case: type-violating: operation="utility",pictureId=null {"operation":"utility","pictureId":null,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// rejects: Field "Picture ID" is required | Picture ID must be between 1 and 100
// Picture Manipulation Utility Functions
//
// Helper functions for common picture operations.
// Call these from plugin commands or other code.

/**
 * Show a picture on screen
 * @param {number} pictureId - Picture ID (1-100)
 * @param {string} name - Image filename (without extension)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} [origin=0] - 0 = Upper Left, 1 = Center
 * @param {number} [scaleX=100] - Horizontal scale %
 * @param {number} [scaleY=100] - Vertical scale %
 * @param {number} [opacity=255] - Opacity (0-255)
 * @param {number} [blendMode=0] - 0=Normal, 1=Additive, 2=Multiply, 3=Screen
 */
function showPicture(pictureId, name, x, y, origin = 0, scaleX = 100, scaleY = 100, opacity = 255, blendMode = 0) {
    $gameScreen.showPicture(pictureId, name, origin, x, y, scaleX, scaleY, opacity, blendMode);
}

/**
 * Move a picture to new position/properties over time
 * @param {number} pictureId - Picture ID (1-100)
 * @param {number} x - Target X coordinate
 * @param {number} y - Target Y coordinate
 * @param {number} [duration=60] - Animation duration in frames
 * @param {number} [scaleX=100] - Target horizontal scale %
 * @param {number} [scaleY=100] - Target vertical scale %
 * @param {number} [opacity=255] - Target opacity (0-255)
 * @param {number} [blendMode=0] - Target blend mode
 * @param {number} [easingType=0] - Easing type (MZ only)
 */
function movePicture(pictureId, x, y, duration = 60, scaleX = 100, scaleY = 100, opacity = 255, blendMode = 0, easingType = 0) {
    const picture = $gameScreen.picture(pictureId);
    if (picture) {
        const origin = picture.origin();
        $gameScreen.movePicture(pictureId, origin, x, y, scaleX, scaleY, opacity, blendMode, duration, easingType);
    }
}

/**
 * Rotate a picture continuously
 * @param {number} pictureId - Picture ID (1-100)
 * @param {number} speed - Rotation speed (degrees per frame, positive = clockwise)
 */
function rotatePicture(pictureId, speed) {
    $gameScreen.rotatePicture(pictureId, speed);
}

/**
 * Apply color tint to a picture
 * @param {number} pictureId - Picture ID (1-100)
 * @param {number} red - Red adjustment (-255 to 255)
 * @param {number} green - Green adjustment (-255 to 255)
 * @param {number} blue - Blue adjustment (-255 to 255)
 * @param {number} gray - Gray level (0-255, 0 = no gray)
 * @param {number} [duration=60] - Tint animation duration
 */
function tintPicture(pictureId, red, green, blue, gray, duration = 60) {
    $gameScreen.tintPicture(pictureId, [red, green, blue, gray], duration);
}

/**
 * Erase a picture from screen
 * @param {number} pictureId - Picture ID (1-100)
 */
function erasePicture(pictureId) {
    $gameScreen.erasePicture(pictureId);
}

/**
 * Fade out a picture over time
 * @param {number} pictureId - Picture ID (1-100)
 * @param {number} [duration=60] - Fade duration in frames
 */
function fadeOutPicture(pictureId, duration = 60) {
    const picture = $gameScreen.picture(pictureId);
    if (picture) {
        const origin = picture.origin();
        const x = picture.x();
        const y = picture.y();
        const scaleX = picture.scaleX();
        const scaleY = picture.scaleY();
        const blendMode = picture.blendMode();
        $gameScreen.movePicture(pictureId, origin, x, y, scaleX, scaleY, 0, blendMode, duration);
    }
}

// ==== case: type-violating: opacity=300,x=null {"operation":"show","pictureId":1,"origin":"0","x":null,"y":0,"scaleX":100,"scaleY":100,"opacity":300,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// rejects: Opacity must be between 0 and 255
// Show Picture
//
// Displays picture 1 at position (0, 0)

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
