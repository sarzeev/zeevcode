// Generic problem-list dataset model for Practice Mode.
//
// A problem "list" (e.g. NeetCode 150, later Blind 75, Grind 75, ...) is a
// directory of static JSON served from /data/dsa/<slug>/:
//
//   /data/dsa/index.json                  -> registry of available lists
//   /data/dsa/<slug>/manifest.json        -> ordered Problem[] for the list
//   /data/dsa/<slug>/problems/<file>.json -> full problem content
//
// Adding a new list never requires changing React code: add the dataset
// directory and let scripts/build-neetcode150.mjs regenerate index.json.

const BASE = '/data/dsa'

function toProblemListItem(p) {
  return {
    order: p.order,
    leetcodeId: p.leetcodeId,
    title: p.title,
    slug: p.slug,
    difficulty: p.difficulty,
    file: p.file || null,
  }
}

// ProblemList meta-info (slug + display name) for every available list.
export async function fetchProblemLists() {
  const res = await fetch(`${BASE}/index.json`)
  if (!res.ok) throw new Error(`Failed to load problem lists (HTTP ${res.status})`)
  const data = await res.json()
  return Array.isArray(data.lists) ? data.lists : []
}

// A single ProblemList: metadata + its ordered Problem items.
export async function fetchProblemList(slug) {
  const res = await fetch(`${BASE}/${slug}/manifest.json`)
  if (!res.ok) throw new Error(`Failed to load problem list "${slug}" (HTTP ${res.status})`)
  const manifest = await res.json()
  return {
    name: manifest.name,
    slug: manifest.slug,
    total: manifest.total,
    source: manifest.source || null,
    problems: (manifest.problems || []).map(toProblemListItem),
  }
}

// Full Problem content for one item (lazy-loaded when needed).
export async function fetchProblemContent(listSlug, item) {
  if (!item.file) throw new Error('Problem has no content file')
  const res = await fetch(`${BASE}/${listSlug}/${item.file}`)
  if (!res.ok) throw new Error(`Failed to load problem "${item.slug}" (HTTP ${res.status})`)
  return res.json()
}
