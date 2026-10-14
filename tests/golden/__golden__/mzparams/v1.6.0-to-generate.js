/*:
 * @target MZ
 * @plugindesc Holds imported parameters
 * @author Example Author
 * @url https://example.invalid/params-host
 *
 * @param Speed
 * @desc All limits cleared.
 * @type number
 * @default 5
 *
 * @param Count
 * @desc How many to show.
 * @type number
 * @min 0
 * @max 99
 * @decimals 0
 * @default 3
 *
 * @param Mode
 * @desc How fast it moves.
 * @type select
 * @option Fast
 * @value fast
 * @option Slow
 * @value slow
 * @default fast
 *
 * @param Enabled
 * @desc Turns it on.
 * @type boolean
 * @on On
 * @off Off
 * @default true
 * @parent Mode
 *
 * @param Picture
 * @desc Image to show.
 * @type file
 * @dir img/pictures/
 *
 * @param Points
 * @desc Positions to visit.
 * @type struct<Point>[]
 * @default []
 *
 * @param Tint
 * @desc Ends a comment *\/ here
and goes on.
 * @type color
 * @default 0
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

    const speed = Number(params['Speed'] || 5);
    const count = Number(params['Count'] || 3);
    const mode = params['Mode'] || 'fast';
    const enabled = (params['Enabled'] ?? 'true') === 'true';
    const picture = params['Picture'] || '';
    const points = JSON.parse(params['Points'] || '[]').map(s => JSON.parse(s));
    const tint = params['Tint'] || '0';

    // Custom plugin code goes here

})();