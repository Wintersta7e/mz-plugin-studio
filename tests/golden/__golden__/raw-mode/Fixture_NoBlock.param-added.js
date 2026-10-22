/*:
 *
 * @param AddedParam
 * @text Added Param
 * @desc Added parameter
 * @type string
 * @default added
 *
 */

(() => {
    'use strict';

    const PLUGIN_NAME = 'Fixture_NoBlock';

    // Parse plugin parameters
    const params = PluginManager.parameters(PLUGIN_NAME);

    const addedParam = params['AddedParam'] || 'added';

    // ========== Custom Plugin Code ==========
    const _Game_System_onAfterLoad = Game_System.prototype.onAfterLoad;
        Game_System.prototype.onAfterLoad = function() {
            _Game_System_onAfterLoad.call(this);
            flashes = 0;
        };
    })();

})();