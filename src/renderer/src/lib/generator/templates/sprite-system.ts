/**
 * Sprite System Templates
 *
 * Templates for RPG Maker MZ sprite manipulation:
 * - Custom sprite class creation
 * - Picture manipulation (show, move, rotate, tint)
 * - Sprite animation (frame-based)
 */

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'

/**
 * Converts a sprite name to a valid identifier
 * Strips spaces and ensures PascalCase
 */
function sanitizeSpriteName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[a-z]/, (c) => c.toUpperCase())
}

/**
 * Template 1: Custom Sprite Class
 * Creates a new Sprite subclass with initialize, update methods
 */
const customSpriteClassTemplate: CodeTemplate = {
  id: 'sprite-custom-class',
  category: 'sprite-system',
  name: 'Custom Sprite Class',
  description: 'Create a new Sprite subclass with initialize and update methods',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Sprite.html',
  icon: 'Image',
  fields: [
    {
      id: 'spriteName',
      label: 'Sprite Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., CustomEffect',
      help: 'Name for your sprite class (without Sprite_ prefix)'
    },
    {
      id: 'parentClass',
      label: 'Parent Class',
      type: 'select',
      required: true,
      options: [
        { value: 'Sprite', label: 'Sprite - Basic sprite' },
        { value: 'Sprite_Base', label: 'Sprite_Base - With animation support' },
        { value: 'Sprite_Clickable', label: 'Sprite_Clickable - With click/touch handling' }
      ],
      default: 'Sprite',
      help: 'Base class to extend'
    },
    {
      id: 'width',
      label: 'Width',
      type: 'number',
      default: 48,
      help: 'Sprite width in pixels (for bitmap creation)'
    },
    {
      id: 'height',
      label: 'Height',
      type: 'number',
      default: 48,
      help: 'Sprite height in pixels (for bitmap creation)'
    },
    {
      id: 'useBitmap',
      label: 'Create Bitmap',
      type: 'select',
      options: [
        { value: 'none', label: 'None - Load external image' },
        { value: 'empty', label: 'Empty - Create blank bitmap' },
        { value: 'filled', label: 'Filled - Create colored bitmap' }
      ],
      default: 'none',
      help: 'How to initialize the sprite bitmap'
    },
    {
      id: 'fillColor',
      label: 'Fill Color',
      type: 'text',
      placeholder: 'e.g., #ff0000 or rgba(255, 0, 0, 0.5)',
      help: 'Color for filled bitmap (CSS color format)',
      dependsOn: { field: 'useBitmap', value: 'filled' }
    },
    {
      id: 'includeUpdate',
      label: 'Include Update Logic',
      type: 'boolean',
      default: true,
      help: 'Include an update method with animation frame example'
    }
  ],
  generate: (values): string => {
    const rawName = values.spriteName as string
    const spriteName = sanitizeSpriteName(rawName)
    const parentClass = (values.parentClass as string) || 'Sprite'
    const width = (values.width as number) || 48
    const height = (values.height as number) || 48
    const useBitmap = (values.useBitmap as string) || 'none'
    const fillColor = (values.fillColor as string) || '#ffffff'
    const includeUpdate = values.includeUpdate !== false

    const fullClassName = `Sprite_${spriteName}`
    const lines: string[] = []

    // Header comment
    lines.push('//-----------------------------------------------------------------------------')
    lines.push(`// ${fullClassName}`)
    lines.push('//')
    lines.push(`// Custom sprite class extending ${parentClass}.`)
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
    lines.push(`${fullClassName}.prototype.initialize = function() {`)
    lines.push(`    ${parentClass}.prototype.initialize.call(this);`)
    lines.push('')
    lines.push('    // Initialize sprite properties')
    lines.push('    this._animationCount = 0;')
    lines.push('    this._pattern = 0;')
    lines.push('')

    // Bitmap creation based on option
    if (useBitmap === 'empty') {
      lines.push('    // Create empty bitmap')
      lines.push(`    this.bitmap = new Bitmap(${width}, ${height});`)
    } else if (useBitmap === 'filled') {
      lines.push('    // Create filled bitmap')
      lines.push(`    this.bitmap = new Bitmap(${width}, ${height});`)
      lines.push(`    this.bitmap.fillRect(0, 0, ${width}, ${height}, '${fillColor}');`)
    } else {
      lines.push('    // Load external image')
      lines.push("    // this.bitmap = ImageManager.loadPicture('your_image');")
    }

    lines.push('')
    lines.push('    // Set anchor to center (optional)')
    lines.push('    this.anchor.x = 0.5;')
    lines.push('    this.anchor.y = 0.5;')
    lines.push('};')

    // Update method
    if (includeUpdate) {
      lines.push('')
      lines.push(`${fullClassName}.prototype.update = function() {`)
      lines.push(`    ${parentClass}.prototype.update.call(this);`)
      lines.push('')
      lines.push('    // Update animation')
      lines.push('    this.updateAnimation();')
      lines.push('};')
      lines.push('')

      lines.push(`${fullClassName}.prototype.updateAnimation = function() {`)
      lines.push('    this._animationCount++;')
      lines.push('')
      lines.push('    // Example: Update every 12 frames')
      lines.push('    if (this._animationCount >= 12) {')
      lines.push('        this._animationCount = 0;')
      lines.push('        this._pattern = (this._pattern + 1) % 4;')
      lines.push('        // Update sprite based on pattern')
      lines.push('        this.updatePattern();')
      lines.push('    }')
      lines.push('};')
      lines.push('')

      lines.push(`${fullClassName}.prototype.updatePattern = function() {`)
      lines.push('    // Override this to update sprite based on this._pattern')
      lines.push('    // Example: Change frame for spritesheet')
      lines.push('    // const frameWidth = this.bitmap.width / 4;')
      lines.push(
        '    // this.setFrame(this._pattern * frameWidth, 0, frameWidth, this.bitmap.height);'
      )
      lines.push('};')
    }

    // Add click handler for Sprite_Clickable
    if (parentClass === 'Sprite_Clickable') {
      lines.push('')
      lines.push(`${fullClassName}.prototype.onClick = function() {`)
      lines.push('    // Handle click/touch')
      lines.push(`    console.log('${fullClassName} clicked!');`)
      lines.push('};')
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.spriteName) {
      errors.push('Sprite Name is required')
    } else {
      const name = values.spriteName as string
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name.trim().replace(/\s+/g, ''))) {
        errors.push('Sprite Name must start with a letter and contain only letters and numbers')
      }
    }

    if (!values.parentClass) {
      errors.push('Parent Class is required')
    }

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
 * Template 2: Picture Manipulation
 * Show, move, rotate, and tint pictures programmatically
 */
