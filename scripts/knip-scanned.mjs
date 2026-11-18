// A knip reporter that prints how many files the run analysed and fails a run that analysed none,
// so a config whose entries match nothing cannot pass with no findings; knip's own reporters print
// only findings. It runs after the default reporter:
//   node node_modules/knip/bin/knip.js --reporter symbols --reporter ./scripts/knip-scanned.mjs

import process from 'node:process'

/**
@param {{ counters: { processed: number, total: number } }} options
*/
export default function reportScanned({ counters }) {
  process.stdout.write(`knip scanned: files ${counters.processed} of ${counters.total}\n`)
  if (counters.processed > 0) return
  process.stdout.write('knip scanned: the run analysed no file\n')
  // knip sets its own exit code after the reporters run, so the failure is set as it exits
  process.once('exit', () => {
    process.exitCode = 1
  })
}
