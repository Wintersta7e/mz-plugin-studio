/*:
 * @target MZ
 * @plugindesc Every parameter type
 * @author Example Author
 * @url https://example.invalid/all-param-types
 *
 * @param param_string
 * @text param string
 * @desc A string value.
 * @type string
 *
 * @param param_number
 * @text param number
 * @desc A number value.
 * @type number
 * @min 0
 * @max 10
 * @decimals 1
 * @default 3
 *
 * @param param_boolean
 * @text param boolean
 * @desc A boolean value.
 * @type boolean
 * @on Yes
 * @off No
 * @default true
 *
 * @param param_select
 * @text param select
 * @desc A select value.
 * @type select
 * @option First
 * @value first
 * @option Second
 * @value second
 * @default first
 *
 * @param param_combo
 * @text param combo
 * @desc A combo value.
 * @type combo
 * @option First
 * @value first
 * @option Second
 * @value second
 * @default first
 *
 * @param param_variable
 * @text param variable
 * @desc A variable value.
 * @type variable
 * @default 1
 *
 * @param param_switch
 * @text param switch
 * @desc A switch value.
 * @type switch
 * @default 1
 *
 * @param param_actor
 * @text param actor
 * @desc A actor value.
 * @type actor
 * @default 1
 *
 * @param param_class
 * @text param class
 * @desc A class value.
 * @type class
 * @default 1
 *
 * @param param_skill
 * @text param skill
 * @desc A skill value.
 * @type skill
 * @default 1
 *
 * @param param_item
 * @text param item
 * @desc A item value.
 * @type item
 * @default 1
 *
 * @param param_weapon
 * @text param weapon
 * @desc A weapon value.
 * @type weapon
 * @default 1
 *
 * @param param_armor
 * @text param armor
 * @desc A armor value.
 * @type armor
 * @default 1
 *
 * @param param_enemy
 * @text param enemy
 * @desc A enemy value.
 * @type enemy
 * @default 1
 *
 * @param param_troop
 * @text param troop
 * @desc A troop value.
 * @type troop
 * @default 1
 *
 * @param param_state
 * @text param state
 * @desc A state value.
 * @type state
 * @default 1
 *
 * @param param_animation
 * @text param animation
 * @desc A animation value.
 * @type animation
 * @default 1
 *
 * @param param_tileset
 * @text param tileset
 * @desc A tileset value.
 * @type tileset
 * @default 1
 *
 * @param param_common_event
 * @text param common_event
 * @desc A common_event value.
 * @type common_event
 * @default 1
 *
 * @param param_file
 * @text param file
 * @desc A file value.
 * @type file
 * @dir img/pictures/
 * @default Fixture_Picture
 *
 * @param param_icon
 * @text param icon
 * @desc A icon value.
 * @type icon
 * @default 1
 *
 * @param param_map
 * @text param map
 * @desc A map value.
 * @type map
 * @default 1
 *
 * @param param_location
 * @text param location
 * @desc A location value.
 * @type location
 *
 * @param param_note
 * @text param note
 * @desc A note value.
 * @type note
 * @default "Line"
 *
 * @param param_color
 * @text param color
 * @desc A color value.
 * @type color
 *
 * @param param_text
 * @text param text
 * @desc A text value.
 * @type text
 *
 * @param param_hidden
 * @text param hidden
 * @desc A hidden value.
 * @type hidden
 *
 * @param param_struct
 * @text param struct
 * @desc A struct value.
 * @type struct<T>
 * @default {"x":"1"}
 *
 * @param param_array
 * @text param array
 * @desc A array value.
 * @type number[]
 * @default ["1","2"]
 *
 * @command cmd
 * @text Command
 * @desc Takes one argument of each type.
 *
 * @arg arg_string
 * @text arg string
 * @desc A string value.
 * @type string
 *
 * @arg arg_number
 * @text arg number
 * @desc A number value.
 * @type number
 * @min 0
 * @max 10
 * @decimals 1
 * @default 3
 *
 * @arg arg_boolean
 * @text arg boolean
 * @desc A boolean value.
 * @type boolean
 * @on Yes
 * @off No
 * @default true
 *
 * @arg arg_select
 * @text arg select
 * @desc A select value.
 * @type select
 * @option First
 * @value first
 * @option Second
 * @value second
 * @default first
 *
 * @arg arg_combo
 * @text arg combo
 * @desc A combo value.
 * @type combo
 * @option First
 * @value first
 * @option Second
 * @value second
 * @default first
 *
 * @arg arg_variable
 * @text arg variable
 * @desc A variable value.
 * @type variable
 * @default 1
 *
 * @arg arg_switch
 * @text arg switch
 * @desc A switch value.
 * @type switch
 * @default 1
 *
 * @arg arg_actor
 * @text arg actor
 * @desc A actor value.
 * @type actor
 * @default 1
 *
 * @arg arg_class
 * @text arg class
 * @desc A class value.
 * @type class
 * @default 1
 *
 * @arg arg_skill
 * @text arg skill
 * @desc A skill value.
 * @type skill
 * @default 1
 *
 * @arg arg_item
 * @text arg item
 * @desc A item value.
 * @type item
 * @default 1
 *
 * @arg arg_weapon
 * @text arg weapon
 * @desc A weapon value.
 * @type weapon
 * @default 1
 *
 * @arg arg_armor
 * @text arg armor
 * @desc A armor value.
 * @type armor
 * @default 1
 *
 * @arg arg_enemy
 * @text arg enemy
 * @desc A enemy value.
 * @type enemy
 * @default 1
 *
 * @arg arg_troop
 * @text arg troop
 * @desc A troop value.
 * @type troop
 * @default 1
 *
 * @arg arg_state
 * @text arg state
 * @desc A state value.
 * @type state
 * @default 1
 *
 * @arg arg_animation
 * @text arg animation
 * @desc A animation value.
 * @type animation
 * @default 1
 *
 * @arg arg_tileset
 * @text arg tileset
 * @desc A tileset value.
 * @type tileset
 * @default 1
 *
 * @arg arg_common_event
 * @text arg common_event
 * @desc A common_event value.
 * @type common_event
 * @default 1
 *
 * @arg arg_file
 * @text arg file
 * @desc A file value.
 * @type file
 * @dir img/pictures/
 * @default Fixture_Picture
 *
 * @arg arg_icon
 * @text arg icon
 * @desc A icon value.
 * @type icon
 * @default 1
 *
 * @arg arg_map
 * @text arg map
 * @desc A map value.
 * @type map
 * @default 1
 *
 * @arg arg_location
 * @text arg location
 * @desc A location value.
 * @type location
 *
 * @arg arg_note
 * @text arg note
 * @desc A note value.
 * @type note
 * @default "Line"
 *
 * @arg arg_color
 * @text arg color
 * @desc A color value.
 * @type color
 *
 * @arg arg_text
 * @text arg text
 * @desc A text value.
 * @type text
 *
 * @arg arg_hidden
 * @text arg hidden
 * @desc A hidden value.
 * @type hidden
 *
 * @arg arg_struct
 * @text arg struct
 * @desc A struct value.
 * @type struct<T>
 * @default {"x":"1"}
 *
 * @arg arg_array
 * @text arg array
 * @desc A array value.
 * @type number[]
 * @default ["1","2"]
 *
 * @help
 * One parameter, struct field and command argument of each type.
 */

