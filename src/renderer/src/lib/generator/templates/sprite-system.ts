/**
Sprite System Templates

Templates for RPG Maker MZ sprite manipulation:
- Custom sprite class creation
- Picture manipulation (show, move, rotate, tint)
- Sprite animation (frame-based)
*/

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'
import { escapeJSString } from '../escape'
import { decimalIntegerOf, expectText, valueOr } from './values'

/**
Converts a sprite name to a valid identifier
Strips spaces and ensures PascalCase
*/
function sanitizeSpriteName(name: string): string {
  return name
    .trim()
    .replaceAll(/[^a-z0-9]/gi, '')
    .replace(/^[a-z]/, (c) => c.toUpperCase())
}

/**
The error for a sprite name that is set but is not a letter followed by letters and digits.
*/
function spriteNameErrors(value: unknown): string[] {
  const hasName = Boolean(value)
  if (!hasName) return []
  const name = expectText(value)
  const isValid = /^[a-z][a-z0-9]*$/i.test(name.trim().replaceAll(/\s+/g, ''))
  return isValid
    ? []
    : ['Sprite Name must start with a letter and contain only letters and numbers']
}

/**
The initialize lines that set up frame animation state, shared by the mixin and the sprite class.
*/
function animationStateLines(
  frameCount: unknown,
  frameDelay: unknown,
  shouldLoop: boolean,
  shouldAutoPlay: boolean
): string[] {
  return [
    '    this._animFrameCount = 0;',
    '    this._animPattern = 0;',
    `    this._animMaxPattern = ${String(frameCount)};`,
    `    this._animDelay = ${String(frameDelay)};`,
    `    this._animLoop = ${String(shouldLoop)};`,
    `    this._animPlaying = ${String(shouldAutoPlay)};`
  ]
}

/**
The initialize lines that set the sprite's bitmap the way the Create Bitmap option asks.
*/
function spriteBitmapLines(useBitmap: unknown, size: string, fillColor: unknown): string[] {
  if (useBitmap === 'empty') {
    return ['    // Create empty bitmap', `    this.bitmap = new Bitmap(${size});`]
  }
  if (useBitmap === 'filled') {
    return [
      '    // Create filled bitmap',
      `    this.bitmap = new Bitmap(${size});`,
      `    this.bitmap.fillRect(0, 0, ${size}, '${escapeJSString(expectText(fillColor))}');`
    ]
  }
  return [
    '    // Load external image',
    "    // this.bitmap = ImageManager.loadPicture('your_image');"
  ]
}

/**
The update, updateAnimation and updatePattern methods of the custom sprite class.
*/
function spriteUpdateLines(fullClassName: string, parentClassText: string): string[] {
  return [
    '',
    `${fullClassName}.prototype.update = function() {`,
    `    ${parentClassText}.prototype.update.call(this);`,
    '',
    '    // Update animation',
    '    this.updateAnimation();',
    '};',
    '',
    `${fullClassName}.prototype.updateAnimation = function() {`,
    '    this._animationCount++;',
    '',
    '    // Example: Update every 12 frames',
    '    if (this._animationCount >= 12) {',
    '        this._animationCount = 0;',
    '        this._pattern = (this._pattern + 1) % 4;',
    '        // Update sprite based on pattern',
    '        this.updatePattern();',
    '    }',
    '};',
    '',
    `${fullClassName}.prototype.updatePattern = function() {`,
    '    // Override this to update sprite based on this._pattern',
    '    // Example: Change frame for spritesheet',
    '    // const frameWidth = this.bitmap.width / 4;',
    '    // this.setFrame(this._pattern * frameWidth, 0, frameWidth, this.bitmap.height);',
    '};'
  ]
}

