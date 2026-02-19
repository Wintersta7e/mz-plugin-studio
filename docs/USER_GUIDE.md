# MZ Plugin Studio User Guide

A comprehensive guide to creating RPG Maker MZ plugins with MZ Plugin Studio.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Interface Overview](#interface-overview)
3. [Creating Your First Plugin](#creating-your-first-plugin)
4. [Working with Parameters](#working-with-parameters)
5. [Bulk Parameter Operations](#bulk-parameter-operations)
6. [Creating Plugin Commands](#creating-plugin-commands)
7. [Using Structs](#using-structs)
8. [Code Templates](#code-templates)
9. [Multi-Language Support](#multi-language-support)
10. [Plugin Dependencies](#plugin-dependencies)
11. [Plugin Conflict Detection](#plugin-conflict-detection)
12. [Note Parameters (Deployment)](#note-parameters-deployment)
13. [Auto-Documentation](#auto-documentation)
14. [Project Integration](#project-integration)
15. [Importing Existing Plugins](#importing-existing-plugins)
16. [Raw Mode](#raw-mode)
17. [Exporting Plugins](#exporting-plugins)
18. [Diff View](#diff-view)
19. [Settings](#settings)
20. [Keyboard Shortcuts](#keyboard-shortcuts)
21. [Auto-Update](#auto-update)
22. [Best Practices](#best-practices)
23. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Launching the Application

**Development Mode:**
```bash
cd mz-plugin-studio
npm run dev
```

**Built Application:**
Run the executable from the `dist/` folder after building with `npm run build:win`.

### First Launch

When you first open MZ Plugin Studio, you'll see:
- An empty sidebar on the left (your plugin list)
- The main editing area (currently empty)
- A toolbar at the top with project and plugin controls

---

## Interface Overview

### Sidebar (Left Panel)
- **Plugin List** - All open plugins as tabs
- **+ Button** - Create a new plugin
- **Folder Icon** - Load an RPG Maker MZ project

### Main Editor (Center)
Tabs for different aspects of your plugin:

| Tab | Purpose |
|-----|---------|
| **Meta** | Plugin name, version, author, description, dependencies, note parameters |
| **Parameters** | Configuration options users can set |
| **Commands** | Plugin commands callable from events |
| **Structs** | Complex nested data structures |
| **Code** | Generated JavaScript preview |

### Code Editor (Left Panel - Code Tab)
- **Monaco Editor** - Same editor used in VS Code
- **MZ Autocomplete** - 139 RPG Maker MZ classes and 28 global objects with IntelliSense, sorted by real-world popularity
- **Code Snippets** - Type `alias`, `register`, `param`, or `window` for quick scaffolding
- **Template Insertion** - Click the puzzle piece icon to browse and insert code templates

### Generated Code Preview (Right Panel)
- Real-time JavaScript preview (read-only)
- Syntax highlighting
- Validation errors and warnings
- **Raw** button - Toggle raw mode for imported plugins (headers-only regeneration)
- **Diff** button - Compare generated output against saved file
- **Copy** and **Export** buttons
- **Export dropdown** (chevron) - Export as README.md, .d.ts, or plugins.json entry

---

## Creating Your First Plugin

### Step 1: Create a New Plugin
Click the **+** button in the sidebar or use **Ctrl+N**.

### Step 2: Set Metadata
In the **Meta** tab, fill in:

| Field | Example | Required |
|-------|---------|----------|
| Plugin Name | MyFirstPlugin | Yes |
| Version | 1.0.0 | Yes |
| Author | YourName | Yes |
| Description | Adds cool features | Yes |
| URL | https://... | No |
| Target | MZ | Yes (default) |
| Help | Detailed instructions... | No |
| Dependencies | PluginBase | No |
| Order After | AnotherPlugin | No |
| Order Before | LoadMeLater | No |

### Step 3: Add Parameters (Optional)
Click **Add Parameter** in the Parameters tab to add configuration options.

### Step 4: Add Commands (Optional)
Click **Add Command** in the Commands tab to add plugin commands. A code skeleton is automatically inserted into the Code tab so you can immediately write the implementation logic.

### Step 5: Write Custom Code
Switch to the **Code** tab to write your plugin's implementation logic. Code skeletons for commands and parameter usage comments are auto-generated when you add them. The Monaco editor provides MZ-specific autocomplete — type a class name like `Game_Actor` to see available methods.

### Step 6: Insert Code Templates (Optional)
In the Code tab, click the template icon to add boilerplate code for common patterns.

### Step 7: Export
Click the export button or use **Ctrl+E** to save your plugin.

---

## Working with Parameters

Parameters are configuration options that users can set in the Plugin Manager.

### Adding a Parameter

1. Go to the **Parameters** tab
2. Click **Add Parameter**
3. Fill in the parameter details

### Parameter Properties

| Property | Description |
|----------|-------------|
| **Name** | Internal identifier (no spaces) |
| **Text** | Display label in Plugin Manager |
| **Description** | Help text shown to users |
| **Type** | Data type (see below) |
| **Default** | Default value |

### Parameter Types

#### Basic Types

**String**
```
Name: playerName
Text: Player Name
Type: string
Default: Hero
```

**Number**
```
Name: maxHealth
Text: Maximum Health
Type: number
Default: 100
Min: 1
Max: 9999
Decimals: 0
```

**Boolean**
```
Name: enableFeature
Text: Enable Feature
Type: boolean
Default: true
On Label: Enabled
Off Label: Disabled
```

**Select (Dropdown)**
```
Name: difficulty
Text: Difficulty
Type: select
Options:
  - Easy (value: easy)
  - Normal (value: normal)
  - Hard (value: hard)
Default: normal
```

**Combo (Editable Dropdown)**

A dropdown with predefined options that also allows free-text input. Useful for providing suggestions while still allowing custom values.

```
Name: fontFamily
Text: Font Family
Type: combo
Options:
  - GameFont
  - Arial
  - Times New Roman
Default: GameFont
```

Options are entered one per line. Use `value|Display Text` format for separate internal values and display labels.

**Note (Multiline Text)**
```
Name: customScript
Text: Custom Script
Type: note
Default: // Your code here
```

#### Game Data Types

These types create dropdowns populated with your game's data:

| Type | Shows |
|------|-------|
| variable | Game variables |
| switch | Game switches |
| actor | Actors |
| class | Classes |
| skill | Skills |
| item | Items |
| weapon | Weapons |
| armor | Armors |
| enemy | Enemies |
| troop | Troops |
| state | States |
| animation | Animations |
| tileset | Tilesets |
| common_event | Common events |
| map | Maps |
| icon | Icon index (MZ shows icon sheet browser) |

**Example: Variable Selection**
```
Name: targetVariable
Text: Target Variable
Type: variable
Default: 1
```

**Example: Map Selection**
```
Name: targetMap
Text: Target Map
Type: map
Default: 1
```

#### Advanced Types

**File**
```
Name: backgroundImage
Text: Background Image
Type: file
Directory: img/pictures
```

The **Require** checkbox (available for `file` and `animation` types) tells the RPG Maker MZ deployment packager to include the referenced file when exporting. Check this if the file is essential for the plugin to function.

**Struct (Complex Object)**
```
Name: characterData
Text: Character Data
Type: struct
Struct Type: CharacterInfo
```

**Array**
```
Name: itemList
Text: Item List
Type: array
Element Type: number
```

Arrays support all parameter types as their element type, including struct, combo, icon, and map.

**Hidden**

A parameter that exists in the plugin code but is invisible in the RPG Maker MZ Plugin Manager. Useful for internal version tracking or configuration that shouldn't be user-editable.

```
Name: _dataVersion
Text: Data Version
Type: hidden
Default: 1
```

### Nested Parameters

Use the **Parent** field to create collapsible parameter groups:

```
Parameter 1:
  Name: displaySettings
  Text: Display Settings
  Type: boolean

Parameter 2:
  Name: windowWidth
  Text: Window Width
  Type: number
  Parent: displaySettings

Parameter 3:
  Name: windowHeight
  Text: Window Height
  Type: number
  Parent: displaySettings
```

This creates a "Display Settings" toggle that shows/hides the width and height options.

### Reordering Parameters

Drag parameters by their handle (grip icon) to reorder them.

---

## Bulk Parameter Operations

When working with plugins that have many parameters, bulk operations save time.

### Multi-Select

Click the **checkbox** next to any parameter to select it. A toolbar appears with bulk actions:

| Action | Description |
|--------|-------------|
| **Select All** | Select all parameters |
| **Duplicate** | Copy selected parameters (adds `_copy` suffix) |
| **Delete** | Delete all selected parameters |
| **Export** | Save selected parameters to a `.mzparams` file |

### Import Parameters

Click the **Import** dropdown to import parameters from:

| Source | Description |
|--------|-------------|
| **From File** | Load a `.mzparams` file previously exported |
| **From Plugin** | Browse project plugins and pick individual parameters to import |

The Import from Plugin option opens a picker dialog showing all plugins in your loaded MZ project. Select a plugin, check the parameters you want, and click Import.

### Parameter Presets

Save parameter sets as reusable presets:

1. Select one or more parameters using the checkboxes
2. Click **Presets > Save Selection as Preset...**
3. Enter a name for the preset
4. To apply a preset later, click **Presets > [preset name]**

Presets are managed in **Settings > Data > Parameter Presets**.

### .mzparams File Format

Exported parameter files use a simple JSON format with a version field for forward compatibility. They can be shared between projects or with other users.

---

## Creating Plugin Commands

Plugin commands let event makers call your plugin's features.

### Adding a Command

1. Go to the **Commands** tab
2. Click **Add Command**
3. Set the command name (internal identifier)
4. Set the display text (shown in the event editor)
5. Add arguments as needed

### Command Properties

| Property | Description |
|----------|-------------|
| **Name** | Internal identifier |
| **Text** | Display name in event editor |
| **Description** | Help text |

### Command Arguments

Arguments are inputs to your command. They support all the same types as parameters.

**Example: Spawn Enemy Command**
```
Command Name: spawnEnemy
Display Text: Spawn Enemy
Description: Spawns an enemy on the current map

Arguments:
1. enemyId (type: enemy) - Which enemy to spawn
2. x (type: number) - X coordinate
3. y (type: number) - Y coordinate
```

### Auto-Generated Code Skeletons

When you add a command, a code skeleton is automatically inserted into the **Code** tab:

```javascript
// --- spawnEnemy ---
PluginManager.registerCommand(PLUGIN_NAME, 'spawnEnemy', function(args) {
    // TODO: Implement spawnEnemy logic
});
```

You can immediately fill in the implementation. The Generated Code preview (right panel) will **not** duplicate `registerCommand` blocks that already exist in your custom code.

When you rename a command, the skeleton in the Code tab is automatically updated to match the new name.

### Generated Code

The final generated output combines your custom code with auto-generated parameter parsing:

```javascript
PluginManager.registerCommand("YourPlugin", "spawnEnemy", function(args) {
    const enemyId = Number(args.enemyId);
    const x = Number(args.x);
    const y = Number(args.y);

    // Your implementation here
});
```

---

## Custom Code vs Generated Code

Understanding the two panels is important:

**Code Tab (left panel)** — Your editable custom code. This is where you write implementation logic, and where auto-generated skeletons appear when you add commands or parameters. This code is stored in the plugin and preserved across edits.

**Generated Code Preview (right panel)** — The final plugin output (read-only). This combines the auto-generated header block (metadata, parameters, commands) with your custom code inside an IIFE wrapper. The generator automatically:
- Parses parameters into variables
- Registers commands (skipping any already in your custom code)
- Wraps everything in an IIFE with `'use strict'`

---

## Using Structs

Structs define complex, reusable data structures.

### Creating a Struct

1. Go to the **Structs** tab
2. Click **Add Struct**
3. Name your struct (e.g., "CharacterInfo")
4. Add fields to the struct

### Struct Fields

Struct fields work like parameters but define the structure of your custom data type.

**Example: CharacterInfo Struct**
```
Struct Name: CharacterInfo

Fields:
1. name (string) - Character name
2. level (number) - Starting level
3. class (class) - Character class
4. portrait (file, dir: img/faces) - Face image
```

### Using Structs in Parameters

After defining a struct, use it in parameters:

```
Name: mainCharacter
Text: Main Character
Type: struct
Struct Type: CharacterInfo
```

Or in arrays:
```
Name: partyMembers
Text: Party Members
Type: array
Element Type: struct
Struct Type: CharacterInfo
```

---

## Code Templates

Templates provide ready-to-use code patterns for common plugin tasks.

### Accessing Templates

1. Go to the **Code** tab
2. Click the **template icon** (puzzle piece) in the toolbar
3. Browse categories, search by name, or check your **Favorites** and **Recently Used**
4. Select a template
5. Configure the template options
6. Preview the generated code
7. Click **Insert Code** (or press **Ctrl+Enter**)

### Favorites and Recently Used

- Click the **star icon** on any template to add it to your Favorites
- The **Recently Used** section shows templates you've inserted recently
- Both appear at the top of the sidebar for quick access

### Template Categories

#### Method Alias (1 template)
Safely extend existing MZ classes without replacing them.

- **Alias Method** - Extend any class method with before/after/wrap/replace options

**Dynamic Class Selection:** This template includes a searchable dropdown of 139 RPG Maker MZ classes (organized by category: Core, Managers, Game Objects, Scenes, Sprites, Windows) with 644 hookable methods. Select a class to see its available methods.

#### Custom Window (4 templates)
Create new windows for displaying information.

- **Custom Window** - Create a new window class and add it to a scene
- **HUD Overlay Window** - HUD window that displays on the map screen
- **Popup Notification** - Temporary popup window that auto-closes after a duration
- **Gauge Window** - Window with customizable gauge bars (HP/MP style)

#### Scene Hooks (1 template)
Hook into scene lifecycle events.

- **Scene Lifecycle Hook** - Execute code at scene create/start/update/terminate

#### Database Extension (1 template)
Add custom note tag parsing to database objects.

- **Notetag Parser** - Parse custom notetags from database entries

#### Plugin Commands (3 templates)
Create plugin commands callable from events.

- **Basic Command** - Simple command
- **Async Command with Wait** - Command that can pause event execution
- **Command with Validation** - Command with input validation

#### Save/Load (1 template)
Persist custom data in save files.

- **Custom Save Data** - Add custom data that persists in save files

#### Input Handler (1 template)
Handle keyboard and gamepad input.

- **Key Input Handler** - React to keyboard or gamepad input

#### Battle System (4 templates)
Modify battle mechanics.

- **Damage Modifier** - Modify damage calculation in battle
- **Battle Event Hook** - React to battle events (victory, defeat, escape)
- **State Change Hook** - React when states are added or removed
- **Action Execution Hook** - React before/after battle actions execute

#### Sprite System (3 templates)
Create and manipulate sprites.

- **Custom Sprite Class** - Define a new sprite type
- **Picture Manipulation** - Control show picture images
- **Sprite Animation** - Animated sprite with frame control

#### Map Events (4 templates)
Work with map events and movement.

- **Event Spawn** - Dynamically create events
- **Movement Route** - Custom movement patterns
- **Map Transfer Hook** - Execute code on map change
- **Parallel Process** - Run code every frame on maps

#### Menu System (4 templates)
Customize menus and UI.

- **Custom Menu Scene** - New menu screen
- **Title Screen Modification** - Customize title screen
- **Menu Command Addition** - Add items to main menu
- **Options Menu Addition** - Add items to options

#### Audio System (3 templates)
Control game audio.

- **BGM Control** - Play, stop, fade background music
- **Sound Effect Player** - Play sound effects
- **Audio Fade/Crossfade** - Smooth audio transitions

#### Message System (3 templates)
Extend the message system.

- **Custom Text Code** - Add new \X[n] escape codes
- **Message Window Modification** - Customize message appearance
- **Choice Handler** - Custom choice processing

#### Actor/Party (3 templates)
Extend actor and party functionality.

- **Custom Actor Property** - Add new actor stats/properties
- **Party Management** - Party manipulation functions
- **Equipment Hook** - Hook equipment changes

---

## Multi-Language Support

MZ Plugin Studio supports creating localized plugins for Japanese and Chinese.

### Adding Translations

1. In the **Meta** tab, find the language tabs (EN / JA / ZH)
2. Click a language tab to edit that localization
3. Fill in the translated description and help text

### What Gets Localized

- Plugin description (`@plugindesc`)
- Help text (`@help`)

Parameter names and descriptions are typically kept in English for technical consistency.

### Generated Output

```javascript
/*:
 * @plugindesc English description
 * @help English help text
 */

/*:ja
 * @plugindesc 日本語の説明
 * @help 日本語のヘルプ
 */

/*:zh
 * @plugindesc 中文描述
 * @help 中文帮助
 */
```

---

## Plugin Dependencies

MZ Plugin Studio tracks dependencies between plugins in your project.

### Declaring Dependencies

In the **Meta** tab, you can declare:

| Field | Annotation | Meaning |
|-------|-----------|---------|
| **Dependencies** | `@base` | Hard dependency — plugin will not work without this. Shows as an error if missing. |
| **Order After** | `@orderAfter` | Soft hint — plugin should load after this. Shows as a warning if missing. |
| **Order Before** | `@orderBefore` | Soft hint — plugin should load before this. Shows as a warning if missing. |

### Dependency Analysis

When you load an MZ project, the studio scans all plugin files in `js/plugins/` and validates:

- **Missing dependencies** — A `@base` plugin not found in the project (error)
- **Missing order hints** — An `@orderAfter` or `@orderBefore` target not found (warning)
- **Circular dependencies** — A depends on B, B depends on A (error)
- **Load order violations** — Plugin loads before its dependency (warning)
- **Duplicate plugin names** — Same plugin name in multiple files (warning)

### Health Badge

A colored badge appears in the status bar:

| Color | Meaning |
|-------|---------|
| Green | All dependencies satisfied, correct load order |
| Yellow | Warnings only (missing soft hints, load order issues) |
| Red | Errors (missing hard dependencies, circular deps) |

Click the badge to see the full issues list.

### Sidebar Indicators

Project plugins in the sidebar show:
- **Load order number** — Position in the plugin list
- **Warning dot** — Hover to see dependency issues

### Available Plugins Hint

Below the Dependencies and Order After fields in MetaEditor, toggle the "Available plugins" hint to see all plugin names found in your project. This helps you type the correct plugin name.

---

## Plugin Conflict Detection

The conflict detector scans all plugins in your project for **prototype method overrides** and flags when two or more plugins override the same method — a common source of hard-to-debug compatibility issues.

### Accessing the Analysis View

1. Load an RPG Maker MZ project
2. Click the **Analysis** tab at the top of the editor area (next to **Editor**)
3. The Analysis view shows three sections: Overview, Conflicts, and Dependencies

### Overview Card

Shows quick stats at a glance:

| Stat | Description |
|------|-------------|
| **Plugins** | Total plugins scanned in the project |
| **Overrides** | Total prototype method overrides across all plugins |
| **Conflicts** | Number of methods overridden by 2+ plugins |
| **Dependency Issues** | Errors and warnings from dependency analysis |

### Conflicts Card

Each conflict shows:
- **Method name** — e.g., `Game_Map.prototype.update`
- **Severity badge** — `warning` (popular class, popularity >= 10) or `info` (unpopular/unknown class)
- **Plugin chain** — Which plugins override this method, in load order

Conflicts are sorted with warnings first, then alphabetically within the same severity.

### What Gets Detected

The detector looks for two patterns in plugin code (ignoring comments and strings):

1. **Direct assignment:** `ClassName.prototype.method = function() { ... }`
2. **Alias capture:** `const _old = ClassName.prototype.method;`

### Severity Levels

Severity is based on the class's popularity across the MZ plugin ecosystem:

| Severity | Meaning |
|----------|---------|
| **Warning** | A frequently-overridden class (e.g., `Game_Map`, `Scene_Battle`) — conflicts here are more likely to cause issues |
| **Info** | A rarely-overridden or custom class — conflicts may be intentional |

### Rescanning

Click the **Rescan** button to re-analyze after making changes. Scanning also runs automatically when you load or switch projects.

### Limitations

- Only detects prototype assignment patterns (not `Object.defineProperty`)
- Alias pattern requires a semicolon or comma at the end of the line
- Does not analyze whether conflicting overrides are actually incompatible (some conflicts are safe if both plugins call the original method)

---

## Note Parameters (Deployment)

Note parameters (`@noteParam` groups) tell RPG Maker MZ's deployment packager which database note fields reference files that should be included in the exported game.

### Adding Note Parameters

In the **Meta** tab, scroll to the **Note Parameters** section and click **Add Note Parameter**. Each entry has:

| Field | Annotation | Description |
|-------|-----------|-------------|
| **Name** | `@noteParam` | The note tag name (e.g., `Portrait`) |
| **Type** | `@noteType` | Usually `file` |
| **Directory** | `@noteDir` | Asset directory (e.g., `img/pictures/`) |
| **Data** | `@noteData` | Database target (e.g., `actors`, `enemies`) |
| **Require** | `@noteRequire` | Check to include referenced files in deployment |

### Example

If your plugin adds a `<Portrait:filename>` note tag to actors that references images in `img/pictures/`:

```
Name: Portrait
Type: file
Directory: img/pictures/
Data: actors
Require: checked
```

This generates:
```javascript
 * @noteParam Portrait
 * @noteType file
 * @noteDir img/pictures/
 * @noteData actors
 * @noteRequire 1
```

---

## Auto-Documentation

The auto-doc feature generates help text from your plugin's metadata.

### Generating Help Text

1. In the **Meta** tab, click the **sparkles button** next to the Help field
2. A complete help text is generated from your plugin's parameters, commands, and structs
3. Review and edit the generated text as needed

The generated help includes:
- Plugin description
- Parameter list with types and defaults
- Command reference with argument details
- Struct field documentation

---

## Project Integration

Loading your RPG Maker MZ project enables powerful features.

### Loading a Project

1. Click the **folder icon** in the toolbar
2. Navigate to your RPG Maker MZ project folder
3. Select the folder (the one containing `Game.rpgproject`)

### Benefits of Loading a Project

**Populated Dropdowns**
- Variable parameters show your game's variables with names
- Switch parameters show your game's switches with names
- Actor, item, skill, etc. parameters show actual game data

**Direct Export**
- Export directly to your project's `js/plugins/` folder
- Plugins are immediately ready to use

### What Gets Loaded

| Data | Source File |
|------|-------------|
| Actors | data/Actors.json |
| Classes | data/Classes.json |
| Skills | data/Skills.json |
| Items | data/Items.json |
| Weapons | data/Weapons.json |
| Armors | data/Armors.json |
| Enemies | data/Enemies.json |
| Troops | data/Troops.json |
| States | data/States.json |
| Animations | data/Animations.json |
| Tilesets | data/Tilesets.json |
| Common Events | data/CommonEvents.json |
| Switches | data/System.json |
| Variables | data/System.json |

---

## Importing Existing Plugins

You can import existing .js plugins to edit them.

### Importing a Plugin

1. Click **File > Open** or use **Ctrl+O**
2. Select a .js plugin file
3. The plugin metadata, parameters, and commands are parsed and loaded

### What Gets Imported

- Plugin metadata (name, version, author, description, help)
- Parameters with all attributes
- Plugin commands with arguments
- Struct definitions
- Multi-language blocks
- Custom code (extracted from the plugin body using heuristics)
- Raw source (the complete original file, for raw mode)

### Limitations

- Heavily customized plugin formats may not parse correctly
- Custom code extraction uses heuristics and may not always find the exact boundary

### Tips for Importing

- Make a backup of your original plugin
- After importing, review all parameters for accuracy
- Use **Raw Mode** to preserve the original code body exactly (see below)

---

## Raw Mode

When you import an existing plugin, MZ Plugin Studio stores the complete original source. Raw mode lets you edit structured metadata while preserving the original code body.

### Auto-Enable

Raw mode is **automatically enabled** when you import an existing plugin. This ensures imported plugins maintain maximum fidelity by default.

### When to Use Raw Mode

- Editing metadata of complex third-party plugins
- Updating parameter descriptions or defaults without touching code
- Ensuring maximum round-trip fidelity for imported plugins

### How It Works

1. Import a plugin (raw mode is auto-enabled, the **Raw** button is active)
2. The output regenerates header blocks (main header, localized headers, struct definitions)
3. The code body remains exactly as the original author wrote it
4. **New parameters** added in the UI are automatically injected into the code body after the parameter loading section
5. **New commands** added in the UI get `registerCommand` calls injected before the closing IIFE
6. **New struct definitions** are added as new `/*~struct~` blocks

### Header Preamble Preservation

If the original plugin has text before the `/*:` annotation block (license headers, version history, social links), raw mode preserves this preamble verbatim.

### Normal Mode vs Raw Mode

| Aspect | Normal Mode | Raw Mode |
|--------|-------------|----------|
| Headers | Regenerated | Regenerated |
| Code body | Generated from template + custom code | Preserved from original + new params/commands injected |
| Preamble | Not applicable | Preserved verbatim |
| Best for | New plugins, plugins you own | Third-party plugins, metadata edits |

---

## Exporting Plugins

### Export Options

**Export as .js Plugin**
1. Click the **Export** button or **Ctrl+S**
2. If a project is loaded, saves to `js/plugins/YourPlugin.js`
3. If no project, opens a save dialog

**Export in Other Formats**
Click the **chevron dropdown** next to the Export button:

| Format | Description |
|--------|-------------|
| **README.md** | Markdown documentation with installation instructions, parameter table, and command reference |
| **.d.ts** | TypeScript declaration file with parameter and command argument interfaces |
| **plugins.json entry** | JSON entry for RPG Maker's plugins.js configuration file |

### Validation

Before exporting, the studio validates your plugin:

**Errors** (must fix)
- Missing or invalid plugin name
- Duplicate parameter or command names
- Parameters referencing nonexistent parent

**Warnings** (review recommended)
- Unused struct definitions (defined but not referenced)
- Commands with no implementation in custom code
- Parameter names that aren't valid JS identifiers

---

## Diff View

The diff view shows a side-by-side comparison of the on-disk file vs your current generated output.

### Using Diff View

1. Click the **Diff** button in the Generated Code preview toolbar
2. Left panel shows the saved version (on-disk file or original import)
3. Right panel shows the current generated output
4. Click **Diff** again to return to normal view

The Diff button is disabled for new plugins that haven't been saved or imported yet.

---

## Settings

Click the **gear icon** in the bottom of the sidebar to open the Settings dialog.

### Editor Tab

Configure the code editor and preview:

| Setting | Default | Description |
|---------|---------|-------------|
| Theme | Dark | Dark or Light mode (applies to entire app and Monaco editors) |
| Font Size | 13 | Code font size (10-24) |
| Word Wrap | On | Wrap long lines in the code preview |
| Minimap | Off | Show the minimap scroll overview |
| Line Numbers | On | Show line numbers |

Changes apply immediately to the Code tab editor, Generated Code preview, and Diff View.

### Defaults Tab

| Setting | Default | Description |
|---------|---------|-------------|
| Default Author | (empty) | Pre-fills the author field when creating new plugins |

### Data Tab

Manage persisted data stored in your browser:

| Action | Description |
|--------|-------------|
| Clear Recent Projects | Remove all entries from the recent projects list |
| Clear Template Favorites | Remove all favorited templates |
| Clear Recently Used Templates | Clear the recently used templates history |
| **Parameter Presets** | Manage saved parameter presets (delete individual or clear all) |

Each button shows the current count and confirms when cleared.

---

## Best Practices

### Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Plugin Name | PascalCase | MyAwesomePlugin |
| Parameters | camelCase | maxHealth |
| Commands | camelCase | spawnEnemy |
| Structs | PascalCase | CharacterInfo |

### Parameter Organization

1. Group related parameters using Parent
2. Put most important parameters first
3. Provide clear descriptions
4. Set sensible defaults

### Help Text

Write clear help text that includes:
- What the plugin does
- How to use each parameter
- Example use cases
- Known limitations
- Contact/support information

### Version Numbering

Use semantic versioning: `MAJOR.MINOR.PATCH`
- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes

Example: `1.2.3`

### Testing

1. Export your plugin
2. Enable it in RPG Maker MZ Plugin Manager
3. Test all parameters in different configurations
4. Test all commands in events
5. Test save/load if you store custom data

---

## Troubleshooting

### Plugin Not Appearing in RPG Maker MZ

**Causes:**
- File not in `js/plugins/` folder
- Syntax error in generated code
- Missing target declaration

**Solutions:**
1. Verify the file is in the correct location
2. Check for errors in the Code tab
3. Ensure `@target MZ` is present

### Parameters Not Showing Up

**Causes:**
- Parameter name conflicts
- Invalid type specification
- Parent parameter doesn't exist

**Solutions:**
1. Ensure unique parameter names
2. Verify type is spelled correctly
3. Check parent references exist

### Commands Not Working

**Causes:**
- Command not registered
- Argument types mismatch
- Missing implementation code

**Solutions:**
1. Check command appears in generated header
2. Verify argument types match expectations
3. Add implementation code in the body

### Import Fails

**Causes:**
- Non-standard plugin format
- Corrupted file
- Unsupported features

**Solutions:**
1. Try importing a simpler plugin first
2. Check the plugin opens in a text editor
3. Create new plugin and manually copy settings

### "Something went wrong" Error Screen

If the app shows a red error screen with a stack trace, this is the built-in error recovery:

**Solutions:**
1. Click **Try Again** to reset and continue
2. If the error persists, note the error message and file a GitHub issue

### Build Errors

**Causes:**
- Missing dependencies
- Node version mismatch
- Corrupted node_modules

**Solutions:**
1. Run `npm install` again
2. Ensure Node.js 18 or later
3. Delete `node_modules` and reinstall

---

## Keyboard Shortcuts

Press **F1** at any time to open the Keyboard Shortcuts panel.

### File

| Action | Shortcut |
|--------|----------|
| Save / Export plugin | Ctrl+S |
| New plugin | Ctrl+N |
| Open project | Ctrl+O |

### Edit

| Action | Shortcut |
|--------|----------|
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z |

### View

| Action | Shortcut |
|--------|----------|
| Regenerate preview | F5 |
| Open settings | Ctrl+, |
| Show keyboard shortcuts | F1 |

### Navigation

| Action | Shortcut |
|--------|----------|
| Switch to Meta tab | Ctrl+1 |
| Switch to Parameters tab | Ctrl+2 |
| Switch to Commands tab | Ctrl+3 |
| Switch to Structs tab | Ctrl+4 |
| Switch to Code tab | Ctrl+5 |

**Note:** Ctrl+S, Ctrl+N, Ctrl+O, and F1 work even when the Monaco code editor is focused. Other shortcuts (like Ctrl+Z, Ctrl+1-5) are handled by Monaco when the editor is focused.

---

## Auto-Update

MZ Plugin Studio checks for updates automatically on startup (production builds only).

### How It Works

1. On launch, the app checks GitHub Releases for newer versions
2. If an update is available, a notification appears in the status bar
3. Click **Download** to download the update in the background
4. Once downloaded, click **Restart** to install and relaunch

Updates are never forced - you can dismiss the notification and continue working.

---

## Getting Help

- **GitHub Issues** - Report bugs and request features
- **Documentation** - README.md
- **RPG Maker Forums** - Community support for MZ plugin development

---

*MZ Plugin Studio - Making plugin development accessible to everyone*
