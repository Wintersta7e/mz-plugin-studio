// dropped: Slow.min, Slow.decimals, Sound.dir, Sound.require, Sound.rawType, Tags.arrayType, Tags.structType, Tags.parent, Flag.offLabel, Pace.options[1], Pace.options[2].hint, Pace.options[3], Pick.options, Extra.text, Extra.desc, Extra.colour
// skipped: none
/*:
 * @target MZ
 * @plugindesc Holds imported parameters
 * @author Example Author
 * @url https://example.invalid/params-host
 *
 * @param Speed
 * @desc A number parameter.
 * @type number
 * @min 0
 * @max 9
 * @decimals 1
 * @default 3
 *
 * @param Slow
 * @desc A number parameter.
 * @type number
 * @default 3
 *
 * @param Image
 * @desc A file parameter.
 * @type file
 * @dir img/pictures
 *
 * @param Sound
 * @desc A file parameter.
 * @type file
 *
 * @param Points
 * @desc A array parameter.
 * @type struct<Point>[]
 * @default []
 *
 * @param Tags
 * @desc A array parameter.
 * @type string[]
 * @default []
 *
 * @param Flag
 * @desc A boolean parameter.
 * @type boolean
 * @on On
 * @default true
 * @parent Speed
 *
 * @param Pace
 * @desc A select parameter.
 * @type select
 * @option Fast
 * @value fast
 * @option Mid
 * @value mid
 * @default fast
 *
 * @param Pick
 * @desc A combo parameter.
 * @type combo
 *
 * @param Extra
 * @type string
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

    const speed = Number(params['Speed'] || 3);
    const slow = Number(params['Slow'] || 3);
    const image = params['Image'] ?? '';
    const sound = params['Sound'] ?? '';
    const points = JSON.parse(params['Points'] || '[]').map(s => JSON.parse(s));
    const tags = JSON.parse(params['Tags'] || '[]');
    const flag = (params['Flag'] ?? 'true') === 'true';
    const pace = params['Pace'] ?? 'fast';
    const pick = params['Pick'] ?? '';
    const extra = params['Extra'] ?? '';

    // Custom plugin code goes here

})();