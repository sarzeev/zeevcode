CREATE TABLE user_problem_progress (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    problem_id              UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,

    -- Status tracks highest achievement; single source of truth
    status                  VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED'
                            CHECK (status IN ('NOT_STARTED','ATTEMPTED','SOLVED','MASTERED')),

    -- Mastery: 1=Don't understand … 5=Strong/mastered (NULL until user sets it)
    mastery_level           SMALLINT CHECK (mastery_level BETWEEN 1 AND 5),

    -- Completion tracking
    completed               BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at            TIMESTAMP,

    -- Revision checkpoints (independent of submission system)
    revision_1              BOOLEAN NOT NULL DEFAULT FALSE,
    revision_1_at           TIMESTAMP,
    revision_2              BOOLEAN NOT NULL DEFAULT FALSE,
    revision_2_at           TIMESTAMP,
    revision_3              BOOLEAN NOT NULL DEFAULT FALSE,
    revision_3_at           TIMESTAMP,

    -- Aggregate stats (updated from judge results)
    attempt_count           INTEGER NOT NULL DEFAULT 0,
    successful_attempt_count INTEGER NOT NULL DEFAULT 0,
    last_solved_at          TIMESTAMP,

    created_at              TIMESTAMP NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP NOT NULL DEFAULT now(),

    UNIQUE(user_id, problem_id)
);

CREATE INDEX idx_upp_user        ON user_problem_progress(user_id);
CREATE INDEX idx_upp_problem     ON user_problem_progress(problem_id);
CREATE INDEX idx_upp_status      ON user_problem_progress(user_id, status);
CREATE INDEX idx_upp_collection  ON user_problem_progress(user_id, problem_id);
