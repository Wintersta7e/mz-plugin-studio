// Fixture_NoBlock.js
// A plugin without an annotation block: the Plugin Manager shows no description or parameters.

(() => {
    'use strict';

    let flashes = 0;

    PluginManager.registerCommand('Fixture_NoBlock', 'Flash', () => {
        flashes++;
        $gameScreen.startFlash([255, 255, 255, 128], 8);
    });

    const _Game_System_onAfterLoad = Game_System.prototype.onAfterLoad;
    Game_System.prototype.onAfterLoad = function() {
        _Game_System_onAfterLoad.call(this);
        flashes = 0;
    };

    const PLUGIN_NAME = 'Fixture_NoBlock';
    // --- New commands (added by MZ Plugin Studio) ---
    PluginManager.registerCommand(PLUGIN_NAME, 'AddedCommand', function(args) {

        // TODO: Implement AddedCommand logic
    });
    // --- End new commands ---

})();
