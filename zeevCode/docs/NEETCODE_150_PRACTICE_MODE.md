# NeetCode 150 Practice Mode — Dataset & Integration

Date: 2026-10-08

## What was done

The first real problem dataset was added to ZeevCode Practice Mode:

1. **Derived dataset created** from the user-supplied NeetCode 150 list (source of truth
   for inclusion + order) by extracting problems from
   `mcaupybugs/leetcode-problems-db` (upstream repo, unmodified, cloned to a temp cache).
2. **Practice Mode wired up**: the "Practice Problems" section on the DSA dashboard
   (`/dsa`, `DashboardPage.jsx`) now loads the dataset instead of showing
   "No problems available.".
3. **Existing problem page reused**: clicking a problem opens the existing
   `/practice/:slug` interface (PracticePage) — no second editor was created.
4. **Database seeded** (Supabase): 143 problems with real descriptions, Java template
   code, category, LeetCode source URL, ordered collection membership, and
   example-derived test cases.

## Matching results (see `mapping-report.json`)

| Metric            | Value |
|-------------------|-------|
| Supplied problems | 150   |
| Matched           | 143 (all by LeetCode ID) |
| Unmatched         | 7 (absent from upstream dataset) |
| Ambiguous         | 0     |
| Duplicate matches | 0     |
| Conflicts         | 0     |

Unmatched (documented in `mapping-report.json → unmatched`):
252 Meeting Rooms, 253 Meeting Rooms II, 261 Graph Valid Tree, 269 Alien Dictionary,
271 Encode and Decode Strings, 286 Walls and Gates, 323 Number of Connected Components
in an Undirected Graph (mostly LeetCode premium problems not in the upstream scrape).

Warnings:
- Entry #150 "981. Time Based Key-Value Store" arrived without its %/difficulty lines;
  difficulty was taken from upstream (`Medium`).
- The build was explicitly run with `--allow-missing` to ship 143/150 (approved).
  Without that flag the build fails hard on any partial match.

## Dataset layout

```
judge-frontend/public/data/dsa/
├── index.json                    # registry of available problem lists
└── neetcode-150/
    ├── manifest.json             # name, slug, total, ordered problem list
    ├── mapping-report.json       # matching audit (provenance + gaps)
    └── problems/
        ├── 0001-two-sum.json
        ├── 0002-add-two-numbers.json
        └── ... (143 files, NNNN-problem_slug naming)
```

- `order` in the manifest is the NeetCode order from the supplied list (positions
  1–150, with gaps where problems were missing upstream).
- Problem files keep upstream fields: `title`, `problem_id`, `frontend_id`,
  `difficulty`, `problem_slug`, `topics`, `description`, `examples`, `constraints`,
  `follow_ups`, `hints`, `code_snippets`. The large `solution` editorial field is
  intentionally excluded.
- `.gitignore` was extended so `judge-frontend/public/data/dsa/**` is versioned.

## Architecture (no hardcoded lists in React)

```
/data/dsa/index.json ──► problem lists (ProblemList meta)
/data/dsa/<slug>/manifest.json ──► ordered Problem items
ProblemListItem (row: title, difficulty, solve)
ProblemList (table + auto list-selector when >1 list exists)
        │
        ▼  /practice/<slug>  (existing PracticePage)
```

- `judge-frontend/src/data/problemDataset.js` — generic dataset loader
  (fetches index/manifest/problem JSON; no knowledge of any specific list).
- `judge-frontend/src/components/ProblemList.jsx` / `ProblemListItem.jsx`.
- `DashboardPage.jsx` — loads lists + selected list's items; "Solve" and the random
  "Practice Mode" button navigate to `/practice/<slug>` with user state.

Adding a future list (Blind 75, Grind 75, Striver A2Z, ...): create its source list
file, point `build-neetcode150.mjs` at it via `--slug/--name/--source` (or copy the
script), run the build (it upserts `index.json`), then run `seed-dataset.mjs --slug`.
No React changes required.

## Database seeding

Two equivalent seeders read the same dataset:

- **Local dev:** `node scripts/seed-dataset.mjs` (judge-frontend, uses `pg`, reads
  DB config from `zeevCode/.env`). Idempotent: CREATE first run, UPDATE afterwards
  (replaces test cases only for `is_seeded` problems; manually created problems are
  never touched).
- **In-app admin:** `POST /api/admin/seed/neetcode150` (and generic
  `POST /api/admin/seed/dataset?slug=<slug>`) — handled by
  `zeevCode/.../service/DatasetSeederService.java` (replaced the old
  placeholder-content `NeetCodeSeederService`, which was deleted). Dataset location is
  configurable: `zeevcode.dataset-dir` (default `../judge-frontend/public/data/dsa`).

Seeded content per problem:
- `description` = upstream description + Constraints + Hints + Follow-up sections
- `template_code` = Java starter (fallback: python3, then first available snippet)
- `category` = first upstream topic
- `source_url` = `https://leetcode.com/problems/<slug>/`
- `leetcode_number`, `difficulty` (EASY/MEDIUM/HARD)
- test cases = parsed `Input:`/`Output:` from each example (visible, 334 total)

## How to run locally

```bash
# Frontend (talks to the shared backend + Supabase DB via judge-frontend/.env)
cd judge-frontend
npm run dev
# open http://localhost:5173 → log in → /dsa → Practice Problems

# Optional: local backend instead of the deployed API
# (load zeevCode/.env vars into the environment first)
cd zeevCode
mvnw.cmd spring-boot:run        # http://localhost:8081/health
```

## How to regenerate the dataset

```bash
cd judge-frontend
npm run build:neetcode150       # = node scripts/build-neetcode150.mjs --allow-missing
#   - clones mcaupybugs/leetcode-problems-db (depth 1) into a temp cache on first run
#   - strict by default: fails on any unmatched/ambiguous/duplicate problem
#   - --allow-missing ships partial datasets with the gaps documented
node scripts/seed-dataset.mjs   # (re)apply to the database
```

The verbatim supplied list lives in `judge-frontend/scripts/neetcode150-source.txt`.

## Known limitations

- 7 problems are missing (see above) until a source containing them is available.
- Judging: the native judge executes submissions as raw stdin/stdout, while LeetCode
  starter templates are method-based (no `main()`). Seeded test cases are the
  problems' examples and are displayed on the problem page; real judging requires
  either per-problem raw-format test cases (existing admin UI) or a stdin wrapper
  layer — intentionally not built (out of scope).
- Docker deployment of the backend would need the dataset directory mounted or the
  `ZEEVCODE_DATASET_DIR` env var set (the dataset is only consumed by the admin
  seeder at seed time).
