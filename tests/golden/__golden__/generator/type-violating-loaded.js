/*:
 * @target MZ
 * @plugindesc Holds imported parameters of the wrong type
 * @author Example Author
 * @url https://example.invalid/loaded
 * @base Fixture_Base
 * @orderAfter Fixture_Core
 *
 * @param Label
 * @desc Text to show.
 * @type string
 * @default Hello
 *
 * @param Count
 * @type number
 * @min 0
 * @max 10
 * @decimals 2
 * @default 7
 *
 * @param Enabled
 * @desc Whether it shows.
 * @type boolean
 * @default true
 *
 * @param Empty
 * @desc No default.
 * @type string
 *
 * @param Pair
 * @desc One point.
 * @type struct<Point>
 * @default {"x":"1"}
 *
 * @param Points
 * @desc Some points.
 * @type struct<Point>[]
 * @default []
 *
 * @param Ids
 * @desc Some ids.
 * @type number[]
 * @default ["1","2"]
 *
 * @param Items
 * @desc Any values.
 * @type string[]
 * @default []
 *
 * @param Child
 * @desc Nested.
 * @type string
 * @default x
 * @parent Label
 *
 * @param --- Section ---
 * @type string
 *
 * @command Reset
 * @text Reset Label
 * @desc Clears the label.
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
 * @arg note
 * @type string
 *
 * @help
 * Shows the label after the base plugin.
 */

/*~struct~Point:
 * @param x
 * @type number
 * @default 0
 *
 */

(() => {
    'use strict';

    const PLUGIN_NAME = 'Fixture-Loaded';

    // Parse plugin parameters
    const params = PluginManager.parameters(PLUGIN_NAME);

    const label = params['Label'] ?? 'Hello';
    const count = Number(params['Count'] || 7);
    const enabled = (params['Enabled'] ?? 'true') === 'true';
    const empty = params['Empty'] ?? '';
    const pair = JSON.parse(params['Pair'] || '{"x":"1"}');
    const points = JSON.parse(params['Points'] || '[]').map(s => JSON.parse(s));
    const ids = JSON.parse(params['Ids'] || '["1","2"]').map(Number);
    const items = JSON.parse(params['Items'] || '[]');
    const child = params['Child'] ?? 'x';

    // Register plugin commands

    PluginManager.registerCommand(PLUGIN_NAME, 'Reset', function(args) {

        // TODO: Implement command logic
    });

    PluginManager.registerCommand(PLUGIN_NAME, 'ShowLabel', function(args) {
        const times = Number(args['times'] || 1);
        const note = args['note'] ?? '';

        // TODO: Implement command logic
        // Parsed args available as: times, note
    });

    // Custom plugin code goes here

})();