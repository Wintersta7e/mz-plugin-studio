import type { PluginParameter } from '../types/plugin'

/** File format for .mzparams export */
export interface ParameterExport {
  version: 1
  source: string
  exportedAt: string
  parameters: PluginParameter[]
}

/** Serialize selected parameters for export */
export function serializeParams(params: PluginParameter[], sourceName: string): string {
  const data: ParameterExport = {
    version: 1,
    source: sourceName,
    exportedAt: new Date().toISOString(),
    parameters: params
  }
  return JSON.stringify(data, null, 2)
}

/** Deserialize imported parameters from .mzparams content */
export function deserializeParams(content: string): {
  success: boolean
  parameters: PluginParameter[]
  source: string
  error?: string
} {
  try {
    const data = JSON.parse(content)

    if (!data.version || !Array.isArray(data.parameters)) {
      return { success: false, parameters: [], source: '', error: 'Invalid .mzparams format' }
    }

    const params = data.parameters.map((p: PluginParameter) => ({
      ...p,
      id: crypto.randomUUID()
    }))

    return { success: true, parameters: params, source: data.source || 'Unknown' }
  } catch (e) {
    return { success: false, parameters: [], source: '', error: 'Failed to parse file: ' + String(e) }
  }
}

/** Duplicate parameters with new IDs and "_copy" suffix */
export function duplicateParams(params: PluginParameter[]): PluginParameter[] {
  return params.map((p) => ({
    ...p,
    id: crypto.randomUUID(),
    name: p.name + '_copy'
  }))
}
