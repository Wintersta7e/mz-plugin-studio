// dropped: none
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
 * @default true
 *
 * @param Count
 * @desc A number parameter.
 * @type number
 * @default true
 *
 * @param Enabled
 * @desc A boolean parameter.
 * @type boolean
 * @default true
 *
 * @param Mode
 * @desc A select parameter.
 * @type select
 * @option Fast
 * @value fast
 * @option Slow
 * @value slow
 * @default true
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

    const label = params['Label'] ?? true;
    const count = Number(params['Count'] || true);
    const enabled = (params['Enabled'] ?? 'true') === 'true';
    const mode = params['Mode'] ?? true;

    // Custom plugin code goes here

})();