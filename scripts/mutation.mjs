// Mutation testing of the source files changed since a base commit: `--since <base>` mutates every
// `src/**/*.{ts,tsx}` file that differs between the base and HEAD (deleted files and `.d.ts` left
// out) under `stryker.config.json`, with the sandbox in the OS temp directory. Prints
// `mutation: no src change` and exits 0 when no such file changed; else prints
// `mutating N files, mutants M` and fails when the score falls under the config's break threshold,
// or when changed files gave no mutant (a run that tested nothing).
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Stryker } from '@stryker-mutator/core'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const SOURCE = /^src\/.+(?<!\.d)\.tsx?$/v

/**
@param {string} line
*/
const print = (line) => process.stdout.write(`${line}\n`)

/**
The value after `--since`; undefined without one.
@param {string[]} args
*/
function sinceOf(args) {
  const at = args.indexOf('--since')
  return at === -1 ? undefined : args.at(at + 1)
}

/**
The source files changed between `base` and HEAD that still exist at HEAD.
@param {string} base
@returns {string[]}
*/
function changedSources(base) {
  const diff = spawnSync(
    'git',
    ['diff', '--name-only', '--diff-filter=d', base, 'HEAD', '--', 'src'],
    { cwd: ROOT, encoding: 'utf8' }
  )
  if (diff.status !== 0) throw new Error(`git diff ${base} HEAD failed: ${diff.stderr.trim()}`)
  return diff.stdout.split('\n').filter((file) => SOURCE.test(file))
}

/**
@param {string[]} args
@returns {Promise<number>}
*/
async function main(args) {
  const base = sinceOf(args)
  if (base === undefined || base === '') {
    print('usage: node scripts/mutation.mjs --since <base>')
    return 2
  }
  const files = changedSources(base)
  if (files.length === 0) {
    print('mutation: no src change')
    return 0
  }
  // vitest.config.ts reads it to leave out the tests an instrumented copy cannot pass.
  process.env['MUTATION_TESTING'] = '1'
  const sandboxDirectory = mkdtempSync(path.join(tmpdir(), 'mutation-'))
  try {
    const results = await new Stryker({
      configFile: path.join(ROOT, 'stryker.config.json'),
      mutate: files,
      tempDirName: sandboxDirectory
    }).runMutationTest()
    print(`mutating ${String(files.length)} files, mutants ${String(results.length)}`)
    if (results.length === 0) {
      print('mutation: the changed files hold no mutant, so the run tested nothing')
      return 1
    }
    // Stryker sets the exit code to 1 when the score falls under thresholds.break.
    return process.exitCode === 1 ? 1 : 0
  } finally {
    rmSync(sandboxDirectory, { recursive: true, force: true })
  }
}

process.exitCode = await main(process.argv.slice(2))
