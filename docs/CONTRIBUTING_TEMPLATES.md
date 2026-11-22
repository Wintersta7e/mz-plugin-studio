# Contributing Code Templates

This guide explains how to add new code templates to MZ Plugin Studio's template system. Templates generate RPG Maker MZ boilerplate code that users can insert into their plugins through the Template Inserter dialog.

## Overview

The template system groups its templates into categories. Each template presents a form-based UI where users configure options, then generates valid RPG Maker MZ JavaScript code based on those inputs.

Templates live in:

```
src/renderer/src/lib/generator/templates/
```

Key files:

| File                    | Purpose                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `types.ts`              | TypeScript interfaces (`CodeTemplate`, `TemplateField`, `CategoryInfo`, etc.)                   |
| `index.ts`              | Template registry (`createTemplateRegistry`, `getAllTemplates`, `getTemplatesByCategory`, etc.) |
| `method-alias.ts`       | Method Aliasing templates                                                                       |
| `custom-window.ts`      | Custom Windows templates                                                                        |
| `scene-hooks.ts`        | Scene Hooks templates                                                                           |
| `database-extension.ts` | Notetag templates                                                                               |
| `plugin-commands.ts`    | Plugin Command templates                                                                        |
| `save-load.ts`          | Save/Load templates                                                                             |
| `input-handler.ts`      | Input Handler templates                                                                         |
| `battle-system.ts`      | Battle System templates                                                                         |
| `sprite-system.ts`      | Sprite System templates                                                                         |
| `map-events.ts`         | Map & Events templates                                                                          |
| `menu-system.ts`        | Menu System templates                                                                           |
| `audio-system.ts`       | Audio System templates                                                                          |
| `message-system.ts`     | Message System templates                                                                        |
| `actor-party.ts`        | Actor & Party templates                                                                         |

The UI component that renders templates is `TemplateInserter.tsx` in `src/renderer/src/components/plugin/`.

---

## Template Architecture

Templates are static lists. Each category file:

1. Defines one or more `CodeTemplate` objects
2. Exports them as one list, `export const <category>Templates: readonly CodeTemplate[]`, in the order the dialog lists them
3. Imports nothing from the registry (`./index`)

The registry (`index.ts`) imports every category's list and builds the id map once through `createTemplateRegistry()`, which throws when two templates share an id. Everything else reads templates through the registry: importing a category file from anywhere else fails `npm run deps` (rule `templates-through-registry`).

When the user opens the Template Inserter dialog, it queries the registry via `getTemplatesByCategory()` and `getAllTemplates()` to populate the UI.

---

## Adding a New Template (Step-by-Step)

### Step 1: Choose or Create a Category File

If your template fits an existing category, add it to the corresponding file. For example, a new window variant goes in `custom-window.ts`.

If you need a new category, see the "Adding a New Category" section below first.

### Step 2: Define the Template Object

Every template is defined through `defineTemplate`, which reads the type of each value from the template's own fields and returns a `CodeTemplate`:

```typescript
interface CodeTemplate {
  id: string                // Unique kebab-case identifier (e.g., 'save-load-basic')
  category: TemplateCategory // Must match an existing category (e.g., 'save-load')
  name: string              // Display name shown in the template list
  description: string       // Brief explanation shown below the name
  icon: string              // Lucide icon name (e.g., 'Save', 'GitBranch')
  fields: readonly TemplateField[]   // User-configurable input fields
  generate: (values: Record<string, unknown>) => string  // Code generator function
  validate?: (values: Record<string, unknown>) => ValidationResult  // Optional validation
}
```

Inside `defineTemplate`, `generate` and `validate` get typed values: a `text`, `select`, `class-select`, `method-select` or `key-select` field holds a `string`, a `number` field a `number`, a `boolean` field a `boolean`. A required field is always set; any other field may also be `null` or `undefined`. Given a value of another type, or a required field left unset, the template's `generate` throws `TypeError` naming the field and its `validate` returns that error, so the code never reads a value as a type it is not.

Here is a minimal template definition:

