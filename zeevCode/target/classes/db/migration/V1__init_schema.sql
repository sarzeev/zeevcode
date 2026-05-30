-- ─── USERS ────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    avatar_url    VARCHAR(500),
    rating        INTEGER      NOT NULL DEFAULT 1200,
    wins          INTEGER      NOT NULL DEFAULT 0,
    losses        INTEGER      NOT NULL DEFAULT 0,
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

-- ─── PROBLEMS ─────────────────────────────────────────────────────────────────
CREATE TABLE problems (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         VARCHAR(255) NOT NULL,
    slug          VARCHAR(255) NOT NULL UNIQUE,
    description   TEXT         NOT NULL,
    difficulty    VARCHAR(10)  NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    template_code TEXT         NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

-- ─── TEST CASES ───────────────────────────────────────────────────────────────
CREATE TABLE test_cases (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id    UUID         NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input         TEXT         NOT NULL,
    expected      TEXT         NOT NULL,
    is_hidden     BOOLEAN      NOT NULL DEFAULT false
);

-- ─── MATCHES ──────────────────────────────────────────────────────────────────
CREATE TABLE matches (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id    UUID         NOT NULL REFERENCES problems(id),
    player1_id    UUID         NOT NULL REFERENCES users(id),
    player2_id    UUID         NOT NULL REFERENCES users(id),
    winner_id     UUID         REFERENCES users(id),
    status        VARCHAR(20)  NOT NULL DEFAULT 'WAITING'
                               CHECK (status IN ('WAITING', 'IN_PROGRESS', 'FINISHED')),
    started_at    TIMESTAMP,
    finished_at   TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

-- ─── SUBMISSIONS ──────────────────────────────────────────────────────────────
CREATE TABLE submissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id      UUID         NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id       UUID         NOT NULL REFERENCES users(id),
    problem_id    UUID         NOT NULL REFERENCES problems(id),
    language      VARCHAR(20)  NOT NULL CHECK (language IN ('JAVA', 'PYTHON', 'CPP')),
    code          TEXT         NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                               CHECK (status IN ('PENDING', 'ACCEPTED', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'COMPILE_ERROR')),
    runtime_ms    INTEGER,
    submitted_at  TIMESTAMP    NOT NULL DEFAULT now()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_matches_player1    ON matches(player1_id);
CREATE INDEX idx_matches_player2    ON matches(player2_id);
CREATE INDEX idx_submissions_match  ON submissions(match_id);
CREATE INDEX idx_submissions_user   ON submissions(user_id);
CREATE INDEX idx_test_cases_problem ON test_cases(problem_id);
