// ==== case: base {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample"}
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

// ==== case: parentClass=Sprite {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample"}
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

// ==== case: parentClass=Sprite_Base {"parentClass":"Sprite_Base","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample"}
//-----------------------------------------------------------------------------
// Sprite_Sample
//
// Custom sprite class extending Sprite_Base.
//-----------------------------------------------------------------------------

function Sprite_Sample() {
    this.initialize(...arguments);
}

Sprite_Sample.prototype = Object.create(Sprite_Base.prototype);
Sprite_Sample.prototype.constructor = Sprite_Sample;

Sprite_Sample.prototype.initialize = function() {
    Sprite_Base.prototype.initialize.call(this);

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
    Sprite_Base.prototype.update.call(this);

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

// ==== case: parentClass=Sprite_Clickable {"parentClass":"Sprite_Clickable","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample"}
//-----------------------------------------------------------------------------
// Sprite_Sample
//
// Custom sprite class extending Sprite_Clickable.
//-----------------------------------------------------------------------------

function Sprite_Sample() {
    this.initialize(...arguments);
}

Sprite_Sample.prototype = Object.create(Sprite_Clickable.prototype);
Sprite_Sample.prototype.constructor = Sprite_Sample;

Sprite_Sample.prototype.initialize = function() {
    Sprite_Clickable.prototype.initialize.call(this);

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
    Sprite_Clickable.prototype.update.call(this);

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

Sprite_Sample.prototype.onClick = function() {
    // Handle click/touch
    console.log('Sprite_Sample clicked!');
};

// ==== case: useBitmap=none {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample"}
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

// ==== case: useBitmap=empty {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"empty","includeUpdate":true,"spriteName":"Sample"}
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

    // Create empty bitmap
    this.bitmap = new Bitmap(48, 48);

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

// ==== case: useBitmap=filled {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"filled","includeUpdate":true,"spriteName":"Sample"}
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

    // Create filled bitmap
    this.bitmap = new Bitmap(48, 48);
    this.bitmap.fillRect(0, 0, 48, 48, '#ffffff');

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

// ==== case: fillColor=empty {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample","fillColor":""}
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

// ==== case: includeUpdate=false {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":false,"spriteName":"Sample"}
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

// ==== case: spriteName=comment-space {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1Y
//
// Custom sprite class extending Sprite.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1Y;

Sprite_XglobalThispwn1Y.prototype.initialize = function() {
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

Sprite_XglobalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);

    // Update animation
    this.updateAnimation();
};

Sprite_XglobalThispwn1Y.prototype.updateAnimation = function() {
    this._animationCount++;

    // Example: Update every 12 frames
    if (this._animationCount >= 12) {
        this._animationCount = 0;
        this._pattern = (this._pattern + 1) % 4;
        // Update sprite based on pattern
        this.updatePattern();
    }
};

Sprite_XglobalThispwn1Y.prototype.updatePattern = function() {
    // Override this to update sprite based on this._pattern
    // Example: Change frame for spritesheet
    // const frameWidth = this.bitmap.width / 4;
    // this.setFrame(this._pattern * frameWidth, 0, frameWidth, this.bitmap.height);
};

// ==== case: spriteName=comment-u2028 {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1Y
//
// Custom sprite class extending Sprite.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1Y;

Sprite_XglobalThispwn1Y.prototype.initialize = function() {
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

Sprite_XglobalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);

    // Update animation
    this.updateAnimation();
};

Sprite_XglobalThispwn1Y.prototype.updateAnimation = function() {
    this._animationCount++;

    // Example: Update every 12 frames
    if (this._animationCount >= 12) {
        this._animationCount = 0;
        this._pattern = (this._pattern + 1) % 4;
        // Update sprite based on pattern
        this.updatePattern();
    }
};

Sprite_XglobalThispwn1Y.prototype.updatePattern = function() {
    // Override this to update sprite based on this._pattern
    // Example: Change frame for spritesheet
    // const frameWidth = this.bitmap.width / 4;
    // this.setFrame(this._pattern * frameWidth, 0, frameWidth, this.bitmap.height);
};

// ==== case: spriteName=comment-u2029 {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1Y
//
// Custom sprite class extending Sprite.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1Y;

