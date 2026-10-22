/*:en
 * @target MZ
 * @plugindesc Fixture plugin with English and Japanese blocks only.
 * @author Example Author
 * @url https://example.invalid/Fixture_EnJaOnly
 *
 * @help Fixture_EnJaOnly.js
 *
 * Changes the battle speed and draws a frame around the status window.
 *
 * @param Rate
 * @text Rate
 * @desc Battle speed multiplier.
 * @type number
 * @min 1
 * @max 4
 * @default 2
 *
 * @param Title
 * @text Title
 * @desc Title drawn above the status window.
 * @type string
 * @default Status
 *
 * @param Frame
 * @text Frame
 * @desc Frame drawn around the status window.
 * @type struct<Frame>
 * @default {"thickness":"2","color":"#ffffff"}
 *
 * @command SetRate
 * @text Set Rate
 * @desc Changes the battle speed multiplier.
 *
 * @arg rate
 * @text Rate
 * @desc New multiplier.
 * @type number
 * @min 1
 * @max 4
 * @default 1
 */

/*:ja
 * @target MZ
 * @plugindesc 英語と日本語のブロックだけを持つフィクスチャ
 * @author Example Author
 * @url https://example.invalid/Fixture_EnJaOnly
 *
 * @help Fixture_EnJaOnly.js
 *
 * 戦闘速度を変更し、ステータスウィンドウに枠を描きます。
 *
 * @param Rate
 * @text 倍率
 * @desc 戦闘速度の倍率
 * @type number
 * @min 1
 * @max 4
 * @default 2
 *
 * @param Title
 * @text 見出し
 * @desc ステータスウィンドウの見出し
 * @type string
 * @default ステータス
 *
 * @param Frame
 * @text 枠
 * @desc ステータスウィンドウの枠
 * @type struct<Frame>
 * @default {"thickness":"2","color":"#ffffff"}
 *
 * @command SetRate
 * @text 倍率変更
 * @desc 戦闘速度の倍率を変更します。
 *
 * @arg rate
 * @text 倍率
 * @desc 新しい倍率
 * @type number
 * @min 1
 * @max 4
 * @default 1
 */

/*~struct~Frame:
 * @param thickness
 * @text Thickness
 * @type number
 * @min 0
 * @max 8
 * @default 2
 *
 * @param color
 * @text Color
 * @type string
 * @default #ffffff
 *
 */

(() => {
    'use strict';

    const params = PluginManager.parameters('Fixture_EnJaOnly');

    // --- New parameters (added by MZ Plugin Studio) ---
    const rate = Number(params['Rate'] || 2);
    const title = params['Title'] || 'Status';
    const frame = JSON.parse(params['Frame'] || '{"thickness":"2","color":"#ffffff"}');
    const addedParam = params['AddedParam'] || 'added';
    // --- End new parameters ---
    let rate = Number(params['Rate'] || 2);
    const title = String(params['Title'] || 'Status');
    const frame = JSON.parse(params['Frame'] || '{}');

    PluginManager.registerCommand('Fixture_EnJaOnly', 'SetRate', args => {
        rate = Number(args.rate || 1);
    });

    const _BattleManager_update = BattleManager.update;
    BattleManager.update = function(timeActive) {
        for (let i = 0; i < rate; i++) {
            _BattleManager_update.call(this, timeActive);
        }
    };

    const _Window_BattleStatus_refresh = Window_BattleStatus.prototype.refresh;
    Window_BattleStatus.prototype.refresh = function() {
        _Window_BattleStatus_refresh.call(this);
        this.contents.fontSize = 18;
        this.drawText(title, 0, 0, this.innerWidth, 'center');
        this._fixtureFrame = { thickness: Number(frame.thickness || 0), color: frame.color };
    };

    const PLUGIN_NAME = 'Fixture_EnJaOnly';
    // --- New commands (added by MZ Plugin Studio) ---
    PluginManager.registerCommand(PLUGIN_NAME, 'SetRate', function(args) {
        const rate = Number(args['rate'] || 1);

        // TODO: Implement SetRate logic
        // Parsed args available as: rate
    });
    // --- End new commands ---

})();
