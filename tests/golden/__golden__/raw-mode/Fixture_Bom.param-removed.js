/*:
 * @target MZ
 * @plugindesc Fixture plugin saved with a byte order mark.
 * @author Example Author
 * @url https://example.invalid/Fixture_Bom
 *
 * @param Volume
 * @desc Volume of the sound effect.
 * @type number
 * @min 0
 * @max 100
 * @default 90
 *
 * @param Prefix
 * @desc Text written before each log line.
 * @type string
 * @default Bom
 *
 * @command PlayCue
 * @text Play Cue
 * @desc Plays a named sound effect.
 *
 * @arg cue
 * @text Cue
 * @desc Name of the sound effect.
 * @type string
 * @default Cursor1
 *
 * @help
 * Fixture_Bom.js
 * 
 * Plays a sound effect with a prefix in the log.
 */

/*~struct~Offset:
 * @param pan
 * @text Pan
 * @type number
 * @min -100
 * @max 100
 * @default 0
 *
 * @param pitch
 * @text Pitch
 * @type number
 * @min 50
 * @max 150
 * @default 100
 *
 */

(() => {
    'use strict';

    const params = PluginManager.parameters('Fixture_Bom');

    // --- New parameters (added by MZ Plugin Studio) ---
    const volume = Number(params['Volume'] || 90);
    const prefix = params['Prefix'] || 'Bom';
    // --- End new parameters ---
    const volume = Number(params['Volume'] || 90);
    const prefix = String(params['Prefix'] || 'Bom');
    const offset = JSON.parse(params['Offset'] || '{}');

    PluginManager.registerCommand('Fixture_Bom', 'PlayCue', args => {
        const se = { name: args.cue, volume, pitch: Number(offset.pitch || 100), pan: Number(offset.pan || 0) };
        console.log(prefix + ': ' + se.name);
        AudioManager.playSe(se);
    });

    const PLUGIN_NAME = 'Fixture_Bom';
    // --- New commands (added by MZ Plugin Studio) ---
    PluginManager.registerCommand(PLUGIN_NAME, 'PlayCue', function(args) {
        const cue = args['cue'] || 'Cursor1';

        // TODO: Implement PlayCue logic
        // Parsed args available as: cue
    });
    // --- End new commands ---

})();
