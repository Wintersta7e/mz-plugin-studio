/**
Audio System Templates

Templates for RPG Maker MZ audio control:
- BGM playback control (play, stop, fade, save/restore)
- Sound effect player with pitch/volume/pan options
- Audio fade and crossfade effects
*/

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'
import { escapeJSString, escapeLineComment } from '../escape'
import { expectText, providedOr, valueOr } from './values'

/**
A BGM filename as the text of a single-quoted string, or the placeholder when it is not set.
*/
function bgmNameText(filename: unknown, placeholder: string): string {
  return escapeJSString(expectText(valueOr(filename, placeholder)))
}

/**
The error for a function name the code is wrapped in that is not a JavaScript identifier.
*/
function functionNameErrors(values: Record<string, unknown>): string[] {
  const hasFunctionName = Boolean(values['wrapInFunction']) && Boolean(values['functionName'])
  if (!hasFunctionName) return []
  const isIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(String(values['functionName']))
  return isIdentifier ? [] : ['Function name must be a valid JavaScript identifier']
}

/**
Template 1: BGM Control
Play, stop, fade, save/restore BGM
*/
const bgmControlTemplate: CodeTemplate = {
  id: 'audio-bgm-control',
  category: 'audio-system',
  name: 'BGM Control',
  description: 'Play, stop, fade, save/restore background music',
  icon: 'Volume2',
  fields: [
    {
      id: 'operation',
      label: 'Operation',
      type: 'select',
      options: [
        { value: 'play', label: 'Play BGM' },
        { value: 'stop', label: 'Stop BGM' },
        { value: 'fadeOut', label: 'Fade Out BGM' },
        { value: 'fadeIn', label: 'Fade In BGM' },
        { value: 'save', label: 'Save Current BGM' },
        { value: 'restore', label: 'Restore Saved BGM' }
      ],
      default: 'play',
      required: true,
      help: 'The audio operation to perform'
    },
    {
      id: 'filename',
      label: 'BGM Filename',
      type: 'text',
      placeholder: 'e.g., Battle1',
      help: 'Name of the BGM file (without extension). Required for Play operation.',
      dependsOn: { field: 'operation', value: 'play' }
    },
    {
      id: 'volume',
      label: 'Volume',
      type: 'number',
      default: 90,
      help: 'Volume level (0-100)',
      dependsOn: { field: 'operation', value: 'play' }
    },
    {
      id: 'pitch',
      label: 'Pitch',
      type: 'number',
      default: 100,
      help: 'Pitch (50-150, 100 is normal)',
      dependsOn: { field: 'operation', value: 'play' }
    },
    {
      id: 'pan',
      label: 'Pan',
      type: 'number',
      default: 0,
      help: 'Pan (-100 to 100, 0 is center)',
      dependsOn: { field: 'operation', value: 'play' }
    },
    {
      id: 'fadeDuration',
      label: 'Fade Duration (seconds)',
      type: 'number',
      default: 1,
      help: 'Duration of the fade effect in seconds',
      dependsOn: { field: 'operation', value: 'fadeOut' }
    },
    {
      id: 'fadeInDuration',
      label: 'Fade In Duration (seconds)',
      type: 'number',
      default: 1,
      help: 'Duration of the fade in effect in seconds',
      dependsOn: { field: 'operation', value: 'fadeIn' }
    },
    {
      id: 'wrapInFunction',
      label: 'Wrap in Function',
      type: 'boolean',
      default: true,
      help: 'Wrap the code in a reusable function'
    },
    {
      id: 'functionName',
      label: 'Function Name',
      type: 'text',
      placeholder: 'e.g., playBattleMusic',
      help: 'Name for the generated function',
      dependsOn: { field: 'wrapInFunction', value: true }
    }
  ],
  generate: (values): string => {
    const operation = valueOr(values['operation'], 'play')
    const filename = values['filename']
    const volume = String(providedOr(values['volume'], 90))
    const pitch = String(providedOr(values['pitch'], 100))
    const pan = String(providedOr(values['pan'], 0))
    const fadeDuration = String(providedOr(values['fadeDuration'], 1))
    const fadeInDuration = String(providedOr(values['fadeInDuration'], 1))
    const isWrapInFunction = values['wrapInFunction'] !== false
    const functionName = String(valueOr(values['functionName'], 'customBgmControl'))

    const lines: string[] = []

    // Generate operation-specific code
    let coreCode: string[] = []

    switch (operation) {
      case 'play': {
        coreCode = [
          '// Play BGM with specified settings',
          'const bgm = {',
          `    name: '${bgmNameText(filename, 'BGM_NAME')}',`,
          `    volume: ${volume},`,
          `    pitch: ${pitch},`,
          `    pan: ${pan}`,
          '};',
          'AudioManager.playBgm(bgm);'
        ]
        break
      }

      case 'stop': {
        coreCode = ['// Stop currently playing BGM', 'AudioManager.stopBgm();']
        break
      }

      case 'fadeOut': {
        coreCode = [
          '// Fade out BGM over specified duration',
          `const fadeOutDuration = ${fadeDuration}; // seconds`,
          'AudioManager.fadeOutBgm(fadeOutDuration);'
        ]
        break
      }

      case 'fadeIn': {
        coreCode = [
          '// Fade in BGM over specified duration',
          `const fadeInDuration = ${fadeInDuration}; // seconds`,
          'AudioManager.fadeInBgm(fadeInDuration);'
        ]
        break
      }

      case 'save': {
        coreCode = [
          '// Save current BGM for later restoration',
          '// The saved BGM can be restored with $gameSystem.replayBgm()',
          '$gameSystem.saveBgm();'
        ]
        break
      }

      case 'restore': {
        coreCode = [
          '// Restore previously saved BGM',
          '// Make sure to call $gameSystem.saveBgm() first',
          '$gameSystem.replayBgm();'
        ]
        break
      }
    }

    if (isWrapInFunction) {
      lines.push(`// BGM Control Function: ${String(operation)}`)
      lines.push(`function ${functionName}() {`)
      for (const line of coreCode) {
        lines.push(line ? `    ${line}` : '')
      }
      lines.push('}')
    } else {
      lines.push(...coreCode)
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const operation = values['operation']

    if (operation === 'play' && !values['filename']) {
      errors.push('BGM filename is required for Play operation')
    }

    if (values['volume'] !== undefined) {
      const volume = Number(values['volume'])
      if (volume < 0 || volume > 100) {
        errors.push('Volume must be between 0 and 100')
      }
    }

    if (values['pitch'] !== undefined) {
      const pitch = Number(values['pitch'])
      if (pitch < 50 || pitch > 150) {
        errors.push('Pitch must be between 50 and 150')
      }
    }

    if (values['pan'] !== undefined) {
      const pan = Number(values['pan'])
      if (pan < -100 || pan > 100) {
        errors.push('Pan must be between -100 and 100')
      }
    }

    errors.push(...functionNameErrors(values))

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
Template 2: Sound Effect Player
Play SE with pitch/volume/pan options
*/
const sePlayerTemplate: CodeTemplate = {
  id: 'audio-se-player',
  category: 'audio-system',
  name: 'Sound Effect Player',
  description: 'Play sound effects with customizable pitch, volume, and pan',
  icon: 'Volume2',
  fields: [
    {
      id: 'filename',
      label: 'SE Filename',
      type: 'text',
      required: true,
      placeholder: 'e.g., Cursor1',
      help: 'Name of the sound effect file (without extension)'
    },
    {
      id: 'volume',
      label: 'Volume',
      type: 'number',
      default: 90,
      help: 'Volume level (0-100)'
    },
    {
      id: 'pitch',
      label: 'Pitch',
      type: 'number',
      default: 100,
      help: 'Pitch (50-150, 100 is normal)'
    },
    {
      id: 'pan',
      label: 'Pan',
      type: 'number',
      default: 0,
      help: 'Pan position (-100 left, 0 center, 100 right)'
    },
    {
      id: 'wrapInFunction',
      label: 'Wrap in Function',
      type: 'boolean',
      default: true,
      help: 'Create a reusable function for playing this sound'
    },
    {
      id: 'functionName',
      label: 'Function Name',
      type: 'text',
      placeholder: 'e.g., playCursorSound',
      help: 'Name for the generated function',
      dependsOn: { field: 'wrapInFunction', value: true }
    },
    {
      id: 'randomizePitch',
      label: 'Randomize Pitch',
      type: 'boolean',
      default: false,
      help: 'Add slight pitch variation for more natural sound'
    },
    {
      id: 'pitchVariation',
      label: 'Pitch Variation',
      type: 'number',
      default: 10,
      help: 'Amount of random pitch variation (e.g., 10 = +/-10)',
      dependsOn: { field: 'randomizePitch', value: true }
    }
  ],
  generate: (values): string => {
    const filename = values['filename']
    const volume = String(providedOr(values['volume'], 90))
    const pitch = String(providedOr(values['pitch'], 100))
    const pan = String(providedOr(values['pan'], 0))
    const isWrapInFunction = values['wrapInFunction'] !== false
    const functionName = String(valueOr(values['functionName'], 'playCustomSE'))
    const isRandomizePitch = values['randomizePitch'] === true
    const pitchVariation = String(providedOr(values['pitchVariation'], 10))

    const lines: string[] = []

    // Generate core SE play code
    const coreCode: string[] = []

    if (isRandomizePitch) {
      coreCode.push('// Play SE with randomized pitch for variation')
      coreCode.push(`const basePitch = ${pitch};`)
      coreCode.push(`const variation = ${pitchVariation};`)
      coreCode.push(
        'const randomPitch = basePitch + Math.floor(Math.random() * variation * 2) - variation;'
      )
      coreCode.push('const se = {')
      coreCode.push(`    name: '${escapeJSString(expectText(filename))}',`)
      coreCode.push(`    volume: ${volume},`)
      coreCode.push('    pitch: Math.max(50, Math.min(150, randomPitch)),')
    } else {
      coreCode.push('// Play sound effect')
      coreCode.push('const se = {')
      coreCode.push(`    name: '${escapeJSString(expectText(filename))}',`)
      coreCode.push(`    volume: ${volume},`)
      coreCode.push(`    pitch: ${pitch},`)
    }
    coreCode.push(`    pan: ${pan}`)
    coreCode.push('};')
    coreCode.push('AudioManager.playSe(se);')

    if (isWrapInFunction) {
      lines.push(`// Sound Effect Function: ${escapeLineComment(expectText(filename))}`)
      lines.push(`function ${functionName}() {`)
      for (const line of coreCode) {
        lines.push(line ? `    ${line}` : '')
      }
      lines.push('}')
    } else {
      lines.push(...coreCode)
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (values['volume'] !== undefined) {
      const volume = Number(values['volume'])
      if (volume < 0 || volume > 100) {
        errors.push('Volume must be between 0 and 100')
      }
    }

    if (values['pitch'] !== undefined) {
      const pitch = Number(values['pitch'])
      if (pitch < 50 || pitch > 150) {
        errors.push('Pitch must be between 50 and 150')
      }
    }

    if (values['pan'] !== undefined) {
      const pan = Number(values['pan'])
      if (pan < -100 || pan > 100) {
        errors.push('Pan must be between -100 and 100')
      }
    }

    errors.push(...functionNameErrors(values))

    if (values['pitchVariation'] !== undefined) {
      const pitchVariation = Number(values['pitchVariation'])
      if (pitchVariation < 0 || pitchVariation > 50) {
        errors.push('Pitch variation should be between 0 and 50')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
Template 3: Audio Fade/Crossfade
Fade out current BGM and fade in new BGM
*/
const audioCrossfadeTemplate: CodeTemplate = {
  id: 'audio-crossfade',
  category: 'audio-system',
  name: 'Audio Fade/Crossfade',
  description: 'Fade out current BGM and optionally fade in new BGM',
  icon: 'Volume2',
  fields: [
    {
      id: 'crossfadeType',
      label: 'Crossfade Type',
      type: 'select',
      options: [
        { value: 'crossfade', label: 'Crossfade - Fade out then fade in new BGM' },
        { value: 'fadeToSilence', label: 'Fade to Silence - Just fade out current BGM' },
        { value: 'fadeFromSilence', label: 'Fade from Silence - Fade in new BGM from silence' }
      ],
      default: 'crossfade',
      required: true,
      help: 'Type of audio transition'
    },
    {
      id: 'newBgmFilename',
      label: 'New BGM Filename',
      type: 'text',
      placeholder: 'e.g., Field1',
      help: 'Name of the new BGM to play (without extension)',
      dependsOn: { field: 'crossfadeType', value: 'crossfade' }
    },
    {
      id: 'fadeFromSilenceBgm',
      label: 'BGM Filename',
      type: 'text',
      placeholder: 'e.g., Field1',
      help: 'Name of the BGM to fade in (without extension)',
      dependsOn: { field: 'crossfadeType', value: 'fadeFromSilence' }
    },
    {
      id: 'fadeOutDuration',
      label: 'Fade Out Duration (seconds)',
      type: 'number',
      default: 2,
      help: 'How long to fade out the current BGM'
    },
    {
      id: 'fadeInDuration',
      label: 'Fade In Duration (seconds)',
      type: 'number',
      default: 2,
      help: 'How long to fade in the new BGM'
    },
    {
      id: 'newBgmVolume',
      label: 'New BGM Volume',
      type: 'number',
      default: 90,
      help: 'Volume level for the new BGM (0-100)'
    },
    {
      id: 'newBgmPitch',
      label: 'New BGM Pitch',
      type: 'number',
      default: 100,
      help: 'Pitch for the new BGM (50-150)'
    },
    {
      id: 'wrapInFunction',
      label: 'Wrap in Function',
      type: 'boolean',
      default: true,
      help: 'Create a reusable crossfade function'
    },
    {
      id: 'functionName',
      label: 'Function Name',
      type: 'text',
      placeholder: 'e.g., crossfadeToBattleMusic',
      help: 'Name for the generated function',
      dependsOn: { field: 'wrapInFunction', value: true }
    }
  ],
  generate: (values): string => {
    const crossfadeType = valueOr(values['crossfadeType'], 'crossfade')
    const newBgmFilename = values['newBgmFilename']
    const fadeFromSilenceBgm = values['fadeFromSilenceBgm']
    const fadeOutDuration = String(providedOr(values['fadeOutDuration'], 2))
    const fadeInDuration = String(providedOr(values['fadeInDuration'], 2))
    const newBgmVolume = String(providedOr(values['newBgmVolume'], 90))
    const newBgmPitch = String(providedOr(values['newBgmPitch'], 100))
    const isWrapInFunction = values['wrapInFunction'] !== false
    const functionName = String(valueOr(values['functionName'], 'crossfadeBgm'))

    const lines: string[] = []

    // Generate core crossfade code based on type
    const coreCode: string[] = []

    switch (crossfadeType) {
      case 'crossfade':
        coreCode.push('// Crossfade: Fade out current BGM, then play and fade in new BGM')
        coreCode.push(`const fadeOutDuration = ${fadeOutDuration}; // seconds`)
        coreCode.push(`const fadeInDuration = ${fadeInDuration}; // seconds`)
        coreCode.push('')
        coreCode.push('// Define the new BGM settings')
        coreCode.push('const newBgm = {')
        coreCode.push(`    name: '${bgmNameText(newBgmFilename, 'NEW_BGM_NAME')}',`)
        coreCode.push(`    volume: ${newBgmVolume},`)
        coreCode.push(`    pitch: ${newBgmPitch},`)
        coreCode.push('    pan: 0')
        coreCode.push('};')
        coreCode.push('')
        coreCode.push('// Fade out current BGM')
        coreCode.push('AudioManager.fadeOutBgm(fadeOutDuration);')
        coreCode.push('')
        coreCode.push('// Schedule the new BGM to play after fade out completes')
        coreCode.push('setTimeout(function() {')
        coreCode.push('    // Play new BGM, then fade it in from silence')
        coreCode.push('    AudioManager.playBgm(newBgm);')
        coreCode.push('    // Fade in to target volume')
        coreCode.push('    AudioManager.fadeInBgm(fadeInDuration);')
        coreCode.push('}, fadeOutDuration * 1000);')
        break

      case 'fadeToSilence':
        coreCode.push('// Fade current BGM to silence')
        coreCode.push(`const fadeOutDuration = ${fadeOutDuration}; // seconds`)
        coreCode.push('AudioManager.fadeOutBgm(fadeOutDuration);')
        break

      case 'fadeFromSilence':
        coreCode.push('// Fade in BGM from silence')
        coreCode.push(`const fadeInDuration = ${fadeInDuration}; // seconds`)
        coreCode.push('')
        coreCode.push('// Define the BGM settings')
        coreCode.push('const bgm = {')
        coreCode.push(`    name: '${bgmNameText(fadeFromSilenceBgm, 'BGM_NAME')}',`)
        coreCode.push(`    volume: ${newBgmVolume},`)
        coreCode.push(`    pitch: ${newBgmPitch},`)
        coreCode.push('    pan: 0')
        coreCode.push('};')
        coreCode.push('')
        coreCode.push('// Start playing, then fade in from silence')
        coreCode.push('AudioManager.playBgm(bgm);')
        coreCode.push('')
        coreCode.push('// Fade in to target volume')
        coreCode.push('AudioManager.fadeInBgm(fadeInDuration);')
        break
    }

    if (isWrapInFunction) {
      const typeLabel =
        crossfadeType === 'crossfade'
          ? 'Crossfade'
          : crossfadeType === 'fadeToSilence'
            ? 'Fade to Silence'
            : 'Fade from Silence'
      lines.push(`// ${typeLabel} Function`)
      lines.push(`function ${functionName}() {`)
      for (const line of coreCode) {
        lines.push(line ? `    ${line}` : '')
      }
      lines.push('}')
    } else {
      lines.push(...coreCode)
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const crossfadeType = values['crossfadeType']

    // Validate BGM filename based on crossfade type
    if (crossfadeType === 'crossfade' && !values['newBgmFilename']) {
      errors.push('New BGM filename is required for crossfade')
    }

    if (crossfadeType === 'fadeFromSilence' && !values['fadeFromSilenceBgm']) {
      errors.push('BGM filename is required for fade from silence')
    }

    // Validate durations
    if (values['fadeOutDuration'] !== undefined) {
      const duration = Number(values['fadeOutDuration'])
      if (duration < 0 || duration > 60) {
        errors.push('Fade out duration must be between 0 and 60 seconds')
      }
    }

    if (values['fadeInDuration'] !== undefined) {
      const duration = Number(values['fadeInDuration'])
      if (duration < 0 || duration > 60) {
        errors.push('Fade in duration must be between 0 and 60 seconds')
      }
    }

    // Validate volume and pitch
    if (values['newBgmVolume'] !== undefined) {
      const volume = Number(values['newBgmVolume'])
      if (volume < 0 || volume > 100) {
        errors.push('Volume must be between 0 and 100')
      }
    }

    if (values['newBgmPitch'] !== undefined) {
      const pitch = Number(values['newBgmPitch'])
      if (pitch < 50 || pitch > 150) {
        errors.push('Pitch must be between 50 and 150')
      }
    }

    // Validate function name
    errors.push(...functionNameErrors(values))

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Register all templates when this module loads
registerTemplate(bgmControlTemplate)
registerTemplate(sePlayerTemplate)
registerTemplate(audioCrossfadeTemplate)

export { bgmControlTemplate, sePlayerTemplate, audioCrossfadeTemplate }
