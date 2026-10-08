#!/usr/bin/env node
// Builds the ZeevCode "NeetCode 150" derived dataset from:
//   1. The user-supplied NeetCode 150 list (source of truth for inclusion + order)
//   2. The upstream mcaupybugs/leetcode-problems-db repository (source of truth for problem content)
//
// Usage:
//   node scripts/build-neetcode150.mjs [--source <file>] [--upstream <dir>] [--out <dir>]
//                                      [--expected <n>] [--name <name>] [--slug <slug>]
//
// The build FAILS (non-zero exit) unless every supplied problem matches exactly one
// upstream problem and the number of matched problems equals --expected.

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const UPSTREAM_REPO = 'https://github.com/mcaupybugs/leetcode-problems-db'
const UPSTREAM_BRANCH = 'master'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const args = {
    source: path.join(__dirname, 'neetcode150-source.txt'),
    upstream: null,
    out: path.join(repoRoot, 'public', 'data', 'dsa'),
    expected: 150,
    name: 'NeetCode 150',
    slug: 'neetcode-150',
    allowMissing: false,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    switch (a) {
      case '--source': args.source = path.resolve(next()); break
      case '--upstream': args.upstream = path.resolve(next()); break
      case '--out': args.out = path.resolve(next()); break
      case '--expected': args.expected = parseInt(next(), 10); break
      case '--name': args.name = next(); break
      case '--slug': args.slug = next(); break
      case '--allow-missing': args.allowMissing = true; break
      case '--help':
      case '-h':
        console.log('Usage: node build-neetcode150.mjs [--source <file>] [--upstream <dir>] [--out <dir>] [--expected <n>] [--name <name>] [--slug <slug>] [--allow-missing]')
        process.exit(0)
        break
      default:
        console.error(`Unknown argument: ${a}`)
        process.exit(2)
    }
  }
  return args
}

function fail(message, extra = {}) {
  console.error(`\nBUILD FAILED: ${message}`)
  if (Object.keys(extra).length) console.error(JSON.stringify(extra, null, 2))
  process.exit(1)
}

// ---------------------------------------------------------------------------
// 1. Parse the user-supplied list
// ---------------------------------------------------------------------------

const DIFFICULTY_RE = /^(Easy|Medium|Med\.?|Hard)\.?\s*$/i
const ACCEPTANCE_RE = /^(\d+(?:\.\d+)?)\s*%$/
const ENTRY_RE = /^(\d+)\.\s+(\S.*)$/

function parseDifficulty(raw) {
  const v = raw.trim().toLowerCase()
  if (v === 'easy') return 'Easy'
  if (v === 'hard') return 'Hard'
  return 'Medium'
}

function parseSuppliedList(text) {
  const entries = []
  let current = null
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    const entryMatch = line.trim().match(ENTRY_RE)
    if (entryMatch) {
      current = { leetcodeId: entryMatch[1], title: entryMatch[2].trim(), acceptance: null, difficulty: null }
      entries.push(current)
      continue
    }
    if (!current) continue
    const trimmed = line.trim()
    if (!trimmed) continue
    const accMatch = trimmed.match(ACCEPTANCE_RE)
    if (accMatch) {
      current.acceptance = accMatch[1]
      continue
    }
    if (DIFFICULTY_RE.test(trimmed)) {
      current.difficulty = parseDifficulty(trimmed)
      continue
    }
    // Unknown line inside an entry - ignore (list format may vary slightly)
  }
  return entries
}

// ---------------------------------------------------------------------------
// 2. Normalization helpers (safe, no fuzzy matching)
// ---------------------------------------------------------------------------

function normalizeTitleForExact(raw) {
  return raw.trim().toLowerCase()
}

