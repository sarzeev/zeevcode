-- New columns on the existing problems table (all nullable -> backward-compatible)
ALTER TABLE problems ADD COLUMN category VARCHAR(100);
ALTER TABLE problems ADD COLUMN source_url VARCHAR(500);
ALTER TABLE problems ADD COLUMN leetcode_number INTEGER;
ALTER TABLE problems ADD COLUMN importance SMALLINT CHECK (importance BETWEEN 1 AND 5);
ALTER TABLE problems ADD COLUMN is_seeded BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for category filtering
CREATE INDEX idx_problems_category ON problems(category);
CREATE INDEX idx_problems_importance ON problems(importance);