const pictureManipulationTemplate: CodeTemplate = {
  id: 'sprite-picture-manipulation',
  category: 'sprite-system',
  name: 'Picture Manipulation',
  description: 'Show, move, rotate, and tint pictures programmatically',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Game_Screen.html',
  icon: 'Image',
  fields: [
    {
      id: 'operation',
      label: 'Operation',
      type: 'select',
      required: true,
      options: [
        { value: 'show', label: 'Show Picture' },
        { value: 'move', label: 'Move Picture' },
        { value: 'rotate', label: 'Rotate Picture' },
        { value: 'tint', label: 'Tint Picture' },
        { value: 'erase', label: 'Erase Picture' },
        { value: 'utility', label: 'Utility Functions (all operations)' }
      ],
      default: 'show',
      help: 'The picture operation to generate code for'
    },
    {
      id: 'pictureId',
      label: 'Picture ID',
      type: 'number',
      default: 1,
      help: 'Picture ID (1-100)',
      required: true
    },
    {
      id: 'imageName',
      label: 'Image Name',
      type: 'text',
      placeholder: 'e.g., Actor1_1',
      help: 'Name of the image file in img/pictures/',
      dependsOn: { field: 'operation', value: 'show' }
    },
    {
      id: 'origin',
      label: 'Origin',
      type: 'select',
      options: [
        { value: '0', label: 'Upper Left' },
        { value: '1', label: 'Center' }
      ],
      default: '0',
      help: 'Picture origin point',
      dependsOn: { field: 'operation', value: 'show' }
    },
    {
      id: 'x',
      label: 'X Position',
      type: 'number',
      default: 0,
      help: 'X coordinate'
    },
    {
      id: 'y',
      label: 'Y Position',
      type: 'number',
      default: 0,
      help: 'Y coordinate'
    },
    {
      id: 'scaleX',
      label: 'Scale X (%)',
      type: 'number',
      default: 100,
      help: 'Horizontal scale percentage'
    },
    {
      id: 'scaleY',
      label: 'Scale Y (%)',
      type: 'number',
      default: 100,
      help: 'Vertical scale percentage'
    },
    {
      id: 'opacity',
      label: 'Opacity',
      type: 'number',
      default: 255,
      help: 'Opacity (0-255)'
    },
    {
      id: 'blendMode',
      label: 'Blend Mode',
      type: 'select',
      options: [
        { value: '0', label: 'Normal' },
        { value: '1', label: 'Additive' },
        { value: '2', label: 'Multiply' },
        { value: '3', label: 'Screen' }
      ],
      default: '0',
      help: 'Picture blend mode'
    },
    {
      id: 'duration',
      label: 'Duration (frames)',
      type: 'number',
      default: 60,
      help: 'Animation duration in frames'
    },
    {
      id: 'rotationSpeed',
      label: 'Rotation Speed',
      type: 'number',
      default: 1,
      help: 'Rotation speed (degrees per frame)',
      dependsOn: { field: 'operation', value: 'rotate' }
    },
    {
      id: 'tintRed',
      label: 'Tint Red',
      type: 'number',
      default: 0,
      help: 'Red component (-255 to 255)',
      dependsOn: { field: 'operation', value: 'tint' }
    },
    {
      id: 'tintGreen',
      label: 'Tint Green',
      type: 'number',
      default: 0,
      help: 'Green component (-255 to 255)',
      dependsOn: { field: 'operation', value: 'tint' }
    },
    {
      id: 'tintBlue',
      label: 'Tint Blue',
      type: 'number',
      default: 0,
      help: 'Blue component (-255 to 255)',
      dependsOn: { field: 'operation', value: 'tint' }
    },
    {
      id: 'tintGray',
      label: 'Tint Gray',
      type: 'number',
      default: 0,
      help: 'Gray component (0-255)',
      dependsOn: { field: 'operation', value: 'tint' }
    }
  ],
  generate: (values): string => {
    const operation = (values.operation as string) || 'show'
    const pictureId = (values.pictureId as number) || 1
    const imageName = (values.imageName as string) || 'Picture1'
    const origin = parseInt((values.origin as string) || '0', 10)
    const x = (values.x as number) || 0
    const y = (values.y as number) || 0
    const scaleX = (values.scaleX as number) || 100
    const scaleY = (values.scaleY as number) || 100
    const opacity = (values.opacity as number) || 255
    const blendMode = parseInt((values.blendMode as string) || '0', 10)
    const duration = (values.duration as number) || 60
    const rotationSpeed = (values.rotationSpeed as number) || 1
    const tintRed = (values.tintRed as number) || 0
    const tintGreen = (values.tintGreen as number) || 0
    const tintBlue = (values.tintBlue as number) || 0
    const tintGray = (values.tintGray as number) || 0

    const lines: string[] = []

    if (operation === 'utility') {
      // Generate utility functions for all picture operations
      lines.push('// Picture Manipulation Utility Functions')
      lines.push('//')
      lines.push('// Helper functions for common picture operations.')
      lines.push('// Call these from plugin commands or other code.')
      lines.push('')

      lines.push('/**')
      lines.push(' * Show a picture on screen')
      lines.push(' * @param {number} pictureId - Picture ID (1-100)')
      lines.push(' * @param {string} name - Image filename (without extension)')
      lines.push(' * @param {number} x - X coordinate')
      lines.push(' * @param {number} y - Y coordinate')
      lines.push(' * @param {number} [origin=0] - 0 = Upper Left, 1 = Center')
      lines.push(' * @param {number} [scaleX=100] - Horizontal scale %')
      lines.push(' * @param {number} [scaleY=100] - Vertical scale %')
      lines.push(' * @param {number} [opacity=255] - Opacity (0-255)')
      lines.push(' * @param {number} [blendMode=0] - 0=Normal, 1=Additive, 2=Multiply, 3=Screen')
      lines.push(' */')
      lines.push(
        'function showPicture(pictureId, name, x, y, origin = 0, scaleX = 100, scaleY = 100, opacity = 255, blendMode = 0) {'
      )
      lines.push(
        '    $gameScreen.showPicture(pictureId, name, origin, x, y, scaleX, scaleY, opacity, blendMode);'
      )
      lines.push('}')
      lines.push('')

      lines.push('/**')
      lines.push(' * Move a picture to new position/properties over time')
      lines.push(' * @param {number} pictureId - Picture ID (1-100)')
      lines.push(' * @param {number} x - Target X coordinate')
      lines.push(' * @param {number} y - Target Y coordinate')
      lines.push(' * @param {number} [duration=60] - Animation duration in frames')
      lines.push(' * @param {number} [scaleX=100] - Target horizontal scale %')
      lines.push(' * @param {number} [scaleY=100] - Target vertical scale %')
      lines.push(' * @param {number} [opacity=255] - Target opacity (0-255)')
      lines.push(' * @param {number} [blendMode=0] - Target blend mode')
      lines.push(' * @param {number} [easingType=0] - Easing type (MZ only)')
      lines.push(' */')
      lines.push(
        'function movePicture(pictureId, x, y, duration = 60, scaleX = 100, scaleY = 100, opacity = 255, blendMode = 0, easingType = 0) {'
      )
      lines.push('    const picture = $gameScreen.picture(pictureId);')
      lines.push('    if (picture) {')
      lines.push('        const origin = picture.origin();')
      lines.push(
        '        $gameScreen.movePicture(pictureId, origin, x, y, scaleX, scaleY, opacity, blendMode, duration, easingType);'
      )
      lines.push('    }')
      lines.push('}')
      lines.push('')

      lines.push('/**')
      lines.push(' * Rotate a picture continuously')
      lines.push(' * @param {number} pictureId - Picture ID (1-100)')
      lines.push(
        ' * @param {number} speed - Rotation speed (degrees per frame, positive = clockwise)'
      )
      lines.push(' */')
      lines.push('function rotatePicture(pictureId, speed) {')
      lines.push('    $gameScreen.rotatePicture(pictureId, speed);')
      lines.push('}')
      lines.push('')

      lines.push('/**')
      lines.push(' * Apply color tint to a picture')
      lines.push(' * @param {number} pictureId - Picture ID (1-100)')
      lines.push(' * @param {number} red - Red adjustment (-255 to 255)')
      lines.push(' * @param {number} green - Green adjustment (-255 to 255)')
      lines.push(' * @param {number} blue - Blue adjustment (-255 to 255)')
      lines.push(' * @param {number} gray - Gray level (0-255, 0 = no gray)')
      lines.push(' * @param {number} [duration=60] - Tint animation duration')
      lines.push(' */')
      lines.push('function tintPicture(pictureId, red, green, blue, gray, duration = 60) {')
      lines.push('    $gameScreen.tintPicture(pictureId, [red, green, blue, gray], duration);')
      lines.push('}')
      lines.push('')

      lines.push('/**')
      lines.push(' * Erase a picture from screen')
      lines.push(' * @param {number} pictureId - Picture ID (1-100)')
      lines.push(' */')
      lines.push('function erasePicture(pictureId) {')
      lines.push('    $gameScreen.erasePicture(pictureId);')
      lines.push('}')
      lines.push('')

      lines.push('/**')
      lines.push(' * Fade out a picture over time')
      lines.push(' * @param {number} pictureId - Picture ID (1-100)')
      lines.push(' * @param {number} [duration=60] - Fade duration in frames')
      lines.push(' */')
      lines.push('function fadeOutPicture(pictureId, duration = 60) {')
      lines.push('    const picture = $gameScreen.picture(pictureId);')
      lines.push('    if (picture) {')
      lines.push('        const origin = picture.origin();')
      lines.push('        const x = picture.x();')
      lines.push('        const y = picture.y();')
      lines.push('        const scaleX = picture.scaleX();')
      lines.push('        const scaleY = picture.scaleY();')
      lines.push('        const blendMode = picture.blendMode();')
      lines.push(
        '        $gameScreen.movePicture(pictureId, origin, x, y, scaleX, scaleY, 0, blendMode, duration);'
      )
      lines.push('    }')
      lines.push('}')
    } else if (operation === 'show') {
      lines.push('// Show Picture')
      lines.push('//')
      lines.push(`// Displays picture ${pictureId} at position (${x}, ${y})`)
      lines.push('')
      lines.push(`$gameScreen.showPicture(`)
      lines.push(`    ${pictureId},         // Picture ID`)
      lines.push(`    '${imageName}',       // Image name (from img/pictures/)`)
      lines.push(`    ${origin},            // Origin (0 = Upper Left, 1 = Center)`)
      lines.push(`    ${x},                 // X position`)
      lines.push(`    ${y},                 // Y position`)
      lines.push(`    ${scaleX},            // Scale X (%)`)
      lines.push(`    ${scaleY},            // Scale Y (%)`)
      lines.push(`    ${opacity},           // Opacity (0-255)`)
      lines.push(
        `    ${blendMode}          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)`
      )
      lines.push(');')
    } else if (operation === 'move') {
      lines.push('// Move Picture')
      lines.push('//')
      lines.push(`// Moves picture ${pictureId} to (${x}, ${y}) over ${duration} frames`)
      lines.push('')
      lines.push(`$gameScreen.movePicture(`)
      lines.push(`    ${pictureId},         // Picture ID`)
      lines.push(`    ${origin},            // Origin (0 = Upper Left, 1 = Center)`)
      lines.push(`    ${x},                 // Target X position`)
      lines.push(`    ${y},                 // Target Y position`)
      lines.push(`    ${scaleX},            // Target Scale X (%)`)
      lines.push(`    ${scaleY},            // Target Scale Y (%)`)
      lines.push(`    ${opacity},           // Target Opacity (0-255)`)
      lines.push(`    ${blendMode},         // Target Blend mode`)
      lines.push(`    ${duration},          // Duration (frames)`)
      lines.push(`    0                     // Easing type (0 = constant speed)`)
      lines.push(');')
    } else if (operation === 'rotate') {
      lines.push('// Rotate Picture')
      lines.push('//')
      lines.push(`// Rotates picture ${pictureId} at ${rotationSpeed} degrees per frame`)
      lines.push('')
      lines.push(`$gameScreen.rotatePicture(${pictureId}, ${rotationSpeed});`)
      lines.push('')
      lines.push('// Note: Positive values rotate clockwise, negative counter-clockwise')
      lines.push('// To stop rotation, set speed to 0:')
      lines.push(`// $gameScreen.rotatePicture(${pictureId}, 0);`)
    } else if (operation === 'tint') {
      lines.push('// Tint Picture')
      lines.push('//')
      lines.push(`// Applies color tint to picture ${pictureId}`)
      lines.push('')
      lines.push(`$gameScreen.tintPicture(`)
      lines.push(`    ${pictureId},                                   // Picture ID`)
      lines.push(
        `    [${tintRed}, ${tintGreen}, ${tintBlue}, ${tintGray}],  // [Red, Green, Blue, Gray]`
      )
      lines.push(`    ${duration}                                     // Duration (frames)`)
      lines.push(');')
      lines.push('')
      lines.push('// Tint values: Red/Green/Blue = -255 to 255, Gray = 0 to 255')
      lines.push('// To remove tint: [0, 0, 0, 0]')
    } else if (operation === 'erase') {
      lines.push('// Erase Picture')
      lines.push('//')
      lines.push(`// Removes picture ${pictureId} from screen`)
      lines.push('')
      lines.push(`$gameScreen.erasePicture(${pictureId});`)
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const pictureId = values.pictureId as number
    if (pictureId === undefined || pictureId < 1 || pictureId > 100) {
      errors.push('Picture ID must be between 1 and 100')
    }

    const opacity = values.opacity as number
    if (opacity !== undefined && (opacity < 0 || opacity > 255)) {
      errors.push('Opacity must be between 0 and 255')
    }

    const operation = values.operation as string
    if (operation === 'show' && !values.imageName) {
      errors.push('Image Name is required for Show Picture operation')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 3: Sprite Animation
 * Add frame-based animation to sprites
 */
const spriteAnimationTemplate: CodeTemplate = {
  id: 'sprite-frame-animation',
  category: 'sprite-system',
  name: 'Sprite Animation',
  description: 'Add frame-based animation to sprites using spritesheets',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/Sprite.html',
  icon: 'Image',
  fields: [
    {
      id: 'animationType',
      label: 'Animation Type',
      type: 'select',
      required: true,
      options: [
        { value: 'horizontal', label: 'Horizontal Strip - Frames in a row' },
        { value: 'vertical', label: 'Vertical Strip - Frames in a column' },
        { value: 'grid', label: 'Grid - Frames in rows and columns' },
        { value: 'mixin', label: 'Animation Mixin - Add to existing sprite' }
      ],
      default: 'horizontal',
      help: 'How frames are arranged in the spritesheet'
    },
    {
      id: 'spriteName',
      label: 'Sprite Class Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., AnimatedIcon',
      help: 'Name for your animated sprite class (without Sprite_ prefix)'
    },
    {
      id: 'frameCount',
      label: 'Frame Count',
      type: 'number',
      default: 4,
      help: 'Number of animation frames'
    },
    {
      id: 'frameWidth',
      label: 'Frame Width',
      type: 'number',
      default: 48,
      help: 'Width of each frame in pixels'
    },
    {
      id: 'frameHeight',
      label: 'Frame Height',
      type: 'number',
      default: 48,
      help: 'Height of each frame in pixels'
    },
    {
      id: 'columns',
      label: 'Columns',
      type: 'number',
      default: 4,
      help: 'Number of columns in grid layout',
      dependsOn: { field: 'animationType', value: 'grid' }
    },
    {
      id: 'frameDelay',
      label: 'Frame Delay',
      type: 'number',
      default: 12,
      help: 'Frames to wait before advancing animation (60 = 1 second)'
    },
    {
      id: 'loop',
      label: 'Loop Animation',
      type: 'boolean',
      default: true,
      help: 'Whether the animation should loop'
    },
    {
      id: 'autoPlay',
      label: 'Auto Play',
      type: 'boolean',
      default: true,
      help: 'Start animation automatically on creation'
    },
    {
      id: 'targetClass',
      label: 'Target Sprite Class',
      type: 'text',
      placeholder: 'e.g., Sprite_Character',
      help: 'Class to add animation mixin to',
      dependsOn: { field: 'animationType', value: 'mixin' }
    }
  ],
  generate: (values): string => {
    const animationType = (values.animationType as string) || 'horizontal'
    const rawName = values.spriteName as string
    const spriteName = sanitizeSpriteName(rawName)
    const frameCount = (values.frameCount as number) || 4
    const frameWidth = (values.frameWidth as number) || 48
    const frameHeight = (values.frameHeight as number) || 48
    const columns = (values.columns as number) || 4
    const frameDelay = (values.frameDelay as number) || 12
    const loop = values.loop !== false
    const autoPlay = values.autoPlay !== false
    const targetClass = (values.targetClass as string) || 'Sprite_Base'

    const fullClassName = `Sprite_${spriteName}`
    const lines: string[] = []

    if (animationType === 'mixin') {
      // Generate mixin code for existing sprites
      lines.push('// Animation Mixin')
      lines.push('//')
      lines.push(`// Adds frame-based animation to ${targetClass}`)
      lines.push('//-----------------------------------------------------------------------------')
      lines.push('')

      lines.push(`// Store original initialize`)
      lines.push(`const _${targetClass}_initialize = ${targetClass}.prototype.initialize;`)
      lines.push(`${targetClass}.prototype.initialize = function() {`)
      lines.push(`    _${targetClass}_initialize.apply(this, arguments);`)
      lines.push('    this._animFrameCount = 0;')
      lines.push('    this._animPattern = 0;')
      lines.push(`    this._animMaxPattern = ${frameCount};`)
      lines.push(`    this._animDelay = ${frameDelay};`)
      lines.push(`    this._animLoop = ${loop};`)
      lines.push(`    this._animPlaying = ${autoPlay};`)
      lines.push('};')
      lines.push('')

      lines.push(`// Store original update`)
      lines.push(`const _${targetClass}_update = ${targetClass}.prototype.update;`)
      lines.push(`${targetClass}.prototype.update = function() {`)
      lines.push(`    _${targetClass}_update.call(this);`)
      lines.push('    if (this._animPlaying) {')
      lines.push('        this.updateFrameAnimation();')
      lines.push('    }')
      lines.push('};')
      lines.push('')

      lines.push(`${targetClass}.prototype.updateFrameAnimation = function() {`)
      lines.push('    this._animFrameCount++;')
      lines.push('    if (this._animFrameCount >= this._animDelay) {')
      lines.push('        this._animFrameCount = 0;')
      lines.push('        this._animPattern++;')
      lines.push('        if (this._animPattern >= this._animMaxPattern) {')
      lines.push('            if (this._animLoop) {')
      lines.push('                this._animPattern = 0;')
      lines.push('            } else {')
      lines.push('                this._animPattern = this._animMaxPattern - 1;')
      lines.push('                this._animPlaying = false;')
      lines.push('            }')
      lines.push('        }')
      lines.push('        this.updateAnimationFrame();')
      lines.push('    }')
      lines.push('};')
      lines.push('')

      lines.push(`${targetClass}.prototype.updateAnimationFrame = function() {`)
      lines.push('    // Override this method to set the frame based on this._animPattern')
      if (columns > 1) {
        lines.push(`    const col = this._animPattern % ${columns};`)
        lines.push(`    const row = Math.floor(this._animPattern / ${columns});`)
        lines.push(
          `    this.setFrame(col * ${frameWidth}, row * ${frameHeight}, ${frameWidth}, ${frameHeight});`
        )
      } else {
        lines.push(
          `    this.setFrame(this._animPattern * ${frameWidth}, 0, ${frameWidth}, ${frameHeight});`
        )
      }
      lines.push('};')
      lines.push('')

      lines.push(`// Animation control methods`)
      lines.push(`${targetClass}.prototype.playAnimation = function() {`)
      lines.push('    this._animPlaying = true;')
      lines.push('    this._animPattern = 0;')
      lines.push('    this._animFrameCount = 0;')
      lines.push('};')
      lines.push('')

      lines.push(`${targetClass}.prototype.stopAnimation = function() {`)
      lines.push('    this._animPlaying = false;')
      lines.push('};')
      lines.push('')

      lines.push(`${targetClass}.prototype.pauseAnimation = function() {`)
      lines.push('    this._animPlaying = false;')
      lines.push('};')
      lines.push('')

      lines.push(`${targetClass}.prototype.resumeAnimation = function() {`)
      lines.push('    this._animPlaying = true;')
      lines.push('};')
    } else {
      // Generate standalone animated sprite class
      lines.push('//-----------------------------------------------------------------------------')
      lines.push(`// ${fullClassName}`)
      lines.push('//')
      lines.push('// Animated sprite with frame-based animation support.')
      lines.push('//-----------------------------------------------------------------------------')
      lines.push('')

      // Constructor
      lines.push(`function ${fullClassName}() {`)
      lines.push('    this.initialize(...arguments);')
      lines.push('}')
      lines.push('')

      // Prototype chain
      lines.push(`${fullClassName}.prototype = Object.create(Sprite.prototype);`)
      lines.push(`${fullClassName}.prototype.constructor = ${fullClassName};`)
      lines.push('')

      // Initialize
      lines.push(`${fullClassName}.prototype.initialize = function(imageName) {`)
      lines.push('    Sprite.prototype.initialize.call(this);')
      lines.push('')
      lines.push('    // Animation properties')
      lines.push('    this._animFrameCount = 0;')
      lines.push('    this._animPattern = 0;')
      lines.push(`    this._animMaxPattern = ${frameCount};`)
      lines.push(`    this._animDelay = ${frameDelay};`)
      lines.push(`    this._animLoop = ${loop};`)
      lines.push(`    this._animPlaying = ${autoPlay};`)
      lines.push(`    this._frameWidth = ${frameWidth};`)
      lines.push(`    this._frameHeight = ${frameHeight};`)

      if (animationType === 'grid') {
        lines.push(`    this._columns = ${columns};`)
      }

      lines.push('')
      lines.push('    // Load bitmap if provided')
      lines.push('    if (imageName) {')
      lines.push('        this.bitmap = ImageManager.loadPicture(imageName);')
      lines.push('        this.bitmap.addLoadListener(this.onBitmapLoad.bind(this));')
      lines.push('    }')
      lines.push('};')
      lines.push('')

      // Bitmap load callback
      lines.push(`${fullClassName}.prototype.onBitmapLoad = function() {`)
      lines.push('    // Set initial frame')
      lines.push('    this.updateAnimationFrame();')
      lines.push('};')
      lines.push('')

      // Update
      lines.push(`${fullClassName}.prototype.update = function() {`)
      lines.push('    Sprite.prototype.update.call(this);')
      lines.push('    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {')
      lines.push('        this.updateFrameAnimation();')
      lines.push('    }')
      lines.push('};')
      lines.push('')

      // Update animation
      lines.push(`${fullClassName}.prototype.updateFrameAnimation = function() {`)
      lines.push('    this._animFrameCount++;')
      lines.push('    if (this._animFrameCount >= this._animDelay) {')
      lines.push('        this._animFrameCount = 0;')
      lines.push('        this._animPattern++;')
      lines.push('        if (this._animPattern >= this._animMaxPattern) {')
      lines.push('            if (this._animLoop) {')
      lines.push('                this._animPattern = 0;')
      lines.push('            } else {')
      lines.push('                this._animPattern = this._animMaxPattern - 1;')
      lines.push('                this._animPlaying = false;')
      lines.push('                this.onAnimationEnd();')
      lines.push('            }')
      lines.push('        }')
      lines.push('        this.updateAnimationFrame();')
      lines.push('    }')
      lines.push('};')
      lines.push('')

      // Update frame based on animation type
      lines.push(`${fullClassName}.prototype.updateAnimationFrame = function() {`)
      if (animationType === 'horizontal') {
        lines.push('    // Horizontal strip layout')
        lines.push('    const x = this._animPattern * this._frameWidth;')
        lines.push('    this.setFrame(x, 0, this._frameWidth, this._frameHeight);')
      } else if (animationType === 'vertical') {
        lines.push('    // Vertical strip layout')
        lines.push('    const y = this._animPattern * this._frameHeight;')
        lines.push('    this.setFrame(0, y, this._frameWidth, this._frameHeight);')
      } else if (animationType === 'grid') {
        lines.push('    // Grid layout')
        lines.push('    const col = this._animPattern % this._columns;')
        lines.push('    const row = Math.floor(this._animPattern / this._columns);')
        lines.push('    const x = col * this._frameWidth;')
        lines.push('    const y = row * this._frameHeight;')
        lines.push('    this.setFrame(x, y, this._frameWidth, this._frameHeight);')
      }
      lines.push('};')
      lines.push('')

      // Animation end callback
      lines.push(`${fullClassName}.prototype.onAnimationEnd = function() {`)
      lines.push('    // Override this for custom behavior when animation ends')
      lines.push('};')
      lines.push('')

      // Control methods
      lines.push('// Animation Control Methods')
      lines.push('')

      lines.push(`${fullClassName}.prototype.play = function() {`)
      lines.push('    this._animPlaying = true;')
      lines.push('    this._animPattern = 0;')
      lines.push('    this._animFrameCount = 0;')
      lines.push('};')
      lines.push('')

      lines.push(`${fullClassName}.prototype.stop = function() {`)
      lines.push('    this._animPlaying = false;')
      lines.push('    this._animPattern = 0;')
      lines.push('    this._animFrameCount = 0;')
      lines.push('    this.updateAnimationFrame();')
      lines.push('};')
      lines.push('')

      lines.push(`${fullClassName}.prototype.pause = function() {`)
      lines.push('    this._animPlaying = false;')
      lines.push('};')
      lines.push('')

      lines.push(`${fullClassName}.prototype.resume = function() {`)
      lines.push('    this._animPlaying = true;')
      lines.push('};')
      lines.push('')

      lines.push(`${fullClassName}.prototype.setFrameDelay = function(delay) {`)
      lines.push('    this._animDelay = delay;')
      lines.push('};')
      lines.push('')

      lines.push(`${fullClassName}.prototype.setLoop = function(loop) {`)
      lines.push('    this._animLoop = loop;')
      lines.push('};')
      lines.push('')

      lines.push(`${fullClassName}.prototype.gotoFrame = function(frame) {`)
      lines.push('    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));')
      lines.push('    this._animFrameCount = 0;')
      lines.push('    this.updateAnimationFrame();')
      lines.push('};')
      lines.push('')

      lines.push(`${fullClassName}.prototype.isPlaying = function() {`)
      lines.push('    return this._animPlaying;')
      lines.push('};')
      lines.push('')

      lines.push(`${fullClassName}.prototype.currentFrame = function() {`)
      lines.push('    return this._animPattern;')
      lines.push('};')
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.spriteName) {
      errors.push('Sprite Class Name is required')
    } else {
      const name = values.spriteName as string
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name.trim().replace(/\s+/g, ''))) {
        errors.push('Sprite Name must start with a letter and contain only letters and numbers')
      }
    }

    const frameCount = values.frameCount as number
    if (frameCount !== undefined && frameCount < 1) {
      errors.push('Frame Count must be at least 1')
    }

    const frameWidth = values.frameWidth as number
    if (frameWidth !== undefined && frameWidth <= 0) {
      errors.push('Frame Width must be a positive number')
    }

    const frameHeight = values.frameHeight as number
    if (frameHeight !== undefined && frameHeight <= 0) {
      errors.push('Frame Height must be a positive number')
    }

    const frameDelay = values.frameDelay as number
    if (frameDelay !== undefined && frameDelay < 1) {
      errors.push('Frame Delay must be at least 1')
    }

    const animationType = values.animationType as string
    if (animationType === 'mixin' && !values.targetClass) {
      errors.push('Target Sprite Class is required for Animation Mixin')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register all templates when this module loads
registerTemplate(customSpriteClassTemplate)
registerTemplate(pictureManipulationTemplate)
registerTemplate(spriteAnimationTemplate)

export { customSpriteClassTemplate, pictureManipulationTemplate, spriteAnimationTemplate }
