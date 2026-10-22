/*:
 * @target MZ
 * @plugindesc Fixture plugin that declares the assets it needs.
 * @author Example Author
 * @url https://example.invalid/Fixture_Require
 *
 * @help Fixture_Require.js
 *
 * Shows a picture with a caption. The picture parameter and the
 * actor note tag both name files kept by "Exclude unused files".
 *
 * Actor note tag:
 *   <FixtureFace:Fixture_Face>
 *
 * @noteParam FixtureFace
 * @noteDir img/faces/
 * @noteType file
 * @noteData actors
 *
 * @param Picture
 * @text Picture
 * @desc Picture shown by the command.
 * @type file
 * @dir img/pictures/
 * @require 1
 * @default FixturePicture
 *
 * @param Opacity
 * @text Opacity
 * @desc Opacity of the picture.
 * @type number
 * @min 0
 * @max 255
 * @default 255
 *
 * @param Caption
 * @text Caption
 * @desc Text written under the picture.
 * @type string
 * @default Fixture
 *
 * @param Anchor
 * @text Anchor
 * @desc Screen position of the picture.
 * @type struct<Anchor>
 * @default {"x":"408","y":"312"}
 *
 * @command ShowPicture
 * @text Show Picture
 * @desc Shows the picture in a picture slot.
 *
 * @arg pictureId
 * @text Picture Number
 * @desc Picture slot to use.
 * @type number
 * @min 1
 * @max 100
 * @default 1
 */

/*~struct~Anchor:
 * @param x
 * @text X
 * @type number
 * @default 408
 *
 * @param y
 * @text Y
 * @type number
 * @default 312
 */

(() => {
    'use strict';

    const params = PluginManager.parameters('Fixture_Require');
    const picture = String(params['Picture'] || '');
    const opacity = Number(params['Opacity'] || 255);
    const caption = String(params['Caption'] || '');
    const anchor = JSON.parse(params['Anchor'] || '{"x":"0","y":"0"}');

    PluginManager.registerCommand('Fixture_Require', 'ShowPicture', args => {
        const pictureId = Number(args.pictureId || 1);
        $gameScreen.showPicture(pictureId, picture, 1, Number(anchor.x), Number(anchor.y), 100, 100, opacity, 0);
        $gameMessage.add(caption);
    });
})();
