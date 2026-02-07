# MZ Plugin Studio User Guide

A comprehensive guide to creating RPG Maker MZ plugins with MZ Plugin Studio.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Interface Overview](#interface-overview)
3. [Creating Your First Plugin](#creating-your-first-plugin)
4. [Working with Parameters](#working-with-parameters)
5. [Creating Plugin Commands](#creating-plugin-commands)
6. [Using Structs](#using-structs)
7. [Code Templates](#code-templates)
8. [Multi-Language Support](#multi-language-support)
9. [Project Integration](#project-integration)
10. [Importing Existing Plugins](#importing-existing-plugins)
11. [Exporting Plugins](#exporting-plugins)
12. [Settings](#settings)
13. [Best Practices](#best-practices)
14. [Troubleshooting](#troubleshooting)

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
| **Meta** | Plugin name, version, author, description |
| **Parameters** | Configuration options users can set |
| **Commands** | Plugin commands callable from events |
| **Structs** | Complex nested data structures |
| **Code** | Generated JavaScript preview |

### Code Editor (Right Panel)
- Real-time JavaScript preview
- Template insertion button (puzzle piece icon)
- Syntax highlighting
- Validation messages

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

### Step 3: Add Parameters (Optional)
Click **Add Parameter** in the Parameters tab to add configuration options.

### Step 4: Add Commands (Optional)
Click **Add Command** in the Commands tab to add plugin commands.

### Step 5: Insert Code Templates
In the Code tab, click the template icon to add boilerplate code.

### Step 6: Export
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

**Example: Variable Selection**
```
Name: targetVariable
Text: Target Variable
Type: variable
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

### Generated Code

The command generates:
```javascript
PluginManager.registerCommand("YourPlugin", "spawnEnemy", function(args) {
    const enemyId = Number(args.enemyId);
    const x = Number(args.x);
    const y = Number(args.y);

    // Your implementation here
});
```

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
3. Browse categories or search
4. Select a template
5. Configure the template options
6. Click **Insert**

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

### Limitations

- Only the header comment block is parsed
- Custom code in the plugin body is not imported
- Heavily customized plugin formats may not parse correctly

### Tips for Importing

- Make a backup of your original plugin
- After importing, review all parameters for accuracy
- Re-add any custom code using templates

---

## Exporting Plugins

### Export Options

**Export to File**
1. Click the export button or **Ctrl+E**
2. Choose a save location
3. Enter a filename (or use the plugin name)

**Export to Project**
1. Load your RPG Maker MZ project first
2. Click **Export to Project**
3. Plugin saves to `js/plugins/YourPlugin.js`

### Validation

Before exporting, the studio validates your plugin:

**Errors** (must fix)
- Missing plugin name
- Duplicate parameter names
- Invalid type configurations

**Warnings** (review recommended)
- Missing descriptions
- Unusual configurations

---

## Settings

Click the **gear icon** in the bottom of the sidebar to open the Settings dialog.

### Editor Tab

Configure the code preview panel:

| Setting | Default | Description |
|---------|---------|-------------|
| Font Size | 13 | Code font size (10-24) |
| Word Wrap | On | Wrap long lines in the code preview |
| Minimap | Off | Show the minimap scroll overview |
| Line Numbers | On | Show line numbers |

Changes apply immediately to the Generated Code preview panel.

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

| Action | Shortcut |
|--------|----------|
| New Plugin | Ctrl+N |
| Open Plugin | Ctrl+O |
| Save Plugin | Ctrl+S |
| Export Plugin | Ctrl+E |
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z |

---

## Getting Help

- **GitHub Issues** - Report bugs and request features
- **Documentation** - README.md
- **RPG Maker Forums** - Community support for MZ plugin development

---

*MZ Plugin Studio - Making plugin development accessible to everyone*