```typescript
import { defineTemplate, type CodeTemplate } from './types'

const myTemplate = defineTemplate({
  id: 'my-category-my-feature',
  category: 'save-load',
  name: 'My Feature',
  description: 'Does something useful for RPG Maker MZ plugins',
  icon: 'Save',
  fields: [
    {
      id: 'propertyName',
      label: 'Property Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., myData',
      help: 'Name for the custom property'
    }
  ],
  generate: (values): string => {
    const propertyName = values.propertyName // string: the field is required text
    return `// Generated code for ${propertyName}\n// Add your implementation here`
  },
  validate: (values) => {
    const errors: string[] = []
    if (values.propertyName.trim() === '') {
      errors.push('Property Name is required')
    }
    return { valid: errors.length === 0, errors }
  }
})

export const myCategoryTemplates: readonly CodeTemplate[] = [myTemplate]
```

### Step 3: Add the Template to Its Category's List

Add the template to the list the category file exports. The dialog lists templates in that order. The registry throws when the id is already taken.

If you are adding to an existing file, add your template to the list already at its bottom:

```typescript
// At the bottom of the file
export const myCategoryTemplates: readonly CodeTemplate[] = [existingTemplate, myTemplate]
```

### Step 4: Add the List to the Registry (New Files Only)

If you created a **new category file**, import its list in `index.ts` and add it to the `createTemplateRegistry()` call, at the place the dialog should list it:

```typescript
// In index.ts, alongside the other category imports:
import { myCategoryTemplates } from './my-new-category'
```

If you added your template to an existing file, no import changes are needed -- the file's list is already in the registry.

### Step 5: Add Golden Cases

Every template's output is pinned in `tests/golden/__golden__/templates/<template-id>.js`. A new template needs golden cases, or the golden inventory test fails. Write them with:

```bash
npm run test:golden -- --update=new
```

Review the written file, then commit it in a test-only commit (no `src/` change) after the template's commit.

---

## Adding a New Category

Adding a new category requires changes in three files, beside its category file's list in the registry (Step 4 above):

### 1. Add to `TemplateCategory` Union Type

In `types.ts`, add your category to the union type:

```typescript
export type TemplateCategory =
  | 'method-alias'
  | 'custom-window'
  // ... existing categories ...
  | 'my-new-category'   // <-- add here
```

### 2. Add `CategoryInfo` to the `CATEGORIES` Array

In `types.ts`, add an entry to the `CATEGORIES` array. The `order` field determines display position in the sidebar:

```typescript
export const CATEGORIES: CategoryInfo[] = [
  // ... existing entries ...
  {
    id: 'my-new-category',
    name: 'My Category',
    description: 'Brief description of what these templates do',
    icon: 'Code',        // Lucide icon name
    order: 15            // Position in sidebar (after the existing categories)
  }
]
```

### 3. Add Icon Mapping in `TemplateInserter.tsx`

The `ICON_MAP` object maps icon name strings to Lucide React components. Add your icon:

```typescript
import { Code } from 'lucide-react'  // Add the import

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  // ... existing icons ...
  Code,    // <-- add the mapping
}
```

---

## Field Types Reference

Template fields define the configuration form shown to the user. Each field has a `type` that determines how it renders.

### Available Field Types

| Type            | Renders As                | Key Properties                                                      |
| --------------- | ------------------------- | ------------------------------------------------------------------- |
| `text`          | Text input                | `placeholder`, `required`                                           |
| `number`        | Numeric input             | `min`, `max`, `placeholder`                                         |
| `boolean`       | Toggle switch             | (renders as a bordered row with label + switch)                     |
| `select`        | Dropdown menu             | `options[]` (array of `{ value, label }`)                           |
| `class-select`  | Grouped MZ class dropdown | Populated from `class-registry.ts`, grouped by category             |
| `method-select` | MZ method dropdown        | Populated from `class-registry.ts`, depends on selected `className` |
| `key-select`    | Keyboard key dropdown     | Grouped into Letter Keys, Modifier Keys, Navigation Keys            |

### The `TemplateField` Interface

```typescript
interface TemplateField {
  id: string           // Unique field identifier, used as key in values object
  label: string        // Display label shown above the input
  type: 'text' | 'select' | 'number' | 'boolean' | 'class-select' | 'method-select' | 'key-select'
  options?: SelectOption[]   // For 'select' type: dropdown options
  default?: string | number | boolean  // Default value (pre-populated)
  dependsOn?: {             // Conditional visibility
    field: string            // ID of the field to depend on
    value: unknown           // Show this field only when the dependency has this value
  }
  required?: boolean   // Show asterisk and enforce non-empty
  placeholder?: string // Placeholder text for text/number inputs
  help?: string        // Help text shown below the input
  group?: string       // Visual grouping label (not widely used yet)
}
```

### Conditional Fields with `dependsOn`

The `dependsOn` property controls when a field is visible. It takes an object with `field` (the ID of another field) and `value` (the value that must match).

**Show when a specific value is selected:**

```typescript
{
  id: 'callOriginal',
  label: 'Call original method',
  type: 'boolean',
  default: true,
  dependsOn: { field: 'timing', value: 'replace' }
  // Only visible when the 'timing' field equals 'replace'
}
```

**Show when any value is present** (use `undefined` for the value):

```typescript
{
  id: 'methodName',
  label: 'Method',
  type: 'method-select',
  required: true,
  dependsOn: { field: 'className', value: undefined }
  // Visible as soon as 'className' has any non-empty value
}
```

### Select Options

For `select` fields, provide an `options` array:

```typescript
{
  id: 'dataType',
  label: 'Data Type',
  type: 'select',
  options: [
    { value: 'object', label: 'Object {} - Key-value pairs' },
    { value: 'array', label: 'Array [] - Ordered list' },
    { value: 'number', label: 'Number - Numeric value' },
    { value: 'string', label: 'String - Text value' },
    { value: 'boolean', label: 'Boolean - True/false flag' }
  ],
  default: 'object'
}
```

Use descriptive labels that clarify what each option does. The `value` is what gets passed to your `generate` function; the `label` is what the user sees.

---

## Code Generation Best Practices

### Use Helper Functions

Extract common string transformations into local helper functions at the top of your template file:

```typescript
function toCamelCase(str: string): string {
  if (!str) return ''
  return str.charAt(0).toLowerCase() + str.slice(1)
}

