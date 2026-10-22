/*:
 *
 */

(() => {
    'use strict';

    const PLUGIN_NAME = 'Fixture_NoBlock';

    // ========== Custom Plugin Code ==========
    const _Game_System_onAfterLoad = Game_System.prototype.onAfterLoad;
        Game_System.prototype.onAfterLoad = function() {
            _Game_System_onAfterLoad.call(this);
            flashes = 0;
        };
    })();

})();