/*:
 * @target MZ
 * @plugindesc Fixture plugin with English and Japanese blocks only.
 * @author Example Author
 * @url https://example.invalid/Fixture_EnJaOnly
 *
 * @param Rate
 * @desc Battle speed multiplier.
 * @type number
 * @min 1
 * @max 4
 * @default 42
 *
 * @param Title
 * @desc Title drawn above the status window.
 * @type string
 * @default Status
 *
 * @param Frame
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
 *
 * @help
 * Fixture_EnJaOnly.js
 * 
 * Changes the battle speed and draws a frame around the status window.
 */

/*:ja
 * @plugindesc 英語と日本語のブロックだけを持つフィクスチャ
 * @help
 * Fixture_EnJaOnly.js
 * 
 * 戦闘速度を変更し、ステータスウィンドウに枠を描きます。
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

    const PLUGIN_NAME = 'Fixture_EnJaOnly';

    // Parse plugin parameters
    const params = PluginManager.parameters(PLUGIN_NAME);

    const rate = Number(params['Rate'] || 42);
    const title = params['Title'] || 'Status';
    const frame = JSON.parse(params['Frame'] || '{"thickness":"2","color":"#ffffff"}');

    // Register plugin commands

    PluginManager.registerCommand(PLUGIN_NAME, 'SetRate', function(args) {
        const rate = Number(args['rate'] || 1);

        // TODO: Implement command logic
        // Parsed args available as: rate
    });

    // ========== Custom Plugin Code ==========
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

})();