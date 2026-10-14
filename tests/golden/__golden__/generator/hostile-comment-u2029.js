/*:
 * @target X *\/ globalThis.__pwn = 1; /* Y
 * @plugindesc X *\/ globalThis.__pwn = 1; /* Y
 * @author X *\/ globalThis.__pwn = 1; /* Y
 * @url X *\/ globalThis.__pwn = 1; /* Y
 * @base X *\/ globalThis.__pwn = 1; /* Y
 * @orderAfter X *\/ globalThis.__pwn = 1; /* Y
 * @orderBefore X *\/ globalThis.__pwn = 1; /* Y
 * @noteParam X *\/ globalThis.__pwn = 1; /* Y
 * @noteType X *\/ globalThis.__pwn = 1; /* Y
 * @noteDir X *\/ globalThis.__pwn = 1; /* Y
 * @noteData X *\/ globalThis.__pwn = 1; /* Y
 * @requiredAssets X *\/ globalThis.__pwn = 1; /* Y
 *
 * @param X *\/ globalThis.__pwn = 1; /* Y
 * @text Text X *\/ globalThis.__pwn = 1; /* Y
 * @desc X *\/ globalThis.__pwn = 1; /* Y
 * @type X *\/ globalThis.__pwn = 1; /* Y
 * @option Option X *\/ globalThis.__pwn = 1; /* Y
 * @value Value X *\/ globalThis.__pwn = 1; /* Y
 * @default X *\/ globalThis.__pwn = 1; /* Y
 * @parent X *\/ globalThis.__pwn = 1; /* Y
 *
 * @command X *\/ globalThis.__pwn = 1; /* Y
 * @text Text X *\/ globalThis.__pwn = 1; /* Y
 * @desc X *\/ globalThis.__pwn = 1; /* Y
 *
 * @arg X *\/ globalThis.__pwn = 1; /* Y
 * @text Text X *\/ globalThis.__pwn = 1; /* Y
 * @desc X *\/ globalThis.__pwn = 1; /* Y
 * @type X *\/ globalThis.__pwn = 1; /* Y
 * @on X *\/ globalThis.__pwn = 1; /* Y
 * @off X *\/ globalThis.__pwn = 1; /* Y
 * @default X *\/ globalThis.__pwn = 1; /* Y
 *
 * @arg ComboX *\/ globalThis.__pwn = 1; /* Y
 * @text Text X *\/ globalThis.__pwn = 1; /* Y
 * @desc X *\/ globalThis.__pwn = 1; /* Y
 * @type X *\/ globalThis.__pwn = 1; /* Y
 * @option Option X *\/ globalThis.__pwn = 1; /* Y
 * @value Value X *\/ globalThis.__pwn = 1; /* Y
 * @default X *\/ globalThis.__pwn = 1; /* Y
 *
 * @help
 * X *\/ globalThis.__pwn = 1; /* Y
 */

/*:ja
 * @plugindesc X *\/ globalThis.__pwn = 1; /* Y
 * @help
 * X *\/ globalThis.__pwn = 1; /* Y
 */

/*~struct~X *\/ globalThis.__pwn = 1; /* Y:
 * @param X *\/ globalThis.__pwn = 1; /* Y
 * @text Text X *\/ globalThis.__pwn = 1; /* Y
 * @desc X *\/ globalThis.__pwn = 1; /* Y
 * @type X *\/ globalThis.__pwn = 1; /* Y
 * @dir X *\/ globalThis.__pwn = 1; /* Y
 * @default X *\/ globalThis.__pwn = 1; /* Y
 * @parent X *\/ globalThis.__pwn = 1; /* Y
 *
 */

(() => {
    'use strict';

    const PLUGIN_NAME = 'X */\u2029globalThis.__pwn = 1; /* Y';

    // Parse plugin parameters
    const params = PluginManager.parameters(PLUGIN_NAME);

    const xGlobalThisPwn1Y = params['X */\u2029globalThis.__pwn = 1; /* Y'] || 'X *\\/\u2029globalThis.__pwn = 1; /* Y';

    // Register plugin commands

    PluginManager.registerCommand(PLUGIN_NAME, 'X */\u2029globalThis.__pwn = 1; /* Y', function(args) {
        const xGlobalThisPwn1Y = (args['X */\u2029globalThis.__pwn = 1; /* Y'] ?? 'false') === 'true';
        const comboXGlobalThisPwn1Y = args['ComboX */\u2029globalThis.__pwn = 1; /* Y'] || 'X *\\/\u2029globalThis.__pwn = 1; /* Y';

        // TODO: Implement command logic
        // Parsed args available as: xGlobalThisPwn1Y, comboXGlobalThisPwn1Y
    });

    // Custom plugin code goes here

})();