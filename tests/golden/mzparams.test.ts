// A parameter file exported by the released version must keep loading; pins what the generator
// makes of one, including its null numbers.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'fs'
import { generatePlugin } from '../../src/renderer/src/lib/generator/index'
import { deserializeParams, serializeParams } from '../../src/renderer/src/lib/param-io'
import { MZPARAMS_HOST, V160_FIXTURE, V160_PARAMS, V160_SOURCE } from './corpus/mzparams'
import { freezeTime, restoreTime } from './corpus/normalise'

describe('v1.6.0 parameter export', () => {
  beforeAll(freezeTime)
  afterAll(restoreTime)

  it('is the bytes the export writer produces', () => {
    const written = serializeParams(V160_PARAMS, V160_SOURCE)
    expect(readFileSync(V160_FIXTURE)).toEqual(Buffer.from(written, 'utf8'))
  })

  it('generates a plugin from the imported parameters', async () => {
    const imported = deserializeParams(readFileSync(V160_FIXTURE, 'utf8'))
    if (!imported.success) throw new Error(`file refused: ${imported.reason}`)
    expect(imported.parameters).toHaveLength(V160_PARAMS.length)
    await expect(
      generatePlugin({ ...MZPARAMS_HOST, parameters: imported.parameters })
    ).toMatchFileSnapshot('__golden__/mzparams/v1.6.0-to-generate.js')
  })
})
