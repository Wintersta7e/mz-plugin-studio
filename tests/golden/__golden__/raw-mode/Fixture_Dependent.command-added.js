/*:
 * @target MZ
 * @plugindesc Fixture plugin that builds on Fixture_HandWritten.
 * @author Example Author
 * @url https://example.invalid/Fixture_Dependent
 * @base Fixture_HandWritten
 * @orderAfter Fixture_HandWritten
 *
 * @param Delay
 * @desc Frames before the badge appears.
 * @type number
 * @min 0
 * @max 120
 * @default 60
 *
 * @param Badge
 * @desc Text of the badge.
 * @type string
 * @default New
 *
 * @param Placement
 * @desc Where the badge is drawn.
 * @type struct<Placement>
 * @default {"x":"16","y":"16"}
 *
 * @command HideBadge
 * @text Hide Badge
 * @desc Hides the badge for a while.
 *
 * @arg frames
 * @text Frames
 * @desc Frames the badge stays hidden.
 * @type number
 * @min 1
 * @default 60
 *
 * @command AddedCommand
 * @text Added Command
 * @desc Added command
 *
 * @help
 * Fixture_Dependent.js
 * 
 * Needs Fixture_HandWritten above it in the plugin list. Both plugins
 * extend the map scene's update.
 */

/*~struct~Placement:
 * @param x
 * @text X
 * @type number
 * @default 16
 *
 * @param y
 * @text Y
 * @type number
 * @default 16
 */

(() => {
    'use strict';

    const params = PluginManager.parameters('Fixture_Dependent');
    const delay = Number(params['Delay'] || 60);
    const badge = String(params['Badge'] || 'New');
    const placement = JSON.parse(params['Placement'] || '{"x":"0","y":"0"}');

    let hiddenFor = 0;

    PluginManager.registerCommand('Fixture_Dependent', 'HideBadge', args => {
        hiddenFor = Number(args.frames || 60);
    });

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (hiddenFor > 0) {
            hiddenFor--;
        } else if ((this._fixtureFrames || 0) >= delay) {
            this._fixtureBadge = { text: badge, x: Number(placement.x), y: Number(placement.y) };
        }
    };

    const PLUGIN_NAME = 'Fixture_Dependent';
    // --- New commands (added by MZ Plugin Studio) ---
    PluginManager.registerCommand(PLUGIN_NAME, 'AddedCommand', function(args) {

        // TODO: Implement command logic
    });
    // --- End new commands ---

})();
