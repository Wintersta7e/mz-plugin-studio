// ==== case: type-violating: wrong types {"escapeChar":42,"hasParameter":"yes","codeType":7,"replacementText":42,"effectType":7}
// rejects: Field "Escape Character" must be text | Field "Has Parameter" must be true or false | Field "Code Type" must be text | Field "Replacement Expression" must be text | Field "Effect Type" must be text
// throws: TypeError

// ==== case: type-violating: null {"escapeChar":null,"hasParameter":null,"codeType":null,"replacementText":null,"effectType":null}
// rejects: Field "Escape Character" is required | Field "Code Type" is required
// throws: TypeError

// ==== case: type-violating: arrays {"escapeChar":["a","b"],"hasParameter":["a","b"],"codeType":["a","b"],"replacementText":["a","b"],"effectType":["a","b"]}
// rejects: Field "Escape Character" must be text | Field "Has Parameter" must be true or false | Field "Code Type" must be text | Field "Replacement Expression" must be text | Field "Effect Type" must be text
// throws: TypeError

// ==== case: type-violating: null where not required {"escapeChar":"Sample","hasParameter":null,"codeType":"replace","replacementText":null,"effectType":null}
// rejects: Replacement expression is required for text replacement codes
// Custom Text Code: \SAMPLE
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE codes
    text = text.replace(/\x1bSAMPLE(?![A-Za-z])/gi, () => {
        return '';
    });

    return text;
};

// ==== case: type-violating: unlisted choices {"escapeChar":"Sample","hasParameter":true,"codeType":"unlisted","replacementText":"$gameParty.gold()","effectType":"unlisted"}
// rejects: Field "Code Type" must be one of its choices | Field "Effect Type" must be one of its choices
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

// ==== case: type-violating: empty text {"escapeChar":"","hasParameter":true,"codeType":"replace","replacementText":"","effectType":"color"}
// rejects: Field "Escape Character" is required | Replacement expression is required for text replacement codes
// Custom Text Code: \[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \[n] codes
    text = text.replace(/\x1b\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return '';
    });

    return text;
};

// ==== case: type-violating: required fields only {"escapeChar":"Sample","codeType":"replace"}
// rejects: Replacement expression is required for text replacement codes
// Custom Text Code: \SAMPLE
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE codes
    text = text.replace(/\x1bSAMPLE(?![A-Za-z])/gi, () => {
        return '';
    });

    return text;
};

// ==== case: type-violating: hasParameter=null,effectType=null {"hasParameter":null,"codeType":"replace","effectType":null,"replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE codes
    text = text.replace(/\x1bSAMPLE(?![A-Za-z])/gi, () => {
        return $gameParty.gold();
    });

    return text;
};

// ==== case: type-violating: codeType=null,replacementText=null {"hasParameter":true,"codeType":null,"effectType":"color","replacementText":null,"escapeChar":"Sample"}
// rejects: Field "Code Type" is required
// throws: TypeError

// ==== case: type-violating: codeType="effect",hasParameter=null,effectType=null {"hasParameter":null,"codeType":"effect","effectType":null,"replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE
// Applies a visual effect during text drawing

const _Window_Message_processEscapeCharacter = Window_Message.prototype.processEscapeCharacter;
Window_Message.prototype.processEscapeCharacter = function(code, textState) {
    if (code === 'SAMPLE') {
        // Change text color
        this.changeTextColor(ColorManager.textColor(0));
    } else {
        _Window_Message_processEscapeCharacter.call(this, code, textState);
    }
};

// ==== case: type-violating: codeType="effect",effectType="size",hasParameter=null {"hasParameter":null,"codeType":"effect","effectType":"size","replacementText":"$gameParty.gold()","escapeChar":"Sample"}
// Custom Text Code: \SAMPLE
// Applies a visual effect during text drawing

const _Window_Message_processEscapeCharacter = Window_Message.prototype.processEscapeCharacter;
Window_Message.prototype.processEscapeCharacter = function(code, textState) {
    if (code === 'SAMPLE') {
        // Change font size
        this.contents.fontSize = $gameSystem.mainFontSize();
    } else {
        _Window_Message_processEscapeCharacter.call(this, code, textState);
    }
};

// ==== case: type-violating: codeType="effect",effectType="icon",replacementText=null {"hasParameter":true,"codeType":"effect","effectType":"icon","replacementText":null,"escapeChar":"Sample"}
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

// ==== case: type-violating: codeType="effect",effectType="custom",replacementText=null {"hasParameter":true,"codeType":"effect","effectType":"custom","replacementText":null,"escapeChar":"Sample"}
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

// ==== case: type-violating: escapeChar="C" {"hasParameter":true,"codeType":"replace","effectType":"color","replacementText":"$gameParty.gold()","escapeChar":"C"}
// rejects: "C" is a reserved RPG Maker escape code. Choose a different character.
// Custom Text Code: \C[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \C[n] codes
    text = text.replace(/\x1bC\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return $gameParty.gold();
    });

    return text;
};