/*~struct~S:
 * @param field_string
 * @text field string
 * @desc A string value.
 * @type string
 *
 * @param field_number
 * @text field number
 * @desc A number value.
 * @type number
 * @min 0
 * @max 10
 * @decimals 1
 * @default 3
 *
 * @param field_boolean
 * @text field boolean
 * @desc A boolean value.
 * @type boolean
 * @on Yes
 * @off No
 * @default true
 *
 * @param field_select
 * @text field select
 * @desc A select value.
 * @type select
 * @option First
 * @value first
 * @option Second
 * @value second
 * @default first
 *
 * @param field_combo
 * @text field combo
 * @desc A combo value.
 * @type combo
 * @option First
 * @value first
 * @option Second
 * @value second
 * @default first
 *
 * @param field_variable
 * @text field variable
 * @desc A variable value.
 * @type variable
 * @default 1
 *
 * @param field_switch
 * @text field switch
 * @desc A switch value.
 * @type switch
 * @default 1
 *
 * @param field_actor
 * @text field actor
 * @desc A actor value.
 * @type actor
 * @default 1
 *
 * @param field_class
 * @text field class
 * @desc A class value.
 * @type class
 * @default 1
 *
 * @param field_skill
 * @text field skill
 * @desc A skill value.
 * @type skill
 * @default 1
 *
 * @param field_item
 * @text field item
 * @desc A item value.
 * @type item
 * @default 1
 *
 * @param field_weapon
 * @text field weapon
 * @desc A weapon value.
 * @type weapon
 * @default 1
 *
 * @param field_armor
 * @text field armor
 * @desc A armor value.
 * @type armor
 * @default 1
 *
 * @param field_enemy
 * @text field enemy
 * @desc A enemy value.
 * @type enemy
 * @default 1
 *
 * @param field_troop
 * @text field troop
 * @desc A troop value.
 * @type troop
 * @default 1
 *
 * @param field_state
 * @text field state
 * @desc A state value.
 * @type state
 * @default 1
 *
 * @param field_animation
 * @text field animation
 * @desc A animation value.
 * @type animation
 * @default 1
 *
 * @param field_tileset
 * @text field tileset
 * @desc A tileset value.
 * @type tileset
 * @default 1
 *
 * @param field_common_event
 * @text field common_event
 * @desc A common_event value.
 * @type common_event
 * @default 1
 *
 * @param field_file
 * @text field file
 * @desc A file value.
 * @type file
 * @dir img/pictures/
 * @default Fixture_Picture
 *
 * @param field_icon
 * @text field icon
 * @desc A icon value.
 * @type icon
 * @default 1
 *
 * @param field_map
 * @text field map
 * @desc A map value.
 * @type map
 * @default 1
 *
 * @param field_location
 * @text field location
 * @desc A location value.
 * @type location
 *
 * @param field_note
 * @text field note
 * @desc A note value.
 * @type note
 * @default "Line"
 *
 * @param field_color
 * @text field color
 * @desc A color value.
 * @type color
 *
 * @param field_text
 * @text field text
 * @desc A text value.
 * @type text
 *
 * @param field_hidden
 * @text field hidden
 * @desc A hidden value.
 * @type hidden
 *
 * @param field_struct
 * @text field struct
 * @desc A struct value.
 * @type struct<T>
 * @default {"x":"1"}
 *
 * @param field_array
 * @text field array
 * @desc A array value.
 * @type number[]
 * @default ["1","2"]
 *
 */

