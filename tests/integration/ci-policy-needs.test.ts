// Tests for `ci-policy needs`: the aggregate job passes only when every needed job succeeded
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const SCRIPT = fileURLToPath(new URL('../../scripts/ci-policy.mjs', import.meta.url))

function needs(json: string | undefined): { status: number | null; out: string } {
  const env = { ...process.env }
  delete env.NEEDS_JSON
  if (json !== undefined) env.NEEDS_JSON = json
  const result = spawnSync(process.execPath, [SCRIPT, 'needs'], { env, encoding: 'utf8' })
  return { status: result.status, out: result.stdout + result.stderr }
}

const job = (result: string): { result: string; outputs: object } => ({ result, outputs: {} })

describe('ci-policy needs', () => {
  it('passes when every job succeeded', () => {
    const { status, out } = needs(
      JSON.stringify({
        static: job('success'),
        unit: job('success'),
        'package-win': job('success')
      })
    )
    expect(out).toContain('ci-policy needs: static success\n')
    expect(out).toContain('ci-policy needs: package-win success\n')
    expect(out).toContain('ci-policy needs: jobs 3\n')
    expect(out).toContain('ci-policy needs: ok')
    expect(status).toBe(0)
  })

  it('fails when one job failed', () => {
    const { status, out } = needs(JSON.stringify({ static: job('success'), unit: job('failure') }))
    expect(out).toContain('ci-policy needs: unit failure\n')
    expect(out).toContain('ci-policy needs: FAILED')
    expect(status).toBe(1)
  })

  it('fails when one job was skipped', () => {
    const { status } = needs(JSON.stringify({ static: job('success'), unit: job('skipped') }))
    expect(status).toBe(1)
  })

  it('fails on no jobs', () => {
    const { status, out } = needs('{}')
    expect(out).toContain('ci-policy needs: jobs 0\n')
    expect(status).toBe(1)
  })

  it('fails when NEEDS_JSON is not set', () => {
    const { status, out } = needs(undefined)
    expect(out).toContain('NEEDS_JSON')
    expect(status).toBe(1)
  })

  it('fails when NEEDS_JSON is not a JSON object', () => {
    expect(needs('not json').status).toBe(1)
    expect(needs('["static"]').status).toBe(1)
  })
})
