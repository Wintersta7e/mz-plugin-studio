/*:
 * @target MZ
 * @plugindesc Output rows
 * @author Example Author
 * @url https://example.invalid/rows
 *
 * @param 速度
 * @text Label
 * @desc Text to show.
 * @type string
 * @default Hello
 *
 * @param Pair
 * @desc Two values.
 * @type struct<Pair>
 * @default {"a":"b"}
 *
 * @param 高さ
 * @desc Height in pixels.
 * @type number
 * @default 48
 *
 * @command Show
 * @desc Shows the label.
 *
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

    const 速度 = params['速度'] ?? 'Hello';
    const pair = JSON.parse(params['Pair'] || '{"a":"b"}');
    const 高さ = Number(params['高さ'] || 48);

    // Register plugin commands

    PluginManager.registerCommand(PLUGIN_NAME, 'Show', function(args) {

        // TODO: Implement command logic
    });

    // Custom plugin code goes here

})();