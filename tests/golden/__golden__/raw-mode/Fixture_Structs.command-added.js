/*:
 * @target MZ
 * @plugindesc Struct fixture whose lists close with ];
 * @author Example Author
 * @url https://example.invalid/Fixture_Structs
 *
 * @param Entries
 * @desc Entries listed at the start.
 * @type struct<Entry>[]
 * @default []
 *
 * @param Highlight
 * @desc Color of the newest entry.
 * @type struct<Color>
 * @default {"red":"255","green":"224","blue":"128"}
 *
 * @param Count
 * @desc Number of entries kept.
 * @type number
 * @min 0
 * @max 20
 * @default 4
 *
 * @param Heading
 * @desc Text drawn above the list.
 * @type string
 * @default Entries
 *
 * @command AddEntry
 * @text Add Entry
 * @desc Adds an entry to the list.
 *
 * @arg label
 * @text Label
 * @desc Text of the entry.
 * @type string
 * @default Entry
 *
 * @arg weight
 * @text Weight
 * @desc Sort weight of the entry.
 * @type number
 * @default 1
 *
 * @command ClearEntries
 * @desc Removes every entry.
 *
 * @command AddedCommand
 * @text Added Command
 * @desc Added command
 *
 * @help
 * Fixture_Structs.js
 * 
 * Keeps a list of entries and highlights the newest one.
 * The struct definitions sit after the code.
 */

(() => {
    'use strict';

    const params = PluginManager.parameters('Fixture_Structs');
    const entries = JSON.parse(params['Entries'] || '[]').map(e => JSON.parse(e));
    const highlight = JSON.parse(params['Highlight'] || '{}');
    const count = Number(params['Count'] || 4);
    const heading = String(params['Heading'] || 'Entries');

    PluginManager.registerCommand('Fixture_Structs', 'AddEntry', args => {
        entries.push({ label: args.label, weight: Number(args.weight || 1) });
        while (entries.length > count) {
            entries.shift();
        }
    });

    PluginManager.registerCommand('Fixture_Structs', 'ClearEntries', () => {
        entries.length = 0;
    });

    window.FixtureStructs = {
        heading,
        entries: () => entries.slice(),
        highlight: () => `rgb(${highlight.red}, ${highlight.green}, ${highlight.blue})`
    };

    const PLUGIN_NAME = 'Fixture_Structs';
    // --- New commands (added by MZ Plugin Studio) ---
    PluginManager.registerCommand(PLUGIN_NAME, 'AddedCommand', function(args) {

        // TODO: Implement command logic
    });
    // --- End new commands ---

})();

/*~struct~Entry:
 * @param label
 * @text Label
 * @type string
 * @default Entry
 *
 * @param weight
 * @text Weight
 * @type number
 * @min 0
 * @default 1
 */

/*~struct~Color:
 * @param red
 * @text Red
 * @type number
 * @min 0
 * @max 255
 * @default 255
 *
 * @param green
 * @text Green
 * @type number
 * @min 0
 * @max 255
 * @default 224
 *
 * @param blue
 * @text Blue
 * @type number
 * @min 0
 * @max 255
 * @default 128
 */