function toPascalCase(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[a-z]/, (c) => c.toUpperCase())
}
```

These are defined per-file rather than shared, since each template file is self-contained.

### Always Generate Valid JavaScript

The generated code runs directly inside RPG Maker MZ's runtime environment (NW.js / Chromium). Make sure:

- All generated code is syntactically valid JavaScript (not TypeScript)
- Variable names are valid identifiers
- Strings are properly quoted and escaped
- Generated code handles edge cases like missing data (`if (!actor) return;`)

### Include Explanatory Comments

Generated code should be understandable to someone unfamiliar with MZ internals. Add comments explaining each section:

```typescript
lines.push('// Store reference to original method before overriding')
lines.push(`const ${aliasName} = ${className}.prototype.${methodName};`)
lines.push('')
lines.push('// Override method with custom behavior')
lines.push(`${className}.prototype.${methodName} = function(${paramsStr}) {`)
```

### Use the Alias Pattern for Extending MZ Classes

RPG Maker MZ plugins extend classes by aliasing the original method and calling it within the override. Always use this pattern rather than directly replacing methods:

```typescript
// Correct: alias pattern
lines.push(`const _Original = ClassName.prototype.methodName;`)
lines.push(`ClassName.prototype.methodName = function() {`)
lines.push(`    _Original.call(this);`)
lines.push(`    // Your additions here`)
lines.push(`};`)
```

### Use Unique Alias Variable Names

When generating alias variable names, include enough context to avoid collisions with other plugins:

```typescript
// Good: includes both class name and method name
const aliasName = `_${className}_${methodName}`

// Also good: includes a unique template/window name
const aliasName = `_Scene_Map_createAllWindows_${windowName}`
```

### Handle Missing or Default Field Values Gracefully

Always provide fallbacks when reading field values in the `generate` function:

```typescript
generate: (values): string => {
  const dataName = expectText(values.dataName)   // Text for string methods; another type throws TypeError
  const hasDataType = Boolean(values.dataType)
  const dataType = hasDataType ? values.dataType : 'object'  // Fallback to default
  const hasWidth = Boolean(values.width)
  const width = hasWidth ? Number(values.width) : 300     // Fallback for numbers
  const showFrame = values.showFrame !== 'false'    // Boolean from string select
}
```

### Build Output with an Array of Lines

All existing templates use a `lines[]` array pattern for building output. This keeps the code readable and makes it easy to conditionally include sections:

```typescript
const lines: string[] = []

