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

/** Minimal shape check for imported parameter objects */
function isValidParam(p: unknown): p is Record<string, unknown> {
  return typeof p === 'object' && p !== null && typeof (p as Record<string, unknown>).name === 'string' && typeof (p as Record<string, unknown>).type === 'string'
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

    if (data.version !== 1 || !Array.isArray(data.parameters)) {
      return { success: false, parameters: [], source: '', error: 'Invalid or unsupported .mzparams format' }
    }

    const params = data.parameters.filter(isValidParam).map((p) => ({
      ...(p as PluginParameter),
      id: crypto.randomUUID()
    }))

    return { success: true, parameters: params, source: data.source || 'Unknown' }
  } catch (e) {
    const detail =
      e instanceof SyntaxError
        ? 'The file is not valid JSON.'
        : 'Failed to process parameters: ' + (e instanceof Error ? e.message : String(e))
    return { success: false, parameters: [], source: '', error: detail }
  }
}

/** Duplicate parameters with new IDs and "_copy" suffix */
export function duplicateParams(params: PluginParameter[]): PluginParameter[] {
  return params.map((p) => ({
    ...p,
    id: crypto.randomUUID(),
    name: p.name.replace(/_copy\d*$/, '') + '_copy'
  }))
}