/*~struct~T:
 * @param x
 * @text X
 * @type number
 * @default 0
 *
 */

(() => {
    'use strict';

    const PLUGIN_NAME = 'Fixture_AllParamTypes';

    // Parse plugin parameters
    const params = PluginManager.parameters(PLUGIN_NAME);

    const paramString = params['param_string'] || '';
    const paramNumber = Number(params['param_number'] || 3);
    const paramBoolean = (params['param_boolean'] ?? 'true') === 'true';
    const paramSelect = params['param_select'] || 'first';
    const paramCombo = params['param_combo'] || 'first';
    const paramVariable = Number(params['param_variable'] || 1);
    const paramSwitch = Number(params['param_switch'] || 1);
    const paramActor = Number(params['param_actor'] || 1);
    const paramClass = Number(params['param_class'] || 1);
    const paramSkill = Number(params['param_skill'] || 1);
    const paramItem = Number(params['param_item'] || 1);
    const paramWeapon = Number(params['param_weapon'] || 1);
    const paramArmor = Number(params['param_armor'] || 1);
    const paramEnemy = Number(params['param_enemy'] || 1);
    const paramTroop = Number(params['param_troop'] || 1);
    const paramState = Number(params['param_state'] || 1);
    const paramAnimation = Number(params['param_animation'] || 1);
    const paramTileset = Number(params['param_tileset'] || 1);
    const paramCommonEvent = Number(params['param_common_event'] || 1);
    const paramFile = params['param_file'] || 'Fixture_Picture';
    const paramIcon = Number(params['param_icon'] || 1);
    const paramMap = Number(params['param_map'] || 1);
    const paramLocation = JSON.parse(params['param_location'] || '{"mapId":"0","x":"0","y":"0"}');
    const paramNote = params['param_note'] || '"Line"';
    const paramColor = params['param_color'] || '';
    const paramText = params['param_text'] || '';
    const paramHidden = params['param_hidden'] || '';
    const paramStruct = JSON.parse(params['param_struct'] || '{"x":"1"}');
    const paramArray = JSON.parse(params['param_array'] || '[]').map(Number);

    // Register plugin commands

    PluginManager.registerCommand(PLUGIN_NAME, 'cmd', function(args) {
        const argString = args['arg_string'] || '';
        const argNumber = Number(args['arg_number'] || 3);
        const argBoolean = (args['arg_boolean'] ?? 'true') === 'true';
        const argSelect = args['arg_select'] || 'first';
        const argCombo = args['arg_combo'] || 'first';
        const argVariable = Number(args['arg_variable'] || 1);
        const argSwitch = Number(args['arg_switch'] || 1);
        const argActor = Number(args['arg_actor'] || 1);
        const argClass = Number(args['arg_class'] || 1);
        const argSkill = Number(args['arg_skill'] || 1);
        const argItem = Number(args['arg_item'] || 1);
        const argWeapon = Number(args['arg_weapon'] || 1);
        const argArmor = Number(args['arg_armor'] || 1);
        const argEnemy = Number(args['arg_enemy'] || 1);
        const argTroop = Number(args['arg_troop'] || 1);
        const argState = Number(args['arg_state'] || 1);
        const argAnimation = Number(args['arg_animation'] || 1);
        const argTileset = Number(args['arg_tileset'] || 1);
        const argCommonEvent = Number(args['arg_common_event'] || 1);
        const argFile = args['arg_file'] || 'Fixture_Picture';
        const argIcon = Number(args['arg_icon'] || 1);
        const argMap = Number(args['arg_map'] || 1);
        const argLocation = JSON.parse(args['arg_location'] || '{"mapId":"0","x":"0","y":"0"}');
        const argNote = args['arg_note'] || '"Line"';
        const argColor = args['arg_color'] || '';
        const argText = args['arg_text'] || '';
        const argHidden = args['arg_hidden'] || '';
        const argStruct = JSON.parse(args['arg_struct'] || '{"x":"1"}');
        const argArray = JSON.parse(args['arg_array'] || '[]').map(Number);

        // TODO: Implement command logic
        // Parsed args available as: argString, argNumber, argBoolean, argSelect, argCombo, argVariable, argSwitch, argActor, argClass, argSkill, argItem, argWeapon, argArmor, argEnemy, argTroop, argState, argAnimation, argTileset, argCommonEvent, argFile, argIcon, argMap, argLocation, argNote, argColor, argText, argHidden, argStruct, argArray
    });

    // Custom plugin code goes here

})();