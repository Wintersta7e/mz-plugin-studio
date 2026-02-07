/**
 * Custom Window Template
 *
 * Generates code for creating custom window classes in RPG Maker MZ
 * and optionally integrating them into existing scenes.
 */

import { registerTemplate } from './index'
import type { CodeTemplate } from './types'

/**
 * Converts a window name to a valid identifier
 * Strips spaces and ensures PascalCase
 */
function sanitizeWindowName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[a-z]/, (c) => c.toUpperCase())
}

/**
 * Converts a name to camelCase for method and variable names
 */
function toCamelCase(name: string): string {
  const sanitized = sanitizeWindowName(name)
  return sanitized.charAt(0).toLowerCase() + sanitized.slice(1)
}

/**
 * Generates the window class definition code
 */
function generateWindowClass(windowName: string, parentClass: string): string {
  const fullClassName = `Window_${windowName}`
  const lines: string[] = []

  // Header comment
  lines.push('//-----------------------------------------------------------------------------')
  lines.push(`// ${fullClassName}`)
  lines.push('//-----------------------------------------------------------------------------')
  lines.push('')

  // Constructor function
  lines.push(`function ${fullClassName}() {`)
  lines.push('    this.initialize(...arguments);')
  lines.push('}')
  lines.push('')

  // Prototype chain setup
  lines.push(`${fullClassName}.prototype = Object.create(${parentClass}.prototype);`)
  lines.push(`${fullClassName}.prototype.constructor = ${fullClassName};`)
  lines.push('')

  // Initialize method
  lines.push(`${fullClassName}.prototype.initialize = function(rect) {`)
  lines.push(`    ${parentClass}.prototype.initialize.call(this, rect);`)

  // Add parent-specific initialization
  if (parentClass === 'Window_Selectable') {
    lines.push('    this._data = [];')
    lines.push('    this.refresh();')
    lines.push('    this.select(0);')
  } else if (parentClass === 'Window_Command') {
    lines.push('    // Commands are created in makeCommandList')
  } else {
    lines.push('    this.refresh();')
  }

  lines.push('};')
  lines.push('')

  // Add parent-specific methods
  if (parentClass === 'Window_Base') {
    // Simple refresh for Window_Base
    lines.push(`${fullClassName}.prototype.refresh = function() {`)
    lines.push('    this.contents.clear();')
    lines.push('    // Draw your content here')
    lines.push("    this.drawText('Content', 0, 0, this.contentsWidth());")
    lines.push('};')
  } else if (parentClass === 'Window_Selectable') {
    // Window_Selectable requires item-related methods
    lines.push(`${fullClassName}.prototype.maxItems = function() {`)
    lines.push('    return this._data ? this._data.length : 0;')
    lines.push('};')
    lines.push('')

    lines.push(`${fullClassName}.prototype.item = function() {`)
    lines.push('    return this.itemAt(this.index());')
    lines.push('};')
    lines.push('')

    lines.push(`${fullClassName}.prototype.itemAt = function(index) {`)
    lines.push('    return this._data && index >= 0 ? this._data[index] : null;')
    lines.push('};')
    lines.push('')

    lines.push(`${fullClassName}.prototype.makeItemList = function() {`)
    lines.push('    // Populate this._data with your items')
    lines.push("    this._data = ['Item 1', 'Item 2', 'Item 3'];")
    lines.push('};')
    lines.push('')

    lines.push(`${fullClassName}.prototype.refresh = function() {`)
    lines.push('    this.makeItemList();')
    lines.push(`    ${parentClass}.prototype.refresh.call(this);`)
    lines.push('};')
    lines.push('')

    lines.push(`${fullClassName}.prototype.drawItem = function(index) {`)
    lines.push('    const item = this.itemAt(index);')
    lines.push('    if (item) {')
    lines.push('        const rect = this.itemLineRect(index);')
    lines.push('        this.drawText(item, rect.x, rect.y, rect.width);')
    lines.push('    }')
    lines.push('};')
  } else if (parentClass === 'Window_Command') {
    // Window_Command needs makeCommandList
    lines.push(`${fullClassName}.prototype.makeCommandList = function() {`)
    lines.push("    this.addCommand('Command 1', 'command1');")
    lines.push("    this.addCommand('Command 2', 'command2');")
    lines.push("    this.addCommand('Command 3', 'command3');")
    lines.push('};')
  }

  return lines.join('\n')
}

/**
 * Generates the scene integration code
 */
