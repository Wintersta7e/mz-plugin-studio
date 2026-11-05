// ==== case: type-violating: wrong types {"animationType":7,"spriteName":42,"frameCount":"abc","frameWidth":"abc","frameHeight":"abc","columns":"abc","frameDelay":"abc","loop":"yes","autoPlay":"yes","targetClass":42}
// rejects: Field "Animation Type" must be text | Field "Sprite Class Name" must be text | Field "Frame Count" must be a number | Field "Frame Width" must be a number | Field "Frame Height" must be a number | Field "Columns" must be a number | Field "Frame Delay" must be a number | Field "Loop Animation" must be true or false | Field "Auto Play" must be true or false | Field "Target Sprite Class" must be text
// throws: TypeError

// ==== case: type-violating: null {"animationType":null,"spriteName":null,"frameCount":null,"frameWidth":null,"frameHeight":null,"columns":null,"frameDelay":null,"loop":null,"autoPlay":null,"targetClass":null}
// rejects: Field "Animation Type" is required | Field "Sprite Class Name" is required | Frame Count must be at least 1 | Frame Width must be a positive number | Frame Height must be a positive number | Frame Delay must be at least 1
// throws: TypeError

// ==== case: type-violating: arrays {"animationType":["a","b"],"spriteName":["a","b"],"frameCount":["a","b"],"frameWidth":["a","b"],"frameHeight":["a","b"],"columns":["a","b"],"frameDelay":["a","b"],"loop":["a","b"],"autoPlay":["a","b"],"targetClass":["a","b"]}
// rejects: Field "Animation Type" must be text | Field "Sprite Class Name" must be text | Field "Frame Count" must be a number | Field "Frame Width" must be a number | Field "Frame Height" must be a number | Field "Columns" must be a number | Field "Frame Delay" must be a number | Field "Loop Animation" must be true or false | Field "Auto Play" must be true or false | Field "Target Sprite Class" must be text
// throws: TypeError

// ==== case: type-violating: frameCount=null,frameWidth=null {"animationType":"horizontal","frameCount":null,"frameWidth":null,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample"}
// rejects: Frame Count must be at least 1 | Frame Width must be a positive number
//-----------------------------------------------------------------------------
// Sprite_Sample
//
// Animated sprite with frame-based animation support.
//-----------------------------------------------------------------------------

function Sprite_Sample() {
    this.initialize(...arguments);
}

Sprite_Sample.prototype = Object.create(Sprite.prototype);
Sprite_Sample.prototype.constructor = Sprite_Sample;

Sprite_Sample.prototype.initialize = function(imageName) {
    Sprite.prototype.initialize.call(this);

    // Animation properties
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
    this._frameWidth = 48;
    this._frameHeight = 48;

    // Load bitmap if provided
    if (imageName) {
        this.bitmap = ImageManager.loadPicture(imageName);
        this.bitmap.addLoadListener(this.onBitmapLoad.bind(this));
    }
};

Sprite_Sample.prototype.onBitmapLoad = function() {
    // Set initial frame
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {
        this.updateFrameAnimation();
    }
};

Sprite_Sample.prototype.updateFrameAnimation = function() {
    this._animFrameCount++;
    if (this._animFrameCount >= this._animDelay) {
        this._animFrameCount = 0;
        this._animPattern++;
        if (this._animPattern >= this._animMaxPattern) {
            if (this._animLoop) {
                this._animPattern = 0;
            } else {
                this._animPattern = this._animMaxPattern - 1;
                this._animPlaying = false;
                this.onAnimationEnd();
            }
        }
        this.updateAnimationFrame();
    }
};

Sprite_Sample.prototype.updateAnimationFrame = function() {
    // Horizontal strip layout
    const x = this._animPattern * this._frameWidth;
    this.setFrame(x, 0, this._frameWidth, this._frameHeight);
};

Sprite_Sample.prototype.onAnimationEnd = function() {
    // Override this for custom behavior when animation ends
};

// Animation Control Methods

