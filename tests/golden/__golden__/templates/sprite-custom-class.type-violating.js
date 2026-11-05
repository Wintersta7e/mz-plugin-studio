// ==== case: type-violating: wrong types {"spriteName":42,"parentClass":7,"width":"abc","height":"abc","useBitmap":7,"fillColor":42,"includeUpdate":"yes"}
// rejects: Field "Sprite Name" must be text | Field "Parent Class" must be text | Field "Width" must be a number | Field "Height" must be a number | Field "Create Bitmap" must be text | Field "Fill Color" must be text | Field "Include Update Logic" must be true or false
// throws: TypeError

// ==== case: type-violating: null {"spriteName":null,"parentClass":null,"width":null,"height":null,"useBitmap":null,"fillColor":null,"includeUpdate":null}
// rejects: Width must be a positive number | Height must be a positive number
// throws: TypeError

// ==== case: type-violating: arrays {"spriteName":["a","b"],"parentClass":["a","b"],"width":["a","b"],"height":["a","b"],"useBitmap":["a","b"],"fillColor":["a","b"],"includeUpdate":["a","b"]}
// rejects: Field "Sprite Name" must be text | Field "Parent Class" must be text | Field "Width" must be a number | Field "Height" must be a number | Field "Create Bitmap" must be text | Field "Fill Color" must be text | Field "Include Update Logic" must be true or false
// throws: TypeError

// ==== case: type-violating: width=null {"parentClass":"Sprite","width":null,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample"}
// rejects: Width must be a positive number
//-----------------------------------------------------------------------------
// Sprite_Sample
//
// Custom sprite class extending Sprite.
//-----------------------------------------------------------------------------

function Sprite_Sample() {
    this.initialize(...arguments);
}

Sprite_Sample.prototype = Object.create(Sprite.prototype);
Sprite_Sample.prototype.constructor = Sprite_Sample;

Sprite_Sample.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this);

    // Initialize sprite properties
    this._animationCount = 0;
    this._pattern = 0;

    // Load external image
    // this.bitmap = ImageManager.loadPicture('your_image');

    // Set anchor to center (optional)
    this.anchor.x = 0.5;
    this.anchor.y = 0.5;
};

Sprite_Sample.prototype.update = function() {
    Sprite.prototype.update.call(this);

    // Update animation
    this.updateAnimation();
};

Sprite_Sample.prototype.updateAnimation = function() {
    this._animationCount++;

    // Example: Update every 12 frames
    if (this._animationCount >= 12) {
        this._animationCount = 0;
        this._pattern = (this._pattern + 1) % 4;
        // Update sprite based on pattern
        this.updatePattern();
    }
};

Sprite_Sample.prototype.updatePattern = function() {
    // Override this to update sprite based on this._pattern
    // Example: Change frame for spritesheet
    // const frameWidth = this.bitmap.width / 4;
    // this.setFrame(this._pattern * frameWidth, 0, frameWidth, this.bitmap.height);
};

// ==== case: type-violating: parentClass=7,width="abc",height=null,useBitmap="empty" {"parentClass":7,"width":"abc","height":null,"useBitmap":"empty","includeUpdate":true,"spriteName":"Sample"}
// rejects: Field "Parent Class" must be text | Field "Width" must be a number
//-----------------------------------------------------------------------------
// Sprite_Sample
//
// Custom sprite class extending 7.
//-----------------------------------------------------------------------------

function Sprite_Sample() {
    this.initialize(...arguments);
}

Sprite_Sample.prototype = Object.create(7.prototype);
Sprite_Sample.prototype.constructor = Sprite_Sample;

Sprite_Sample.prototype.initialize = function() {
    7.prototype.initialize.call(this);

    // Initialize sprite properties
    this._animationCount = 0;
    this._pattern = 0;

    // Create empty bitmap
    this.bitmap = new Bitmap(abc, 48);

    // Set anchor to center (optional)
    this.anchor.x = 0.5;
    this.anchor.y = 0.5;
};

Sprite_Sample.prototype.update = function() {
    7.prototype.update.call(this);

    // Update animation
    this.updateAnimation();
};

Sprite_Sample.prototype.updateAnimation = function() {
    this._animationCount++;

    // Example: Update every 12 frames
    if (this._animationCount >= 12) {
        this._animationCount = 0;
        this._pattern = (this._pattern + 1) % 4;
        // Update sprite based on pattern
        this.updatePattern();
    }
};

Sprite_Sample.prototype.updatePattern = function() {
    // Override this to update sprite based on this._pattern
    // Example: Change frame for spritesheet
    // const frameWidth = this.bitmap.width / 4;
    // this.setFrame(this._pattern * frameWidth, 0, frameWidth, this.bitmap.height);
};

// ==== case: type-violating: width=["a","b"],useBitmap="filled",fillColor=7 {"parentClass":"Sprite","width":["a","b"],"height":48,"useBitmap":"filled","includeUpdate":true,"spriteName":"Sample","fillColor":7}
// rejects: Field "Width" must be a number | Field "Fill Color" must be text
// throws: TypeError
