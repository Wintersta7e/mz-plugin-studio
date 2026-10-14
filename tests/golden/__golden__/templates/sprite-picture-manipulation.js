// ==== case: base {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
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
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: operation=show {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
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
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: operation=move {"operation":"move","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// Move Picture
//
// Moves picture 1 to (0, 0) over 60 frames

$gameScreen.movePicture(
    1,         // Picture ID
    0,            // Origin (0 = Upper Left, 1 = Center)
    0,                 // Target X position
    0,                 // Target Y position
    100,            // Target Scale X (%)
    100,            // Target Scale Y (%)
    255,           // Target Opacity (0-255)
    0,         // Target Blend mode
    60,          // Duration (frames)
    0                     // Easing type (0 = constant speed)
);

// ==== case: operation=rotate {"operation":"rotate","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// Rotate Picture
//
// Rotates picture 1 at 1 degrees per frame

$gameScreen.rotatePicture(1, 1);

// Note: Positive values rotate clockwise, negative counter-clockwise
// To stop rotation, set speed to 0:
// $gameScreen.rotatePicture(1, 0);

// ==== case: operation=tint {"operation":"tint","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// Tint Picture
//
// Applies color tint to picture 1

$gameScreen.tintPicture(
    1,                                   // Picture ID
    [0, 0, 0, 0],  // [Red, Green, Blue, Gray]
    60                                     // Duration (frames)
);

// Tint values: Red/Green/Blue = -255 to 255, Gray = 0 to 255
// To remove tint: [0, 0, 0, 0]

// ==== case: operation=erase {"operation":"erase","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// Erase Picture
//
// Removes picture 1 from screen

$gameScreen.erasePicture(1);

// ==== case: operation=utility {"operation":"utility","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
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

// ==== case: imageName=empty {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":""}
// rejects: Image Name is required for Show Picture operation
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

// ==== case: origin=0 {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
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
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: origin=1 {"operation":"show","pictureId":1,"origin":"1","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
// Show Picture
//
// Displays picture 1 at position (0, 0)

$gameScreen.showPicture(
    1,         // Picture ID
    'Pic1',       // Image name (from img/pictures/)
    1,            // Origin (0 = Upper Left, 1 = Center)
    0,                 // X position
    0,                 // Y position
    100,            // Scale X (%)
    100,            // Scale Y (%)
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: blendMode=0 {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
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
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: blendMode=1 {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"1","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
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
    255,           // Opacity (0-255)
    1          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: blendMode=2 {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"2","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
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
    255,           // Opacity (0-255)
    2          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: blendMode=3 {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"3","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"Pic1"}
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
    255,           // Opacity (0-255)
    3          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: imageName=comment-space {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"X */ globalThis.__pwn = 1; /* Y"}
// Show Picture
//
// Displays picture 1 at position (0, 0)

$gameScreen.showPicture(
    1,         // Picture ID
    'X */ globalThis.__pwn = 1; /* Y',       // Image name (from img/pictures/)
    0,            // Origin (0 = Upper Left, 1 = Center)
    0,                 // X position
    0,                 // Y position
    100,            // Scale X (%)
    100,            // Scale Y (%)
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: imageName=comment-u2028 {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// Show Picture
//
// Displays picture 1 at position (0, 0)

$gameScreen.showPicture(
    1,         // Picture ID
    'X */ globalThis.__pwn = 1; /* Y',       // Image name (from img/pictures/)
    0,            // Origin (0 = Upper Left, 1 = Center)
    0,                 // X position
    0,                 // Y position
    100,            // Scale X (%)
    100,            // Scale Y (%)
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: imageName=comment-u2029 {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// Show Picture
//
// Displays picture 1 at position (0, 0)

$gameScreen.showPicture(
    1,         // Picture ID
    'X */ globalThis.__pwn = 1; /* Y',       // Image name (from img/pictures/)
    0,            // Origin (0 = Upper Left, 1 = Center)
    0,                 // X position
    0,                 // Y position
    100,            // Scale X (%)
    100,            // Scale Y (%)
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: imageName=comment-lf {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"X */\nglobalThis.__pwn = 1; /* Y"}
// Show Picture
//
// Displays picture 1 at position (0, 0)

$gameScreen.showPicture(
    1,         // Picture ID
    'X */\nglobalThis.__pwn = 1; /* Y',       // Image name (from img/pictures/)
    0,            // Origin (0 = Upper Left, 1 = Center)
    0,                 // X position
    0,                 // Y position
    100,            // Scale X (%)
    100,            // Scale Y (%)
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: imageName=quote-single {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"X' + (globalThis.__pwn = 1) + 'Y"}
// Show Picture
//
// Displays picture 1 at position (0, 0)

$gameScreen.showPicture(
    1,         // Picture ID
    'X\' + (globalThis.__pwn = 1) + \'Y',       // Image name (from img/pictures/)
    0,            // Origin (0 = Upper Left, 1 = Center)
    0,                 // X position
    0,                 // Y position
    100,            // Scale X (%)
    100,            // Scale Y (%)
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: imageName=quote-double {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// Show Picture
//
// Displays picture 1 at position (0, 0)

$gameScreen.showPicture(
    1,         // Picture ID
    'X" + (globalThis.__pwn = 1) + "Y',       // Image name (from img/pictures/)
    0,            // Origin (0 = Upper Left, 1 = Center)
    0,                 // X position
    0,                 // Y position
    100,            // Scale X (%)
    100,            // Scale Y (%)
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);

// ==== case: imageName=quote-backtick {"operation":"show","pictureId":1,"origin":"0","x":0,"y":0,"scaleX":100,"scaleY":100,"opacity":255,"blendMode":"0","duration":60,"rotationSpeed":1,"tintRed":0,"tintGreen":0,"tintBlue":0,"tintGray":0,"imageName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// Show Picture
//
// Displays picture 1 at position (0, 0)

$gameScreen.showPicture(
    1,         // Picture ID
    'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y',       // Image name (from img/pictures/)
    0,            // Origin (0 = Upper Left, 1 = Center)
    0,                 // X position
    0,                 // Y position
    100,            // Scale X (%)
    100,            // Scale Y (%)
    255,           // Opacity (0-255)
    0          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)
);
