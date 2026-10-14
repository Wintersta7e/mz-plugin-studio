/*:
 * @target MZ
 * @plugindesc Output rows
 * @author Example Author
 * @url https://example.invalid/rows
 *
 * @param Label
 * @desc Text to show.
 * @type string
 * @default Hello
 *
 * @param Pair
 * @desc Two values.
 * @type struct<Pair>
 * @default {"a":"b"}
 *
 * @command Show
 * @desc Shows the label.
 *
 */

/*:ja *\/ x
 * @plugindesc Localized description
 */

/*~struct~Pair:
 * @param a
 * @text A
 * @type string
 *
 */

(() => {
    'use strict';

    const PLUGIN_NAME = 'Fixture_Rows';

    // Parse plugin parameters
    const params = PluginManager.parameters(PLUGIN_NAME);

    const label = params['Label'] || 'Hello';
    const pair = JSON.parse(params['Pair'] || '{"a":"b"}');

    // Register plugin commands

    PluginManager.registerCommand(PLUGIN_NAME, 'Show', function(args) {

        // TODO: Implement command logic
    });

    // Custom plugin code goes here

})();