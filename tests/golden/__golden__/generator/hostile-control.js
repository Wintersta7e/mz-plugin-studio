/*:
 * @target Safe
 * @plugindesc Safe
 * @author Safe
 * @url Safe
 * @base Safe
 * @orderAfter Safe
 * @orderBefore Safe
 * @noteParam Safe
 * @noteType Safe
 * @noteDir Safe
 * @noteData Safe
 * @requiredAssets Safe
 *
 * @param Safe
 * @text Text Safe
 * @desc Safe
 * @type Safe
 * @option Option Safe
 * @value Value Safe
 * @default Safe
 * @parent Safe
 *
 * @command Safe
 * @text Text Safe
 * @desc Safe
 *
 * @arg Safe
 * @text Text Safe
 * @desc Safe
 * @type Safe
 * @on Safe
 * @off Safe
 * @default Safe
 *
 * @arg ComboSafe
 * @text Text Safe
 * @desc Safe
 * @type Safe
 * @option Option Safe
 * @value Value Safe
 * @default Safe
 *
 * @help
 * Safe
 */

/*:ja
 * @plugindesc Safe
 * @help
 * Safe
 */

/*~struct~Safe:
 * @param Safe
 * @text Text Safe
 * @desc Safe
 * @type Safe
 * @dir Safe
 * @default Safe
 * @parent Safe
 *
 */

(() => {
    'use strict';

    const PLUGIN_NAME = 'Safe';

    // Parse plugin parameters
    const params = PluginManager.parameters(PLUGIN_NAME);

    const safe = params['Safe'] || 'Safe';

    // Register plugin commands

    PluginManager.registerCommand(PLUGIN_NAME, 'Safe', function(args) {
        const safe = (args['Safe'] ?? 'false') === 'true';
        const comboSafe = args['ComboSafe'] || 'Safe';

        // TODO: Implement command logic
        // Parsed args available as: safe, comboSafe
    });

    // Custom plugin code goes here

})();