lines.push('// Header')
lines.push(`const myVar = '${someValue}';`)

if (someCondition) {
  lines.push('// Conditional section')
  lines.push('// ...')
}

return lines.join('\n')
```

---

## Validation Guidelines

The `validate` function is optional but strongly recommended. It runs before code generation and prevents invalid output.

### Validate Required Fields

Check that all required fields have values:

```typescript
validate: (values) => {
  const errors: string[] = []

  const hasPropertyName = Boolean(values.propertyName)
  if (!hasPropertyName) {
    errors.push('Property Name is required')
  }

  return { valid: errors.length === 0, errors }
}
```

Note: The registry's `validateTemplateValues()` function already checks `required` fields automatically. Your custom `validate` function handles additional constraints beyond simple presence checks.

### Check for Valid JavaScript Identifiers

When a field becomes a variable or property name in generated code, validate it:

```typescript
const name = String(values.propertyName)
if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
  errors.push('Property Name must be a valid JavaScript identifier (letters, numbers, _, $)')
}
```

### Warn About Naming Conflicts

Check user-provided names against known MZ property names:

```typescript
const reservedWords = ['initialize', 'update', 'create', 'setup', 'clear', 'data', 'save', 'load']
if (reservedWords.includes(name.toLowerCase())) {
  errors.push(`"${name}" may conflict with existing methods. Consider a more specific name.`)
}
```

### Validate Numeric Ranges

For number fields that represent pixel dimensions, opacity, or frame counts:

```typescript
if (values.width !== undefined && Number(values.width) <= 0) {
  errors.push('Width must be a positive number')
}

const opacity = values.opacity
if (opacity !== undefined && (Number(opacity) < 0 || Number(opacity) > 255)) {
  errors.push('Opacity must be between 0 and 255')
}
```

### Validate Type-Specific Formats

When a field has contextual meaning depending on another field:

```typescript
const hasDefaultValue = Boolean(values.defaultValue)
const hasDataType = Boolean(values.dataType)
if (hasDefaultValue && hasDataType) {
  const defaultValue = expectText(values.defaultValue)
  const dataType = values.dataType

  switch (dataType) {
    case 'number':
      if (isNaN(Number(defaultValue))) {
        errors.push('Default value for number must be a valid number')
      }
      break
    case 'boolean':
      if (!['true', 'false'].includes(defaultValue.toLowerCase())) {
        errors.push('Default value for boolean must be true or false')
      }
      break
    case 'object':
      if (!defaultValue.trim().startsWith('{')) {
        errors.push('Default value for object should be JSON format starting with {')
      }
      break
  }
}
```

### Return Helpful Error Messages

Error messages are displayed directly to the user. Make them specific and actionable:

```typescript
// Good
errors.push('Window Name must start with a letter and contain only letters and numbers')

// Bad
errors.push('Invalid name')
```

---

## Full Annotated Example

Below is a complete, annotated template that adds a "Custom Game Variable" pattern. This template generates code to create a managed game variable with getter/setter methods and optional clamping.

```typescript
/**
 * Custom Game Variable Template
 *
 * Generates code for creating a managed game variable with
 * getter/setter methods, optional min/max clamping, and
 * change notification support.
 */

import { defineTemplate, type CodeTemplate } from './types'
import { expectText } from './values'

// --------------------------------------------------------------------------
// Helper functions
// --------------------------------------------------------------------------

/**
 * Convert a name to PascalCase for method naming.
 * "currentScore" -> "CurrentScore"
 */
