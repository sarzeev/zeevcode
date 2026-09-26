# ZeevCode Fundamentals — GitHub Integration Implementation

## Status: 🚧 In Progress

---

## Architecture

```
CS-Fundamentals GitHub Repository (23se02cs102/CS-Fundamentals)
        ↓
Background sync (GitHub webhook + TTL fallback every 4 hours)
        ↓
Structure/metadata cache (fundamentals_repo_cache table in PostgreSQL/Supabase)
  + Rendered-HTML cache (fundamentals_render_cache table, keyed by blob SHA)
        ↓
ZeevCode Fundamentals UI (reads cache only — never fetches GitHub in-request)
        ↓
User interacts with content
        ↓
Backend (Spring Boot)
        ↓
User-specific progress only (fundamentals_chapter_progress table)
```

**Key Principles:**
- GitHub is the single source of truth for content
- Supabase never stores canonical Markdown — only index metadata + rendered HTML (rebuildable cache)
- All user-facing requests read from cache; GitHub is never fetched in-request
- Rendered HTML is cached per blob SHA — re-renders only when underlying file changes
- Images are CDN-rewritten (raw.githubusercontent.com) at render time — never proxied

---

## Repository Structure (CS-Fundamentals)

Top-level subjects (folders):
| Folder | Chapters |
|--------|----------|
| Compiler Design | 12 chapters + syllabus |
| Computer Network | 12 chapters + syllabus |
| Computer Organization & Architecture | 1 chapter + syllabus |
| DBMS | 13 chapters + syllabus |
| Data Structure and Algorithms | 16 chapters + syllabus |
| Object Oriented Programing | 15 chapters + syllabus |
| Operating System | 13 chapters + syllabus |
| Theory Of Computation | 12 chapters + syllabus |

---

## Database Schema Changes

### New Tables (Migration V12)

**`fundamentals_repo_cache`** — Disposable structure/metadata index
```sql
CREATE TABLE fundamentals_repo_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_slug  VARCHAR(255) NOT NULL,
  subject_name  VARCHAR(255) NOT NULL,
  chapter_path  VARCHAR(500) NOT NULL,
  chapter_name  VARCHAR(500) NOT NULL,
  chapter_order INTEGER      NOT NULL DEFAULT 0,
  blob_sha      VARCHAR(255) NOT NULL,
  file_size     INTEGER,
  tree_sha      VARCHAR(255) NOT NULL,
  cached_at     TIMESTAMP    NOT NULL DEFAULT now(),
  UNIQUE(subject_slug, chapter_path)
);
```

**`fundamentals_render_cache`** — Disposable rendered HTML cache
```sql
CREATE TABLE fundamentals_render_cache (
  blob_sha      VARCHAR(255) PRIMARY KEY,
  rendered_html TEXT         NOT NULL,
  chapter_path  VARCHAR(500) NOT NULL,
  cached_at     TIMESTAMP    NOT NULL DEFAULT now()
);
```

**`fundamentals_chapter_progress`** — User progress (application state, NOT cache)
```sql
CREATE TABLE fundamentals_chapter_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_slug  VARCHAR(255) NOT NULL,
  chapter_path  VARCHAR(500) NOT NULL,
  completed     BOOLEAN      NOT NULL DEFAULT false,
  completed_at  TIMESTAMP,
  created_at    TIMESTAMP    NOT NULL DEFAULT now(),
  UNIQUE(user_id, chapter_path)
);
```

### Retired Tables (video-centric model)
- `playlists`, `videos`, `user_video_progress`, `resources`, `quiz_questions` — remain in DB for
  migration compatibility but are no longer written to or read from by the new Fundamentals feature.

---

## Backend Changes

### New Service: `GitHubRepoSyncService`
- Fetches the repo tree via `GET /repos/23se02cs102/CS-Fundamentals/git/trees/{sha}?recursive=1`
- Uses authenticated GitHub client (PAT from `GITHUB_PAT` env var)
- Parses tree into subjects (top-level dirs) and chapters (`.md` files)
- Upserts `fundamentals_repo_cache` records
- Triggers render cache invalidation for changed blob SHAs

### New Service: `MarkdownRenderService`
- Fetches raw Markdown from `raw.githubusercontent.com` (CDN-backed, no API rate limit)
- Renders to HTML using Flexmark (Java Markdown library)
- Rewrites relative image paths to `raw.githubusercontent.com` CDN URLs
- Stores rendered HTML in `fundamentals_render_cache` keyed by blob SHA

### Updated Service: `FundamentalsService`
- `getDashboard(userId)` — reads from `fundamentals_repo_cache`, aggregates with `fundamentals_chapter_progress`
- `getSubjectChapters(slug)` — reads from `fundamentals_repo_cache` for that subject
- `getChapterContent(subjectSlug, chapterPath)` — reads `fundamentals_render_cache`; if miss, renders+caches; returns HTML
- `markChapterComplete(userId, subjectSlug, chapterPath)` — writes to `fundamentals_chapter_progress`
- `getUserProgressForSubject(userId, subjectSlug)` — reads `fundamentals_chapter_progress`