Sprite_Sample.prototype.play = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_Sample.prototype.stop = function() {
    this._animPlaying = false;
    this._animPattern = 0;
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.pause = function() {
    this._animPlaying = false;
};

Sprite_Sample.prototype.resume = function() {
    this._animPlaying = true;
};

Sprite_Sample.prototype.setFrameDelay = function(delay) {
    this._animDelay = delay;
};

Sprite_Sample.prototype.setLoop = function(loop) {
    this._animLoop = loop;
};

Sprite_Sample.prototype.gotoFrame = function(frame) {
    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.isPlaying = function() {
    return this._animPlaying;
};

Sprite_Sample.prototype.currentFrame = function() {
    return this._animPattern;
};

// ==== case: type-violating: frameDelay="abc",frameHeight=["a","b"] {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":["a","b"],"columns":4,"frameDelay":"abc","loop":true,"autoPlay":true,"spriteName":"Sample"}
// rejects: Field "Frame Height" must be a number | Field "Frame Delay" must be a number
//-----------------------------------------------------------------------------
// Sprite_Sample
//
// Animated sprite with frame-based animation support.
//-----------------------------------------------------------------------------

function Sprite_Sample() {
    this.initialize(...arguments);
}

Sprite_Sample.prototype = Object.create(Sprite.prototype);
Sprite_Sample.prototype.constructor = Sprite_Sample;

Sprite_Sample.prototype.initialize = function(imageName) {
    Sprite.prototype.initialize.call(this);

    // Animation properties
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = abc;
    this._animLoop = true;
    this._animPlaying = true;
    this._frameWidth = 48;
    this._frameHeight = a,b;

    // Load bitmap if provided
    if (imageName) {
        this.bitmap = ImageManager.loadPicture(imageName);
        this.bitmap.addLoadListener(this.onBitmapLoad.bind(this));
    }
};

Sprite_Sample.prototype.onBitmapLoad = function() {
    // Set initial frame
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {
        this.updateFrameAnimation();
    }
};

Sprite_Sample.prototype.updateFrameAnimation = function() {
    this._animFrameCount++;
    if (this._animFrameCount >= this._animDelay) {
        this._animFrameCount = 0;
        this._animPattern++;
        if (this._animPattern >= this._animMaxPattern) {
            if (this._animLoop) {
                this._animPattern = 0;
            } else {
                this._animPattern = this._animMaxPattern - 1;
                this._animPlaying = false;
                this.onAnimationEnd();
            }
        }
        this.updateAnimationFrame();
    }
};

Sprite_Sample.prototype.updateAnimationFrame = function() {
    // Horizontal strip layout
    const x = this._animPattern * this._frameWidth;
    this.setFrame(x, 0, this._frameWidth, this._frameHeight);
};

Sprite_Sample.prototype.onAnimationEnd = function() {
    // Override this for custom behavior when animation ends
};

// Animation Control Methods

Sprite_Sample.prototype.play = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_Sample.prototype.stop = function() {
    this._animPlaying = false;
    this._animPattern = 0;
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.pause = function() {
    this._animPlaying = false;
};

Sprite_Sample.prototype.resume = function() {
    this._animPlaying = true;
};

Sprite_Sample.prototype.setFrameDelay = function(delay) {
    this._animDelay = delay;
};

Sprite_Sample.prototype.setLoop = function(loop) {
    this._animLoop = loop;
};

Sprite_Sample.prototype.gotoFrame = function(frame) {
    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.isPlaying = function() {
    return this._animPlaying;
};

Sprite_Sample.prototype.currentFrame = function() {
    return this._animPattern;
};

// ==== case: type-violating: animationType="grid",columns=["a","b"] {"animationType":"grid","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":["a","b"],"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample"}
// rejects: Field "Columns" must be a number
//-----------------------------------------------------------------------------
// Sprite_Sample
//
// Animated sprite with frame-based animation support.
//-----------------------------------------------------------------------------

function Sprite_Sample() {
    this.initialize(...arguments);
}

Sprite_Sample.prototype = Object.create(Sprite.prototype);
Sprite_Sample.prototype.constructor = Sprite_Sample;

Sprite_Sample.prototype.initialize = function(imageName) {
    Sprite.prototype.initialize.call(this);

    // Animation properties
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
    this._frameWidth = 48;
    this._frameHeight = 48;
    this._columns = a,b;

    // Load bitmap if provided
    if (imageName) {
        this.bitmap = ImageManager.loadPicture(imageName);
        this.bitmap.addLoadListener(this.onBitmapLoad.bind(this));
    }
};

Sprite_Sample.prototype.onBitmapLoad = function() {
    // Set initial frame
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {
        this.updateFrameAnimation();
    }
};

Sprite_Sample.prototype.updateFrameAnimation = function() {
    this._animFrameCount++;
    if (this._animFrameCount >= this._animDelay) {
        this._animFrameCount = 0;
        this._animPattern++;
        if (this._animPattern >= this._animMaxPattern) {
            if (this._animLoop) {
                this._animPattern = 0;
            } else {
                this._animPattern = this._animMaxPattern - 1;
                this._animPlaying = false;
                this.onAnimationEnd();
            }
        }
        this.updateAnimationFrame();
    }
};

Sprite_Sample.prototype.updateAnimationFrame = function() {
    // Grid layout
    const col = this._animPattern % this._columns;
    const row = Math.floor(this._animPattern / this._columns);
    const x = col * this._frameWidth;
    const y = row * this._frameHeight;
    this.setFrame(x, y, this._frameWidth, this._frameHeight);
};

Sprite_Sample.prototype.onAnimationEnd = function() {
    // Override this for custom behavior when animation ends
};

// Animation Control Methods

Sprite_Sample.prototype.play = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_Sample.prototype.stop = function() {
    this._animPlaying = false;
    this._animPattern = 0;
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.pause = function() {
    this._animPlaying = false;
};

Sprite_Sample.prototype.resume = function() {
    this._animPlaying = true;
};

Sprite_Sample.prototype.setFrameDelay = function(delay) {
    this._animDelay = delay;
};

Sprite_Sample.prototype.setLoop = function(loop) {
    this._animLoop = loop;
};

Sprite_Sample.prototype.gotoFrame = function(frame) {
    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.isPlaying = function() {
    return this._animPlaying;
};

Sprite_Sample.prototype.currentFrame = function() {
    return this._animPattern;
};

// ==== case: type-violating: animationType="mixin",targetClass=7,frameCount="abc",columns=["a","b"] {"animationType":"mixin","frameCount":"abc","frameWidth":48,"frameHeight":48,"columns":["a","b"],"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":7}
// rejects: Field "Frame Count" must be a number | Field "Columns" must be a number | Field "Target Sprite Class" must be text
// Animation Mixin
//
// Adds frame-based animation to 7
//-----------------------------------------------------------------------------

// Store original initialize
const _7_initialize = 7.prototype.initialize;
7.prototype.initialize = function() {
    _7_initialize.apply(this, arguments);
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = abc;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
};

// Store original update
const _7_update = 7.prototype.update;
7.prototype.update = function() {
    _7_update.call(this);
    if (this._animPlaying) {
        this.updateFrameAnimation();
    }
};

7.prototype.updateFrameAnimation = function() {
    this._animFrameCount++;
    if (this._animFrameCount >= this._animDelay) {
        this._animFrameCount = 0;
        this._animPattern++;
        if (this._animPattern >= this._animMaxPattern) {
            if (this._animLoop) {
                this._animPattern = 0;
            } else {
                this._animPattern = this._animMaxPattern - 1;
                this._animPlaying = false;
            }
        }
        this.updateAnimationFrame();
    }
};

7.prototype.updateAnimationFrame = function() {
    // Override this method to set the frame based on this._animPattern
    this.setFrame(this._animPattern * 48, 0, 48, 48);
};

// Animation control methods
7.prototype.playAnimation = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

7.prototype.stopAnimation = function() {
    this._animPlaying = false;
};

7.prototype.pauseAnimation = function() {
    this._animPlaying = false;
};

7.prototype.resumeAnimation = function() {
    this._animPlaying = true;
};

// ==== case: type-violating: animationType="mixin",columns="3",frameWidth=null {"animationType":"mixin","frameCount":4,"frameWidth":null,"frameHeight":48,"columns":"3","frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample"}
// rejects: Field "Columns" must be a number
// Animation Mixin
//
// Adds frame-based animation to Sprite_Base
//-----------------------------------------------------------------------------

// Store original initialize
const _Sprite_Base_initialize = Sprite_Base.prototype.initialize;
Sprite_Base.prototype.initialize = function() {
    _Sprite_Base_initialize.apply(this, arguments);
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
};

// Store original update
const _Sprite_Base_update = Sprite_Base.prototype.update;
Sprite_Base.prototype.update = function() {
    _Sprite_Base_update.call(this);
    if (this._animPlaying) {
        this.updateFrameAnimation();
    }
};

Sprite_Base.prototype.updateFrameAnimation = function() {
    this._animFrameCount++;
    if (this._animFrameCount >= this._animDelay) {
        this._animFrameCount = 0;
        this._animPattern++;
        if (this._animPattern >= this._animMaxPattern) {
            if (this._animLoop) {
                this._animPattern = 0;
            } else {
                this._animPattern = this._animMaxPattern - 1;
                this._animPlaying = false;
            }
        }
        this.updateAnimationFrame();
    }
};

Sprite_Base.prototype.updateAnimationFrame = function() {
    // Override this method to set the frame based on this._animPattern
    const col = this._animPattern % 3;
    const row = Math.floor(this._animPattern / 3);
    this.setFrame(col * 48, row * 48, 48, 48);
};

// Animation control methods
Sprite_Base.prototype.playAnimation = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_Base.prototype.stopAnimation = function() {
    this._animPlaying = false;
};

Sprite_Base.prototype.pauseAnimation = function() {
    this._animPlaying = false;
};

Sprite_Base.prototype.resumeAnimation = function() {
    this._animPlaying = true;
};

// ==== case: type-violating: animationType="mixin",targetClass=null {"animationType":"mixin","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":null}
// rejects: Target Sprite Class is required for Animation Mixin
// Animation Mixin
//
// Adds frame-based animation to Sprite_Base
//-----------------------------------------------------------------------------

// Store original initialize
const _Sprite_Base_initialize = Sprite_Base.prototype.initialize;
Sprite_Base.prototype.initialize = function() {
    _Sprite_Base_initialize.apply(this, arguments);
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
};

// Store original update
const _Sprite_Base_update = Sprite_Base.prototype.update;
Sprite_Base.prototype.update = function() {
    _Sprite_Base_update.call(this);
    if (this._animPlaying) {
        this.updateFrameAnimation();
    }
};

Sprite_Base.prototype.updateFrameAnimation = function() {
    this._animFrameCount++;
    if (this._animFrameCount >= this._animDelay) {
        this._animFrameCount = 0;
        this._animPattern++;
        if (this._animPattern >= this._animMaxPattern) {
            if (this._animLoop) {
                this._animPattern = 0;
            } else {
                this._animPattern = this._animMaxPattern - 1;
                this._animPlaying = false;
            }
        }
        this.updateAnimationFrame();
    }
};

Sprite_Base.prototype.updateAnimationFrame = function() {
    // Override this method to set the frame based on this._animPattern
    const col = this._animPattern % 4;
    const row = Math.floor(this._animPattern / 4);
    this.setFrame(col * 48, row * 48, 48, 48);
};

// Animation control methods
Sprite_Base.prototype.playAnimation = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_Base.prototype.stopAnimation = function() {
    this._animPlaying = false;
};

Sprite_Base.prototype.pauseAnimation = function() {
    this._animPlaying = false;
};

Sprite_Base.prototype.resumeAnimation = function() {
    this._animPlaying = true;
};

// ==== case: type-violating: animationType="vertical",frameCount=null {"animationType":"vertical","frameCount":null,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample"}
// rejects: Frame Count must be at least 1
//-----------------------------------------------------------------------------
// Sprite_Sample
//
// Animated sprite with frame-based animation support.
//-----------------------------------------------------------------------------

function Sprite_Sample() {
    this.initialize(...arguments);
}

Sprite_Sample.prototype = Object.create(Sprite.prototype);
Sprite_Sample.prototype.constructor = Sprite_Sample;

Sprite_Sample.prototype.initialize = function(imageName) {
    Sprite.prototype.initialize.call(this);

    // Animation properties
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
    this._frameWidth = 48;
    this._frameHeight = 48;

    // Load bitmap if provided
    if (imageName) {
        this.bitmap = ImageManager.loadPicture(imageName);
        this.bitmap.addLoadListener(this.onBitmapLoad.bind(this));
    }
};

Sprite_Sample.prototype.onBitmapLoad = function() {
    // Set initial frame
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {
        this.updateFrameAnimation();
    }
};

Sprite_Sample.prototype.updateFrameAnimation = function() {
    this._animFrameCount++;
    if (this._animFrameCount >= this._animDelay) {
        this._animFrameCount = 0;
        this._animPattern++;
        if (this._animPattern >= this._animMaxPattern) {
            if (this._animLoop) {
                this._animPattern = 0;
            } else {
                this._animPattern = this._animMaxPattern - 1;
                this._animPlaying = false;
                this.onAnimationEnd();
            }
        }
        this.updateAnimationFrame();
    }
};

Sprite_Sample.prototype.updateAnimationFrame = function() {
    // Vertical strip layout
    const y = this._animPattern * this._frameHeight;
    this.setFrame(0, y, this._frameWidth, this._frameHeight);
};

Sprite_Sample.prototype.onAnimationEnd = function() {
    // Override this for custom behavior when animation ends
};

// Animation Control Methods

Sprite_Sample.prototype.play = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_Sample.prototype.stop = function() {
    this._animPlaying = false;
    this._animPattern = 0;
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.pause = function() {
    this._animPlaying = false;
};

Sprite_Sample.prototype.resume = function() {
    this._animPlaying = true;
};

Sprite_Sample.prototype.setFrameDelay = function(delay) {
    this._animDelay = delay;
};

Sprite_Sample.prototype.setLoop = function(loop) {
    this._animLoop = loop;
};

Sprite_Sample.prototype.gotoFrame = function(frame) {
    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.isPlaying = function() {
    return this._animPlaying;
};

Sprite_Sample.prototype.currentFrame = function() {
    return this._animPattern;
};

// ==== case: type-violating: animationType=7 {"animationType":7,"frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample"}
// rejects: Field "Animation Type" must be text
//-----------------------------------------------------------------------------
// Sprite_Sample
//
// Animated sprite with frame-based animation support.
//-----------------------------------------------------------------------------

function Sprite_Sample() {
    this.initialize(...arguments);
}

Sprite_Sample.prototype = Object.create(Sprite.prototype);
Sprite_Sample.prototype.constructor = Sprite_Sample;

Sprite_Sample.prototype.initialize = function(imageName) {
    Sprite.prototype.initialize.call(this);

    // Animation properties
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
    this._frameWidth = 48;
    this._frameHeight = 48;

    // Load bitmap if provided
    if (imageName) {
        this.bitmap = ImageManager.loadPicture(imageName);
        this.bitmap.addLoadListener(this.onBitmapLoad.bind(this));
    }
};

Sprite_Sample.prototype.onBitmapLoad = function() {
    // Set initial frame
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {
        this.updateFrameAnimation();
    }
};

Sprite_Sample.prototype.updateFrameAnimation = function() {
    this._animFrameCount++;
    if (this._animFrameCount >= this._animDelay) {
        this._animFrameCount = 0;
        this._animPattern++;
        if (this._animPattern >= this._animMaxPattern) {
            if (this._animLoop) {
                this._animPattern = 0;
            } else {
                this._animPattern = this._animMaxPattern - 1;
                this._animPlaying = false;
                this.onAnimationEnd();
            }
        }
        this.updateAnimationFrame();
    }
};

Sprite_Sample.prototype.updateAnimationFrame = function() {
};

Sprite_Sample.prototype.onAnimationEnd = function() {
    // Override this for custom behavior when animation ends
};

// Animation Control Methods

Sprite_Sample.prototype.play = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_Sample.prototype.stop = function() {
    this._animPlaying = false;
    this._animPattern = 0;
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.pause = function() {
    this._animPlaying = false;
};

Sprite_Sample.prototype.resume = function() {
    this._animPlaying = true;
};

Sprite_Sample.prototype.setFrameDelay = function(delay) {
    this._animDelay = delay;
};

Sprite_Sample.prototype.setLoop = function(loop) {
    this._animLoop = loop;
};

Sprite_Sample.prototype.gotoFrame = function(frame) {
    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_Sample.prototype.isPlaying = function() {
    return this._animPlaying;
};

Sprite_Sample.prototype.currentFrame = function() {
    return this._animPattern;
};
