// Regression tests for the six MZ template bug fixes in session 30.
// Each test validates the GENERATED output string produced by a template's
// `generate()` function.

import { describe, it, expect, vi } from 'vitest'

// Mock electron-log/renderer before template files (which import it transitively)
vi.mock('electron-log/renderer', () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

// Side-effect imports register each template into the shared registry
import '../../src/renderer/src/lib/generator/templates/method-alias'
import '../../src/renderer/src/lib/generator/templates/save-load'
import '../../src/renderer/src/lib/generator/templates/input-handler'
import '../../src/renderer/src/lib/generator/templates/battle-system'
import '../../src/renderer/src/lib/generator/templates/plugin-commands'
import '../../src/renderer/src/lib/generator/templates/message-system'
import '../../src/renderer/src/lib/generator/templates/audio-system'

import {
  getTemplate,
  getTemplateDefaults,
  validateTemplateValues
} from '../../src/renderer/src/lib/generator/templates/index'
import { compileCheck } from '../../src/main/services/syntax-check'
import { evaluatePlugin } from '../helpers/evaluate-plugin'

describe('save-load template', () => {
  it('injects a warning comment when storageLocation is Game_Actors', () => {
    const tpl = getTemplate('save-load-basic')!
    const out = tpl.generate({
      dataName: 'partyBuffs',
      storageLocation: 'Game_Actors',
      dataType: 'object',
      defaultValue: ''
    })

    expect(out).toMatch(/WARNING: Game_Actors is a CONTAINER/i)
    expect(out).toMatch(/will be lost on save reload/i)
  })

  it('injects a warning comment when storageLocation is Game_Map', () => {
    const tpl = getTemplate('save-load-basic')!
    const out = tpl.generate({
      dataName: 'mapFlags',
      storageLocation: 'Game_Map',
      dataType: 'object',
      defaultValue: ''
    })

    expect(out).toMatch(/WARNING: Game_Map is reinitialized/i)
  })

  it('does not inject warning for Game_System (save-persistent)', () => {
    const tpl = getTemplate('save-load-basic')!
    const out = tpl.generate({
      dataName: 'questData',
      storageLocation: 'Game_System',
      dataType: 'object',
      defaultValue: ''
    })

    expect(out).not.toMatch(/WARNING/i)
  })

  it('lists a default that is not text as an invalid format for the types read as text', () => {
    // The template's own check, called directly: the shared check rejects a wrong type before it
    const validate = getTemplate('save-load-basic')?.validate

    expect(validate).toBeDefined()

    for (const dataType of ['object', 'array', 'boolean']) {
      const result = validate?.({ dataName: 'questData', dataType, defaultValue: 5 })

      expect(result).toStrictEqual({ valid: false, errors: ['Invalid default value format'] })
    }

    // A number default is converted, not read as text
    const numberResult = validate?.({ dataName: 'questData', dataType: 'number', defaultValue: 5 })

    expect(numberResult).toStrictEqual({ valid: true, errors: [] })
  })
})

describe('input-handler template (global scene)', () => {
  it('uses a key-scoped method name to avoid cross-plugin collision', () => {
    const tpl = getTemplate('input-handler-basic')!
    const out = tpl.generate({
      keyName: 'q',
      triggerType: 'isTriggered',
      activeScene: 'all'
    })

    // Method name should include the key suffix
    expect(out).toMatch(/updateGlobalKeyInput_Q/)
    // The old colliding name should not appear as a bare call
    expect(out).not.toMatch(/\.updateGlobalKeyInput\(\)/)
  })

  it('uses a key-scoped alias name for the Scene_Base.update hook', () => {
    const tpl = getTemplate('input-handler-basic')!
    const out = tpl.generate({
      keyName: 'tab',
      triggerType: 'isTriggered',
      activeScene: 'all'
    })

    expect(out).toMatch(/_Scene_Base_update_tab/)
  })
})

describe('method-alias template', () => {
  it('emits a strong warning when replace-without-call is chosen', () => {
    const tpl = getTemplate('method-alias-basic')!
    const out = tpl.generate({
      className: 'Game_Battler',
      methodName: 'canMove',
      timing: 'replace',
      callOriginal: false
    })

    expect(out).toMatch(/WARNING: This replacement does NOT call the original/i)
    expect(out).toMatch(/canMove/)
    expect(out).toMatch(/TODO: return an appropriate value/i)
  })

  it('does not emit warning for normal aliases', () => {
    const tpl = getTemplate('method-alias-basic')!
    const out = tpl.generate({
      className: 'Scene_Map',
      methodName: 'update',
      timing: 'after',
      callOriginal: true
    })

    expect(out).not.toMatch(/WARNING/i)
  })
})

describe('battle-system damage modifier', () => {
  it('generates sign-preserving multiplication for damage modifier', () => {
    const tpl = getTemplate('battle-damage-modifier')!
    const out = tpl.generate({
      modifyType: 'multiply',
      modifyValue: 1.5,
      condition: 'always'
    })

    // New behavior: value >= 0 ? floor : ceil — keeps heals symmetric
    expect(out).toMatch(/value >= 0 \? Math\.floor\(value \* 1\.5\) : Math\.ceil\(value \* 1\.5\)/)
  })
})

describe('message-system custom escape code', () => {
  it('adds negative lookahead on no-parameter replace regex', () => {
    const tpl = getTemplate('message-custom-text-code')!
    const out = tpl.generate({
      escapeChar: 'X',
      codeType: 'replace',
      hasParameter: false,
      replacementText: "'replaced'"
    })

    // Word boundary prevents \X from matching \XY, \XX, etc.
    expect(out).toMatch(/\/\\x1bX\(\?!\[A-Za-z\]\)\/gi/)
  })
})

describe('plugin-commands async callback', () => {
  it('uses per-interpreter pending state (not module-scope flag)', () => {
    const tpl = getTemplate('plugin-command-async')!
    const out = tpl.generate({
      commandName: 'LoadData',
      pluginName: 'MyPlugin',
      waitType: 'callback'
    })

    // The key/interpreter-based pattern should appear
    expect(out).toMatch(/_LoadDataPendingKey/)
    expect(out).toMatch(/interpreter\[_LoadDataPendingKey\]/)
    // Old module-scope pattern must NOT appear
    expect(out).not.toMatch(/^let _LoadDataPending = false/m)
  })
})

// The basic command's code as it runs, inside the plugin's strict-mode wrapper
function basicCommandCode(values: Record<string, unknown>): string {
  const template = getTemplate('plugin-command-basic')
  if (template === undefined) throw new Error('plugin-command-basic is not registered')
  return `'use strict';\n${template.generate(values)}`
}

describe('plugin-command-basic argument names', () => {
  const base = {
    commandName: 'Sample',
    pluginName: 'Sample',
    arg1Type: 'string',
    arg2Type: 'number'
  }

  it.each([
    ['x', 'x'],
    ['x', ' x '],
    ['args', 'y'],
    ['class', 'y'],
    ['y', 'let'],
    ['eval', 'y'],
    ['String', 'y'],
    ['y', 'Number'],
    ['JSON', 'y'],
    ['console', 'y'],
    ['params', 'y']
  ])('rejects the names %j and %j', (arg1Name, arg2Name) => {
    const verdict = validateTemplateValues('plugin-command-basic', { ...base, arg1Name, arg2Name })

    expect(verdict.valid).toBe(false)
  })

  it('accepts two other names, and their code compiles', () => {
    const values = { ...base, arg1Name: 'target', arg2Name: 'amount' }

    expect(validateTemplateValues('plugin-command-basic', values).valid).toBe(true)
    expect(compileCheck(basicCommandCode(values), 'plugin.js')).toBeNull()
  })

  it.each([
    ['x', 'x'],
    ['args', 'y'],
    ['class', 'y']
  ])('makes code that does not compile from the names %j and %j', (arg1Name, arg2Name) => {
    const code = basicCommandCode({ ...base, arg1Name, arg2Name })

    expect(compileCheck(code, 'plugin.js')).not.toBeNull()
  })
})

// Stand-ins for the engine's audio calls, as RPG Maker MZ defines them: each call is recorded,
// replaying a BGM reads its name, and `$gameSystem` keeps the BGM it saves and replays that one.
// A timer runs its callback at once.
const AUDIO_ENGINE = `
var calls = [];
var AudioManager = {
  playBgm: function (bgm) { calls.push(['playBgm', bgm]); },
  fadeInBgm: function (duration) { calls.push(['fadeInBgm', duration]); },
  fadeOutBgm: function (duration) { calls.push(['fadeOutBgm', duration]); },
  saveBgm: function () { return { name: 'Theme1', volume: 90, pitch: 100, pan: 0, pos: 12 }; },
  replayBgm: function (bgm) { calls.push(['replayBgm', bgm.name]); }
};
var $gameSystem = {
  _savedBgm: null,
  saveBgm: function () { this._savedBgm = AudioManager.saveBgm(); },
  replayBgm: function () { if (this._savedBgm) AudioManager.replayBgm(this._savedBgm); }
};
var setTimeout = function (callback) { callback(); };
`

// An audio template's code, not wrapped in a function, from its defaults with the given values
function audioCode(id: string, values: Record<string, unknown>): string {
  const template = getTemplate(id)
  if (template === undefined) throw new Error(`${id} is not registered`)
  return template.generate({ ...getTemplateDefaults(id), wrapInFunction: false, ...values })
}

// The engine calls the code makes when it runs against the engine stand-ins, in order; an error
// the code throws is thrown here
function audioCalls(code: string): unknown {
  const result = evaluatePlugin(`${AUDIO_ENGINE}${code}`, { mode: 'generator' })
  const error = result.compileProblem?.message ?? result.threw
  if (error !== null) throw new Error(error)
  const context: { calls?: unknown } | null = result.context
  return structuredClone(context?.calls)
}

describe('audio BGM control save and restore', () => {
  it('replays the BGM the save operation saved', () => {
    const save = audioCode('audio-bgm-control', { operation: 'save' })
    const restore = audioCode('audio-bgm-control', { operation: 'restore' })

    expect(audioCalls(`${save}\n${restore}`)).toStrictEqual([['replayBgm', 'Theme1']])
  })

  it('replays nothing when no BGM was saved', () => {
    expect(audioCalls(audioCode('audio-bgm-control', { operation: 'restore' }))).toStrictEqual([])
  })
})

// The engine's fade-in raises the volume from silence to the playing BGM's own volume
describe('audio crossfade volume', () => {
  const played = { name: 'Field1', volume: 90, pitch: 100, pan: 0 }

  it.each([
    [
      'crossfade',
      [
        ['fadeOutBgm', 2],
        ['playBgm', played],
        ['fadeInBgm', 2]
      ]
    ],
    [
      'fadeFromSilence',
      [
        ['playBgm', played],
        ['fadeInBgm', 2]
      ]
    ]
  ])('%s plays the new BGM at its set volume, then fades it in', (crossfadeType, calls) => {
    const code = audioCode('audio-crossfade', {
      crossfadeType,
      newBgmFilename: 'Field1',
      fadeFromSilenceBgm: 'Field1'
    })

    expect(audioCalls(code)).toStrictEqual(calls)
  })
})

// Each crossfade type shows its own filename field; the other keeps what was entered before
describe('audio crossfade BGM file', () => {
  it.each([
    ['crossfade', 'Battle1'],
    ['fadeFromSilence', 'Field1']
  ])('%s plays the BGM entered in its own field', (crossfadeType, name) => {
    const code = audioCode('audio-crossfade', {
      crossfadeType,
      newBgmFilename: 'Battle1',
      fadeFromSilenceBgm: 'Field1'
    })

    expect(audioCalls(code)).toContainEqual(['playBgm', expect.objectContaining({ name })])
  })
})

// The start of the engine's message text conversion, as RPG Maker MZ defines it: every backslash
// becomes the escape character, and a doubled one becomes one backslash again, before any code is
// replaced. The party holds 250 gold.
const MESSAGE_ENGINE = `
var Window_Base = function () {};
Window_Base.prototype.convertEscapeCharacters = function (text) {
  text = text.replace(/\\\\/g, '\\x1b');
  text = text.replace(/\\x1b\\x1b/g, '\\\\');
  return text;
};
var $gameParty = { gold: function () { return 250; } };
`

// The message text after the engine's conversion with the code of a custom text code from its
// defaults with the given values; an error the code throws is thrown here
function convertedText(values: Record<string, unknown>, text: string): unknown {
  const id = 'message-custom-text-code'
  const template = getTemplate(id)
  if (template === undefined) throw new Error(`${id} is not registered`)
  const code = template.generate({ ...getTemplateDefaults(id), ...values })
  const result = evaluatePlugin(
    `${MESSAGE_ENGINE}${code}\nvar converted = Window_Base.prototype.convertEscapeCharacters.call({}, ${JSON.stringify(text)});`,
    { mode: 'generator' }
  )
  const error = result.compileProblem?.message ?? result.threw
  if (error !== null) throw new Error(error)
  const context: { converted?: unknown } | null = result.context
  return context?.converted
}

describe('custom text code replacement', () => {
  it.each([
    [true, 'Gold: \\GOLDX[5]!'],
    [false, 'Gold: \\GOLDX!']
  ])('replaces the code in message text (parameter %s)', (hasParameter, text) => {
    const values = { escapeChar: 'GoldX', hasParameter, replacementText: '$gameParty.gold()' }

    expect(convertedText(values, text)).toBe('Gold: 250!')
  })
})

// The engine's window background, as RPG Maker MZ defines it: a Window background makes the frame
// opaque, Dim and Transparent make it clear, and only Dim shows the dimmer sprite, made on first
// use. A choice list sets its background each time it starts, a message window each message.
// The dimmer sprite sits 4 pixels left of the window, its bitmap 8 pixels wider than the window.
// A bitmap records the rects filled into it since it was last cleared. The message scene's
// window rect is as wide as the screen and 4 text lines high: 36 pixels a line, 12 of padding
// above and below, and 8 more.
const WINDOW_ENGINE = `
var Graphics = { boxWidth: 816 };
var Rectangle = function (x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
};
var Scene_Message = function () {};
Scene_Message.prototype.calcWindowHeight = function (numLines, selectable) {
  return numLines * 36 + 12 * 2;
};
Scene_Message.prototype.messageWindowRect = function () {
  const ww = Graphics.boxWidth;
  const wh = this.calcWindowHeight(4, false) + 8;
  const wx = (Graphics.boxWidth - ww) / 2;
  const wy = 0;
  return new Rectangle(wx, wy, ww, wh);
};
var Bitmap = function (width, height) {
  this.width = width;
  this.height = height;
  this.fills = [];
};
Bitmap.prototype.clear = function () { this.fills = []; };
Bitmap.prototype.fillRect = function (x, y, width, height, color) {
  this.fills.push({ x: x, y: y, width: width, height: height, color: color });
};
var Window_Base = function () {};
Window_Base.prototype.setBackgroundType = function (type) {
  if (type === 0) {
    this.opacity = 255;
  } else {
    this.opacity = 0;
  }
  if (type === 1) {
    this.showBackgroundDimmer();
  } else {
    this.hideBackgroundDimmer();
  }
};
Window_Base.prototype.showBackgroundDimmer = function () {
  if (!this._dimmerSprite) {
    this._dimmerSprite = { x: -4, bitmap: new Bitmap(this.width + 8, this.height), visible: false };
  }
  this._dimmerSprite.visible = true;
};
Window_Base.prototype.hideBackgroundDimmer = function () {
  if (this._dimmerSprite) {
    this._dimmerSprite.visible = false;
  }
};
var $gameMessage = {
  background: function () { return 0; },
  choiceBackground: function () { return 0; }
};
var Window_Message = function () {};
Window_Message.prototype = Object.create(Window_Base.prototype);
Window_Message.prototype.updateBackground = function () {
  this._background = $gameMessage.background();
  this.setBackgroundType(this._background);
};
var Window_ChoiceList = function () {};
Window_ChoiceList.prototype = Object.create(Window_Base.prototype);
Window_ChoiceList.prototype.initialize = function () {};
Window_ChoiceList.prototype.start = function () {
  this.updateBackground();
};
Window_ChoiceList.prototype.updateBackground = function () {
  this._background = $gameMessage.choiceBackground();
  this.setBackgroundType(this._background);
};
`

// The window a template's code from its defaults with the given values leaves after `steps` run
// on a new window of the engine; an error the code throws is thrown here
function windowAfter(id: string, values: Record<string, unknown>, steps: string): unknown {
  const template = getTemplate(id)
  if (template === undefined) throw new Error(`${id} is not registered`)
  const code = template.generate({ ...getTemplateDefaults(id), ...values })
  const result = evaluatePlugin(`${WINDOW_ENGINE}${code}\n${steps}`, { mode: 'generator' })
  const error = result.compileProblem?.message ?? result.threw
  if (error !== null) throw new Error(error)
  const context: { shown?: unknown } | null = result.context
  return context?.shown
}

describe('choice window opacity', () => {
  it('keeps the set opacity once the choice list starts', () => {
    const shown = windowAfter(
      'message-choice-handler',
      { modType: 'style', windowOpacity: 128 },
      'var shown = new Window_ChoiceList(); shown.initialize(); shown.start();'
    )

    expect(shown).toMatchObject({ opacity: 128 })
  })
})

describe('custom message background colour', () => {
  it('fills the background with the colour before any Dim message', () => {
    const shown = windowAfter(
      'message-window-mod',
      { modType: 'background', bgType: 'custom', bgColor: 'rgba(0, 0, 64, 0.8)' },
      'var shown = new Window_Message(); shown.updateBackground();'
    )

    expect(shown).toMatchObject({
      opacity: 0,
      _dimmerSprite: { visible: true, bitmap: { fills: [{ color: 'rgba(0, 0, 64, 0.8)' }] } }
    })
  })

  it('fills the whole dimmer, which reaches 4 pixels past each side of the window', () => {
    const shown = windowAfter(
      'message-window-mod',
      { modType: 'background', bgType: 'custom' },
      'var shown = new Window_Message(); shown.width = 600; shown.height = 180; shown.updateBackground();'
    )

    expect(shown).toMatchObject({
      _dimmerSprite: { bitmap: { fills: [{ x: 0, y: 0, width: 608, height: 180 }] } }
    })
  })
})

describe('message window visible lines', () => {
  it.each([
    [2, 2 * 36 + 12 * 2 + 8],
    [6, 6 * 36 + 12 * 2 + 8]
  ])('makes the window %i text lines high', (lineCount, height) => {
    const shown = windowAfter(
      'message-window-mod',
      { modType: 'size', windowWidth: 600, numLines: lineCount },
      'var shown = new Scene_Message().messageWindowRect();'
    )

    expect(shown).toMatchObject({ x: 108, width: 600, height })
  })
})