### New Scheduled Job: `FundamentalsRefreshScheduler`
- Runs every 4 hours (TTL-based fallback)
- Calls `GitHubRepoSyncService.syncRepoTree()` asynchronously
- Non-blocking — failures logged, last-known-good cache served

### Webhook Endpoint: `POST /api/fundamentals/webhook`
- Receives GitHub push webhooks
- Validates HMAC-SHA256 signature using `GITHUB_WEBHOOK_SECRET`
- Triggers async `GitHubRepoSyncService.syncRepoTree()`
- Returns 200 immediately; sync is out-of-band

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/fundamentals/dashboard` | Subject cards with progress (from cache) |
| GET | `/api/fundamentals/subjects` | List all subjects |
| GET | `/api/fundamentals/subjects/{slug}` | Subject page with chapter list |
| GET | `/api/fundamentals/subjects/{slug}/chapters` | Chapter list for subject |
| GET | `/api/fundamentals/chapter-content` | Rendered chapter HTML (by path) |
| POST | `/api/fundamentals/chapters/complete` | Mark chapter completed |
| GET | `/api/fundamentals/progress` | User's overall + per-subject progress |
| POST | `/api/fundamentals/webhook` | GitHub push webhook handler |
| POST | `/api/fundamentals/admin/sync` | Manual cache refresh (admin only) |

---

## Frontend Changes

### New Page: `ChapterPage.jsx`
- Route: `/fundamentals/:subjectSlug/chapter?path=...`
- Renders pre-built HTML from backend using `dangerouslySetInnerHTML`
- CSS scoping for Markdown content (headings, tables, code blocks)
- Prev/Next chapter navigation
- Mark-as-complete button (for authenticated users)
- Breadcrumb: Fundamentals → Subject → Chapter

### Updated Page: `FundamentalsPage.jsx`
- Dynamic subject cards from `/api/fundamentals/dashboard`
- Chapter count per subject (from cache)
- Progress % per subject (from `fundamentals_chapter_progress`)
- Overall progress = average of all subject %s

### Updated Page: `SubjectLearningPage.jsx`
- Rewritten: shows chapter list (not video list)
- Chapter cards with completion status
- Clean learning-oriented UI

---

## New Dependencies

### Backend (pom.xml)
```xml
<dependency>
    <groupId>com.vladsch.flexmark</groupId>
    <artifactId>flexmark-all</artifactId>
    <version>0.64.8</version>
</dependency>
```

### Environment Variables (new)
```
GITHUB_PAT=ghp_xxxxx
GITHUB_WEBHOOK_SECRET=your_secret
```

---

## Implementation Progress

### Backend
- [x] V12 database migration (3 new tables)
- [x] New entities: `FundamentalsRepoCache`, `FundamentalsRenderCache`, `FundamentalsChapterProgress`
- [x] New repositories for all 3 entities
- [x] `GitHubRepoSyncService` — tree fetch, parse, upsert cache
- [x] `MarkdownRenderService` — fetch raw MD, render to HTML, cache
- [x] Updated `FundamentalsService` — chapter progress CRUD, dashboard, subject details
- [x] Updated `FundamentalsController` — new endpoints
- [x] `FundamentalsRefreshScheduler` — TTL background sync
- [x] Webhook endpoint
- [x] `pom.xml` — add flexmark dependency
- [x] `application.properties` — add GITHUB_PAT, GITHUB_WEBHOOK_SECRET config

### Frontend
- [x] `ChapterPage.jsx` — new page for reading chapters
- [x] `FundamentalsPage.jsx` — updated with dynamic chapter-count data
- [x] `SubjectLearningPage.jsx` — rewritten for chapter list (not video list)
- [x] `App.jsx` — add chapter route
- [x] `api.js` — updated fundamentals API methods
- [x] `markdown-content.css` — scoped dark-theme Markdown styles (inline in ChapterPage)

### Documentation
- [x] `FUNDAMENTALS_IMPLEMENTATION.md` — this file

---

## Known Decisions

1. **Subject list is dynamic** — Derived from GitHub repo tree; any new top-level folder is picked up automatically on next sync.
2. **No hardcoded subjects** — Subject slugs are generated from folder names (lowercase, spaces→hyphens). Stable as long as GitHub folder names don't change.
3. **Overall progress formula** — Average of per-subject completion percentages (not weighted by chapter count), matching the spec exactly.
4. **Render on miss** — If a chapter's blob SHA has no cached render, it renders synchronously on first access, then caches. One-time cost per new chapter.
5. **No redirect to GitHub** — All content served from ZeevCode backend.
6. **Old video entities remain** — `playlists`, `videos`, etc. remain in DB (no migration to drop them) to avoid potential issues with existing Flyway history.
