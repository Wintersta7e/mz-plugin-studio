// ==== case: type-violating: wrong types {"escapeChar":42,"hasParameter":"yes","codeType":7,"replacementText":42,"effectType":7}
// rejects: Field "Escape Character" must be text | Field "Has Parameter" must be true or false | Field "Code Type" must be text | Field "Replacement Expression" must be text | Field "Effect Type" must be text
// throws: TypeError

// ==== case: type-violating: null {"escapeChar":null,"hasParameter":null,"codeType":null,"replacementText":null,"effectType":null}
// rejects: Field "Escape Character" is required | Field "Code Type" is required
// throws: TypeError

// ==== case: type-violating: arrays {"escapeChar":["a","b"],"hasParameter":["a","b"],"codeType":["a","b"],"replacementText":["a","b"],"effectType":["a","b"]}
// rejects: Field "Escape Character" must be text | Field "Has Parameter" must be true or false | Field "Code Type" must be text | Field "Replacement Expression" must be text | Field "Effect Type" must be text
// throws: TypeError

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
// Custom Text Code: \SAMPLE[n]
// Replaces the escape code with dynamic text during message processing

const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _Window_Base_convertEscapeCharacters.call(this, text);

    // Process \SAMPLE[n] codes
    text = text.replace(/\x1bSAMPLE\[(\d+)\]/gi, (_, param) => {
        param = parseInt(param);
        // Return the replacement text based on the parameter
        return '';
    });

    return text;
};

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
