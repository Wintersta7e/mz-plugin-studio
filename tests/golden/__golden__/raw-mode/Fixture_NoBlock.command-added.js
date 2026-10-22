/*:
 *
 * @command AddedCommand
 * @text Added Command
 * @desc Added command
 *
 */

(() => {
    'use strict';

    const PLUGIN_NAME = 'Fixture_NoBlock';

    // Register plugin commands

    PluginManager.registerCommand(PLUGIN_NAME, 'AddedCommand', function(args) {

        // TODO: Implement command logic
    });

    // ========== Custom Plugin Code ==========
    const _Game_System_onAfterLoad = Game_System.prototype.onAfterLoad;
        Game_System.prototype.onAfterLoad = function() {
            _Game_System_onAfterLoad.call(this);
            flashes = 0;
        };
    })();

})();