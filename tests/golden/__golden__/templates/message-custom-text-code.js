// ==== case: base {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: hasParameter=false {"hasParameter":false,"codeType":"replace","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE codes
    text = text.replace(/\\SAMPLE(?![A-Za-z])/gi, () => {
        return $gameParty.gold();
    });

    return text;
};

// ==== case: codeType=replace {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: codeType=effect {"hasParameter":true,"codeType":"effect","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE[n]
// Applies a visual effect during text drawing

const _Window_Message_processEscapeCharacter = Window_Message.prototype.processEscapeCharacter;
Window_Message.prototype.processEscapeCharacter = function(code, textState) {
    if (code === 'SAMPLE') {
        const param = this.obtainEscapeParam(textState);
        // Change text color
        this.changeTextColor(ColorManager.textColor(param));
    } else {
        _Window_Message_processEscapeCharacter.call(this, code, textState);
    }
};

// ==== case: replacementText=empty {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"","escapeChar":"Sample"}
// rejects: Replacement expression is required for text replacement codes
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return '';
    });

    return text;
};

// ==== case: effectType=color {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: effectType=size {"hasParameter":true,"codeType":"replace","effectType":"size","replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: effectType=icon {"hasParameter":true,"codeType":"replace","effectType":"icon","replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: effectType=custom {"hasParameter":true,"codeType":"replace","effectType":"custom","replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: codeType=effect,effectType=size {"hasParameter":true,"codeType":"effect","effectType":"size","replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE[n]
// Applies a visual effect during text drawing

const _Window_Message_processEscapeCharacter = Window_Message.prototype.processEscapeCharacter;
Window_Message.prototype.processEscapeCharacter = function(code, textState) {
    if (code === 'SAMPLE') {
        const param = this.obtainEscapeParam(textState);
        // Change font size
        this.contents.fontSize = param;
    } else {
        _Window_Message_processEscapeCharacter.call(this, code, textState);
    }
};

// ==== case: codeType=effect,effectType=icon {"hasParameter":true,"codeType":"effect","effectType":"icon","replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE[n]
// Applies a visual effect during text drawing

const _Window_Message_processEscapeCharacter = Window_Message.prototype.processEscapeCharacter;
Window_Message.prototype.processEscapeCharacter = function(code, textState) {
    if (code === 'SAMPLE') {
        const param = this.obtainEscapeParam(textState);
        // Draw an icon
        this.processDrawIcon(param, textState);
    } else {
        _Window_Message_processEscapeCharacter.call(this, code, textState);
    }
};

// ==== case: codeType=effect,effectType=custom {"hasParameter":true,"codeType":"effect","effectType":"custom","replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE[n]
// Applies a visual effect during text drawing

const _Window_Message_processEscapeCharacter = Window_Message.prototype.processEscapeCharacter;
Window_Message.prototype.processEscapeCharacter = function(code, textState) {
    if (code === 'SAMPLE') {
        const param = this.obtainEscapeParam(textState);
        // Custom effect - add your code here
        console.log('Custom code with param:', param);
    } else {
        _Window_Message_processEscapeCharacter.call(this, code, textState);
    }
};

