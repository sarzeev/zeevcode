-- Make match_id nullable to support practice submissions (no match)
ALTER TABLE submissions ALTER COLUMN match_id DROP NOT NULL;