function toPascalCase(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Generate the core variable management code.
 * Separated from the template definition for readability and testability.
 */
function generateManagedVariable(
  variableName: string,
  variableId: number,
  enableClamping: boolean,
  minValue: number,
  maxValue: number,
  enableNotify: boolean
): string {
  const pascalName = toPascalCase(variableName)
  const lines: string[] = []

  // ---- Header comment ----
  lines.push(`// Managed Game Variable: ${variableName}`)
  lines.push(`// Variable ID: ${variableId}`)
  if (enableClamping) {
    lines.push(`// Range: ${minValue} to ${maxValue}`)
  }
  lines.push('')

  // ---- Getter: read the variable value ----
  lines.push(`// Get the current value of ${variableName}`)
  lines.push(`Game_System.prototype.get${pascalName} = function() {`)
  lines.push(`    return $gameVariables.value(${variableId});`)
  lines.push('};')
  lines.push('')

  // ---- Setter: write the variable value ----
  lines.push(`// Set the value of ${variableName}`)
  lines.push(`Game_System.prototype.set${pascalName} = function(value) {`)

  if (enableClamping) {
    // Clamp the value between min and max before storing
    lines.push(`    // Clamp value to allowed range [${minValue}, ${maxValue}]`)
    lines.push(`    value = Math.max(${minValue}, Math.min(${maxValue}, value));`)
  }

  lines.push(`    $gameVariables.setValue(${variableId}, value);`)

  if (enableNotify) {
    // Call the notification method after the value changes
    lines.push(`    this.on${pascalName}Changed(value);`)
  }

  lines.push('};')
  lines.push('')

  // ---- Add/subtract convenience method ----
  lines.push(`// Add to the value of ${variableName} (use negative to subtract)`)
  lines.push(`Game_System.prototype.add${pascalName} = function(amount) {`)
  lines.push(`    const current = this.get${pascalName}();`)
  lines.push(`    this.set${pascalName}(current + amount);`)
  lines.push('};')

  // ---- Change notification (optional) ----
  if (enableNotify) {
    lines.push('')
    lines.push(`// Called whenever ${variableName} changes`)
    lines.push(`Game_System.prototype.on${pascalName}Changed = function(newValue) {`)
    lines.push(`    // React to value changes here`)
    lines.push(`    // Example: refresh a HUD window, trigger a common event, etc.`)
    lines.push('};')
  }

  return lines.join('\n')
}

// --------------------------------------------------------------------------
// Template definition
// --------------------------------------------------------------------------

const customGameVariableTemplate = defineTemplate({
  // Unique identifier in kebab-case.
  // Convention: '<category>-<specific-name>'
  id: 'save-load-managed-variable',

  // Must match one of the TemplateCategory union members in types.ts.
  category: 'save-load',

  // Display name shown in the template list sidebar.
  name: 'Managed Game Variable',

  // Description shown below the name. Keep it to one sentence.
  description: 'Create a game variable with getter/setter methods and optional clamping',

  // Lucide icon name. Must have a matching entry in ICON_MAP (TemplateInserter.tsx).
  // For existing categories, reuse the category icon.
  icon: 'Save',

  // Fields define the configuration form. Order here = display order in the UI.
  fields: [
    {
      id: 'variableName',       // Key used in values object passed to generate()
      label: 'Variable Name',   // Label shown in the form
      type: 'text',             // Renders as a text input
      required: true,           // Shows asterisk, enforced by registry validation
      placeholder: 'e.g., playerScore',
      help: 'Name for getter/setter methods (camelCase recommended)'
    },
    {
      id: 'variableId',
      label: 'Variable ID',
      type: 'number',
      required: true,
      default: 1,
      placeholder: '1-5000',
      help: 'RPG Maker variable ID to store the value in'
    },
    {
      id: 'enableClamping',
      label: 'Clamp to range',
      type: 'boolean',
      default: false,
      help: 'Restrict the variable to a minimum and maximum value'
    },
    {
      // This field only appears when enableClamping is true.
      id: 'minValue',
      label: 'Minimum Value',
      type: 'number',
      default: 0,
      help: 'Lowest allowed value',
      dependsOn: { field: 'enableClamping', value: true }
    },
    {
      id: 'maxValue',
      label: 'Maximum Value',
      type: 'number',
      default: 100,
      help: 'Highest allowed value',
      dependsOn: { field: 'enableClamping', value: true }
    },
    {
      id: 'enableNotify',
      label: 'Change notification',
      type: 'boolean',
      default: false,
      help: 'Generate a callback method that fires when the value changes'
    }
  ],

  // The generate function receives the current field values and returns
  // a string of JavaScript code. This is called every time a field changes
  // to update the live preview.
  generate: (values): string => {
    // Each value is `unknown`: read it in the form its use needs
    const variableName = expectText(values.variableName)
    const hasVariableId = Boolean(values.variableId)
    const variableId = hasVariableId ? Number(values.variableId) : 1
    const enableClamping = Boolean(values.enableClamping)
    const minValue = Number(values.minValue ?? 0)
    const maxValue = Number(values.maxValue ?? 100)
    const enableNotify = Boolean(values.enableNotify)

    return generateManagedVariable(
      variableName,
      variableId,
      enableClamping,
      minValue,
      maxValue,
      enableNotify
    )
  },

  // The validate function runs before generate(). Return errors to prevent
  // insertion of invalid code. The registry also checks required fields
  // automatically, but this handles semantic validation.
  validate: (values) => {
    const errors: string[] = []

    // -- Validate variable name --
    const variableName = values.variableName
    const hasVariableName = Boolean(variableName)
    if (!hasVariableName) {
      errors.push('Variable Name is required')
    } else {
      const name = String(variableName)

      // Must be a valid JavaScript identifier
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
        errors.push(
          'Variable Name must be a valid JavaScript identifier (letters, numbers, _, $)'
        )
      }

      // Warn about names that collide with existing Game_System methods
      const reserved = ['initialize', 'update', 'onLoad', 'save', 'isLoaded']
      if (reserved.includes(name)) {
        errors.push(`"${name}" conflicts with an existing Game_System method`)
      }
    }

    // -- Validate variable ID --
    if (values.variableId !== undefined) {
      const id = values.variableId
      if (!Number.isInteger(id) || Number(id) < 1) {
        errors.push('Variable ID must be a positive integer')
      }
    }

    // -- Validate clamping range --
    const enableClamping = Boolean(values.enableClamping)
    if (enableClamping) {
      const min = values.minValue
      const max = values.maxValue
      if (min !== undefined && max !== undefined && Number(min) >= Number(max)) {
        errors.push('Minimum Value must be less than Maximum Value')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
})

// The category's list: the registry (`index.ts`) reads it, and the dialog lists it in this order.
export const gameVariableTemplates: readonly CodeTemplate[] = [customGameVariableTemplate]
```

### What this Template Generates

With inputs `variableName: "playerScore"`, `variableId: 5`, clamping enabled (0--999), and notifications enabled, the output is:

```javascript
// Managed Game Variable: playerScore
// Variable ID: 5
// Range: 0 to 999

// Get the current value of playerScore
Game_System.prototype.getPlayerScore = function() {
    return $gameVariables.value(5);
};

// Set the value of playerScore
Game_System.prototype.setPlayerScore = function(value) {
    // Clamp value to allowed range [0, 999]
    value = Math.max(0, Math.min(999, value));
    $gameVariables.setValue(5, value);
    this.onPlayerScoreChanged(value);
};

// Add to the value of playerScore (use negative to subtract)
Game_System.prototype.addPlayerScore = function(amount) {
    const current = this.getPlayerScore();
    this.setPlayerScore(current + amount);
};

// Called whenever playerScore changes
Game_System.prototype.onPlayerScoreChanged = function(newValue) {
    // React to value changes here
    // Example: refresh a HUD window, trigger a common event, etc.
};
```

---

## Checklist for New Templates

Before submitting a new template, verify:

- [ ] **Unique ID**: The `id` is kebab-case and does not collide with existing template IDs
- [ ] **Valid category**: The `category` matches an entry in the `TemplateCategory` union type
- [ ] **Icon mapping**: The `icon` name has a corresponding entry in `ICON_MAP` (in `TemplateInserter.tsx`)
- [ ] **Listing**: The template is in its category file's exported list
- [ ] **Registry**: If this is a new file, its list is imported in `index.ts` and passed to `createTemplateRegistry()`
- [ ] **Generated code is valid**: The `generate` function produces syntactically correct JavaScript for all field combinations
- [ ] **Edge cases**: The `generate` function handles empty/missing optional field values with sensible defaults
- [ ] **Validation**: Required fields, identifier formats, and numeric ranges are all checked
- [ ] **Error messages**: Validation errors are specific and tell the user what to fix
- [ ] **Comments in output**: Generated code includes comments explaining what each section does
- [ ] **Alias pattern**: MZ class extensions use the alias pattern (store original, call with `.call(this)` or `.apply(this, arguments)`)
- [ ] **Unique alias names**: Alias variable names include enough context to avoid collisions
- [ ] **Export**: The template object is exported from the file
- [ ] **Golden cases**: `tests/golden/__golden__/templates/<id>.js` was written with `npm run test:golden -- --update=new` and committed without `src/` changes