function generateSceneIntegration(
  windowName: string,
  sceneName: string,
  width: number,
  height: number,
  parentClass: string
): string {
  const fullClassName = `Window_${windowName}`
  const camelName = toCamelCase(windowName)
  const createMethodName = `create${windowName}Window`
  const windowPropertyName = `_${camelName}Window`
  const lines: string[] = []

  lines.push('')
  lines.push(`// Add to ${sceneName}`)

  // Alias createAllWindows
  lines.push(`const _${sceneName}_createAllWindows = ${sceneName}.prototype.createAllWindows;`)
  lines.push(`${sceneName}.prototype.createAllWindows = function() {`)
  lines.push(`    _${sceneName}_createAllWindows.call(this);`)
  lines.push(`    this.${createMethodName}();`)
  lines.push('};')
  lines.push('')

  // Create window method
  lines.push(`${sceneName}.prototype.${createMethodName} = function() {`)
  lines.push(`    const rect = new Rectangle(0, 0, ${width}, ${height});`)
  lines.push(`    this.${windowPropertyName} = new ${fullClassName}(rect);`)

  // Add handler setup for command windows
  if (parentClass === 'Window_Command') {
    lines.push(`    this.${windowPropertyName}.setHandler('command1', this.onCommand1.bind(this));`)
    lines.push(`    this.${windowPropertyName}.setHandler('command2', this.onCommand2.bind(this));`)
    lines.push(`    this.${windowPropertyName}.setHandler('command3', this.onCommand3.bind(this));`)
  } else if (parentClass === 'Window_Selectable') {
    lines.push(`    this.${windowPropertyName}.setHandler('ok', this.on${windowName}Ok.bind(this));`)
    lines.push(
      `    this.${windowPropertyName}.setHandler('cancel', this.on${windowName}Cancel.bind(this));`
    )
  }

  lines.push(`    this.addWindow(this.${windowPropertyName});`)
  lines.push('};')

  // Add handler methods for interactive windows
  if (parentClass === 'Window_Command') {
    lines.push('')
    lines.push(`${sceneName}.prototype.onCommand1 = function() {`)
    lines.push('    // Handle command 1')
    lines.push(`    this.${windowPropertyName}.activate();`)
    lines.push('};')
    lines.push('')
    lines.push(`${sceneName}.prototype.onCommand2 = function() {`)
    lines.push('    // Handle command 2')
    lines.push(`    this.${windowPropertyName}.activate();`)
    lines.push('};')
    lines.push('')
    lines.push(`${sceneName}.prototype.onCommand3 = function() {`)
    lines.push('    // Handle command 3')
    lines.push(`    this.${windowPropertyName}.activate();`)
    lines.push('};')
  } else if (parentClass === 'Window_Selectable') {
    lines.push('')
    lines.push(`${sceneName}.prototype.on${windowName}Ok = function() {`)
    lines.push(`    const item = this.${windowPropertyName}.item();`)
    lines.push('    // Handle selection')
    lines.push('    console.log("Selected:", item);')
    lines.push(`    this.${windowPropertyName}.activate();`)
    lines.push('};')
    lines.push('')
    lines.push(`${sceneName}.prototype.on${windowName}Cancel = function() {`)
    lines.push('    // Handle cancel')
    lines.push(`    this.${windowPropertyName}.deactivate();`)
    lines.push('};')
  }

  return lines.join('\n')
}