function normalizeTitleCareful(raw) {
  return raw
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(raw) {
  return raw
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ---------------------------------------------------------------------------
// 3. Load upstream dataset
// ---------------------------------------------------------------------------

async function ensureUpstream(explicitDir) {
  if (explicitDir) {
    if (!existsSync(path.join(explicitDir, 'merged_problems.json'))) {
      fail(`--upstream dir does not contain merged_problems.json: ${explicitDir}`)
    }
    return explicitDir
  }
  const cached = path.join(os.tmpdir(), 'zeevcode-upstream', 'leetcode-problems-db')
  if (existsSync(path.join(cached, 'merged_problems.json'))) return cached
  console.log(`Cloning upstream dataset (one-time) into ${cached} ...`)
  try {
    execFileSync('git', ['clone', '--depth', '1', '--branch', UPSTREAM_BRANCH, UPSTREAM_REPO, cached], { stdio: 'inherit' })
  } catch {
    fail(`Could not clone upstream repo ${UPSTREAM_REPO}. Pass --upstream <dir> with a local checkout.`)
  }
  return cached
}

function upstreamCommit(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return null
  }
}

async function loadUpstream(dir) {
  const raw = JSON.parse(await readFile(path.join(dir, 'merged_problems.json'), 'utf8'))
  const problems = Array.isArray(raw) ? raw : raw.questions
  if (!Array.isArray(problems)) fail('Unrecognized merged_problems.json shape (expected array or { questions: [] })')

  const byFrontendId = new Map()
  const byExactTitle = new Map()
  const bySlug = new Map()
  const byCarefulTitle = new Map()
  for (const p of problems) {
    const fid = String(p.frontend_id)
    byFrontendId.set(fid, p)
    const exact = normalizeTitleForExact(p.title)
    const careful = normalizeTitleCareful(p.title)
    if (!byExactTitle.has(exact)) byExactTitle.set(exact, [])
    byExactTitle.get(exact).push(p)
    if (!bySlug.has(p.problem_slug)) bySlug.set(p.problem_slug, [])
    bySlug.get(p.problem_slug).push(p)
    if (!byCarefulTitle.has(careful)) byCarefulTitle.set(careful, [])
    byCarefulTitle.get(careful).push(p)
  }
  return { problems, byFrontendId, byExactTitle, bySlug, byCarefulTitle }
}

// ---------------------------------------------------------------------------
// 4. Match every supplied entry against upstream
// ---------------------------------------------------------------------------

function pickSingle(map, key, label, context, report) {
  const hits = map.get(key)
  if (!hits || hits.length === 0) return null
  if (hits.length > 1) {
    report.ambiguous.push({
      ...context,
      reason: `ambiguous ${label} match (${hits.length} candidates: ${hits.map((h) => h.frontend_id).join(', ')})`,
      candidates: hits.map((h) => ({ frontend_id: h.frontend_id, title: h.title, problem_slug: h.problem_slug })),
    })
    return 'AMBIGUOUS'
  }
  return hits[0]
}

function matchEntries(entries, upstream, report) {
  const matchMethods = { leetcodeId: 0, exactTitle: 0, slug: 0, normalizedTitle: 0 }
  const matches = []

  entries.forEach((entry, idx) => {
    const order = idx + 1
    const context = { order, leetcodeId: entry.leetcodeId, title: entry.title }
    let problem = null
    let method = null

    const byId = upstream.byFrontendId.get(entry.leetcodeId)
    if (byId) {
      problem = byId
      method = 'leetcodeId'
    } else {
      const byExact = pickSingle(upstream.byExactTitle, normalizeTitleForExact(entry.title), 'exactTitle', context, report)
      if (byExact !== 'AMBIGUOUS' && byExact) {
        problem = byExact
        method = 'exactTitle'
      } else {
        const bySlug = pickSingle(upstream.bySlug, slugify(entry.title), 'slug', context, report)
        if (bySlug !== 'AMBIGUOUS' && bySlug) {
          problem = bySlug
          method = 'slug'
        } else {
          const byCareful = pickSingle(upstream.byCarefulTitle, normalizeTitleCareful(entry.title), 'normalizedTitle', context, report)
          if (byCareful !== 'AMBIGUOUS' && byCareful) {
            problem = byCareful
            method = 'normalizedTitle'
          }
        }
      }
    }

    if (!problem || problem === 'AMBIGUOUS') {
      if (problem !== 'AMBIGUOUS') {
        report.unmatched.push(context)
      }
      matches.push({ entry, order, problem: null, method: null })
      return
    }

    matchMethods[method] += 1

    // Conflict detection (reported, not fatal)
    if (normalizeTitleCareful(entry.title) !== normalizeTitleCareful(problem.title)) {
      report.conflicts.push({
        ...context,
        type: 'title',
        suppliedTitle: entry.title,
        upstreamTitle: problem.title,
        upstreamFrontendId: problem.frontend_id,
      })
    }
    if (entry.difficulty && entry.difficulty !== problem.difficulty) {
      report.conflicts.push({
        ...context,
        type: 'difficulty',
        suppliedDifficulty: entry.difficulty,
        upstreamDifficulty: problem.difficulty,
        upstreamFrontendId: problem.frontend_id,
      })
    }

    matches.push({ entry, order, problem, method })
  })

  // Duplicate matches: two supplied entries mapped to the same upstream problem
  const seen = new Map()
  for (const m of matches) {
    if (!m.problem) continue
    const key = m.problem.frontend_id
    if (seen.has(key)) {
      report.duplicateMatches.push({
        upstreamFrontendId: key,
        upstreamTitle: m.problem.title,
        entries: [seen.get(key), { order: m.order, leetcodeId: m.entry.leetcodeId, title: m.entry.title }],
      })
    } else {
      seen.set(key, { order: m.order, leetcodeId: m.entry.leetcodeId, title: m.entry.title })
    }
  }

  report.matchMethods = matchMethods
  return matches
}

// ---------------------------------------------------------------------------
// 5. Write outputs
// ---------------------------------------------------------------------------

const PROBLEM_FIELDS = [
  'title',
  'problem_id',
  'frontend_id',
  'difficulty',
  'problem_slug',
  'topics',
  'description',
  'examples',
  'constraints',
  'follow_ups',
  'hints',
  'code_snippets',
]

function problemFileName(problem) {
  const num = String(problem.frontend_id).padStart(4, '0')
  return `${num}-${problem.problem_slug}.json`
}

async function writeDataset(outDir, args, entries, matches, report, commit) {
  const listDir = path.join(outDir, args.slug)
  const problemsDir = path.join(listDir, 'problems')
  await rm(listDir, { recursive: true, force: true })
  await mkdir(problemsDir, { recursive: true })

  const manifestProblems = []
  const matched = new Set()

  for (const m of matches) {
    if (!m.problem) continue
    matched.add(m.problem.frontend_id)

    const out = {}
    for (const field of PROBLEM_FIELDS) {
      if (m.problem[field] !== undefined) out[field] = m.problem[field]
    }
    // Large editorial content is not needed for Practice Mode - intentionally omitted:
    // (upstream "solution" / "solutions" fields)

    await writeFile(path.join(problemsDir, problemFileName(m.problem)), JSON.stringify(out, null, 2) + '\n', 'utf8')

    manifestProblems.push({
      order: m.order,
      leetcodeId: m.entry.leetcodeId,
      title: m.entry.title,
      slug: m.problem.problem_slug,
      difficulty: m.entry.difficulty || m.problem.difficulty,
      file: `problems/${problemFileName(m.problem)}`,
    })
  }

  manifestProblems.sort((a, b) => a.order - b.order)

  const generatedAt = new Date().toISOString()
  const source = {
    upstreamRepo: UPSTREAM_REPO,
    upstreamCommit: commit,
    listFile: path.relative(repoRoot, args.source),
    generatedAt,
  }

  const manifest = {
    name: args.name,
    slug: args.slug,
    total: manifestProblems.length,
    source,
    problems: manifestProblems,
  }

  const mappingReport = {
    expected: args.expected,
    matched: matched.size,
    unmatched: report.unmatched,
    ambiguous: report.ambiguous,
    duplicateMatches: report.duplicateMatches,
    conflicts: report.conflicts,
    warnings: report.warnings,
    matchMethods: report.matchMethods,
    source: { ...source, upstreamProblemCount: upstreamCount },
  }

  await writeFile(path.join(listDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  await writeFile(path.join(listDir, 'mapping-report.json'), JSON.stringify(mappingReport, null, 2) + '\n', 'utf8')

  // Upsert this list into the dataset index (enables adding more lists later)
  const indexPath = path.join(outDir, 'index.json')
  let index = { lists: [] }
  if (existsSync(indexPath)) {
    index = JSON.parse(await readFile(indexPath, 'utf8'))
    if (!Array.isArray(index.lists)) index.lists = []
  }
  index.lists = index.lists.filter((l) => l.slug !== args.slug)
  index.lists.push({ slug: args.slug, name: args.name, manifest: `/data/dsa/${args.slug}/manifest.json` })
  index.lists.sort((a, b) => a.slug.localeCompare(b.slug))
  await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf8')

  return { manifest, mappingReport }
}

let upstreamCount = 0

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv)

  if (!existsSync(args.source)) fail(`Source list file not found: ${args.source}`)

  // --- Parse + validate the supplied list ---------------------------------
  const entries = parseSuppliedList(await readFile(args.source, 'utf8'))
  const report = { unmatched: [], ambiguous: [], duplicateMatches: [], conflicts: [], warnings: [], matchMethods: { leetcodeId: 0, exactTitle: 0, slug: 0, normalizedTitle: 0 } }

  if (entries.length !== args.expected) {
    fail(`Supplied list contains ${entries.length} problems, expected exactly ${args.expected}.`, {
      first: entries[0] ?? null,
      last: entries[entries.length - 1] ?? null,
    })
  }

  const idCounts = new Map()
  const titleCounts = new Map()
  for (const e of entries) {
    idCounts.set(e.leetcodeId, (idCounts.get(e.leetcodeId) ?? 0) + 1)
    const t = normalizeTitleCareful(e.title)
    titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1)
  }
  const dupIds = [...idCounts.entries()].filter(([, n]) => n > 1)
  if (dupIds.length) {
    fail('Supplied list contains duplicate LeetCode IDs.', { duplicateIds: dupIds.map(([id, n]) => ({ id, count: n })) })
  }
  const dupTitles = [...titleCounts.entries()].filter(([, n]) => n > 1)
  for (const [t, n] of dupTitles) {
    const sameId = entries.filter((e) => normalizeTitleCareful(e.title) === t)
    const distinctIds = new Set(sameId.map((e) => e.leetcodeId)).size
    if (distinctIds === 1) {
      fail('Supplied list contains duplicate entries (same normalized title AND same LeetCode ID).', { title: t, count: n })
    }
    report.warnings.push(`Title "${t}" appears ${n} times with different LeetCode IDs (${[...new Set(sameId.map((e) => e.leetcodeId))].join(', ')}) - verified as distinct problems.`)
  }

  entries.forEach((e, i) => {
    if (!e.difficulty) {
      report.warnings.push(`Entry #${i + 1} (${e.leetcodeId}. ${e.title}) has no difficulty in the supplied list; difficulty will be taken from upstream data.`)
    }
  })

  // --- Load upstream + match ------------------------------------------------
  const upstreamDir = await ensureUpstream(args.upstream)
  const upstream = await loadUpstream(upstreamDir)
  upstreamCount = upstream.problems.length
  const commit = upstreamCommit(upstreamDir)
  const matches = matchEntries(entries, upstream, report)

  const matchedCount = new Set(matches.filter((m) => m.problem).map((m) => m.problem.frontend_id)).size
  if (report.ambiguous.length) {
    fail(`Ambiguous matches - stopping instead of guessing.`, { ambiguous: report.ambiguous })
  }
  if (report.unmatched.length && !args.allowMissing) {
    fail(`${report.unmatched.length}/${args.expected} supplied problems could not be matched to the upstream dataset.`, { unmatched: report.unmatched })
  }
  if (report.duplicateMatches.length) {
    fail('Multiple supplied entries matched the same upstream problem.', { duplicateMatches: report.duplicateMatches })
  }
  if (matchedCount !== args.expected && !args.allowMissing) {
    fail(`Matched ${matchedCount}/${args.expected} problems - refusing to produce a partial dataset.`)
  }
  if (matchedCount !== args.expected && args.allowMissing) {
    report.warnings.push(
      `Dataset intentionally partial: ${matchedCount}/${args.expected} problems. ` +
      `${report.unmatched.length} supplied problem(s) are missing from the upstream dataset (see "unmatched"). ` +
      `This was explicitly approved via --allow-missing.`
    )
  }

  // --- Write outputs ---------------------------------------------------------
  const { mappingReport } = await writeDataset(args.out, args, entries, matches, report, commit)

  // --- Summary ----------------------------------------------------------------
  console.log('\n=== NeetCode 150 dataset build ===')
  console.log(`Supplied problems : ${entries.length}`)
  console.log(`Matched           : ${mappingReport.matched}/${mappingReport.expected}`)
  console.log(`Unmatched         : ${mappingReport.unmatched.length}`)
  console.log(`Ambiguous         : ${mappingReport.ambiguous.length}`)
  console.log(`Duplicate matches : ${mappingReport.duplicateMatches.length}`)
  console.log(`Conflicts         : ${mappingReport.conflicts.length}`)
  console.log(`Match methods     : ${JSON.stringify(mappingReport.matchMethods)}`)
  if (mappingReport.warnings.length) {
    console.log('Warnings:')
    for (const w of mappingReport.warnings) console.log(`  - ${w}`)
  }
  if (mappingReport.conflicts.length) {
    console.log('Conflicts (reported only):')
    for (const c of mappingReport.conflicts) console.log(`  - #${c.order} ${c.type}: supplied "${c.suppliedTitle ?? c.suppliedDifficulty}" vs upstream "${c.upstreamTitle ?? c.upstreamDifficulty}" (id ${c.upstreamFrontendId})`)
  }
  console.log(`Output            : ${path.relative(process.cwd(), path.join(args.out, args.slug))}`)
  console.log('BUILD OK')
}

main().catch((e) => fail(e.stack || String(e)))
