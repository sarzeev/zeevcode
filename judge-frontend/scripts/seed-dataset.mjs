#!/usr/bin/env node
// Seeds a practice dataset (judge-frontend/public/data/dsa/<slug>/) into the app
// database. Local-development counterpart of DatasetSeederService (backend).
//
// Usage:
//   node scripts/seed-dataset.mjs [--slug neetcode-150] [--data public/data/dsa]
//                                 [--env ../../zeevCode/.env] [--dry-run]

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const args = {
    slug: 'neetcode-150',
    data: path.join(repoRoot, 'public', 'data', 'dsa'),
    env: path.resolve(__dirname, '..', '..', 'zeevCode', '.env'),
    dryRun: false,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    switch (a) {
      case '--slug': args.slug = next(); break
      case '--data': args.data = path.resolve(next()); break
      case '--env': args.env = path.resolve(next()); break
      case '--dry-run': args.dryRun = true; break
      default:
        console.error(`Unknown argument: ${a}`)
        process.exit(2)
    }
  }
  return args
}

function loadDbConfig(envPath) {
  const props = Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^[A-Z0-9_]+=/.test(l.trim()))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      })
  )
  const hostPortDb = props.SPRING_DATASOURCE_URL
    .replace('jdbc:postgresql://', '')
    .replace(/\?.*$/, '')
  return `postgres://${encodeURIComponent(props.SPRING_DATASOURCE_USERNAME)}:${encodeURIComponent(props.SPRING_DATASOURCE_PASSWORD)}@${hostPortDb}`
}

const EXAMPLE_INPUT_OUTPUT = /Input:\s*([\s\S]*?)\n\s*Output:\s*([\s\S]*?)(?:\n\s*Explanation:|$)/

function buildDescription(p) {
  const parts = []
  if (p.description && String(p.description).trim()) parts.push(String(p.description).trim())
  if (Array.isArray(p.constraints) && p.constraints.length) {
    parts.push('Constraints:\n' + p.constraints.map((c) => '- ' + String(c).trim()).join('\n'))
  }
  if (Array.isArray(p.hints) && p.hints.length) {
    parts.push('Hints:\n' + p.hints.map((h, i) => `${i + 1}. ${String(h).trim()}`).join('\n'))
  }
  if (Array.isArray(p.follow_ups) && p.follow_ups.length) {
    parts.push('Follow-up:\n' + p.follow_ups.map((f) => '- ' + String(f).trim()).join('\n'))
  }
  return parts.join('\n\n')
}

function pickTemplateCode(p) {
  const snippets = p.code_snippets
  if (snippets && typeof snippets === 'object') {
    for (const lang of ['java', 'python3', 'python']) {
      if (snippets[lang] && String(snippets[lang]).trim()) return snippets[lang]
    }
    for (const lang of Object.keys(snippets)) {
      if (['racket', 'erlang', 'elixir'].includes(lang)) continue
      if (snippets[lang] && String(snippets[lang]).trim()) return snippets[lang]
    }
  }
  return 'class Solution {\n\n}'
}

function firstTopic(p) {
  if (Array.isArray(p.topics) && p.topics.length) return String(p.topics[0]).trim() || null
  return null
}

function parseExampleTestCases(p) {
  const out = []
  if (!Array.isArray(p.examples)) return out
  for (const example of p.examples) {
    if (!example || typeof example.example_text !== 'string') continue
    const m = EXAMPLE_INPUT_OUTPUT.exec(example.example_text)
    if (!m) continue
    const input = (m[1] || '').trim()
    const expected = (m[2] || '').trim()
    if (!input || !expected) continue
    out.push({ input, expected })
  }
  return out
}

function mapDifficulty(raw) {
  const v = String(raw || '').trim().toUpperCase()
  if (v.startsWith('E')) return 'EASY'
  if (v.startsWith('H')) return 'HARD'
  return 'MEDIUM'
}