const customWindowTemplate: CodeTemplate = {
  id: 'custom-window-basic',
  category: 'custom-window',
  name: 'Custom Window',
  description: 'Create a new window class and add it to a scene',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Window_Base.html',
  icon: 'PanelTop',
  fields: [
    {
      id: 'windowName',
      label: 'Window Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., GoldDisplay',
      help: 'Name for your window class (without Window_ prefix)'
    },
    {
      id: 'parentClass',
      label: 'Parent Class',
      type: 'select',
      required: true,
      options: [
        { value: 'Window_Base', label: 'Window_Base - Simple display window' },
        { value: 'Window_Selectable', label: 'Window_Selectable - List with cursor' },
        { value: 'Window_Command', label: 'Window_Command - Menu commands' }
      ],
      default: 'Window_Base',
      help: 'Base class to extend'
    },
    {
      id: 'width',
      label: 'Width',
      type: 'number',
      default: 300,
      help: 'Window width in pixels'
    },
    {
      id: 'height',
      label: 'Height',
      type: 'number',
      default: 200,
      help: 'Window height in pixels'
    },
    {
      id: 'addToScene',
      label: 'Add to Scene',
      type: 'select',
      options: [
        { value: 'none', label: 'None - Manual placement' },
        { value: 'Scene_Map', label: 'Scene_Map - On the map' },
        { value: 'Scene_Menu', label: 'Scene_Menu - In the menu' },
        { value: 'Scene_Battle', label: 'Scene_Battle - During battle' },
        { value: 'Scene_Title', label: 'Scene_Title - Title screen' }
      ],
      default: 'none',
      help: 'Scene to automatically add the window to'
    }
  ],
  generate: (values): string => {
    const rawName = values.windowName as string
    const windowName = sanitizeWindowName(rawName)
    const parentClass = (values.parentClass as string) || 'Window_Base'
    const width = (values.width as number) || 300
    const height = (values.height as number) || 200
    const addToScene = (values.addToScene as string) || 'none'

    // Generate window class
    let code = generateWindowClass(windowName, parentClass)

    // Generate scene integration if requested
    if (addToScene && addToScene !== 'none') {
      code += generateSceneIntegration(windowName, addToScene, width, height, parentClass)
    }

    return code
  },
  validate: (values) => {
    const errors: string[] = []

    if (!values.windowName) {
      errors.push('Window Name is required')
    } else {
      const name = values.windowName as string
      // Check for valid identifier
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name.trim().replace(/\s+/g, ''))) {
        errors.push('Window Name must start with a letter and contain only letters and numbers')
      }
    }

    if (!values.parentClass) {
      errors.push('Parent Class is required')
    }

    // Validate width and height are positive
    if (values.width !== undefined && (values.width as number) <= 0) {
      errors.push('Width must be a positive number')
    }

    if (values.height !== undefined && (values.height as number) <= 0) {
      errors.push('Height must be a positive number')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * HUD Overlay Window Template
 *
 * Creates a window that displays on the map screen as a HUD element
 * (health bars, status indicators, mini-map placeholders, etc.)
 */
const hudOverlayWindowTemplate: CodeTemplate = {
  id: 'hud-overlay-window',
  category: 'custom-window',
  name: 'HUD Overlay Window',
  description: 'Create a HUD window that displays on the map screen',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Window_Base.html',
  icon: 'PanelTop',
  fields: [
    {
      id: 'windowName',
      label: 'Window Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., PlayerHUD',
      help: 'Name for your HUD window class (without Window_ prefix)'
    },
    {
      id: 'hudType',
      label: 'HUD Type',
      type: 'select',
      required: true,
      options: [
        { value: 'health', label: 'Health/HP Display' },
        { value: 'status', label: 'Status Indicators' },
        { value: 'minimap', label: 'Mini-Map Placeholder' },
        { value: 'custom', label: 'Custom Content' }
      ],
      default: 'health',
      help: 'Type of HUD content to display'
    },
    {
      id: 'positionX',
      label: 'X Position',
      type: 'number',
      default: 10,
      help: 'X position on screen (pixels from left)'
    },
    {
      id: 'positionY',
      label: 'Y Position',
      type: 'number',
      default: 10,
      help: 'Y position on screen (pixels from top)'
    },
    {
      id: 'width',
      label: 'Width',
      type: 'number',
      default: 200,
      help: 'Window width in pixels'
    },
    {
      id: 'height',
      label: 'Height',
      type: 'number',
      default: 80,
      help: 'Window height in pixels'
    },
    {
      id: 'opacity',
      label: 'Background Opacity',
      type: 'number',
      default: 255,
      help: 'Window background opacity (0-255, 0 = transparent)'
    },
    {
      id: 'showFrame',
      label: 'Show Window Frame',
      type: 'select',
      options: [
        { value: 'true', label: 'Yes - Show frame' },
        { value: 'false', label: 'No - Frameless' }
      ],
      default: 'true',
      help: 'Whether to show the window frame/border'
    }
  ],
  generate: (values): string => {
    const rawName = values.windowName as string
    const windowName = sanitizeWindowName(rawName)
    const hudType = (values.hudType as string) || 'health'
    const posX = (values.positionX as number) || 10
    const posY = (values.positionY as number) || 10
    const width = (values.width as number) || 200
    const height = (values.height as number) || 80
    const opacity = (values.opacity as number) ?? 255
    const showFrame = values.showFrame !== 'false'

    const fullClassName = `Window_${windowName}`
    const lines: string[] = []

    // Header comment
    lines.push('//-----------------------------------------------------------------------------')
    lines.push(`// ${fullClassName}`)
    lines.push('//')
    lines.push('// HUD overlay window that displays on the map screen.')
    lines.push('// This window automatically updates every frame to reflect current game state.')
    lines.push('//-----------------------------------------------------------------------------')
    lines.push('')

    // Constructor function
    lines.push(`function ${fullClassName}() {`)
    lines.push('    this.initialize(...arguments);')
    lines.push('}')
    lines.push('')

    // Prototype chain setup
    lines.push(`${fullClassName}.prototype = Object.create(Window_Base.prototype);`)
    lines.push(`${fullClassName}.prototype.constructor = ${fullClassName};`)
    lines.push('')

    // Initialize method
    lines.push(`${fullClassName}.prototype.initialize = function(rect) {`)
    lines.push('    Window_Base.prototype.initialize.call(this, rect);')
    if (!showFrame) {
      lines.push('    // Remove window frame for a cleaner HUD look')
      lines.push('    this.frameVisible = false;')
    }
    lines.push(`    this.backOpacity = ${opacity};`)
    lines.push('    this.refresh();')
    lines.push('};')
    lines.push('')

    // Update method - refresh every frame
    lines.push(`${fullClassName}.prototype.update = function() {`)
    lines.push('    Window_Base.prototype.update.call(this);')
    lines.push('    // Refresh HUD when data changes')
    lines.push('    if (this.needsRefresh()) {')
    lines.push('        this.refresh();')
    lines.push('    }')
    lines.push('};')
    lines.push('')

    // Needs refresh check
    lines.push(`${fullClassName}.prototype.needsRefresh = function() {`)
    if (hudType === 'health') {
      lines.push('    // Check if HP/MP values have changed')
      lines.push('    const actor = $gameParty.leader();')
      lines.push('    if (!actor) return false;')
      lines.push('    if (this._lastHp !== actor.hp || this._lastMp !== actor.mp) {')
      lines.push('        this._lastHp = actor.hp;')
      lines.push('        this._lastMp = actor.mp;')
      lines.push('        return true;')
      lines.push('    }')
      lines.push('    return false;')
    } else if (hudType === 'status') {
      lines.push('    // Refresh periodically for status updates')
      lines.push('    this._refreshCounter = (this._refreshCounter || 0) + 1;')
      lines.push('    if (this._refreshCounter >= 30) { // Every 0.5 seconds')
      lines.push('        this._refreshCounter = 0;')
      lines.push('        return true;')
      lines.push('    }')
      lines.push('    return false;')
    } else {
      lines.push('    // Override this method to control when the HUD refreshes')
      lines.push('    return false;')
    }
    lines.push('};')
    lines.push('')

    // Refresh method based on HUD type
    lines.push(`${fullClassName}.prototype.refresh = function() {`)
    lines.push('    this.contents.clear();')

    if (hudType === 'health') {
      lines.push('    const actor = $gameParty.leader();')
      lines.push('    if (!actor) return;')
      lines.push('    ')
      lines.push('    // Draw actor name')
      lines.push('    this.drawText(actor.name(), 0, 0, this.contentsWidth());')
      lines.push('    ')
      lines.push('    // Draw HP gauge')
      lines.push('    const gaugeY = this.lineHeight();')
      lines.push('    this.drawText("HP:", 0, gaugeY, 40);')
      lines.push("    this.changeTextColor(ColorManager.hpColor(actor));")
      lines.push('    this.drawText(actor.hp + "/" + actor.mhp, 45, gaugeY, this.contentsWidth() - 45);')
      lines.push("    this.resetTextColor();")
    } else if (hudType === 'status') {
      lines.push('    const actor = $gameParty.leader();')
      lines.push('    if (!actor) return;')
      lines.push('    ')
      lines.push('    // Draw status icons')
      lines.push('    const icons = actor.allIcons();')
      lines.push('    const iconWidth = ImageManager.iconWidth;')
      lines.push('    for (let i = 0; i < icons.length && i < 8; i++) {')
      lines.push('        this.drawIcon(icons[i], i * iconWidth, 0);')
      lines.push('    }')
      lines.push('    ')
      lines.push('    // Draw status text if no icons')
      lines.push('    if (icons.length === 0) {')
      lines.push("        this.drawText('Normal', 0, 0, this.contentsWidth(), 'center');")
      lines.push('    }')
    } else if (hudType === 'minimap') {
      lines.push('    // Mini-map placeholder - customize with your own implementation')
      lines.push('    const cx = this.contentsWidth() / 2;')
      lines.push('    const cy = this.contentsHeight() / 2;')
      lines.push('    ')
      lines.push('    // Draw border')
      lines.push("    this.contents.strokeRect(2, 2, this.contentsWidth() - 4, this.contentsHeight() - 4, '#ffffff');")
      lines.push('    ')
      lines.push('    // Draw player position indicator')
      lines.push("    this.contents.fillRect(cx - 2, cy - 2, 4, 4, '#00ff00');")
      lines.push('    ')
      lines.push("    this.drawText('Mini-Map', 0, cy - this.lineHeight()/2, this.contentsWidth(), 'center');")
    } else {
      lines.push('    // Custom HUD content - add your drawing code here')
      lines.push("    this.drawText('Custom HUD', 0, 0, this.contentsWidth(), 'center');")
    }

    lines.push('};')
    lines.push('')

    // Scene_Map integration
    lines.push('// Add HUD to Scene_Map')
    lines.push(`const _Scene_Map_createAllWindows_${windowName} = Scene_Map.prototype.createAllWindows;`)
    lines.push('Scene_Map.prototype.createAllWindows = function() {')
    lines.push(`    _Scene_Map_createAllWindows_${windowName}.call(this);`)
    lines.push(`    this.create${windowName}Window();`)
    lines.push('};')
    lines.push('')

    lines.push(`Scene_Map.prototype.create${windowName}Window = function() {`)
    lines.push(`    const rect = new Rectangle(${posX}, ${posY}, ${width}, ${height});`)
    lines.push(`    this._${toCamelCase(windowName)}Window = new ${fullClassName}(rect);`)
    lines.push(`    this.addWindow(this._${toCamelCase(windowName)}Window);`)
    lines.push('};')

    return lines.join('\n')
  },
  validate: (values) => {
    const errors: string[] = []

    if (!values.windowName) {
      errors.push('Window Name is required')
    } else {
      const name = values.windowName as string
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name.trim().replace(/\s+/g, ''))) {
        errors.push('Window Name must start with a letter and contain only letters and numbers')
      }
    }

    const opacity = values.opacity as number
    if (opacity !== undefined && (opacity < 0 || opacity > 255)) {
      errors.push('Opacity must be between 0 and 255')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Popup Notification Window Template
 *
 * Creates a temporary popup window that displays a message and auto-closes
 */
const popupNotificationTemplate: CodeTemplate = {
  id: 'popup-notification-window',
  category: 'custom-window',
  name: 'Popup Notification',
  description: 'Create a temporary popup window that auto-closes after a duration',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Window_Base.html',
  icon: 'PanelTop',
  fields: [
    {
      id: 'windowName',
      label: 'Window Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Notification',
      help: 'Name for your notification window class (without Window_ prefix)'
    },
    {
      id: 'defaultDuration',
      label: 'Default Duration (frames)',
      type: 'number',
      default: 120,
      help: 'How long the popup stays visible (60 frames = 1 second)'
    },
    {
      id: 'width',
      label: 'Width',
      type: 'number',
      default: 400,
      help: 'Window width in pixels'
    },
    {
      id: 'height',
      label: 'Height',
      type: 'number',
      default: 60,
      help: 'Window height in pixels'
    },
    {
      id: 'position',
      label: 'Position',
      type: 'select',
      options: [
        { value: 'top', label: 'Top Center' },
        { value: 'center', label: 'Screen Center' },
        { value: 'bottom', label: 'Bottom Center' }
      ],
      default: 'top',
      help: 'Where the popup appears on screen'
    },
    {
      id: 'fadeEffect',
      label: 'Fade Effect',
      type: 'select',
      options: [
        { value: 'none', label: 'None - Instant show/hide' },
        { value: 'fade', label: 'Fade In/Out' },
        { value: 'slide', label: 'Slide In/Out' }
      ],
      default: 'fade',
      help: 'Animation effect for showing/hiding'
    },
    {
      id: 'bgColor',
      label: 'Background Color',
      type: 'text',
      default: '#000000',
      help: 'Background color (hex format, e.g., #000000)'
    },
    {
      id: 'textColor',
      label: 'Text Color',
      type: 'text',
      default: '#ffffff',
      help: 'Text color (hex format, e.g., #ffffff)'
    }
  ],
  generate: (values): string => {
    const rawName = values.windowName as string
    const windowName = sanitizeWindowName(rawName)
    const duration = (values.defaultDuration as number) || 120
    const width = (values.width as number) || 400
    const height = (values.height as number) || 60
    const position = (values.position as string) || 'top'
    const fadeEffect = (values.fadeEffect as string) || 'fade'
    const bgColor = (values.bgColor as string) || '#000000'
    const textColor = (values.textColor as string) || '#ffffff'

    const fullClassName = `Window_${windowName}`
    const lines: string[] = []

    // Header comment
    lines.push('//-----------------------------------------------------------------------------')
    lines.push(`// ${fullClassName}`)
    lines.push('//')
    lines.push('// A popup notification window that displays temporarily and auto-closes.')
    lines.push(`// Default duration: ${duration} frames (${(duration / 60).toFixed(1)} seconds)`)
    lines.push('//-----------------------------------------------------------------------------')
    lines.push('')

    // Constructor function
    lines.push(`function ${fullClassName}() {`)
    lines.push('    this.initialize(...arguments);')
    lines.push('}')
    lines.push('')

    // Prototype chain setup
    lines.push(`${fullClassName}.prototype = Object.create(Window_Base.prototype);`)
    lines.push(`${fullClassName}.prototype.constructor = ${fullClassName};`)
    lines.push('')

    // Static method to show notification easily
    lines.push(`// Static method for easy notification display`)
    lines.push(`${fullClassName}.show = function(message, duration) {`)
    lines.push('    const scene = SceneManager._scene;')
    lines.push(`    if (scene && scene._${toCamelCase(windowName)}Window) {`)
    lines.push(`        scene._${toCamelCase(windowName)}Window.showNotification(message, duration);`)
    lines.push('    }')
    lines.push('};')
    lines.push('')

    // Initialize method
    lines.push(`${fullClassName}.prototype.initialize = function(rect) {`)
    lines.push('    Window_Base.prototype.initialize.call(this, rect);')
    lines.push('    this._message = "";')
    lines.push(`    this._duration = 0;`)
    lines.push('    this._fadePhase = "none"; // "in", "out", "none"')
    lines.push('    this._fadeCounter = 0;')
    lines.push('    this.frameVisible = false; // Hide frame for cleaner look')
    lines.push('    this.openness = 0; // Start hidden')
    lines.push('    this.createCustomBackground();')
    lines.push('};')
    lines.push('')

    // Create custom background
    lines.push(`${fullClassName}.prototype.createCustomBackground = function() {`)
    lines.push('    // Create a custom colored background')
    lines.push('    this._customBg = new Sprite(new Bitmap(this.width, this.height));')
    lines.push(`    this._customBg.bitmap.fillRect(0, 0, this.width, this.height, '${bgColor}');`)
    lines.push('    this._customBg.opacity = 200;')
    lines.push('    this.addChildToBack(this._customBg);')
    lines.push('};')
    lines.push('')

    // Show notification method
    lines.push(`${fullClassName}.prototype.showNotification = function(message, duration) {`)
    lines.push('    this._message = message;')
    lines.push(`    this._duration = duration || ${duration};`)
    lines.push('    this._fadePhase = "in";')
    lines.push('    this._fadeCounter = 0;')
    lines.push('    this.refresh();')
    if (fadeEffect === 'none') {
      lines.push('    this.openness = 255;')
    } else if (fadeEffect === 'slide') {
      lines.push('    this.openness = 255;')
      lines.push('    this._slideOffset = -this.height;')
    }
    lines.push('};')
    lines.push('')

    // Update method
    lines.push(`${fullClassName}.prototype.update = function() {`)
    lines.push('    Window_Base.prototype.update.call(this);')
    lines.push('    this.updateFade();')
    lines.push('    this.updateDuration();')
    lines.push('};')
    lines.push('')

    // Update fade
    lines.push(`${fullClassName}.prototype.updateFade = function() {`)
    lines.push('    const fadeSpeed = 16;')
    if (fadeEffect === 'fade') {
      lines.push('    if (this._fadePhase === "in") {')
      lines.push('        this.openness = Math.min(255, this.openness + fadeSpeed);')
      lines.push('        if (this.openness >= 255) this._fadePhase = "none";')
      lines.push('    } else if (this._fadePhase === "out") {')
      lines.push('        this.openness = Math.max(0, this.openness - fadeSpeed);')
      lines.push('        if (this.openness <= 0) this._fadePhase = "none";')
      lines.push('    }')
    } else if (fadeEffect === 'slide') {
      lines.push('    if (this._fadePhase === "in") {')
      lines.push('        this._slideOffset = Math.min(0, (this._slideOffset || -this.height) + 8);')
      lines.push('        this.y = this._baseY + this._slideOffset;')
      lines.push('        if (this._slideOffset >= 0) this._fadePhase = "none";')
      lines.push('    } else if (this._fadePhase === "out") {')
      lines.push('        this._slideOffset = Math.max(-this.height, (this._slideOffset || 0) - 8);')
      lines.push('        this.y = this._baseY + this._slideOffset;')
      lines.push('        if (this._slideOffset <= -this.height) {')
      lines.push('            this._fadePhase = "none";')
      lines.push('            this.openness = 0;')
      lines.push('        }')
      lines.push('    }')
    } else {
      lines.push('    // No fade effect')
      lines.push('    if (this._fadePhase === "in") this._fadePhase = "none";')
      lines.push('    if (this._fadePhase === "out") {')
      lines.push('        this.openness = 0;')
      lines.push('        this._fadePhase = "none";')
      lines.push('    }')
    }
    lines.push('};')
    lines.push('')

    // Update duration
    lines.push(`${fullClassName}.prototype.updateDuration = function() {`)
    lines.push('    if (this._duration > 0 && this._fadePhase === "none" && this.openness > 0) {')
    lines.push('        this._duration--;')
    lines.push('        if (this._duration <= 0) {')
    lines.push('            this._fadePhase = "out";')
    lines.push('        }')
    lines.push('    }')
    lines.push('};')
    lines.push('')

    // Refresh method
    lines.push(`${fullClassName}.prototype.refresh = function() {`)
    lines.push('    this.contents.clear();')
    lines.push(`    this.contents.textColor = '${textColor}';`)
    lines.push("    this.drawText(this._message, 0, 0, this.contentsWidth(), 'center');")
    lines.push('};')
    lines.push('')

    // Calculate position based on setting
    let posX: string
    let posY: string
    if (position === 'top') {
      posX = `(Graphics.boxWidth - ${width}) / 2`
      posY = '10'
    } else if (position === 'center') {
      posX = `(Graphics.boxWidth - ${width}) / 2`
      posY = `(Graphics.boxHeight - ${height}) / 2`
    } else {
      posX = `(Graphics.boxWidth - ${width}) / 2`
      posY = `Graphics.boxHeight - ${height} - 10`
    }

    // Scene_Map integration
    lines.push('// Add notification window to Scene_Map')
    lines.push('const _Scene_Map_createAllWindows_Notif = Scene_Map.prototype.createAllWindows;')
    lines.push('Scene_Map.prototype.createAllWindows = function() {')
    lines.push('    _Scene_Map_createAllWindows_Notif.call(this);')
    lines.push(`    this.create${windowName}Window();`)
    lines.push('};')
    lines.push('')

    lines.push(`Scene_Map.prototype.create${windowName}Window = function() {`)
    lines.push(`    const x = ${posX};`)
    lines.push(`    const y = ${posY};`)
    lines.push(`    const rect = new Rectangle(x, y, ${width}, ${height});`)
    lines.push(`    this._${toCamelCase(windowName)}Window = new ${fullClassName}(rect);`)
    if (fadeEffect === 'slide') {
      lines.push(`    this._${toCamelCase(windowName)}Window._baseY = y;`)
    }
    lines.push(`    this.addWindow(this._${toCamelCase(windowName)}Window);`)
    lines.push('};')
    lines.push('')

    // Usage example comment
    lines.push('// ============================================')
    lines.push('// USAGE EXAMPLE:')
    lines.push('// ============================================')
    lines.push(`// Call from event script or plugin:`)
    lines.push(`// ${fullClassName}.show("Achievement Unlocked!", 180);`)
    lines.push(`// ${fullClassName}.show("Item Obtained", 90);`)
    lines.push('// ============================================')

    return lines.join('\n')
  },
  validate: (values) => {
    const errors: string[] = []

    if (!values.windowName) {
      errors.push('Window Name is required')
    } else {
      const name = values.windowName as string
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name.trim().replace(/\s+/g, ''))) {
        errors.push('Window Name must start with a letter and contain only letters and numbers')
      }
    }

    const duration = values.defaultDuration as number
    if (duration !== undefined && duration <= 0) {
      errors.push('Duration must be a positive number')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Gauge Window Template
 *
 * Creates a window with HP/MP style gauge bars
 */
const gaugeWindowTemplate: CodeTemplate = {
  id: 'gauge-window',
  category: 'custom-window',
  name: 'Gauge Window',
  description: 'Create a window with customizable gauge bars (HP/MP style)',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Window_Base.html',
  icon: 'PanelTop',
  fields: [
    {
      id: 'windowName',
      label: 'Window Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., BossGauge',
      help: 'Name for your gauge window class (without Window_ prefix)'
    },
    {
      id: 'gaugeCount',
      label: 'Number of Gauges',
      type: 'select',
      options: [
        { value: '1', label: '1 Gauge' },
        { value: '2', label: '2 Gauges' },
        { value: '3', label: '3 Gauges' }
      ],
      default: '2',
      help: 'How many gauge bars to display'
    },
    {
      id: 'gauge1Label',
      label: 'Gauge 1 Label',
      type: 'text',
      default: 'HP',
      help: 'Label for the first gauge'
    },
    {
      id: 'gauge1Color1',
      label: 'Gauge 1 Color (Start)',
      type: 'text',
      default: '#e08040',
      help: 'Gradient start color (hex format)'
    },
    {
      id: 'gauge1Color2',
      label: 'Gauge 1 Color (End)',
      type: 'text',
      default: '#f0c040',
      help: 'Gradient end color (hex format)'
    },
    {
      id: 'gauge2Label',
      label: 'Gauge 2 Label',
      type: 'text',
      default: 'MP',
      help: 'Label for the second gauge'
    },
    {
      id: 'gauge2Color1',
      label: 'Gauge 2 Color (Start)',
      type: 'text',
      default: '#4080c0',
      help: 'Gradient start color (hex format)'
    },
    {
      id: 'gauge2Color2',
      label: 'Gauge 2 Color (End)',
      type: 'text',
      default: '#40c0f0',
      help: 'Gradient end color (hex format)'
    },
    {
      id: 'gauge3Label',
      label: 'Gauge 3 Label',
      type: 'text',
      default: 'TP',
      help: 'Label for the third gauge (if enabled)'
    },
    {
      id: 'gauge3Color1',
      label: 'Gauge 3 Color (Start)',
      type: 'text',
      default: '#40c040',
      help: 'Gradient start color (hex format)'
    },
    {
      id: 'gauge3Color2',
      label: 'Gauge 3 Color (End)',
      type: 'text',
      default: '#80f080',
      help: 'Gradient end color (hex format)'
    },
    {
      id: 'positionX',
      label: 'X Position',
      type: 'number',
      default: 10,
      help: 'X position on screen (pixels from left)'
    },
    {
      id: 'positionY',
      label: 'Y Position',
      type: 'number',
      default: 10,
      help: 'Y position on screen (pixels from top)'
    },
    {
      id: 'width',
      label: 'Width',
      type: 'number',
      default: 300,
      help: 'Window width in pixels'
    },
    {
      id: 'gaugeHeight',
      label: 'Gauge Height',
      type: 'number',
      default: 12,
      help: 'Height of each gauge bar in pixels'
    },
    {
      id: 'showLabels',
      label: 'Show Labels',
      type: 'select',
      options: [
        { value: 'true', label: 'Yes - Show gauge labels' },
        { value: 'false', label: 'No - Gauges only' }
      ],
      default: 'true',
      help: 'Whether to show text labels next to gauges'
    },
    {
      id: 'showValues',
      label: 'Show Values',
      type: 'select',
      options: [
        { value: 'true', label: 'Yes - Show current/max values' },
        { value: 'false', label: 'No - Gauges only' }
      ],
      default: 'true',
      help: 'Whether to show numeric values on gauges'
    },
    {
      id: 'dataSource',
      label: 'Data Source',
      type: 'select',
      options: [
        { value: 'actor', label: 'Party Leader (HP/MP/TP)' },
        { value: 'variable', label: 'Game Variables' },
        { value: 'custom', label: 'Custom (manual)' }
      ],
      default: 'actor',
      help: 'Where to get gauge values from'
    }
  ],
  generate: (values): string => {
    const rawName = values.windowName as string
    const windowName = sanitizeWindowName(rawName)
    const gaugeCount = parseInt((values.gaugeCount as string) || '2', 10)
    const gauge1Label = (values.gauge1Label as string) || 'HP'
    const gauge1Color1 = (values.gauge1Color1 as string) || '#e08040'
    const gauge1Color2 = (values.gauge1Color2 as string) || '#f0c040'
    const gauge2Label = (values.gauge2Label as string) || 'MP'
    const gauge2Color1 = (values.gauge2Color1 as string) || '#4080c0'
    const gauge2Color2 = (values.gauge2Color2 as string) || '#40c0f0'
    const gauge3Label = (values.gauge3Label as string) || 'TP'
    const gauge3Color1 = (values.gauge3Color1 as string) || '#40c040'
    const gauge3Color2 = (values.gauge3Color2 as string) || '#80f080'
    const posX = (values.positionX as number) || 10
    const posY = (values.positionY as number) || 10
    const width = (values.width as number) || 300
    const gaugeHeight = (values.gaugeHeight as number) || 12
    const showLabels = values.showLabels !== 'false'
    const showValues = values.showValues !== 'false'
    const dataSource = (values.dataSource as string) || 'actor'

    // Calculate window height based on gauge count
    const lineHeight = 36
    const padding = 12
    const windowHeight = (lineHeight * gaugeCount) + (padding * 2)

    const fullClassName = `Window_${windowName}`
    const lines: string[] = []

    // Header comment
    lines.push('//-----------------------------------------------------------------------------')
    lines.push(`// ${fullClassName}`)
    lines.push('//')
    lines.push('// A window that displays gauge bars (HP/MP style).')
    lines.push(`// Contains ${gaugeCount} gauge(s) that update automatically.`)
    lines.push('//-----------------------------------------------------------------------------')
    lines.push('')

    // Constructor function
    lines.push(`function ${fullClassName}() {`)
    lines.push('    this.initialize(...arguments);')
    lines.push('}')
    lines.push('')

    // Prototype chain setup
    lines.push(`${fullClassName}.prototype = Object.create(Window_Base.prototype);`)
    lines.push(`${fullClassName}.prototype.constructor = ${fullClassName};`)
    lines.push('')

    // Initialize method
    lines.push(`${fullClassName}.prototype.initialize = function(rect) {`)
    lines.push('    Window_Base.prototype.initialize.call(this, rect);')
    lines.push('    this._gaugeData = [];')
    lines.push('    this.initializeGauges();')
    lines.push('    this.refresh();')
    lines.push('};')
    lines.push('')

    // Initialize gauge data
    lines.push(`${fullClassName}.prototype.initializeGauges = function() {`)
    lines.push('    // Initialize gauge configurations')
    lines.push('    this._gaugeData = [')
    lines.push(`        { label: '${gauge1Label}', color1: '${gauge1Color1}', color2: '${gauge1Color2}', current: 0, max: 100 },`)
    if (gaugeCount >= 2) {
      lines.push(`        { label: '${gauge2Label}', color1: '${gauge2Color1}', color2: '${gauge2Color2}', current: 0, max: 100 },`)
    }
    if (gaugeCount >= 3) {
      lines.push(`        { label: '${gauge3Label}', color1: '${gauge3Color1}', color2: '${gauge3Color2}', current: 0, max: 100 },`)
    }
    lines.push('    ];')
    lines.push('};')
    lines.push('')

    // Update method
    lines.push(`${fullClassName}.prototype.update = function() {`)
    lines.push('    Window_Base.prototype.update.call(this);')
    lines.push('    if (this.needsRefresh()) {')
    lines.push('        this.refresh();')
    lines.push('    }')
    lines.push('};')
    lines.push('')

    // Needs refresh check
    lines.push(`${fullClassName}.prototype.needsRefresh = function() {`)
    lines.push('    const newData = this.getCurrentValues();')
    lines.push('    for (let i = 0; i < this._gaugeData.length; i++) {')
    lines.push('        if (this._gaugeData[i].current !== newData[i].current ||')
    lines.push('            this._gaugeData[i].max !== newData[i].max) {')
    lines.push('            return true;')
    lines.push('        }')
    lines.push('    }')
    lines.push('    return false;')
    lines.push('};')
    lines.push('')

    // Get current values based on data source
    lines.push(`${fullClassName}.prototype.getCurrentValues = function() {`)
    if (dataSource === 'actor') {
      lines.push('    const actor = $gameParty.leader();')
      lines.push('    if (!actor) return this._gaugeData;')
      lines.push('    ')
      lines.push('    return [')
      lines.push(`        { label: '${gauge1Label}', color1: '${gauge1Color1}', color2: '${gauge1Color2}', current: actor.hp, max: actor.mhp },`)
      if (gaugeCount >= 2) {
        lines.push(`        { label: '${gauge2Label}', color1: '${gauge2Color1}', color2: '${gauge2Color2}', current: actor.mp, max: actor.mmp },`)
      }
      if (gaugeCount >= 3) {
        lines.push(`        { label: '${gauge3Label}', color1: '${gauge3Color1}', color2: '${gauge3Color2}', current: actor.tp, max: actor.maxTp() },`)
      }
      lines.push('    ];')
    } else if (dataSource === 'variable') {
      lines.push('    // Using game variables for gauge values')
      lines.push('    // Customize variable IDs as needed')
      lines.push('    return [')
      lines.push(`        { label: '${gauge1Label}', color1: '${gauge1Color1}', color2: '${gauge1Color2}', current: $gameVariables.value(1), max: $gameVariables.value(2) },`)
      if (gaugeCount >= 2) {
        lines.push(`        { label: '${gauge2Label}', color1: '${gauge2Color1}', color2: '${gauge2Color2}', current: $gameVariables.value(3), max: $gameVariables.value(4) },`)
      }
      if (gaugeCount >= 3) {
        lines.push(`        { label: '${gauge3Label}', color1: '${gauge3Color1}', color2: '${gauge3Color2}', current: $gameVariables.value(5), max: $gameVariables.value(6) },`)
      }
      lines.push('    ];')
    } else {
      lines.push('    // Custom data source - override this method or call setGaugeValue()')
      lines.push('    return this._gaugeData;')
    }
    lines.push('};')
    lines.push('')

    // Set gauge value method (for custom use)
    lines.push(`${fullClassName}.prototype.setGaugeValue = function(index, current, max) {`)
    lines.push('    if (this._gaugeData[index]) {')
    lines.push('        this._gaugeData[index].current = current;')
    lines.push('        this._gaugeData[index].max = max;')
    lines.push('        this.refresh();')
    lines.push('    }')
    lines.push('};')
    lines.push('')

    // Refresh method
    lines.push(`${fullClassName}.prototype.refresh = function() {`)
    lines.push('    this.contents.clear();')
    lines.push('    this._gaugeData = this.getCurrentValues();')
    lines.push('    ')
    lines.push('    for (let i = 0; i < this._gaugeData.length; i++) {')
    lines.push(`        this.drawGauge(i, i * ${lineHeight});`)
    lines.push('    }')
    lines.push('};')
    lines.push('')

    // Draw gauge method
    lines.push(`${fullClassName}.prototype.drawGauge = function(index, y) {`)
    lines.push('    const gauge = this._gaugeData[index];')
    lines.push('    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;')
    lines.push(`    const gaugeHeight = ${gaugeHeight};`)
    lines.push('    ')
    if (showLabels) {
      lines.push('    // Draw label')
      lines.push('    const labelWidth = 48;')
      lines.push('    this.drawText(gauge.label, 0, y, labelWidth);')
      lines.push('    ')
      lines.push('    // Calculate gauge position')
      lines.push('    const gaugeX = labelWidth + 4;')
    } else {
      lines.push('    const gaugeX = 0;')
    }
    if (showValues) {
      lines.push('    const valueWidth = 80;')
    } else {
      lines.push('    const valueWidth = 0;')
    }
    lines.push('    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;')
    lines.push('    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;')
    lines.push('    ')
    lines.push('    // Draw gauge background')
    lines.push("    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');")
    lines.push('    ')
    lines.push('    // Draw gauge fill with gradient')
    lines.push('    const fillWidth = Math.floor(gaugeWidth * rate);')
    lines.push('    if (fillWidth > 0) {')
    lines.push('        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);')
    lines.push('    }')
    if (showValues) {
      lines.push('    ')
      lines.push('    // Draw values')
      lines.push('    const valueText = gauge.current + "/" + gauge.max;')
      lines.push("    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');")
    }
    lines.push('};')
    lines.push('')

    // Scene_Map integration
    lines.push('// Add gauge window to Scene_Map')
    lines.push('const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;')
    lines.push('Scene_Map.prototype.createAllWindows = function() {')
    lines.push('    _Scene_Map_createAllWindows_Gauge.call(this);')
    lines.push(`    this.create${windowName}Window();`)
    lines.push('};')
    lines.push('')

    lines.push(`Scene_Map.prototype.create${windowName}Window = function() {`)
    lines.push(`    const rect = new Rectangle(${posX}, ${posY}, ${width}, ${windowHeight});`)
    lines.push(`    this._${toCamelCase(windowName)}Window = new ${fullClassName}(rect);`)
    lines.push(`    this.addWindow(this._${toCamelCase(windowName)}Window);`)
    lines.push('};')
    lines.push('')

    // Usage example comment
    lines.push('// ============================================')
    lines.push('// USAGE EXAMPLE:')
    lines.push('// ============================================')
    lines.push('// Access the gauge window from events:')
    lines.push(`// const gaugeWindow = SceneManager._scene._${toCamelCase(windowName)}Window;`)
    lines.push('//')
    lines.push('// For custom data source, set values manually:')
    lines.push('// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%')
    lines.push('// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%')
    lines.push('// ============================================')

    return lines.join('\n')
  },
  validate: (values) => {
    const errors: string[] = []

    if (!values.windowName) {
      errors.push('Window Name is required')
    } else {
      const name = values.windowName as string
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name.trim().replace(/\s+/g, ''))) {
        errors.push('Window Name must start with a letter and contain only letters and numbers')
      }
    }

    const width = values.width as number
    if (width !== undefined && width <= 0) {
      errors.push('Width must be a positive number')
    }

    const gaugeHeight = values.gaugeHeight as number
    if (gaugeHeight !== undefined && gaugeHeight <= 0) {
      errors.push('Gauge Height must be a positive number')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register the templates when this module loads
registerTemplate(customWindowTemplate)
registerTemplate(hudOverlayWindowTemplate)
registerTemplate(popupNotificationTemplate)
registerTemplate(gaugeWindowTemplate)

export { customWindowTemplate, hudOverlayWindowTemplate, popupNotificationTemplate, gaugeWindowTemplate }
