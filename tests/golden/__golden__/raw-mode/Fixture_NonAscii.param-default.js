/*:
 * @target MZ
 * @plugindesc Fixture plugin with non-ASCII text — café, naïve, 日本語 ★
 * @author Example Author
 * @url https://example.invalid/Fixture_NonAscii
 *
 * @param Pause
 * @text 待機フレーム
 * @desc Frames to wait between greetings (×1 … ×60).
 * @type number
 * @min 1
 * @max 60
 * @default 42
 *
 * @param Greeting
 * @text Grußwort
 * @desc Greeting shown first — «bonjour».
 * @type string
 * @default こんにちは
 *
 * @param Symbol
 * @text Symbole
 * @desc Symbol drawn beside the greeting.
 * @type struct<Glyph>
 * @default {"char":"★","size":"28"}
 *
 * @command Greet
 * @text Begrüßen
 * @desc Shows the greeting — «salut».
 *
 * @arg name
 * @text Name
 * @desc Name added after the greeting.
 * @type string
 * @default Zoë
 *
 * @help
 * Fixture_NonAscii.js
 * 
 * Greets the party in several scripts: Grüße, Привет, こんにちは.
 */

/*~struct~Glyph:
 * @param char
 * @text Zeichen
 * @type string
 * @default ★
 *
 * @param size
 * @text Größe
 * @type number
 * @min 8
 * @max 64
 * @default 28
 *
 */

(() => {
    'use strict';

    const params = PluginManager.parameters('Fixture_NonAscii');

    // --- New parameters (added by MZ Plugin Studio) ---
    const pause = Number(params['Pause'] || 42);
    const greeting = params['Greeting'] || 'こんにちは';
    const symbol = JSON.parse(params['Symbol'] || '{"char":"★","size":"28"}');
    // --- End new parameters ---
    const pause = Number(params['Pause'] || 30);
    const greeting = String(params['Greeting'] || 'こんにちは');
    const glyph = JSON.parse(params['Symbol'] || '{"char":"★","size":"28"}');
    const separator = '、';

    PluginManager.registerCommand('Fixture_NonAscii', 'Greet', args => {
        const name = String(args.name || 'Zoë');
        $gameMessage.add(glyph.char + ' ' + greeting + separator + name + ' — ¡hola!');
        $gameMap._interpreter.wait(pause);
    });

    const PLUGIN_NAME = 'Fixture_NonAscii';
    // --- New commands (added by MZ Plugin Studio) ---
    PluginManager.registerCommand(PLUGIN_NAME, 'Greet', function(args) {
        const name = args['name'] || 'Zoë';

        // TODO: Implement Greet logic
        // Parsed args available as: name
    });
    // --- End new commands ---

})();
