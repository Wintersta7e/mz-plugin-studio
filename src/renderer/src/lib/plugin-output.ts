import type { PluginDefinition } from '../types/plugin'
import { generatePlugin, generateRawMode } from './generator'

export function generatePluginOutput(plugin: PluginDefinition, rawMode: boolean): string {
  if (rawMode && plugin.rawSource) {
    return generateRawMode(plugin)
  }

  return generatePlugin(plugin)
}