Sprite_XglobalThispwn1Y.prototype.initialize = function() {
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

Sprite_XglobalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);

    // Update animation
    this.updateAnimation();
};

Sprite_XglobalThispwn1Y.prototype.updateAnimation = function() {
    this._animationCount++;

    // Example: Update every 12 frames
    if (this._animationCount >= 12) {
        this._animationCount = 0;
        this._pattern = (this._pattern + 1) % 4;
        // Update sprite based on pattern
        this.updatePattern();
    }
};

Sprite_XglobalThispwn1Y.prototype.updatePattern = function() {
    // Override this to update sprite based on this._pattern
    // Example: Change frame for spritesheet
    // const frameWidth = this.bitmap.width / 4;
    // this.setFrame(this._pattern * frameWidth, 0, frameWidth, this.bitmap.height);
};

// ==== case: spriteName=comment-lf {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1Y
//
// Custom sprite class extending Sprite.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1Y;

Sprite_XglobalThispwn1Y.prototype.initialize = function() {
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

Sprite_XglobalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);

    // Update animation
    this.updateAnimation();
};

Sprite_XglobalThispwn1Y.prototype.updateAnimation = function() {
    this._animationCount++;

    // Example: Update every 12 frames
    if (this._animationCount >= 12) {
        this._animationCount = 0;
        this._pattern = (this._pattern + 1) % 4;
        // Update sprite based on pattern
        this.updatePattern();
    }
};

Sprite_XglobalThispwn1Y.prototype.updatePattern = function() {
    // Override this to update sprite based on this._pattern
    // Example: Change frame for spritesheet
    // const frameWidth = this.bitmap.width / 4;
    // this.setFrame(this._pattern * frameWidth, 0, frameWidth, this.bitmap.height);
};

// ==== case: spriteName=quote-single {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1Y
//
// Custom sprite class extending Sprite.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1Y;

Sprite_XglobalThispwn1Y.prototype.initialize = function() {
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

Sprite_XglobalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);

    // Update animation
    this.updateAnimation();
};

Sprite_XglobalThispwn1Y.prototype.updateAnimation = function() {
    this._animationCount++;

    // Example: Update every 12 frames
    if (this._animationCount >= 12) {
        this._animationCount = 0;
        this._pattern = (this._pattern + 1) % 4;
        // Update sprite based on pattern
        this.updatePattern();
    }
};

Sprite_XglobalThispwn1Y.prototype.updatePattern = function() {
    // Override this to update sprite based on this._pattern
    // Example: Change frame for spritesheet
    // const frameWidth = this.bitmap.width / 4;
    // this.setFrame(this._pattern * frameWidth, 0, frameWidth, this.bitmap.height);
};

// ==== case: spriteName=quote-double {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1Y
//
// Custom sprite class extending Sprite.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1Y;

Sprite_XglobalThispwn1Y.prototype.initialize = function() {
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

Sprite_XglobalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);

    // Update animation
    this.updateAnimation();
};

Sprite_XglobalThispwn1Y.prototype.updateAnimation = function() {
    this._animationCount++;

    // Example: Update every 12 frames
    if (this._animationCount >= 12) {
        this._animationCount = 0;
        this._pattern = (this._pattern + 1) % 4;
        // Update sprite based on pattern
        this.updatePattern();
    }
};

Sprite_XglobalThispwn1Y.prototype.updatePattern = function() {
    // Override this to update sprite based on this._pattern
    // Example: Change frame for spritesheet
    // const frameWidth = this.bitmap.width / 4;
    // this.setFrame(this._pattern * frameWidth, 0, frameWidth, this.bitmap.height);
};

// ==== case: spriteName=quote-backtick {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1globalThispwn1Y
//
// Custom sprite class extending Sprite.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1globalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1globalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1globalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1globalThispwn1Y;

