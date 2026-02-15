/**
 * Apply Enrichment Data to mz-classes.json
 *
 * Reads tools/output/enrichment.json and merges popularity data
 * into src/renderer/src/data/mz-classes.json.
 *
 * Rules:
 * - Adds "popularity": N to each class entry (top-level)
 * - Adds "popularity": N to each method in methods[]
 * - Classes/methods NOT found in enrichment get popularity: 0
 * - Only matches classes already present in mz-classes.json
 * - Methods matched by "ClassName.prototype.methodName" key
 *
 * Usage: npx tsx tools/apply-enrichment.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Paths ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..')
const ENRICHMENT_PATH = path.join(ROOT, 'tools', 'output', 'enrichment.json')
const MZ_CLASSES_PATH = path.join(ROOT, 'src', 'renderer', 'src', 'data', 'mz-classes.json')

// ── Types ───────────────────────────────────────────────────────────────────

interface EnrichmentData {
  version: string
  generatedAt: string
  pluginCount: number
  classPopularity: Record<string, number>
  methodPopularity: Record<string, number>
}

interface MZMethod {
  name: string
  params: string[]
  description: string
  returnType?: string
  popularity?: number
}

interface MZClass {
  name: string
  file: string
  category: string
  parent?: string
  description: string
  methods: MZMethod[]
  popularity?: number
}

// ── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  // Read enrichment data
  if (!fs.existsSync(ENRICHMENT_PATH)) {
    console.error(`ERROR: Enrichment file not found at ${ENRICHMENT_PATH}`)
    console.error('Run "npx tsx tools/analyze-plugins.ts" first to generate it.')
    process.exit(1)
  }

  const enrichment: EnrichmentData = JSON.parse(fs.readFileSync(ENRICHMENT_PATH, 'utf-8'))
  console.log(`Loaded enrichment data (${enrichment.pluginCount} plugins analyzed)`)
  console.log(`  Class entries: ${Object.keys(enrichment.classPopularity).length}`)
  console.log(`  Method entries: ${Object.keys(enrichment.methodPopularity).length}`)

  // Read mz-classes.json
  if (!fs.existsSync(MZ_CLASSES_PATH)) {
    console.error(`ERROR: mz-classes.json not found at ${MZ_CLASSES_PATH}`)
    process.exit(1)
  }

  const mzClasses: Record<string, MZClass> = JSON.parse(fs.readFileSync(MZ_CLASSES_PATH, 'utf-8'))
  const classNames = Object.keys(mzClasses)
  console.log(`\nLoaded mz-classes.json (${classNames.length} classes)`)

  // Merge popularity data
  let classesMatched = 0
  let classesUnmatched = 0
  let methodsMatched = 0
  let methodsUnmatched = 0

  for (const className of classNames) {
    const classEntry = mzClasses[className]

    // Set class popularity
    const classPop = enrichment.classPopularity[className]
    if (classPop !== undefined) {
      classEntry.popularity = classPop
      classesMatched++
    } else {
      classEntry.popularity = 0
      classesUnmatched++
    }

    // Set method popularity
    for (const method of classEntry.methods) {
      const methodKey = `${className}.prototype.${method.name}`
      const methodPop = enrichment.methodPopularity[methodKey]
      if (methodPop !== undefined) {
        method.popularity = methodPop
        methodsMatched++
      } else {
        method.popularity = 0
        methodsUnmatched++
      }
    }
  }

  // Write updated mz-classes.json
  fs.writeFileSync(MZ_CLASSES_PATH, JSON.stringify(mzClasses, null, 2) + '\n', 'utf-8')

  console.log('\nEnrichment applied successfully!')
  console.log(`  Classes: ${classesMatched} matched, ${classesUnmatched} defaulted to 0`)
  console.log(`  Methods: ${methodsMatched} matched, ${methodsUnmatched} defaulted to 0`)
  console.log(`\nUpdated: ${MZ_CLASSES_PATH}`)
}

main()