/**
Template 1: Custom Sprite Class
Creates a new Sprite subclass with initialize, update methods
*/
const customSpriteClassTemplate: CodeTemplate = {
  id: 'sprite-custom-class',
  category: 'sprite-system',
  name: 'Custom Sprite Class',
  description: 'Create a new Sprite subclass with initialize and update methods',
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
    const rawName = expectText(values['spriteName'])
    const spriteName = sanitizeSpriteName(rawName)
    const parentClass = valueOr(values['parentClass'], 'Sprite')
    const width = valueOr(values['width'], 48)
    const height = valueOr(values['height'], 48)
    const useBitmap = valueOr(values['useBitmap'], 'none')
    const fillColor = valueOr(values['fillColor'], '#ffffff')
    const isIncludeUpdate = values['includeUpdate'] !== false

    const fullClassName = `Sprite_${spriteName}`
    const parentClassText = String(parentClass)
    const size = `${String(width)}, ${String(height)}`

    const lines = [
      // Header comment
      '//-----------------------------------------------------------------------------',
      `// ${fullClassName}`,
      '//',
      `// Custom sprite class extending ${parentClassText}.`,
      '//-----------------------------------------------------------------------------',
      '',
      // Constructor function
      `function ${fullClassName}() {`,
      '    this.initialize(...arguments);',
      '}',
      '',
      // Prototype chain setup
      `${fullClassName}.prototype = Object.create(${parentClassText}.prototype);`,
      `${fullClassName}.prototype.constructor = ${fullClassName};`,
      '',
      // Initialize method
      `${fullClassName}.prototype.initialize = function() {`,
      `    ${parentClassText}.prototype.initialize.call(this);`,
      '',
      '    // Initialize sprite properties',
      '    this._animationCount = 0;',
      '    this._pattern = 0;',
      '',
      ...spriteBitmapLines(useBitmap, size, fillColor),
      '',
      '    // Set anchor to center (optional)',
      '    this.anchor.x = 0.5;',
      '    this.anchor.y = 0.5;',
      '};'
    ]
    if (isIncludeUpdate) lines.push(...spriteUpdateLines(fullClassName, parentClassText))

    // Add click handler for Sprite_Clickable
    if (parentClass === 'Sprite_Clickable') {
      lines.push(
        '',
        `${fullClassName}.prototype.onClick = function() {`,
        '    // Handle click/touch',
        `    console.log('${fullClassName} clicked!');`,
        '};'
      )
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors = spriteNameErrors(values['spriteName'])

    const width = values['width']
    if (width !== undefined && Number(width) <= 0) {
      errors.push('Width must be a positive number')
    }

    const height = values['height']
    if (height !== undefined && Number(height) <= 0) {
      errors.push('Height must be a positive number')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
The picture values as the generated calls print them.
*/
interface PictureArgs {
  id: string
  imageName: unknown
  origin: number
  x: string
  y: string
  scaleX: string
  scaleY: string
  opacity: string
  blendMode: number
  duration: string
  rotationSpeed: string
  tint: string
}

/**
Helper functions for every picture operation, for the utility option.
*/
const PICTURE_UTILITY_LINES = [
  // Generate utility functions for all picture operations
  '// Picture Manipulation Utility Functions',
  '//',
  '// Helper functions for common picture operations.',
  '// Call these from plugin commands or other code.',
  '',
  '/**',
  ' * Show a picture on screen',
  ' * @param {number} pictureId - Picture ID (1-100)',
  ' * @param {string} name - Image filename (without extension)',
  ' * @param {number} x - X coordinate',
  ' * @param {number} y - Y coordinate',
  ' * @param {number} [origin=0] - 0 = Upper Left, 1 = Center',
  ' * @param {number} [scaleX=100] - Horizontal scale %',
  ' * @param {number} [scaleY=100] - Vertical scale %',
  ' * @param {number} [opacity=255] - Opacity (0-255)',
  ' * @param {number} [blendMode=0] - 0=Normal, 1=Additive, 2=Multiply, 3=Screen',
  ' */',
  'function showPicture(pictureId, name, x, y, origin = 0, scaleX = 100, scaleY = 100, opacity = 255, blendMode = 0) {',
  '    $gameScreen.showPicture(pictureId, name, origin, x, y, scaleX, scaleY, opacity, blendMode);',
  '}',
  '',
  '/**',
  ' * Move a picture to new position/properties over time',
  ' * @param {number} pictureId - Picture ID (1-100)',
  ' * @param {number} x - Target X coordinate',
  ' * @param {number} y - Target Y coordinate',
  ' * @param {number} [duration=60] - Animation duration in frames',
  ' * @param {number} [scaleX=100] - Target horizontal scale %',
  ' * @param {number} [scaleY=100] - Target vertical scale %',
  ' * @param {number} [opacity=255] - Target opacity (0-255)',
  ' * @param {number} [blendMode=0] - Target blend mode',
  ' * @param {number} [easingType=0] - Easing type (MZ only)',
  ' */',
  'function movePicture(pictureId, x, y, duration = 60, scaleX = 100, scaleY = 100, opacity = 255, blendMode = 0, easingType = 0) {',
  '    const picture = $gameScreen.picture(pictureId);',
  '    if (picture) {',
  '        const origin = picture.origin();',
  '        $gameScreen.movePicture(pictureId, origin, x, y, scaleX, scaleY, opacity, blendMode, duration, easingType);',
  '    }',
  '}',
  '',
  '/**',
  ' * Rotate a picture continuously',
  ' * @param {number} pictureId - Picture ID (1-100)',
  ' * @param {number} speed - Rotation speed (degrees per frame, positive = clockwise)',
  ' */',
  'function rotatePicture(pictureId, speed) {',
  '    $gameScreen.rotatePicture(pictureId, speed);',
  '}',
  '',
  '/**',
  ' * Apply color tint to a picture',
  ' * @param {number} pictureId - Picture ID (1-100)',
  ' * @param {number} red - Red adjustment (-255 to 255)',
  ' * @param {number} green - Green adjustment (-255 to 255)',
  ' * @param {number} blue - Blue adjustment (-255 to 255)',
  ' * @param {number} gray - Gray level (0-255, 0 = no gray)',
  ' * @param {number} [duration=60] - Tint animation duration',
  ' */',
  'function tintPicture(pictureId, red, green, blue, gray, duration = 60) {',
  '    $gameScreen.tintPicture(pictureId, [red, green, blue, gray], duration);',
  '}',
  '',
  '/**',
  ' * Erase a picture from screen',
  ' * @param {number} pictureId - Picture ID (1-100)',
  ' */',
  'function erasePicture(pictureId) {',
  '    $gameScreen.erasePicture(pictureId);',
  '}',
  '',
  '/**',
  ' * Fade out a picture over time',
  ' * @param {number} pictureId - Picture ID (1-100)',
  ' * @param {number} [duration=60] - Fade duration in frames',
  ' */',
  'function fadeOutPicture(pictureId, duration = 60) {',
  '    const picture = $gameScreen.picture(pictureId);',
  '    if (picture) {',
  '        const origin = picture.origin();',
  '        const x = picture.x();',
  '        const y = picture.y();',
  '        const scaleX = picture.scaleX();',
  '        const scaleY = picture.scaleY();',
  '        const blendMode = picture.blendMode();',
  '        $gameScreen.movePicture(pictureId, origin, x, y, scaleX, scaleY, 0, blendMode, duration);',
  '    }',
  '}'
]

/**
A showPicture call with the picture values.
*/
function showPictureLines(picture: PictureArgs): string[] {
  return [
    '// Show Picture',
    '//',
    `// Displays picture ${picture.id} at position (${picture.x}, ${picture.y})`,
    '',
    `$gameScreen.showPicture(`,
    `    ${picture.id},         // Picture ID`,
    `    '${escapeJSString(expectText(picture.imageName))}',       // Image name (from img/pictures/)`,
    `    ${picture.origin},            // Origin (0 = Upper Left, 1 = Center)`,
    `    ${picture.x},                 // X position`,
    `    ${picture.y},                 // Y position`,
    `    ${picture.scaleX},            // Scale X (%)`,
    `    ${picture.scaleY},            // Scale Y (%)`,
    `    ${picture.opacity},           // Opacity (0-255)`,
    `    ${picture.blendMode}          // Blend mode (0=Normal, 1=Additive, 2=Multiply, 3=Screen)`,
    ');'
  ]
}

/**
A movePicture call with the picture values.
*/
function movePictureLines(picture: PictureArgs): string[] {
  return [
    '// Move Picture',
    '//',
    `// Moves picture ${picture.id} to (${picture.x}, ${picture.y}) over ${picture.duration} frames`,
    '',
    `$gameScreen.movePicture(`,
    `    ${picture.id},         // Picture ID`,
    `    ${picture.origin},            // Origin (0 = Upper Left, 1 = Center)`,
    `    ${picture.x},                 // Target X position`,
    `    ${picture.y},                 // Target Y position`,
    `    ${picture.scaleX},            // Target Scale X (%)`,
    `    ${picture.scaleY},            // Target Scale Y (%)`,
    `    ${picture.opacity},           // Target Opacity (0-255)`,
    `    ${picture.blendMode},         // Target Blend mode`,
    `    ${picture.duration},          // Duration (frames)`,
    `    0                     // Easing type (0 = constant speed)`,
    ');'
  ]
}

/**
A rotatePicture call with the picture values.
*/
function rotatePictureLines(picture: PictureArgs): string[] {
  return [
    '// Rotate Picture',
    '//',
    `// Rotates picture ${picture.id} at ${picture.rotationSpeed} degrees per frame`,
    '',
    `$gameScreen.rotatePicture(${picture.id}, ${picture.rotationSpeed});`,
    '',
    '// Note: Positive values rotate clockwise, negative counter-clockwise',
    '// To stop rotation, set speed to 0:',
    `// $gameScreen.rotatePicture(${picture.id}, 0);`
  ]
}

/**
A tintPicture call with the picture values.
*/
function tintPictureLines(picture: PictureArgs): string[] {
  return [
    '// Tint Picture',
    '//',
    `// Applies color tint to picture ${picture.id}`,
    '',
    `$gameScreen.tintPicture(`,
    `    ${picture.id},                                   // Picture ID`,
    `    [${picture.tint}],  // [Red, Green, Blue, Gray]`,
    `    ${picture.duration}                                     // Duration (frames)`,
    ');',
    '',
    '// Tint values: Red/Green/Blue = -255 to 255, Gray = 0 to 255',
    '// To remove tint: [0, 0, 0, 0]'
  ]
}

/**
An erasePicture call with the picture values.
*/
function erasePictureLines(picture: PictureArgs): string[] {
  return [
    '// Erase Picture',
    '//',
    `// Removes picture ${picture.id} from screen`,
    '',
    `$gameScreen.erasePicture(${picture.id});`
  ]
}

/**
The code lines for a picture operation; none for an operation that is not on the list.
*/
function pictureOperationLines(operation: unknown, picture: PictureArgs): string[] {
  switch (operation) {
    case 'utility': {
      return PICTURE_UTILITY_LINES
    }
    case 'show': {
      return showPictureLines(picture)
    }
    case 'move': {
      return movePictureLines(picture)
    }
    case 'rotate': {
      return rotatePictureLines(picture)
    }
    case 'tint': {
      return tintPictureLines(picture)
    }
    case 'erase': {
      return erasePictureLines(picture)
    }
    default: {
      return []
    }
  }
}

/**
Template 2: Picture Manipulation
Show, move, rotate, and tint pictures programmatically
*/
const pictureManipulationTemplate: CodeTemplate = {
  id: 'sprite-picture-manipulation',
  category: 'sprite-system',
  name: 'Picture Manipulation',
  description: 'Show, move, rotate, and tint pictures programmatically',
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
    const operation = valueOr(values['operation'], 'show')
    const picture: PictureArgs = {
      id: String(valueOr(values['pictureId'], 1)),
      imageName: valueOr(values['imageName'], 'Picture1'),
      origin: decimalIntegerOf(String(valueOr(values['origin'], '0'))),
      x: String(valueOr(values['x'], 0)),
      y: String(valueOr(values['y'], 0)),
      scaleX: String(valueOr(values['scaleX'], 100)),
      scaleY: String(valueOr(values['scaleY'], 100)),
      opacity: String(valueOr(values['opacity'], 255)),
      blendMode: decimalIntegerOf(String(valueOr(values['blendMode'], '0'))),
      duration: String(valueOr(values['duration'], 60)),
      rotationSpeed: String(valueOr(values['rotationSpeed'], 1)),
      tint: [
        valueOr(values['tintRed'], 0),
        valueOr(values['tintGreen'], 0),
        valueOr(values['tintBlue'], 0),
        valueOr(values['tintGray'], 0)
      ]
        .map(String)
        .join(', ')
    }

    return pictureOperationLines(operation, picture).join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    const pictureId = values['pictureId']
    if (pictureId === undefined || Number(pictureId) < 1 || Number(pictureId) > 100) {
      errors.push('Picture ID must be between 1 and 100')
    }

    const opacity = values['opacity']
    if (opacity !== undefined && (Number(opacity) < 0 || Number(opacity) > 255)) {
      errors.push('Opacity must be between 0 and 255')
    }

    const operation = values['operation']
    const hasImageName = Boolean(values['imageName'])
    if (operation === 'show' && !hasImageName) {
      errors.push('Image Name is required for Show Picture operation')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
The frame animation settings as the generated code uses them.
*/
interface FrameAnimation {
  frameCount: unknown
  frameWidth: string
  frameHeight: string
  columns: unknown
  frameDelay: unknown
  isLoop: boolean
  isAutoPlay: boolean
}

/**
The mixin's frame selection: by column and row when there is more than one column, along a row
otherwise.
*/
function mixinFrameLines(animation: FrameAnimation): string[] {
  const { frameWidth, frameHeight } = animation
  if (Number(animation.columns) > 1) {
    const columns = String(animation.columns)
    return [
      `    const col = this._animPattern % ${columns};`,
      `    const row = Math.floor(this._animPattern / ${columns});`,
      `    this.setFrame(col * ${frameWidth}, row * ${frameHeight}, ${frameWidth}, ${frameHeight});`
    ]
  }
  return [`    this.setFrame(this._animPattern * ${frameWidth}, 0, ${frameWidth}, ${frameHeight});`]
}

/**
The mixin's hooks into the target class: initialize, update and the frame counter.
*/
function mixinHookLines(target: string, animation: FrameAnimation): string[] {
  return [
    // Generate mixin code for existing sprites
    '// Animation Mixin',
    '//',
    `// Adds frame-based animation to ${target}`,
    '//-----------------------------------------------------------------------------',
    '',
    `// Store original initialize`,
    `const _${target}_initialize = ${target}.prototype.initialize;`,
    `${target}.prototype.initialize = function() {`,
    `    _${target}_initialize.apply(this, arguments);`,
    ...animationStateLines(
      animation.frameCount,
      animation.frameDelay,
      animation.isLoop,
      animation.isAutoPlay
    ),
    '};',
    '',
    `// Store original update`,
    `const _${target}_update = ${target}.prototype.update;`,
    `${target}.prototype.update = function() {`,
    `    _${target}_update.call(this);`,
    '    if (this._animPlaying) {',
    '        this.updateFrameAnimation();',
    '    }',
    '};',
    '',
    `${target}.prototype.updateFrameAnimation = function() {`,
    '    this._animFrameCount++;',
    '    if (this._animFrameCount >= this._animDelay) {',
    '        this._animFrameCount = 0;',
    '        this._animPattern++;',
    '        if (this._animPattern >= this._animMaxPattern) {',
    '            if (this._animLoop) {',
    '                this._animPattern = 0;',
    '            } else {',
    '                this._animPattern = this._animMaxPattern - 1;',
    '                this._animPlaying = false;',
    '            }',
    '        }',
    '        this.updateAnimationFrame();',
    '    }',
    '};',
    ''
  ]
}

/**
The mixin's frame selection and its play, stop, pause and resume methods.
*/
function mixinControlLines(target: string, animation: FrameAnimation): string[] {
  return [
    `${target}.prototype.updateAnimationFrame = function() {`,
    '    // Override this method to set the frame based on this._animPattern',
    ...mixinFrameLines(animation),
    '};',
    '',
    `// Animation control methods`,
    `${target}.prototype.playAnimation = function() {`,
    '    this._animPlaying = true;',
    '    this._animPattern = 0;',
    '    this._animFrameCount = 0;',
    '};',
    '',
    `${target}.prototype.stopAnimation = function() {`,
    '    this._animPlaying = false;',
    '};',
    '',
    `${target}.prototype.pauseAnimation = function() {`,
    '    this._animPlaying = false;',
    '};',
    '',
    `${target}.prototype.resumeAnimation = function() {`,
    '    this._animPlaying = true;',
    '};'
  ]
}

/**
The animated sprite class from its header to its update method.
*/
function animatedClassSetupLines(
  fullClassName: string,
  animation: FrameAnimation,
  isGrid: boolean
): string[] {
  const lines = [
    // Generate standalone animated sprite class
    '//-----------------------------------------------------------------------------',
    `// ${fullClassName}`,
    '//',
    '// Animated sprite with frame-based animation support.',
    '//-----------------------------------------------------------------------------',
    '',
    // Constructor
    `function ${fullClassName}() {`,
    '    this.initialize(...arguments);',
    '}',
    '',
    // Prototype chain
    `${fullClassName}.prototype = Object.create(Sprite.prototype);`,
    `${fullClassName}.prototype.constructor = ${fullClassName};`,
    '',
    // Initialize
    `${fullClassName}.prototype.initialize = function(imageName) {`,
    '    Sprite.prototype.initialize.call(this);',
    '',
    '    // Animation properties',
    ...animationStateLines(
      animation.frameCount,
      animation.frameDelay,
      animation.isLoop,
      animation.isAutoPlay
    ),
    `    this._frameWidth = ${animation.frameWidth};`,
    `    this._frameHeight = ${animation.frameHeight};`
  ]
  if (isGrid) lines.push(`    this._columns = ${String(animation.columns)};`)
  lines.push(
    '',
    '    // Load bitmap if provided',
    '    if (imageName) {',
    '        this.bitmap = ImageManager.loadPicture(imageName);',
    '        this.bitmap.addLoadListener(this.onBitmapLoad.bind(this));',
    '    }',
    '};',
    '',
    // Bitmap load callback
    `${fullClassName}.prototype.onBitmapLoad = function() {`,
    '    // Set initial frame',
    '    this.updateAnimationFrame();',
    '};',
    '',
    // Update
    `${fullClassName}.prototype.update = function() {`,
    '    Sprite.prototype.update.call(this);',
    '    if (this._animPlaying && this.bitmap && this.bitmap.isReady()) {',
    '        this.updateFrameAnimation();',
    '    }',
    '};',
    ''
  )
  return lines
}

/**
The frame selection for the spritesheet layout; none for a layout that is not on the list.
*/
function frameLayoutLines(animationType: unknown): string[] {
  switch (animationType) {
    case 'horizontal': {
      return [
        '    // Horizontal strip layout',
        '    const x = this._animPattern * this._frameWidth;',
        '    this.setFrame(x, 0, this._frameWidth, this._frameHeight);'
      ]
    }
    case 'vertical': {
      return [
        '    // Vertical strip layout',
        '    const y = this._animPattern * this._frameHeight;',
        '    this.setFrame(0, y, this._frameWidth, this._frameHeight);'
      ]
    }
    case 'grid': {
      return [
        '    // Grid layout',
        '    const col = this._animPattern % this._columns;',
        '    const row = Math.floor(this._animPattern / this._columns);',
        '    const x = col * this._frameWidth;',
        '    const y = row * this._frameHeight;',
        '    this.setFrame(x, y, this._frameWidth, this._frameHeight);'
      ]
    }
    default: {
      return []
    }
  }
}

/**
The animated sprite class's frame counter and its frame selection for the layout.
*/
function animatedClassFrameLines(fullClassName: string, animationType: unknown): string[] {
  return [
    // Update animation
    `${fullClassName}.prototype.updateFrameAnimation = function() {`,
    '    this._animFrameCount++;',
    '    if (this._animFrameCount >= this._animDelay) {',
    '        this._animFrameCount = 0;',
    '        this._animPattern++;',
    '        if (this._animPattern >= this._animMaxPattern) {',
    '            if (this._animLoop) {',
    '                this._animPattern = 0;',
    '            } else {',
    '                this._animPattern = this._animMaxPattern - 1;',
    '                this._animPlaying = false;',
    '                this.onAnimationEnd();',
    '            }',
    '        }',
    '        this.updateAnimationFrame();',
    '    }',
    '};',
    '',
    // Update frame based on animation type
    `${fullClassName}.prototype.updateAnimationFrame = function() {`,
    ...frameLayoutLines(animationType),
    '};',
    ''
  ]
}

/**
The animated sprite class's end callback and control methods.
*/
function animatedClassControlLines(fullClassName: string): string[] {
  return [
    // Animation end callback
    `${fullClassName}.prototype.onAnimationEnd = function() {`,
    '    // Override this for custom behavior when animation ends',
    '};',
    '',
    // Control methods
    '// Animation Control Methods',
    '',
    `${fullClassName}.prototype.play = function() {`,
    '    this._animPlaying = true;',
    '    this._animPattern = 0;',
    '    this._animFrameCount = 0;',
    '};',
    '',
    `${fullClassName}.prototype.stop = function() {`,
    '    this._animPlaying = false;',
    '    this._animPattern = 0;',
    '    this._animFrameCount = 0;',
    '    this.updateAnimationFrame();',
    '};',
    '',
    `${fullClassName}.prototype.pause = function() {`,
    '    this._animPlaying = false;',
    '};',
    '',
    `${fullClassName}.prototype.resume = function() {`,
    '    this._animPlaying = true;',
    '};',
    '',
    `${fullClassName}.prototype.setFrameDelay = function(delay) {`,
    '    this._animDelay = delay;',
    '};',
    '',
    `${fullClassName}.prototype.setLoop = function(loop) {`,
    '    this._animLoop = loop;',
    '};',
    '',
    `${fullClassName}.prototype.gotoFrame = function(frame) {`,
    '    this._animPattern = Math.max(0, Math.min(frame, this._animMaxPattern - 1));',
    '    this._animFrameCount = 0;',
    '    this.updateAnimationFrame();',
    '};',
    '',
    `${fullClassName}.prototype.isPlaying = function() {`,
    '    return this._animPlaying;',
    '};',
    '',
    `${fullClassName}.prototype.currentFrame = function() {`,
    '    return this._animPattern;',
    '};'
  ]
}

/**
Template 3: Sprite Animation
Add frame-based animation to sprites
*/
const spriteAnimationTemplate: CodeTemplate = {
  id: 'sprite-frame-animation',
  category: 'sprite-system',
  name: 'Sprite Animation',
  description: 'Add frame-based animation to sprites using spritesheets',
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
    const animationType = valueOr(values['animationType'], 'horizontal')
    const rawName = expectText(values['spriteName'])
    const spriteName = sanitizeSpriteName(rawName)
    const animation: FrameAnimation = {
      frameCount: valueOr(values['frameCount'], 4),
      frameWidth: String(valueOr(values['frameWidth'], 48)),
      frameHeight: String(valueOr(values['frameHeight'], 48)),
      columns: valueOr(values['columns'], 4),
      frameDelay: valueOr(values['frameDelay'], 12),
      isLoop: values['loop'] !== false,
      isAutoPlay: values['autoPlay'] !== false
    }
    const targetClass = valueOr(values['targetClass'], 'Sprite_Base')

    if (animationType === 'mixin') {
      const target = String(targetClass)
      return [...mixinHookLines(target, animation), ...mixinControlLines(target, animation)].join(
        '\n'
      )
    }
    const fullClassName = `Sprite_${spriteName}`
    return [
      ...animatedClassSetupLines(fullClassName, animation, animationType === 'grid'),
      ...animatedClassFrameLines(fullClassName, animationType),
      ...animatedClassControlLines(fullClassName)
    ].join('\n')
  },
  validate: (values): ValidationResult => {
    const errors = spriteNameErrors(values['spriteName'])

    const frameCount = values['frameCount']
    if (frameCount !== undefined && Number(frameCount) < 1) {
      errors.push('Frame Count must be at least 1')
    }

    const frameWidth = values['frameWidth']
    if (frameWidth !== undefined && Number(frameWidth) <= 0) {
      errors.push('Frame Width must be a positive number')
    }

    const frameHeight = values['frameHeight']
    if (frameHeight !== undefined && Number(frameHeight) <= 0) {
      errors.push('Frame Height must be a positive number')
    }

    const frameDelay = values['frameDelay']
    if (frameDelay !== undefined && Number(frameDelay) < 1) {
      errors.push('Frame Delay must be at least 1')
    }

    const animationType = values['animationType']
    const hasTargetClass = Boolean(values['targetClass'])
    if (animationType === 'mixin' && !hasTargetClass) {
      errors.push('Target Sprite Class is required for Animation Mixin')
    } else if (
      animationType === 'mixin' &&
      !/^[A-Z_$][\w$]*$/i.test(String(values['targetClass']))
    ) {
      errors.push('Target Sprite Class must be a class name (letters, numbers, _ or $)')
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
