// Fixture_NoBlock.js
// A plugin without an annotation block: the Plugin Manager shows no description or parameters.

(() => {
    'use strict';

    const PLUGIN_NAME = 'Fixture_NoBlock';
    const params = PluginManager.parameters(PLUGIN_NAME);
    // --- New parameters (added by MZ Plugin Studio) ---
    const addedParam = params['AddedParam'] || 'added';
    // --- End new parameters ---

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
})();
