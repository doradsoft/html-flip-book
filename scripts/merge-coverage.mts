/**
 * Merge unit and e2e coverage into a single lcov report.
 * Based on approach from bible-on-site.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const COVERAGE_DIR = resolve(__dirname, '../.coverage')
const UNIT_LCOV = resolve(COVERAGE_DIR, 'unit/lcov.info')
const E2E_LCOV = resolve(COVERAGE_DIR, 'e2e/lcov.info')
const MERGED_DIR = resolve(COVERAGE_DIR, 'merged')
const MERGED_LCOV = resolve(MERGED_DIR, 'lcov.info')

function main(): void {
  console.log('Merging coverage reports...')

  // Ensure merged directory exists
  if (!existsSync(MERGED_DIR)) {
    mkdirSync(MERGED_DIR, { recursive: true })
  }

  const parts: string[] = []

  // Add unit coverage if exists
  if (existsSync(UNIT_LCOV)) {
    console.log(`  - Adding unit coverage from ${UNIT_LCOV}`)
    parts.push(readFileSync(UNIT_LCOV, 'utf8'))
  } else {
    console.log(`  - Unit coverage not found at ${UNIT_LCOV}`)
  }

  // Add e2e coverage if exists
  if (existsSync(E2E_LCOV)) {
    console.log(`  - Adding E2E coverage from ${E2E_LCOV}`)
    parts.push(readFileSync(E2E_LCOV, 'utf8'))
  } else {
    console.log(`  - E2E coverage not found at ${E2E_LCOV}`)
  }

  if (parts.length === 0) {
    console.error('No coverage files found to merge!')
    process.exit(1)
  }

  // Simple concatenation - lcov format supports multiple records per file
  // For more accurate merging, consider using lcov-cli
  const merged = parts.join('\n')
  writeFileSync(MERGED_LCOV, merged)

  console.log(`\nMerged coverage written to ${MERGED_LCOV}`)
}

main()
