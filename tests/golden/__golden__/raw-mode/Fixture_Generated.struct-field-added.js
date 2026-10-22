/*:
 * @target MZ
 * @plugindesc Generated fixture plugin
 * @author Example Author
 * @url https://example.invalid/fixture-generated
 *
 * @param Speed
 * @desc Frames between two updates.
 * @type number
 * @min 1
 * @max 10
 * @default 5
 *
 * @param Label
 * @desc Text to show.
 * @type string
 * @default Hello
 *
 * @param Points
 * @desc Positions to visit.
 * @type struct<Point>[]
 * @default []
 *
 * @command ShowLabel
 * @text Show Label
 * @desc Shows the label.
 *
 * @arg times
 * @text Times
 * @desc How often the label is shown.
 * @type number
 * @default 1
 *
 * @help
 * Generated from a fixed definition.
 */

/*~struct~Point:
 * @param x
 * @text X
 * @type number
 * @default 0
 *
 * @param y
 * @text Y
 * @type number
 * @default 0
 *
 * @param addedField
 * @text Added Field
 * @type string
 *
 */

(() => {
    'use strict';

    const PLUGIN_NAME = 'Fixture_Generated';

    // Parse plugin parameters
    const params = PluginManager.parameters(PLUGIN_NAME);

    const speed = Number(params['Speed'] || 5);
    const label = params['Label'] || 'Hello';
    const points = JSON.parse(params['Points'] || '[]').map(s => JSON.parse(s));

    // Register plugin commands

    PluginManager.registerCommand(PLUGIN_NAME, 'ShowLabel', function(args) {
        const times = Number(args['times'] || 1);

        // TODO: Implement command logic
        // Parsed args available as: times
    });

    // Custom plugin code goes here

})();