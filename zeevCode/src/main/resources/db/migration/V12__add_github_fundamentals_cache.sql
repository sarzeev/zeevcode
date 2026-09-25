-- ─── FUNDAMENTALS REPO CACHE ────────────────────────────────────────────────
-- Disposable structure/metadata index derived from GitHub repo tree.
-- Can be fully reconstructed by re-running the sync.
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

-- ─── FUNDAMENTALS RENDER CACHE ──────────────────────────────────────────────
-- Disposable rendered HTML cache keyed by blob SHA.
-- Re-rendered automatically when blob SHA changes.
CREATE TABLE fundamentals_render_cache (
    blob_sha      VARCHAR(255) PRIMARY KEY,
    rendered_html TEXT         NOT NULL,
    chapter_path  VARCHAR(500) NOT NULL,
    cached_at     TIMESTAMP    NOT NULL DEFAULT now()
);

-- ─── FUNDAMENTALS CHAPTER PROGRESS ──────────────────────────────────────────
-- User-specific progress state. This is application state, NOT cache.
-- Not reconstructable from GitHub — must be preserved.
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

-- ─── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX idx_repo_cache_subject ON fundamentals_repo_cache(subject_slug);
CREATE INDEX idx_chapter_progress_user ON fundamentals_chapter_progress(user_id);
CREATE INDEX idx_chapter_progress_subject ON fundamentals_chapter_progress(user_id, subject_slug);