async function main() {
  const args = parseArgs(process.argv)
  const listDir = path.join(args.data, args.slug)
  const manifest = JSON.parse(readFileSync(path.join(listDir, 'manifest.json'), 'utf8'))
  if (!Array.isArray(manifest.problems) || manifest.problems.length === 0) {
    console.error(`No problems found in ${path.join(listDir, 'manifest.json')}`)
    process.exit(1)
  }

  const client = new pg.Client({ connectionString: loadDbConfig(args.env), ssl: false })
  await client.connect()

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0
  const details = []

  try {
    if (!args.dryRun) await client.query('BEGIN')

    const colRes = await client.query(
      `INSERT INTO problem_collections (name, slug, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [manifest.name, args.slug, `Seeded from the ${manifest.name} dataset.`]
    )
    let collectionId = colRes.rows[0] && colRes.rows[0].id
    if (!collectionId) {
      collectionId = (
        await client.query('SELECT id FROM problem_collections WHERE slug = $1', [args.slug])
      ).rows[0].id
    }

    for (const item of manifest.problems) {
      try {
        const p = JSON.parse(readFileSync(path.join(listDir, item.file), 'utf8'))
        const difficulty = mapDifficulty(item.difficulty || p.difficulty)
        const description = buildDescription(p)
        const templateCode = pickTemplateCode(p)
        const category = firstTopic(p)
        const sourceUrl = `https://leetcode.com/problems/${item.slug}/`
        const leetcodeNumber = parseInt(item.leetcodeId, 10) || null
        const testCases = parseExampleTestCases(p)

        const existing = (
          await client.query('SELECT id, is_seeded FROM problems WHERE slug = $1', [item.slug])
        ).rows[0]

        let problemId = existing ? existing.id : null
        if (existing) {
          if (!existing.is_seeded) {
            skipped++
            details.push(`SKIP ${item.slug} (manually managed)`)
          } else {
            problemId = existing.id
            if (!args.dryRun) {
              await client.query(
                `UPDATE problems
                 SET title = $2, difficulty = $3, description = $4, template_code = $5,
                     category = $6, source_url = $7, leetcode_number = $8, is_active = TRUE
                 WHERE id = $1`,
                [problemId, item.title, difficulty, description, templateCode, category, sourceUrl, leetcodeNumber]
              )
              await client.query('DELETE FROM test_cases WHERE problem_id = $1', [problemId])
              updated++
              details.push(`UPDATE ${item.slug}`)
            }
          }
        } else {
          created++
          if (!args.dryRun) {
            problemId = (
              await client.query(
                `INSERT INTO problems
                   (title, slug, description, difficulty, template_code, time_limit, memory_limit, is_active, is_seeded, category, source_url, leetcode_number)
                 VALUES ($1, $2, $3, $4, $5, 2000, 256, TRUE, TRUE, $6, $7, $8)
                 RETURNING id`,
                [item.title, item.slug, description, difficulty, templateCode, category, sourceUrl, leetcodeNumber]
              )
            ).rows[0].id
            details.push(`CREATE ${item.slug}`)
          }
        }

        if (!args.dryRun && problemId) {
          for (const tc of testCases) {
            await client.query(
              'INSERT INTO test_cases (problem_id, input, expected, is_hidden) VALUES ($1, $2, $3, FALSE)',
              [problemId, tc.input, tc.expected]
            )
          }
          await client.query(
            `INSERT INTO problem_collection_memberships (problem_id, collection_id, order_index)
             VALUES ($1, $2, $3)
             ON CONFLICT (problem_id, collection_id)
             DO UPDATE SET order_index = EXCLUDED.order_index`,
            [problemId, collectionId, item.order]
          )
        }
      } catch (e) {
        failed++
        details.push(`FAIL ${item.slug}: ${e.message}`)
      }
    }

    if (!args.dryRun) await client.query('COMMIT')

    console.log(`\n=== Seed dataset "${args.slug}" ${args.dryRun ? '(dry run)' : ''} ===`)
    console.log(`Total in manifest : ${manifest.problems.length}`)
    console.log(`Created           : ${created}`)
    console.log(`Updated           : ${updated}`)
    console.log(`Skipped (manual)  : ${skipped}`)
    console.log(`Failed            : ${failed}`)
    if (details.some((d) => !d.startsWith('CREATE'))) {
      console.log('Details:')
      for (const d of details) if (!d.startsWith('CREATE')) console.log(`  ${d}`)
    }
    if (failed > 0) process.exitCode = 1
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
