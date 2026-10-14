/*:
 * @target MZ
 * @plugindesc Fixture plugin written without a wrapping function.
 * @author Example Author
 * @url https://example.invalid/Fixture_NoIife
 *
 * @param Step
 * @desc Tiles moved per command.
 * @type number
 * @min 1
 * @max 8
 * @default 42
 *
 * @param Title
 * @desc Name shown in the log.
 * @type string
 * @default Fixture
 *
 * @param Start
 * @desc Tile the player returns to.
 * @type struct<Start>
 * @default {"mapId":"1","x":"0","y":"0"}
 *
 * @command Nudge
 * @desc Moves the player in a direction.
 *
 * @arg direction
 * @text Direction
 * @desc Direction to move (2, 4, 6 or 8).
 * @type number
 * @min 2
 * @max 8
 * @default 2
 *
 * @help
 * Fixture_NoIife.js
 * 
 * Moves the player a few tiles when the command runs.
 * The code sits at the top level of the file.
 */

/*~struct~Start:
 * @param mapId
 * @text Map
 * @type map
 * @default 1
 *
 * @param x
 * @text X
 * @type number
 * @default 0
 *
 * @param y
 * @text Y
 * @type number
 * @default 0
 *
 */

var Fixture = Fixture || {};
Fixture.NoIife = Fixture.NoIife || {};

var prm = PluginManager.parameters(

    // --- New parameters (added by MZ Plugin Studio) ---
    const step = Number(params['Step'] || 42);
    const title = params['Title'] || 'Fixture';
    const start = JSON.parse(params['Start'] || '{"mapId":"1","x":"0","y":"0"}');
    // --- End new parameters ---
    'Fixture_NoIife'
);
Fixture.NoIife.step = Number(prm.Step || 2);
Fixture.NoIife.title = String(prm.Title || 'Fixture');
Fixture.NoIife.start = JSON.parse(prm.Start || '{}');

PluginManager.registerCommand('Fixture_NoIife', 'Nudge', function(args) {
    var direction = Number(args.direction || 2);
    for (var i = 0; i < Fixture.NoIife.step; i++) {
        $gamePlayer.moveStraight(direction);
    }
    console.log(Fixture.NoIife.title + ': ' + direction);
});

Fixture.NoIife._Game_Player_reserveTransfer = Game_Player.prototype.reserveTransfer;
Game_Player.prototype.reserveTransfer = function(mapId, x, y, d, fadeType) {
    var start = Fixture.NoIife.start;
    if (mapId === 0) {
        mapId = Number(start.mapId);
        x = Number(start.x);
        y = Number(start.y);
    }
    Fixture.NoIife._Game_Player_reserveTransfer.call(this, mapId, x, y, d, fadeType);
};
