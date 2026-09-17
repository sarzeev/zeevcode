-- Collection definition (NeetCode 150, Blind 75, etc.)
CREATE TABLE problem_collections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- Many-to-many: a problem can belong to multiple collections
CREATE TABLE problem_collection_memberships (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id    UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES problem_collections(id) ON DELETE CASCADE,
    order_index   INTEGER,
    UNIQUE(problem_id, collection_id)
);

CREATE INDEX idx_pcm_collection ON problem_collection_memberships(collection_id);
CREATE INDEX idx_pcm_problem    ON problem_collection_memberships(problem_id);
