// dropped: Label.default, Count.default, Enabled.default, Mode.default
// skipped: none
/*:
 * @target MZ
 * @plugindesc Holds imported parameters
 * @author Example Author
 * @url https://example.invalid/params-host
 *
 * @param Label
 * @desc A string parameter.
 * @type string
 *
 * @param Count
 * @desc A number parameter.
 * @type number
 *
 * @param Enabled
 * @desc A boolean parameter.
 * @type boolean
 *
 * @param Mode
 * @desc A select parameter.
 * @type select
 * @option Fast
 * @value fast
 * @option Slow
 * @value slow
 *
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
 */

(() => {
    'use strict';

    const PLUGIN_NAME = 'Fixture_ParamsHost';

    // Parse plugin parameters
    const params = PluginManager.parameters(PLUGIN_NAME);

    const label = params['Label'] ?? '';
    const count = Number(params['Count'] || 0);
    const enabled = (params['Enabled'] ?? 'false') === 'true';
    const mode = params['Mode'] ?? '';

    // Custom plugin code goes here

})();