Sprite_XglobalThispwn1globalThispwn1Y.prototype.initialize = function() {
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

Sprite_XglobalThispwn1globalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);

    // Update animation
    this.updateAnimation();
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.updateAnimation = function() {
    this._animationCount++;

    // Example: Update every 12 frames
    if (this._animationCount >= 12) {
        this._animationCount = 0;
        this._pattern = (this._pattern + 1) % 4;
        // Update sprite based on pattern
        this.updatePattern();
    }
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.updatePattern = function() {
    // Override this to update sprite based on this._pattern
    // Example: Change frame for spritesheet
    // const frameWidth = this.bitmap.width / 4;
    // this.setFrame(this._pattern * frameWidth, 0, frameWidth, this.bitmap.height);
};

// ==== case: fillColor=comment-space {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample","fillColor":"X */ globalThis.__pwn = 1; /* Y"}
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

// ==== case: fillColor=comment-u2028 {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample","fillColor":"X */\u2028globalThis.__pwn = 1; /* Y"}
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

// ==== case: fillColor=comment-u2029 {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample","fillColor":"X */\u2029globalThis.__pwn = 1; /* Y"}
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

// ==== case: fillColor=comment-lf {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample","fillColor":"X */\nglobalThis.__pwn = 1; /* Y"}
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

// ==== case: fillColor=quote-single {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample","fillColor":"X' + (globalThis.__pwn = 1) + 'Y"}
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

// ==== case: fillColor=quote-double {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample","fillColor":"X\" + (globalThis.__pwn = 1) + \"Y"}
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

// ==== case: fillColor=quote-backtick {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"none","includeUpdate":true,"spriteName":"Sample","fillColor":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
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

// ==== case: useBitmap=filled,fillColor=comment-space {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"filled","includeUpdate":true,"spriteName":"Sample","fillColor":"X */ globalThis.__pwn = 1; /* Y"}
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

    // Create filled bitmap
    this.bitmap = new Bitmap(48, 48);
    this.bitmap.fillRect(0, 0, 48, 48, 'X */ globalThis.__pwn = 1; /* Y');

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

// ==== case: useBitmap=filled,fillColor=comment-u2028 {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"filled","includeUpdate":true,"spriteName":"Sample","fillColor":"X */\u2028globalThis.__pwn = 1; /* Y"}
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

    // Create filled bitmap
    this.bitmap = new Bitmap(48, 48);
    this.bitmap.fillRect(0, 0, 48, 48, 'X */\u2028globalThis.__pwn = 1; /* Y');

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

// ==== case: useBitmap=filled,fillColor=comment-u2029 {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"filled","includeUpdate":true,"spriteName":"Sample","fillColor":"X */\u2029globalThis.__pwn = 1; /* Y"}
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

    // Create filled bitmap
    this.bitmap = new Bitmap(48, 48);
    this.bitmap.fillRect(0, 0, 48, 48, 'X */\u2029globalThis.__pwn = 1; /* Y');

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

// ==== case: useBitmap=filled,fillColor=comment-lf {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"filled","includeUpdate":true,"spriteName":"Sample","fillColor":"X */\nglobalThis.__pwn = 1; /* Y"}
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

    // Create filled bitmap
    this.bitmap = new Bitmap(48, 48);
    this.bitmap.fillRect(0, 0, 48, 48, 'X */\nglobalThis.__pwn = 1; /* Y');

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

// ==== case: useBitmap=filled,fillColor=quote-single {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"filled","includeUpdate":true,"spriteName":"Sample","fillColor":"X' + (globalThis.__pwn = 1) + 'Y"}
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

    // Create filled bitmap
    this.bitmap = new Bitmap(48, 48);
    this.bitmap.fillRect(0, 0, 48, 48, 'X\' + (globalThis.__pwn = 1) + \'Y');

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

// ==== case: useBitmap=filled,fillColor=quote-double {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"filled","includeUpdate":true,"spriteName":"Sample","fillColor":"X\" + (globalThis.__pwn = 1) + \"Y"}
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

    // Create filled bitmap
    this.bitmap = new Bitmap(48, 48);
    this.bitmap.fillRect(0, 0, 48, 48, 'X" + (globalThis.__pwn = 1) + "Y');

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

// ==== case: useBitmap=filled,fillColor=quote-backtick {"parentClass":"Sprite","width":48,"height":48,"useBitmap":"filled","includeUpdate":true,"spriteName":"Sample","fillColor":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
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

    // Create filled bitmap
    this.bitmap = new Bitmap(48, 48);
    this.bitmap.fillRect(0, 0, 48, 48, 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y');

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
