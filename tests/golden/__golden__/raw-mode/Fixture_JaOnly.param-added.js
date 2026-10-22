/*:
 *
 * @param Interval
 * @text 間隔
 * @desc メッセージを表示する歩数
 * @type number
 * @min 1
 * @max 99
 * @default 10
 *
 * @param Message
 * @text メッセージ
 * @desc 表示するメッセージ
 * @type string
 * @default 歩きました
 *
 * @param AddedParam
 * @text Added Param
 * @desc Added parameter
 * @type string
 * @default added
 *
 * @command ResetSteps
 * @text 歩数リセット
 * @desc 数えた歩数を戻します。
 *
 * @arg steps
 * @text 歩数
 * @desc 新しい歩数
 * @type number
 * @min 0
 * @default 0
 *
 */

(() => {
    'use strict';

    const PLUGIN_NAME = 'Fixture_JaOnly';

    // Parse plugin parameters
    const params = PluginManager.parameters(PLUGIN_NAME);

    const interval = Number(params['Interval'] || 10);
    const message = params['Message'] || '歩きました';
    const addedParam = params['AddedParam'] || 'added';

    // Register plugin commands

    PluginManager.registerCommand(PLUGIN_NAME, 'ResetSteps', function(args) {
        const steps = Number(args['steps'] || 0);

        // TODO: Implement command logic
        // Parsed args available as: steps
    });

    // ========== Custom Plugin Code ==========
    const _Game_Party_increaseSteps = Game_Party.prototype.increaseSteps;
    Game_Party.prototype.increaseSteps = function() {
        _Game_Party_increaseSteps.call(this);
        steps++;
        if (steps % interval === 0) {
            $gameMessage.add(message);
        }
    };

})();