// ==== case: escapeChar=comment-space {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Escape character must contain only letters (A-Z)
// Custom Text Code: \X */ GLOBALTHIS.__PWN = 1; /* Y[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \X */ GLOBALTHIS.__PWN = 1; /* Y[n] codes
    text = text.replace(/\\X */ GLOBALTHIS.__PWN = 1; /* Y\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: escapeChar=comment-u2028 {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Escape character must contain only letters (A-Z)
// Custom Text Code: \X */ GLOBALTHIS.__PWN = 1; /* Y[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \X */ GLOBALTHIS.__PWN = 1; /* Y[n] codes
    text = text.replace(/\\X */ GLOBALTHIS.__PWN = 1; /* Y\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: escapeChar=comment-u2029 {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Escape character must contain only letters (A-Z)
// Custom Text Code: \X */ GLOBALTHIS.__PWN = 1; /* Y[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \X */ GLOBALTHIS.__PWN = 1; /* Y[n] codes
    text = text.replace(/\\X */ GLOBALTHIS.__PWN = 1; /* Y\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: escapeChar=comment-lf {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Escape character must contain only letters (A-Z)
// Custom Text Code: \X */
GLOBALTHIS.__PWN = 1; /* Y[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \X */
GLOBALTHIS.__PWN = 1; /* Y[n] codes
    text = text.replace(/\\X */
GLOBALTHIS.__PWN = 1; /* Y\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: escapeChar=quote-single {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Escape character must contain only letters (A-Z)
// Custom Text Code: \X' + (GLOBALTHIS.__PWN = 1) + 'Y[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \X' + (GLOBALTHIS.__PWN = 1) + 'Y[n] codes
    text = text.replace(/\\X' + (GLOBALTHIS.__PWN = 1) + 'Y\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: escapeChar=quote-double {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Escape character must contain only letters (A-Z)
// Custom Text Code: \X" + (GLOBALTHIS.__PWN = 1) + "Y[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \X" + (GLOBALTHIS.__PWN = 1) + "Y[n] codes
    text = text.replace(/\\X" + (GLOBALTHIS.__PWN = 1) + "Y\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: escapeChar=quote-backtick {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Escape character must contain only letters (A-Z)
// Custom Text Code: \X${GLOBALTHIS.__PWN = 1}` + (GLOBALTHIS.__PWN = 1) + `Y[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \X${GLOBALTHIS.__PWN = 1}` + (GLOBALTHIS.__PWN = 1) + `Y[n] codes
    text = text.replace(/\\X${GLOBALTHIS.__PWN = 1}` + (GLOBALTHIS.__PWN = 1) + `Y\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};

// ==== case: replacementText=comment-space {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"X */ globalThis.__pwn = 1; /* Y","escapeChar":"Sample"}
// rejects: Replacement Expression must be one expression on one line (no ";" or comments)
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return X */ globalThis.__pwn = 1; /* Y;
    });

    return text;
};

// ==== case: replacementText=comment-u2028 {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"X */\u2028globalThis.__pwn = 1; /* Y","escapeChar":"Sample"}
// rejects: Replacement Expression must be one expression on one line (no ";" or comments)
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return X */ globalThis.__pwn = 1; /* Y;
    });

    return text;
};

// ==== case: replacementText=comment-u2029 {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"X */\u2029globalThis.__pwn = 1; /* Y","escapeChar":"Sample"}
// rejects: Replacement Expression must be one expression on one line (no ";" or comments)
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return X */ globalThis.__pwn = 1; /* Y;
    });

    return text;
};

// ==== case: replacementText=comment-lf {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"X */\nglobalThis.__pwn = 1; /* Y","escapeChar":"Sample"}
// rejects: Replacement Expression must be one expression on one line (no ";" or comments)
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return X */
globalThis.__pwn = 1; /* Y;
    });

    return text;
};

// ==== case: replacementText=quote-single {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"X' + (globalThis.__pwn = 1) + 'Y","escapeChar":"Sample"}
// rejects: Replacement Expression must be one expression on one line (no ";" or comments)
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return X' + (globalThis.__pwn = 1) + 'Y;
    });

    return text;
};

// ==== case: replacementText=quote-double {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"X\" + (globalThis.__pwn = 1) + \"Y","escapeChar":"Sample"}
// rejects: Replacement Expression must be one expression on one line (no ";" or comments)
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return X" + (globalThis.__pwn = 1) + "Y;
    });

    return text;
};

// ==== case: replacementText=quote-backtick {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","escapeChar":"Sample"}
// rejects: Replacement Expression must be one expression on one line (no ";" or comments)
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\\SAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y;
    });

    return text;
};
