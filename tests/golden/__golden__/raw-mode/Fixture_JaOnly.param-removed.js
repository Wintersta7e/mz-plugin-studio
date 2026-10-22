/*:ja
 * @target MZ
 * @plugindesc 日本語のブロックだけを持つフィクスチャ
 * @author Example Author
 * @url https://example.invalid/Fixture_JaOnly
 *
 * @help Fixture_JaOnly.js
 *
 * 歩数を数え、一定の歩数ごとにメッセージを表示します。
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
 */

(() => {
    'use strict';

    const params = PluginManager.parameters('Fixture_JaOnly');
    const interval = Number(params['Interval'] || 10);
    const message = String(params['Message'] || '');
    let steps = 0;

    PluginManager.registerCommand('Fixture_JaOnly', 'ResetSteps', args => {
        steps = Number(args.steps || 0);
    });

    const _Game_Party_increaseSteps = Game_Party.prototype.increaseSteps;
    Game_Party.prototype.increaseSteps = function() {
        _Game_Party_increaseSteps.call(this);
        steps++;
        if (steps % interval === 0) {
            $gameMessage.add(message);
        }
    };
})();
