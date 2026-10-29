/**
 * Merge unit and e2e coverage into a single lcov report.
 * Based on approach from bible-on-site.
 *
 * E2E coverage may arrive as multiple Playwright shard reports
 * (.coverage/e2e/e2e-coverage-N/lcov.info) or as a single flat report
 * (.coverage/e2e/lcov.info) from a local unsharded run; all are merged.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isLibraryCoverageSource } from './coverage-paths.mts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const COVERAGE_DIR = resolve(__dirname, '../.coverage')

function findLcovFiles(dir: string, depth = 2): string[] {
	if (!existsSync(dir) || depth < 0) return []
	return readdirSync(dir).flatMap((entry) => {
		const full = join(dir, entry)
		if (entry === 'lcov.info' && statSync(full).isFile()) return [full]
		return statSync(full).isDirectory() ? findLcovFiles(full, depth - 1) : []
	})
}

function requiredReport(file: string, label: string): string {
	if (!existsSync(file)) throw new Error(`${label} not found at ${file}`)
	const content = readFileSync(file, 'utf8').replaceAll('\r\n', '\n')
	const useful = content.split('end_of_record').some((record) => {
		const source = /^SF:(.+)$/m.exec(record)?.[1]
		return source !== undefined && isLibraryCoverageSource(source)
			&& /^DA:\d+,[1-9]\d*(?:,.*)?$/m.test(record)
	})
	if (!useful) throw new Error(`${label} has no covered library source: ${file}`)
	return content
}

export function mergeCoverageReports(coverageDir = COVERAGE_DIR, expectedE2eShards?: number): string {
	if (expectedE2eShards !== undefined && (!Number.isInteger(expectedE2eShards) || expectedE2eShards < 1)) {
		throw new Error('Expected E2E shard count must be a positive integer')
	}
	const UNIT_LCOV = resolve(coverageDir, 'unit/lcov.info')
	const E2E_DIR = resolve(coverageDir, 'e2e')
	const MERGED_DIR = resolve(coverageDir, 'merged')
	const MERGED_LCOV = resolve(MERGED_DIR, 'lcov.info')
	console.log('Merging coverage reports...')

	// Ensure merged directory exists
	if (!existsSync(MERGED_DIR)) {
		mkdirSync(MERGED_DIR, { recursive: true })
	}

	const parts: string[] = [requiredReport(UNIT_LCOV, 'Unit coverage')]

	// Add every e2e coverage report (flat file and/or per-shard directories)
	const e2eFiles = expectedE2eShards === undefined
		? findLcovFiles(E2E_DIR).sort()
		: Array.from({ length: expectedE2eShards }, (_, index) => {
			const shard = index + 1
			const file = resolve(E2E_DIR, `e2e-coverage-${shard}/lcov.info`)
			if (!existsSync(file)) throw new Error(`E2E coverage missing for shard ${shard}: ${file}`)
			return file
		})
	for (const file of e2eFiles) {
		console.log(`  - Adding e2e coverage from ${file}`)
		parts.push(requiredReport(file, 'E2E coverage'))
	}
	if (e2eFiles.length === 0) {
		throw new Error(`E2E coverage not found under ${E2E_DIR}`)
	}

	// Simple concatenation - lcov format supports multiple records per file
	// For more accurate merging, consider using lcov-cli
	const merged = parts.join('\n')
	writeFileSync(MERGED_LCOV, merged)

	console.log(`\nMerged coverage written to ${MERGED_LCOV}`)
	return MERGED_LCOV
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const shardArg = process.argv.indexOf('--e2e-shards')
	const shards = shardArg < 0 ? undefined : Number(process.argv[shardArg + 1])
	try {
		mergeCoverageReports(COVERAGE_DIR, shards)
	} catch (error) {
		console.error(error instanceof Error ? error.message : error)
		process.exitCode = 1
	}
}
