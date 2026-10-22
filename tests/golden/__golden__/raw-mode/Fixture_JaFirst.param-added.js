/*:ja
 * @target MZ
 * @plugindesc 日本語ブロックが先に来るフィクスチャ
 * @author Example Author
 * @url https://example.invalid/Fixture_JaFirst
 *
 * @help Fixture_JaFirst.js
 *
 * 指定した範囲内で歩数を数えます。
 *
 * @param Limit
 * @text 上限
 * @desc 数える歩数の上限
 * @type number
 * @min 1
 * @max 9
 * @default 3
 *
 * @param Caption
 * @text 見出し
 * @desc 歩数の前に表示する文字列
 * @type string
 * @default 歩数
 *
 * @param Area
 * @text 範囲
 * @desc 歩数を数える範囲
 * @type struct<Area>
 * @default {"width":"5","height":"5"}
 *
 * @command ResetSteps
 * @text 歩数リセット
 * @desc 歩数を初期値に戻します。
 *
 * @arg value
 * @text 初期値
 * @desc リセット後の歩数
 * @type number
 * @default 0
 */

/*:
 * @target MZ
 * @plugindesc Fixture plugin whose Japanese block comes first.
 * @author Example Author
 * @url https://example.invalid/Fixture_JaFirst
 *
 * @param Limit
 * @desc Highest step count.
 * @type number
 * @min 1
 * @max 9
 * @default 3
 *
 * @param Caption
 * @desc Text shown before the step count.
 * @type string
 * @default Steps
 *
 * @param Area
 * @desc Area in which steps are counted.
 * @type struct<Area>
 * @default {"width":"5","height":"5"}
 *
 * @param AddedParam
 * @text Added Param
 * @desc Added parameter
 * @type string
 * @default added
 *
 * @command ResetSteps
 * @text Reset Steps
 * @desc Sets the step count back.
 *
 * @arg value
 * @text Value
 * @desc Step count after the reset.
 * @type number
 * @default 0
 *
 * @help
 * Fixture_JaFirst.js
 * 
 * Counts steps inside an area.
 */

/*~struct~Area:
 * @param width
 * @text Width
 * @type number
 * @min 1
 * @default 5
 *
 * @param height
 * @text Height
 * @type number
 * @min 1
 * @default 5
 */

(() => {
    'use strict';

    const parameters = PluginManager.parameters('Fixture_JaFirst');

    // --- New parameters (added by MZ Plugin Studio) ---
    const addedParam = parameters['AddedParam'] || 'added';
    // --- End new parameters ---
    const limit = Number(parameters['Limit'] || 3);
    const caption = String(parameters['Caption'] || 'Steps');
    const area = JSON.parse(parameters['Area'] || '{"width":"5","height":"5"}');

    let steps = 0;

    PluginManager.registerCommand('Fixture_JaFirst', 'ResetSteps', args => {
        steps = Number(args.value || 0);
    });

    const _Game_Player_increaseSteps = Game_Player.prototype.increaseSteps;
    Game_Player.prototype.increaseSteps = function() {
        _Game_Player_increaseSteps.call(this);
        if (this.x < Number(area.width) && this.y < Number(area.height)) {
            steps = Math.min(limit, steps + 1);
            this._fixtureStepText = caption + ' ' + steps;
        }
    };
})();
