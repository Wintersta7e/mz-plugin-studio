// A parameter file exported by the released version must keep loading; pins what the generator
// makes of one, including its null numbers.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { generatePlugin } from '../../src/renderer/src/lib/generator/index'
import { deserializeParams, serializeParams } from '../../src/renderer/src/lib/param-io'
import type { PluginParameter } from '../../src/shared/types/plugin'
import { MZPARAMS_HOST, V160_FIXTURE, V160_PARAMS, V160_SOURCE } from './corpus/mzparams'
import { freezeTime, restoreTime } from './corpus/normalise'

// The parameters the import path keeps of the export fixture, which it must accept
function importedParameters(): PluginParameter[] {
  const imported = deserializeParams(readFileSync(V160_FIXTURE, 'utf8'))
  if (!imported.success) throw new Error(`file refused: ${imported.reason}`)
  return imported.parameters
}

describe('v1.6.0 parameter export', () => {
  beforeAll(freezeTime)

  afterAll(restoreTime)

  it('is the bytes the export writer produces', () => {
    const written = serializeParams(V160_PARAMS, V160_SOURCE)

    expect(readFileSync(V160_FIXTURE)).toStrictEqual(Buffer.from(written, 'utf8'))
  })

  it('generates a plugin from the imported parameters', async () => {
    expect.assertions(2)

    const parameters = importedParameters()

    expect(parameters).toHaveLength(V160_PARAMS.length)
    await expect(generatePlugin({ ...MZPARAMS_HOST, parameters })).toMatchFileSnapshot(
      '__golden__/mzparams/v1.6.0-to-generate.js'
    )
  })
})
