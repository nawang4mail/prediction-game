-- Migration: 20260611000005_add_idx_matches_result.sql

-- ======== UP ========

ALTER TABLE matches
    ADD INDEX idx_matches_result (result);

-- ======== DOWN ========

-- ALTER TABLE matches DROP INDEX idx_matches_result;
