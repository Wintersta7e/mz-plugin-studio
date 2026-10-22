/*:
 * @target MZ
 * @plugindesc Underscore-prefixed fixture plugin left out of the plugin list.
 * @author Example Author
 * @url https://example.invalid/_Fixture_Ignored
 *
 * @param Level
 * @desc Detail level of the draft.
 * @type number
 * @min 0
 * @max 3
 * @default 1
 *
 * @param Note
 * @desc Reminder kept with the draft.
 * @type string
 * @default Draft
 *
 * @param Size
 * @desc Size of the draft window.
 * @type struct<Size>
 * @default {"width":"240","height":"120"}
 *
 * @param AddedParam
 * @text Added Param
 * @desc Added parameter
 * @type string
 * @default added
 *
 * @command Ping
 * @desc Writes the note to the log.
 *
 * @arg times
 * @text Times
 * @desc How often the note is written.
 * @type number
 * @default 1
 *
 * @help
 * _Fixture_Ignored.js
 * 
 * A disabled draft. Its file name starts with an underscore.
 */

/*~struct~Size:
 * @param width
 * @text Width
 * @type number
 * @default 240
 *
 * @param height
 * @text Height
 * @type number
 * @default 120
 */

(() => {
    'use strict';

    const params = PluginManager.parameters('_Fixture_Ignored');

    // --- New parameters (added by MZ Plugin Studio) ---
    const addedParam = params['AddedParam'] || 'added';
    // --- End new parameters ---
    const level = Number(params['Level'] || 1);
    const note = String(params['Note'] || 'Draft');
    const size = JSON.parse(params['Size'] || '{}');

    PluginManager.registerCommand('_Fixture_Ignored', 'Ping', args => {
        for (let i = 0; i < Number(args.times || 1); i++) {
            console.log(note, level, size.width, size.height);
        }
    });
})();
