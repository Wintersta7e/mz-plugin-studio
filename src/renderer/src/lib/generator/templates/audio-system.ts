/**
 * Audio System Templates
 *
 * Templates for RPG Maker MZ audio control:
 * - BGM playback control (play, stop, fade, save/restore)
 * - Sound effect player with pitch/volume/pan options
 * - Audio fade and crossfade effects
 */

import { registerTemplate } from './index'
import type { CodeTemplate, ValidationResult } from './types'

/**
 * Template 1: BGM Control
 * Play, stop, fade, save/restore BGM
 */
const bgmControlTemplate: CodeTemplate = {
  id: 'audio-bgm-control',
  category: 'audio-system',
  name: 'BGM Control',
  description: 'Play, stop, fade, save/restore background music',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/AudioManager.html',
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
    const operation = (values.operation as string) || 'play'
    const filename = values.filename as string
    const volume = values.volume !== undefined ? (values.volume as number) : 90
    const pitch = values.pitch !== undefined ? (values.pitch as number) : 100
    const pan = values.pan !== undefined ? (values.pan as number) : 0
    const fadeDuration = values.fadeDuration !== undefined ? (values.fadeDuration as number) : 1
    const fadeInDuration =
      values.fadeInDuration !== undefined ? (values.fadeInDuration as number) : 1
    const wrapInFunction = values.wrapInFunction !== false
    const functionName = (values.functionName as string) || 'customBgmControl'

    const lines: string[] = []

    // Generate operation-specific code
    let coreCode: string[] = []

    switch (operation) {
      case 'play':
        coreCode = [
          '// Play BGM with specified settings',
          'const bgm = {',
          `    name: '${filename || 'BGM_NAME'}',`,
          `    volume: ${volume},`,
          `    pitch: ${pitch},`,
          `    pan: ${pan}`,
          '};',
          'AudioManager.playBgm(bgm);'
        ]
        break

      case 'stop':
        coreCode = ['// Stop currently playing BGM', 'AudioManager.stopBgm();']
        break

      case 'fadeOut':
        coreCode = [
          '// Fade out BGM over specified duration',
          `const fadeOutDuration = ${fadeDuration}; // seconds`,
          'AudioManager.fadeOutBgm(fadeOutDuration);'
        ]
        break

      case 'fadeIn':
        coreCode = [
          '// Fade in BGM over specified duration',
          `const fadeInDuration = ${fadeInDuration}; // seconds`,
          'AudioManager.fadeInBgm(fadeInDuration);'
        ]
        break

      case 'save':
        coreCode = [
          '// Save current BGM for later restoration',
          '// The saved BGM can be restored with AudioManager.replayBgm()',
          'AudioManager.saveBgm();'
        ]
        break

      case 'restore':
        coreCode = [
          '// Restore previously saved BGM',
          '// Make sure to call AudioManager.saveBgm() first',
          'AudioManager.replayBgm();'
        ]
        break
    }

    if (wrapInFunction) {
      lines.push(`// BGM Control Function: ${operation}`)
      lines.push(`function ${functionName}() {`)
      coreCode.forEach((line) => {
        lines.push(line ? `    ${line}` : '')
      })
      lines.push('}')
    } else {
      lines.push(...coreCode)
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const operation = values.operation as string

    if (operation === 'play' && !values.filename) {
      errors.push('BGM filename is required for Play operation')
    }

    if (values.volume !== undefined) {
      const volume = values.volume as number
      if (volume < 0 || volume > 100) {
        errors.push('Volume must be between 0 and 100')
      }
    }

    if (values.pitch !== undefined) {
      const pitch = values.pitch as number
      if (pitch < 50 || pitch > 150) {
        errors.push('Pitch must be between 50 and 150')
      }
    }

    if (values.pan !== undefined) {
      const pan = values.pan as number
      if (pan < -100 || pan > 100) {
        errors.push('Pan must be between -100 and 100')
      }
    }

    if (values.wrapInFunction && values.functionName) {
      const functionName = values.functionName as string
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(functionName)) {
        errors.push('Function name must be a valid JavaScript identifier')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Template 2: Sound Effect Player
 * Play SE with pitch/volume/pan options
 */
const sePlayerTemplate: CodeTemplate = {
  id: 'audio-se-player',
  category: 'audio-system',
  name: 'Sound Effect Player',
  description: 'Play sound effects with customizable pitch, volume, and pan',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/AudioManager.html',
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
    const filename = values.filename as string
    const volume = values.volume !== undefined ? (values.volume as number) : 90
    const pitch = values.pitch !== undefined ? (values.pitch as number) : 100
    const pan = values.pan !== undefined ? (values.pan as number) : 0
    const wrapInFunction = values.wrapInFunction !== false
    const functionName = (values.functionName as string) || 'playCustomSE'
    const randomizePitch = values.randomizePitch === true
    const pitchVariation =
      values.pitchVariation !== undefined ? (values.pitchVariation as number) : 10

    const lines: string[] = []

    // Generate core SE play code
    const coreCode: string[] = []

    if (randomizePitch) {
      coreCode.push('// Play SE with randomized pitch for variation')
      coreCode.push(`const basePitch = ${pitch};`)
      coreCode.push(`const variation = ${pitchVariation};`)
      coreCode.push(
        'const randomPitch = basePitch + Math.floor(Math.random() * variation * 2) - variation;'
      )
      coreCode.push('const se = {')
      coreCode.push(`    name: '${filename}',`)
      coreCode.push(`    volume: ${volume},`)
      coreCode.push('    pitch: Math.max(50, Math.min(150, randomPitch)),')
      coreCode.push(`    pan: ${pan}`)
      coreCode.push('};')
    } else {
      coreCode.push('// Play sound effect')
      coreCode.push('const se = {')
      coreCode.push(`    name: '${filename}',`)
      coreCode.push(`    volume: ${volume},`)
      coreCode.push(`    pitch: ${pitch},`)
      coreCode.push(`    pan: ${pan}`)
      coreCode.push('};')
    }
    coreCode.push('AudioManager.playSe(se);')

    if (wrapInFunction) {
      lines.push(`// Sound Effect Function: ${filename}`)
      lines.push(`function ${functionName}() {`)
      coreCode.forEach((line) => {
        lines.push(line ? `    ${line}` : '')
      })
      lines.push('}')
    } else {
      lines.push(...coreCode)
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []

    if (!values.filename) {
      errors.push('SE filename is required')
    }

    if (values.volume !== undefined) {
      const volume = values.volume as number
      if (volume < 0 || volume > 100) {
        errors.push('Volume must be between 0 and 100')
      }
    }

    if (values.pitch !== undefined) {
      const pitch = values.pitch as number
      if (pitch < 50 || pitch > 150) {
        errors.push('Pitch must be between 50 and 150')
      }
    }

    if (values.pan !== undefined) {
      const pan = values.pan as number
      if (pan < -100 || pan > 100) {
        errors.push('Pan must be between -100 and 100')
      }
    }

    if (values.wrapInFunction && values.functionName) {
      const functionName = values.functionName as string
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(functionName)) {
        errors.push('Function name must be a valid JavaScript identifier')
      }
    }

    if (values.pitchVariation !== undefined) {
      const pitchVariation = values.pitchVariation as number
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
 * Template 3: Audio Fade/Crossfade
 * Fade out current BGM and fade in new BGM
 */
const audioCrossfadeTemplate: CodeTemplate = {
  id: 'audio-crossfade',
  category: 'audio-system',
  name: 'Audio Fade/Crossfade',
  description: 'Fade out current BGM and optionally fade in new BGM',
  docUrl: 'https://kinoar.github.io/rmmz-docs-MZ/AudioManager.html',
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
    const crossfadeType = (values.crossfadeType as string) || 'crossfade'
    const newBgmFilename =
      (values.newBgmFilename as string) || (values.fadeFromSilenceBgm as string)
    const fadeOutDuration =
      values.fadeOutDuration !== undefined ? (values.fadeOutDuration as number) : 2
    const fadeInDuration =
      values.fadeInDuration !== undefined ? (values.fadeInDuration as number) : 2
    const newBgmVolume = values.newBgmVolume !== undefined ? (values.newBgmVolume as number) : 90
    const newBgmPitch = values.newBgmPitch !== undefined ? (values.newBgmPitch as number) : 100
    const wrapInFunction = values.wrapInFunction !== false
    const functionName = (values.functionName as string) || 'crossfadeBgm'

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
        coreCode.push(`    name: '${newBgmFilename || 'NEW_BGM_NAME'}',`)
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
        coreCode.push('    // Play new BGM at zero volume initially')
        coreCode.push('    const tempBgm = Object.assign({}, newBgm, { volume: 0 });')
        coreCode.push('    AudioManager.playBgm(tempBgm);')
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
        coreCode.push(`    name: '${newBgmFilename || 'BGM_NAME'}',`)
        coreCode.push(`    volume: ${newBgmVolume},`)
        coreCode.push(`    pitch: ${newBgmPitch},`)
        coreCode.push('    pan: 0')
        coreCode.push('};')
        coreCode.push('')
        coreCode.push('// Start playing at zero volume')
        coreCode.push('const tempBgm = Object.assign({}, bgm, { volume: 0 });')
        coreCode.push('AudioManager.playBgm(tempBgm);')
        coreCode.push('')
        coreCode.push('// Fade in to target volume')
        coreCode.push('AudioManager.fadeInBgm(fadeInDuration);')
        break
    }

    if (wrapInFunction) {
      const typeLabel =
        crossfadeType === 'crossfade'
          ? 'Crossfade'
          : crossfadeType === 'fadeToSilence'
            ? 'Fade to Silence'
            : 'Fade from Silence'
      lines.push(`// ${typeLabel} Function`)
      lines.push(`function ${functionName}() {`)
      coreCode.forEach((line) => {
        lines.push(line ? `    ${line}` : '')
      })
      lines.push('}')
    } else {
      lines.push(...coreCode)
    }

    return lines.join('\n')
  },
  validate: (values): ValidationResult => {
    const errors: string[] = []
    const crossfadeType = values.crossfadeType as string

    // Validate BGM filename based on crossfade type
    if (crossfadeType === 'crossfade' && !values.newBgmFilename) {
      errors.push('New BGM filename is required for crossfade')
    }

    if (crossfadeType === 'fadeFromSilence' && !values.fadeFromSilenceBgm) {
      errors.push('BGM filename is required for fade from silence')
    }

    // Validate durations
    if (values.fadeOutDuration !== undefined) {
      const duration = values.fadeOutDuration as number
      if (duration < 0 || duration > 60) {
        errors.push('Fade out duration must be between 0 and 60 seconds')
      }
    }

    if (values.fadeInDuration !== undefined) {
      const duration = values.fadeInDuration as number
      if (duration < 0 || duration > 60) {
        errors.push('Fade in duration must be between 0 and 60 seconds')
      }
    }

    // Validate volume and pitch
    if (values.newBgmVolume !== undefined) {
      const volume = values.newBgmVolume as number
      if (volume < 0 || volume > 100) {
        errors.push('Volume must be between 0 and 100')
      }
    }

    if (values.newBgmPitch !== undefined) {
      const pitch = values.newBgmPitch as number
      if (pitch < 50 || pitch > 150) {
        errors.push('Pitch must be between 50 and 150')
      }
    }

    // Validate function name
    if (values.wrapInFunction && values.functionName) {
      const functionName = values.functionName as string
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(functionName)) {
        errors.push('Function name must be a valid JavaScript identifier')
      }
    }

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
