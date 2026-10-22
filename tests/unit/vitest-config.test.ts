// Gate logs are read by the count lines tests print; a silenced run would hide them.
import { describe, expect, it } from 'vitest'
import config from '../../vitest.config'

describe('vitest config', () => {
  it('keeps console output from tests', () => {
    expect(config.test?.silent).toBe(false)
  })
})
