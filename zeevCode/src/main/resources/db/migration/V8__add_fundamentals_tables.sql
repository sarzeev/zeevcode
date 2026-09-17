
-- ─── SUBJECTS ──────────────────────────────────────────────────────────────────
CREATE TABLE subjects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    slug          VARCHAR(255) NOT NULL UNIQUE,
    description   TEXT         NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

-- ─── PLAYLISTS ─────────────────────────────────────────────────────────────────
CREATE TABLE playlists (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id          UUID         NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    youtube_playlist_id VARCHAR(255) NOT NULL UNIQUE,
    playlist_url        VARCHAR(500) NOT NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

-- ─── VIDEOS ────────────────────────────────────────────────────────────────────
CREATE TABLE videos (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id      UUID         NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    youtube_video_id VARCHAR(255) NOT NULL UNIQUE,
    title            VARCHAR(500) NOT NULL,
    thumbnail        VARCHAR(500),
    duration         VARCHAR(50),
    order_number     INTEGER      NOT NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT now()
);

-- ─── USER VIDEO PROGRESS ───────────────────────────────────────────────────────
CREATE TABLE user_video_progress (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id      UUID         NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    completed     BOOLEAN      NOT NULL DEFAULT false,
    completed_at  TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE(user_id, video_id)
);

-- ─── RESOURCES ─────────────────────────────────────────────────────────────────
CREATE TABLE resources (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id    UUID         NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    url           VARCHAR(500) NOT NULL,
    type          VARCHAR(20)  NOT NULL CHECK (type IN ('BOOK', 'NOTE', 'DOC', 'ARTICLE')),
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

-- ─── QUIZ QUESTIONS ────────────────────────────────────────────────────────────
CREATE TABLE quiz_questions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id     UUID         NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    question_text  TEXT         NOT NULL,
    option_a       TEXT         NOT NULL,
    option_b       TEXT         NOT NULL,
    option_c       TEXT         NOT NULL,
    option_d       TEXT         NOT NULL,
    correct_option VARCHAR(1)   NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    explanation    TEXT,
    created_at     TIMESTAMP    NOT NULL DEFAULT now()
);

-- ─── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_playlists_subject ON playlists(subject_id);
CREATE INDEX idx_videos_playlist   ON videos(playlist_id);
CREATE INDEX idx_user_progress_user ON user_video_progress(user_id);
CREATE INDEX idx_user_progress_video ON user_video_progress(video_id);
CREATE INDEX idx_resources_subject ON resources(subject_id);
CREATE INDEX idx_quiz_subject      ON quiz_questions(subject_id);
