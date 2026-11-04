// A knip reporter that prints how many files the run analysed, so a run that scanned nothing
// shows as one; knip's own reporters print only findings. It runs after the default reporter:
//   node node_modules/knip/bin/knip.js --reporter symbols --reporter ./scripts/knip-scanned.mjs

import process from 'node:process'

/**
@param {{ counters: { processed: number, total: number } }} options
*/
export default function reportScanned({ counters }) {
  process.stdout.write(`knip scanned: files ${counters.processed} of ${counters.total}\n`)
}
