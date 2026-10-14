/*!
 * Fixture_HandWritten.js
 * Copyright (c) 2026 Example Author
 * Released under the MIT License.
 */

/*:
 * @target MZ
 * @plugindesc Hand-written fixture plugin with a licence preamble.
 * @author Example Author
 * @url https://example.invalid/Fixture_HandWritten
 *
 * @param Speed
 * @desc Frames between two label refreshes.
 * @type number
 * @min 1
 * @max 10
 * @default 5
 *
 * @param Label
 * @desc Text shown on the map.
 * @type string
 * @default Hello
 *
 * @param Origin
 * @desc Where the label is drawn.
 * @type struct<Point>
 * @default {"x":"0","y":"0"}
 *
 * @command ShowLabel
 * @text Show Label
 * @desc Shows the label a number of times.
 *
 * @arg times
 * @text Times
 * @desc How often the label is shown.
 * @type number
 * @min 1
 * @default 1
 *
 * @arg addedArg
 * @text Added Arg
 * @type number
 * @default 0
 *
 * @help
 * Fixture_HandWritten.js
 * 
 * Shows a label on the map and refreshes it every few frames.
 * The command shows the label a number of times.
 */

/*:ja
 * @target MZ
 * @plugindesc ライセンス表記付きの手書きフィクスチャ
 * @author Example Author
 * @url https://example.invalid/Fixture_HandWritten
 *
 * @help Fixture_HandWritten.js
 *
 * マップにラベルを表示し、数フレームごとに更新します。
 *
 * @param Speed
 * @text 速度
 * @desc ラベルを更新する間隔（フレーム）
 * @type number
 * @min 1
 * @max 10
 * @default 5
 *
 * @param Label
 * @text ラベル
 * @desc マップに表示する文字列
 * @type string
 * @default Hello
 *
 * @param Origin
 * @text 原点
 * @desc ラベルの表示位置
 * @type struct<Point>
 * @default {"x":"0","y":"0"}
 *
 * @command ShowLabel
 * @text ラベル表示
 * @desc ラベルを指定回数表示します。
 *
 * @arg times
 * @text 回数
 * @desc ラベルを表示する回数
 * @type number
 * @min 1
 * @default 1
 */

/*~struct~Point:
 * @param x
 * @text X
 * @type number
 * @min 0
 * @default 0
 *
 * @param y
 * @text Y
 * @type number
 * @min 0
 * @default 0
 *
 */

(() => {
    'use strict';

    const pluginName = 'Fixture_HandWritten';
    const params = PluginManager.parameters(pluginName);

    // --- New parameters (added by MZ Plugin Studio) ---
    const speed = Number(params['Speed'] || 5);
    const label = params['Label'] || 'Hello';
    const origin = JSON.parse(params['Origin'] || '{"x":"0","y":"0"}');
    // --- End new parameters ---
    const speed = Number(params['Speed'] || 5);
    const label = String(params["Label"] || 'Hello');
    const origin = JSON.parse(params['Origin'] || '{"x":"0","y":"0"}');

    /**
     * Builds the text shown for a given count.
     * @param {number} count How often the label was shown.
     * @returns {string} The label with its count.
     */
    function formatLabel(count) {
        return label + ' x' + count;
    }

    PluginManager.registerCommand(pluginName, 'ShowLabel', args => {
        const times = Number(args.times || 1);
        $gameMessage.add(formatLabel(times));
    });

    /**
     * Counts map frames and refreshes the label text.
     */
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        this._fixtureFrames = (this._fixtureFrames || 0) + 1;
        if (this._fixtureFrames % speed === 0) {
            this._fixtureLabel = formatLabel(this._fixtureFrames / speed);
            this._fixtureLabelX = Number(origin.x);
            this._fixtureLabelY = Number(origin.y);
        }
    };

    const PLUGIN_NAME = 'Fixture_HandWritten';
    // --- New commands (added by MZ Plugin Studio) ---
    PluginManager.registerCommand(PLUGIN_NAME, 'ShowLabel', function(args) {
        const times = Number(args['times'] || 1);
        const addedArg = Number(args['addedArg'] || 0);

        // TODO: Implement ShowLabel logic
        // Parsed args available as: times, addedArg
    });
    // --- End new commands ---

})();
