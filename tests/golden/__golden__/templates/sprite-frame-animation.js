// ==== case: base {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample"}
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

// ==== case: animationType=horizontal {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample"}
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

// ==== case: animationType=vertical {"animationType":"vertical","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample"}
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

// ==== case: animationType=grid {"animationType":"grid","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample"}
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
    this._columns = 4;

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

// ==== case: animationType=mixin {"animationType":"mixin","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample"}
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

// ==== case: loop=false {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":false,"autoPlay":true,"spriteName":"Sample"}
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
    this._animLoop = false;
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

// ==== case: autoPlay=false {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":false,"spriteName":"Sample"}
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
    this._animPlaying = false;
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

// ==== case: targetClass=empty {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":""}
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

// ==== case: spriteName=comment-space {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1Y
//
// Animated sprite with frame-based animation support.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1Y;

Sprite_XglobalThispwn1Y.prototype.initialize = function(imageName) {
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

Sprite_XglobalThispwn1Y.prototype.onBitmapLoad = function() {
    // Set initial frame
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {
        this.updateFrameAnimation();
    }
};

Sprite_XglobalThispwn1Y.prototype.updateFrameAnimation = function() {
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

Sprite_XglobalThispwn1Y.prototype.updateAnimationFrame = function() {
    // Horizontal strip layout
    const x = this._animPattern * this._frameWidth;
    this.setFrame(x, 0, this._frameWidth, this._frameHeight);
};

Sprite_XglobalThispwn1Y.prototype.onAnimationEnd = function() {
    // Override this for custom behavior when animation ends
};

// Animation Control Methods

Sprite_XglobalThispwn1Y.prototype.play = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_XglobalThispwn1Y.prototype.stop = function() {
    this._animPlaying = false;
    this._animPattern = 0;
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.pause = function() {
    this._animPlaying = false;
};

Sprite_XglobalThispwn1Y.prototype.resume = function() {
    this._animPlaying = true;
};

Sprite_XglobalThispwn1Y.prototype.setFrameDelay = function(delay) {
    this._animDelay = delay;
};

Sprite_XglobalThispwn1Y.prototype.setLoop = function(loop) {
    this._animLoop = loop;
};

Sprite_XglobalThispwn1Y.prototype.gotoFrame = function(frame) {
    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.isPlaying = function() {
    return this._animPlaying;
};

Sprite_XglobalThispwn1Y.prototype.currentFrame = function() {
    return this._animPattern;
};

// ==== case: spriteName=comment-u2028 {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1Y
//
// Animated sprite with frame-based animation support.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1Y;

Sprite_XglobalThispwn1Y.prototype.initialize = function(imageName) {
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

Sprite_XglobalThispwn1Y.prototype.onBitmapLoad = function() {
    // Set initial frame
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {
        this.updateFrameAnimation();
    }
};

Sprite_XglobalThispwn1Y.prototype.updateFrameAnimation = function() {
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

Sprite_XglobalThispwn1Y.prototype.updateAnimationFrame = function() {
    // Horizontal strip layout
    const x = this._animPattern * this._frameWidth;
    this.setFrame(x, 0, this._frameWidth, this._frameHeight);
};

Sprite_XglobalThispwn1Y.prototype.onAnimationEnd = function() {
    // Override this for custom behavior when animation ends
};

// Animation Control Methods

Sprite_XglobalThispwn1Y.prototype.play = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_XglobalThispwn1Y.prototype.stop = function() {
    this._animPlaying = false;
    this._animPattern = 0;
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.pause = function() {
    this._animPlaying = false;
};

Sprite_XglobalThispwn1Y.prototype.resume = function() {
    this._animPlaying = true;
};

Sprite_XglobalThispwn1Y.prototype.setFrameDelay = function(delay) {
    this._animDelay = delay;
};

Sprite_XglobalThispwn1Y.prototype.setLoop = function(loop) {
    this._animLoop = loop;
};

Sprite_XglobalThispwn1Y.prototype.gotoFrame = function(frame) {
    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.isPlaying = function() {
    return this._animPlaying;
};

Sprite_XglobalThispwn1Y.prototype.currentFrame = function() {
    return this._animPattern;
};

// ==== case: spriteName=comment-u2029 {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1Y
//
// Animated sprite with frame-based animation support.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1Y;

Sprite_XglobalThispwn1Y.prototype.initialize = function(imageName) {
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

Sprite_XglobalThispwn1Y.prototype.onBitmapLoad = function() {
    // Set initial frame
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {
        this.updateFrameAnimation();
    }
};

Sprite_XglobalThispwn1Y.prototype.updateFrameAnimation = function() {
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

Sprite_XglobalThispwn1Y.prototype.updateAnimationFrame = function() {
    // Horizontal strip layout
    const x = this._animPattern * this._frameWidth;
    this.setFrame(x, 0, this._frameWidth, this._frameHeight);
};

Sprite_XglobalThispwn1Y.prototype.onAnimationEnd = function() {
    // Override this for custom behavior when animation ends
};

// Animation Control Methods

Sprite_XglobalThispwn1Y.prototype.play = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_XglobalThispwn1Y.prototype.stop = function() {
    this._animPlaying = false;
    this._animPattern = 0;
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.pause = function() {
    this._animPlaying = false;
};

Sprite_XglobalThispwn1Y.prototype.resume = function() {
    this._animPlaying = true;
};

Sprite_XglobalThispwn1Y.prototype.setFrameDelay = function(delay) {
    this._animDelay = delay;
};

Sprite_XglobalThispwn1Y.prototype.setLoop = function(loop) {
    this._animLoop = loop;
};

Sprite_XglobalThispwn1Y.prototype.gotoFrame = function(frame) {
    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.isPlaying = function() {
    return this._animPlaying;
};

Sprite_XglobalThispwn1Y.prototype.currentFrame = function() {
    return this._animPattern;
};

// ==== case: spriteName=comment-lf {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1Y
//
// Animated sprite with frame-based animation support.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1Y;

Sprite_XglobalThispwn1Y.prototype.initialize = function(imageName) {
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

Sprite_XglobalThispwn1Y.prototype.onBitmapLoad = function() {
    // Set initial frame
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {
        this.updateFrameAnimation();
    }
};

Sprite_XglobalThispwn1Y.prototype.updateFrameAnimation = function() {
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

Sprite_XglobalThispwn1Y.prototype.updateAnimationFrame = function() {
    // Horizontal strip layout
    const x = this._animPattern * this._frameWidth;
    this.setFrame(x, 0, this._frameWidth, this._frameHeight);
};

Sprite_XglobalThispwn1Y.prototype.onAnimationEnd = function() {
    // Override this for custom behavior when animation ends
};

// Animation Control Methods

Sprite_XglobalThispwn1Y.prototype.play = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_XglobalThispwn1Y.prototype.stop = function() {
    this._animPlaying = false;
    this._animPattern = 0;
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.pause = function() {
    this._animPlaying = false;
};

Sprite_XglobalThispwn1Y.prototype.resume = function() {
    this._animPlaying = true;
};

Sprite_XglobalThispwn1Y.prototype.setFrameDelay = function(delay) {
    this._animDelay = delay;
};

Sprite_XglobalThispwn1Y.prototype.setLoop = function(loop) {
    this._animLoop = loop;
};

Sprite_XglobalThispwn1Y.prototype.gotoFrame = function(frame) {
    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.isPlaying = function() {
    return this._animPlaying;
};

Sprite_XglobalThispwn1Y.prototype.currentFrame = function() {
    return this._animPattern;
};

// ==== case: spriteName=quote-single {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1Y
//
// Animated sprite with frame-based animation support.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1Y;

Sprite_XglobalThispwn1Y.prototype.initialize = function(imageName) {
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

Sprite_XglobalThispwn1Y.prototype.onBitmapLoad = function() {
    // Set initial frame
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {
        this.updateFrameAnimation();
    }
};

Sprite_XglobalThispwn1Y.prototype.updateFrameAnimation = function() {
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

Sprite_XglobalThispwn1Y.prototype.updateAnimationFrame = function() {
    // Horizontal strip layout
    const x = this._animPattern * this._frameWidth;
    this.setFrame(x, 0, this._frameWidth, this._frameHeight);
};

Sprite_XglobalThispwn1Y.prototype.onAnimationEnd = function() {
    // Override this for custom behavior when animation ends
};

// Animation Control Methods

Sprite_XglobalThispwn1Y.prototype.play = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_XglobalThispwn1Y.prototype.stop = function() {
    this._animPlaying = false;
    this._animPattern = 0;
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.pause = function() {
    this._animPlaying = false;
};

Sprite_XglobalThispwn1Y.prototype.resume = function() {
    this._animPlaying = true;
};

Sprite_XglobalThispwn1Y.prototype.setFrameDelay = function(delay) {
    this._animDelay = delay;
};

Sprite_XglobalThispwn1Y.prototype.setLoop = function(loop) {
    this._animLoop = loop;
};

Sprite_XglobalThispwn1Y.prototype.gotoFrame = function(frame) {
    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.isPlaying = function() {
    return this._animPlaying;
};

Sprite_XglobalThispwn1Y.prototype.currentFrame = function() {
    return this._animPattern;
};

// ==== case: spriteName=quote-double {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1Y
//
// Animated sprite with frame-based animation support.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1Y;

Sprite_XglobalThispwn1Y.prototype.initialize = function(imageName) {
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

Sprite_XglobalThispwn1Y.prototype.onBitmapLoad = function() {
    // Set initial frame
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {
        this.updateFrameAnimation();
    }
};

Sprite_XglobalThispwn1Y.prototype.updateFrameAnimation = function() {
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

Sprite_XglobalThispwn1Y.prototype.updateAnimationFrame = function() {
    // Horizontal strip layout
    const x = this._animPattern * this._frameWidth;
    this.setFrame(x, 0, this._frameWidth, this._frameHeight);
};

Sprite_XglobalThispwn1Y.prototype.onAnimationEnd = function() {
    // Override this for custom behavior when animation ends
};

// Animation Control Methods

Sprite_XglobalThispwn1Y.prototype.play = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_XglobalThispwn1Y.prototype.stop = function() {
    this._animPlaying = false;
    this._animPattern = 0;
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.pause = function() {
    this._animPlaying = false;
};

Sprite_XglobalThispwn1Y.prototype.resume = function() {
    this._animPlaying = true;
};

Sprite_XglobalThispwn1Y.prototype.setFrameDelay = function(delay) {
    this._animDelay = delay;
};

Sprite_XglobalThispwn1Y.prototype.setLoop = function(loop) {
    this._animLoop = loop;
};

Sprite_XglobalThispwn1Y.prototype.gotoFrame = function(frame) {
    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1Y.prototype.isPlaying = function() {
    return this._animPlaying;
};

Sprite_XglobalThispwn1Y.prototype.currentFrame = function() {
    return this._animPattern;
};

// ==== case: spriteName=quote-backtick {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Sprite Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Sprite_XglobalThispwn1globalThispwn1Y
//
// Animated sprite with frame-based animation support.
//-----------------------------------------------------------------------------

function Sprite_XglobalThispwn1globalThispwn1Y() {
    this.initialize(...arguments);
}

Sprite_XglobalThispwn1globalThispwn1Y.prototype = Object.create(Sprite.prototype);
Sprite_XglobalThispwn1globalThispwn1Y.prototype.constructor = Sprite_XglobalThispwn1globalThispwn1Y;

Sprite_XglobalThispwn1globalThispwn1Y.prototype.initialize = function(imageName) {
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

Sprite_XglobalThispwn1globalThispwn1Y.prototype.onBitmapLoad = function() {
    // Set initial frame
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {
        this.updateFrameAnimation();
    }
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.updateFrameAnimation = function() {
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

Sprite_XglobalThispwn1globalThispwn1Y.prototype.updateAnimationFrame = function() {
    // Horizontal strip layout
    const x = this._animPattern * this._frameWidth;
    this.setFrame(x, 0, this._frameWidth, this._frameHeight);
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.onAnimationEnd = function() {
    // Override this for custom behavior when animation ends
};

// Animation Control Methods

Sprite_XglobalThispwn1globalThispwn1Y.prototype.play = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.stop = function() {
    this._animPlaying = false;
    this._animPattern = 0;
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.pause = function() {
    this._animPlaying = false;
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.resume = function() {
    this._animPlaying = true;
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.setFrameDelay = function(delay) {
    this._animDelay = delay;
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.setLoop = function(loop) {
    this._animLoop = loop;
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.gotoFrame = function(frame) {
    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));
    this._animFrameCount = 0;
    this.updateAnimationFrame();
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.isPlaying = function() {
    return this._animPlaying;
};

Sprite_XglobalThispwn1globalThispwn1Y.prototype.currentFrame = function() {
    return this._animPattern;
};

// ==== case: targetClass=comment-space {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X */ globalThis.__pwn = 1; /* Y"}
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

// ==== case: targetClass=comment-u2028 {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X */\u2028globalThis.__pwn = 1; /* Y"}
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

// ==== case: targetClass=comment-u2029 {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X */\u2029globalThis.__pwn = 1; /* Y"}
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

// ==== case: targetClass=comment-lf {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X */\nglobalThis.__pwn = 1; /* Y"}
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

// ==== case: targetClass=quote-single {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X' + (globalThis.__pwn = 1) + 'Y"}
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

// ==== case: targetClass=quote-double {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X\" + (globalThis.__pwn = 1) + \"Y"}
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

// ==== case: targetClass=quote-backtick {"animationType":"horizontal","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
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

// ==== case: animationType=mixin,targetClass=comment-space {"animationType":"mixin","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Target Sprite Class must be a class name (letters, numbers, _ or $)
// Animation Mixin
//
// Adds frame-based animation to X */ globalThis.__pwn = 1; /* Y
//-----------------------------------------------------------------------------

// Store original initialize
const _X */ globalThis.__pwn = 1; /* Y_initialize = X */ globalThis.__pwn = 1; /* Y.prototype.initialize;
X */ globalThis.__pwn = 1; /* Y.prototype.initialize = function() {
    _X */ globalThis.__pwn = 1; /* Y_initialize.apply(this, arguments);
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
};

// Store original update
const _X */ globalThis.__pwn = 1; /* Y_update = X */ globalThis.__pwn = 1; /* Y.prototype.update;
X */ globalThis.__pwn = 1; /* Y.prototype.update = function() {
    _X */ globalThis.__pwn = 1; /* Y_update.call(this);
    if (this._animPlaying) {
        this.updateFrameAnimation();
    }
};

X */ globalThis.__pwn = 1; /* Y.prototype.updateFrameAnimation = function() {
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

X */ globalThis.__pwn = 1; /* Y.prototype.updateAnimationFrame = function() {
    // Override this method to set the frame based on this._animPattern
    const col = this._animPattern % 4;
    const row = Math.floor(this._animPattern / 4);
    this.setFrame(col * 48, row * 48, 48, 48);
};

// Animation control methods
X */ globalThis.__pwn = 1; /* Y.prototype.playAnimation = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

X */ globalThis.__pwn = 1; /* Y.prototype.stopAnimation = function() {
    this._animPlaying = false;
};

X */ globalThis.__pwn = 1; /* Y.prototype.pauseAnimation = function() {
    this._animPlaying = false;
};

X */ globalThis.__pwn = 1; /* Y.prototype.resumeAnimation = function() {
    this._animPlaying = true;
};

// ==== case: animationType=mixin,targetClass=comment-u2028 {"animationType":"mixin","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Target Sprite Class must be a class name (letters, numbers, _ or $)
// Animation Mixin
//
// Adds frame-based animation to X */ globalThis.__pwn = 1; /* Y
//-----------------------------------------------------------------------------

// Store original initialize
const _X */ globalThis.__pwn = 1; /* Y_initialize = X */ globalThis.__pwn = 1; /* Y.prototype.initialize;
X */ globalThis.__pwn = 1; /* Y.prototype.initialize = function() {
    _X */ globalThis.__pwn = 1; /* Y_initialize.apply(this, arguments);
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
};

// Store original update
const _X */ globalThis.__pwn = 1; /* Y_update = X */ globalThis.__pwn = 1; /* Y.prototype.update;
X */ globalThis.__pwn = 1; /* Y.prototype.update = function() {
    _X */ globalThis.__pwn = 1; /* Y_update.call(this);
    if (this._animPlaying) {
        this.updateFrameAnimation();
    }
};

X */ globalThis.__pwn = 1; /* Y.prototype.updateFrameAnimation = function() {
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

X */ globalThis.__pwn = 1; /* Y.prototype.updateAnimationFrame = function() {
    // Override this method to set the frame based on this._animPattern
    const col = this._animPattern % 4;
    const row = Math.floor(this._animPattern / 4);
    this.setFrame(col * 48, row * 48, 48, 48);
};

// Animation control methods
X */ globalThis.__pwn = 1; /* Y.prototype.playAnimation = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

X */ globalThis.__pwn = 1; /* Y.prototype.stopAnimation = function() {
    this._animPlaying = false;
};

X */ globalThis.__pwn = 1; /* Y.prototype.pauseAnimation = function() {
    this._animPlaying = false;
};

X */ globalThis.__pwn = 1; /* Y.prototype.resumeAnimation = function() {
    this._animPlaying = true;
};

// ==== case: animationType=mixin,targetClass=comment-u2029 {"animationType":"mixin","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Target Sprite Class must be a class name (letters, numbers, _ or $)
// Animation Mixin
//
// Adds frame-based animation to X */ globalThis.__pwn = 1; /* Y
//-----------------------------------------------------------------------------

// Store original initialize
const _X */ globalThis.__pwn = 1; /* Y_initialize = X */ globalThis.__pwn = 1; /* Y.prototype.initialize;
X */ globalThis.__pwn = 1; /* Y.prototype.initialize = function() {
    _X */ globalThis.__pwn = 1; /* Y_initialize.apply(this, arguments);
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
};

// Store original update
const _X */ globalThis.__pwn = 1; /* Y_update = X */ globalThis.__pwn = 1; /* Y.prototype.update;
X */ globalThis.__pwn = 1; /* Y.prototype.update = function() {
    _X */ globalThis.__pwn = 1; /* Y_update.call(this);
    if (this._animPlaying) {
        this.updateFrameAnimation();
    }
};

X */ globalThis.__pwn = 1; /* Y.prototype.updateFrameAnimation = function() {
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

X */ globalThis.__pwn = 1; /* Y.prototype.updateAnimationFrame = function() {
    // Override this method to set the frame based on this._animPattern
    const col = this._animPattern % 4;
    const row = Math.floor(this._animPattern / 4);
    this.setFrame(col * 48, row * 48, 48, 48);
};

// Animation control methods
X */ globalThis.__pwn = 1; /* Y.prototype.playAnimation = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

X */ globalThis.__pwn = 1; /* Y.prototype.stopAnimation = function() {
    this._animPlaying = false;
};

X */ globalThis.__pwn = 1; /* Y.prototype.pauseAnimation = function() {
    this._animPlaying = false;
};

X */ globalThis.__pwn = 1; /* Y.prototype.resumeAnimation = function() {
    this._animPlaying = true;
};

// ==== case: animationType=mixin,targetClass=comment-lf {"animationType":"mixin","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Target Sprite Class must be a class name (letters, numbers, _ or $)
// Animation Mixin
//
// Adds frame-based animation to X */
globalThis.__pwn = 1; /* Y
//-----------------------------------------------------------------------------

// Store original initialize
const _X */
globalThis.__pwn = 1; /* Y_initialize = X */
globalThis.__pwn = 1; /* Y.prototype.initialize;
X */
globalThis.__pwn = 1; /* Y.prototype.initialize = function() {
    _X */
globalThis.__pwn = 1; /* Y_initialize.apply(this, arguments);
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
};

// Store original update
const _X */
globalThis.__pwn = 1; /* Y_update = X */
globalThis.__pwn = 1; /* Y.prototype.update;
X */
globalThis.__pwn = 1; /* Y.prototype.update = function() {
    _X */
globalThis.__pwn = 1; /* Y_update.call(this);
    if (this._animPlaying) {
        this.updateFrameAnimation();
    }
};

X */
globalThis.__pwn = 1; /* Y.prototype.updateFrameAnimation = function() {
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

X */
globalThis.__pwn = 1; /* Y.prototype.updateAnimationFrame = function() {
    // Override this method to set the frame based on this._animPattern
    const col = this._animPattern % 4;
    const row = Math.floor(this._animPattern / 4);
    this.setFrame(col * 48, row * 48, 48, 48);
};

// Animation control methods
X */
globalThis.__pwn = 1; /* Y.prototype.playAnimation = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

X */
globalThis.__pwn = 1; /* Y.prototype.stopAnimation = function() {
    this._animPlaying = false;
};

X */
globalThis.__pwn = 1; /* Y.prototype.pauseAnimation = function() {
    this._animPlaying = false;
};

X */
globalThis.__pwn = 1; /* Y.prototype.resumeAnimation = function() {
    this._animPlaying = true;
};

// ==== case: animationType=mixin,targetClass=quote-single {"animationType":"mixin","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Target Sprite Class must be a class name (letters, numbers, _ or $)
// Animation Mixin
//
// Adds frame-based animation to X' + (globalThis.__pwn = 1) + 'Y
//-----------------------------------------------------------------------------

// Store original initialize
const _X' + (globalThis.__pwn = 1) + 'Y_initialize = X' + (globalThis.__pwn = 1) + 'Y.prototype.initialize;
X' + (globalThis.__pwn = 1) + 'Y.prototype.initialize = function() {
    _X' + (globalThis.__pwn = 1) + 'Y_initialize.apply(this, arguments);
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
};

// Store original update
const _X' + (globalThis.__pwn = 1) + 'Y_update = X' + (globalThis.__pwn = 1) + 'Y.prototype.update;
X' + (globalThis.__pwn = 1) + 'Y.prototype.update = function() {
    _X' + (globalThis.__pwn = 1) + 'Y_update.call(this);
    if (this._animPlaying) {
        this.updateFrameAnimation();
    }
};

X' + (globalThis.__pwn = 1) + 'Y.prototype.updateFrameAnimation = function() {
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

X' + (globalThis.__pwn = 1) + 'Y.prototype.updateAnimationFrame = function() {
    // Override this method to set the frame based on this._animPattern
    const col = this._animPattern % 4;
    const row = Math.floor(this._animPattern / 4);
    this.setFrame(col * 48, row * 48, 48, 48);
};

// Animation control methods
X' + (globalThis.__pwn = 1) + 'Y.prototype.playAnimation = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

X' + (globalThis.__pwn = 1) + 'Y.prototype.stopAnimation = function() {
    this._animPlaying = false;
};

X' + (globalThis.__pwn = 1) + 'Y.prototype.pauseAnimation = function() {
    this._animPlaying = false;
};

X' + (globalThis.__pwn = 1) + 'Y.prototype.resumeAnimation = function() {
    this._animPlaying = true;
};

// ==== case: animationType=mixin,targetClass=quote-double {"animationType":"mixin","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Target Sprite Class must be a class name (letters, numbers, _ or $)
// Animation Mixin
//
// Adds frame-based animation to X" + (globalThis.__pwn = 1) + "Y
//-----------------------------------------------------------------------------

// Store original initialize
const _X" + (globalThis.__pwn = 1) + "Y_initialize = X" + (globalThis.__pwn = 1) + "Y.prototype.initialize;
X" + (globalThis.__pwn = 1) + "Y.prototype.initialize = function() {
    _X" + (globalThis.__pwn = 1) + "Y_initialize.apply(this, arguments);
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
};

// Store original update
const _X" + (globalThis.__pwn = 1) + "Y_update = X" + (globalThis.__pwn = 1) + "Y.prototype.update;
X" + (globalThis.__pwn = 1) + "Y.prototype.update = function() {
    _X" + (globalThis.__pwn = 1) + "Y_update.call(this);
    if (this._animPlaying) {
        this.updateFrameAnimation();
    }
};

X" + (globalThis.__pwn = 1) + "Y.prototype.updateFrameAnimation = function() {
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

X" + (globalThis.__pwn = 1) + "Y.prototype.updateAnimationFrame = function() {
    // Override this method to set the frame based on this._animPattern
    const col = this._animPattern % 4;
    const row = Math.floor(this._animPattern / 4);
    this.setFrame(col * 48, row * 48, 48, 48);
};

// Animation control methods
X" + (globalThis.__pwn = 1) + "Y.prototype.playAnimation = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

X" + (globalThis.__pwn = 1) + "Y.prototype.stopAnimation = function() {
    this._animPlaying = false;
};

X" + (globalThis.__pwn = 1) + "Y.prototype.pauseAnimation = function() {
    this._animPlaying = false;
};

X" + (globalThis.__pwn = 1) + "Y.prototype.resumeAnimation = function() {
    this._animPlaying = true;
};

// ==== case: animationType=mixin,targetClass=quote-backtick {"animationType":"mixin","frameCount":4,"frameWidth":48,"frameHeight":48,"columns":4,"frameDelay":12,"loop":true,"autoPlay":true,"spriteName":"Sample","targetClass":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Target Sprite Class must be a class name (letters, numbers, _ or $)
// Animation Mixin
//
// Adds frame-based animation to X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y
//-----------------------------------------------------------------------------

// Store original initialize
const _X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y_initialize = X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y.prototype.initialize;
X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y.prototype.initialize = function() {
    _X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y_initialize.apply(this, arguments);
    this._animFrameCount = 0;
    this._animPattern = 0;
    this._animMaxPattern = 4;
    this._animDelay = 12;
    this._animLoop = true;
    this._animPlaying = true;
};

// Store original update
const _X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y_update = X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y.prototype.update;
X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y.prototype.update = function() {
    _X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y_update.call(this);
    if (this._animPlaying) {
        this.updateFrameAnimation();
    }
};

X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y.prototype.updateFrameAnimation = function() {
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

X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y.prototype.updateAnimationFrame = function() {
    // Override this method to set the frame based on this._animPattern
    const col = this._animPattern % 4;
    const row = Math.floor(this._animPattern / 4);
    this.setFrame(col * 48, row * 48, 48, 48);
};

// Animation control methods
X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y.prototype.playAnimation = function() {
    this._animPlaying = true;
    this._animPattern = 0;
    this._animFrameCount = 0;
};

X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y.prototype.stopAnimation = function() {
    this._animPlaying = false;
};

X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y.prototype.pauseAnimation = function() {
    this._animPlaying = false;
};

X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y.prototype.resumeAnimation = function() {
    this._animPlaying = true;
};
