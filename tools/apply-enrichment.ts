/**
Apply Enrichment Data to mz-classes.json

Reads tools/output/enrichment.json and merges popularity data
into src/renderer/src/data/mz-classes.json.

Rules:
- Adds "popularity": N to each class entry (top-level)
- Adds "popularity": N to each method in methods[]
- Classes/methods NOT found in enrichment get popularity: 0
- Only matches classes already present in mz-classes.json
- Methods matched by "ClassName.prototype.methodName" key

Usage: npx tsx tools/apply-enrichment.ts
*/

import * as fs from 'node:fs'
import path from 'node:path'

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

// ── Shape checks ────────────────────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)

const isOptional = (value: unknown, type: 'string' | 'number'): boolean =>
  value === undefined || typeof value === type

const isNumberRecord = (value: unknown): value is Record<string, number> =>
  isRecord(value) && Object.values(value).every((item: unknown) => typeof item === 'number')

function isEnrichmentData(value: unknown): value is EnrichmentData {
  if (!isRecord(value)) return false
  const { version, generatedAt, pluginCount, classPopularity, methodPopularity } = value
  return (
    typeof version === 'string' &&
    typeof generatedAt === 'string' &&
    typeof pluginCount === 'number' &&
    isNumberRecord(classPopularity) &&
    isNumberRecord(methodPopularity)
  )
}

function isMZMethod(value: unknown): value is MZMethod {
  if (!isRecord(value)) return false
  const { name, params, description, returnType, popularity } = value
  return (
    typeof name === 'string' &&
    isList(params) &&
    params.every((param: unknown) => typeof param === 'string') &&
    typeof description === 'string' &&
    isOptional(returnType, 'string') &&
    isOptional(popularity, 'number')
  )
}

function isMZClass(value: unknown): value is MZClass {
  if (!isRecord(value)) return false
  const { name, file, category, parent, description, methods, popularity } = value
  return (
    typeof name === 'string' &&
    typeof file === 'string' &&
    typeof category === 'string' &&
    isOptional(parent, 'string') &&
    typeof description === 'string' &&
    isList(methods) &&
    methods.every((method: unknown) => isMZMethod(method)) &&
    isOptional(popularity, 'number')
  )
}

const isMZClassMap = (value: unknown): value is Record<string, MZClass> =>
  isRecord(value) && Object.values(value).every((entry: unknown) => isMZClass(entry))

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

// ── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  // Read enrichment data
  if (!fs.existsSync(ENRICHMENT_PATH)) {
    console.error(`ERROR: Enrichment file not found at ${ENRICHMENT_PATH}`)
    console.error('Run "npx tsx tools/analyze-plugins.ts" first to generate it.')
    process.exitCode = 1
    return
  }

  const enrichment = readJson(ENRICHMENT_PATH)
  if (!isEnrichmentData(enrichment)) {
    console.error(`ERROR: ${ENRICHMENT_PATH} does not hold enrichment data`)
    process.exitCode = 1
    return
  }
  console.log(`Loaded enrichment data (${String(enrichment.pluginCount)} plugins analyzed)`)
  console.log(`  Class entries: ${String(Object.keys(enrichment.classPopularity).length)}`)
  console.log(`  Method entries: ${String(Object.keys(enrichment.methodPopularity).length)}`)

  // Read mz-classes.json
  if (!fs.existsSync(MZ_CLASSES_PATH)) {
    console.error(`ERROR: mz-classes.json not found at ${MZ_CLASSES_PATH}`)
    process.exitCode = 1
    return
  }

  const mzClasses = readJson(MZ_CLASSES_PATH)
  if (!isMZClassMap(mzClasses)) {
    console.error(`ERROR: ${MZ_CLASSES_PATH} does not hold the class dictionary`)
    process.exitCode = 1
    return
  }
  const classEntries = Object.entries(mzClasses)
  console.log(`\nLoaded mz-classes.json (${String(classEntries.length)} classes)`)

  // Merge popularity data
  let classesMatched = 0
  let classesUnmatched = 0
  let methodsMatched = 0
  let methodsUnmatched = 0

  for (const [className, classEntry] of classEntries) {
    // Set class popularity
    const classPop = enrichment.classPopularity[className]
    if (classPop === undefined) {
      classEntry.popularity = 0
      classesUnmatched++
    } else {
      classEntry.popularity = classPop
      classesMatched++
    }

    // Set method popularity
    for (const method of classEntry.methods) {
      const methodKey = `${className}.prototype.${method.name}`
      const methodPop = enrichment.methodPopularity[methodKey]
      if (methodPop === undefined) {
        method.popularity = 0
        methodsUnmatched++
      } else {
        method.popularity = methodPop
        methodsMatched++
      }
    }
  }

  // Write updated mz-classes.json
  fs.writeFileSync(MZ_CLASSES_PATH, JSON.stringify(mzClasses, undefined, 2) + '\n', 'utf8')

  console.log('\nEnrichment applied successfully!')
  console.log(
    `  Classes: ${String(classesMatched)} matched, ${String(classesUnmatched)} defaulted to 0`
  )
  console.log(
    `  Methods: ${String(methodsMatched)} matched, ${String(methodsUnmatched)} defaulted to 0`
  )
  console.log(`\nUpdated: ${MZ_CLASSES_PATH}`)
}

main()
